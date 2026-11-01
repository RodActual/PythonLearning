import type { CodeStep, Lesson, PretestResult, QuizStep, Unit, UserProgress } from '../types/lesson';
import { coreSteps, isLessonComplete, isTestedOut } from './progress';

/**
 * Pretests let the learner test out of the lessons they already know. A unit's pretest asks a
 * few core questions from each lesson not yet finished; a lesson with no misses is tested out
 * (it counts as complete but earns no XP). Misses feed the "what still needs work" summary.
 */
export const QUIZZES_PER_LESSON = 2;
export const CODE_PER_LESSON = 1;

export type PretestStep = QuizStep | CodeStep;

export interface PretestItem {
  lesson: Lesson;
  step: PretestStep;
}

const isQuiz = (s: Lesson['steps'][number]): s is QuizStep => s.type === 'quiz' && s.answer !== undefined;
const isChallenge = (s: Lesson['steps'][number]): s is CodeStep => s.type === 'code' && !s.expected_error;

function sample<T>(list: T[], n: number, random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, n);
}

/** Lessons in the unit that a pretest can still test out of. */
export const pretestLessons = (unit: Unit, lessons: Lesson[], progress: UserProgress) =>
  lessons.filter((l) => l.unit === unit.id && !isLessonComplete(progress, l) && pretestQuestions(l).length > 0);

/** Core questions with a right answer: answerable quizzes and coding challenges (not crash demos). */
export const pretestQuestions = (lesson: Lesson): PretestStep[] =>
  coreSteps(lesson).filter((s): s is PretestStep => isQuiz(s) || isChallenge(s));

/** A few random core questions per lesson, kept in lesson order so the test builds up. */
export function buildPretest(lessons: Lesson[], random = Math.random): PretestItem[] {
  return lessons.flatMap((lesson) => {
    const core = coreSteps(lesson);
    const picked = new Set<PretestStep>([
      ...sample(core.filter(isQuiz), QUIZZES_PER_LESSON, random),
      ...sample(core.filter(isChallenge), CODE_PER_LESSON, random),
    ]);
    return core.filter((s): s is PretestStep => picked.has(s as PretestStep)).map((step) => ({ lesson, step }));
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
        const core = coreSteps(lesson);
        const done = new Set(progress.done[lesson.id] ?? []);
        return {
          lesson,
          missed: pretestQuestions(lesson).filter((s) => missedIds.has(s.id) && !done.has(s.id)),
          coreDone: core.filter((s) => done.has(s.id)).length,
          coreTotal: core.length,
        };
      });
    return { unit, items, testedOut: inUnit.filter((l) => isTestedOut(progress, l.id)).length };
  });
}

/** Short label for a pretest question in lists. */
export const questionLabel = (step: PretestStep) =>
  step.type === 'code' ? step.heading ?? 'Coding challenge' : step.question;
