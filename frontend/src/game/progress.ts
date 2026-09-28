import legacyMap from '../data/legacy-step-ids.json';
import type { DoneSteps, Lesson, ReviewCard, UserProgress } from '../types/lesson';

export const PROGRESS_VERSION = 2;
export const EMPTY_PROGRESS: UserProgress = { done: {}, firstTry: {}, review: {} };

/**
 * Shape of user_progress/{uid} in Firestore.
 * v1 (legacy) saved step positions; v2 saves step ids so lessons can be edited safely.
 */
export interface ProgressDoc {
  version?: number;
  done?: DoneSteps;
  first_try_ids?: DoneSteps;
  review?: Record<string, ReviewCard>;
  /** v1: lessonId -> index of the furthest step reached. */
  completed_steps?: Record<string, number>;
  /** v1: lessonId -> step indices solved first try. */
  first_try?: Record<string, number[]>;
}

const LEGACY: Record<string, string[]> = (legacyMap as { lessons: Record<string, string[]> }).lessons;

const asStringLists = (value: unknown): DoneSteps => {
  const out: DoneSteps = {};
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === 'string');
    }
  }
  return out;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const asReview = (value: unknown): Record<string, ReviewCard> => {
  const out: Record<string, ReviewCard> = {};
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, Partial<ReviewCard>>)) {
      if (v && typeof v.box === 'number' && typeof v.due === 'string' && DATE.test(v.due)) {
        out[k] = { box: Math.min(Math.max(Math.round(v.box), 1), 5), due: v.due };
      }
    }
  }
  return out;
};

/** Converts a v1 document (step positions) to step ids using the frozen legacy map. */
export function migrateLegacy(doc: ProgressDoc): UserProgress {
  const done: DoneSteps = {};
  const firstTry: DoneSteps = {};
  for (const [lessonId, reached] of Object.entries(doc.completed_steps ?? {})) {
    const ids = LEGACY[lessonId];
    if (!ids || typeof reached !== 'number' || reached <= 0) continue;
    done[lessonId] = ids.slice(0, Math.min(reached, ids.length));
  }
  for (const [lessonId, indices] of Object.entries(doc.first_try ?? {})) {
    const ids = LEGACY[lessonId];
    if (!ids || !Array.isArray(indices)) continue;
    const mapped = indices.map((i) => ids[i]).filter((id): id is string => typeof id === 'string');
    if (mapped.length) firstTry[lessonId] = mapped;
  }
  return { done, firstTry, review: {} };
}

/** Reads a Firestore document. `needsMigration` means it should be rewritten as v2. */
export function fromDoc(doc: ProgressDoc | undefined): { progress: UserProgress; needsMigration: boolean } {
  if (!doc) return { progress: EMPTY_PROGRESS, needsMigration: false };
  if ((doc.version ?? 1) >= PROGRESS_VERSION) {
    return {
      progress: { done: asStringLists(doc.done), firstTry: asStringLists(doc.first_try_ids), review: asReview(doc.review) },
      needsMigration: false,
    };
  }
  const hasLegacy = Object.keys(doc.completed_steps ?? {}).length > 0 || Object.keys(doc.first_try ?? {}).length > 0;
  return { progress: migrateLegacy(doc), needsMigration: hasLegacy };
}

/**
 * The v2 fields to write for a progress snapshot (migration and "reset all").
 * `review` is deliberately left out: it's only written by review sessions, and a
 * non-merge write of this (reset all) clears it. Legacy fields are left for rollback.
 */
export const toDoc = (p: UserProgress) => ({
  version: PROGRESS_VERSION,
  done: p.done,
  first_try_ids: p.firstTry,
});

// --- Queries (all ignore ids of steps that no longer exist) ---

export const isStepDone = (p: UserProgress, lessonId: string, stepId: string) =>
  (p.done[lessonId] ?? []).includes(stepId);

export const doneCount = (p: UserProgress, lesson: Lesson) => {
  const done = new Set(p.done[lesson.id] ?? []);
  return lesson.steps.filter((s) => done.has(s.id)).length;
};

export const isLessonComplete = (p: UserProgress, lesson: Lesson) =>
  lesson.steps.length > 0 && doneCount(p, lesson) === lesson.steps.length;

/** Where to resume: the first unfinished step, or the start for a finished lesson (review). */
export const resumeIndex = (p: UserProgress, lesson: Lesson) => {
  const done = new Set(p.done[lesson.id] ?? []);
  const i = lesson.steps.findIndex((s) => !done.has(s.id));
  return i === -1 ? 0 : i;
};

export const firstTrySet = (p: UserProgress, lessonId: string) => new Set(p.firstTry[lessonId] ?? []);

/** Returns progress with one more step completed (no-op if already done). */
export function withStepDone(p: UserProgress, lessonId: string, stepId: string, firstTry: boolean): UserProgress {
  if (isStepDone(p, lessonId, stepId)) return p;
  return {
    done: { ...p.done, [lessonId]: [...(p.done[lessonId] ?? []), stepId] },
    firstTry: firstTry ? { ...p.firstTry, [lessonId]: [...(p.firstTry[lessonId] ?? []), stepId] } : p.firstTry,
    review: p.review,
  };
}

export function withoutLesson(p: UserProgress, lessonId: string): UserProgress {
  const done = { ...p.done };
  const firstTry = { ...p.firstTry };
  delete done[lessonId];
  delete firstTry[lessonId];
  return { done, firstTry, review: {} };
}
