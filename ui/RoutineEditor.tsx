import { useState } from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import type { Exercise, WorkoutPlan } from '../data/sampleWorkout';
import { catalogExerciseFor, exerciseNameKey, type CatalogExercise } from '../data/exerciseCatalog';
import { ExercisePhoto } from './ExercisePhoto';
import { ExercisePicker } from './ExercisePicker';
import { ExerciseOrderEditor } from './ExerciseOrderEditor';
import { Button, c, Icon, Label, Link, s } from './kit';

export function RoutineEditor({
  plan,
  knownExercises,
  locked,
  onSave,
  onCancel,
}: {
  plan: WorkoutPlan;
  knownExercises: Exercise[];
  locked: boolean;
  onSave: (p: WorkoutPlan) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(plan.name);
  const [rows, setRows] = useState(
    plan.exercises.map((e) => ({ id: e.id, name: e.name, sets: String(e.plannedSets) })),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [customName, setCustomName] = useState<string | null>(null);
  const [error, setError] = useState('');
  const selectedNames = new Set(rows.map((row) => exerciseNameKey(row.name)));
  const selectedIds = new Set(rows.map((row) => catalogExerciseFor(row)?.id ?? row.id));
  const knownByName = new Map(
    knownExercises.map((exercise) => [exerciseNameKey(exercise.name), exercise.id]),
  );

  function addCatalog(exercise: CatalogExercise) {
    if (selectedIds.has(exercise.id)) return;
    const id = knownByName.get(exerciseNameKey(exercise.name)) ?? exercise.id;
    setRows((current) => [...current, { id, name: exercise.name, sets: '3' }]);
    setError('');
  }

  function addCustom() {
    const trimmed = customName?.trim() ?? '';
    const key = exerciseNameKey(trimmed);
    if (!key) {
      setError('Enter the exercise name.');
      return;
    }
    if (selectedNames.has(key)) {
      setError('This exercise is already in your workout.');
      return;
    }
    const exercise = catalogExerciseFor({ id: '', name: trimmed });
    if (exercise) {
      if (selectedIds.has(exercise.id)) {
        setError('This exercise is already in your workout.');
        return;
      }
      addCatalog(exercise);
    } else {
      const id = knownByName.get(key) ?? randomUUID();
      setRows((current) => [...current, { id, name: trimmed, sets: '3' }]);
    }
    setCustomName(null);
    setError('');
  }

  function save() {
    if (!name.trim() || !rows.length) {
      setError('Name your workout and add at least one exercise.');
      return;
    }
    if (rows.some((row) => !/^\d+$/.test(row.sets) || Number(row.sets) < 1 || Number(row.sets) > 99)) {
      setError('Enter 1 to 99 sets per exercise.');
      return;
    }
    setError('');
    onSave({
      ...plan,
      name: name.trim(),
      exercises: rows.map((row) => ({ id: row.id, name: row.name, plannedSets: Number(row.sets) })),
    });
  }

  return (
    <View style={{ gap: 16 }}>
      <View style={s.card}>
        <Label>WORKOUT NAME</Label>
        <TextInput
          accessibilityLabel="Workout name"
          editable={!locked}
          value={name}
          onChangeText={setName}
          style={s.input}
          maxLength={64}
          placeholder="e.g. Leg day"
          placeholderTextColor={c.mute}
        />
      </View>
      <View style={s.card}>
        <View style={[s.between, { flexWrap: 'wrap', columnGap: 12, rowGap: 0 }]}>
          <Text style={[s.title, { fontSize: 19 }]}>Exercises</Text>
          <View style={[s.row, { gap: 14 }]}>
            {rows.length > 1 && (
              <Link
                icon="grip"
                disabled={locked}
                onPress={() => {
                  Keyboard.dismiss();
                  setReordering(true);
                }}
              >
                Reorder
              </Link>
            )}
            <Link
              icon="plus"
              disabled={locked}
              onPress={() => {
                Keyboard.dismiss();
                setError('');
                setPickerOpen(true);
              }}
            >
              Add exercise
            </Link>
          </View>
        </View>
        {!rows.length && <Text style={s.body}>Search the exercise catalog to build your workout.</Text>}
        {rows.map((row, i) => (
          <View
            key={row.id}
            style={[s.row, { gap: 9, paddingTop: 11, borderTopWidth: 1, borderColor: c.faint }]}
          >
            <ExercisePhoto id={catalogExerciseFor(row)?.id} width={52} height={48} />
            <Text style={{ flex: 1, color: c.ink, fontWeight: '700', fontSize: 14 }}>{row.name}</Text>
            <View style={{ width: 56, gap: 3 }}>
              <Text style={{ color: c.mute, fontSize: 12 }}>Sets</Text>
              <TextInput
                accessibilityLabel={'Sets for ' + row.name}
                editable={!locked}
                keyboardType="number-pad"
                value={row.sets}
                maxLength={2}
                selectTextOnFocus
                onChangeText={(sets) =>
                  setRows((current) => current.map((r, index) => (index === i ? { ...r, sets } : r)))
                }
                style={[s.input, { minHeight: 44, paddingHorizontal: 10 }]}
              />
            </View>
            <Pressable
              disabled={locked}
              accessibilityRole="button"
              accessibilityLabel={'Remove ' + row.name}
              onPress={() => setRows((current) => current.filter((r) => r.id !== row.id))}
              style={{ height: 44, width: 30, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="close" size={16} color={c.mute} />
            </Pressable>
          </View>
        ))}
        {customName === null ? (
          <Link
            disabled={locked}
            onPress={() => {
              setError('');
              setCustomName('');
            }}
          >
            Add a custom exercise
          </Link>
        ) : (
          <View style={{ gap: 8 }}>
            <Label>CUSTOM EXERCISE</Label>
            <TextInput
              accessibilityLabel="Custom exercise name"
              editable={!locked}
              placeholder="Exercise name"
              placeholderTextColor={c.mute}
              style={s.input}
              maxLength={64}
              value={customName}
              onChangeText={setCustomName}
            />
            <View style={s.row}>
              <Button secondary disabled={locked} onPress={addCustom}>
                Add custom exercise
              </Button>
              <Link
                onPress={() => {
                  setCustomName(null);
                  setError('');
                }}
              >
                Cancel
              </Link>
            </View>
          </View>
        )}
      </View>
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      <View style={s.row}>
        <Button icon="check" disabled={locked || customName !== null} onPress={save}>
          Save workout
        </Button>
        <Link disabled={locked} onPress={onCancel}>
          Cancel
        </Link>
      </View>
      {pickerOpen && (
        <ExercisePicker
          selectedIds={selectedIds}
          selectedNames={selectedNames}
          onAdd={addCatalog}
          onCustom={(value) => {
            setPickerOpen(false);
            setCustomName(value);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
      {reordering && (
        <ExerciseOrderEditor
          exercises={rows}
          onDone={(order) => {
            setRows(order);
            setReordering(false);
          }}
          onCancel={() => setReordering(false)}
        />
      )}
    </View>
  );
}
