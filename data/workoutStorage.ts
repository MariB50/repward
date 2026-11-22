import type { SQLiteDatabase } from 'expo-sqlite';

import type { RepRange, WorkoutPlan } from './sampleWorkout';
import type { SetRecord, WorkoutExercise } from './workoutSession';

// These are the Expo methods used here. Tests supply the same operations using
// Node's real SQLite engine, without loading React Native's native modules.
export type WorkoutDatabase = Pick<
  SQLiteDatabase,
  'execAsync' | 'runAsync' | 'getFirstAsync' | 'getAllAsync' | 'withTransactionAsync' | 'closeAsync'
>;

const SCHEMA_VERSION = 3;

export type SessionSnapshot = {
  id: string;
  name: string;
  planId?: string;
  repRange?: RepRange;
  startedAt: string | null;
  endedAt: string | null;
  restUntil: number | null;
  exercises: WorkoutExercise[];
};

type SessionRow = Omit<SessionSnapshot, 'exercises' | 'planId' | 'repRange'> & {
  planId: string | null;
  minReps: number | null;
  maxReps: number | null;
  exerciseId: string;
  exerciseName: string;
  plannedSets: number;
  setNumber: number;
  weight: number | null;
  reps: number | null;
};

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
  const currentVersion = version?.user_version ?? 0;
  if (currentVersion > SCHEMA_VERSION) {
    throw new Error('This workout database was created by a newer app version.');
  }

  // Foreign keys are connection settings, so enable them before any transaction.
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  if (currentVersion < SCHEMA_VERSION) {
    await db.withTransactionAsync(async () => {
      if (currentVersion === 0) await db.execAsync(SCHEMA_SQL);
      if (currentVersion < 2) {
        await db.execAsync(`
          ALTER TABLE sessions ADD COLUMN name TEXT NOT NULL DEFAULT 'Upper body';
          ALTER TABLE sessions ADD COLUMN started_at TEXT;
          ALTER TABLE sessions ADD COLUMN rest_until INTEGER;
          CREATE TABLE preferences (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        `);
      }
      await db.execAsync(`
        ALTER TABLE sessions ADD COLUMN plan_id TEXT;
        ALTER TABLE sessions ADD COLUMN min_reps INTEGER CHECK (
          min_reps IS NULL OR (typeof(min_reps) = 'integer' AND min_reps BETWEEN 1 AND 9007199254740991)
        );
        ALTER TABLE sessions ADD COLUMN max_reps INTEGER CHECK (
          (min_reps IS NULL AND max_reps IS NULL)
          OR (min_reps IS NOT NULL AND typeof(max_reps) = 'integer'
            AND max_reps BETWEEN min_reps AND 9007199254740991)
        );
      `);
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
    const { id: planId, name } = plan;
    const { min, max } = plan.repRange ?? { min: null, max: null };

    return schedule(() => db.withTransactionAsync(async () => {
      await db.runAsync(
        'INSERT INTO sessions (id, name, started_at, plan_id, min_reps, max_reps) VALUES (?, ?, ?, ?, ?, ?)',
        sessionId, name, new Date().toISOString(), planId, min, max,
      );
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
    sessionId: string, exerciseId: string, setNumber: number, record: SetRecord, restUntil?: number | null,
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
      if (restUntil !== undefined) {
        await db.runAsync('UPDATE sessions SET rest_until = ? WHERE id = ?', restUntil, sessionId);
      }
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
      await db.runAsync('UPDATE sessions SET ended_at = ?, rest_until = NULL WHERE id = ?', endTime, sessionId);
    }));
  }

  function close(): Promise<void> {
    if (!closePromise) {
      closePromise = schedule(() => db.closeAsync());
      closed = true;
    }
    return closePromise;
  }

  function readSessions(): Promise<SessionSnapshot[]> {
    return schedule(async () => {
      const rows = await db.getAllAsync<SessionRow>(`
        SELECT s.id, s.name, s.started_at AS startedAt, s.ended_at AS endedAt, s.rest_until AS restUntil,
          s.plan_id AS planId, s.min_reps AS minReps, s.max_reps AS maxReps,
          e.exercise_id AS exerciseId, e.name AS exerciseName, e.planned_sets AS plannedSets,
          r.set_number AS setNumber, r.weight, r.reps
        FROM sessions s JOIN session_exercises e ON e.session_id = s.id
        JOIN set_results r ON r.session_id = s.id AND r.exercise_id = e.exercise_id
        ORDER BY s.rowid DESC, e.position, r.set_number
      `);
      const sessions: SessionSnapshot[] = [];
      for (const row of rows) {
        let session = sessions.at(-1);
        if (!session || session.id !== row.id) {
          session = { id: row.id, name: row.name, startedAt: row.startedAt, endedAt: row.endedAt,
            restUntil: row.restUntil, exercises: [] };
          if (row.planId !== null) session.planId = row.planId;
          if (row.minReps !== null && row.maxReps !== null) {
            session.repRange = { min: row.minReps, max: row.maxReps };
          }
          sessions.push(session);
        }
        let exercise = session.exercises.at(-1);
        if (!exercise || exercise.id !== row.exerciseId) {
          exercise = { id: row.exerciseId, name: row.exerciseName, plannedSets: row.plannedSets,
            sets: Array(row.plannedSets).fill(null) };
          session.exercises.push(exercise);
        }
        if (row.weight !== null && row.reps !== null) {
          exercise.sets[row.setNumber - 1] = { weight: row.weight, reps: row.reps };
        }
      }
      return sessions;
    });
  }

  function setRest(sessionId: string, until: number | null) {
    return schedule(async () => {
      const result = await db.runAsync('UPDATE sessions SET rest_until = ? WHERE id = ? AND ended_at IS NULL', until, sessionId);
      if (result.changes !== 1) throw new Error('Active workout not found.');
    });
  }

  function readPreferences() {
    return schedule(async () => Object.fromEntries((await db.getAllAsync<{key: string; value: string}>(
      'SELECT key, value FROM preferences',
    )).map(row => [row.key, row.value])) as Record<string, string>);
  }

  function setPreference(key: string, value: string) {
    return schedule(() => db.runAsync('INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)', key, value));
  }

  return { createSession, saveSet, finishSession, readSessions, setRest, readPreferences, setPreference, close };
}
