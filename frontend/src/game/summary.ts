import type { Lesson, UserProgress } from '../types/lesson';
import { earnedBadgeIds } from './badges';
import { levelInfo, totalXp, type LevelInfo } from './xp';

export interface GameSummary {
  xp: number;
  level: LevelInfo;
  badges: string[];
  lessonsCompleted: number;
}

export function summarize(lessons: Lesson[], progress: UserProgress): GameSummary {
  const xp = totalXp(lessons, progress);
  return {
    xp,
    level: levelInfo(xp),
    badges: earnedBadgeIds(lessons, progress),
    lessonsCompleted: lessons.filter((l) => (progress.completed_steps[l.id] ?? 0) >= l.steps.length).length,
  };
}

export type LessonState = 'completed' | 'in-progress' | 'not-started';

export const lessonState = (lesson: Lesson, progress: UserProgress): LessonState => {
  const reached = progress.completed_steps[lesson.id] ?? 0;
  if (reached >= lesson.steps.length) return 'completed';
  return reached > 0 ? 'in-progress' : 'not-started';
};

/** Soft lock: the first unfinished lesson is recommended; the rest stay open. -1 when all are done. */
export const recommendedLessonIndex = (lessons: Lesson[], progress: UserProgress) =>
  lessons.findIndex((l) => lessonState(l, progress) !== 'completed');
