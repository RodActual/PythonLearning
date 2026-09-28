import type { Lesson, UserProgress } from '../types/lesson';
import { earnedBadgeIds } from './badges';
import { doneCount, isLessonComplete } from './progress';
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
    lessonsCompleted: lessons.filter((l) => isLessonComplete(progress, l)).length,
  };
}

export type LessonState = 'completed' | 'in-progress' | 'not-started';

export const lessonState = (lesson: Lesson, progress: UserProgress): LessonState => {
  if (isLessonComplete(progress, lesson)) return 'completed';
  return doneCount(progress, lesson) > 0 ? 'in-progress' : 'not-started';
};

/** Soft lock: the first unfinished lesson is recommended; the rest stay open. -1 when all are done. */
export const recommendedLessonIndex = (lessons: Lesson[], progress: UserProgress) =>
  lessons.findIndex((l) => lessonState(l, progress) !== 'completed');
