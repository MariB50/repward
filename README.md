# Repward

A small iOS workout app, built one understandable step at a time with Expo,
React Native, and TypeScript.

## This step

Start a sample workout and select either exercise in any order. The selected
exercise and planned set count appear below the list. Selection lives in memory
and resets when the app reloads.

## Run

```powershell
npm install
npm start
```

Use a compatible Expo Go installation on your iPhone to open the project from
the development server. Windows can run the server; it cannot run Apple's iOS
Simulator. Installable iPhone development builds will be a later step.

## Read these two files first

- `data/sampleWorkout.ts`: the types and example workout data.
- `App.tsx`: the screen, its two state values, button handlers, and styling.

The remaining setup files have supporting roles:

- `index.ts` registers the root app with Expo.
- `app.json` holds app metadata and platform settings.
- `package.json` lists dependencies and development commands.
- `tsconfig.json` enables strict TypeScript checking.
- `assets/` contains Expo's template placeholder icons.

## Trace an interaction

1. `sampleWorkout` supplies exercise names and planned set counts.
2. `Start Workout` changes `workoutStarted` from `false` to `true`.
3. React renders the screen again, enabling exercise selection.
4. Tapping an exercise saves its ID in `selectedExerciseId`.
5. The screen finds that exercise in the data and updates its highlight and details.

## Check

```powershell
npm run typecheck
npx expo install --check
npx expo export --platform ios --output-dir dist
```

On an iPhone, verify that exercises are previews before starting, either exercise
can be selected after starting, and changing the selection updates both the
highlight and current-exercise details.

## Verification of this increment

- TypeScript checking passed.
- Expo dependency compatibility checking passed.
- The iOS JavaScript/Hermes bundle export passed. This is a bundle check, not a
  signed iPhone build or an on-device interaction test.
- Physical iPhone testing is still to be done.

`npm audit` reports 22 dependency advisories (7 moderate, 15 high) in the installed
Expo/React Native dependency tree. These need review before shipping. The audit's
suggested forced changes include downgrading Expo/React Native; no forced
framework changes were applied in this increment.
