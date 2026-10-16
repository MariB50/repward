import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { sampleWorkout } from './data/sampleWorkout';
import {
  completedSetCount,
  createWorkoutExercises,
  parseSetRecord,
  recordSet,
} from './data/workoutSession';

export default function App() {
  const scrollView = useRef<ScrollView>(null);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [exercises, setExercises] = useState(() => createWorkoutExercises(sampleWorkout));
  const [weightInput, setWeightInput] = useState('');
  const [repsInput, setRepsInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  const selectedExercise = exercises.find(
    (exercise) => exercise.id === selectedExerciseId,
  );
  const allExercisesComplete = exercises.every(
    (exercise) => completedSetCount(exercise) === exercise.plannedSets,
  );

  function clearInputs() {
    setWeightInput('');
    setRepsInput('');
    setInputError(null);
  }

  function startWorkout() {
    setExercises(createWorkoutExercises(sampleWorkout));
    setSelectedExerciseId(null);
    clearInputs();
    setWorkoutStarted(true);
  }

  function selectExercise(exerciseId: string) {
    setSelectedExerciseId(exerciseId);
    clearInputs();
  }

  function saveSet() {
    if (!selectedExercise || completedSetCount(selectedExercise) === selectedExercise.plannedSets) {
      return;
    }

    const record = parseSetRecord(weightInput, repsInput);
    if (!record) {
      setInputError('Enter a weight of 0 or more and a whole-number rep count of 0 or more.');
      return;
    }

    setExercises((current) => recordSet(current, selectedExercise.id, record));
    clearInputs();

    if (completedSetCount(selectedExercise) + 1 === selectedExercise.plannedSets) {
      setSelectedExerciseId(null);
      scrollView.current?.scrollTo({ y: 0, animated: true });
    }
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView style={styles.keyboardArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView ref={scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.brand}>repward</Text>
            <Text style={styles.eyebrow}>
              {workoutStarted ? 'WORKOUT STARTED' : 'SAMPLE WORKOUT'}
            </Text>
            <Text style={styles.title}>{sampleWorkout.name}</Text>
            <Text style={styles.description}>
              {workoutStarted
                ? allExercisesComplete
                  ? 'All planned sets are recorded. Select an exercise to review your sets.'
                  : 'Choose an exercise. You can follow the order or pick any available machine.'
                : `${sampleWorkout.exercises.length} exercises, ready when you are.`}
            </Text>

            {!workoutStarted && (
              <Pressable
                accessibilityRole="button"
                onPress={startWorkout}
                style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}
              >
                <Text style={styles.startButtonText}>Start Workout</Text>
              </Pressable>
            )}

            <Text style={styles.sectionTitle}>
              {workoutStarted ? 'Choose your exercise' : 'Your exercises'}
            </Text>
            {exercises.map((exercise, index) => {
              const isSelected = exercise.id === selectedExerciseId;
              const savedSets = completedSetCount(exercise);
              const isComplete = savedSets === exercise.plannedSets;

              return (
                <Pressable
                  key={exercise.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${exercise.name}, ${savedSets} of ${exercise.plannedSets} sets completed${isComplete ? ', Complete' : ''}`}
                  accessibilityState={{ disabled: !workoutStarted, selected: isSelected }}
                  disabled={!workoutStarted}
                  onPress={() => selectExercise(exercise.id)}
                  style={({ pressed }) => [
                    styles.exercise,
                    isSelected && styles.selectedExercise,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.exerciseNumber}>{index + 1}</Text>
                  <View style={styles.exerciseDetails}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseMeta}>
                      {workoutStarted
                        ? `${savedSets} of ${exercise.plannedSets} sets completed`
                        : `${exercise.plannedSets} planned sets`}
                    </Text>
                  </View>
                  {isComplete && <Text style={styles.selectedLabel}>Complete</Text>}
                  {isSelected && !isComplete && <Text style={styles.selectedLabel}>Selected</Text>}
                </Pressable>
              );
            })}

            {workoutStarted && (
              <View style={styles.selection} accessibilityLiveRegion="polite">
                <Text style={styles.selectionLabel}>CURRENT EXERCISE</Text>
                <Text style={styles.selectionTitle}>
                  {selectedExercise
                    ? selectedExercise.name
                    : allExercisesComplete ? 'All exercises complete' : 'Choose an exercise above'}
                </Text>
                {selectedExercise && (
                  <View>
                    <Text style={styles.description}>
                      {completedSetCount(selectedExercise)} of {selectedExercise.plannedSets} sets completed
                    </Text>
                    {selectedExercise.sets.map((set, index) => (
                      <Text key={index} style={styles.recordedSet}>
                        Set {index + 1}: {set === null ? 'Not recorded' : `${set.weight} lb × ${set.reps} reps`}
                      </Text>
                    ))}
                    {completedSetCount(selectedExercise) < selectedExercise.plannedSets ? (
                      <View style={styles.entryForm}>
                        <Text style={styles.inputLabel}>Weight (lb)</Text>
                        <TextInput
                          accessibilityLabel="Weight in pounds"
                          style={styles.input}
                          keyboardType="decimal-pad"
                          value={weightInput}
                          onChangeText={setWeightInput}
                          placeholder="e.g. 50"
                          placeholderTextColor="#65756A"
                        />
                        <Text style={styles.inputLabel}>Reps</Text>
                        <TextInput
                          accessibilityLabel="Reps"
                          style={styles.input}
                          keyboardType="number-pad"
                          value={repsInput}
                          onChangeText={setRepsInput}
                          placeholder="e.g. 10"
                          placeholderTextColor="#65756A"
                        />
                        {inputError && (
                          <Text style={styles.inputError} accessibilityRole="alert">{inputError}</Text>
                        )}
                        <Pressable
                          accessibilityRole="button"
                          onPress={saveSet}
                          style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}
                        >
                          <Text style={styles.startButtonText}>Save Set</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Text style={styles.recordedSet}>Exercise complete.</Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F8F3' },
  keyboardArea: { flex: 1 },
  content: { padding: 24, paddingBottom: 48, width: '100%', maxWidth: 520, alignSelf: 'center' },
  brand: { fontSize: 22, fontWeight: '800', color: '#254937', marginBottom: 40 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, color: '#536454', marginBottom: 8 },
  title: { fontSize: 36, fontWeight: '700', color: '#18291E', marginBottom: 12 },
  description: { fontSize: 16, lineHeight: 24, color: '#536454' },
  startButton: {
    backgroundColor: '#254937',
    borderRadius: 16,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  startButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  pressed: { opacity: 0.75 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#18291E', marginTop: 32, marginBottom: 16 },
  exercise: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 88,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E1E5DC',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  selectedExercise: { borderColor: '#254937', backgroundColor: '#EEF4EB' },
  exerciseNumber: { color: '#536454', fontSize: 16, fontWeight: '700', marginRight: 16 },
  exerciseDetails: { flex: 1 },
  exerciseName: { fontSize: 18, fontWeight: '600', color: '#18291E' },
  exerciseMeta: { fontSize: 14, color: '#536454', marginTop: 6 },
  selectedLabel: { fontSize: 13, fontWeight: '700', color: '#254937', marginLeft: 12 },
  selection: { borderTopWidth: 1, borderTopColor: '#DCE2D7', marginTop: 20, paddingTop: 24 },
  selectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, color: '#536454' },
  selectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#18291E',
    marginTop: 10,
    marginBottom: 8,
  },
  recordedSet: { fontSize: 16, color: '#18291E', marginTop: 12 },
  entryForm: { marginTop: 20 },
  inputLabel: { fontSize: 16, fontWeight: '600', color: '#18291E', marginBottom: 8 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#65756A',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#18291E',
    backgroundColor: '#FFFFFF',
    fontSize: 18,
    marginBottom: 16,
  },
  inputError: { fontSize: 14, color: '#9C2727' },
});
