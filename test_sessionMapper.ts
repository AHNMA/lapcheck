import { test } from 'node:test';
import assert from 'node:assert';
import { mapSessionName } from './src/services/sessionMapper.ts';

test('mapSessionName - Practice sessions', () => {
  assert.strictEqual(mapSessionName('Practice 1'), 'FP1');
  assert.strictEqual(mapSessionName('PRACTICE 1'), 'FP1');
  assert.strictEqual(mapSessionName('fp1'), 'FP1');
  assert.strictEqual(mapSessionName('FP1'), 'FP1');

  assert.strictEqual(mapSessionName('Practice 2'), 'FP2');
  assert.strictEqual(mapSessionName('PRACTICE 2'), 'FP2');
  assert.strictEqual(mapSessionName('fp2'), 'FP2');
  assert.strictEqual(mapSessionName('FP2'), 'FP2');

  assert.strictEqual(mapSessionName('Practice 3'), 'FP3');
  assert.strictEqual(mapSessionName('PRACTICE 3'), 'FP3');
  assert.strictEqual(mapSessionName('fp3'), 'FP3');
  assert.strictEqual(mapSessionName('FP3'), 'FP3');
});

test('mapSessionName - Qualifying sessions', () => {
  assert.strictEqual(mapSessionName('Qualifying'), 'Q');
  assert.strictEqual(mapSessionName('QUALIFYING'), 'Q');
  assert.strictEqual(mapSessionName('q'), 'Q');
  assert.strictEqual(mapSessionName('Q'), 'Q');
});

test('mapSessionName - Sprint Shootout / Qualifying sessions', () => {
  assert.strictEqual(mapSessionName('Sprint Shootout'), 'SQ');
  assert.strictEqual(mapSessionName('SPRINT SHOOTOUT'), 'SQ');
  assert.strictEqual(mapSessionName('Sprint Qualifying'), 'SQ');
  assert.strictEqual(mapSessionName('SPRINT QUALIFYING'), 'SQ');
  assert.strictEqual(mapSessionName('sq'), 'SQ');
  assert.strictEqual(mapSessionName('SQ'), 'SQ');
});

test('mapSessionName - Sprint sessions', () => {
  assert.strictEqual(mapSessionName('Sprint'), 'S');
  assert.strictEqual(mapSessionName('SPRINT'), 'S');
  assert.strictEqual(mapSessionName('s'), 'S');
  assert.strictEqual(mapSessionName('S'), 'S');
});

test('mapSessionName - Race sessions', () => {
  assert.strictEqual(mapSessionName('Race'), 'R');
  assert.strictEqual(mapSessionName('RACE'), 'R');
  assert.strictEqual(mapSessionName('r'), 'R');
  assert.strictEqual(mapSessionName('R'), 'R');
});

test('mapSessionName - Unknown sessions', () => {
  assert.strictEqual(mapSessionName('Unknown Session'), 'Unknown Session');
  assert.strictEqual(mapSessionName('Pre-season Test'), 'Pre-season Test');
  assert.strictEqual(mapSessionName(''), '');
});
