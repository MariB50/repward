const test = require('node:test');
const assert = require('node:assert/strict');
const { readWorkoutLibrary, updateWorkoutPlan } = require('../data/workoutLibrary.ts');
const { catalogExerciseFor, exerciseCatalog, searchExercises } = require('../data/exerciseCatalog.ts');
const { sampleWorkout } = require('../data/sampleWorkout.ts');

test('an earlier edited plan carries over with its original tracking IDs', () => {
  const legacy = { ...sampleWorkout, name: 'My push day',
    exercises: [{ id: 'my-legacy-lift', name: 'Leg press', plannedSets: 4 }],
  };
  const library = readWorkoutLibrary({ plan: JSON.stringify(legacy) }, sampleWorkout);
  assert.deepEqual(library, { plans: [legacy], selectedId: legacy.id });
  assert.equal(catalogExerciseFor(legacy.exercises[0]).id, 'leg-press');
  assert.equal(catalogExerciseFor(sampleWorkout.exercises[0]).id, 'bench-press');
  assert.equal(catalogExerciseFor(sampleWorkout.exercises[1]).id, 'seated-row');
});

test('creating and editing another workout retains both routines across reload', () => {
  const library = readWorkoutLibrary({}, sampleWorkout);
  const lower = { id: 'lower', name: 'Lower body',
    exercises: [{ id: 'leg-press', name: 'Leg press', plannedSets: 3 }],
  };
  const added = updateWorkoutPlan(library, lower, true);
  const edited = updateWorkoutPlan(added, { ...sampleWorkout, name: 'Upper A' }, false);
  const loaded = readWorkoutLibrary({ plan: JSON.stringify(sampleWorkout), workouts: JSON.stringify(edited) }, sampleWorkout);
  assert.equal(loaded.plans.length, 2);
  assert.equal(loaded.plans[0].name, 'Upper A');
  assert.deepEqual(loaded.plans[1], lower);
  assert.equal(loaded.selectedId, lower.id);
  assert.deepEqual(library.plans, [sampleWorkout]);
});

test('the exercise catalog has unique IDs and finds aliases, case-insensitive names, and equipment', () => {
  assert.equal(new Set(exerciseCatalog.map(item => item.id)).size, exerciseCatalog.length);
  assert.equal(searchExercises('lEg PreSS', 'Machine')[0].id, 'leg-press');
  assert.equal(searchExercises('RDL', 'Dumbbell')[0].id, 'dumbbell-rdl');
  assert.equal(searchExercises('PULL-DOWN', 'Cable')[0].id, 'lat-pulldown');
  assert.ok(searchExercises('row', 'Cable').every(exercise => exercise.equipment === 'Cable'));
  assert.deepEqual(searchExercises('leg press', 'Barbell'), []);
});
