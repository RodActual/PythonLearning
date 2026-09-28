import type { Lesson, UserProgress } from '../types/lesson';
import { units } from '../data/lessons';
import { firstTrySet, isLessonComplete, isStepDone } from './progress';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: (lessons: Lesson[], progress: UserProgress) => boolean;
}

const isComplete = (lessons: Lesson[], progress: UserProgress, id: string) => {
  const lesson = lessons.find((l) => l.id === id);
  return !!lesson && isLessonComplete(progress, lesson);
};

const completedCount = (lessons: Lesson[], progress: UserProgress) =>
  lessons.filter((l) => isComplete(lessons, progress, l.id)).length;

/** Count first-try solves of a given step type across all lessons. */
const firstTryCount = (lessons: Lesson[], progress: UserProgress, type: 'quiz' | 'code') =>
  lessons.reduce((n, l) => {
    const firstTry = firstTrySet(progress, l.id);
    return n + l.steps.filter((s) => s.type === type && firstTry.has(s.id)).length;
  }, 0);

/** A completed lesson where every quiz and code step was solved first try. */
const hasFlawlessLesson = (lessons: Lesson[], progress: UserProgress) =>
  lessons.some((l) => {
    if (!isComplete(lessons, progress, l.id)) return false;
    const firstTry = firstTrySet(progress, l.id);
    return l.steps.every((s) => s.type === 'text' || firstTry.has(s.id));
  });

const BASE_BADGES: Badge[] = [
  {
    id: 'first-program',
    name: 'Hello, World',
    description: 'Pass your first coding challenge.',
    icon: '👋',
    earned: (lessons, p) =>
      lessons.some((l) => l.steps.some((s) => s.type === 'code' && isStepDone(p, l.id, s.id))),
  },
  {
    id: 'first-lesson',
    name: 'First Steps',
    description: 'Complete any lesson.',
    icon: '🥾',
    earned: (lessons, p) => completedCount(lessons, p) >= 1,
  },
  {
    id: 'quiz-whiz',
    name: 'Quiz Whiz',
    description: 'Answer 10 quiz questions correctly on the first try.',
    icon: '🧠',
    earned: (lessons, p) => firstTryCount(lessons, p, 'quiz') >= 10,
  },
  {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    description: 'Pass 10 coding challenges on your first run.',
    icon: '🎯',
    earned: (lessons, p) => firstTryCount(lessons, p, 'code') >= 10,
  },
  {
    id: 'flawless',
    name: 'Flawless',
    description: 'Finish a lesson with every question and challenge solved first try.',
    icon: '💎',
    earned: hasFlawlessLesson,
  },
  {
    id: 'loop-master',
    name: 'Loop Master',
    description: 'Complete the Loops lesson.',
    icon: '🔁',
    earned: (lessons, p) => isComplete(lessons, p, 'lesson-04'),
  },
  {
    id: 'bug-squasher',
    name: 'Bug Squasher',
    description: 'Complete the Error Handling lesson.',
    icon: '🐞',
    earned: (lessons, p) => isComplete(lessons, p, 'lesson-08'),
  },
  {
    id: 'architect',
    name: 'Object Architect',
    description: 'Complete the Classes & OOP lesson.',
    icon: '🏗️',
    earned: (lessons, p) => isComplete(lessons, p, 'lesson-11'),
  },
  {
    id: 'halfway',
    name: 'Halfway There',
    description: 'Complete half of all lessons.',
    icon: '⛰️',
    earned: (lessons, p) => lessons.length > 0 && completedCount(lessons, p) >= Math.ceil(lessons.length / 2),
  },
  {
    id: 'graduate',
    name: 'Pythonista',
    description: 'Complete every lesson.',
    icon: '🎓',
    earned: (lessons, p) => lessons.length > 0 && completedCount(lessons, p) === lessons.length,
  },
];

/** One trophy per unit, earned by finishing every lesson in it. */
const UNIT_BADGES: Badge[] = units.map((u) => ({
  id: `unit-${u.id}`,
  name: `${u.title} Complete`,
  description: `Finish every lesson in the ${u.title} unit.`,
  icon: u.icon,
  earned: (lessons, p) => {
    const inUnit = lessons.filter((l) => l.unit === u.id);
    return inUnit.length > 0 && inUnit.every((l) => isComplete(lessons, p, l.id));
  },
}));

export const BADGES: Badge[] = [...BASE_BADGES, ...UNIT_BADGES];

export const earnedBadgeIds = (lessons: Lesson[], progress: UserProgress) =>
  BADGES.filter((b) => b.earned(lessons, progress)).map((b) => b.id);
