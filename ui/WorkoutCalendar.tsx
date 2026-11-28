import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { calendarWeeks, workoutsByDay } from '../data/workoutCalendar';
import type { SessionSnapshot } from '../data/workoutStorage';
import { c, Icon, s } from './kit';

const months = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const dates = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
const weekdays = Array.from({ length: 7 }, (_, day) =>
  new Date(2024, 0, day + 1).toLocaleDateString(undefined, { weekday: 'short' }),
);

export function WorkoutCalendar({ history, active }: {
  history: SessionSnapshot[];
  active: SessionSnapshot | null;
}) {
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date>();
  const days = useMemo(() => workoutsByDay(active ? [active, ...history] : history), [history, active]);
  const currentMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();
  const weeks = calendarWeeks(month);
  const gymDays = weeks.flat().filter((date) => date && days.has(date.toDateString())).length;
  const todayKey = today.toDateString();
  const selectedKey = selected?.toDateString();
  const workouts = selectedKey && days.get(selectedKey);

  function moveMonth(offset: number) {
    setSelected(undefined);
    setMonth((previous) => new Date(previous.getFullYear(), previous.getMonth() + offset, 1));
  }

  return (
    <View style={{ gap: 14, maxWidth: 540 }}>
      <View style={[s.card, { padding: 14 }]}>
        <View style={s.between}>
          <MonthButton direction="back" onPress={() => moveMonth(-1)} />
          <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.month}>
            {months.format(month)}
          </Text>
          <MonthButton direction="next" onPress={() => moveMonth(1)} disabled={currentMonth} />
        </View>
        <View style={{ gap: 3 }}>
          <View style={styles.week}>
            {weekdays.map((weekday, i) => (
              <Text key={i} numberOfLines={1} style={styles.weekday}>{weekday}</Text>
            ))}
          </View>
          {weeks.map((week, i) => (
            <View key={i} style={styles.week}>
              {week.map((date, j) => {
                if (!date) return <View key={j} style={{ flex: 1 }} />;
                const key = date.toDateString();
                const visits = days.get(key);
                const isToday = key === todayKey;
                const isSelected = key === selectedKey;
                const label = dates.format(date) + (isToday ? ', today' : '');
                const style = [styles.day, isToday && styles.today];
                if (!visits) {
                  return (
                    <View key={key} style={style}>
                      <Text accessibilityLabel={label} style={styles.dayNumber}>{date.getDate()}</Text>
                    </View>
                  );
                }
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={`${label}, ${visits.length} ${visits.length === 1 ? 'workout' : 'workouts'}`}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setSelected(date)}
                    style={({ pressed }) => [
                      ...style,
                      { backgroundColor: isSelected ? c.blue : c.pale, opacity: pressed ? 0.65 : 1 },
                    ]}
                  >
                    <Text style={[styles.dayNumber, { fontWeight: '800', color: isSelected ? c.white : c.blue }]}>
                      {date.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        <View style={s.divider} />
        <View style={[s.between, { flexWrap: 'wrap' }]}>
          <Text style={styles.caption} accessibilityLiveRegion="polite">
            {gymDays ? `${gymDays} ${gymDays === 1 ? 'gym day' : 'gym days'} this month` : 'No gym days logged this month'}
          </Text>
          <View style={[s.row, { gap: 6 }]}>
            <View style={{ backgroundColor: c.pale, width: 14, height: 14, borderRadius: 4 }} />
            <Text style={styles.caption}>Workout logged</Text>
          </View>
        </View>
      </View>
      {selected && workouts && (
        <View style={s.card}>
          <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={[s.title, { fontSize: 20 }]}>
            {dates.format(selected)}
          </Text>
          {workouts.map((workout) => (
            <View key={workout.id} style={[s.between, { borderTopWidth: 1, borderColor: c.faint, paddingTop: 12 }]}>
              <Text style={{ flex: 1, color: c.ink, fontWeight: '700' }}>{workout.name}</Text>
              <Text style={s.body}>{workout.sets} {workout.sets === 1 ? 'set' : 'sets'} logged</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function MonthButton({ direction, onPress, disabled }: {
  direction: 'back' | 'next';
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={direction === 'back' ? 'Previous month' : 'Next month'}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [s.tile, {
        width: 44,
        height: 44,
        backgroundColor: disabled ? c.bg : c.pale,
        opacity: pressed ? 0.65 : 1,
      }]}
    >
      <Icon name={direction} size={18} color={disabled ? c.mute : c.blue} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  month: { ...s.title, textAlign: 'center', fontSize: 19, flex: 1 },
  week: { flexDirection: 'row', gap: 3 },
  weekday: { flex: 1, textAlign: 'center', color: c.mute, fontSize: 12, fontWeight: '700', paddingVertical: 5 },
  day: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  dayNumber: { fontSize: 14, fontVariant: ['tabular-nums'], color: c.ink },
  today: { borderWidth: 1, borderColor: c.blue },
  caption: { color: c.mute, fontSize: 13 },
});
