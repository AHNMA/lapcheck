import * as assert from 'assert';
import test from 'node:test';

test('Telemetry worker basic functionality', async (t) => {
  const resultsData = [
    {
      driver: { Abbreviation: 'VER' },
      telemetry: [
        { distance: 0, speed: 100, gear: 1, brake: 0 },
        { distance: 100, speed: 200, gear: 2, brake: 1 },
      ]
    },
    {
      driver: { Abbreviation: 'LEC' },
      telemetry: [
        { distance: 50, speed: 150, gear: 1, brake: 0 },
        { distance: 150, speed: 250, gear: 3, brake: 1 },
      ]
    }
  ];

  const metrics = ['speed', 'gear', 'brake'];

  const distanceSet = new Set<number>();
  resultsData.forEach(res => {
    res.telemetry.forEach(t => {
      if (typeof t.distance === 'number') {
        distanceSet.add(Math.round(t.distance * 100) / 100);
      }
    });
  });

  const sortedDistances = Array.from(distanceSet).sort((a, b) => a - b);
  const indices = new Array(resultsData.length).fill(0);
  const merged: any[] = [];

  sortedDistances.forEach(dist => {
    const mergedPoint: any = { distance: dist };
    let hasData = false;

    resultsData.forEach((res, idx) => {
      if (!res.driver || res.telemetry.length < 2) return;
      const telemetry = res.telemetry;
      if (dist < telemetry[0].distance || dist > telemetry[telemetry.length - 1].distance) return;

      let i = indices[idx];
      while (i < telemetry.length - 1 && telemetry[i + 1].distance <= dist) {
        i++;
      }

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

      const ratio = d2 > d1 ? (dist - d1) / (d2 - d1) : 0;

      metrics.forEach(metric => {
        let val1 = Number(p1[metric as keyof any] || 0);
        let val2 = Number(p2[metric as keyof any] || 0);

        if (metric === 'brake') {
          val1 = val1 > 0 ? 100 : 0;
          val2 = val2 > 0 ? 100 : 0;
        }

        if (metric === 'gear' || metric === 'brake') {
          mergedPoint[`${res.driver.Abbreviation}_${metric}`] = ratio < 0.5 ? val1 : val2;
        } else {
          mergedPoint[`${res.driver.Abbreviation}_${metric}`] = val1 + (val2 - val1) * ratio;
        }
      });
      mergedPoint[res.driver.Abbreviation] = true;
      hasData = true;
    });
    if (hasData || Object.keys(mergedPoint).length > 1) merged.push(mergedPoint);
  });

  assert.strictEqual(merged.length, 4); // Distances: 0, 50, 100, 150

  // Dist 0
  assert.strictEqual(merged[0].distance, 0);
  assert.strictEqual(merged[0].VER_speed, 100);
  assert.strictEqual(merged[0].VER_gear, 1); // < 0.5 (0 < 0.5) -> val1
  assert.strictEqual(merged[0].VER_brake, 0);
  assert.strictEqual(merged[0].LEC_speed, undefined);

  // Dist 50
  assert.strictEqual(merged[1].distance, 50);
  assert.strictEqual(merged[1].VER_speed, 150); // Linear interpolation: 100 + (200-100)*0.5
  assert.strictEqual(merged[1].VER_gear, 2); // ratio 0.5 -> not < 0.5 -> val2
  assert.strictEqual(merged[1].VER_brake, 100);
  assert.strictEqual(merged[1].LEC_speed, 150);

  // Dist 100
  assert.strictEqual(merged[2].distance, 100);
  assert.strictEqual(merged[2].VER_speed, 200);
  assert.strictEqual(merged[2].LEC_speed, 200);

  // Dist 150
  assert.strictEqual(merged[3].distance, 150);
  assert.strictEqual(merged[3].VER_speed, undefined);
  assert.strictEqual(merged[3].LEC_speed, 250);

  console.log('Worker logic tests passed.');
});
