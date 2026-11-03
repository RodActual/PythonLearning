import type { Lesson, PretestResult, Unit, UserProgress } from '../types/lesson';
import { coreDoneCount, coreSteps, isLessonComplete, isTestedOut } from './progress';
import { isReviewable, shuffle, stepLabel, type ReviewStep } from './review';

/**
 * Pretests let the learner test out of the lessons they already know. A unit's pretest asks a
 * few core questions from each lesson not yet finished; a lesson with no misses is tested out
 * (it counts as complete but earns no XP). Misses feed the "what still needs work" summary.
 */
export const QUIZZES_PER_LESSON = 2;
export const CODE_PER_LESSON = 1;

/** Steps with a right answer, the same ones Review can ask. */
export type PretestStep = ReviewStep;

export interface PretestItem {
  lesson: Lesson;
  step: PretestStep;
}

const sample = <T,>(list: T[], n: number, random: () => number) => shuffle(list, random).slice(0, n);

/** Lessons in the unit that a pretest can still test out of. */
export const pretestLessons = (unit: Unit, lessons: Lesson[], progress: UserProgress) =>
  lessons.filter((l) => l.unit === unit.id && !isLessonComplete(progress, l) && pretestQuestions(l).length > 0);

/** Core questions with a right answer: answerable quizzes and coding challenges (not crash demos). */
export const pretestQuestions = (lesson: Lesson): PretestStep[] =>
  coreSteps(lesson).filter(isReviewable);

/** A few random core questions per lesson, kept in lesson order so the test builds up. */
export function buildPretest(lessons: Lesson[], random = Math.random): PretestItem[] {
  return lessons.flatMap((lesson) => {
    const questions = pretestQuestions(lesson);
    const picked = new Set<PretestStep>([
      ...sample(questions.filter((s) => s.type === 'quiz'), QUIZZES_PER_LESSON, random),
      ...sample(questions.filter((s) => s.type === 'code'), CODE_PER_LESSON, random),
    ]);
    return questions.filter((s) => picked.has(s)).map((step) => ({ lesson, step }));
  });
}

/** Per-lesson results from a finished pretest's answers (true = right). */
export function scorePretest(items: PretestItem[], answers: boolean[], date: string): Record<string, PretestResult> {
  const out: Record<string, PretestResult> = {};
  items.forEach(({ lesson, step }, i) => {
    out[lesson.id] ??= { date, missed: [] };
    if (!answers[i]) out[lesson.id].missed.push(step.id);
  });
  return out;
}

export interface WorkItem {
  lesson: Lesson;
  /** Pretest questions missed last time, in lesson order. */
  missed: PretestStep[];
  /** Core steps done so far. */
  coreDone: number;
  coreTotal: number;
}

export interface UnitWork {
  unit: Unit;
  items: WorkItem[];
  testedOut: number;
}

/** What is left per unit: unfinished lessons, with any pretest misses to practice first. */
export function needsWork(units: Unit[], lessons: Lesson[], progress: UserProgress): UnitWork[] {
  return units.map((unit) => {
    const inUnit = lessons.filter((l) => l.unit === unit.id);
    const items = inUnit
      .filter((l) => !isLessonComplete(progress, l))
      .map((lesson) => {
        const missedIds = new Set(progress.pretest[lesson.id]?.missed ?? []);
        const done = new Set(progress.done[lesson.id] ?? []);
        return {
          lesson,
          missed: pretestQuestions(lesson).filter((s) => missedIds.has(s.id) && !done.has(s.id)),
          coreDone: coreDoneCount(progress, lesson),
          coreTotal: coreSteps(lesson).length,
        };
      });
    return { unit, items, testedOut: inUnit.filter((l) => isTestedOut(progress, l.id)).length };
  });
}

export const questionLabel = stepLabel;
