import { Text, View } from 'react-native';
import { catalogExerciseFor } from '../data/exerciseCatalog';
import type { WorkoutPlan } from '../data/sampleWorkout';
import { ExercisePhoto } from './ExercisePhoto';
import { Button, c, Label, Link, s } from './kit';

export function WorkoutLibrary({
  plans,
  selectedId,
  inSession,
  locked,
  onSelect,
  onEdit,
}: {
  plans: WorkoutPlan[];
  selectedId: string;
  inSession: boolean;
  locked: boolean;
  onSelect: (id: string) => void;
  onEdit: (plan: WorkoutPlan) => void;
}) {
  return (
    <View style={{ gap: 12, maxWidth: 760 }}>
      {inSession && <Text style={s.body}>Finish your current session to switch workouts.</Text>}
      {plans.map((plan) => {
        const selected = plan.id === selectedId;
        const setCount = plan.exercises.reduce((count, item) => count + item.plannedSets, 0);
        return (
          <View key={plan.id} style={[s.card, selected && { borderColor: c.blue }]}>
            {selected && <Label color={c.blue}>SELECTED</Label>}
            <Text style={s.title}>{plan.name}</Text>
            <Text style={s.body}>
              {plan.exercises.length} {plan.exercises.length === 1 ? 'exercise' : 'exercises'} ·{' '}
              {setCount} {setCount === 1 ? 'set' : 'sets'}
            </Text>
            <View style={[s.row, { flexWrap: 'wrap', gap: 7 }]}>
              {plan.exercises.slice(0, 4).map((exercise) => (
                <ExercisePhoto
                  key={exercise.id}
                  id={catalogExerciseFor(exercise)?.id}
                  width={55}
                  height={45}
                />
              ))}
              {plan.exercises.length > 4 && <Text style={s.body}>+{plan.exercises.length - 4}</Text>}
            </View>
            <View style={[s.row, { flexWrap: 'wrap', gap: 14 }]}>
              <Button
                secondary={!selected}
                label={
                  selected ? (inSession ? 'Resume workout' : 'View ' + plan.name) : 'Use ' + plan.name
                }
                disabled={locked || (inSession && !selected)}
                onPress={() => onSelect(plan.id)}
              >
                {selected ? (inSession ? 'Resume workout' : 'View workout') : 'Use workout'}
              </Button>
              <Link icon="edit" disabled={locked} onPress={() => onEdit(plan)}>
                Edit workout
              </Link>
            </View>
          </View>
        );
      })}
    </View>
  );
}
