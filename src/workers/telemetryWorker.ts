import { f1Service, TelemetryPoint, F1Result, Lap } from '../services/f1Service.js';

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
    const percentageSet = new Set<number>();

    // Vorab-Schleife: Ermitteln der min/max Distanz pro Fahrer und Zuweisen der relativen Prozentwerte
    resultsData.forEach(res => {
      const telemetry = res.telemetry as any[]; // Type assertion for dynamic percentage assignment
      if (!res.driver || telemetry.length < 2) return;

      const minDist = telemetry[0].distance;
      const maxDist = telemetry[telemetry.length - 1].distance;

      // Division durch 0 (oder fast 0) verhindern
      if (typeof minDist !== 'number' || typeof maxDist !== 'number' || (maxDist - minDist) <= 0) {
        // Ignoriere diesen Fahrer (wird bei hasData sowieso aussortiert)
        return;
      }

      telemetry.forEach(t => {
        if (typeof t.distance === 'number') {
          t.percentage = ((t.distance - minDist) / (maxDist - minDist)) * 100;
          // Sammeln aller exakten Prozentpunkte, auf 3 Nachkommastellen gerundet zur Deduplizierung
          percentageSet.add(Math.round(t.percentage * 1000) / 1000);
        }
      });
    });

    const sortedPercentages = Array.from(percentageSet).sort((a, b) => a - b);
    const indices = new Array(resultsData.length).fill(0);

    sortedPercentages.forEach(targetPercent => {
      // Das Basis-Objekt muss zwingend mit const mergedPoint = { distance: ... } initialisiert werden
      // Der Wert dahinter ist künftig aber die Prozentzahl.
      const mergedPoint: any = { distance: targetPercent };
      let hasData = false;

      resultsData.forEach((res, idx) => {
        const telemetry = res.telemetry as any[]; // Type assertion for percentage
        if (!res.driver || telemetry.length < 2 || telemetry[0].percentage === undefined) return;

        // Prüfen ob wir innerhalb der gültigen Runden-Range des Fahrers sind (in Prozent)
        if (targetPercent < telemetry[0].percentage || targetPercent > telemetry[telemetry.length - 1].percentage) return;

        let i = indices[idx];
        // Die Schleife darf erst stoppen, wenn die Prozentzahl des nächsten Punktes strikt größer als das Ziel ist
        while (i < telemetry.length - 1 && telemetry[i + 1].percentage <= targetPercent) {
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

        // WICHTIG: Die 200-Meter-Regel (Verbindungsabbruch) darf NICHT auf Prozente umgestellt werden!
        if (d2 - d1 > 200) return;

        const pct1 = p1.percentage;
        const pct2 = p2.percentage;

        // Schutz vor Division durch Null, Berechnung der Ratio basierend auf Prozentwerten
        const ratio = pct2 > pct1 ? (targetPercent - pct1) / (pct2 - pct1) : 0;

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
