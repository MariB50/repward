import { openDatabaseAsync } from 'expo-sqlite';

import { createWorkoutStorage } from './workoutStorage';

/** Open once for the app, then share the returned storage instance. */
export async function openWorkoutStorage() {
  // Keep this connection private so every query goes through the storage queue.
  const db = await openDatabaseAsync('repward.db', { useNewConnection: true });
  try {
    return await createWorkoutStorage(db);
  } catch (error) {
    await db.closeAsync();
    throw error;
  }
}
