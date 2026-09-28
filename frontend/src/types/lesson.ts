export interface TextStep {
  /** Permanent id, unique within its lesson. Progress is saved by this id, so never change or reuse it. */
  id: string;
  type: 'text';
  heading?: string;
  content: string;
  example_code?: string;
}

export interface QuizStep {
  /** Permanent id, unique within its lesson. Progress is saved by this id, so never change or reuse it. */
  id: string;
  type: 'quiz';
  question: string;
  options: string[];
  /** Omit for opinion questions where any option is accepted. */
  answer?: string;
  /** When present, this is a predict-the-output question about this code. */
  code?: string;
  /** Shown once the question is answered correctly. */
  explanation?: string;
  /** Per-option feedback shown when that wrong option is chosen. */
  feedback?: Record<string, string>;
}

export interface CodeStep {
  /** Permanent id, unique within its lesson. Progress is saved by this id, so never change or reuse it. */
  id: string;
  type: 'code';
  heading?: string;
  instruction: string;
  initial_code: string;
  /** Exact stdout the learner's code must print. */
  expected_output?: string;
  /** For "watch it crash" steps: the exception name the code must raise, e.g. "ZeroDivisionError". */
  expected_error?: string;
  /** Revealing it gives up the first-try bonus. */
  hint?: string;
}

export type Step = TextStep | QuizStep | CodeStep;

export interface Lesson {
  id: string;
  title: string;
  unit: string;
  summary?: string;
  /** Why this lesson matters in real projects. Shown before step 1. */
  why?: string;
  /** What the learner can do after finishing. Shown on the completion screen. */
  unlocks?: string;
  steps: Step[];
}

export interface Unit {
  id: string;
  title: string;
  description: string;
  icon: string;
  /** Skills this unit builds. */
  prepares: string[];
  /** Example programs a learner could build after the unit. */
  applications: string[];
}

export interface CareerPath {
  icon: string;
  title: string;
  description: string;
}

/** Course-level overview: outcomes, where the skills lead, and honest next steps. */
export interface CourseAbout {
  tagline: string;
  outcomes: string[];
  paths: CareerPath[];
  next_steps: string;
}

export interface Course {
  about: CourseAbout;
  units: Unit[];
  lessons: Lesson[];
}

/** lessonId -> ids of the steps the learner has completed. */
export type DoneSteps = Record<string, string[]>;

/** Learner progress as the app uses it. */
export interface UserProgress {
  done: DoneSteps;
  /** lessonId -> ids of quiz/code steps solved on the first attempt. */
  firstTry: DoneSteps;
}
