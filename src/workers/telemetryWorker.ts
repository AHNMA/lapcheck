import { f1Service, TelemetryPoint, F1Result, Lap } from '../services/f1Service';

export interface WorkerInput {
  year: number;
  meetingName: string;
  sessionName: string;
  drivers: string[];
  results: F1Result[];
  selectedLaps: Record<string, Lap | null>;
  metrics: string[];
}

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const { year, meetingName, sessionName, drivers, results, selectedLaps, metrics } = e.data;

  try {
    // 1. Parallel Fetching direkt im Worker
    const fetchPromises = drivers.map(async (driverNum) => {
      const driver = results.find(d => String(d.DriverNumber) === String(driverNum));
      const lap = selectedLaps[driverNum];

      if (!lap || !driver) return { driver, telemetry: [] };

      const telemetry = await f1Service.getTelemetry(
        year, meetingName, sessionName, driver.Abbreviation, lap.LapNumber
      );
      return { driver, telemetry };
    });

    const resultsData = await Promise.all(fetchPromises);

    // 2. Berechnung und Interpolation
    const merged: any[] = [];
    const maxDistance = Math.max(...resultsData.map(r =>
      r.telemetry.length > 0 ? r.telemetry[r.telemetry.length - 1].distance || 0 : 0
    ));

    const indices = new Array(resultsData.length).fill(0);

    for (let dist = 0; dist <= maxDistance; dist += 20) {
      const mergedPoint: any = { distance: dist };

      resultsData.forEach((res, idx) => {
        if (!res.driver || res.telemetry.length < 2) return;
        const telemetry = res.telemetry;
        if (dist < telemetry[0].distance || dist > telemetry[telemetry.length - 1].distance) return;

        let i = indices[idx];
        while (i < telemetry.length - 1 && telemetry[i + 1].distance < dist) i++;
        indices[idx] = i;

        const p1 = telemetry[i];
        const p2 = telemetry[i + 1];
        if (!p1 || !p2) return;

        const d1 = p1.distance || 0;
        const d2 = p2.distance || 0;
        if (d2 - d1 > 200) return;

        const ratio = d2 > d1 ? (dist - d1) / (d2 - d1) : 0;
        metrics.forEach(metric => {
          let val1 = Number(p1[metric as keyof TelemetryPoint] || 0);
          let val2 = Number(p2[metric as keyof TelemetryPoint] || 0);

          // FIA liefert Brake meist als 0 oder 1. Wir skalieren es für die UI auf 100%.
          if (metric === 'brake') {
            val1 = val1 > 0 ? 100 : 0;
            val2 = val2 > 0 ? 100 : 0;
          }

          // Diskrete Werte (Gang & Bremse) dürfen nicht weich interpoliert werden.
          // Wir nutzen den "Nearest Neighbor" Ansatz (harter Umschlag ab 50% der Distanz).
          if (metric === 'gear' || metric === 'brake') {
            mergedPoint[`${res.driver.Abbreviation}_${metric}`] = ratio < 0.5 ? val1 : val2;
          } else {
            // Weiche lineare Interpolation für Speed, Throttle und RPM
            mergedPoint[`${res.driver.Abbreviation}_${metric}`] = val1 + (val2 - val1) * ratio;
          }
        });
        mergedPoint[res.driver.Abbreviation] = true;
      });
      if (Object.keys(mergedPoint).length > 1) merged.push(mergedPoint);
    }

    // 3. Nur das kleine, fertige Array zurücksenden
    self.postMessage({ type: 'SUCCESS', data: merged });
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown worker error'
    });
  }
};
