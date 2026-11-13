const test = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { mkdirSync, mkdtempSync, rmSync } = require('node:fs');
const path = require('node:path');
const { sampleWorkout } = require('../data/sampleWorkout.ts');
const { createWorkoutExercises } = require('../data/workoutSession.ts');
const { createWorkoutStorage } = require('../data/workoutStorage.ts');
const { createWorkoutStartup } = require('../data/workoutStartup.ts');

// This adapter executes the production SQL in real SQLite. It only translates
// Node's synchronous API to the small async Expo interface the storage uses.
function adaptDatabase(native) {
  return {
    async execAsync(sql) { native.exec(sql); },
    async runAsync(sql, ...params) { return native.prepare(sql).run(...params); },
    async getFirstAsync(sql, ...params) {
      const row = native.prepare(sql).get(...params);
      return row ? { ...row } : null;
    },
    async getAllAsync(sql, ...params) {
      return native.prepare(sql).all(...params).map((row) => ({ ...row }));
    },
    async withTransactionAsync(task) {
      native.exec('BEGIN TRANSACTION');
      try {
        await task();
        native.exec('COMMIT');
      } catch (error) {
        native.exec('ROLLBACK');
        throw error;
      }
    },
    async closeAsync() { native.close(); },
  };
}

async function fixture(t) {
  const db = adaptDatabase(new DatabaseSync(':memory:'));
  const storage = await createWorkoutStorage(db);
  t.after(() => storage.close());
  return { db, storage };
}

test('creation captures each session plan and creates explicit unfinished set rows', async (t) => {
  const { db, storage } = await fixture(t);
  const plan = structuredClone(sampleWorkout);
  const creating = storage.createSession('first', plan);
  plan.exercises[0].name = 'Changed later';
  plan.exercises[0].plannedSets = 7;
  await creating;
  await storage.createSession('second', sampleWorkout);

  assert.deepEqual(await db.getAllAsync('SELECT * FROM sessions ORDER BY id'), [
    { id: 'first', ended_at: null }, { id: 'second', ended_at: null },
  ]);
  assert.deepEqual(await db.getAllAsync(
    'SELECT exercise_id, name, planned_sets, position FROM session_exercises WHERE session_id = ? ORDER BY position',
    'first',
  ), [
    { exercise_id: 'bench-press', name: 'Bench press', planned_sets: 2, position: 0 },
    { exercise_id: 'seated-row', name: 'Seated row', planned_sets: 2, position: 1 },
  ]);
  const sets = await db.getAllAsync('SELECT * FROM set_results');
  assert.equal(sets.length, 8);
  assert.ok(sets.every((set) => set.weight === null && set.reps === null));
  assert.deepEqual([...new Set(sets.map((set) => set.set_number))].sort(), [1, 2]);
});

test('set writes are isolated, queued and retry the same slot; zero is a recorded result', async (t) => {
  const { db, storage } = await fixture(t);
  await storage.createSession('first', sampleWorkout);
  await storage.createSession('second', sampleWorkout);
  const record = { weight: 0, reps: 0 };
  const firstSave = storage.saveSet('first', 'bench-press', 1, record);
  record.reps = 99;
  await Promise.all([
    firstSave,
    storage.saveSet('first', 'seated-row', 1, { weight: 40.5, reps: 8 }),
    storage.saveSet('first', 'bench-press', 2, { weight: 50, reps: 9 }),
  ]);
  await storage.saveSet('first', 'bench-press', 1, { weight: 0, reps: 0 });

  assert.deepEqual(await db.getAllAsync(
    'SELECT weight, reps FROM set_results WHERE session_id = ? AND exercise_id = ? ORDER BY set_number',
    'first', 'bench-press',
  ), [{ weight: 0, reps: 0 }, { weight: 50, reps: 9 }]);
  assert.equal((await db.getFirstAsync(
    'SELECT COUNT(*) AS count FROM set_results WHERE session_id = ?', 'first',
  )).count, 4);
  assert.equal((await db.getFirstAsync(
    'SELECT COUNT(*) AS count FROM set_results WHERE session_id = ? AND weight IS NULL', 'second',
  )).count, 4);
});

test('bad values and unknown targets reject without changing data or blocking the next save', async (t) => {
  const { db, storage } = await fixture(t);
  await storage.createSession('first', sampleWorkout);
  for (const record of [
    { weight: -1, reps: 2 }, { weight: Infinity, reps: 2 },
    { weight: NaN, reps: 2 }, { weight: 1, reps: -1 },
    { weight: 1, reps: 1.5 }, { weight: 1, reps: 9007199254740992 },
  ]) {
    await assert.rejects(storage.saveSet('first', 'bench-press', 1, record));
  }
  for (const [session, exercise, number] of [
    ['first', 'bench-press', 0], ['first', 'bench-press', 1.5],
    ['first', 'bench-press', 3], ['first', 'unknown', 1], ['missing', 'bench-press', 1],
  ]) {
    await assert.rejects(storage.saveSet(session, exercise, number, { weight: 50, reps: 10 }));
  }
  assert.equal((await db.getFirstAsync(
    'SELECT COUNT(*) AS count FROM set_results WHERE weight IS NOT NULL',
  )).count, 0);
  await storage.saveSet('first', 'bench-press', 1, { weight: 50, reps: 10 });
});

test('database constraints enforce paired values, set identity and parent relationships', async (t) => {
  const { db, storage } = await fixture(t);
  await storage.createSession('first', sampleWorkout);
  for (const [weight, reps] of [[null, 10], [50, null], [-1, 10], [50, 1.5], [Infinity, 10]]) {
    await assert.rejects(db.runAsync(
      'UPDATE set_results SET weight = ?, reps = ? WHERE session_id = ? AND exercise_id = ? AND set_number = 1',
      weight, reps, 'first', 'bench-press',
    ), /CHECK constraint failed/);
  }
  await assert.rejects(db.runAsync(
    'INSERT INTO set_results (session_id, exercise_id, set_number) VALUES (?, ?, 1)',
    'first', 'bench-press',
  ), /UNIQUE constraint failed/);
  await assert.rejects(db.runAsync(
    'INSERT INTO set_results (session_id, exercise_id, set_number) VALUES (?, ?, 1)',
    'first', 'missing',
  ), /FOREIGN KEY constraint failed/);
  await assert.rejects(db.runAsync(
    'INSERT INTO session_exercises (session_id, exercise_id, name, planned_sets, position) VALUES (?, ?, ?, 2, 0)',
    'missing', 'bench-press', 'Bench press',
  ), /FOREIGN KEY constraint failed/);
  await assert.rejects(db.runAsync(
    "UPDATE session_exercises SET planned_sets = 1.5 WHERE session_id = 'first'",
  ), /CHECK constraint failed/);
  await assert.rejects(db.runAsync(
    "UPDATE set_results SET set_number = 1.5 WHERE session_id = 'first'",
  ), /CHECK constraint failed/);
});

test('a failure partway through session creation rolls back every new row and permits retry', async (t) => {
  const { db, storage } = await fixture(t);
  await db.execAsync(`
    CREATE TRIGGER fail_creation BEFORE INSERT ON set_results
    WHEN NEW.exercise_id = 'seated-row'
    BEGIN SELECT RAISE(ABORT, 'simulated creation failure'); END;
  `);
  await assert.rejects(storage.createSession('first', sampleWorkout), /simulated creation failure/);
  for (const table of ['sessions', 'session_exercises', 'set_results']) {
    assert.equal((await db.getFirstAsync(`SELECT COUNT(*) AS count FROM ${table}`)).count, 0);
  }
  await db.execAsync('DROP TRIGGER fail_creation');
  await storage.createSession('first', sampleWorkout);
  await assert.rejects(storage.createSession('first', sampleWorkout), /UNIQUE constraint failed/);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM set_results')).count, 4);
});

test('finishing preserves partial work, unfinished rows and previously persisted sets', async (t) => {
  const { db, storage } = await fixture(t);
  await storage.createSession('first', sampleWorkout);
  await storage.saveSet('first', 'bench-press', 1, { weight: 50, reps: 10 });
  const results = createWorkoutExercises(sampleWorkout);
  // The null slot below must not erase the already-persisted first Bench set.
  results[0].sets[1] = { weight: 50, reps: 9 };
  results[1].sets[0] = { weight: 0, reps: 0 };
  const endedAt = new Date('2026-11-12T18:00:00.000Z');
  const finishing = storage.finishSession('first', results, endedAt);
  results[0].sets[1].reps = 99;
  endedAt.setUTCFullYear(2000);
  await finishing;

  assert.deepEqual(await db.getAllAsync(
    'SELECT exercise_id, set_number, weight, reps FROM set_results ORDER BY exercise_id, set_number',
  ), [
    { exercise_id: 'bench-press', set_number: 1, weight: 50, reps: 10 },
    { exercise_id: 'bench-press', set_number: 2, weight: 50, reps: 9 },
    { exercise_id: 'seated-row', set_number: 1, weight: 0, reps: 0 },
    { exercise_id: 'seated-row', set_number: 2, weight: null, reps: null },
  ]);
  assert.equal((await db.getFirstAsync('SELECT ended_at FROM sessions')).ended_at, '2026-11-12T18:00:00.000Z');
  await assert.rejects(storage.saveSet('first', 'seated-row', 2, { weight: 40, reps: 8 }), /already ended/);
  await storage.finishSession('first', results, new Date('2026-11-13T18:00:00.000Z'));
  assert.equal((await db.getFirstAsync('SELECT ended_at FROM sessions')).ended_at, '2026-11-12T18:00:00.000Z');
  assert.equal((await db.getFirstAsync(
    "SELECT reps FROM set_results WHERE exercise_id = 'bench-press' AND set_number = 2",
  )).reps, 9);
});

test('a final-save failure leaves the session active and rolls back pending results before retry', async (t) => {
  const { db, storage } = await fixture(t);
  await storage.createSession('first', sampleWorkout);
  await storage.saveSet('first', 'bench-press', 1, { weight: 50, reps: 10 });
  await db.execAsync(`
    CREATE TRIGGER fail_finish BEFORE UPDATE OF ended_at ON sessions
    BEGIN SELECT RAISE(ABORT, 'simulated final save failure'); END;
  `);
  const results = createWorkoutExercises(sampleWorkout);
  results[0].sets[0] = { weight: 60, reps: 8 };
  results[1].sets[0] = { weight: 40, reps: 8 };
  await assert.rejects(storage.finishSession('first', results), /simulated final save failure/);
  assert.equal((await db.getFirstAsync('SELECT ended_at FROM sessions')).ended_at, null);
  assert.deepEqual(await db.getAllAsync(
    'SELECT weight, reps FROM set_results WHERE weight IS NOT NULL',
  ), [{ weight: 50, reps: 10 }]);

  await db.execAsync('DROP TRIGGER fail_finish');
  await storage.finishSession('first', results);
  assert.equal((await db.getFirstAsync(
    'SELECT COUNT(*) AS count FROM set_results WHERE weight IS NOT NULL',
  )).count, 2);
});

test('final saving rejects missing exercises, changed plans and malformed sets', async (t) => {
  const { db, storage } = await fixture(t);
  await storage.createSession('first', sampleWorkout);
  const changed = createWorkoutExercises(sampleWorkout);
  changed[0].plannedSets = 3;
  changed[0].sets.push(null);
  const malformed = createWorkoutExercises(sampleWorkout);
  malformed[0].sets.pop();
  const duplicate = createWorkoutExercises(sampleWorkout);
  duplicate[1].id = duplicate[0].id;
  const invalidSet = createWorkoutExercises(sampleWorkout);
  invalidSet[0].sets[0] = { weight: 50, reps: -1 };
  for (const results of [changed, malformed, duplicate, invalidSet, []]) {
    await assert.rejects(storage.finishSession('first', results));
  }
  await assert.rejects(storage.finishSession('first', createWorkoutExercises(sampleWorkout), new Date(NaN)));
  await assert.rejects(storage.finishSession('missing', createWorkoutExercises(sampleWorkout)), /not found/);
  assert.equal((await db.getFirstAsync('SELECT ended_at FROM sessions')).ended_at, null);
});

test('a failed per-set write leaves its slot unfinished and can be retried', async (t) => {
  const { db, storage } = await fixture(t);
  await storage.createSession('first', sampleWorkout);
  await db.execAsync(`
    CREATE TRIGGER fail_set BEFORE UPDATE ON set_results
    BEGIN SELECT RAISE(ABORT, 'simulated set save failure'); END;
  `);
  await assert.rejects(storage.saveSet('first', 'bench-press', 1, { weight: 50, reps: 10 }), /simulated set save failure/);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM set_results WHERE weight IS NOT NULL')).count, 0);
  await db.execAsync('DROP TRIGGER fail_set');
  await storage.saveSet('first', 'bench-press', 1, { weight: 50, reps: 10 });
});

test('records survive closing/reopening a file database; close drains pending writes', async (t) => {
  const temporaryRoot = path.resolve(__dirname, '../.expo');
  mkdirSync(temporaryRoot, { recursive: true });
  const temporaryDirectory = mkdtempSync(path.join(temporaryRoot, 'storage-test-'));
  let storage;
  t.after(async () => {
    if (storage) await storage.close();
    assert.ok(path.resolve(temporaryDirectory).startsWith(temporaryRoot + path.sep));
    rmSync(temporaryDirectory, { recursive: true, force: true });
  });
  const filename = path.join(temporaryDirectory, 'history.db');
  storage = await createWorkoutStorage(adaptDatabase(new DatabaseSync(filename)));
  const sessionId = "session with ' and ?";
  await storage.createSession(sessionId, sampleWorkout);
  const saving = storage.saveSet(sessionId, 'bench-press', 1, { weight: 50, reps: 10 });
  await storage.close();
  await saving;
  await assert.rejects(storage.saveSet(sessionId, 'bench-press', 2, { weight: 50, reps: 9 }), /closed/);

  const reopenedDb = adaptDatabase(new DatabaseSync(filename));
  storage = await createWorkoutStorage(reopenedDb);
  assert.equal((await reopenedDb.getFirstAsync('SELECT COUNT(*) AS count FROM sessions')).count, 1);
  assert.deepEqual(await reopenedDb.getFirstAsync(
    'SELECT weight, reps FROM set_results WHERE session_id = ? AND exercise_id = ? AND set_number = 1',
    sessionId, 'bench-press',
  ), { weight: 50, reps: 10 });
  assert.equal((await reopenedDb.getFirstAsync('PRAGMA user_version')).user_version, 1);
  assert.equal((await reopenedDb.getFirstAsync('PRAGMA foreign_keys')).foreign_keys, 1);
});

test('initialization refuses a newer database version without creating tables', async (t) => {
  const db = adaptDatabase(new DatabaseSync(':memory:'));
  t.after(() => db.closeAsync());
  await db.execAsync('PRAGMA user_version = 2');
  await assert.rejects(createWorkoutStorage(db), /newer app version/);
  assert.equal((await db.getFirstAsync(
    "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table'",
  )).count, 0);
});

test('startup creates exactly one real SQLite session with its original unfinished slots', async (t) => {
  const { db, storage } = await fixture(t);
  const startup = createWorkoutStartup(async () => storage, () => 'startup-session');
  t.after(() => startup.close());
  await startup.prepare();
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM sessions')).count, 0);

  const ids = await Promise.all([startup.start(sampleWorkout), startup.start(sampleWorkout)]);
  assert.deepEqual(ids, ['startup-session', 'startup-session']);
  assert.deepEqual(await db.getAllAsync('SELECT * FROM sessions'), [
    { id: 'startup-session', ended_at: null },
  ]);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS count FROM session_exercises')).count, 2);
  assert.equal((await db.getFirstAsync(
    'SELECT COUNT(*) AS count FROM set_results WHERE weight IS NULL AND reps IS NULL',
  )).count, 4);
});
