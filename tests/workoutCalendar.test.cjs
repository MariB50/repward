const test = require('node:test');
const assert = require('node:assert/strict');
const { calendarWeeks, workoutsByDay } = require('../data/workoutCalendar.ts');

const session = (id, startedAt, endedAt, sets) => ({
  id,
  name: 'Upper body',
  startedAt: startedAt?.toISOString() ?? null,
  endedAt: endedAt?.toISOString() ?? null,
  restUntil: null,
  exercises: [{ id: 'bench', name: 'Bench press', plannedSets: sets.length, sets }],
});

test('the calendar groups visits on the local start day, including across midnight and month boundaries', () => {
  const earlier = new Date(2026, 10, 30, 12);
  const beforeMidnight = new Date(2026, 10, 30, 23, 50);
  const afterMidnight = new Date(2026, 11, 1, 0, 15);
  const set = { weight: 100, reps: 8 };
  const days = workoutsByDay([
    session('late-workout', beforeMidnight, afterMidnight, [set, set]),
    session('midday-workout', earlier, earlier, [set]),
  ]);
  assert.equal(days.size, 1);
  assert.deepEqual(days.get(earlier.toDateString()), [
    { id: 'late-workout', name: 'Upper body', sets: 2 },
    { id: 'midday-workout', name: 'Upper body', sets: 1 },
  ]);
});

test('logged sets count during a workout and older logs can use their finish date', () => {
  const activeDay = new Date(2026, 10, 27, 17);
  const oldDay = new Date(2026, 10, 22, 11);
  const emptyDay = new Date(2026, 10, 20, 14);
  const set = { weight: 100, reps: 0 };
  const days = workoutsByDay([
    session('active', activeDay, null, [set, null]),
    session('legacy', null, oldDay, [set]),
    session('empty', emptyDay, emptyDay, [null]),
    session('unknown-day', null, null, [set]),
  ]);
  assert.deepEqual([...days.keys()], [activeDay.toDateString(), oldDay.toDateString()]);
  assert.equal(days.get(activeDay.toDateString())[0].sets, 1);
});

test('the month grid keeps Monday first, spans six rows when needed, and includes leap day', () => {
  const november = calendarWeeks(new Date(2026, 10, 27));
  assert.equal(november.length, 6);
  assert.deepEqual(november[0].map((date) => date?.getDate() ?? null), [null, null, null, null, null, null, 1]);
  assert.deepEqual(november[5].map((date) => date?.getDate() ?? null), [30, null, null, null, null, null, null]);
  const february = calendarWeeks(new Date(2024, 1, 1));
  assert.equal(february[4][3].getDate(), 29);
  assert.equal(february.flat().filter(Boolean).length, 29);
});
