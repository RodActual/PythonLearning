export interface TextStep {
  type: 'text';
  heading?: string;
  content: string;
  example_code?: string;
}

export interface QuizStep {
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
  steps: Step[];
}

export interface Unit {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface Course {
  units: Unit[];
  lessons: Lesson[];
}

/** lessonId -> index of the furthest step reached (steps.length means completed). */
export type Progress = Record<string, number>;

/** lessonId -> indices of quiz/code steps solved on the first attempt. */
export type FirstTry = Record<string, number[]>;

/** Shape of the user_progress/{uid} document in Firestore. */
export interface UserProgress {
  completed_steps: Progress;
  first_try: FirstTry;
}
