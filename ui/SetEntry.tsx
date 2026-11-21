import { useState } from 'react';
import { Keyboard, Text, TextInput, View } from 'react-native';
import { parseSetRecord, type SetRecord, type WorkoutExercise } from '../data/workoutSession';
import { changeFrom } from '../data/progress';
import { Button, c, Label, Link, s } from './kit';

export function SetEntry({
  exercise,
  index,
  prior,
  locked,
  busy,
  retry,
  onSave,
  onCancel,
}: {
  exercise: WorkoutExercise;
  index: number;
  prior: SetRecord | null;
  locked: boolean;
  busy: boolean;
  retry: boolean;
  onSave: (record: SetRecord | null) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const last = exercise.sets
    .slice(0, index)
    .filter((r): r is SetRecord => r !== null)
    .at(-1);
  const seed = exercise.sets[index] ?? prior ?? last;
  const reference = prior ?? last;
  const [weight, setWeight] = useState(seed ? String(seed.weight) : '');
  const [reps, setReps] = useState(seed ? String(seed.reps) : '');
  const [error, setError] = useState('');
  const input = parseSetRecord(weight, reps);
  async function submit() {
    if (!input && !retry) {
      setError('Enter a weight of zero or more and a whole number of reps.');
      return;
    }
    setError('');
    Keyboard.dismiss();
    await onSave(input);
  }
  return (
    <View style={s.card}>
      <View style={s.between}>
        <Label color={c.blue}>{onCancel ? 'EDIT SET' : 'LOG A SET'}</Label>
        <Text style={s.body}>
          Set {index + 1} of {exercise.plannedSets}
        </Text>
      </View>
      <Text style={s.title}>{exercise.name}</Text>
      {reference && (
        <Text style={s.body}>
          {prior ? 'Last time' : 'Previous set'} · {reference.weight} lb × {reference.reps} reps
        </Text>
      )}
      <View style={s.row}>
        <View style={{ flex: 1, gap: 7 }}>
          <Label>WEIGHT (LB)</Label>
          <TextInput
            selectTextOnFocus
            editable={!locked}
            accessibilityLabel="Weight in pounds"
            keyboardType="decimal-pad"
            style={s.input}
            value={weight}
            onChangeText={setWeight}
            placeholder="0"
            placeholderTextColor="#808B9E"
          />
        </View>
        <View style={{ flex: 1, gap: 7 }}>
          <Label>REPS</Label>
          <TextInput
            selectTextOnFocus
            editable={!locked}
            accessibilityLabel="Repetitions"
            keyboardType="number-pad"
            style={s.input}
            value={reps}
            onChangeText={setReps}
            placeholder="0"
            placeholderTextColor="#808B9E"
          />
        </View>
      </View>
      <View style={s.row}>
        <Button secondary disabled={locked} onPress={() => setWeight(String((Number(weight) || 0) + 5))}>
          +5 lb
        </Button>
        <Button
          secondary
          disabled={locked}
          onPress={() => setReps(String((parseInt(reps, 10) || 0) + 1))}
        >
          +1 rep
        </Button>
      </View>
      {input && reference && (
        <Text style={[s.body, { color: c.blue }]}>
          {changeFrom(input, reference)} vs. {prior ? 'last time' : 'previous set'}
        </Text>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      <Button disabled={busy} icon="check" onPress={submit}>
        {busy ? 'Saving…' : retry ? 'Retry set' : onCancel ? 'Save changes' : 'Log set'}
      </Button>
      {onCancel && (
        <Link disabled={locked} onPress={onCancel}>
          Cancel edit
        </Link>
      )}
    </View>
  );
}
