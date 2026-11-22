import type { SessionSnapshot } from './workoutStorage';
import type { SetRecord, WorkoutExercise } from './workoutSession';

function lastLoggedSet(history: SessionSnapshot[], exerciseId: string): SetRecord | null {
  for (const session of history) {
    const recent = session.exercises
      .find((exercise) => exercise.id === exerciseId)
      ?.sets.findLast((set) => set !== null);
    if (recent) return recent;
  }
  return null;
}

export function setEntryDefaults(exercise: WorkoutExercise, index: number, history: SessionSnapshot[]) {
  const previous = exercise.sets.slice(0, index).findLast((set) => set !== null);
  const reference = previous ?? lastLoggedSet(history, exercise.id);
  return {
    initial: exercise.sets[index] ?? reference ?? { weight: 0, reps: 0 },
    reference,
    referenceLabel: previous ? 'previous set' : 'last time',
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

export function clockText(seconds: number) {
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}
