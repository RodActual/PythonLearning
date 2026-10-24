import type { CodeStep, Lesson, Unit, UserProgress } from '../types/lesson';
import { isInterviewChallenge, isStepDone } from './progress';

/** The interview area each unit's practice rehearses. */
const INTERVIEW_AREAS: Record<string, string> = {
  foundations: 'Scripting basics: logs, ports and hostnames',
  'functions-data': 'Data handling: events, alerts and lookups',
  'robust-code': 'Reliable tools: validation, files and tests',
  objects: 'Modeling devices, rules and risk',
  toolkit: 'Parsing logs, dates and JSON at scale',
};

export interface UnitInterview {
  unit: Unit;
  area: string;
  done: number;
  total: number;
}

/** Interview coding challenges solved per unit (the same count the Interview Ready badge uses). */
export function interviewByUnit(units: Unit[], lessons: Lesson[], progress: UserProgress): UnitInterview[] {
  return units.map((unit) => {
    let done = 0;
    let total = 0;
    for (const l of lessons) {
      if (l.unit !== unit.id) continue;
      for (const s of l.steps.filter(isInterviewChallenge)) {
        total++;
        if (isStepDone(progress, l.id, s.id)) done++;
      }
    }
    return { unit, area: INTERVIEW_AREAS[unit.id] ?? unit.title, done, total };
  });
}

/** The first interview challenge not yet solved, in course order; null when all are solved. */
export function nextInterviewStep(lessons: Lesson[], progress: UserProgress) {
  for (const lesson of lessons) {
    const step = lesson.steps.find((s): s is CodeStep => isInterviewChallenge(s) && !isStepDone(progress, lesson.id, s.id));
    if (step) return { lesson, step };
  }
  return null;
}
