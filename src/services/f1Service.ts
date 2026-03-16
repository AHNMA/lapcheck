/**
 * OpenF1 API Service
 * Self-hosted instance
 */

const BASE_URL = 'http://178.104.33.41:8000';
export const DEFAULT_LIMIT = 500;
const TIMEOUT_MS = 150000; // 150 seconds

async function fetchData(url: string): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export interface Driver {
  DriverNumber: string;
  BroadcastName: string;
  Abbreviation: string;
  TeamName: string;
  FullName: string;
  HeadshotUrl: string;
  CountryCode: string;
  team_colour?: string; // Custom field to hold merged color
}

export interface Team {
  TeamId: string;
  TeamName: string;
  TeamColor: string;
}

export interface F1Result {
  DriverNumber: string;
  BroadcastName: string;
  Abbreviation: string;
  TeamName: string;
  TeamColor: string;
  FirstName: string;
  LastName: string;
  FullName: string;
  Position: number;
  GridPosition: number;
  Q1?: string;
  Q2?: string;
  Q3?: string;
  Time?: string;
  Status: string;
  Points: number;
}

export interface Lap {
  LapNumber: number;
  LapTime: string;
  Compound: string;
  IsPersonalBest: boolean;
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
      if (res.status === 429) {
        throw new Error('Live-Datenlimit erreicht. Bitte versuche es in einer Stunde erneut oder wähle ein Rennen aus dem Archiv (2023-2025).');
      }
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      return data.meetings || [];
    } catch (err) {
      console.error('Meetings fetch error:', err);
      throw err;
    }
  },

  async getSessions(year: number, race: string): Promise<Session[]> {
    try {
      const res = await fetchData(`${BASE_URL}/sessions/${year}/${encodeURIComponent(race)}`);
      if (res.status === 404) return [];
      if (res.status === 429) {
        throw new Error('Live-Datenlimit erreicht. Bitte versuche es in einer Stunde erneut oder wähle ein Rennen aus dem Archiv (2023-2025).');
      }
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      return data.sessions || [];
    } catch (err) {
      console.error('Sessions fetch error:', err);
      throw err;
    }
  },

  async getResults(year: number, race: string, session: string): Promise<F1Result[]> {
    try {
      const res = await fetchData(`${BASE_URL}/results/${year}/${encodeURIComponent(race)}/${encodeURIComponent(session)}`);
      if (res.status === 404) return [];
      if (res.status === 429) {
        throw new Error('Live-Datenlimit erreicht. Bitte versuche es in einer Stunde erneut oder wähle ein Rennen aus dem Archiv (2023-2025).');
      }
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      return data.results || [];
    } catch (err) {
      console.error('Results fetch error:', err);
      throw err;
    }
  },

  async getAllLaps(year: number, race: string, session: string, driver: string): Promise<Lap[]> {
    const url = `${BASE_URL}/laps/${year}/${encodeURIComponent(race)}/${encodeURIComponent(session)}/${encodeURIComponent(driver)}`;
    try {
      const res = await fetchData(url);
      if (res.status === 404) return [];
      if (res.status === 429) {
        throw new Error('Live-Datenlimit erreicht. Bitte versuche es in einer Stunde erneut oder wähle ein Rennen aus dem Archiv (2023-2025).');
      }
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      return data.laps || [];
    } catch (err) {
      console.error('Laps fetch error:', err);
      throw err;
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
      if (res.status === 429) {
        throw new Error('Live-Datenlimit erreicht. Bitte versuche es in einer Stunde erneut oder wähle ein Rennen aus dem Archiv (2023-2025).');
      }
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
