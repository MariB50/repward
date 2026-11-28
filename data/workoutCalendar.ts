import type { SessionSnapshot } from './workoutStorage';

type CalendarWorkout = { id: string; name: string; sets: number };

export function workoutsByDay(sessions: SessionSnapshot[]) {
  const days = new Map<string, CalendarWorkout[]>();
  for (const session of sessions) {
    const sets = session.exercises.reduce(
      (total, exercise) => total + exercise.sets.filter((set) => set !== null).length,
      0,
    );
    if (!sets) continue;

    const started = Date.parse(session.startedAt ?? '');
    const timestamp = Number.isFinite(started) ? started : Date.parse(session.endedAt ?? '');
    if (!Number.isFinite(timestamp)) continue;

    const day = new Date(timestamp).toDateString();
    const workout = { id: session.id, name: session.name, sets };
    const workouts = days.get(day);
    if (workouts) workouts.push(workout);
    else days.set(day, [workout]);
  }
  return days;
}

export function calendarWeeks(month: Date) {
  const year = month.getFullYear();
  const index = month.getMonth();
  const first = new Date(year, index, 1);
  const offset = (first.getDay() + 6) % 7;
  const lastDay = new Date(year, index + 1, 0).getDate();

  return Array.from({ length: Math.ceil((offset + lastDay) / 7) }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const day = week * 7 + weekday - offset + 1;
      return day < 1 || day > lastDay ? null : new Date(year, index, day);
    }),
  );
}
