const test = require('node:test');
const assert = require('node:assert/strict');
const { sampleWorkout } = require('../data/sampleWorkout.ts');
const {
  completedSetCount,
  createWorkoutExercises,
  parseSetRecord,
  recordSet,
} = require('../data/workoutSession.ts');

test('new workouts have independent empty slots and do not change the plan', () => {
  const originalPlan = structuredClone(sampleWorkout);
  const first = createWorkoutExercises(sampleWorkout);
  const second = createWorkoutExercises(sampleWorkout);

  for (const exercise of first) {
    assert.equal(exercise.sets.length, exercise.plannedSets);
    assert.ok(exercise.sets.every((set) => set === null));
    assert.equal(completedSetCount(exercise), 0);
  }

  first[0].sets[0] = { weight: 50, reps: 10 };
  assert.equal(second[0].sets[0], null);
  assert.equal(first[1].sets[0], null);
  assert.deepEqual(sampleWorkout, originalPlan);
});

test('interleaved exercise saves preserve earlier sets and previous state', () => {
  const initial = createWorkoutExercises(sampleWorkout);
  const [benchId, rowId] = initial.map((exercise) => exercise.id);
  const record = { weight: 50, reps: 10 };
  const afterBench = recordSet(initial, benchId, record);
  const afterRow = recordSet(afterBench, rowId, { weight: 40, reps: 8 });
  const afterSecondBench = recordSet(afterRow, benchId, { weight: 50, reps: 9 });

  assert.deepEqual(afterSecondBench[0].sets, [
    { weight: 50, reps: 10 },
    { weight: 50, reps: 9 },
  ]);
  assert.deepEqual(afterSecondBench[1].sets, [{ weight: 40, reps: 8 }, null]);
  assert.deepEqual(initial[0].sets, [null, null]);
  assert.deepEqual(afterBench[0].sets, [{ weight: 50, reps: 10 }, null]);
  assert.equal(completedSetCount(afterSecondBench[0]), 2);
  assert.equal(completedSetCount(afterSecondBench[1]), 1);
  record.reps = 99;
  assert.equal(afterBench[0].sets[0].reps, 10);
});

test('zero reps count as saved and a completed exercise cannot get extra sets', () => {
  const initial = createWorkoutExercises(sampleWorkout);
  const exerciseId = initial[0].id;
  const first = recordSet(initial, exerciseId, { weight: 0, reps: 0 });
  assert.equal(completedSetCount(first[0]), 1);
  const completed = recordSet(first, exerciseId, { weight: 12.5, reps: 8 });
  const extraSave = recordSet(completed, exerciseId, { weight: 100, reps: 20 });

  assert.deepEqual(extraSave, completed);
  assert.equal(extraSave[0].sets.length, initial[0].plannedSets);
  assert.deepEqual(recordSet(completed, 'unknown-exercise', { weight: 1, reps: 1 }), completed);
});

test('input validation accepts decimal weights and zero without treating blanks as zero', () => {
  assert.deepEqual(parseSetRecord(' 12.5 ', ' 10 '), { weight: 12.5, reps: 10 });
  assert.deepEqual(parseSetRecord('.5', '0'), { weight: 0.5, reps: 0 });
  assert.deepEqual(parseSetRecord('0', '0'), { weight: 0, reps: 0 });

  for (const [weight, reps] of [
    ['', '10'], ['50', ''], [' ', '0'], ['-1', '10'], ['50', '-1'],
    ['50', '1.5'], ['NaN', '10'], ['Infinity', '10'], ['50lb', '10'],
    ['0x10', '10'], ['50', '9007199254740992'], ['9'.repeat(400), '10'],
  ]) {
    assert.equal(parseSetRecord(weight, reps), null, `Reject ${weight}/${reps}`);
  }
});
