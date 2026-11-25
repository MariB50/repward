# Repward

Repward is a personal strength-training log built with Expo, React Native, TypeScript, and SQLite. Workouts, routines, and rest settings stay on the device.

## Train

1. In **Workouts**, tap a saved routine to select it. Tap **View workout** or the **Training** tab when you're ready to train. To build a routine, tap **New workout**, then **Add exercise** to search exercise names or filter by equipment. Tap any picture to enlarge it. Use **Add a custom exercise** for anything your gym has that the catalog doesn't cover. Tap **Reorder** in the workout editor to drag exercises into the order you want.
2. Choose your rest duration. It defaults to 90 seconds. On a phone, tap the bell and allow notifications if you want a lock-screen alert.
3. Set an optional rep range in the workout editor to get a weight or rep target for each exercise. Going above or below the range suggests a heavier or lighter weight for the next set of that exercise. The final set you log informs your next workout. A lighter session still saves the actual weight you logged and brings back your usual target next time.
4. Tap **Start workout**. Swipe the weight and reps wheels to log each set, or tap **Type values** to enter exact numbers. Tap **Skip exercise for now** to move to the next exercise with sets left. Tap any exercise in the list to jump to it, including one you skipped.
5. Logging a set starts rest when there are sets left. Extend the current break by 30 seconds or skip it. Choosing a different preset changes the next rest. Reopening Repward restores logged sets and calculates the time remaining from the saved deadline.
6. Use **Edit** beside a logged set to correct its weight or reps during the session. Corrections keep the current rest deadline.
7. Tap **Finish workout** to review your results. Finishing early keeps each recorded set. **History** shows sets, weight and rep changes, and total volume in pounds (weight multiplied by reps, summed across logged sets).

## Run locally

Use Node 22.16 or later and the project's npm lockfile.

```powershell
npm ci
npm start
```

Open the development server's QR code on an iPhone with a compatible Expo Go installation. During development, keep the server running and reachable from the phone. A standalone installation requires a signed native build.

For a desktop preview, run `npm run web`. Browser storage is separate from phone storage. The browser version uses asynchronous SQLite operations in a worker and needs localhost or HTTPS.

## Verify

```powershell
npm run typecheck
npm test
npx expo export --platform ios --platform web
```

The database upgrades earlier Repward logs in place. The newest unfinished workout resumes on launch when it is the latest session. Older unfinished logs from earlier builds remain available in History. Each session preserves its exercise names, order and planned sets as they were when it began.

<details>
<summary>Workout artwork</summary>

The routine cover in `assets/training.jpg` was created with the built-in ImageGen tool. Generation prompt:

> Wide 3:2 editorial sports product photograph. Sculptural close-up of one heavy black cast-iron adjustable dumbbell with round stacked plates and a textured steel handle, diagonally from lower center to upper right. Restrained blue duotone with crisp cobalt rim light and deep midnight navy shadows. Tactile gritty metal, fine photographic grain, hard side light. The left third is entirely dark navy negative space, weight fills right two thirds. Dark studio backdrop. No text, numerals, logos or graphics.

</details>

The exercise catalog and pictures are bundled for offline use. Pictures are resized and converted to JPEG. See the [exercise image credits](assets/exercises/credits.json) for sources, authors, and licenses.
