/**
 * OpenF1 API Service
 * Self-hosted instance
 */

const BASE_URL = 'http://178.104.33.41:8000';
export const DEFAULT_LIMIT = 500;

async function fetchData(url: string): Promise<Response> {
  return fetch(url);
}


export interface Driver {
  driver_number: string;
  broadcast_name: string;
  abbreviation: string;
  team_name: string;
}

export interface Lap {
  lap_number: number;
  lap_time: string;
  compound: string;
}

export interface TelemetryResponse {
  year: number;
  race: string;
  session: string;
  driver: string;
  lap_time: string;
  telemetry: {
    Date: string;
    Distance: number;
    Speed: number;
    nGear: number;
    Throttle: number;
    Brake: number;
    RPM: number;
  }[];
}

export interface Meeting {
  round: number;
  meeting_name: string;
  country: string;
  location: string;
}

export interface Session {
  session_identifier: string;
  session_name: string;
  session_date: string;
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
  async getMeetings(year: number): Promise<Meeting[]> {
    try {
      const res = await fetchData(`${BASE_URL}/meetings/${year}`);
      if (res.status === 404) return [];
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      return data.meetings || [];
    } catch (err) {
      console.error('Meetings fetch error:', err);
      return [];
    }
  },

  async getSessions(year: number, race: string): Promise<Session[]> {
    try {
      const res = await fetchData(`${BASE_URL}/sessions/${year}/${encodeURIComponent(race)}`);
      if (res.status === 404) return [];
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      return data.sessions || [];
    } catch (err) {
      console.error('Sessions fetch error:', err);
      return [];
    }
  },

  async getDrivers(year: number, race: string, session: string): Promise<Driver[]> {
    try {
      const res = await fetchData(`${BASE_URL}/drivers/${year}/${encodeURIComponent(race)}/${encodeURIComponent(session)}`);
      if (res.status === 404) return [];
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      return data.drivers || [];
    } catch (err) {
      console.error('Drivers fetch error:', err);
      return [];
    }
  },

  async getAllLaps(year: number, race: string, session: string, driver: string): Promise<Lap[]> {
    const url = `${BASE_URL}/laps/${year}/${encodeURIComponent(race)}/${encodeURIComponent(session)}/${encodeURIComponent(driver)}`;
    try {
      const res = await fetchData(url);
      if (res.status === 404) return [];
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      return data.laps || [];
    } catch (err) {
      console.error('Laps fetch error:', err);
      return [];
    }
  },

  async getTelemetry(year: number, race: string, session: string, driver: string, lapNumber?: number): Promise<TelemetryPoint[]> {
    let url = `${BASE_URL}/telemetry/${year}/${encodeURIComponent(race)}/${encodeURIComponent(session)}/${encodeURIComponent(driver)}`;
    if (lapNumber !== undefined) {
      url += `?lap_number=${lapNumber}`;
    }

    try {
      const res = await fetchData(url);
      if (res.status === 404) return [];
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data: TelemetryResponse = await res.json();

      if (!data.telemetry || data.telemetry.length === 0) return [];

      return data.telemetry.map(point => ({
        date: point.Date,
        speed: point.Speed,
        distance: point.Distance,
        throttle: point.Throttle,
        brake: point.Brake,
        rpm: point.RPM,
        gear: point.nGear,
      }));
    } catch (err) {
      console.error('Telemetry fetch error:', err);
      return [];
    }
  },
};
