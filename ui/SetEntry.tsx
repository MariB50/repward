import { useMemo, useState } from 'react';
import { Keyboard, Text, TextInput, View } from 'react-native';
import { parseSetRecord, type SetRecord, type WorkoutExercise } from '../data/workoutSession';
import type { SessionSnapshot } from '../data/workoutStorage';
import { changeFrom, repRangeText, setEntryDefaults } from '../data/progress';
import { Button, c, Label, Link, s } from './kit';
import { NumberWheel } from './NumberWheel';

export function SetEntry({
  exercise,
  index,
  session,
  history,
  locked,
  busy,
  retry,
  onSave,
  onCancel,
  onSkip,
}: {
  exercise: WorkoutExercise;
  index: number;
  session: SessionSnapshot;
  history: SessionSnapshot[];
  locked: boolean;
  busy: boolean;
  retry: boolean;
  onSave: (record: SetRecord | null) => Promise<boolean>;
  onCancel?: () => void;
  onSkip?: () => void;
}) {
  const { initial, reference, referenceLabel, goal } = useMemo(
    () => setEntryDefaults(exercise, index, history, session),
    [exercise, index, history, session],
  );
  const [draft, setDraft] = useState(initial);
  const [typed, setTyped] = useState<{ weight: string; reps: string } | null>(null);
  const [error, setError] = useState('');
  const input = typed ? parseSetRecord(typed.weight, typed.reps) : draft;

  function toggleEntry() {
    setError('');
    if (typed) {
      if (input) setDraft(input);
      setTyped(null);
      Keyboard.dismiss();
    } else {
      setTyped({
        weight: draft.weight.toLocaleString('en-US', { useGrouping: false, maximumSignificantDigits: 17 }),
        reps: String(draft.reps),
      });
    }
  }

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
        <Text style={[s.body, { fontSize: 13 }]}>
          {referenceLabel === 'last time' ? 'Last time' : 'Previous set'} · {reference.weight} lb × {reference.reps} reps
        </Text>
      )}
      {goal && !onCancel && (
        <Text accessibilityLiveRegion="polite" style={[s.body, { color: c.blue, fontSize: 14 }]}>
          {goal.reps === null
            ? 'Try ' + goal.weight + ' lb'
            : 'Aim for ' + goal.reps + (goal.reps === 1 ? ' rep' : ' reps')
              + (goal.weight > 0 ? ' at ' + goal.weight + ' lb' : '')}
        </Text>
      )}
      <View style={s.row}>
        <View style={{ flex: 1, gap: 7 }}>
          <Label>WEIGHT (LB)</Label>
          {typed ? (
            <TextInput
              selectTextOnFocus
              editable={!locked}
              accessibilityLabel="Weight in pounds"
              keyboardType="decimal-pad"
              style={s.input}
              value={typed.weight}
              onChangeText={(weight) => setTyped({ ...typed, weight })}
            />
          ) : (
            <NumberWheel
              label="Weight in pounds"
              value={draft.weight}
              step={2.5}
              max={1000}
              disabled={locked}
              onChange={(weight) => setDraft((current) => ({ ...current, weight }))}
            />
          )}
        </View>
        <View style={{ flex: 1, gap: 7 }}>
          <Label>{session.repRange ? 'REPS · ' + repRangeText(session.repRange) : 'REPS'}</Label>
          {typed ? (
            <TextInput
              selectTextOnFocus
              editable={!locked}
              accessibilityLabel="Repetitions"
              keyboardType="number-pad"
              style={s.input}
              value={typed.reps}
              onChangeText={(reps) => setTyped({ ...typed, reps })}
            />
          ) : (
            <NumberWheel
              label="Repetitions"
              value={draft.reps}
              step={1}
              max={100}
              disabled={locked}
              onChange={(reps) => setDraft((current) => ({ ...current, reps }))}
            />
          )}
        </View>
      </View>
      <View style={[s.between, { justifyContent: 'flex-end' }]}>
        {input && reference && (!session.repRange || onCancel) && (
          <Text style={[s.body, { color: c.blue, flex: 1 }]}>
            {changeFrom(input, reference)} vs. {referenceLabel}
          </Text>
        )}
        <Link disabled={locked} onPress={toggleEntry}>
          {typed ? 'Use wheels' : 'Type values'}
        </Link>
      </View>
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
      {onSkip && (
        <Link disabled={locked} onPress={onSkip} icon="arrow">
          Skip exercise for now
        </Link>
      )}
    </View>
  );
}
