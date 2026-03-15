export interface Session {
  session_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  meeting_key: number;
  location: string;
  country_name: string;
  circuit_short_name: string;
  year: number;
}

export interface Meeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  location: string;
  country_name: string;
  circuit_short_name: string;
  date_start: string;
  year: number;
}

export interface Driver {
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  session_key: number;
}

export interface Lap {
  lap_number: number;
  lap_duration: number;
  is_pit_out_lap: boolean;
  session_key: number;
  driver_number: number;
  date_start: string;
}

export interface TelemetryPoint {
  date: string;
  speed: number;
  distance?: number;
  throttle: number;
  brake: number;
  rpm: number;
  gear: number;
}

const BASE_URL = 'https://api.openf1.org/v1';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Simple in-memory cache
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

async function fetchWithRetry(url: string, retries = 3, delay = 500): Promise<Response> {
  const cacheKey = url;
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return new Response(JSON.stringify(cached.data), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.status === 429 || response.status >= 500) {
        await sleep(delay * (i + 1));
        continue;
      }
      if (response.ok) {
        const data = await response.clone().json();
        cache.set(cacheKey, { data, timestamp: Date.now() });
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(delay * (i + 1));
    }
  }
  return fetch(url);
}

export const f1Service = {
  async getMeetings(year: number): Promise<Meeting[]> {
    const response = await fetchWithRetry(`${BASE_URL}/meetings?year=${year}`);
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`Failed to fetch meetings: ${response.status}`);
    const meetings: Meeting[] = await response.json();
    return Array.from(new Map(meetings.map(m => [m.meeting_key, m])).values());
  },

  async getSessions(meetingKey: number, year?: number, circuitShortName?: string): Promise<Session[]> {
    const urls = [
      `${BASE_URL}/sessions?meeting_key=${meetingKey}`,
      year && circuitShortName ? `${BASE_URL}/sessions?year=${year}&circuit_short_name=${encodeURIComponent(circuitShortName)}` : null
    ].filter(Boolean) as string[];

    const allSessions: Session[] = [];
    
    for (const url of urls) {
      try {
        const response = await fetchWithRetry(url);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            allSessions.push(...data);
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch sessions from ${url}:`, err);
      }
    }

    if (allSessions.length === 0) return [];
    
    const uniqueSessions = Array.from(new Map(allSessions.map(s => [s.session_key, s])).values());
    uniqueSessions.sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
    return uniqueSessions;
  },

  async getDrivers(sessionKey: number): Promise<Driver[]> {
    const response = await fetchWithRetry(`${BASE_URL}/drivers?session_key=${sessionKey}`);
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`Failed to fetch drivers: ${response.status}`);
    const drivers: Driver[] = await response.json();
    return Array.from(new Map(drivers.map(d => [d.driver_number, d])).values());
  },

  async getAllLaps(sessionKey: number, driverNumber: number): Promise<Lap[]> {
    const response = await fetchWithRetry(`${BASE_URL}/laps?session_key=${sessionKey}&driver_number=${driverNumber}`);
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`Failed to fetch laps: ${response.status}`);
    const laps: Lap[] = await response.json();
    
    // Deduplicate by lap_number and filter out invalid laps, sort by lap number
    const uniqueLaps = Array.from(new Map(laps.map(l => [l.lap_number, l])).values());
    
    return uniqueLaps
      .filter(l => l.lap_duration && l.lap_duration > 0)
      .sort((a, b) => a.lap_number - b.lap_number);
  },

  async getTelemetry(sessionKey: number, driverNumber: number, lap: Lap): Promise<TelemetryPoint[]> {
    const start = new Date(lap.date_start);
    const end = new Date(start.getTime() + (lap.lap_duration || 0) * 1000);
    
    // OpenF1 API expects YYYY-MM-DDTHH:mm:ss.SSS without the 'Z' suffix
    const formatF1Date = (date: Date) => date.toISOString().replace('Z', '');
    
    // Fetch with a small buffer to allow for interpolation at the exact lap boundaries
    const queryStart = formatF1Date(new Date(start.getTime() - 1000));
    const queryEnd = formatF1Date(new Date(end.getTime() + 1000));
    
    try {
      const carDataRes = await fetchWithRetry(`${BASE_URL}/car_data?session_key=${sessionKey}&driver_number=${driverNumber}&date>=${queryStart}&date<=${queryEnd}`);

      if (carDataRes.status === 404) return [];
      if (!carDataRes.ok) throw new Error(`Car data fetch failed: ${carDataRes.status}`);
      
      const carData: any[] = await carDataRes.json();
      if (!carData || carData.length === 0) return [];

      carData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const lapStartTime = start.getTime();
      const lapEndTime = end.getTime();

      let cumulativeDistance = 0;
      const telemetryPoints: TelemetryPoint[] = [];

      // Find the first point at or after lap start
      let firstPointIdx = carData.findIndex(cd => new Date(cd.date).getTime() >= lapStartTime);
      if (firstPointIdx === -1) firstPointIdx = 0;

      // If we have a point before the lap start, we can estimate the distance covered 
      // between the lap start and the first point within the lap.
      if (firstPointIdx > 0) {
        const pBefore = carData[firstPointIdx - 1];
        const pAfter = carData[firstPointIdx];
        const tBefore = new Date(pBefore.date).getTime();
        const tAfter = new Date(pAfter.date).getTime();
        const vBefore = pBefore.speed / 3.6;
        const vAfter = pAfter.speed / 3.6;

        // Interpolate speed at lap start
        const ratio = (lapStartTime - tBefore) / (tAfter - tBefore);
        const vAtStart = vBefore + (vAfter - vBefore) * ratio;
        
        // Distance from lap start to the first point inside the lap
        const timeDelta = (tAfter - lapStartTime) / 1000;
        cumulativeDistance = ((vAtStart + vAfter) / 2) * timeDelta;
      }

      let lastTimestamp = new Date(carData[firstPointIdx].date).getTime();
      let lastSpeedMs = carData[firstPointIdx].speed / 3.6;

      for (let i = firstPointIdx; i < carData.length; i++) {
        const cd = carData[i];
        const currentTimestamp = new Date(cd.date).getTime();
        
        // Stop if we've passed the lap end
        if (currentTimestamp > lapEndTime + 500) break; // Small buffer

        const timeDeltaSeconds = (currentTimestamp - lastTimestamp) / 1000;
        const speedMs = cd.speed / 3.6;
        
        if (timeDeltaSeconds > 0 && timeDeltaSeconds < 5) { // Increased gap threshold
          cumulativeDistance += ((lastSpeedMs + speedMs) / 2) * timeDeltaSeconds;
        }
        
        lastTimestamp = currentTimestamp;
        lastSpeedMs = speedMs;

        telemetryPoints.push({
          date: cd.date,
          speed: cd.speed,
          distance: Math.round(cumulativeDistance),
          throttle: cd.throttle,
          brake: cd.brake,
          rpm: cd.rpm,
          gear: cd.n_gear
        });
      }

      return telemetryPoints;
    } catch (err) {
      console.error('Telemetry fetch error:', err);
      return [];
    }
  }
};
