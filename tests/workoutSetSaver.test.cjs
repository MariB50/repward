const test = require('node:test');
const assert = require('node:assert/strict');
const { createWorkoutSetSaver } = require('../data/workoutSetSaver.ts');

const request = () => ({
  sessionId: 'session', exerciseId: 'bench-press', setNumber: 1,
  record: { weight: 50, reps: 10 },
});
const busy = () => Object.assign(new Error('database is locked'), { errcode: 5 });
const flush = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve;
  const promise = new Promise((accept) => { resolve = accept; });
  return { promise, resolve };
}

test('the set stays pending until its write succeeds; caller edits cannot change the captured result', async (t) => {
  const written = deferred();
  const calls = [];
  const saver = createWorkoutSetSaver(async (value) => {
    calls.push(value);
    await written.promise;
  });
  t.after(async () => { written.resolve(); await saver.close(); });
  const values = request();
  const saving = saver.save(values);
  values.record.reps = 99;
  values.setNumber = 2;
  assert.equal(saver.isSaving(), true);
  assert.equal(saver.hasPending(), true);
  assert.deepEqual(calls, [request()]);
  written.resolve();
  assert.deepEqual(await saving, request());
  assert.equal(saver.isSaving(), false);
  assert.equal(saver.hasPending(), false);
});

test('temporary contention gets at most two retries with the approved pauses and original values', async (t) => {
  const calls = [];
  const pauses = [];
  const saver = createWorkoutSetSaver(async (value) => {
    calls.push(structuredClone(value));
    value.record.reps = 999;
    if (calls.length < 3) throw busy();
  }, async (milliseconds) => { pauses.push(milliseconds); });
  t.after(() => saver.close());
  assert.deepEqual(await saver.save(request()), request());
  assert.deepEqual(calls, [request(), request(), request()]);
  assert.deepEqual(pauses, [100, 200]);
});

test('exhausted retries keep the pending set for a manual retry without re-entry', async (t) => {
  const calls = [];
  const pauses = [];
  let failing = true;
  const saver = createWorkoutSetSaver(async (value) => {
    calls.push(value);
    if (failing) throw busy();
  }, async (milliseconds) => { pauses.push(milliseconds); });
  t.after(() => saver.close());
  await assert.rejects(saver.save(request()), /database is locked/);
  assert.equal(calls.length, 3);
  assert.deepEqual(pauses, [100, 200]);
  assert.equal(saver.hasPending(), true);
  assert.equal(saver.isSaving(), false);
  await assert.rejects(saver.save({ ...request(), setNumber: 2 }), /pending set/);
  assert.equal(calls.length, 3);
  failing = false;
  assert.deepEqual(await saver.retry(), request());
  assert.deepEqual(calls, [request(), request(), request(), request()]);
  assert.equal(saver.hasPending(), false);
});

test('Node, symbolic and Expo-native BUSY errors are recognized, including extended codes', async () => {
  for (const error of [
    Object.assign(new Error('contention'), { errcode: 517 }),
    { code: 5 },
    { code: 'SQLITE_BUSY_RECOVERY' },
    { code: 'ERR_INTERNAL_SQLITE_ERROR', message: 'Call rejected: Error code 261: database is locked' },
    new Error('NativeStatement.runAsync rejected: database is locked'),
    'SQLITE_BUSY',
  ]) {
    let writes = 0;
    const pauses = [];
    const saver = createWorkoutSetSaver(async () => {
      if (++writes === 1) throw error;
    }, async (milliseconds) => { pauses.push(milliseconds); });
    try {
      await saver.save(request());
      assert.equal(writes, 2);
      assert.deepEqual(pauses, [100]);
    } finally {
      await saver.close();
    }
  }
});

test('non-transient and unknown errors surface immediately with the values still pending', async () => {
  for (const error of [
    new Error('disk full'), new Error('Planned set not found.'), null,
    { errcode: 19, message: 'database is locked' },
    { code: 'SQLITE_LOCKED', message: 'database table is locked' },
    { code: 'ERR_INTERNAL_SQLITE_ERROR', message: 'Error code 13: database or disk is full' },
  ]) {
    let writes = 0;
    const pauses = [];
    const saver = createWorkoutSetSaver(async () => { writes += 1; throw error; },
      async (milliseconds) => { pauses.push(milliseconds); });
    try {
      await assert.rejects(saver.save(request()), (actual) => actual === error);
      assert.equal(writes, 1);
      assert.deepEqual(pauses, []);
      assert.equal(saver.hasPending(), true);
      assert.equal(saver.isSaving(), false);
    } finally {
      await saver.close();
    }
  }
});

test('duplicate submissions share a write and different data cannot replace the pending record', async (t) => {
  const written = deferred();
  let writes = 0;
  const saver = createWorkoutSetSaver(async () => { writes += 1; await written.promise; });
  t.after(async () => { written.resolve(); await saver.close(); });
  const saving = saver.save(request());
  assert.equal(saver.save(request()), saving);
  assert.equal(saver.retry(), saving);
  assert.equal(saver.isSaving(), true);
  for (const changed of [
    { ...request(), sessionId: 'other' }, { ...request(), exerciseId: 'row' },
    { ...request(), setNumber: 2 }, { ...request(), record: { weight: 50, reps: 9 } },
  ]) {
    await assert.rejects(saver.save(changed), /pending set/);
  }
  assert.equal(writes, 1);
  written.resolve();
  await saving;
});

test('a successful zero-rep set releases the next slot, and retry requires a pending set', async (t) => {
  const calls = [];
  const saver = createWorkoutSetSaver(async (value) => { calls.push(value); });
  t.after(() => saver.close());
  await assert.rejects(saver.retry(), /no pending set/);
  const zero = { ...request(), record: { weight: 0, reps: 0 } };
  assert.deepEqual(await saver.save(zero), zero);
  const next = { ...request(), setNumber: 2 };
  assert.deepEqual(await saver.save(next), next);
  assert.deepEqual(calls, [zero, next]);
});

test('cleanup during a retry pause stops further writes and clears retained data', async (t) => {
  const paused = deferred();
  let writes = 0;
  const saver = createWorkoutSetSaver(async () => { writes += 1; throw busy(); }, () => paused.promise);
  t.after(async () => { paused.resolve(); await saver.close(); });
  const saving = saver.save(request());
  await flush();
  const closing = saver.close();
  paused.resolve();
  await assert.rejects(saving, /closed/);
  await closing;
  assert.equal(writes, 1);
  assert.equal(saver.hasPending(), false);
  await assert.rejects(saver.save(request()), /closed/);
});

test('cleanup waits for an in-flight write and prevents a late success notification', async (t) => {
  const written = deferred();
  const saver = createWorkoutSetSaver(async () => { await written.promise; });
  t.after(async () => { written.resolve(); await saver.close(); });
  const saving = saver.save(request());
  const closing = saver.close();
  written.resolve();
  await assert.rejects(saving, /closed/);
  await closing;
  assert.equal(saver.isSaving(), false);
  assert.equal(saver.hasPending(), false);
});
