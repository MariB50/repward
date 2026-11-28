import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { SessionSnapshot } from '../data/workoutStorage';
import { ExerciseProgress } from './ExerciseProgress';
import { WorkoutCalendar } from './WorkoutCalendar';
import { c, Icon, s } from './kit';

const views = [
  { label: 'Exercises', icon: 'chart' },
  { label: 'Calendar', icon: 'calendar' },
] as const;

export function ProgressScreen({ history, active, onTrain }: {
  history: SessionSnapshot[];
  active: SessionSnapshot | null;
  onTrain: () => void;
}) {
  const [view, setView] = useState<(typeof views)[number]['label']>('Exercises');
  const [exerciseId, setExerciseId] = useState<string>();

  return (
    <View style={{ width: '100%', maxWidth: 760, gap: 14 }}>
      <View accessibilityRole="tablist" style={[s.row, { gap: 6 }]}>
        {views.map(({ label, icon }) => {
          const selected = label === view;
          return (
            <Pressable
              key={label}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setView(label)}
              style={({ pressed }) => [s.row, {
                gap: 6,
                minHeight: 44,
                paddingHorizontal: 14,
                borderWidth: 1,
                borderColor: selected ? c.pale : c.faint,
                borderRadius: 10,
                backgroundColor: selected ? c.pale : c.white,
                opacity: pressed ? 0.65 : 1,
              }]}
            >
              <Icon name={icon} size={16} color={selected ? c.blue : c.mute} />
              <Text style={{ color: selected ? c.blue : c.mute, fontWeight: '700' }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      {view === 'Exercises' ? (
        <ExerciseProgress history={history} selectedId={exerciseId} onSelect={setExerciseId} onTrain={onTrain} />
      ) : (
        <WorkoutCalendar history={history} active={active} />
      )}
    </View>
  );
}
