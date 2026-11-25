import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, Text, View } from 'react-native';
import { catalogExerciseFor } from '../data/exerciseCatalog';
import type { WorkoutPlan } from '../data/sampleWorkout';
import { ExercisePhoto } from './ExercisePhoto';
import { Button, c, Link, s } from './kit';

export function WorkoutLibrary({
  plans,
  selectedId,
  inSession,
  locked,
  onSelect,
  onOpen,
  onEdit,
}: {
  plans: WorkoutPlan[];
  selectedId: string;
  inSession: boolean;
  locked: boolean;
  onSelect: (id: string) => void;
  onOpen: () => void;
  onEdit: (plan: WorkoutPlan) => void;
}) {
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let mounted = true;
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    }, () => {});
    return () => {
      mounted = false;
      listener?.remove();
    };
  }, []);

  return (
    <View style={{ gap: 12, maxWidth: 760 }}>
      {inSession && <Text style={s.body}>Finish your current session to switch workouts.</Text>}
      {plans.map((plan) => (
        <WorkoutCard
          key={plan.id}
          plan={plan}
          selected={plan.id === selectedId}
          inSession={inSession}
          locked={locked}
          reduceMotion={reduceMotion}
          onSelect={() => onSelect(plan.id)}
          onOpen={onOpen}
          onEdit={() => onEdit(plan)}
        />
      ))}
    </View>
  );
}

function WorkoutCard({
  plan,
  selected,
  inSession,
  locked,
  reduceMotion,
  onSelect,
  onOpen,
  onEdit,
}: {
  plan: WorkoutPlan;
  selected: boolean;
  inSession: boolean;
  locked: boolean;
  reduceMotion: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const [highlight] = useState(() => new Animated.Value(selected ? 1 : 0));
  const borderColor = useMemo(
    () => highlight.interpolate({ inputRange: [0, 1], outputRange: [c.faint, c.blue] }),
    [highlight],
  );
  useEffect(() => {
    const target = selected ? 1 : 0;
    if (reduceMotion) {
      highlight.setValue(target);
      return;
    }
    const animation = Animated.timing(highlight, {
      toValue: target,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [highlight, reduceMotion, selected]);

  const selectionDisabled = locked || inSession;
  const exerciseCount = plan.exercises.length;
  const setCount = plan.exercises.reduce((count, item) => count + item.plannedSets, 0);
  const selection = selected ? 'Selected workout' : 'Select workout';
  const summary = `${exerciseCount} ${exerciseCount === 1 ? 'exercise' : 'exercises'} · ${setCount} ${setCount === 1 ? 'set' : 'sets'}`;
  return (
    <Animated.View style={[s.card, { padding: 0, gap: 0, borderColor }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${selection}, ${plan.name}, ${summary}`}
        accessibilityState={{ disabled: selectionDisabled }}
        disabled={selectionDisabled}
        onPress={onSelect}
        style={({ pressed }) => ({
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 14,
          gap: 14,
          borderTopLeftRadius: 17,
          borderTopRightRadius: 17,
          backgroundColor: pressed ? c.pale : c.white,
        })}
      >
        <View style={{ gap: 5 }}>
          <View style={s.between}>
            <Text style={[s.title, { flex: 1 }]}>{plan.name}</Text>
            <Animated.Text aria-hidden style={[s.label, { color: c.blue, opacity: highlight }]}>
              SELECTED
            </Animated.Text>
          </View>
          <Text style={s.body}>{summary}</Text>
        </View>
        <View style={[s.row, { flexWrap: 'wrap', gap: 7 }]}>
          {plan.exercises.slice(0, 4).map((exercise) => (
            <ExercisePhoto
              key={exercise.id}
              id={catalogExerciseFor(exercise)?.id}
              width={55}
              height={45}
            />
          ))}
          {exerciseCount > 4 && <Text style={s.body}>+{exerciseCount - 4}</Text>}
        </View>
      </Pressable>
      <View
        style={[
          s.between,
          { flexWrap: 'wrap', gap: 14, paddingHorizontal: 20, paddingBottom: 14, minHeight: 62 },
        ]}
      >
        <Link icon="edit" disabled={locked} onPress={onEdit}>
          Edit workout
        </Link>
        <Animated.View
          aria-hidden={!selected}
          importantForAccessibility={selected ? 'auto' : 'no-hide-descendants'}
          pointerEvents={selected ? 'auto' : 'none'}
          style={{ opacity: highlight }}
        >
          <Button disabled={locked || !selected} onPress={onOpen}>
            {inSession ? 'Resume workout' : 'View workout'}
          </Button>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
