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
    const distanceSet = new Set<number>();

    // Sammeln aller exakten Distanzpunkte, auf 2 Nachkommastellen gerundet zur Deduplizierung
    resultsData.forEach(res => {
      res.telemetry.forEach(t => {
        if (typeof t.distance === 'number') {
          distanceSet.add(Math.round(t.distance * 100) / 100);
        }
      });
    });

    const sortedDistances = Array.from(distanceSet).sort((a, b) => a - b);
    const indices = new Array(resultsData.length).fill(0);

    sortedDistances.forEach(dist => {
      const mergedPoint: any = { distance: dist };
      let hasData = false;

      resultsData.forEach((res, idx) => {
        if (!res.driver || res.telemetry.length < 2) return;
        const telemetry = res.telemetry;
        if (dist < telemetry[0].distance || dist > telemetry[telemetry.length - 1].distance) return;

        let i = indices[idx];
        // Die Schleife darf erst stoppen, wenn die Distanz des nächsten Punktes strikt größer als die Zieldistanz ist
        while (i < telemetry.length - 1 && telemetry[i + 1].distance <= dist) {
          i++;
        }

        // Fallback, falls der allerletzte Punkt erreicht wird
        if (i === telemetry.length - 1) {
          i = telemetry.length - 2;
        }

        indices[idx] = i;

        const p1 = telemetry[i];
        const p2 = telemetry[i + 1];
        if (!p1 || !p2) return;

        const d1 = p1.distance || 0;
        const d2 = p2.distance || 0;
        if (d2 - d1 > 200) return;

        // Schutz vor Division durch Null
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
            mergedPoint[`${res.driver!.Abbreviation}_${metric}`] = ratio < 0.5 ? val1 : val2;
          } else {
            // Weiche lineare Interpolation für Speed, Throttle und RPM
            mergedPoint[`${res.driver!.Abbreviation}_${metric}`] = val1 + (val2 - val1) * ratio;
          }
        });
        mergedPoint[res.driver!.Abbreviation] = true;
        hasData = true;
      });
      if (hasData || Object.keys(mergedPoint).length > 1) merged.push(mergedPoint);
    });

    // 3. Nur das kleine, fertige Array zurücksenden
    self.postMessage({ type: 'SUCCESS', data: merged });
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown worker error'
    });
  }
};
