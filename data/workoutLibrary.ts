import type { WorkoutPlan } from './sampleWorkout';

export type WorkoutLibrary = { plans: WorkoutPlan[]; selectedId: string };

export function readWorkoutLibrary(prefs: Record<string, string>, starter: WorkoutPlan): WorkoutLibrary {
  if (prefs.workouts) return JSON.parse(prefs.workouts);
  const plan: WorkoutPlan = prefs.plan ? JSON.parse(prefs.plan) : starter;
  return { plans: [plan], selectedId: plan.id };
}

export function updateWorkoutPlan(
  library: WorkoutLibrary,
  plan: WorkoutPlan,
  select: boolean,
): WorkoutLibrary {
  const exists = library.plans.some((item) => item.id === plan.id);
  const plans = exists
    ? library.plans.map((item) => (item.id === plan.id ? plan : item))
    : [...library.plans, plan];
  return { plans, selectedId: select ? plan.id : library.selectedId };
}
