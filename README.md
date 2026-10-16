# Repward

A small iOS workout app, built one understandable step at a time with Expo,
React Native, and TypeScript.

## This step

Start a sample workout and select either exercise in any order. Enter the weight
in pounds and completed reps, then tap Save Set. Each exercise keeps its own
recorded sets when you switch selection. Progress shows saved versus planned sets;
saving the final planned set marks the exercise Complete and returns to the list.
Completed exercises can be selected again to review their records.

Records live in memory and reset on app reload. Previous-performance snapshots,
the "Last time" display, timers, persistence, and notifications are later steps.

## Run

```powershell
npm install
npm start
```

Use a compatible Expo Go installation on your iPhone to open the project from
the development server. Windows can run the server; it cannot run Apple's iOS
Simulator. Installable iPhone development builds will be a later step.

## Read these files first

- `data/sampleWorkout.ts`: the types and example workout data.
- `data/workoutSession.ts`: set objects, fresh workout arrays, input validation,
  progress counting, and immutable set updates.
- `App.tsx`: the screen, React state, input fields, button handlers, and styling.

`tests/workoutSession.test.cjs` checks the state transitions and input edge cases.

The remaining setup files have supporting roles:

- `index.ts` registers the root app with Expo.
- `app.json` holds app metadata and platform settings.
- `package.json` lists dependencies and development commands.
- `tsconfig.json` enables strict TypeScript checking.
- `assets/` contains Expo's template placeholder icons.

## Trace an interaction

1. `sampleWorkout` supplies exercise names and planned set counts.
2. `createWorkoutExercises` copies those exercises and gives each a `sets` array
   containing exactly `plannedSets` null slots. The static plan is unchanged.
3. Start Workout initializes fresh exercise state and enables selection.
4. Selecting an exercise stores its ID. The screen finds its current records in
   `exercises`, rather than reading records from the static plan.
5. The inputs hold text in React state. Save Set uses `parseSetRecord` to validate
   and convert that text into a `{ weight, reps }` object. Blanks and negative or
   invalid values show an error; zero is valid, weights may contain decimals,
   and reps must be whole numbers.
6. `setExercises(current => recordSet(...))` fills the chosen exercise's first
   null slot. `recordSet` creates a new array and a replacement exercise object,
   preserving earlier state and all other exercise records.
7. React renders again. `completedSetCount` counts non-null entries, so a saved
   zero-rep set counts but an unused slot does not.
8. Saving the last required set clears selection and scrolls back to the exercise
   list. Complete is derived from the saved count, not a separate state flag.

Unsaved input text clears when selecting an exercise or after a successful save;
saved sets remain attached to their exercise. A completed exercise has no further
Save Set form, so records cannot exceed its planned set count in this increment.

## Check

```powershell
npm run typecheck
npm test
npx expo install --check
npx expo export --platform ios --output-dir dist
```

`npm test` uses Node's built-in test runner with TypeScript stripping. It was
verified with Node 22.16.0; no additional testing dependency is needed.

On an iPhone, verify that exercises are previews before starting, either exercise
can be selected after starting, and then:

1. Save 50 lb and 10 reps for Bench press; check 1 of 2 sets completed.
2. Switch to Seated row, save 40 lb and 8 reps, then return to Bench press.
   Its original set should still be visible.
3. Try a blank field, negative weight, or fractional reps; verify no set is saved.
   Save 0 lb and 0 reps if desired; they are valid recorded values.
4. Save the final Bench press set; verify the list is shown with Complete.
5. Select that completed exercise to review its sets; verify no extra set can be added.
6. Finish the remaining exercise and check All exercises complete. Reload the app
   to confirm all in-memory records reset.

## Verification of this increment

- TypeScript checking passed.
- All four state/input tests passed: independent workout arrays, interleaved
  exercise saves without mutation, zero-rep counting and completion limits, and
  numeric input validation.
- Expo dependency compatibility checking passed in the prior increment;
  dependencies are unchanged in this step.
- The iOS JavaScript/Hermes bundle export passed with temporary files redirected
  into `.expo/build-temp` inside the workspace. The initial sandboxed export
  could not write Hermes bytecode in the system temporary directory. This is a
  bundle check, not a signed iPhone build or an on-device interaction test.
- `git diff --check` passed.
- Physical iPhone testing is still to be done.

The prior `npm audit` reported 22 dependency advisories (7 moderate, 15 high) in the installed
Expo/React Native dependency tree. These need review before shipping. The audit's
suggested forced changes include downgrading Expo/React Native; no forced
framework changes were applied in this increment. The audit was not rerun for this step.
