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

Start persists a session and its unfinished set rows. Save Set now persists each
entered result before updating progress or clearing inputs. Failed writes retain
the current values with Retry. End Workout integration, loading prior sessions,
the "Last time" display, timers, and notifications are later steps.

Saved database rows survive reload, but the screen does not yet read or resume
those sessions. Reloading still resets the visible workout. Values awaiting a
successful write are held only in memory.

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

## Save Set integration

The screen validates the input, captures the current session ID, exercise ID,
one-based set number and numeric weight/reps, then passes them to
`data/workoutSetSaver.ts`. The saver writes through the same prepared storage
connection. It retains one pending record until its write succeeds.

- While saving, the button shows Saving and a spinner. Inputs and exercise
  selection stay fixed. A synchronous coordinator guard also blocks duplicate
  submissions before the button has rerendered.
- Recognized SQLite BUSY contention gets at most two automatic retries after
  100 ms and 200 ms pauses. Other errors surface immediately. These delays do
  not guarantee a maximum total native write time.
- A failed save keeps the set values and progress unchanged, shows an inline
  error and enables Retry. Retry reuses the captured record and the same set
  row; values do not need re-entry. Inputs and exercise changes remain held
  until that pending set succeeds.
- Only a successful save updates React's recorded sets, clears the form and,
  for the final planned set, returns to the exercise list with Complete.

The error classifier recognizes numeric SQLite BUSY codes (including extended
codes) and the native error format exposed by Expo. It does not automatically
retry unknown, constraint, full-disk or SQLITE_LOCKED errors.
[SQLite result codes](https://www.sqlite.org/rescode.html#busy).

Cleanup stops further retries, waits for an in-flight write, and then closes
storage. Stale results cannot update an unmounted screen. This is foreground
retry handling; restart recovery for an unpersisted set is not implemented.

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
- `data/workoutSetSaver.ts`: one retained set, duplicate protection, bounded
  temporary-contention retries and cleanup.
- `App.tsx`: the screen, React state, input fields, button handlers, and styling.

`tests/workoutSession.test.cjs` checks the state transitions and input edge cases.
`tests/workoutStorage.test.cjs` runs the production storage functions and SQL
against Node's real SQLite engine through a small adapter. It checks persistence,
constraints, isolated session results, retry behavior and transaction rollback.
`tests/workoutStartup.test.cjs` controls delayed preparation/writes and failures
to check waiting, shared attempts, retry and cleanup. The storage suite also
connects startup to a real SQLite database and verifies exactly one session.
`tests/workoutSetSaver.test.cjs` checks retained snapshots, retry limits and
classification, manual retry, duplicates and cleanup. Storage integration tests
verify completion follows persistence and exercise a real two-connection writer
lock that clears on automatic retry.

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
6. The set saver retains those values and their exact session/exercise/set key.
   It writes to SQLite, with brief retries for recognized temporary contention.
   Pending/failure states leave inputs and progress in place. Only success calls
   `setExercises(current => recordSet(...))` to fill the first null slot.
   `recordSet` creates replacement state, preserving all other exercise records.
7. React renders again. `completedSetCount` counts non-null entries, so a saved
   zero-rep set counts but an unused slot does not.
8. Saving the last required set clears selection and scrolls back to the exercise
   list. Complete is derived from the saved count, not a separate state flag.

Input text clears when freely selecting an exercise or after a successful save.
Selection is held while a set awaits persistence, including after a failed save.
Recorded sets remain attached to their exercise. A completed exercise has no further
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
Saving a set should now update exactly one of its original SQLite rows.

Then check the logging flow:

1. Save 50 lb and 10 reps for Bench press. Check the Saving state, followed by
   1 of 2 sets completed and cleared inputs after success.
2. Switch to Seated row, save 40 lb and 8 reps, then return to Bench press.
   Its original set should still be visible.
3. Try a blank field, negative weight, or fractional reps; verify no set is saved.
   Save 0 lb and 0 reps if desired; they are valid recorded values.
4. Save the final Bench press set; verify the list is shown with Complete.
5. Select that completed exercise to review its sets; verify no extra set can be added.
6. Finish the remaining exercise and check All exercises complete. Reload resets
   the visible workout; database rows remain saved but are not yet loaded into UI.

The automated tests inject failures to verify retained values/manual retry and
use actual SQLite contention to verify automatic retry. No failure injection
controls are shipped in the app. New Save Set behavior and latency still need
an iPhone interaction check.

## Verification of this increment

- TypeScript checking passed.
- All 36 tests passed: four state/input tests, fourteen real SQLite storage
  tests, nine startup tests and nine set-saver tests. New checks cover retained
  values, waiting for persistence, retry success/exhaustion, native error formats,
  manual retry, duplicate submissions, cleanup and a real SQLite writer lock.
- No dependency or schema changes were made in this Save Set increment. Expo
  dependency compatibility passed in the preceding startup increment.
- The iOS JavaScript/Hermes bundle export passed with temporary files redirected
  into `.expo/build-temp`. This verifies bundling, not signed-device execution.
- `git diff --check` passed.
- The user reports testing the startup flow on an iPhone. The newly connected
  Save Set retry flow has not yet been device-tested or timed; automated tests
  use Node SQLite and controlled promises, not a mounted React Native screen.

The preceding installation-time npm audit reported three moderate dependency
advisories. No audit, automatic fixes or framework upgrades were performed in
this Save Set increment.
