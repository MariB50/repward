import type { WorkoutPlan } from './sampleWorkout';
import type { createWorkoutStorage } from './workoutStorage';

type StartupStorage = Awaited<ReturnType<typeof createWorkoutStorage>>;

/** Coordinate one screen's preparation and first workout, independently of React. */
export function createWorkoutStartup(
  openStorage: () => Promise<StartupStorage>,
  createSessionId: () => string,
) {
  let preparation: Promise<StartupStorage> | null = null;
  let starting: Promise<string> | null = null;
  let sessionId: string | null = null;
  let closed = false;
  let closing: Promise<void> | null = null;

  function prepare(): Promise<StartupStorage> {
    if (closed) return Promise.reject(new Error('Workout startup is closed.'));
    if (!preparation) {
      const attempt = Promise.resolve().then(() => {
        if (closed) throw new Error('Workout startup is closed.');
        return openStorage();
      });
      preparation = attempt;
      // Failed preparation can be retried; successful preparation stays shared.
      void attempt.catch(() => {
        if (preparation === attempt) preparation = null;
      });
    }
    return preparation;
  }

  function start(plan: WorkoutPlan, startedAt = new Date().toISOString()): Promise<string> {
    if (closed) return Promise.reject(new Error('Workout startup is closed.'));
    if (starting) return starting;
    if (sessionId !== null) return Promise.resolve(sessionId);

    const snapshot = { ...plan, exercises: plan.exercises.map((exercise) => ({ ...exercise })) };
    const attempt = (async () => {
      const storage = await prepare();
      if (closed) throw new Error('Workout startup is closed.');
      const id = createSessionId();
      await storage.createSession(id, snapshot, startedAt);
      if (closed) throw new Error('Workout startup is closed.');
      sessionId = id;
      return id;
    })();
    // Share a pending attempt, even when two taps arrive before React rerenders.
    starting = attempt;
    void attempt.then(
      () => { starting = null; },
      () => { starting = null; },
    );
    return attempt;
  }

  function close(): Promise<void> {
    if (!closing) {
      closed = true;
      const pendingPreparation = preparation;
      const pendingStart = starting;
      closing = (async () => {
        // Let an in-flight write finish before closing its connection.
        await pendingStart?.catch(() => undefined);
        const storage = await pendingPreparation?.catch(() => null);
        if (storage) await storage.close();
      })();
    }
    return closing;
  }

  function finished(id: string) {
    if (sessionId === id) sessionId = null;
  }

  return { prepare, start, finished, close };
}

export type WorkoutStartup = ReturnType<typeof createWorkoutStartup>;
