import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import type { WorkoutPlan } from '../data/sampleWorkout';
import { Button, c, Icon, Label, Link, s } from './kit';

export function RoutineEditor({
  plan,
  knownIds,
  locked,
  onSave,
  onCancel,
}: {
  plan: WorkoutPlan;
  knownIds: Map<string, string>;
  locked: boolean;
  onSave: (p: WorkoutPlan) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(plan.name);
  const [rows, setRows] = useState(
    plan.exercises.map((e) => ({ key: e.id, name: e.name, sets: String(e.plannedSets) })),
  );
  const [error, setError] = useState('');
  function save() {
    const names = rows.map((row) => row.name.trim().toLowerCase());
    if (!name.trim() || !rows.length || names.includes('')) {
      setError('Name your routine and each exercise.');
      return;
    }
    if (new Set(names).size !== rows.length) {
      setError('Give each exercise a different name.');
      return;
    }
    if (rows.some((row) => !/^\d+$/.test(row.sets) || Number(row.sets) < 1 || Number(row.sets) > 99)) {
      setError('Enter 1 to 99 sets per exercise.');
      return;
    }
    onSave({
      ...plan,
      name: name.trim(),
      exercises: rows.map((row, i) => ({
        id: knownIds.get(names[i]) ?? randomUUID(),
        name: row.name.trim(),
        plannedSets: Number(row.sets),
      })),
    });
  }
  return (
    <View style={[s.card, { gap: 18 }]}>
      <Label>ROUTINE NAME</Label>
      <TextInput
        accessibilityLabel="Routine name"
        editable={!locked}
        value={name}
        onChangeText={setName}
        style={s.input}
        maxLength={64}
      />
      <View style={s.divider} />
      <Label>EXERCISES</Label>
      {rows.map((row, i) => (
        <View key={row.key} style={[s.row, { alignItems: 'flex-end', gap: 8 }]}>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={s.body}>Exercise {i + 1}</Text>
            <TextInput
              maxLength={64}
              editable={!locked}
              accessibilityLabel={'Exercise ' + (i + 1) + ' name'}
              value={row.name}
              placeholder="Exercise name"
              placeholderTextColor={c.mute}
              onChangeText={(v) => setRows(rows.map((r) => (r.key === row.key ? { ...r, name: v } : r)))}
              style={s.input}
            />
          </View>
          <View style={{ width: 60, gap: 5 }}>
            <Text style={s.body}>Sets</Text>
            <TextInput
              accessibilityLabel={'Exercise ' + (i + 1) + ' sets'}
              editable={!locked}
              keyboardType="number-pad"
              value={row.sets}
              maxLength={2}
              onChangeText={(v) => setRows(rows.map((r) => (r.key === row.key ? { ...r, sets: v } : r)))}
              style={s.input}
            />
          </View>
          <Pressable
            disabled={locked}
            accessibilityRole="button"
            accessibilityLabel={'Remove exercise ' + (i + 1)}
            onPress={() => setRows(rows.filter((r) => r.key !== row.key))}
            style={{ height: 48, width: 38, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="close" color={c.mute} />
          </Pressable>
        </View>
      ))}
      <Link
        icon="plus"
        disabled={locked}
        onPress={() => setRows([...rows, { key: randomUUID(), name: '', sets: '3' }])}
      >
        Add exercise
      </Link>
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      <View style={s.row}>
        <Button disabled={locked} onPress={save}>
          Save routine
        </Button>
        <Link disabled={locked} onPress={onCancel}>
          Cancel
        </Link>
      </View>
    </View>
  );
}
