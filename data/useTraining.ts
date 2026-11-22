import { useEffect, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { openWorkoutStorage } from './openWorkoutStorage';
import { createWorkoutStartup } from './workoutStartup';
import { createWorkoutSetSaver } from './workoutSetSaver';
import { sampleWorkout, type WorkoutPlan } from './sampleWorkout';
import { readWorkoutLibrary, updateWorkoutPlan } from './workoutLibrary';
import { createWorkoutExercises, type SetRecord } from './workoutSession';
import type { SessionSnapshot } from './workoutStorage';
import { allowRestAlerts, updateRestAlert } from './restAlerts';

function createConnection(closing: Promise<void>) {
  const startup = createWorkoutStartup(async () => {
    await closing;
    return openWorkoutStorage();
  }, randomUUID);
  const saver = createWorkoutSetSaver(async (r) => {
    const storage = await startup.prepare();
    await storage.saveSet(r.sessionId, r.exerciseId, r.setNumber, r.record, r.restUntil);
  });
  return { startup, saver };
}
type Connection = ReturnType<typeof createConnection>;

export function useTraining() {
  const live = useRef<Connection | null>(null);
  const closing = useRef(Promise.resolve());
  const working = useRef(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [library, setLibrary] = useState(() => readWorkoutLibrary({}, sampleWorkout));
  const plan = library.plans.find((item) => item.id === library.selectedId) ?? library.plans[0];
  const [duration, setDuration] = useState(90);
  const [alerts, setAlerts] = useState(false);
  const [active, setActive] = useState<SessionSnapshot | null>(null);
  const [history, setHistory] = useState<SessionSnapshot[]>([]);
  const [retrySet, setRetrySet] = useState(false);

  useEffect(() => {
    const conn = createConnection(closing.current);
    live.current = conn;
    setReady(false);
    setError('');
    void (async () => {
      const storage = await conn.startup.prepare();
      const [sessions, prefs] = await Promise.all([storage.readSessions(), storage.readPreferences()]);
      if (live.current !== conn) return;
      const current = sessions[0] && !sessions[0].endedAt ? sessions[0] : null;
      setLibrary(readWorkoutLibrary(prefs, sampleWorkout));
      setDuration(Number(prefs.rest) || 90);
      setAlerts(prefs.alerts === 'on');
      setActive(current);
      setHistory(sessions.filter((item) => item !== current));
      setReady(true);
    })().catch(() => {
      if (live.current === conn) setError('Couldn’t open your workout log. Try again.');
    });
    return () => {
      live.current = null;
      closing.current = (async () => {
        await conn.saver.close();
        await conn.startup.close();
      })().catch(() => undefined);
    };
  }, [attempt]);

  async function run(message: string, task: (conn: Connection) => Promise<void>, allowPending = false) {
    const conn = live.current;
    if (!ready || !conn || working.current || (conn.saver.hasPending() && !allowPending)) return false;
    working.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await task(conn);
      return live.current === conn;
    } catch {
      if (live.current === conn) setError(message);
      return false;
    } finally {
      if (live.current === conn) {
        working.current = false;
        setBusy(false);
      }
    }
  }

  async function notify(until: number | null, enabled: boolean) {
    if (!enabled) return;
    try {
      await updateRestAlert(until);
    } catch {
      setNotice('The timer is running in the app. Your device couldn’t update its rest alert.');
    }
  }

  function start() {
    return run('Couldn’t start this workout. Try again.', async (conn) => {
      if (active) return;
      const id = await conn.startup.start(plan);
      if (live.current === conn)
        setActive({
          id,
          name: plan.name,
          planId: plan.id,
          repRange: plan.repRange,
          startedAt: new Date().toISOString(),
          endedAt: null,
          restUntil: null,
          exercises: createWorkoutExercises(plan),
        });
    });
  }
  function save(exerciseId: string, index: number, record: SetRecord | null) {
    return run(
      'Couldn’t save this set. Retry to keep these numbers.',
      async (conn) => {
        if (!active) throw Error();
        const left = active.exercises.reduce((n, e) => n + e.sets.filter((s) => s === null).length, 0);
        const correcting = !!active.exercises.find((e) => e.id === exerciseId)?.sets[index];
        const restUntil = correcting ? undefined : left > 1 ? Date.now() + duration * 1000 : null;
        try {
          const saved = await (conn.saver.hasPending()
            ? conn.saver.retry()
            : conn.saver.save({
                sessionId: active.id,
                exerciseId,
                setNumber: index + 1,
                record: record!,
                restUntil,
              }));
          if (live.current !== conn) return;
          setRetrySet(false);
          const updated = active.exercises.map((e) =>
            e.id !== saved.exerciseId
              ? e
              : {
                  ...e,
                  sets: e.sets.map((set, i) => (i === saved.setNumber - 1 ? saved.record : set)),
                },
          );
          setActive({
            ...active,
            exercises: updated,
            restUntil: saved.restUntil === undefined ? active.restUntil : saved.restUntil,
          });
          if (saved.restUntil !== undefined) await notify(saved.restUntil, alerts);
        } catch (e) {
          if (live.current === conn) setRetrySet(conn.saver.hasPending());
          throw e;
        }
      },
      true,
    );
  }
  function finish() {
    return run('Couldn’t finish this workout. Your saved sets are here. Try again.', async (conn) => {
      if (!active) return;
      const ended = new Date();
      const storage = await conn.startup.prepare();
      await storage.finishSession(active.id, active.exercises, ended);
      if (live.current !== conn) return;
      conn.startup.finished(active.id);
      setHistory((current) => [
        { ...active, endedAt: ended.toISOString(), restUntil: null },
        ...current,
      ]);
      setActive(null);
      await notify(null, alerts);
    });
  }
  function persistLibrary(next: typeof library, message: string) {
    return run(message, async (conn) => {
      await (await conn.startup.prepare()).setPreference('workouts', JSON.stringify(next));
      if (live.current === conn) setLibrary(next);
    });
  }
  function savePlan(next: WorkoutPlan, select: boolean) {
    return persistLibrary(
      updateWorkoutPlan(library, next, select),
      'Couldn’t save this workout. Try again.',
    );
  }
  function selectPlan(id: string) {
    return persistLibrary({ ...library, selectedId: id }, 'Couldn’t select this workout. Try again.');
  }
  function setRest(until: number | null) {
    return run('Couldn’t update the rest timer. Try again.', async (conn) => {
      if (!active) return;
      await (await conn.startup.prepare()).setRest(active.id, until);
      if (live.current !== conn) return;
      setActive({ ...active, restUntil: until });
      await notify(until, alerts);
    });
  }
  function chooseDuration(value: number) {
    return run('Couldn’t save your rest duration. Try again.', async (conn) => {
      await (await conn.startup.prepare()).setPreference('rest', String(value));
      if (live.current === conn) {
        setDuration(value);
        if (active?.restUntil && active.restUntil > Date.now())
          setNotice('Next rest will use the new duration.');
      }
    });
  }
  function toggleAlerts() {
    return run('Couldn’t update rest notifications. Try again.', async (conn) => {
      if (!alerts && !(await allowRestAlerts())) {
        setNotice('Allow notifications in your device settings for lock-screen rest alerts.');
        return;
      }
      await (await conn.startup.prepare()).setPreference('alerts', alerts ? 'off' : 'on');
      if (live.current !== conn) return;
      setAlerts(!alerts);
      await notify(alerts ? null : (active?.restUntil ?? null), true);
    });
  }
  return {
    plan,
    plans: library.plans,
    active,
    history,
    duration,
    alerts,
    busy,
    ready,
    error,
    notice,
    retrySet,
    start,
    save,
    finish,
    savePlan,
    selectPlan,
    setRest,
    chooseDuration,
    toggleAlerts,
    retryLoad: () => setAttempt((n) => n + 1),
    locked: busy || retrySet || !ready,
  };
}
