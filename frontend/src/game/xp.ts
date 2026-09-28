import type { Lesson, Step, UserProgress } from '../types/lesson';
import { firstTrySet, isLessonComplete } from './progress';

// XP is derived from saved progress, never stored, so replays can't farm it
// and resetting a lesson removes exactly what it earned.
export const STEP_XP: Record<Step['type'], number> = { text: 5, quiz: 10, code: 20 };
export const FIRST_TRY_BONUS: Record<Step['type'], number> = { text: 0, quiz: 5, code: 10 };
export const LESSON_COMPLETE_BONUS = 50;

export function lessonXp(lesson: Lesson, progress: UserProgress): number {
  const done = new Set(progress.done[lesson.id] ?? []);
  const firstTry = firstTrySet(progress, lesson.id);
  let xp = 0;
  for (const step of lesson.steps) {
    if (!done.has(step.id)) continue;
    xp += STEP_XP[step.type] + (firstTry.has(step.id) ? FIRST_TRY_BONUS[step.type] : 0);
  }
  if (isLessonComplete(progress, lesson)) xp += LESSON_COMPLETE_BONUS;
  return xp;
}

export const totalXp = (lessons: Lesson[], progress: UserProgress) =>
  lessons.reduce((sum, l) => sum + lessonXp(l, progress), 0);

export const stepReward = (step: Step, firstTry: boolean) =>
  STEP_XP[step.type] + (firstTry ? FIRST_TRY_BONUS[step.type] : 0);

// --- Levels ---
const TITLES = [
  'Novice', 'Apprentice', 'Coder', 'Scripter', 'Developer', 'Engineer',
  'Architect', 'Pythonista', 'Guru', 'Wizard', 'Sage', 'Legend',
];

/** XP needed to reach a level: 0, 100, 300, 600, 1000, ... */
export const levelThreshold = (level: number) => 50 * (level - 1) * level;

export interface LevelInfo {
  level: number;
  title: string;
  xpIntoLevel: number;
  xpForNext: number;
  /** 0-100 */
  percent: number;
}

export function levelInfo(xp: number): LevelInfo {
  let level = 1;
  while (xp >= levelThreshold(level + 1)) level++;
  const start = levelThreshold(level);
  const span = levelThreshold(level + 1) - start;
  return {
    level,
    title: TITLES[Math.min(level, TITLES.length) - 1],
    xpIntoLevel: xp - start,
    xpForNext: span,
    percent: Math.round(((xp - start) / span) * 100),
  };
}
