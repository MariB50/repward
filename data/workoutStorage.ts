import type { SQLiteDatabase } from 'expo-sqlite';

import type { WorkoutPlan } from './sampleWorkout';
import type { SetRecord, WorkoutExercise } from './workoutSession';

// These are the Expo methods used here. Tests supply the same operations using
// Node's real SQLite engine, without loading React Native's native modules.
export type WorkoutDatabase = Pick<
  SQLiteDatabase,
  'execAsync' | 'runAsync' | 'getFirstAsync' | 'getAllAsync' | 'withTransactionAsync' | 'closeAsync'
>;

const SCHEMA_VERSION = 1;

const SCHEMA_SQL = `
  CREATE TABLE sessions (
    id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
    ended_at TEXT
  );

  CREATE TABLE session_exercises (
    session_id TEXT NOT NULL REFERENCES sessions(id),
    exercise_id TEXT NOT NULL CHECK (length(trim(exercise_id)) > 0),
    name TEXT NOT NULL,
    planned_sets INTEGER NOT NULL CHECK (
      typeof(planned_sets) = 'integer' AND planned_sets BETWEEN 1 AND 9007199254740991
    ),
    position INTEGER NOT NULL CHECK (typeof(position) = 'integer' AND position >= 0),
    PRIMARY KEY (session_id, exercise_id),
    UNIQUE (session_id, position)
  );

  CREATE TABLE set_results (
    session_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    set_number INTEGER NOT NULL CHECK (typeof(set_number) = 'integer' AND set_number > 0),
    weight REAL,
    reps INTEGER,
    PRIMARY KEY (session_id, exercise_id, set_number),
    FOREIGN KEY (session_id, exercise_id)
      REFERENCES session_exercises(session_id, exercise_id),
    CHECK (
      (weight IS NULL AND reps IS NULL)
      OR (
        weight IS NOT NULL AND reps IS NOT NULL
        AND typeof(weight) IN ('integer', 'real')
        AND weight >= 0 AND weight <= 1.7976931348623157e308
        AND typeof(reps) = 'integer'
        AND reps >= 0 AND reps <= 9007199254740991
      )
    )
  );
`;

function validateId(id: string) {
  if (typeof id !== 'string' || id.trim() === '') {
    throw new Error('A nonempty ID is required.');
  }
}

function validateSet(record: SetRecord) {
  if (!record || !Number.isFinite(record.weight) || record.weight < 0
    || !Number.isSafeInteger(record.reps) || record.reps < 0) {
    throw new Error('A set needs a finite nonnegative weight and nonnegative whole-number reps.');
  }
}

function validateExercises(exercises: WorkoutPlan['exercises']) {
  const ids = new Set<string>();
  for (const exercise of exercises) {
    validateId(exercise.id);
    if (ids.has(exercise.id)) throw new Error('Exercise IDs must be unique within a session.');
    ids.add(exercise.id);
    if (!Number.isSafeInteger(exercise.plannedSets) || exercise.plannedSets < 1) {
      throw new Error('An exercise needs a positive whole-number planned set count.');
    }
  }
}

/** Use one storage instance per connection; all operations share its write queue. */
export async function createWorkoutStorage(db: WorkoutDatabase) {
  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if (version && version.user_version > SCHEMA_VERSION) {
    throw new Error('This workout database was created by a newer app version.');
  }

  // Foreign keys are connection settings, so enable them before any transaction.
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  if (!version || version.user_version === 0) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(SCHEMA_SQL);
      await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    });
  }

  // Keep transactions from overlapping on this connection. A failed operation
  // rejects its caller but doesn't block a subsequent retry.
  let pending: Promise<unknown> = Promise.resolve();
  let closed = false;
  let closePromise: Promise<void> | undefined;

  function schedule<T>(operation: () => Promise<T>): Promise<T> {
    if (closed) return Promise.reject(new Error('Workout storage is closed.'));
    const result = pending.then(operation);
    pending = result.catch(() => undefined);
    return result;
  }

  async function findSession(sessionId: string) {
    const session = await db.getFirstAsync<{ ended_at: string | null }>(
      'SELECT ended_at FROM sessions WHERE id = ?', sessionId,
    );
    if (!session) throw new Error('Workout session not found.');
    return session;
  }

  async function writeSet(sessionId: string, exerciseId: string, setNumber: number, record: SetRecord) {
    const result = await db.runAsync(
      `UPDATE set_results SET weight = ?, reps = ?
       WHERE session_id = ? AND exercise_id = ? AND set_number = ?`,
      record.weight, record.reps, sessionId, exerciseId, setNumber,
    );
    if (result.changes !== 1) throw new Error('Planned set not found.');
  }

  async function createSession(sessionId: string, plan: WorkoutPlan): Promise<void> {
    validateId(sessionId);
    validateExercises(plan.exercises);
    // Capture values before waiting in the queue; later plan edits can't affect
    // this session's original names, order or planned set counts.
    const exercises = plan.exercises.map((exercise) => ({ ...exercise }));

    return schedule(() => db.withTransactionAsync(async () => {
      await db.runAsync('INSERT INTO sessions (id, ended_at) VALUES (?, NULL)', sessionId);
      for (const [position, exercise] of exercises.entries()) {
        await db.runAsync(
          `INSERT INTO session_exercises (session_id, exercise_id, name, planned_sets, position)
           VALUES (?, ?, ?, ?, ?)`,
          sessionId, exercise.id, exercise.name, exercise.plannedSets, position,
        );
        for (let setNumber = 1; setNumber <= exercise.plannedSets; setNumber += 1) {
          await db.runAsync(
            `INSERT INTO set_results (session_id, exercise_id, set_number, weight, reps)
             VALUES (?, ?, ?, NULL, NULL)`,
            sessionId, exercise.id, setNumber,
          );
        }
      }
    }));
  }

  /** setNumber is one-based: the first planned set is set 1. */
  async function saveSet(
    sessionId: string, exerciseId: string, setNumber: number, record: SetRecord,
  ): Promise<void> {
    validateId(sessionId);
    validateId(exerciseId);
    validateSet(record);
    if (!Number.isSafeInteger(setNumber) || setNumber < 1) {
      throw new Error('Set number must be a positive whole number.');
    }
    const savedRecord = { ...record };

    return schedule(() => db.withTransactionAsync(async () => {
      const session = await findSession(sessionId);
      if (session.ended_at !== null) throw new Error('This workout has already ended.');
      await writeSet(sessionId, exerciseId, setNumber, savedRecord);
    }));
  }

  async function finishSession(
    sessionId: string, exercises: WorkoutExercise[], endedAt: Date = new Date(),
  ): Promise<void> {
    validateId(sessionId);
    validateExercises(exercises);
    const endTime = endedAt.toISOString();
    const snapshot = exercises.map((exercise) => {
      if (exercise.sets.length !== exercise.plannedSets) {
        throw new Error('Set slots must match the exercise planned set count.');
      }
      return {
        ...exercise,
        sets: Array.from(exercise.sets, (set) => {
          if (set === null) return null;
          validateSet(set);
          return { ...set };
        }),
      };
    });

    return schedule(() => db.withTransactionAsync(async () => {
      const session = await findSession(sessionId);
      // A retry after a successful finish must not rewrite historical results
      // or change the original end time.
      if (session.ended_at !== null) return;

      const savedExercises = await db.getAllAsync<{ exercise_id: string; planned_sets: number }>(
        'SELECT exercise_id, planned_sets FROM session_exercises WHERE session_id = ?', sessionId,
      );
      if (savedExercises.length !== snapshot.length || savedExercises.some((saved) =>
        !snapshot.some((exercise) => exercise.id === saved.exercise_id
          && exercise.plannedSets === saved.planned_sets))) {
        throw new Error('Workout results must match the exercises and planned sets captured at start.');
      }

      for (const exercise of snapshot) {
        for (const [index, set] of exercise.sets.entries()) {
          // An empty UI slot must not erase a set that was already persisted.
          if (set !== null) await writeSet(sessionId, exercise.id, index + 1, set);
        }
      }
      await db.runAsync('UPDATE sessions SET ended_at = ? WHERE id = ?', endTime, sessionId);
    }));
  }

  function close(): Promise<void> {
    if (!closePromise) {
      closePromise = schedule(() => db.closeAsync());
      closed = true;
    }
    return closePromise;
  }

  return { createSession, saveSet, finishSession, close };
}
