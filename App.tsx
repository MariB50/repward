import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { sampleWorkout } from './data/sampleWorkout';

export default function App() {
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  // Keep the exercise details in the plan; state only remembers the selection.
  const selectedExercise = sampleWorkout.exercises.find(
    (exercise) => exercise.id === selectedExerciseId,
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.brand}>repward</Text>
          <Text style={styles.eyebrow}>
            {workoutStarted ? 'WORKOUT STARTED' : 'SAMPLE WORKOUT'}
          </Text>
          <Text style={styles.title}>{sampleWorkout.name}</Text>
          <Text style={styles.description}>
            {workoutStarted
              ? 'Choose an exercise. You can follow the order or pick any available machine.'
              : `${sampleWorkout.exercises.length} exercises, ready when you are.`}
          </Text>

          {!workoutStarted && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setWorkoutStarted(true)}
              style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}
            >
              <Text style={styles.startButtonText}>Start Workout</Text>
            </Pressable>
          )}

          <Text style={styles.sectionTitle}>
            {workoutStarted ? 'Choose your exercise' : 'Your exercises'}
          </Text>
          {sampleWorkout.exercises.map((exercise, index) => {
            const isSelected = exercise.id === selectedExerciseId;

            return (
              <Pressable
                key={exercise.id}
                accessibilityRole="button"
                accessibilityLabel={`${exercise.name}, ${exercise.plannedSets} planned sets`}
                accessibilityState={{ disabled: !workoutStarted, selected: isSelected }}
                disabled={!workoutStarted}
                onPress={() => setSelectedExerciseId(exercise.id)}
                style={({ pressed }) => [
                  styles.exercise,
                  isSelected && styles.selectedExercise,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.exerciseNumber}>{index + 1}</Text>
                <View style={styles.exerciseDetails}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseMeta}>{exercise.plannedSets} planned sets</Text>
                </View>
                {isSelected && <Text style={styles.selectedLabel}>Selected</Text>}
              </Pressable>
            );
          })}

          {workoutStarted && (
            <View style={styles.selection} accessibilityLiveRegion="polite">
              <Text style={styles.selectionLabel}>CURRENT EXERCISE</Text>
              <Text style={styles.selectionTitle}>
                {selectedExercise ? selectedExercise.name : 'Choose an exercise above'}
              </Text>
              {selectedExercise && (
                <Text style={styles.description}>
                  {selectedExercise.plannedSets} sets planned for this exercise.
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F8F3' },
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
});
