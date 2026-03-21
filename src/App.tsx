/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
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
import { useQuery, useQueries } from '@tanstack/react-query';
import { f1Service, Meeting, Session, F1Result, TelemetryPoint, Lap } from './services/f1Service';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

echarts.connect('telemetryGroup');

const YEARS = [2026, 2025, 2024, 2023];
const METRICS = ['speed', 'throttle', 'brake', 'rpm', 'gear'];
const METRIC_LABELS: Record<string, string> = {
  speed: 'Speed (KM/H)',
  throttle: 'Throttle (%)',
  brake: 'Brake (%)',
  rpm: 'RPM',
  gear: 'Gear'
};

const parseLapTime = (timeStr: string | null | undefined): number => {
  if (!timeStr || timeStr === 'None' || timeStr === 'NaT') return Infinity;
  const match = timeStr.match(/(?:(\d+) days? )?(\d+):(\d+):([\d.]+)/);
  if (!match) return Infinity;
  const [, days, hours, minutes, seconds] = match;
  return (parseInt(days || '0') * 86400) + (parseInt(hours) * 3600) + (parseInt(minutes) * 60) + parseFloat(seconds);
};

const formatLapTime = (lapTime: string | null | undefined) => {
  if (!lapTime || lapTime === 'None' || lapTime === 'NaT') return 'In/Out Lap';
  const match = lapTime.match(/(?:(\d+) days? )?(\d+):(\d+):([\d.]+)/);
  if (match) {
    const [, , hours, minutes, secondsStr] = match;
    const minutesNum = parseInt(minutes, 10);
    const secondsNum = parseFloat(secondsStr);
    const totalMinutes = (parseInt(hours || '0', 10) * 60) + minutesNum;
    return `${totalMinutes}:${secondsNum.toFixed(3).padStart(6, '0')}`;
  }
  return lapTime;
};

// --- NEU: Dynamische Tyre Icon Komponente ---
const TyreIcon = ({ compound, size = 'normal' }: { compound: string, size?: 'normal' | 'large' }) => {
  let color = '#444';
  let letter = compound?.charAt(0)?.toUpperCase() || '?';
  let textColor = '#fff';

  switch (compound?.toUpperCase()) {
    case 'SOFT': color = '#FF1E1E'; letter = 'S'; break;
    case 'MEDIUM': color = '#FFD700'; letter = 'M'; textColor = '#000'; break;
    case 'HARD': color = '#FFFFFF'; letter = 'H'; textColor = '#000'; break;
    case 'INTERMEDIATE': color = '#32CD32'; letter = 'I'; textColor = '#000'; break;
    case 'WET': color = '#1E90FF'; letter = 'W'; break;
  }

  const dims = size === 'large' ? 'w-10 h-10 border-[3px]' : 'w-5 h-5 border-[1.5px]';
  const textSize = size === 'large' ? 'text-xl' : 'text-[10px]';

  return (
    <div
      className={cn("flex items-center justify-center rounded-full border-dark-bg shrink-0 shadow-lg", dims)}
      style={{ backgroundColor: color }}
      title={compound}
    >
      <span className={cn("font-black leading-none mt-[1px]", textSize)} style={{ color: textColor }}>
        {letter}
      </span>
    </div>
  );
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
  renderOption?: (option: T) => React.ReactNode;
  renderSelectedValue?: (option: T) => React.ReactNode;
  disabled?: boolean;
  placeholder?: string;
  openUpwards?: boolean;
  autoPosition?: boolean;
  maxItems?: number;
}

function CustomDropdown<T>({ 
  label, icon, options, value, onChange, getLabel, getKey, renderOption, renderSelectedValue, disabled, placeholder = "Select...", openUpwards = false, autoPosition = false, maxItems = 7
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [actualOpenUpwards, setActualOpenUpwards] = useState(openUpwards);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    if (!isOpen && autoPosition && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const requiredHeight = maxItems * 40 + 10;
      if (spaceBelow < requiredHeight && rect.top > requiredHeight) {
        setActualOpenUpwards(true);
      } else {
        setActualOpenUpwards(false);
      }
    } else if (!isOpen && !autoPosition) {
      setActualOpenUpwards(openUpwards);
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-2 mb-2 opacity-40 uppercase text-[10px] font-mono font-bold tracking-[0.2em]">
        {icon}
        <span>{label}</span>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={toggleDropdown}
        className={cn(
          "w-full bg-dark-bg border border-dark-border px-3 py-2.5 text-sm flex items-center justify-between transition-all rounded-sm",
          disabled ? "opacity-30 cursor-not-allowed" : "hover:border-f1-red/50 cursor-pointer",
          isOpen && "border-f1-red"
        )}
      >
        <div className="truncate flex-1 min-w-0 text-left mr-2">
          {value ? (renderSelectedValue ? renderSelectedValue(value) : <span className="inline-block leading-none mt-[1px]">{getLabel(value)}</span>) : <span className="inline-block leading-none mt-[1px]">{placeholder}</span>}
        </div>
        <ChevronDown className={cn("w-4 h-4 transition-transform shrink-0", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: actualOpenUpwards ? -5 : 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: actualOpenUpwards ? -5 : 5 }}
            className={cn(
              "absolute z-[100] w-full bg-dark-surface border border-dark-border shadow-2xl overflow-y-auto rounded-sm",
              actualOpenUpwards ? "bottom-full mb-1" : "mt-1"
            )}
            style={{ maxHeight: `${maxItems * 40}px` }}
          >
            {options.map((option, idx) => (
              <button
                key={`${getKey(option)}-${idx}`}
                onClick={() => { onChange(option); setIsOpen(false); }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-f1-red hover:text-white transition-colors flex items-center justify-between gap-2",
                  value && getKey(value) === getKey(option) && "bg-f1-red/20 text-f1-red"
                )}
              >
                <div className="flex-1 min-w-0 flex items-center">
                  {/* Nutze renderOption falls vorhanden, sonst Fallback auf reinen Text */}
                  {renderOption ? renderOption(option) : <span className="truncate">{getLabel(option)}</span>}
                </div>
                {value && getKey(value) === getKey(option) && <Check className="w-4 h-4 shrink-0" />}
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

const TelemetryChart = React.memo(function TelemetryChart({
  data, metric, results, selectedDrivers, height = 200, showXAxis = false
}: TelemetryChartProps) {

  const seriesData = React.useMemo(() => {
    return selectedDrivers.map((num, idx) => {
      const d = results.find(drv => drv.DriverNumber === num);
      if (!d) return null;

      const isDashed = selectedDrivers.slice(0, idx).some(prevNum => {
        const prevD = results.find(drv => drv.DriverNumber === prevNum);
        return prevD && d && prevD.TeamName === d.TeamName;
      });

      const defaultColors = ['#FF1E1E', '#1E90FF', '#32CD32', '#FFA500', '#9370DB', '#00CED1'];
      const color = d.TeamColor ? `#${d.TeamColor}` : defaultColors[idx % defaultColors.length];

      const dataPoints = data
        .filter(point => point[`${d.Abbreviation}_${metric}`] !== undefined)
        .map(point => [point.distance, point[`${d.Abbreviation}_${metric}`]]);

      return {
        name: d.Abbreviation,
        type: 'line',
        step: (metric === 'gear' || metric === 'brake') ? 'end' : false,
        symbol: 'none',
        showSymbol: false,
        connectNulls: true,
        data: dataPoints,
        itemStyle: { color },
        lineStyle: {
          type: isDashed ? 'dashed' : 'solid',
          width: 2
        },
        animation: false
      };
    }).filter(Boolean);
  }, [data, metric, results, selectedDrivers]);

  const option = {
    // Force a fixed layout to align all charts vertically (same starting point for X-axis)
    grid: { top: 40, right: 20, bottom: showXAxis ? 30 : 10, left: 75, containLabel: false },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', crossStyle: { color: '#FF1E1E' } },
      backgroundColor: '#151619',
      borderColor: '#2D2E33',
      textStyle: { color: '#fff', fontFamily: 'monospace', fontSize: 10 },
      valueFormatter: (value: number) => {
        if (value === undefined || value === null) return '-';
        if (metric === 'speed') return value.toFixed(2);
        if (metric === 'rpm') return value.toFixed(0);
        return value.toFixed(metric === 'gear' ? 0 : 1);
      }
    },
    legend: {
      show: true,
      top: 0,
      right: 20,
      itemWidth: 20,
      textStyle: { color: '#ffffff90', fontFamily: 'monospace', fontSize: 10 },
      itemStyle: { opacity: 0 } // This hides the series symbol (circle) in the legend, leaving only the line (solid/dashed)
    },
    dataZoom: [{ type: 'inside', xAxisIndex: 0, zoomOnMouseWheel: true, moveOnMouseMove: true }],
    xAxis: {
      type: 'value', min: 'dataMin', max: 'dataMax', show: showXAxis,
      axisLabel: { color: '#666', fontFamily: 'monospace', fontSize: 9 },
      splitLine: { show: false }, axisLine: { show: false }, axisTick: { show: false },
      name: showXAxis ? 'Distance (m)' : '', nameLocation: 'middle', nameGap: 20,
      nameTextStyle: { color: '#444', fontFamily: 'monospace', fontSize: 9 }
    },
    yAxis: {
      type: 'value', name: METRIC_LABELS[metric] || metric, nameLocation: 'middle', nameGap: 50,
      nameTextStyle: { color: '#444', fontFamily: 'monospace', fontSize: 9 },
      min: metric === 'gear' ? 0 : (metric === 'throttle' || metric === 'brake' ? 0 : 'dataMin'),
      max: metric === 'gear' ? 8 : (metric === 'throttle' || metric === 'brake' ? 100 : 'dataMax'),
      axisLabel: {
        color: '#666',
        fontFamily: 'monospace',
        fontSize: 9,
        formatter: (value: number) => {
          if (metric === 'speed') return value.toFixed(2);
          if (metric === 'rpm') return value.toFixed(0);
          return value.toString();
        },
        // We set a fixed width and overflow to prevent the Y-axis labels from taking varying widths and pushing the X-axis differently.
        width: 40,
        overflow: 'break'
      },
      splitLine: { lineStyle: { color: '#1A1B1E', type: 'dashed' } }
    },
    series: seriesData
  };

  return (
    <div style={{ height: typeof height === 'number' ? `${height}px` : height, width: '100%' }}>
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} group="telemetryGroup" opts={{ renderer: 'canvas' }} notMerge={true} />
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.metric === nextProps.metric &&
         prevProps.showXAxis === nextProps.showXAxis &&
         prevProps.selectedDrivers.join(',') === nextProps.selectedDrivers.join(',') &&
         prevProps.data === nextProps.data;
});

export default function App() {
  const [year, setYear] = useState(2026);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [selectedLaps, setSelectedLaps] = useState<Record<string, Lap | null>>({});

  const [selectedMetric, setSelectedMetric] = useState('speed');
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [manualError, setManualError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // --- REACT QUERY DATA FETCHING ---

  const { data: meetings = [], isLoading: loadingMeetings, error: errorMeetings } = useQuery({
    queryKey: ['meetings', year],
    queryFn: async () => {
      const data = await f1Service.getMeetings(year);
      const now = new Date();
      const pastMeetings = data.filter(m => new Date(m.event_date.replace(' ', 'T')) <= now);
      return pastMeetings.sort((a, b) => a.round - b.round);
    }
  });

  const { data: sessions = [], isLoading: loadingSessions, error: errorSessions } = useQuery({
    queryKey: ['sessions', year, selectedMeeting?.meeting_name],
    queryFn: async () => {
      const data = await f1Service.getSessions(year, selectedMeeting!.meeting_name);
      const now = new Date();

      // Behalte alle Sessions, die bereits abgehalten wurden (Safari-kompatibles Date-Parsing)
      const pastSessions = data.filter(s => {
        if (!s.session_date || s.session_date === 'None' || s.session_date === 'NaT') return false;
        return new Date(s.session_date.replace(' ', 'T')) <= now;
      });

      return pastSessions;
    },
    enabled: !!selectedMeeting
  });

  const { data: results = [], isLoading: loadingResults, error: errorResults } = useQuery({
    queryKey: ['results', year, selectedMeeting?.meeting_name, selectedSession?.session_name],
    queryFn: async () => {
      const res = await f1Service.getResults(year, selectedMeeting!.meeting_name, selectedSession!.session_name);
      return res.sort((a, b) => a.Position - b.Position);
    },
    enabled: !!selectedSession
  });

  const lapQueries = useQueries({
    queries: selectedDrivers.map(num => {
      const driver = results.find(r => String(r.DriverNumber) === String(num));
      return {
        queryKey: ['laps', year, selectedMeeting?.meeting_name, selectedSession?.session_name, num],
        queryFn: () => f1Service.getAllLaps(year, selectedMeeting!.meeting_name, selectedSession!.session_name, driver!.Abbreviation),
        enabled: !!selectedSession && !!driver
      };
    })
  });

  const availableLaps = useMemo(() => {
    const lapsObj: Record<string, Lap[]> = {};
    selectedDrivers.forEach((num, index) => {
      if (lapQueries[index].data) lapsObj[num] = lapQueries[index].data as Lap[];
    });
    return lapsObj;
  }, [selectedDrivers, lapQueries]);

  const allLapsReady = selectedDrivers.length > 0 && selectedDrivers.every(num => selectedLaps[num] !== null && selectedLaps[num] !== undefined);

  const { data: telemetryData = [], isFetching: loadingTelemetry, error: errorTelemetry } = useQuery({
    queryKey: ['telemetry', year, selectedMeeting?.meeting_name, selectedSession?.session_name, selectedDrivers.join(','), Object.values(selectedLaps).map(l => (l as Lap | null)?.LapNumber).join(',')],
    queryFn: () => new Promise<any[]>((resolve, reject) => {
      const worker = new Worker(new URL('./workers/telemetryWorker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => {
        if (e.data.type === 'SUCCESS') resolve(e.data.data);
        else reject(new Error(e.data.error));
        worker.terminate();
      };
      worker.onerror = () => {
        reject(new Error('Worker execution failed'));
        worker.terminate();
      };
      worker.postMessage({
        year,
        meetingName: selectedMeeting!.meeting_name,
        sessionName: selectedSession!.session_name,
        drivers: selectedDrivers,
        results,
        selectedLaps,
        metrics: METRICS
      });
    }),
    enabled: allLapsReady
  });

  // --- AUTO-SELECTIONS & STATE RESETS ---

  useEffect(() => {
    if (meetings.length > 0) {
      const matchingMeeting = selectedMeeting ? meetings.find(m => m.round === selectedMeeting.round && m.meeting_name === selectedMeeting.meeting_name) : undefined;
      if (matchingMeeting) {
        setSelectedMeeting(matchingMeeting);
      } else {
        setSelectedMeeting(meetings[meetings.length - 1]);
      }
    } else {
      setSelectedMeeting(null);
    }
  }, [meetings]);

  useEffect(() => {
    if (sessions.length > 0) {
      const matchingSession = selectedSession ? sessions.find(s => s.session_identifier === selectedSession.session_identifier) : undefined;
      if (matchingSession) {
        setSelectedSession(matchingSession);
      } else {
        setSelectedSession(sessions[sessions.length - 1]);
      }
    } else {
      setSelectedSession(null);
    }
  }, [sessions]);

  useEffect(() => {
    setSelectedLaps({});

    if (results.length > 0) {
      setSelectedDrivers(prevDrivers => {
        const validExistingDrivers = prevDrivers.filter(num =>
          results.some(r => String(r.DriverNumber) === String(num))
        );

        if (validExistingDrivers.length === 2) return validExistingDrivers;

        if (validExistingDrivers.length === 1) {
          const nextBest = results.find(r => String(r.DriverNumber) !== validExistingDrivers[0]);
          return nextBest ? [...validExistingDrivers, String(nextBest.DriverNumber)] : validExistingDrivers;
        }

        return results.slice(0, 2).map(r => String(r.DriverNumber));
      });
    } else {
      setSelectedDrivers([]);
    }
  }, [results]);

  useEffect(() => {
    setSelectedLaps(prevLaps => {
      let hasChanges = false;
      const nextLaps = { ...prevLaps };

      selectedDrivers.forEach(num => {
        if (!nextLaps[num] && availableLaps[num] && availableLaps[num].length > 0) {
          const validLaps = availableLaps[num].filter(l => l.LapTime && l.LapTime !== 'None' && l.LapTime !== 'NaT');

          if (validLaps.length > 0) {
            const fastest = validLaps.reduce((min, lap) =>
              parseLapTime(lap.LapTime) < parseLapTime(min.LapTime) ? lap : min
            );
            nextLaps[num] = fastest;
            hasChanges = true;
          }
        }
      });

      return hasChanges ? nextLaps : prevLaps;
    });
  }, [availableLaps, selectedDrivers]);

  const handleDriverToggle = (driverNumber: string) => {
    setSelectedDrivers(prev => {
      if (prev.includes(driverNumber)) {
        setSelectedLaps(l => { const c = {...l}; delete c[driverNumber]; return c; });
        return prev.filter(id => id !== driverNumber);
      }
      if (prev.length >= 2) {
        setSelectedLaps(l => { const c = {...l}; delete c[prev[0]]; c[driverNumber] = null; return c; });
        return [prev[1], driverNumber];
      }
      setSelectedLaps(l => ({ ...l, [driverNumber]: null }));
      return [...prev, driverNumber];
    });
  };

  const isAnyLoading = loadingMeetings || loadingSessions || loadingResults || lapQueries.some(q => q.isLoading) || loadingTelemetry;
  const queryError = errorMeetings || errorSessions || errorResults || errorTelemetry || lapQueries.find(q => q.error)?.error;
  const displayError = manualError || (queryError ? (queryError as Error).message : null);

  const [isLoadingDelayed, setIsLoadingDelayed] = useState(false);
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    if (isAnyLoading) {
      timeoutId = setTimeout(() => { setIsLoadingDelayed(true); }, 3000);
    } else {
      setIsLoadingDelayed(false);
    }
    return () => clearTimeout(timeoutId);
  }, [isAnyLoading]);

  // FIX: Erweitertes Error-Logging und robusterer Export
  const handleExportImage = async () => {
    if (!selectedSession) return;
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!exportRef.current) throw new Error("Export container is not ready.");

      const dataUrl = await toPng(exportRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#0a0a0a',
        width: 1600,
        height: 900,
        fetchRequestInit: { cache: 'no-cache' } // Hilft bei Cache-Problemen mit html-to-image
      });

      const driverNames = selectedDrivers.map(num => results.find(d => d.DriverNumber === num)?.Abbreviation).filter(Boolean).join('-');
      const filename = `${selectedMeeting?.meeting_name}-${selectedSession?.session_name}-${driverNames}-telemetry.png`.toLowerCase().replace(/\s+/g, '-');
      
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export PNG Error:", err); // Fehler im Browser loggen
      setManualError(`Failed to export image: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen lg:w-screen bg-dark-bg text-white font-sans selection:bg-f1-red selection:text-white lg:overflow-hidden flex flex-col relative">
      <AnimatePresence>
        {(!meetings.length && loadingMeetings) && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[999] bg-dark-bg flex flex-col items-center justify-center">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-dark-border border-t-f1-red rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-f1-red animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Initializing</h2>
                <p className="text-xs font-mono uppercase tracking-[0.3em] opacity-50">Loading API Data...</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {displayError && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] bg-f1-red text-white px-6 py-4 rounded-md shadow-2xl border border-white/20 flex items-center gap-4 max-w-xl w-full">
            <Activity className="w-6 h-6 shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold uppercase tracking-wider mb-1">Error</h3>
              <p className="text-sm opacity-90">{displayError}</p>
            </div>
            {manualError && (
              <button onClick={() => setManualError(null)} className="p-2 hover:bg-black/20 rounded-sm transition-colors"><X className="w-5 h-5" /></button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex flex-col-reverse lg:grid lg:grid-cols-[380px_1fr] flex-1 lg:overflow-hidden">
        <aside className="border-t lg:border-t-0 lg:border-r border-dark-border lg:h-full carbon-pattern overflow-y-auto no-scrollbar relative flex flex-col">
          <div className="p-3 lg:p-4 h-full flex flex-col relative z-10">
            <div className="flex items-center justify-between mb-4">
              <img src="/assets/uploads/lap_logo.png" alt="Lap-Check Logo" className="h-10 w-auto" />
              {isAnyLoading && <Loader2 className="w-5 h-5 animate-spin text-f1-red" />}
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col space-y-3 bg-dark-surface/40 p-3 rounded-xl lg:bg-transparent lg:p-0 lg:rounded-none border border-dark-border lg:border-0 mb-2 lg:mb-0 min-h-0">
              <div className="space-y-3">
                <CustomDropdown label="01. Year" icon={<Calendar className="w-3 h-3 text-f1-red" />} options={YEARS} value={year} onChange={setYear} getLabel={(y) => y.toString()} getKey={(y) => y} disabled={loadingMeetings} autoPosition={true} />
                <CustomDropdown label="02. Grand Prix" icon={<MapPin className="w-3 h-3 text-f1-red" />} options={meetings} value={selectedMeeting} onChange={setSelectedMeeting} getLabel={(m) => m.meeting_name} getKey={(m) => m.round} placeholder="Select Grand Prix" disabled={loadingSessions} autoPosition={true} />
                <AnimatePresence>
                  {selectedMeeting && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                      animate={{ opacity: 1, height: 'auto', transitionEnd: { overflow: 'visible' } }}
                      exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    >
                      <CustomDropdown label="03. Session" icon={<Calendar className="w-3 h-3 text-f1-red" />} options={sessions} value={selectedSession} onChange={setSelectedSession} getLabel={(s) => s.session_name} getKey={(s) => s.session_identifier} placeholder="Select Session" disabled={loadingResults} autoPosition={true} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence>
                {selectedSession && results.length > 0 && (
                  <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-4 border-t border-dark-border flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-3 shrink-0">
                      <div className="flex items-center gap-2 opacity-40 uppercase text-[10px] font-mono font-bold tracking-[0.2em]">
                        <Users className="w-3 h-3 text-f1-red" />
                        <span>04. Drivers ({selectedDrivers.length}/2)</span>
                      </div>
                      {selectedDrivers.length > 0 && <button onClick={() => { setSelectedDrivers([]); setSelectedLaps({}); }} className="text-[10px] font-mono uppercase text-f1-red hover:underline">Reset</button>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1.5 flex-1 overflow-y-auto no-scrollbar auto-rows-fr">
                      {results.map((d) => (
                        <button key={d.DriverNumber} onClick={() => handleDriverToggle(d.DriverNumber)} className={cn("relative overflow-hidden group flex items-center justify-between px-2 py-1.5 border rounded-sm transition-all h-full", selectedDrivers.includes(d.DriverNumber) ? "bg-f1-red/10 text-white border-f1-red" : "bg-dark-bg border-dark-border hover:border-f1-red/50")}>
                          <div className="absolute left-0 top-0 bottom-0 w-1 transition-all group-hover:w-1.5" style={{ backgroundColor: `#${d.TeamColor || '888'}` }} />
                          <div className="pl-1.5 flex items-center gap-2">
                            <span className="font-mono font-bold text-[10px] w-3 text-center text-white/40 leading-none mt-[2px]">{d.Position}</span>
                            <span className="font-black uppercase tracking-tighter text-xs leading-none mt-[2px]">{d.Abbreviation}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.section>
                )}

                <motion.section key="sidebar-lap-selection" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={cn("mt-4 pt-4 border-t border-dark-border shrink-0 transition-opacity", selectedDrivers.length === 0 && "opacity-50 pointer-events-none")}>
                  <div className="flex items-center gap-2 opacity-40 uppercase text-[10px] font-mono font-bold tracking-[0.2em] mb-3">
                    <Timer className="w-3 h-3 text-f1-red" />
                    <span>05. Lap Selection</span>
                  </div>
                  <div className="space-y-2">
                    {/* Render active lap dropdowns */}
                    {selectedDrivers.map((num, idx) => {
                      const d = results.find(drv => drv.DriverNumber === num);
                      const laps = availableLaps[num] || [];
                      const isLoadingLaps = lapQueries[idx]?.isLoading;

                      if (isLoadingLaps) return <div key={num} className="text-xs text-center opacity-50 font-mono py-2 bg-dark-bg border border-dark-border rounded-sm">Loading laps...</div>;
                      if (laps.length === 0) return null;

                      // Schnellste Runde berechnen, um sie im Dropdown zu markieren
                      const validLaps = laps.filter(l => l.LapTime && l.LapTime !== 'None' && l.LapTime !== 'NaT');
                      const fastestLap = validLaps.length > 0 ? validLaps.reduce((min, lap) => parseLapTime(lap.LapTime) < parseLapTime(min.LapTime) ? lap : min) : null;

                      return (
                        <div key={`sidebar-lap-${num}`} className="bg-dark-bg border border-dark-border p-2 rounded-sm">
                          <CustomDropdown
                            label={`LAP FOR ${d?.Abbreviation}`}
                            icon={<Timer className="w-3 h-3 text-f1-red" />}
                            options={laps}
                            value={selectedLaps[num] || null}
                            onChange={(lap) => setSelectedLaps(prev => ({ ...prev, [num]: lap }))}
                            getLabel={(l) => `Lap ${l.LapNumber} (${formatLapTime(l.LapTime)})`}
                            getKey={(l) => l.LapNumber}
                            maxItems={5}
                            autoPosition={true}
                            renderSelectedValue={(l) => {
                              const isFastest = fastestLap && l.LapNumber === fastestLap.LapNumber;
                              return (
                                <div className="flex items-center justify-between w-full h-full">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm leading-none mt-[2px]">Lap {l.LapNumber}</span>
                                    <span className={cn("font-mono text-xs leading-none mt-[2px]", isFastest ? "text-[#b138ff] font-bold" : "text-white/60")}>
                                      {formatLapTime(l.LapTime)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {isFastest && (
                                      <span className="text-[8px] text-[#b138ff] font-bold tracking-widest uppercase leading-none mt-[2px]">
                                        Fastest
                                      </span>
                                    )}
                                    <TyreIcon compound={l.Compound} />
                                  </div>
                                </div>
                              );
                            }}
                            renderOption={(l) => {
                              const isFastest = fastestLap && l.LapNumber === fastestLap.LapNumber;
                              return (
                                <div className="flex items-center justify-between w-full h-full">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm w-12 leading-none mt-[2px]">Lap {l.LapNumber}</span>
                                    <span className={cn("font-mono text-xs leading-none mt-[2px]", isFastest ? "text-[#b138ff] font-bold" : "text-white/60")}>
                                      {formatLapTime(l.LapTime)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {isFastest && (
                                      <span className="text-[8px] text-[#b138ff] font-bold tracking-widest uppercase leading-none mt-[2px]">
                                        Fastest
                                      </span>
                                    )}
                                    <TyreIcon compound={l.Compound} />
                                  </div>
                                </div>
                              );
                            }}
                          />
                        </div>
                      );
                    })}

                    {/* Render disabled placeholder dropdowns if fewer than 2 drivers are selected */}
                    {selectedDrivers.length < 2 && (
                      <>
                        {selectedDrivers.length === 0 && (
                          <div className="bg-dark-bg/50 border border-dark-border/50 p-2 rounded-sm opacity-50 pointer-events-none">
                            <CustomDropdown
                              label="LAP FOR DRIVER 1"
                              icon={<Timer className="w-3 h-3 text-f1-red/50" />}
                              options={[]}
                              value={null}
                              onChange={() => {}}
                              getLabel={() => ""}
                              getKey={() => ""}
                              placeholder="Awaiting Selection"
                              disabled={true}
                            />
                          </div>
                        )}
                        <div className="bg-dark-bg/50 border border-dark-border/50 p-2 rounded-sm opacity-50 pointer-events-none">
                          <CustomDropdown
                            label="LAP FOR DRIVER 2"
                            icon={<Timer className="w-3 h-3 text-f1-red/50" />}
                            options={[]}
                            value={null}
                            onChange={() => {}}
                            getLabel={() => ""}
                            getKey={() => ""}
                            placeholder="Awaiting Selection"
                            disabled={true}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </motion.section>
              </AnimatePresence>
            </motion.div>
          </div>
        </aside>

        <section className="flex-1 p-4 lg:p-6 flex flex-col bg-dark-bg lg:overflow-hidden">
          <AnimatePresence mode="wait">
            {!selectedSession ? (
              <motion.div key="awaiting-input" initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} exit={{ opacity: 0 }} className="flex-1 min-h-[300px] lg:min-h-0 flex flex-col items-center justify-center text-center bg-dark-surface/20 p-8 rounded-xl border border-dark-border lg:bg-transparent lg:border-0">
                <Gauge className="w-24 h-24 mb-6" />
                <p className="text-2xl font-black uppercase italic tracking-tighter">Awaiting Telemetry Input</p>
              </motion.div>
            ) : telemetryData.length > 0 ? (
              <motion.div key="telemetry-dashboard" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="flex-1 flex flex-col min-h-0">
              <div className="mb-4 flex flex-col items-center text-center lg:flex-row lg:items-end lg:text-left justify-between gap-4">
                <div className="flex flex-col items-center lg:items-start">
                  <div className="flex items-center gap-2 text-f1-red text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-1">
                    <span className="w-2 h-2 bg-f1-red rounded-full animate-pulse" /> Live Analysis
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-black uppercase italic tracking-tighter leading-tight lg:leading-none">{selectedMeeting?.meeting_name}</h2>
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
                        <div
                          key={`driver-status-${num}`}
                          className="flex items-stretch gap-3 bg-dark-surface/50 border border-dark-border p-2.5 rounded-sm min-w-[120px]"
                        >
                          <div
                            className="w-1.5 rounded-full shrink-0"
                            style={{
                              background: isDashed
                                ? `repeating-linear-gradient(to bottom, #${d?.TeamColor || '888'}, #${d?.TeamColor || '888'} 4px, transparent 4px, transparent 8px)`
                                : `#${d?.TeamColor || '888'}`
                            }}
                          />

                          <div className="flex flex-col justify-between flex-1 gap-1 min-w-0">

                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="font-black text-lg tracking-tighter leading-none">{d?.Abbreviation}</span>
                              </div>

                              {lap && (
                                <div className="shrink-0 flex items-center justify-center">
                                  {/* FIX: TyreIcon wird jetzt in der Live UI geladen! */}
                                  <TyreIcon compound={lap.Compound} />
                                </div>
                              )}
                            </div>

                            {lap && (
                              <div className="flex flex-col mt-0.5 min-w-0">
                                <span className="text-[9px] font-mono opacity-40 uppercase tracking-widest truncate">
                                  Lap {lap.LapNumber}
                                </span>
                                <span className="text-xs font-mono text-f1-red font-bold leading-none mt-1 truncate">
                                  {formatLapTime(lap.LapTime)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={handleExportImage} disabled={isExporting || !selectedSession} className="flex items-center gap-2 bg-dark-surface hover:bg-white/5 border border-dark-border px-4 rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest transition-all disabled:opacity-50 group">
                    <Download className={cn("w-3.5 h-3.5 transition-transform", isExporting ? "animate-bounce" : "group-hover:-translate-y-0.5")} />
                    {isExporting ? 'Exporting...' : 'Export PNG'}
                  </button>
                </div>
              </div>

                <div className="flex-1 min-h-[400px] lg:min-h-0 border border-dark-border p-2 lg:p-4 bg-dark-surface/30 rounded-xl lg:rounded-lg relative overflow-hidden flex flex-col overflow-y-auto no-scrollbar">
                <div className="flex flex-wrap items-center gap-1 mb-4 relative z-10">
                  <div className="flex bg-dark-bg/50 border border-dark-border p-1 rounded-sm mr-2">
                    <button onClick={() => setViewMode('single')} className={cn("px-3 pb-1 pt-[5px] text-[9px] font-mono font-bold uppercase tracking-widest transition-all rounded-sm leading-none", viewMode === 'single' ? "bg-f1-red text-white" : "text-white/40 hover:text-white/60")}>Single</button>
                    <button onClick={() => setViewMode('all')} className={cn("px-3 pb-1 pt-[5px] text-[9px] font-mono font-bold uppercase tracking-widest transition-all rounded-sm leading-none", viewMode === 'all' ? "bg-f1-red text-white" : "text-white/40 hover:text-white/60")}>All</button>
                  </div>

                  {viewMode === 'single' && (
                     <div className="flex flex-wrap gap-1">
                      {METRICS.map((m) => (
                        <button key={m} onClick={() => setSelectedMetric(m)} className={cn("px-3 pb-1.5 pt-[7px] text-[9px] font-mono font-bold uppercase tracking-widest transition-all border rounded-sm leading-none", selectedMetric === m ? "bg-f1-red/20 text-f1-red border-f1-red" : "bg-dark-bg/50 text-white/40 border-dark-border hover:border-white/20 hover:text-white/60")}>{m}</button>
                      ))}
                    </div>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {!isAnyLoading && telemetryData.length > 0 && (
                    <motion.div key={`${viewMode}-${selectedMetric}-${JSON.stringify(selectedLaps)}-${JSON.stringify(selectedDrivers)}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
                      {viewMode === 'single' ? (
                        <TelemetryChart data={telemetryData} metric={selectedMetric} results={results} selectedDrivers={selectedDrivers} height="100%" showXAxis={true} />
                      ) : (
                        <div className="flex-1 flex flex-col min-h-0">
                          {METRICS.map((m, idx) => (
                            <div key={m} className="flex-1 min-h-0 border-b border-white/5 last:border-0 pt-2">
                              <TelemetryChart data={telemetryData} metric={m} results={results} selectedDrivers={selectedDrivers} height="100%" showXAxis={idx === METRICS.length - 1} />
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
            ) : (
              <motion.div key="loading-telemetry" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-h-[300px] lg:min-h-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="inline-block p-4 border border-dark-border rounded-full animate-pulse"><Timer className="w-8 h-8 text-f1-red" /></div>
                  <p className="text-xs font-mono uppercase tracking-[0.3em] opacity-50 max-w-md mx-auto text-center">
                    {isLoadingDelayed ? "Live-Download läuft (kann bis zu 2 Minuten dauern)..." : "Loading Telemetry Data..."}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Hidden Export Container */}
      {isExporting && (
        <div className="fixed left-[-9999px] top-[-9999px]">
          <div ref={exportRef} style={{ width: '1600px', height: '900px' }} className="bg-dark-bg p-12 flex flex-col relative overflow-hidden">
            <div className="absolute inset-0 carbon-pattern opacity-10 pointer-events-none" />

            <div className="flex justify-between items-start mb-10 relative z-10">

              <div className="flex flex-col gap-6">
                <img src="/assets/uploads/lap_logo.png" alt="Lap-Check Logo" className="h-12 w-auto object-contain object-left" />
                <div>
                  <h2 className="text-6xl font-black uppercase italic tracking-tighter leading-none mb-3">
                    {selectedMeeting?.meeting_name}
                  </h2>
                  <p className="text-2xl font-mono opacity-50 uppercase tracking-widest">
                    {selectedSession?.session_name}
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                {selectedDrivers.map((num, idx) => {
                  const d = results.find(drv => drv.DriverNumber === num);
                  const lap = selectedLaps[num];
                  const isDashed = selectedDrivers.slice(0, idx).some(prevNum => {
                    const prevD = results.find(drv => drv.DriverNumber === prevNum);
                    return prevD && d && prevD.TeamName === d.TeamName;
                  });

                  return (
                    <div
                      key={`export-driver-${num}`}
                      className="flex items-stretch gap-4 bg-dark-surface/80 border border-dark-border p-4 rounded-md min-w-[260px] shadow-xl"
                    >
                      <div
                        className="w-2.5 rounded-full shrink-0"
                        style={{
                          background: isDashed
                            ? `repeating-linear-gradient(to bottom, #${d?.TeamColor || '888'}, #${d?.TeamColor || '888'} 8px, transparent 8px, transparent 16px)`
                            : `#${d?.TeamColor || '888'}`
                        }}
                      />

                      <div className="flex flex-col justify-between flex-1 gap-2 min-w-0">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-black text-4xl tracking-tighter leading-none">{d?.Abbreviation}</span>
                          </div>

                          {lap && (
                            <div className="shrink-0 flex items-center justify-center">
                              {/* FIX: Das TyreIcon in 'large' für den riesigen Export Container */}
                              <TyreIcon compound={lap.Compound} size="large" />
                            </div>
                          )}
                        </div>

                        {lap && (
                          <div className="flex flex-col mt-2 min-w-0">
                            <span className="text-sm font-mono opacity-40 uppercase tracking-widest truncate">
                              Lap {lap.LapNumber}
                            </span>
                            <span className="text-2xl font-mono text-f1-red font-bold leading-none mt-1 truncate">
                              {formatLapTime(lap.LapTime)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 border border-dark-border bg-dark-surface/40 rounded-xl relative overflow-hidden p-8 shadow-2xl" style={{ minHeight: 0, minWidth: 0, position: 'relative' }}>
               <TelemetryChart
                 data={telemetryData}
                 metric={viewMode === 'single' ? selectedMetric : 'speed'}
                 results={results}
                 selectedDrivers={selectedDrivers}
                 height="100%"
                 showXAxis={true}
               />
            </div>

            <div className="mt-6 flex justify-end">
               <span className="text-xs font-mono opacity-30 uppercase tracking-[0.3em]">
                 Generated by LapCheck // Telemetry: {viewMode === 'single' ? selectedMetric.toUpperCase() : 'SPEED'}
               </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
