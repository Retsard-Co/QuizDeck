import { SAMPLE_QUIZZES } from '../data/sampleQuizzes';
import { PresentationSession, Quiz, SCHEMA_VERSION } from '../domain/types';

const DB_NAME = 'quizdeck_local_db';
const DB_VERSION = 1;
const STORE_QUIZZES = 'quizzes';
const STORE_SESSIONS = 'sessions';
const SEEDED_FLAG_KEY = 'quizdeck_seeded_v1';
const FALLBACK_QUIZZES_KEY = 'quizdeck_fallback_quizzes_v1';
const FALLBACK_SESSION_KEY = 'quizdeck_fallback_session_v1';
const ACTIVE_SESSION_KEY = 'active_session';

export interface PersistenceResult<T = void> {
  ok: boolean;
  data?: T;
  error?: string;
}

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_QUIZZES)) {
        db.createObjectStore(STORE_QUIZZES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        db.createObjectStore(STORE_SESSIONS, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB'));
  });
}

function readLocalStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalStorage(key: string, value: unknown): PersistenceResult {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: `Local storage write failed (browser storage may be full or restricted): ${
        err instanceof Error ? err.message : 'Unknown error'
      }`,
    };
  }
}

export async function loadAllQuizzes(): Promise<PersistenceResult<Quiz[]>> {
  try {
    let quizzes: Quiz[] = [];
    if (hasIndexedDb()) {
      const db = await openDatabase();
      quizzes = await new Promise<Quiz[]>((resolve, reject) => {
        const tx = db.transaction(STORE_QUIZZES, 'readonly');
        const store = tx.objectStore(STORE_QUIZZES);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as Quiz[]) || []);
        req.onerror = () => reject(req.error);
      });
      db.close();
    } else {
      quizzes = readLocalStorage<Quiz[]>(FALLBACK_QUIZZES_KEY, []);
    }

    // Seed sample classroom quizzes once on first visit
    const alreadySeeded =
      typeof localStorage !== 'undefined' && localStorage.getItem(SEEDED_FLAG_KEY) === '1';

    if (quizzes.length === 0 && !alreadySeeded) {
      for (const sample of SAMPLE_QUIZZES) {
        await saveQuiz(sample);
      }
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(SEEDED_FLAG_KEY, '1');
        } catch {
          // Ignore storage flag failure
        }
      }
      quizzes = [...SAMPLE_QUIZZES];
    }

    quizzes.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    return { ok: true, data: quizzes };
  } catch (err) {
    return {
      ok: false,
      data: readLocalStorage<Quiz[]>(FALLBACK_QUIZZES_KEY, SAMPLE_QUIZZES),
      error: `Could not read local quiz database: ${
        err instanceof Error ? err.message : 'Storage unavailable'
      }`,
    };
  }
}

export async function saveQuiz(quiz: Quiz): Promise<PersistenceResult<Quiz>> {
  const stamped: Quiz = {
    ...quiz,
    schema_version: quiz.schema_version || SCHEMA_VERSION,
    updated_at: new Date().toISOString(),
  };

  try {
    if (hasIndexedDb()) {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_QUIZZES, 'readwrite');
        tx.objectStore(STORE_QUIZZES).put(stamped);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('Write transaction failed'));
      });
      db.close();
      return { ok: true, data: stamped };
    }

    const existing = readLocalStorage<Quiz[]>(FALLBACK_QUIZZES_KEY, []);
    const next = [stamped, ...existing.filter((q) => q.id !== stamped.id)];
    const res = writeLocalStorage(FALLBACK_QUIZZES_KEY, next);
    return res.ok ? { ok: true, data: stamped } : { ok: false, error: res.error };
  } catch (err) {
    return {
      ok: false,
      error: `Could not save quiz locally: ${
        err instanceof Error ? err.message : 'Storage quota exceeded or unavailable'
      }`,
    };
  }
}

export async function deleteQuizById(quizId: string): Promise<PersistenceResult> {
  try {
    if (hasIndexedDb()) {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_QUIZZES, 'readwrite');
        tx.objectStore(STORE_QUIZZES).delete(quizId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('Delete failed'));
      });
      db.close();
      return { ok: true };
    }

    const existing = readLocalStorage<Quiz[]>(FALLBACK_QUIZZES_KEY, []);
    return writeLocalStorage(
      FALLBACK_QUIZZES_KEY,
      existing.filter((q) => q.id !== quizId),
    );
  } catch (err) {
    return {
      ok: false,
      error: `Could not delete quiz: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

export async function loadActiveSession(): Promise<
  PersistenceResult<PresentationSession | null>
> {
  try {
    if (hasIndexedDb()) {
      const db = await openDatabase();
      const record = await new Promise<
        { key: string; session: PresentationSession } | undefined
      >((resolve, reject) => {
        const tx = db.transaction(STORE_SESSIONS, 'readonly');
        const req = tx.objectStore(STORE_SESSIONS).get(ACTIVE_SESSION_KEY);
        req.onsuccess = () =>
          resolve(req.result as { key: string; session: PresentationSession } | undefined);
        req.onerror = () => reject(req.error);
      });
      db.close();
      return { ok: true, data: record?.session ?? null };
    }

    return {
      ok: true,
      data: readLocalStorage<PresentationSession | null>(FALLBACK_SESSION_KEY, null),
    };
  } catch (err) {
    return {
      ok: false,
      data: null,
      error: `Could not read saved session: ${
        err instanceof Error ? err.message : 'Unknown error'
      }`,
    };
  }
}

export async function saveActiveSession(
  session: PresentationSession | null,
): Promise<PersistenceResult> {
  try {
    if (hasIndexedDb()) {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_SESSIONS, 'readwrite');
        const store = tx.objectStore(STORE_SESSIONS);
        if (session === null) {
          store.delete(ACTIVE_SESSION_KEY);
        } else {
          store.put({ key: ACTIVE_SESSION_KEY, session });
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('Session save failed'));
      });
      db.close();
      return { ok: true };
    }

    if (session === null) {
      localStorage.removeItem(FALLBACK_SESSION_KEY);
      return { ok: true };
    }
    return writeLocalStorage(FALLBACK_SESSION_KEY, session);
  } catch (err) {
    return {
      ok: false,
      error: `Could not persist presentation session: ${
        err instanceof Error ? err.message : 'Storage unavailable'
      }`,
    };
  }
}

export async function clearAllLocalData(): Promise<PersistenceResult> {
  try {
    if (hasIndexedDb()) {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([STORE_QUIZZES, STORE_SESSIONS], 'readwrite');
        tx.objectStore(STORE_QUIZZES).clear();
        tx.objectStore(STORE_SESSIONS).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(FALLBACK_QUIZZES_KEY);
      localStorage.removeItem(FALLBACK_SESSION_KEY);
      localStorage.setItem(SEEDED_FLAG_KEY, '1');
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: `Failed to clear local data: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

export interface LibraryBackupPayload {
  schema_version: string;
  exported_at: string;
  app: 'QuizDeck';
  quizzes: Quiz[];
}

export function buildLibraryBackupJson(quizzes: Quiz[]): string {
  const payload: LibraryBackupPayload = {
    schema_version: SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    app: 'QuizDeck',
    quizzes,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseLibraryBackupJson(content: string): {
  ok: boolean;
  quizzes: Quiz[];
  error?: string;
} {
  try {
    const parsed = JSON.parse(content) as Partial<LibraryBackupPayload>;
    if (!parsed || !Array.isArray(parsed.quizzes)) {
      return {
        ok: false,
        quizzes: [],
        error: 'Backup file does not contain a valid QuizDeck quizzes array.',
      };
    }
    return { ok: true, quizzes: parsed.quizzes };
  } catch (err) {
    return {
      ok: false,
      quizzes: [],
      error: `Invalid JSON backup: ${err instanceof Error ? err.message : 'Syntax error'}`,
    };
  }
}
