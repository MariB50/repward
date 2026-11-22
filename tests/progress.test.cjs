const test = require('node:test');
const assert = require('node:assert/strict');
const { exerciseProgress, parseRepRange, setEntryDefaults, suggestedWeight } = require('../data/progress.ts');

const workout = { name: 'Push day', planId: 'push', repRange: { min: 8, max: 12 } };
const set = (weight, reps) => ({ weight, reps });
const exercise = (sets) => ({ id: 'bench', plannedSets: sets.length, name: 'Bench press', sets });
const session = (sets, overrides) => ({
  ...workout,
  endedAt: '2026-11-22T10:00:00.000Z',
  exercises: [exercise(sets)],
  ...overrides,
});

test('an optional rep range requires two ordered positive whole numbers', () => {
  assert.equal(parseRepRange(' ', ''), undefined);
  assert.deepEqual(parseRepRange(' 8 ', '12'), workout.repRange);
  assert.deepEqual(parseRepRange('8', '8'), { min: 8, max: 8 });
  for (const [min, max] of [['8', ''], ['0', '12'], ['12', '8'], ['8', '12.5'], ['1', '9007199254740992']]) {
    assert.equal(parseRepRange(min, max), null);
  }
});

test('greater rep overshoots earn larger suggestions, scaled to the actual load', () => {
  const { repRange } = workout;
  assert.equal(suggestedWeight(set(100, 12), repRange), null);
  assert.equal(suggestedWeight(set(100, 13), repRange), 105);
  assert.equal(suggestedWeight(set(100, 17), repRange), 110);
  assert.equal(suggestedWeight(set(100, 30), repRange), 110);
  assert.equal(suggestedWeight(set(20, 13), repRange), 20.5);
  assert.equal(suggestedWeight(set(20, 17), repRange), 22);
  assert.equal(suggestedWeight(set(0, 17), repRange), null);
  assert.equal(suggestedWeight(set(80, 17), repRange, 100), null);
});

test('the next workout opens with the increase earned by the final logged set', () => {
  const history = [session([set(80, 10), set(100, 17), null])];
  assert.deepEqual(setEntryDefaults(exercise([null, null, null]), 0, history, workout), {
    initial: set(110, 17),
    reference: set(100, 17),
    referenceLabel: 'last time',
    goal: set(110, null),
  });
});

test('later sets show and build on the previous set of the current workout', () => {
  const history = [session([set(100, 9), set(100, 11), set(100, 12)])];
  const current = exercise([set(105, 7), set(100, 9), null]);
  assert.deepEqual(setEntryDefaults(current, 2, history, workout), {
    initial: set(100, 9),
    reference: set(100, 9),
    referenceLabel: 'previous set',
    goal: set(100, 10),
  });
  const logged = exercise([set(105, 7), set(100, 9), set(100, 10)]);
  assert.deepEqual(setEntryDefaults(logged, 2, history, workout), {
    initial: set(100, 10),
    reference: set(100, 9),
    referenceLabel: 'previous set',
    goal: null,
  });
});

test('a next-set weight change keeps the logged reps prefilled and suggests only a weight', () => {
  const open = exercise([set(100, 17), null, null]);
  assert.deepEqual(setEntryDefaults(open, 1, [], workout), {
    initial: set(110, 17),
    reference: set(100, 17),
    referenceLabel: 'previous set',
    goal: set(110, null),
  });

  const following = exercise([set(100, 17), set(110, 6), null]);
  assert.deepEqual(setEntryDefaults(following, 2, [], workout), {
    initial: set(105, 6),
    reference: set(110, 6),
    referenceLabel: 'previous set',
    goal: set(105, null),
  });
  assert.deepEqual(setEntryDefaults(following, 1, [], workout).initial, set(110, 6));
});

test('next-set adjustments respect the range boundaries and available weight', () => {
  for (const recorded of [set(100, 8), set(100, 12)]) {
    const next = setEntryDefaults(exercise([recorded, null]), 1, [], workout);
    assert.deepEqual(next.initial, recorded);
    assert.deepEqual(next.goal, set(recorded.weight, recorded.reps + 1));
  }
  const bodyweight = setEntryDefaults(exercise([set(0, 6), null]), 1, [], workout);
  assert.deepEqual(bodyweight.initial, set(0, 6));
  assert.equal(bodyweight.goal, null);

  const missed = setEntryDefaults(exercise([set(100, 0), null]), 1, [], workout);
  assert.deepEqual(missed.initial, set(90, 0));
  assert.deepEqual(missed.goal, set(90, null));
});

test('the first set uses the final set in the last completed workout of the same routine', () => {
  const history = [
    session([set(150, 10), set(150, 10)], { planId: 'another-push' }),
    session([set(120, 10), set(120, 10)], { endedAt: null }),
    session([set(100, 17), set(90, 9)], { name: 'Old workout name' }),
  ];
  assert.deepEqual(setEntryDefaults(exercise([null]), 0, history, workout), {
    initial: set(90, 9),
    reference: set(90, 9),
    referenceLabel: 'last time',
    goal: set(90, 10),
  });
});

test('a lighter load can carry through the current workout and expires before the next', () => {
  const usual = session([set(95, 10), set(100, 13)]);
  const missed = setEntryDefaults(exercise([set(105, 6), null]), 1, [usual], workout);
  assert.deepEqual(missed.initial, set(100, 6));
  assert.deepEqual(missed.goal, set(100, null));

  const open = exercise([set(90, 9), null]);
  assert.deepEqual(setEntryDefaults(open, 1, [usual], workout).initial, set(90, 9));
  assert.deepEqual(setEntryDefaults(open, 0, [usual], workout).initial, set(90, 9));

  const lighter = session([set(90, 9), set(90, 11)]);
  const first = setEntryDefaults(exercise([null, null]), 0, [lighter, usual], workout);
  assert.deepEqual(first.reference, set(90, 11));
  assert.deepEqual(first.initial, set(105, 11));
  assert.deepEqual(first.goal, set(105, null));
  const following = setEntryDefaults(exercise([set(105, 10), null]), 1, [lighter, usual], workout);
  assert.deepEqual(following.reference, set(105, 10));
  assert.deepEqual(following.initial, set(105, 10));
  assert.deepEqual(following.goal, set(105, 11));
});

test('more reps at the usual weight can raise an outstanding suggestion', () => {
  const history = [
    session([set(100, 17)]),
    session([set(100, 13)]),
    session([set(100, 10)], { planId: undefined, repRange: undefined }),
    session([set(200, 10)], { planId: undefined, repRange: undefined }),
  ];
  assert.deepEqual(exerciseProgress(workout, 'bench', history), {
    reference: set(100, 17),
    target: set(110, null),
    workingWeight: 100,
  });
});
