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

test('overload comparisons use the newest logged matching slot from a finished session', () => {
  const { previousSet, changeFrom } = require('../data/progress.ts');
  const history = [
    { endedAt: null, exercises: [{ id: 'row', sets: [{ weight: 100, reps: 8 }] }] },
    { endedAt: 'recent', exercises: [{ id: 'row', sets: [{ weight: 65, reps: 8 }, null] }] },
    { endedAt: 'older', exercises: [{ id: 'row', sets: [{ weight: 60, reps: 8 }, { weight: 62.5, reps: 6 }] }] },
  ];
  assert.deepEqual(previousSet(history, 'row', 0), { weight: 65, reps: 8 });
  assert.deepEqual(previousSet(history, 'row', 1), { weight: 62.5, reps: 6 });
  assert.equal(previousSet(history, 'bench', 0), null);
  assert.equal(changeFrom({ weight: 65, reps: 9 }, previousSet(history, 'row', 0)), '+1 rep');
  assert.equal(changeFrom({ weight: 70, reps: 7 }, previousSet(history, 'row', 0)), '+5 lb · -1 rep');
  assert.equal(changeFrom({ weight: 65, reps: 8 }, previousSet(history, 'row', 0)), 'Matched');
});

test('set entry starts from the saved slot, latest exercise result, or zero', () => {
  const { setEntryDefaults } = require('../data/progress.ts');
  const [exercise, other] = createWorkoutExercises(sampleWorkout);
  const earlier = { weight: 55, reps: 10 };
  const recent = { weight: 57.25, reps: 8 };
  const history = [
    { exercises: [{ ...other, sets: [{ weight: 100, reps: 5 }] }, { ...exercise }] },
    { exercises: [{ ...exercise, sets: [earlier, recent, null] }] },
    { exercises: [{ ...exercise, sets: [{ weight: 50, reps: 12 }] }] },
  ];

  assert.deepEqual(setEntryDefaults(exercise, 0, history), {
    initial: recent, reference: recent, referenceLabel: 'last time',
  });
  assert.deepEqual(setEntryDefaults(exercise, 0, [history[0]]).initial, { weight: 0, reps: 0 });

  const logged = { weight: 0, reps: 0 };
  const inProgress = { ...exercise, sets: [logged, null] };
  assert.deepEqual(setEntryDefaults(inProgress, 1, history), {
    initial: logged, reference: logged, referenceLabel: 'previous set',
  });
  assert.deepEqual(setEntryDefaults({ ...exercise, sets: [earlier, recent] }, 0, history).initial, earlier);
});

test('workout duration formats elapsed time when both timestamps are usable', () => {
  const { sessionDurationText } = require('../data/progress.ts');
  const start = '2026-11-22T23:45:00.000Z';
  for (const [endedAt, expected] of [
    ['2026-11-23T00:47:03.999Z', '1h 2m 3s'],
    ['2026-11-22T23:50:04.000Z', '5m 4s'],
    ['2026-11-22T23:45:42.000Z', '42s'],
    [start, '0s'],
    ['2026-11-22T23:44:59.000Z', null],
    ['invalid', null],
    [null, null],
  ]) {
    assert.equal(sessionDurationText({ startedAt: start, endedAt }), expected);
  }
  assert.equal(sessionDurationText({ startedAt: null, endedAt: start }), null);
});
