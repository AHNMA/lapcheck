/**
 * OpenF1 API Service
 * https://api.openf1.org/
 */

const BASE_URL = 'https://api.openf1.org/v1';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

async function fetchWithRetry(url: string, retries = 3, delay = 500): Promise<Response> {
  const cacheKey = url;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return new Response(JSON.stringify(cached.data), {
      headers: { 'Content-Type': 'application/json' },
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

function buildUrl(endpoint: string, params: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(`${BASE_URL}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      // Allow for OpenF1 API's custom filter syntax (e.g. `speed>=315`) by not encoding the key
      // The params object keys can be things like "speed>=" or "date<"
      url.search += `${url.search ? '&' : '?'}${key}=${encodeURIComponent(value.toString())}`;
    }
  }
  return url.toString().replace(/\?$/, '');
}

export interface CarData {
  brake: number;
  date: string;
  driver_number: number;
  drs: number;
  meeting_key: number;
  n_gear: number;
  rpm: number;
  session_key: number;
  speed: number;
  throttle: number;
}

export interface ChampionshipDriver {
  driver_number: number;
  meeting_key: number;
  points_current: number;
  points_start: number;
  position_current: number;
  position_start: number;
  session_key: number;
}

export interface ChampionshipTeam {
  meeting_key: number;
  points_current: number;
  points_start: number;
  position_current: number;
  position_start: number;
  session_key: number;
  team_name: string;
}

export interface Driver {
  broadcast_name: string;
  country_code?: string;
  driver_number: number;
  first_name: string;
  full_name: string;
  headshot_url: string;
  last_name: string;
  meeting_key: number;
  name_acronym: string;
  session_key: number;
  team_colour: string;
  team_name: string;
}

export interface Interval {
  date: string;
  driver_number: number;
  gap_to_leader: number | null;
  interval: number | null;
  meeting_key: number;
  session_key: number;
}

export interface Lap {
  date_start: string;
  driver_number: number;
  duration_sector_1?: number;
  duration_sector_2?: number;
  duration_sector_3?: number;
  i1_speed?: number;
  i2_speed?: number;
  is_pit_out_lap: boolean;
  lap_duration: number;
  lap_number: number;
  meeting_key: number;
  segments_sector_1?: number[];
  segments_sector_2?: number[];
  segments_sector_3?: number[];
  session_key: number;
  st_speed?: number;
}

export interface LocationData {
  date: string;
  driver_number: number;
  meeting_key: number;
  session_key: number;
  x: number;
  y: number;
  z: number;
}

export interface Meeting {
  circuit_key: number;
  circuit_image: string;
  circuit_info_url: string;
  circuit_short_name: string;
  circuit_type: string;
  country_code: string;
  country_flag: string;
  country_key: number;
  country_name: string;
  date_end: string;
  date_start: string;
  gmt_offset: string;
  location: string;
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  year: number;
}

export interface Overtake {
  date: string;
  meeting_key: number;
  overtaken_driver_number: number;
  overtaking_driver_number: number;
  position: number;
  session_key: number;
}

export interface Pit {
  date: string;
  driver_number: number;
  lane_duration: number;
  lap_number: number;
  meeting_key: number;
  pit_duration?: number;
  session_key: number;
  stop_duration?: number;
}

export interface Position {
  date: string;
  driver_number: number;
  meeting_key: number;
  position: number;
  session_key: number;
}

export interface RaceControl {
  category: string;
  date: string;
  driver_number?: number;
  flag?: string;
  lap_number?: number;
  meeting_key: number;
  message: string;
  qualifying_phase?: number | null;
  scope: string;
  sector?: number | null;
  session_key: number;
}

export interface Session {
  circuit_key: number;
  circuit_short_name: string;
  country_code: string;
  country_key: number;
  country_name: string;
  date_end: string;
  date_start: string;
  gmt_offset: string;
  location: string;
  meeting_key: number;
  session_key: number;
  session_name: string;
  session_type: string;
  year: number;
}

export interface SessionResult {
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
  driver_number: number;
  duration: number | number[];
  gap_to_leader: number | number[] | null;
  number_of_laps: number;
  meeting_key: number;
  position: number;
  session_key: number;
}

export interface StartingGrid {
  driver_number: number;
  lap_duration: number;
  meeting_key: number;
  position: number;
  session_key: number;
}

export interface Stint {
  compound: string;
  driver_number: number;
  lap_end: number;
  lap_start: number;
  meeting_key: number;
  session_key: number;
  stint_number: number;
  tyre_age_at_start: number;
}

export interface TeamRadio {
  date: string;
  driver_number: number;
  meeting_key: number;
  recording_url: string;
  session_key: number;
}

export interface Weather {
  air_temperature: number;
  date: string;
  humidity: number;
  meeting_key: number;
  pressure: number;
  rainfall: number;
  session_key: number;
  track_temperature: number;
  wind_direction: number;
  wind_speed: number;
}

// Telemetry Point logic is kept specifically to not break the frontend App.tsx
export interface TelemetryPoint {
  date: string;
  speed: number;
  distance?: number;
  throttle: number;
  brake: number;
  rpm: number;
  gear: number;
}

export const f1Service = {
  // --- Raw OpenF1 API Endpoints ---

  async fetchCarData(params: Record<string, string | number | boolean>): Promise<CarData[]> {
    const res = await fetchWithRetry(buildUrl('/car_data', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchChampionshipDrivers(params: Record<string, string | number | boolean>): Promise<ChampionshipDriver[]> {
    const res = await fetchWithRetry(buildUrl('/championship_drivers', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchChampionshipTeams(params: Record<string, string | number | boolean>): Promise<ChampionshipTeam[]> {
    const res = await fetchWithRetry(buildUrl('/championship_teams', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchDrivers(params: Record<string, string | number | boolean>): Promise<Driver[]> {
    const res = await fetchWithRetry(buildUrl('/drivers', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchIntervals(params: Record<string, string | number | boolean>): Promise<Interval[]> {
    const res = await fetchWithRetry(buildUrl('/intervals', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchLaps(params: Record<string, string | number | boolean>): Promise<Lap[]> {
    const res = await fetchWithRetry(buildUrl('/laps', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchLocation(params: Record<string, string | number | boolean>): Promise<LocationData[]> {
    const res = await fetchWithRetry(buildUrl('/location', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchMeetings(params: Record<string, string | number | boolean>): Promise<Meeting[]> {
    const res = await fetchWithRetry(buildUrl('/meetings', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchOvertakes(params: Record<string, string | number | boolean>): Promise<Overtake[]> {
    const res = await fetchWithRetry(buildUrl('/overtakes', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchPit(params: Record<string, string | number | boolean>): Promise<Pit[]> {
    const res = await fetchWithRetry(buildUrl('/pit', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchPosition(params: Record<string, string | number | boolean>): Promise<Position[]> {
    const res = await fetchWithRetry(buildUrl('/position', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchRaceControl(params: Record<string, string | number | boolean>): Promise<RaceControl[]> {
    const res = await fetchWithRetry(buildUrl('/race_control', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchSessions(params: Record<string, string | number | boolean>): Promise<Session[]> {
    const res = await fetchWithRetry(buildUrl('/sessions', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchSessionResult(params: Record<string, string | number | boolean>): Promise<SessionResult[]> {
    const res = await fetchWithRetry(buildUrl('/session_result', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchStartingGrid(params: Record<string, string | number | boolean>): Promise<StartingGrid[]> {
    const res = await fetchWithRetry(buildUrl('/starting_grid', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchStints(params: Record<string, string | number | boolean>): Promise<Stint[]> {
    const res = await fetchWithRetry(buildUrl('/stints', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchTeamRadio(params: Record<string, string | number | boolean>): Promise<TeamRadio[]> {
    const res = await fetchWithRetry(buildUrl('/team_radio', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchWeather(params: Record<string, string | number | boolean>): Promise<Weather[]> {
    const res = await fetchWithRetry(buildUrl('/weather', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  // --- Convenience Methods (For backwards compatibility with App.tsx) ---

  async getMeetings(year: number): Promise<Meeting[]> {
    const meetings = await this.fetchMeetings({ year });
    return Array.from(new Map(meetings.map(m => [m.meeting_key, m])).values());
  },

  async getSessions(meetingKey: number, year?: number, circuitShortName?: string): Promise<Session[]> {
    const allSessions: Session[] = [];

    try {
      const data = await this.fetchSessions({ meeting_key: meetingKey });
      allSessions.push(...data);
    } catch (err) {
      console.warn(`Failed to fetch sessions for meeting_key=${meetingKey}:`, err);
    }

    if (year && circuitShortName) {
      try {
        const data = await this.fetchSessions({ year, circuit_short_name: circuitShortName });
        allSessions.push(...data);
      } catch (err) {
        console.warn(`Failed to fetch sessions for year=${year} circuit=${circuitShortName}:`, err);
      }
    }

    if (allSessions.length === 0) return [];

    const uniqueSessions = Array.from(new Map(allSessions.map(s => [s.session_key, s])).values());
    uniqueSessions.sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
    return uniqueSessions;
  },

  async getDrivers(sessionKey: number): Promise<Driver[]> {
    const drivers = await this.fetchDrivers({ session_key: sessionKey });
    return Array.from(new Map(drivers.map(d => [d.driver_number, d])).values());
  },

  async getAllLaps(sessionKey: number, driverNumber: number): Promise<Lap[]> {
    const laps = await this.fetchLaps({ session_key: sessionKey, driver_number: driverNumber });

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

    const queryStart = formatF1Date(new Date(start.getTime() - 1000));
    const queryEnd = formatF1Date(new Date(end.getTime() + 1000));

    try {
      const carData = await this.fetchCarData({
        session_key: sessionKey,
        driver_number: driverNumber,
        'date>=': queryStart,
        'date<=': queryEnd,
      });

      if (!carData || carData.length === 0) return [];

      carData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const lapStartTime = start.getTime();
      const lapEndTime = end.getTime();

      let cumulativeDistance = 0;
      const telemetryPoints: TelemetryPoint[] = [];

      let firstPointIdx = carData.findIndex(cd => new Date(cd.date).getTime() >= lapStartTime);
      if (firstPointIdx === -1) firstPointIdx = 0;

      if (firstPointIdx > 0) {
        const pBefore = carData[firstPointIdx - 1];
        const pAfter = carData[firstPointIdx];
        const tBefore = new Date(pBefore.date).getTime();
        const tAfter = new Date(pAfter.date).getTime();
        const vBefore = pBefore.speed / 3.6;
        const vAfter = pAfter.speed / 3.6;

        const ratio = (lapStartTime - tBefore) / (tAfter - tBefore);
        const vAtStart = vBefore + (vAfter - vBefore) * ratio;

        const timeDelta = (tAfter - lapStartTime) / 1000;
        cumulativeDistance = ((vAtStart + vAfter) / 2) * timeDelta;
      }

      let lastTimestamp = new Date(carData[firstPointIdx].date).getTime();
      let lastSpeedMs = carData[firstPointIdx].speed / 3.6;

      for (let i = firstPointIdx; i < carData.length; i++) {
        const cd = carData[i];
        const currentTimestamp = new Date(cd.date).getTime();

        if (currentTimestamp > lapEndTime + 500) break;

        const timeDeltaSeconds = (currentTimestamp - lastTimestamp) / 1000;
        const speedMs = cd.speed / 3.6;

        if (timeDeltaSeconds > 0 && timeDeltaSeconds < 5) {
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
          gear: cd.n_gear,
        });
      }

      return telemetryPoints;
    } catch (err) {
      console.error('Telemetry fetch error:', err);
      return [];
    }
  },
};
