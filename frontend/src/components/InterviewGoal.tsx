import type { Lesson, Unit, UserProgress } from '../types/lesson';
import { interviewByUnit, nextInterviewStep } from '../game/goal';

interface InterviewGoalProps {
  units: Unit[];
  lessons: Lesson[];
  progress: UserProgress;
  onOpenStep: (lessonId: string, stepId: string) => void;
}

/** Goal: land a technical job. Interview challenge progress by unit, and the next one to try. */
const InterviewGoal = ({ units, lessons, progress, onOpenStep }: InterviewGoalProps) => {
  const rows = interviewByUnit(units, lessons, progress);
  const solved = rows.reduce((n, r) => n + r.done, 0);
  const total = rows.reduce((n, r) => n + r.total, 0);
  const next = nextInterviewStep(lessons, progress);

  return (
    <section className="goal-card" aria-labelledby="goal-heading">
      <p className="eyebrow">Goal</p>
      <h3 id="goal-heading" className="goal-title">Land a technical job</h3>
      <p className="goal-summary">
        {solved} of {total} interview challenges solved
      </p>
      <ul className="goal-list">
        {rows.map((r) => (
          <li key={r.unit.id} className="goal-row">
            <span className="goal-area">{r.area}</span>
            <progress className="goal-bar" max={r.total} value={r.done} aria-label={`${r.area}: ${r.done} of ${r.total} solved`} />
            <span className="goal-count">{r.done}/{r.total}</span>
          </li>
        ))}
      </ul>
      {next ? (
        <div className="goal-next">
          <p>
            <strong>Next interview challenge: </strong>
            {next.step.heading} <span className="goal-lesson">({next.lesson.title})</span>
          </p>
          <button type="button" className="secondary-button" onClick={() => onOpenStep(next.lesson.id, next.step.id)}>
            Try it<span className="visually-hidden">: {next.step.heading}</span>
          </button>
        </div>
      ) : (
        <p className="goal-next">Every interview challenge is solved.</p>
      )}
    </section>
  );
};

export default InterviewGoal;
