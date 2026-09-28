import raw from './lessons.json';
import type { Course, CourseAbout, Lesson, Step, Unit } from '../types/lesson';

// Lessons are shown in file order. Progress is saved by lesson id and step index,
// so never renumber ids or insert steps into a lesson people may have started.

const isString = (v: unknown): v is string => typeof v === 'string';

function validateStep(s: Record<string, unknown>, where: string): Step {
  switch (s.type) {
    case 'text':
      if (!isString(s.content)) break;
      return s as unknown as Step;
    case 'quiz': {
      if (!isString(s.question) || !Array.isArray(s.options) || !s.options.every(isString)) break;
      const options = s.options as string[];
      if (s.answer !== undefined && !options.includes(s.answer as string)) {
        throw new Error(`${where}: answer is not one of the options`);
      }
      if (s.feedback) {
        for (const key of Object.keys(s.feedback)) {
          if (!options.includes(key)) throw new Error(`${where}: feedback for unknown option "${key}"`);
        }
      }
      return s as unknown as Step;
    }
    case 'code':
      if (!isString(s.instruction) || !isString(s.initial_code)) break;
      if (isString(s.expected_output) === isString(s.expected_error)) {
        throw new Error(`${where}: code steps need exactly one of expected_output or expected_error`);
      }
      return s as unknown as Step;
  }
  throw new Error(`${where}: invalid or incomplete step`);
}

function validate(data: unknown): Course {
  const course = data as { about?: unknown; units?: unknown; lessons?: unknown };
  if (!Array.isArray(course.units) || !Array.isArray(course.lessons)) {
    throw new Error('lessons.json must have "units" and "lessons" arrays');
  }
  const about = course.about as CourseAbout;
  if (!about || !isString(about.tagline) || !Array.isArray(about.outcomes) || !Array.isArray(about.paths)) {
    throw new Error('lessons.json "about" is missing or incomplete');
  }
  const units = course.units as Unit[];
  for (const u of units) {
    if (!Array.isArray(u.prepares) || !Array.isArray(u.applications)) {
      throw new Error(`unit ${u.id}: missing "prepares" or "applications"`);
    }
  }
  const unitIds = new Set(units.map((u) => u.id));
  const seen = new Set<string>();
  const lessons = course.lessons.map((l: Record<string, unknown>, i) => {
    if (!isString(l.id) || !isString(l.title) || !isString(l.unit) || !Array.isArray(l.steps)) {
      throw new Error(`lessons[${i}]: missing id, title, unit, or steps`);
    }
    if (seen.has(l.id)) throw new Error(`duplicate lesson id ${l.id}`);
    if (!unitIds.has(l.unit)) throw new Error(`${l.id}: unknown unit ${l.unit}`);
    seen.add(l.id);
    const steps = l.steps.map((s, j) => validateStep(s, `${l.id} step ${j + 1}`));
    return {
      id: l.id,
      title: l.title,
      unit: l.unit,
      summary: l.summary as string | undefined,
      why: l.why as string | undefined,
      unlocks: l.unlocks as string | undefined,
      steps,
    };
  });
  return { about, units, lessons };
}

const course = validate(raw);

export const about: CourseAbout = course.about;
export const units: Unit[] = course.units;
export const lessons: Lesson[] = course.lessons;

export const getLesson = (id: string): Lesson | undefined => lessons.find((l) => l.id === id);
export const getUnit = (id: string): Unit | undefined => units.find((u) => u.id === id);
export const lessonsInUnit = (unitId: string) => lessons.filter((l) => l.unit === unitId);
/** 1-based position in the whole course. */
export const lessonNumber = (id: string) => lessons.findIndex((l) => l.id === id) + 1;
