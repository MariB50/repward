const test = require('node:test');
const assert = require('node:assert/strict');
const { sampleWorkout } = require('../data/sampleWorkout.ts');
const { createWorkoutStartup } = require('../data/workoutStartup.ts');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((accept, fail) => { resolve = accept; reject = fail; });
  return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

test('preparation is shared and does not create a workout before Start', async (t) => {
  let openings = 0;
  let creations = 0;
  let ids = 0;
  const storage = {
    async createSession() { creations += 1; },
    async close() {},
  };
  const startup = createWorkoutStartup(async () => {
    openings += 1;
    return storage;
  }, () => { ids += 1; return 'session'; });
  t.after(() => startup.close());

  const first = startup.prepare();
  assert.equal(startup.prepare(), first);
  await first;
  await startup.prepare();
  assert.equal(openings, 1);
  assert.equal(creations, 0);
  assert.equal(ids, 0);
});

test('Start waits for both preparation and creation and captures the selected plan', async (t) => {
  const ready = deferred();
  const written = deferred();
  const calls = [];
  let openings = 0;
  let settled = false;
  const storage = {
    async createSession(id, plan) { calls.push({ id, plan }); await written.promise; },
    async close() {},
  };
  const startup = createWorkoutStartup(() => {
    openings += 1;
    return ready.promise;
  }, () => 'session');
  t.after(async () => {
    ready.resolve(storage);
    written.resolve();
    await startup.close();
  });

  const plan = structuredClone(sampleWorkout);
  const preparing = startup.prepare();
  const starting = startup.start(plan);
  void starting.then(() => { settled = true; });
  plan.exercises[0].plannedSets = 99;
  await flush();
  assert.equal(openings, 1);
  assert.equal(calls.length, 0);
  assert.equal(settled, false);

  ready.resolve(storage);
  await preparing;
  await flush();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].id, 'session');
  assert.equal(calls[0].plan.exercises[0].plannedSets, 2);
  assert.equal(settled, false);

  written.resolve();
  assert.equal(await starting, 'session');
  assert.equal(settled, true);
});

test('rapid duplicate Starts share one attempt and a started session is not recreated', async (t) => {
  const written = deferred();
  let creations = 0;
  let ids = 0;
  const startup = createWorkoutStartup(async () => ({
    async createSession() { creations += 1; await written.promise; },
    async close() {},
  }), () => `session-${++ids}`);
  t.after(async () => { written.resolve(); await startup.close(); });

  const first = startup.start(sampleWorkout);
  assert.equal(startup.start(sampleWorkout), first);
  await flush();
  assert.equal(creations, 1);
  assert.equal(ids, 1);
  written.resolve();
  assert.equal(await first, 'session-1');
  assert.equal(await startup.start(sampleWorkout), 'session-1');
  assert.equal(creations, 1);
  assert.equal(ids, 1);
});

test('failed early preparation can be reopened when the user starts', async (t) => {
  let openings = 0;
  let creations = 0;
  const startup = createWorkoutStartup(async () => {
    openings += 1;
    if (openings === 1) throw new Error('preparation failed');
    return { async createSession() { creations += 1; }, async close() {} };
  }, () => 'session');
  t.after(() => startup.close());

  await assert.rejects(startup.prepare(), /preparation failed/);
  assert.equal(await startup.start(sampleWorkout), 'session');
  assert.equal(openings, 2);
  assert.equal(creations, 1);
});

test('a preparation failure during Start rejects that attempt and permits Retry', async (t) => {
  let openings = 0;
  let ids = 0;
  const startup = createWorkoutStartup(async () => {
    if (++openings === 1) throw new Error('database unavailable');
    return { async createSession() {}, async close() {} };
  }, () => `session-${++ids}`);
  t.after(() => startup.close());

  await assert.rejects(startup.start(sampleWorkout), /database unavailable/);
  assert.equal(ids, 0);
  assert.equal(await startup.start(sampleWorkout), 'session-1');
  assert.equal(openings, 2);
});

test('failed creation retries using the ready connection and returns only a successful session ID', async (t) => {
  let openings = 0;
  const attemptedIds = [];
  const startup = createWorkoutStartup(async () => {
    openings += 1;
    return {
      async createSession(id) {
        attemptedIds.push(id);
        if (attemptedIds.length === 1) throw new Error('write failed');
      },
      async close() {},
    };
  }, () => `session-${attemptedIds.length + 1}`);
  t.after(() => startup.close());

  await assert.rejects(startup.start(sampleWorkout), /write failed/);
  assert.equal(await startup.start(sampleWorkout), 'session-2');
  assert.deepEqual(attemptedIds, ['session-1', 'session-2']);
  assert.equal(openings, 1);
});

test('closing before preparation starts avoids opening an unused connection', async () => {
  let openings = 0;
  const startup = createWorkoutStartup(async () => {
    openings += 1;
    return { async createSession() {}, async close() {} };
  }, () => 'session');
  const preparing = startup.prepare();
  const closing = startup.close();
  await assert.rejects(preparing, /closed/);
  await closing;
  assert.equal(openings, 0);
});

test('closing during preparation prevents creation and closes the eventual connection once', async () => {
  const ready = deferred();
  let creations = 0;
  let closes = 0;
  const startup = createWorkoutStartup(() => ready.promise, () => 'session');
  const starting = startup.start(sampleWorkout);
  await flush();
  const closing = startup.close();
  ready.resolve({
    async createSession() { creations += 1; },
    async close() { closes += 1; },
  });
  await assert.rejects(starting, /closed/);
  await closing;
  await startup.close();
  assert.equal(creations, 0);
  assert.equal(closes, 1);
  await assert.rejects(startup.prepare(), /closed/);
  await assert.rejects(startup.start(sampleWorkout), /closed/);
});

test('closing during a write waits for it and prevents a late startup success', async () => {
  const written = deferred();
  let closes = 0;
  const startup = createWorkoutStartup(async () => ({
    async createSession() { await written.promise; },
    async close() { closes += 1; },
  }), () => 'session');
  const starting = startup.start(sampleWorkout);
  await flush();
  const closing = startup.close();
  assert.equal(closes, 0);
  written.resolve();
  await assert.rejects(starting, /closed/);
  await closing;
  assert.equal(closes, 1);
});
