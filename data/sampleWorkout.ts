export type Exercise = {
  id: string;
  name: string;
  plannedSets: number;
};

export type RepRange = { min: number; max: number };

export type WorkoutPlan = {
  id: string;
  name: string;
  exercises: Exercise[];
  repRange?: RepRange;
};

export const sampleWorkout: WorkoutPlan = {
  id: 'upper-body',
  name: 'Upper body',
  exercises: [
    { id: 'bench-press', name: 'Bench press', plannedSets: 2 },
    { id: 'seated-row', name: 'Seated row', plannedSets: 2 },
  ],
};
