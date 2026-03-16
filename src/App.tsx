/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  ChevronRight, 
  Calendar, 
  MapPin, 
  Users, 
  Loader2,
  AlertCircle,
  Trophy,
  Gauge,
  Timer,
  ChevronDown,
  Check,
  Download,
  X
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { f1Service, Meeting, Session, F1Result, TelemetryPoint, Lap } from './services/f1Service';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const YEARS = [2026, 2025, 2024, 2023];
const METRICS = ['speed', 'throttle', 'brake', 'rpm', 'gear'];
const METRIC_LABELS: Record<string, string> = {
  speed: 'Speed (KM/H)',
  throttle: 'Throttle (%)',
  brake: 'Brake (%)',
  rpm: 'RPM (%)',
  gear: 'Gear'
};

const formatLapTime = (lapTime: string | null | undefined) => {
  if (!lapTime || lapTime === 'None') return '-:--.---';

  // Try to parse "0 days 00:01:20.294000" format
  const match = lapTime.match(/(?:(\d+) days? )?(\d+):(\d+):([\d.]+)/);
  if (match) {
    const [, , hours, minutes, secondsStr] = match;
    const minutesNum = parseInt(minutes, 10);
    const secondsNum = parseFloat(secondsStr);
    const totalMinutes = (parseInt(hours || '0', 10) * 60) + minutesNum;
    return `${totalMinutes}:${secondsNum.toFixed(3).padStart(6, '0')}`;
  }

  // Fallback to returning original string
  return lapTime;
};

// Custom Dropdown Component
interface DropdownProps<T> {
  label: string;
  icon: React.ReactNode;
  options: T[];
  value: T | null;
  onChange: (value: T) => void;
  getLabel: (option: T) => string;
  getKey: (option: T) => string | number;
  disabled?: boolean;
  placeholder?: string;
  openUpwards?: boolean;
  maxItems?: number;
}

function CustomDropdown<T>({ 
  label, 
  icon, 
  options, 
  value, 
  onChange, 
  getLabel, 
  getKey, 
  disabled, 
  placeholder = "Select...",
  openUpwards = false,
  maxItems = 7
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-2 mb-2 opacity-40 uppercase text-[10px] font-mono font-bold tracking-[0.2em]">
        {icon}
        <span>{label}</span>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-dark-bg border border-dark-border px-3 py-2.5 text-sm flex items-center justify-between transition-all rounded-sm",
          disabled ? "opacity-30 cursor-not-allowed" : "hover:border-f1-red/50 cursor-pointer",
          isOpen && "border-f1-red"
        )}
      >
        <span className="truncate">{value ? getLabel(value) : placeholder}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: openUpwards ? -5 : 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: openUpwards ? -5 : 5 }}
            className={cn(
              "absolute z-[100] w-full bg-dark-surface border border-dark-border shadow-2xl overflow-y-auto rounded-sm",
              openUpwards ? "bottom-full mb-1" : "mt-1"
            )}
            style={{ maxHeight: `${maxItems * 40}px` }}
          >
            {options.map((option, idx) => (
              <button
                key={`${getKey(option)}-${idx}`}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-f1-red hover:text-white transition-colors flex items-center justify-between",
                  value && getKey(value) === getKey(option) && "bg-f1-red/20 text-f1-red"
                )}
              >
                <span className="truncate">{getLabel(option)}</span>
                {value && getKey(value) === getKey(option) && <Check className="w-4 h-4" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface TelemetryChartProps {
  data: any[];
  metric: string;
  results: F1Result[];
  selectedDrivers: string[];
  height?: number | string;
  showXAxis?: boolean;
}

function TelemetryChart({ data, metric, results, selectedDrivers, height = 200, showXAxis = false }: TelemetryChartProps) {
  return (
    <div className="w-full flex-1" style={{ height: typeof height === 'number' ? `${height}px` : height, minHeight: 0, minWidth: 0, position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: showXAxis ? 30 : 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1A1B1E" vertical={false} />
          <XAxis 
            dataKey="distance" 
            hide={!showXAxis}
            type="number" 
            domain={['dataMin', 'dataMax']}
            tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#666' }}
            stroke="#1A1B1E"
            axisLine={false}
            label={showXAxis ? { value: 'Distance (m)', position: 'bottom', offset: 10, fill: '#444', fontSize: 9, fontFamily: 'monospace' } : undefined}
          />
          <YAxis 
            tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#666' }}
            stroke="#1A1B1E"
            axisLine={false}
            domain={
              metric === 'gear' ? [0, 8] :
              metric === 'throttle' || metric === 'brake' ? [0, 100] :
              metric === 'speed' ? [0, 400] :
              metric === 'rpm' ? [0, 15000] :
              ['auto', 'auto']
            }
            width={40}
            label={{ value: METRIC_LABELS[metric] || metric, angle: -90, position: 'insideLeft', offset: 10, fill: '#444', fontSize: 9, fontFamily: 'monospace' }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#151619', border: '1px solid #2D2E33', borderRadius: '4px', color: '#fff', fontFamily: 'monospace', fontSize: '10px' }}
            itemStyle={{ padding: '1px 0' }}
            cursor={{ stroke: '#FF1E1E', strokeWidth: 1 }}
            isAnimationActive={false}
            labelFormatter={(label) => `Distance: ${label}m`}
            formatter={(value: number, name: string) => {
              const [acronym, m] = name.split('_');
              if (m !== metric) return null;
              return [value.toFixed(metric === 'gear' ? 0 : 1), acronym];
            }}
          />
          <Legend 
            verticalAlign="top" 
            align="right" 
            height={24}
            iconType="circle"
            formatter={(value: string) => {
              const [acronym] = value.split('_');
              return <span className="text-[9px] font-mono font-bold text-white/60 uppercase tracking-widest ml-1">{acronym}</span>;
            }}
          />
          {selectedDrivers.map((num, idx) => {
            const d = results.find(drv => drv.DriverNumber === num);
            if (!d) return null;
            const isDashed = selectedDrivers.slice(0, idx).some(prevNum => {
              const prevD = results.find(drv => drv.DriverNumber === prevNum);
              return prevD && d && prevD.TeamName === d.TeamName;
            });
            // Assign some default colors if TeamColor is missing from the new API
            const defaultColors = ['#FF1E1E', '#1E90FF', '#32CD32', '#FFA500', '#9370DB', '#00CED1'];
            const color = d.TeamColor ? `#${d.TeamColor}` : defaultColors[idx % defaultColors.length];
            return (
              <Line
                key={`${num}-${metric}`}
                type={metric === 'gear' ? 'step' : 'monotone'}
                dataKey={`${d.Abbreviation}_${metric}`}
                name={`${d.Abbreviation}_${num}_${metric}`}
                stroke={color}
                strokeWidth={2}
                strokeDasharray={isDashed ? "5 5" : undefined}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
                isAnimationActive={false}
                  connectNulls={true}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function App() {
  const [year, setYear] = useState(2026);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [results, setResults] = useState<F1Result[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [availableLaps, setAvailableLaps] = useState<Record<string, Lap[]>>({});
  const [selectedLaps, setSelectedLaps] = useState<Record<string, Lap | null>>({});
  const [telemetryData, setTelemetryData] = useState<any[]>([]);
  const [selectedMetric, setSelectedMetric] = useState('speed');
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [loading, setLoading] = useState(false);
  const [isLoadingDelayed, setIsLoadingDelayed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Timer for loading state
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    if (loading || isInitialLoad) {
      timeoutId = setTimeout(() => {
        setIsLoadingDelayed(true);
      }, 3000);
    } else {
      setIsLoadingDelayed(false);
    }
    return () => clearTimeout(timeoutId);
  }, [loading, isInitialLoad]);

  // Initial load of meetings
  useEffect(() => {
    const loadMeetings = async () => {
      try {
        setLoading(true);
        const data = await f1Service.getMeetings(year);
        // Sort by round
        const sorted = data.sort((a, b) => a.round - b.round);
        
        setMeetings(sorted);
        
        if (sorted.length > 0) {
          setSelectedMeeting(sorted[0]);
          setError(null);
        } else {
          setSelectedMeeting(null);
          setError(`Für ${year} liegen keine Daten vor. Möchtest du die Daten von 2023 oder 2026 sehen?`);
          setIsInitialLoad(false);
        }
      } catch (err) {
        setError(
          err instanceof Error && err.message.includes('Live F1 session in progress')
            ? 'API access is restricted during live F1 sessions. Get an API key here: https://buy.stripe.com/eVqcN41BPekP0iIalBcEw02'
            : `Failed to load meetings: ${err instanceof Error ? err.message : String(err)}`
        );
        setIsInitialLoad(false);
      } finally {
        setLoading(false);
      }
    };
    loadMeetings();
  }, [year]);

  // Load sessions when meeting changes
  useEffect(() => {
    if (!selectedMeeting) return;
    const loadSessions = async () => {
      try {
        setLoading(true);
        const sessionsData = await f1Service.getSessions(
          year,
          selectedMeeting.meeting_name
        );
        
        setSessions(sessionsData);
        
        if (sessionsData.length > 0) {
          setSelectedSession(sessionsData[sessionsData.length - 1]);
        } else {
          setSelectedSession(null);
          setResults([]);
          setSelectedDrivers([]);
          setAvailableLaps({});
          setSelectedLaps({});
          setTelemetryData([]);
          setIsInitialLoad(false);
        }
      } catch (err) {
        setError(
          err instanceof Error && err.message.includes('Live F1 session in progress')
            ? 'API access is restricted during live F1 sessions. Get an API key here: https://buy.stripe.com/eVqcN41BPekP0iIalBcEw02'
            : `Failed to load sessions: ${err instanceof Error ? err.message : String(err)}`
        );
        setIsInitialLoad(false);
      } finally {
        setLoading(false);
      }
    };
    loadSessions();
  }, [selectedMeeting]);

  // Load results when session changes
  useEffect(() => {
    if (!selectedSession) return;
    const loadResults = async () => {
      try {
        setLoading(true);
        const resultsData = await f1Service.getResults(year, selectedMeeting.meeting_name, selectedSession.session_name);

        setResults(resultsData.sort((a, b) => a.Position - b.Position));
        
        // Removed auto-selection of top drivers
        setSelectedDrivers([]);
        
        // Reset telemetry and laps
        setTelemetryData([]);
        setAvailableLaps({});
        setSelectedLaps({});
        setIsInitialLoad(false);
      } catch (err) {
        setError(
          err instanceof Error && err.message.includes('Live-Datenlimit erreicht')
            ? err.message
            : err instanceof Error && err.message.includes('Live F1 session in progress')
            ? 'API access is restricted during live F1 sessions. Get an API key here: https://buy.stripe.com/eVqcN41BPekP0iIalBcEw02'
            : `Failed to load results: ${err instanceof Error ? err.message : String(err)}`
        );
        setIsInitialLoad(false);
      } finally {
        setLoading(false);
      }
    };
    loadResults();
  }, [selectedSession]);

  // Load laps for selected drivers
  useEffect(() => {
    const loadLapsForSelected = async () => {
      if (!selectedSession) return;
      
      const newLapsToFetch = selectedDrivers.filter(num => !availableLaps[num]);
      if (newLapsToFetch.length === 0) return;

      try {
        setLoading(true);
        const lapResults = await Promise.all(
          newLapsToFetch.map(async (num) => {
          const r = results.find(res => String(res.DriverNumber) === String(num));
          if (!r) return { num, laps: [] };
          const laps = await f1Service.getAllLaps(year, selectedMeeting?.meeting_name || '', selectedSession.session_name, r.Abbreviation);
            return { num, laps };
          })
        );

        const updatedAvailable = { ...availableLaps };
        const updatedSelected = { ...selectedLaps };

        lapResults.forEach(({ num, laps }) => {
          updatedAvailable[num] = laps;
          // Keep existing selected lap or set to null if no lap is selected yet.
          if (updatedSelected[num] === undefined) {
             updatedSelected[num] = null;
          }
        });

        setAvailableLaps(updatedAvailable);
        setSelectedLaps(updatedSelected);

        // Ensure initial load state is cleared once lap data fetching is complete
        setIsInitialLoad(false);
      } catch (err) {
        console.error('Error loading laps:', err);
        setError(
          err instanceof Error && err.message.includes('Live F1 session in progress')
            ? 'API access is restricted during live F1 sessions. Get an API key here: https://buy.stripe.com/eVqcN41BPekP0iIalBcEw02'
            : `Failed to load laps: ${err instanceof Error ? err.message : String(err)}`
        );
        setIsInitialLoad(false);
      } finally {
        setLoading(false);
      }
    };

    loadLapsForSelected();
  }, [selectedDrivers, selectedSession]);

  // Auto-trigger comparison when all data is ready AND laps are selected
  useEffect(() => {
    const allLapsReady = selectedDrivers.length > 0 && 
                        selectedDrivers.every(num => selectedLaps[num] !== null && selectedLaps[num] !== undefined);
    
    let isCancelled = false;

    if (allLapsReady && !loading) {
      const runComparison = async () => {
        if (selectedDrivers.length < 1 || !selectedSession) return;
        
        setLoading(true);
        setError(null);
        try {
          const fetchPromises = selectedDrivers.map(async (driverNum) => {
            const driver = results.find(d => String(d.DriverNumber) === String(driverNum));
            const lap = selectedLaps[driverNum];
            
            if (!lap || !driver) {
              return { driver, telemetry: [] };
            }
            
            const telemetry = await f1Service.getTelemetry(
              year,
              selectedMeeting?.meeting_name || '',
              selectedSession.session_name,
              driver.Abbreviation,
              lap.LapNumber
            );

            return { driver, telemetry };
          });

          const resultsData = await Promise.all(fetchPromises);

          if (isCancelled) return;

          const merged: any[] = [];
          const maxDistance = Math.max(...resultsData.map(r =>
            r.telemetry.length > 0 ? r.telemetry[r.telemetry.length - 1].distance || 0 : 0
          ));

          // Initialize indices for each driver to optimize the search
          const indices = new Array(resultsData.length).fill(0);

          for (let dist = 0; dist <= maxDistance; dist += 20) { // Higher resolution
            const mergedPoint: any = { distance: dist };
            
            resultsData.forEach((res, idx) => {
              if (!res.driver || res.telemetry.length < 2) return;
              
              const telemetry = res.telemetry;
              
              if (dist < telemetry[0].distance || dist > telemetry[telemetry.length - 1].distance) {
                return;
              }
              
              let i = indices[idx];
              while (i < telemetry.length - 1 && telemetry[i + 1].distance < dist) {
                i++;
              }
              indices[idx] = i;
              
              const p1 = telemetry[i];
              const p2 = telemetry[i + 1];
              
              if (!p1 || !p2) return;
              
              const d1 = p1.distance || 0;
              const d2 = p2.distance || 0;
              
              if (d2 - d1 > 200) return; // Gap check
              
              const ratio = d2 > d1 ? (dist - d1) / (d2 - d1) : 0;
              
              // Store all metrics for this driver at this distance
              METRICS.forEach(metric => {
                const val1 = p1[metric as keyof TelemetryPoint] as number;
                const val2 = p2[metric as keyof TelemetryPoint] as number;
                const interpolated = val1 + (val2 - val1) * ratio;
                mergedPoint[`${res.driver.Abbreviation}_${metric}`] = interpolated;
              });
              
              // Also store the acronym for the legend/tooltips if needed
              mergedPoint[res.driver.Abbreviation] = true;
            });
            
            if (Object.keys(mergedPoint).length > 1) {
              merged.push(mergedPoint);
            }
          }
          setTelemetryData(merged);
          setIsInitialLoad(false);
        } catch (err) {
          if (!isCancelled) {
            console.error(err);
            setError(`Telemetry data unavailable: ${err instanceof Error ? err.message : String(err)}`);
            setIsInitialLoad(false);
          }
        } finally {
          if (!isCancelled) {
            setLoading(false);
          }
        }
      };

      runComparison();
    }

    return () => {
      isCancelled = true;
    };
  }, [selectedLaps, selectedDrivers, selectedSession, results]);

  const handleDriverToggle = (driverNumber: string) => {
    setSelectedDrivers(prev => {
      if (prev.includes(driverNumber)) {
        return prev.filter(id => id !== driverNumber);
      }
      if (prev.length >= 2) {
        return [prev[1], driverNumber];
      }
      return [...prev, driverNumber];
    });
  };

  const handleExportImage = async () => {
    if (!selectedSession) return;
    
    setIsExporting(true);
    try {
      // Ensure the hidden container is rendered with the latest data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!exportRef.current) {
         throw new Error("Export container is not ready.");
      }

      const dataUrl = await toPng(exportRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#0a0a0a',
        width: 1600,
        height: 900,
      });
      
      const driverNames = selectedDrivers
        .map(num => results.find(d => d.DriverNumber === num)?.Abbreviation)
        .filter(Boolean)
        .join('-');
      
      const filename = `${selectedMeeting?.meeting_name}-${selectedSession?.session_name}-${driverNames}-telemetry.png`
        .toLowerCase()
        .replace(/\s+/g, '-');
      
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export image');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen lg:w-screen bg-dark-bg text-white font-sans selection:bg-f1-red selection:text-white lg:overflow-hidden flex flex-col relative">
      <AnimatePresence>
        {isInitialLoad && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-dark-bg flex flex-col items-center justify-center"
          >
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-dark-border border-t-f1-red rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-f1-red animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Initializing</h2>
                <p className="text-xs font-mono uppercase tracking-[0.3em] opacity-50">
                  {isLoadingDelayed ? "Rennen nicht im Cache. Live-Download von F1-Servern läuft (kann bis zu 2 Minuten dauern)..." : "Loading Telemetry Data..."}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast / Modal */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] bg-f1-red text-white px-6 py-4 rounded-md shadow-2xl border border-white/20 flex items-center gap-4 max-w-xl w-full"
          >
            <Activity className="w-6 h-6 shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold uppercase tracking-wider mb-1">
                {error.includes("Live-Datenlimit erreicht") ? "Live-Datenlimit erreicht" : "Error"}
              </h3>
              <p className="text-sm opacity-90">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-2 hover:bg-black/20 rounded-sm transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex flex-col-reverse lg:grid lg:grid-cols-[380px_1fr] flex-1 lg:overflow-hidden">
        {/* Sidebar Controls */}
        <aside className="border-t lg:border-t-0 lg:border-r border-dark-border lg:h-full carbon-pattern overflow-y-auto no-scrollbar relative flex flex-col">
          <div className="p-3 lg:p-4 h-full flex flex-col relative z-10">
            {/* Logo area */}
            <div className="flex items-center justify-between mb-4">
              <img
                src="https://storage.googleapis.com/lap-check-images/lap_logo.png?v=3"
                alt="Lap-Check Logo"
                className="h-10 w-auto"
                referrerPolicy="no-referrer"
              />
              {loading && <Loader2 className="w-5 h-5 animate-spin text-f1-red" />}
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col space-y-3 bg-dark-surface/40 p-3 rounded-xl lg:bg-transparent lg:p-0 lg:rounded-none border border-dark-border lg:border-0 mb-2 lg:mb-0 min-h-0"
            >
              <div className="space-y-3">
                <CustomDropdown
                  label="01. Year"
                  icon={<Calendar className="w-3 h-3 text-f1-red" />}
                  options={YEARS}
                  value={year}
                  onChange={setYear}
                  getLabel={(y) => y.toString()}
                  getKey={(y) => y}
                />

                <CustomDropdown
                  label="02. Grand Prix"
                  icon={<MapPin className="w-3 h-3 text-f1-red" />}
                  options={meetings}
                  value={selectedMeeting}
                  onChange={setSelectedMeeting}
                  getLabel={(m) => m.meeting_name}
                  getKey={(m) => m.round}
                  placeholder="Select Grand Prix"
                />

                <AnimatePresence>
                  {selectedMeeting && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                      animate={{ opacity: 1, height: 'auto', transitionEnd: { overflow: 'visible' } }}
                      exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    >
                      <CustomDropdown
                        label="03. Session"
                        icon={<Calendar className="w-3 h-3 text-f1-red" />}
                        options={sessions}
                        value={selectedSession}
                        onChange={setSelectedSession}
                        getLabel={(s) => s.session_name}
                        getKey={(s) => s.session_identifier}
                        placeholder="Select Session"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Driver Selection */}
              <AnimatePresence>
                {selectedSession && results.length > 0 && (
                  <motion.section 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pt-4 border-t border-dark-border"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 opacity-40 uppercase text-[10px] font-mono font-bold tracking-[0.2em]">
                        <Users className="w-3 h-3 text-f1-red" />
                        <span>04. Drivers ({selectedDrivers.length}/2)</span>
                      </div>
                      {selectedDrivers.length > 0 && (
                        <button 
                          onClick={() => {
                            setSelectedDrivers([]);
                            setTelemetryData([]);
                          }}
                          className="text-[10px] font-mono uppercase text-f1-red hover:underline"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1.5">
                      {results.map((d) => (
                        <button
                          key={d.DriverNumber}
                          onClick={() => handleDriverToggle(d.DriverNumber)}
                          className={cn(
                            "relative overflow-hidden group flex items-center justify-between px-2 py-1.5 border rounded-sm transition-all",
                            selectedDrivers.includes(d.DriverNumber)
                              ? "bg-f1-red/10 text-white border-f1-red"
                              : "bg-dark-bg border-dark-border hover:border-f1-red/50"
                          )}
                        >
                          <div
                            className="absolute left-0 top-0 bottom-0 w-1 transition-all group-hover:w-1.5"
                            style={{ backgroundColor: `#${d.TeamColor || '888'}` }}
                          />
                          <div className="pl-1.5 flex items-center gap-2">
                            <span className="font-mono font-bold text-[10px] w-3 text-center text-white/40">{d.Position}</span>
                            <span className="font-black uppercase tracking-tighter text-xs">{d.Abbreviation}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.section>
                )}

                {/* 05. Lap Selection */}
                {selectedDrivers.length > 0 && (
                  <motion.section
                    key="sidebar-lap-selection"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mt-4 pt-4 border-t border-dark-border"
                  >
                    <div className="flex items-center gap-2 opacity-40 uppercase text-[10px] font-mono font-bold tracking-[0.2em] mb-3">
                      <Timer className="w-3 h-3 text-f1-red" />
                      <span>05. Lap Selection</span>
                    </div>
                    <div className="space-y-2">
                      {selectedDrivers.map(num => {
                        const d = results.find(drv => drv.DriverNumber === num);
                        const laps = availableLaps[num] || [];
                        if (laps.length === 0) return null;

                        return (
                          <div key={`sidebar-lap-${num}`} className="bg-dark-bg border border-dark-border p-2 rounded-sm">
                            <CustomDropdown
                              label={`LAP FOR ${d?.Abbreviation}`}
                              icon={<Timer className="w-3 h-3 text-f1-red" />}
                              options={laps}
                              value={selectedLaps[num] || null}
                              onChange={(lap) => setSelectedLaps(prev => ({ ...prev, [num]: lap }))}
                              getLabel={(l) => `Lap ${l.LapNumber} (${formatLapTime(l.LapTime)}) [${l.Compound}]`}
                              getKey={(l) => l.LapNumber}
                              maxItems={5}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Mobile Credits */}
            <footer className="lg:hidden mt-8 pt-8 flex flex-col items-center gap-2 opacity-20 hover:opacity-50 transition-opacity">
              <div className="flex items-center gap-4 text-[9px] font-mono uppercase tracking-[0.2em]">
                <span>Data: OpenF1 API</span>
                <span className="w-1 h-1 bg-white rounded-full" />
                <span>Made by Sascha Riefe</span>
                <span className="w-1 h-1 bg-white rounded-full" />
                <span>Powered by: OpenF1 API</span>
              </div>
              <p className="text-[8px] font-mono uppercase tracking-widest">Professional Telemetry Analysis Suite</p>
            </footer>
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="flex-1 p-4 lg:p-6 flex flex-col bg-dark-bg lg:overflow-hidden">
          <AnimatePresence mode="wait">
            {!selectedSession ? (
              <motion.div 
                key="awaiting-input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.2 }}
                className="flex-1 min-h-[300px] lg:min-h-0 flex flex-col items-center justify-center text-center bg-dark-surface/20 p-8 rounded-xl border border-dark-border lg:bg-transparent lg:border-0"
              >
                <Gauge className="w-24 h-24 mb-6" />
                <p className="text-2xl font-black uppercase italic tracking-tighter">Awaiting Telemetry Input</p>
                <div className="flex gap-4 mt-6">
                  <div className="flex items-center gap-2 text-xs font-mono"><Timer className="w-4 h-4" /> Real-time Integration</div>
                  <div className="flex items-center gap-2 text-xs font-mono"><Activity className="w-4 h-4" /> Multi-Driver Trace</div>
                </div>
              </motion.div>
            ) : telemetryData.length > 0 ? (
              <motion.div 
                key="telemetry-dashboard"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col min-h-0"
              >
              <div className="mb-4 flex flex-col items-center text-center lg:flex-row lg:items-end lg:text-left justify-between gap-4">
                <div className="flex flex-col items-center lg:items-start">
                  <div className="flex items-center gap-2 text-f1-red text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-1">
                    <span className="w-2 h-2 bg-f1-red rounded-full animate-pulse" />
                    Live Analysis
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-black uppercase italic tracking-tighter leading-tight lg:leading-none">
                    {selectedMeeting?.meeting_name}
                  </h2>
                  <p className="text-sm font-mono opacity-50 uppercase mt-2">{selectedSession?.session_name}</p>
                </div>
                
                <div className="flex items-stretch gap-3">
                  <div className="flex gap-2">
                    {selectedDrivers.map((num, idx) => {
                      const d = results.find(drv => drv.DriverNumber === num);
                      const lap = selectedLaps[num];
                      const isDashed = selectedDrivers.slice(0, idx).some(prevNum => {
                        const prevD = results.find(drv => drv.DriverNumber === prevNum);
                        return prevD && d && prevD.TeamName === d.TeamName;
                      });
                      return (
                        <div key={`driver-status-${num}`} className="flex items-stretch gap-3 bg-dark-surface/50 border border-dark-border p-2.5 rounded-sm min-w-[110px]">
                          <div 
                            className="w-1 rounded-full" 
                            style={{ 
                              background: isDashed 
                                ? `repeating-linear-gradient(to bottom, #${d?.TeamColor || '888'}, #${d?.TeamColor || '888'} 4px, transparent 4px, transparent 8px)`
                                : `#${d?.TeamColor || '888'}`
                            }} 
                          />
                          <div className="flex flex-col justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-lg tracking-tighter leading-none">{d?.Abbreviation}</span>
                              {isDashed && <span className="text-[8px] font-mono opacity-50 border border-white/20 px-1 rounded-sm">DASHED</span>}
                            </div>
                            {lap && (
                              <div className="flex flex-col mt-1">
                                <span className="text-[8px] font-mono opacity-40 uppercase tracking-tighter">Lap {lap.LapNumber} ({lap.Compound})</span>
                                <span className="text-[11px] font-mono text-f1-red font-bold leading-none">{formatLapTime(lap.LapTime)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={handleExportImage}
                    disabled={isExporting || !selectedSession}
                    className="flex items-center gap-2 bg-dark-surface hover:bg-white/5 border border-dark-border px-4 rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <Download className={cn("w-3.5 h-3.5 transition-transform", isExporting ? "animate-bounce" : "group-hover:-translate-y-0.5")} />
                    {isExporting ? 'Exporting...' : 'Export as PNG'}
                  </button>
                </div>
              </div>

                <div className="flex-1 min-h-[400px] lg:min-h-0 border border-dark-border p-2 lg:p-4 bg-dark-surface/30 rounded-xl lg:rounded-lg relative overflow-hidden flex flex-col overflow-y-auto no-scrollbar">
                <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
                  style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
                />
                
                {/* Metric Selector Tabs */}
                <div className="flex flex-wrap items-center gap-1 mb-4 relative z-10">
                  <div className="flex bg-dark-bg/50 border border-dark-border p-1 rounded-sm mr-2">
                    <button
                      onClick={() => setViewMode('single')}
                      className={cn(
                        "px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-widest transition-all rounded-sm",
                        viewMode === 'single' ? "bg-f1-red text-white" : "text-white/40 hover:text-white/60"
                      )}
                    >
                      Single
                    </button>
                    <button
                      onClick={() => setViewMode('all')}
                      className={cn(
                        "px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-widest transition-all rounded-sm",
                        viewMode === 'all' ? "bg-f1-red text-white" : "text-white/40 hover:text-white/60"
                      )}
                    >
                      All
                    </button>
                  </div>

                  {viewMode === 'single' && (
                    <div className="flex flex-wrap gap-1">
                      {METRICS.map((m) => (
                        <button
                          key={m}
                          onClick={() => setSelectedMetric(m)}
                          className={cn(
                            "px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest transition-all border rounded-sm",
                            selectedMetric === m
                              ? "bg-f1-red/20 text-f1-red border-f1-red"
                              : "bg-dark-bg/50 text-white/40 border-dark-border hover:border-white/20 hover:text-white/60"
                          )}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {!loading && telemetryData.length > 0 && (
                    <motion.div
                      key={`${viewMode}-${selectedMetric}-${JSON.stringify(selectedLaps)}-${JSON.stringify(selectedDrivers)}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex-1 flex flex-col min-h-0"
                    >
                      {viewMode === 'single' ? (
                        <TelemetryChart 
                          data={telemetryData} 
                          metric={selectedMetric} 
                          results={results}
                          selectedDrivers={selectedDrivers} 
                          height="100%" 
                          showXAxis={true} 
                        />
                      ) : (
                        <div className="flex-1 flex flex-col min-h-0">
                          {METRICS.map((m, idx) => (
                            <div key={m} className="flex-1 min-h-0 border-b border-white/5 last:border-0">
                              <TelemetryChart 
                                data={telemetryData} 
                                metric={m} 
                                results={results}
                                selectedDrivers={selectedDrivers} 
                                height="100%" 
                                showXAxis={idx === METRICS.length - 1} 
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="mt-4 flex justify-between items-center text-[10px] font-mono opacity-30 uppercase tracking-widest">
              </div>
            </motion.div>
            ) : (
              <motion.div 
                key="loading-telemetry"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 min-h-[300px] lg:min-h-0 flex items-center justify-center"
              >
                <div className="text-center space-y-4">
                  <div className="inline-block p-4 border border-dark-border rounded-full animate-pulse">
                    <Timer className="w-8 h-8 text-f1-red" />
                  </div>
                  <p className="text-xs font-mono uppercase tracking-[0.3em] opacity-50 max-w-md mx-auto text-center">
                    {loading && isLoadingDelayed ? "Rennen nicht im Cache. Live-Download von F1-Servern läuft (kann bis zu 2 Minuten dauern)..." :
                     loading ? "Loading Telemetry Data..." :
                     "Telemetry Stream Ready"}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Desktop Credits */}
          <footer className="hidden lg:flex mt-auto pt-8 flex-col items-center gap-2 opacity-20 hover:opacity-50 transition-opacity">
            <div className="flex items-center gap-4 text-[9px] font-mono uppercase tracking-[0.2em]">
              <span>Data: OpenF1 API</span>
              <span className="w-1 h-1 bg-white rounded-full" />
              <span>Made by Sascha Riefe</span>
              <span className="w-1 h-1 bg-white rounded-full" />
              <span>Powered by: OpenF1 API</span>
            </div>
            <p className="text-[8px] font-mono uppercase tracking-widest">Professional Telemetry Analysis Suite</p>
          </footer>
        </section>
      </main>

      {/* Hidden Export Container (16:9) */}
      {isExporting && (
        <div className="fixed left-[-9999px] top-[-9999px]">
          <div
            ref={exportRef}
            style={{ width: '1600px', height: '900px' }}
            className="bg-dark-bg p-12 flex flex-col relative overflow-hidden"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}
            />
            <div className="absolute inset-0 carbon-pattern opacity-10 pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-end mb-12 relative z-10">
              <div>
                <div className="flex items-center gap-3 text-f1-red text-sm font-mono font-bold uppercase tracking-[0.3em] mb-3">
                  <span className="w-3 h-3 bg-f1-red rounded-full" />
                  Telemetry Analysis
                </div>
                <h2 className="text-6xl font-black uppercase italic tracking-tighter leading-none mb-4">
                  {selectedMeeting?.meeting_name}
                </h2>
                <p className="text-xl font-mono opacity-50 uppercase tracking-widest">{selectedSession?.session_name}</p>
              </div>

              <div className="flex gap-8">
                {selectedDrivers.map((num, idx) => {
                  const d = results.find(drv => drv.DriverNumber === num);
                  const lap = selectedLaps[num];
                  const isDashed = selectedDrivers.slice(0, idx).some(prevNum => {
                    const prevD = results.find(drv => drv.DriverNumber === prevNum);
                    return prevD && d && prevD.TeamName === d.TeamName;
                  });
                  return (
                    <div key={`export-driver-${num}`} className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-4 bg-dark-surface border border-dark-border px-6 py-3 rounded-sm">
                        <div
                          className="w-2 h-8"
                          style={{
                            background: isDashed
                              ? `repeating-linear-gradient(to bottom, #${d?.TeamColor || '888'}, #${d?.TeamColor || '888'} 6px, transparent 6px, transparent 12px)`
                              : `#${d?.TeamColor || '888'}`
                          }}
                        />
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-3xl">{d?.Abbreviation}</span>
                          {isDashed && <span className="text-xs font-mono opacity-50 border border-white/20 px-2 py-0.5 rounded-sm">DASHED</span>}
                        </div>
                      </div>
                      {lap && (
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-mono opacity-40 uppercase tracking-widest">Lap {lap.LapNumber} ({lap.Compound})</span>
                          <span className="text-2xl font-mono text-f1-red font-bold">{formatLapTime(lap.LapTime)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Plot Area */}
            <div className="flex-1 border border-dark-border bg-dark-surface/30 rounded-xl relative overflow-hidden p-8" style={{ minHeight: 0, minWidth: 0, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={telemetryData} margin={{ top: 20, right: 40, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis
                    dataKey="distance"
                    type="number"
                    domain={['auto', 'auto']}
                    stroke="#444"
                    tick={{ fill: '#666', fontSize: 14 }}
                    label={{ value: 'Distance (m)', position: 'bottom', fill: '#444', fontSize: 14, offset: 0 }}
                  />
                  <YAxis
                    stroke="#444"
                    domain={[0, 400]}
                    tick={{ fill: '#666', fontSize: 14 }}
                    label={{ value: 'SPEED (KM/H)', angle: -90, position: 'insideLeft', fill: '#444', fontSize: 14 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '4px' }}
                    itemStyle={{ fontSize: '14px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#666', marginBottom: '4px' }}
                  />
                  {selectedDrivers.map((num, idx) => {
                    const d = results.find(drv => drv.DriverNumber === num);
                    if (!d) return null;
                    const isDashed = selectedDrivers.slice(0, idx).some(prevNum => {
                      const prevD = results.find(drv => drv.DriverNumber === prevNum);
                      return prevD && d && prevD.TeamName === d.TeamName;
                    });
                    // Assign some default colors if TeamColor is missing from the new API
                    const defaultColors = ['#FF1E1E', '#1E90FF', '#32CD32', '#FFA500', '#9370DB', '#00CED1'];
                    const color = d.TeamColor ? `#${d.TeamColor}` : defaultColors[idx % defaultColors.length];
                    return (
                      <Line
                        key={`export-line-${num}`}
                        type="monotone"
                        dataKey={`${d.Abbreviation}_speed`}
                        name={`${d.Abbreviation}_${num}_speed`}
                        stroke={color}
                        strokeWidth={4}
                        strokeDasharray={isDashed ? "5 5" : undefined}
                        dot={false}
                        animationDuration={0}
                        connectNulls={true}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Footer */}
            <div className="mt-8 flex justify-between items-center opacity-30 font-mono text-xs uppercase tracking-[0.5em]">
              <div>Lap-Check Telemetry: SPEED</div>
              <div>{new Date().toLocaleDateString()} // {selectedMeeting?.location}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
