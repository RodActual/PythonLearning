import type { CodeStep, Lesson, QuizStep, ReviewCard, UserProgress } from '../types/lesson';
import { isStepDone } from './progress';

/**
 * Spaced repetition (Leitner boxes). Every completed quiz or coding challenge becomes a
 * review card. Getting it right on the first try moves it up a box and pushes the next
 * review further out; a miss drops it back to box 1 for tomorrow.
 */
export const INTERVAL_DAYS = [1, 3, 7, 14, 30]; // days until the next review for box 1..5
export const SESSION_SIZE = 10;
export const MAX_CODE_PER_SESSION = 3;

export type ReviewStep = QuizStep | CodeStep;

export interface ReviewItem {
  key: string;
  lesson: Lesson;
  step: ReviewStep;
  card?: ReviewCard;
}

export const reviewKey = (lessonId: string, stepId: string) => `${lessonId}:${stepId}`;

/** Local calendar date as YYYY-MM-DD. */
export function today(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return today(new Date(y, m - 1, d + days));
}

/** Days from `from` to `to` (both YYYY-MM-DD). */
export function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/**
 * A step can be reviewed if the learner has completed it and it has a right answer.
 * Opinion polls (no answer) and "watch it crash" demos (expected_error) are skipped.
 */
const isReviewable = (step: Lesson['steps'][number]): step is ReviewStep =>
  (step.type === 'quiz' && step.answer !== undefined) || (step.type === 'code' && !step.expected_error);

export function reviewItems(lessons: Lesson[], progress: UserProgress): ReviewItem[] {
  const items: ReviewItem[] = [];
  for (const lesson of lessons) {
    for (const step of lesson.steps) {
      if (!isReviewable(step) || !isStepDone(progress, lesson.id, step.id)) continue;
      const key = reviewKey(lesson.id, step.id);
      items.push({ key, lesson, step, card: progress.review[key] });
    }
  }
  return items;
}

/** Items due today: new cards and anything whose due date has arrived. */
export const dueItems = (items: ReviewItem[], on = today()) => items.filter((i) => !i.card || i.card.due <= on);

/** The next date something becomes due, if nothing is due now. */
export function nextDueDate(items: ReviewItem[], on = today()): string | undefined {
  return items
    .filter((i) => i.card && i.card.due > on)
    .map((i) => i.card!.due)
    .sort()[0];
}

function shuffle<T>(list: T[], random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Picks a session: most overdue first, then the lowest boxes, then new cards, with at
 * most a few coding challenges so a session stays short. Order is then shuffled so
 * lessons are mixed (interleaving helps memory).
 */
export function buildSession(
  candidates: ReviewItem[],
  { size = SESSION_SIZE, maxCode = MAX_CODE_PER_SESSION, random = Math.random } = {},
): ReviewItem[] {
  const ranked = shuffle(candidates, random).sort((a, b) => {
    const da = a.card?.due ?? '9999-12-31';
    const db = b.card?.due ?? '9999-12-31';
    if (da !== db) return da < db ? -1 : 1;
    return (a.card?.box ?? 0) - (b.card?.box ?? 0);
  });
  const picked: ReviewItem[] = [];
  let code = 0;
  for (const item of ranked) {
    if (picked.length >= size) break;
    if (item.step.type === 'code') {
      if (code >= maxCode) continue;
      code++;
    }
    picked.push(item);
  }
  return shuffle(picked, random);
}

/**
 * The card after answering: up a box when right the first time, back to box 1 when missed.
 * A new card starts in box 1 (the learner already met it in the lesson), so the first
 * correct review sends it to box 2 (3 days), then 7, 14, and 30 days.
 */
export function nextCard(card: ReviewCard | undefined, correct: boolean, on = today()): ReviewCard {
  if (!correct) return { box: 1, due: addDays(on, INTERVAL_DAYS[0]) };
  const box = Math.min((card?.box ?? 1) + 1, INTERVAL_DAYS.length);
  return { box, due: addDays(on, INTERVAL_DAYS[box - 1]) };
}

/** Human wording for when a card comes back, e.g. "tomorrow" or "in 7 days". */
export function whenLabel(due: string, on = today()): string {
  const days = daysBetween(on, due);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}
