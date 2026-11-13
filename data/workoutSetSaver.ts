import type { SetRecord } from './workoutSession';

export type SetSaveRequest = {
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  record: SetRecord;
};

const RETRY_DELAYS = [100, 200];

function isTemporaryContention(error: unknown): boolean {
  const details = error as { errcode?: unknown; code?: unknown; message?: unknown } | null;
  const numericCode = typeof details?.errcode === 'number' ? details.errcode
    : typeof details?.code === 'number' ? details.code : undefined;
  // SQLite extended BUSY codes retain primary code 5 in their low byte.
  if (numericCode !== undefined) return (numericCode & 0xff) === 5;
  if (typeof details?.code === 'string' && details.code.startsWith('SQLITE_')) {
    return /^SQLITE_BUSY(?:_[A-Z_]+)?$/.test(details.code);
  }

  const message = typeof error === 'string' ? error
    : typeof details?.message === 'string' ? details.message : '';
  // Expo's iOS bridge includes the native result code in the error message.
  const nativeCode = /\bError code (\d+):/i.exec(message);
  if (nativeCode) return (Number(nativeCode[1]) & 0xff) === 5;
  return /\bSQLITE_BUSY(?:_[A-Z_]+)?\b|\bdatabase is locked\b/i.test(message);
}

function copyRequest(request: SetSaveRequest): SetSaveRequest {
  return { ...request, record: { ...request.record } };
}

function sameRequest(first: SetSaveRequest, second: SetSaveRequest): boolean {
  return first.sessionId === second.sessionId && first.exerciseId === second.exerciseId
    && first.setNumber === second.setNumber && first.record.weight === second.record.weight
    && first.record.reps === second.record.reps;
}

/** Retain one set until its write succeeds; retries never advance to another slot. */
export function createWorkoutSetSaver(
  write: (request: SetSaveRequest) => Promise<void>,
  pause: (milliseconds: number) => Promise<void> = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
) {
  let pending: SetSaveRequest | null = null;
  let saving: Promise<SetSaveRequest> | null = null;
  let closed = false;
  let closing: Promise<void> | null = null;

  function save(request: SetSaveRequest): Promise<SetSaveRequest> {
    if (closed) return Promise.reject(new Error('Set saver is closed.'));
    if (pending && !sameRequest(pending, request)) {
      return Promise.reject(new Error('Retry the pending set before saving another set.'));
    }
    if (saving) return saving;
    if (!pending) pending = copyRequest(request);
    const snapshot = pending;

    const attempt = (async () => {
      for (let index = 0; ; index += 1) {
        if (closed) throw new Error('Set saver is closed.');
        try {
          await write(copyRequest(snapshot));
          if (closed) throw new Error('Set saver is closed.');
          pending = null;
          return copyRequest(snapshot);
        } catch (error) {
          if (closed) throw new Error('Set saver is closed.');
          if (!isTemporaryContention(error) || index >= RETRY_DELAYS.length) throw error;
          await pause(RETRY_DELAYS[index]);
        }
      }
    })();
    saving = attempt;
    void attempt.then(
      () => { saving = null; },
      () => { saving = null; },
    );
    return attempt;
  }

  function retry(): Promise<SetSaveRequest> {
    if (!pending) return Promise.reject(new Error('There is no pending set to retry.'));
    return save(pending);
  }

  function close(): Promise<void> {
    if (!closing) {
      closed = true;
      const pendingWrite = saving;
      closing = (async () => {
        await pendingWrite?.catch(() => undefined);
        pending = null;
      })();
    }
    return closing;
  }

  return { save, retry, hasPending: () => pending !== null, isSaving: () => saving !== null, close };
}

export type WorkoutSetSaver = ReturnType<typeof createWorkoutSetSaver>;
