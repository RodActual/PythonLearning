import type { CodeStep, Lesson, Unit, UserProgress } from '../types/lesson';
import { isMasteryChallenge, isStepDone } from './progress';

export interface UnitMastery {
  unit: Unit;
  area: string;
  done: number;
  total: number;
}

/** Mastery coding challenges solved per unit (the same count the Pythonista badge uses). */
export function masteryByUnit(units: Unit[], lessons: Lesson[], progress: UserProgress): UnitMastery[] {
  return units.map((unit) => {
    let done = 0;
    let total = 0;
    for (const l of lessons) {
      if (l.unit !== unit.id) continue;
      for (const s of l.steps.filter(isMasteryChallenge)) {
        total++;
        if (isStepDone(progress, l.id, s.id)) done++;
      }
    }
    return { unit, area: unit.mastery_area, done, total };
  });
}

/** The first mastery challenge not yet solved, in course order; null when all are solved. */
export function nextMasteryStep(lessons: Lesson[], progress: UserProgress) {
  for (const lesson of lessons) {
    const step = lesson.steps.find((s): s is CodeStep => isMasteryChallenge(s) && !isStepDone(progress, lesson.id, s.id));
    if (step) return { lesson, step };
  }
  return null;
}
