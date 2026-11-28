import type { RepRange } from './sampleWorkout';
import type { SessionSnapshot } from './workoutStorage';
import type { SetRecord, WorkoutExercise } from './workoutSession';

export function parseRepRange(minText: string, maxText: string): RepRange | undefined | null {
  const lower = minText.trim();
  const upper = maxText.trim();
  if (!lower && !upper) return undefined;
  if (!/^\d+$/.test(lower) || !/^\d+$/.test(upper)) return null;
  const min = Number(lower);
  const max = Number(upper);
  return Number.isSafeInteger(min) && Number.isSafeInteger(max) && min > 0 && max >= min
    ? { min, max }
    : null;
}

export function repRangeText(range: RepRange) {
  return range.min === range.max ? String(range.min) : range.min + '–' + range.max;
}

type SetGoal = { weight: number; reps: number | null };
type WorkoutReference = Pick<SessionSnapshot, 'name' | 'planId' | 'repRange'>;
type SetEntryDefaults = {
  initial: SetRecord;
  reference: SetRecord | null;
  referenceLabel: string;
  goal?: SetGoal | null;
};

export function suggestedWeight(record: SetRecord, range: RepRange, workingWeight = 0) {
  const { weight, reps } = record;
  if (weight <= 0 || weight < workingWeight || reps <= range.max) return null;
  return weightAtReps(record, range.max);
}

function weightAtReps({ weight, reps }: SetRecord, targetReps: number) {
  // Invert the Epley estimate at the nearest end of the range and cap the adjustment at 10%.
  const change = (reps - targetReps) / (30 + targetReps);
  const direction = Math.sign(change);
  const jump = Math.min(Math.abs(change), 0.1);
  const step = weight >= 100 ? 5 : weight >= 50 ? 2.5 : weight >= 25 ? 1 : weight >= 5 ? 0.5 : 0.1;
  const maxSteps = Math.floor((weight * 0.1) / step);
  const steps = Math.min(maxSteps, Math.max(1, Math.round((weight * jump) / step)));
  if (!steps) return null;
  const next = Number((weight + direction * steps * step).toPrecision(15));
  return Number.isFinite(next) && Math.sign(next - weight) === direction ? next : null;
}

function nextRepGoal(target: SetGoal, range: RepRange): SetGoal {
  if (target.reps === null) return target;
  return {
    weight: target.weight,
    reps: Math.max(range.min, Math.min(target.reps + 1, Number.MAX_SAFE_INTEGER)),
  };
}

function nextSetGoal(previous: SetRecord, range: RepRange): SetGoal | null {
  if (previous.reps >= range.min && previous.reps <= range.max) {
    return nextRepGoal(previous, range);
  }
  const weight = previous.weight > 0 && previous.reps < range.min
    ? weightAtReps(previous, range.min)
    : suggestedWeight(previous, range);
  return weight === null ? null : { weight, reps: null };
}

export function exerciseProgress(
  session: WorkoutReference,
  exerciseId: string,
  history: SessionSnapshot[],
) {
  const { repRange } = session;
  const results: SetRecord[] = [];
  for (const past of history) {
    if (!past.endedAt || (past.planId ? past.planId !== session.planId : past.name !== session.name)) {
      continue;
    }
    const set = lastExerciseSet(past, exerciseId);
    if (!set) continue;
    results.push(set);
    // Start from the most recent working set recorded before the workout had a range.
    if (!past.repRange && set.reps > 0) break;
  }

  const reference = results[0] ?? null;
  let target: SetGoal | null = null;
  let workingWeight = 0;
  if (repRange) {
    for (const result of results.reverse()) {
      if (!result.reps || result.weight < workingWeight) continue;
      workingWeight = result.weight;
      const increase = suggestedWeight(result, repRange);
      const next = increase === null ? result : { weight: increase, reps: null };
      // Preserve a pending increase on lighter days. More reps at the working
      // weight can still earn a larger increase before the first one is tried.
      if (!target || next.weight >= target.weight) target = next;
    }
  }
  return { reference, target, workingWeight };
}

function lastExerciseSet(session: SessionSnapshot, exerciseId: string) {
  return session.exercises.find((exercise) => exercise.id === exerciseId)
    ?.sets.findLast((set) => set !== null) ?? null;
}

function lastLoggedSet(history: SessionSnapshot[], exerciseId: string): SetRecord | null {
  for (const session of history) {
    const recent = lastExerciseSet(session, exerciseId);
    if (recent) return recent;
  }
  return null;
}

export function setEntryDefaults(
  exercise: WorkoutExercise,
  index: number,
  history: SessionSnapshot[],
  session?: WorkoutReference,
): SetEntryDefaults {
  const previous = exercise.sets.findLast((set, slot) => slot < index && set !== null) ?? null;
  const saved = exercise.sets[index];
  if (!session?.repRange) {
    const reference = previous ?? lastLoggedSet(history, exercise.id);
    return {
      initial: saved ?? reference ?? { weight: 0, reps: 0 },
      reference,
      referenceLabel: previous ? 'previous set' : 'last time',
    };
  }

  const range = session.repRange;
  if (previous) {
    const goal = saved ? null : nextSetGoal(previous, range);
    return {
      initial: saved ?? { ...previous, weight: goal?.weight ?? previous.weight },
      reference: previous,
      referenceLabel: 'previous set',
      goal,
    };
  }

  const { reference, target } = exerciseProgress(session, exercise.id, history);
  const recommended = target && { weight: target.weight, reps: target.reps ?? reference?.reps ?? 0 };
  return {
    initial: saved ?? recommended ?? reference ?? lastLoggedSet(history, exercise.id) ?? { weight: 0, reps: 0 },
    reference,
    referenceLabel: 'last time',
    goal: !saved && target ? nextRepGoal(target, range) : null,
  };
}

export function previousSet(history: SessionSnapshot[], exerciseId: string, index: number) {
  for (const session of history) {
    if (!session.endedAt) continue;
    const set = session.exercises.find((exercise) => exercise.id === exerciseId)?.sets[index];
    if (set) return set;
  }
  return null;
}

type ExerciseWorkout = {
  sessionId: string;
  workoutName: string;
  date: number;
  topSet: SetRecord;
};

export type ExerciseTrend = {
  id: string;
  name: string;
  workouts: ExerciseWorkout[];
};

export function exerciseTrends(history: SessionSnapshot[]) {
  const workouts = history
    .map((session) => ({ session, date: Date.parse(session.endedAt ?? '') }))
    .filter(({ date }) => Number.isFinite(date))
    .sort((a, b) => b.date - a.date);
  const trends = new Map<string, ExerciseTrend>();

  for (const { session, date } of workouts) {
    for (const exercise of session.exercises) {
      let topSet: SetRecord | undefined;
      for (const set of exercise.sets) {
        if (!set?.reps) continue;
        if (!topSet || set.weight > topSet.weight || (set.weight === topSet.weight && set.reps > topSet.reps)) {
          topSet = set;
        }
      }
      if (!topSet) continue;

      let trend = trends.get(exercise.id);
      if (!trend) {
        trend = { id: exercise.id, name: exercise.name, workouts: [] };
        trends.set(exercise.id, trend);
      }
      trend.workouts.push({ sessionId: session.id, workoutName: session.name, date, topSet });
    }
  }
  return [...trends.values()];
}

export function changeFrom(current: SetRecord, prior: SetRecord) {
  const weight = Number((current.weight - prior.weight).toFixed(3));
  const reps = current.reps - prior.reps;
  const difference = (n: number) => (n > 0 ? '+' + n : String(n));
  const parts = [];
  if (weight) parts.push(difference(weight) + ' lb');
  if (reps) parts.push(difference(reps) + (Math.abs(reps) === 1 ? ' rep' : ' reps'));
  return parts.join(' · ') || 'Matched';
}

export function sessionTotals(session: SessionSnapshot) {
  let sets = 0;
  let volume = 0;
  for (const exercise of session.exercises) {
    for (const set of exercise.sets) {
      if (!set) continue;
      sets++;
      volume += set.weight * set.reps;
    }
  }
  return { sets, volume };
}

export function sessionDurationText({ startedAt, endedAt }: Pick<SessionSnapshot, 'startedAt' | 'endedAt'>) {
  if (!startedAt || !endedAt) return null;
  const elapsed = Date.parse(endedAt) - Date.parse(startedAt);
  if (!Number.isFinite(elapsed) || elapsed < 0) return null;

  const totalSeconds = Math.floor(elapsed / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (hours) parts.push(hours + 'h');
  if (minutes) parts.push(minutes + 'm');
  if (seconds || !parts.length) parts.push(seconds + 's');
  return parts.join(' ');
}

export function clockText(seconds: number) {
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}
