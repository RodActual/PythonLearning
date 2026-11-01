import type { Lesson, Unit, UserProgress } from '../types/lesson';
import { masteryByUnit, nextMasteryStep } from '../game/goal';

interface MasteryGoalProps {
  units: Unit[];
  lessons: Lesson[];
  progress: UserProgress;
  onOpenStep: (lessonId: string, stepId: string) => void;
}

/** Goal: master Python. Mastery challenge progress by unit, and the next one to try. */
const MasteryGoal = ({ units, lessons, progress, onOpenStep }: MasteryGoalProps) => {
  const rows = masteryByUnit(units, lessons, progress).filter((r) => r.total > 0);
  const solved = rows.reduce((n, r) => n + r.done, 0);
  const total = rows.reduce((n, r) => n + r.total, 0);
  const next = nextMasteryStep(lessons, progress);

  return (
    <section className="goal-card" aria-labelledby="goal-heading">
      <p className="eyebrow">Goal</p>
      <h3 id="goal-heading" className="goal-title">Master the language</h3>
      <p className="goal-summary">
        {solved} of {total} mastery challenges solved
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
            <strong>Next mastery challenge: </strong>
            {next.step.heading} <span className="goal-lesson">({next.lesson.title})</span>
          </p>
          <button type="button" className="secondary-button" onClick={() => onOpenStep(next.lesson.id, next.step.id)}>
            Try it<span className="visually-hidden">: {next.step.heading}</span>
          </button>
        </div>
      ) : (
        <p className="goal-next">Every mastery challenge is solved.</p>
      )}
    </section>
  );
};

export default MasteryGoal;
