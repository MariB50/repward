# Repward

A small iOS workout app, built one understandable step at a time with Expo,
React Native, and TypeScript.

## This step

Start a sample workout and select either exercise in any order. Enter the weight
in pounds and completed reps, then tap Save Set. Each exercise keeps its own
recorded sets when you switch selection. Progress shows saved versus planned sets;
saving the final planned set marks the exercise Complete and returns to the list.
Completed exercises can be selected again to review their records.

SQLite prepares while the workout preview is visible. Start Workout shows a
spinner while preparation and session creation finish, then enables the workout.
Failures leave the preview visible with an error and Retry. Repeated taps share
one start attempt, so they cannot create duplicate sessions.

Starting now persists a session and its unfinished set rows. Save Set still
updates only React state in this increment; entered weights/reps reset on reload.
Connecting per-set saves and End Workout comes next. Loading prior sessions,
the "Last time" display, timers, and notifications are later steps.

## Startup integration

`App.tsx` prepares storage in an effect when the screen opens. Preparation does
not create a session and does not disable Start. If Start is tapped before the
database is ready, its loading state covers the remaining preparation and the
session creation. The app sets its current session ID only after creation succeeds;
the presence of that ID determines whether the workout has started.

`data/workoutStartup.ts` coordinates this flow:

- `prepare()` shares one database-opening promise. A successful connection stays
  available; failed preparation can be retried.
- `start(plan)` waits for preparation, generates a UUID using `expo-crypto`, and
  creates the session. Concurrent calls share one attempt. A failed creation can
  retry using the ready connection; an already-started session is not recreated.
- `close()` prevents late startup success, waits for in-flight work and closes
  the connection. The screen ignores results from an old coordinator after
  cleanup. Replacement effects wait for the old connection to close, including
  React development-mode setup/cleanup cycles.

On error, the Start area returns to an enabled Retry button and retains the
workout preview. While starting, the button shows a spinner and is disabled;
the coordinator also protects against taps arriving before the screen rerenders.

## SQLite foundation

The storage has three tables:

| Table | One row represents | Important fields |
| --- | --- | --- |
| `sessions` | One workout attempt | `id`, `ended_at` (NULL while active) |
| `session_exercises` | One exercise in that attempt | Session/exercise IDs, copied name and planned set count, position |
| `set_results` | One planned set | Session/exercise IDs, one-based set number, weight and reps |

Each planned set gets a row immediately. Weight and reps are both NULL until
recorded; numeric zero is a valid result. Exercise IDs match across sessions,
while the combination of session ID, exercise ID and set number identifies a
single set slot. Copies of the original exercise details keep later plan edits
from changing the saved session.

`openWorkoutStorage()` opens `repward.db` through Expo SQLite. Open it once and
share the returned storage instance. It provides:

- `createSession(sessionId, plan)`: insert the session, its exercise snapshots,
  and every unfinished set row together. The startup coordinator supplies the
  UUID session ID when Start Workout is tapped.
- `saveSet(sessionId, exerciseId, setNumber, record)`: update one existing slot.
  Set numbers start at 1; repeating a save targets the same row.
- `finishSession(sessionId, exercises, endedAt?)`: flush all provided recorded
  sets and write the end timestamp in one transaction. This supports early ends:
  unfinished slots remain NULL, and an empty input slot cannot erase a previously
  persisted set. The supplied exercises/set counts must match the original plan.
  The end time defaults to now and is stored as UTC ISO text. Repeating a finished
  session's final save preserves its original results and end time.
- `close()`: finish queued operations and close the connection.

A transaction either commits all of its writes or rolls them back. Errors reject
the function's promise, leaving the caller responsible for showing the error and
retaining inputs for Retry. End Workout must await `finishSession` before changing
the screen to ended; that screen behavior is not implemented yet.

All operations share a queue so their transactions cannot overlap. The connection
is private to this storage instance and has foreign keys enabled. This uses
Expo's same-connection `withTransactionAsync`; its exclusive transaction API opens
another connection without inheriting that foreign-key setting.
[Expo SDK 58 SQLite documentation](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/).

This foundation does not yet load history into the screen, find "Last time," or
resume an active workout after an app restart. Those remain later integration
and design work.

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
- `data/workoutStorage.ts`: SQLite tables, transaction queue, and storage functions.
- `data/openWorkoutStorage.ts`: the small native Expo database-opening wrapper.
- `data/workoutStartup.ts`: shared preparation, session creation, retry and
  cleanup coordination; accepts injected storage/ID functions for tests.
- `App.tsx`: the screen, React state, input fields, button handlers, and styling.

`tests/workoutSession.test.cjs` checks the state transitions and input edge cases.
`tests/workoutStorage.test.cjs` runs the production storage functions and SQL
against Node's real SQLite engine through a small adapter. It checks persistence,
constraints, isolated session results, retry behavior and transaction rollback.
`tests/workoutStartup.test.cjs` controls delayed preparation/writes and failures
to check waiting, shared attempts, retry and cleanup. The storage suite also
connects startup to a real SQLite database and verifies exactly one session.

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
3. The screen starts preparing SQLite on mount. Start Workout shows loading,
   waits for storage, generates a session UUID and creates its original planned
   set rows. Only successful creation initializes exercise state and enables
   selection. Preparation/creation errors return to the preview with Retry.
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

`npm test` uses Node's built-in test runner, SQLite and TypeScript stripping. It
was verified with Node 22.16.0; no additional testing dependency is needed. Node
22.16.0 reports experimental-feature notices for SQLite and TypeScript stripping.

On an iPhone, verify that the preview remains visible during early preparation.
Tap Start and check the loading state, then exercise selection after success.
Rapid repeated Start taps should create only one session. The automated SQLite
integration test checks its two exercise snapshots and four unfinished set rows.
Set values in SQLite remain NULL while Save Set integration is pending.

Then check the existing in-memory logging flow:

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
- All 25 tests passed: four state/input tests, twelve real SQLite storage tests,
  and nine asynchronous startup tests. New checks cover early preparation,
  waiting for creation, duplicate Starts, failures/retries, cleanup during
  pending operations, and exactly one real session with unfinished set rows.
- `expo-crypto` ~58.0.8 was added to the existing Expo 58 checkout for UUIDs.
  Expo dependency compatibility checking passed.
- The ScrollView ref type was adjusted for the current React Native 0.88 types.
- The iOS JavaScript/Hermes bundle export passed with temporary files redirected
  into `.expo/build-temp`. This verifies bundling, not signed-device execution.
- `git diff --check` passed.
- The native Expo SQLite bridge has not been exercised on an iPhone. Node SQLite
  tests verify the SQL/storage behavior, not native-device integration.

The installation-time npm audit reported three moderate dependency advisories.
No automatic dependency fixes or framework upgrades were applied in this
startup increment; the existing Expo 58 upgrade was preserved.
