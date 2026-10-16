import type { Exercise, WorkoutPlan } from './sampleWorkout';

export type SetRecord = {
  weight: number;
  reps: number;
};

export type WorkoutExercise = Exercise & {
  sets: (SetRecord | null)[];
};

// The plan stays unchanged; each workout gets its own exercise objects and slots.
export function createWorkoutExercises(plan: WorkoutPlan): WorkoutExercise[] {
  return plan.exercises.map((exercise) => ({
    ...exercise,
    sets: Array<SetRecord | null>(exercise.plannedSets).fill(null),
  }));
}

export function completedSetCount(exercise: WorkoutExercise): number {
  return exercise.sets.filter((set) => set !== null).length;
}

export function parseSetRecord(weightText: string, repsText: string): SetRecord | null {
  const weightInput = weightText.trim();
  const repsInput = repsText.trim();

  // Empty text is not zero. Weight may have decimals; reps must be whole numbers.
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(weightInput) || !/^\d+$/.test(repsInput)) {
    return null;
  }

  const weight = Number(weightInput);
  const reps = Number(repsInput);
  if (!Number.isFinite(weight) || !Number.isSafeInteger(reps)) {
    return null;
  }

  return { weight, reps };
}

export function recordSet(
  exercises: WorkoutExercise[],
  exerciseId: string,
  record: SetRecord,
): WorkoutExercise[] {
  return exercises.map((exercise) => {
    if (exercise.id !== exerciseId) return exercise;

    const openSlot = exercise.sets.findIndex((set) => set === null);
    if (openSlot === -1) return exercise;

    // Replace the changed exercise and array instead of mutating React state.
    return {
      ...exercise,
      sets: exercise.sets.map((set, index) => (index === openSlot ? { ...record } : set)),
    };
  });
}
