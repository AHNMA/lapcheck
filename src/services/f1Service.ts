/**
 * OpenF1 API Service
 * Self-hosted instance
 */

const BASE_URL = 'http://178.104.33.41:8000';
export const DEFAULT_LIMIT = 500;

async function fetchData(url: string): Promise<Response> {
  return fetch(url);
}

function buildUrl(endpoint: string, params: Record<string, string | number | boolean | undefined>): string {
  let queryString = '';
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      // Allow for OpenF1 API's custom filter syntax (e.g. `speed>=315`) by not encoding the key
      // The params object keys can be things like "speed>=" or "date<"
      queryString += `${queryString ? '&' : '?'}${key}=${encodeURIComponent(value.toString())}`;
    }
  }
  return `${BASE_URL}/v1${endpoint}${queryString}`;
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
    const res = await fetchData(buildUrl('/car_data', { limit: DEFAULT_LIMIT, ...params }));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchChampionshipDrivers(params: Record<string, string | number | boolean>): Promise<ChampionshipDriver[]> {
    const res = await fetchData(buildUrl('/championship_drivers', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchChampionshipTeams(params: Record<string, string | number | boolean>): Promise<ChampionshipTeam[]> {
    const res = await fetchData(buildUrl('/championship_teams', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchDrivers(params: Record<string, string | number | boolean>): Promise<Driver[]> {
    const res = await fetchData(buildUrl('/drivers', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchIntervals(params: Record<string, string | number | boolean>): Promise<Interval[]> {
    const res = await fetchData(buildUrl('/intervals', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchLaps(params: Record<string, string | number | boolean>): Promise<Lap[]> {
    const res = await fetchData(buildUrl('/laps', { limit: DEFAULT_LIMIT, ...params }));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchLocation(params: Record<string, string | number | boolean>): Promise<LocationData[]> {
    const res = await fetchData(buildUrl('/location', { limit: DEFAULT_LIMIT, ...params }));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchMeetings(params: Record<string, string | number | boolean>): Promise<Meeting[]> {
    const res = await fetchData(buildUrl('/meetings', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchOvertakes(params: Record<string, string | number | boolean>): Promise<Overtake[]> {
    const res = await fetchData(buildUrl('/overtakes', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchPit(params: Record<string, string | number | boolean>): Promise<Pit[]> {
    const res = await fetchData(buildUrl('/pit', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchPosition(params: Record<string, string | number | boolean>): Promise<Position[]> {
    const res = await fetchData(buildUrl('/position', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchRaceControl(params: Record<string, string | number | boolean>): Promise<RaceControl[]> {
    const res = await fetchData(buildUrl('/race_control', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchSessions(params: Record<string, string | number | boolean>): Promise<Session[]> {
    const res = await fetchData(buildUrl('/sessions', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchSessionResult(params: Record<string, string | number | boolean>): Promise<SessionResult[]> {
    const res = await fetchData(buildUrl('/session_result', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchStartingGrid(params: Record<string, string | number | boolean>): Promise<StartingGrid[]> {
    const res = await fetchData(buildUrl('/starting_grid', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchStints(params: Record<string, string | number | boolean>): Promise<Stint[]> {
    const res = await fetchData(buildUrl('/stints', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchTeamRadio(params: Record<string, string | number | boolean>): Promise<TeamRadio[]> {
    const res = await fetchData(buildUrl('/team_radio', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  async fetchWeather(params: Record<string, string | number | boolean>): Promise<Weather[]> {
    const res = await fetchData(buildUrl('/weather', params));
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  },

  // --- Convenience Methods (For backwards compatibility with App.tsx) ---

  async getMeetings(year: number): Promise<Meeting[]> {
    const meetings = await this.fetchMeetings({ year });
    return Array.from(new Map<number, Meeting>(meetings.map((m: Meeting) => [m.meeting_key, m])).values());
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
    return Array.from(new Map<number, Driver>(drivers.map((d: Driver) => [d.driver_number, d])).values());
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
