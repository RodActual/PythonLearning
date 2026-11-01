import type { Lesson, Unit, UserProgress } from '../types/lesson';
import { needsWork, questionLabel } from '../game/pretest';

interface NeedsWorkProps {
  units: Unit[];
  lessons: Lesson[];
  progress: UserProgress;
  onOpenLesson: (lessonId: string) => void;
  onOpenStep: (lessonId: string, stepId: string) => void;
  /** Starts open; the map opens it once a pretest has been taken. */
  defaultOpen?: boolean;
  title?: string;
  /** Level of each unit's heading, so it follows the page outline (h4 on the map under the h3 cards). */
  unitHeadingLevel?: 3 | 4;
}

/** What is left per unit: unfinished lessons, with pretest misses listed first in each lesson. */
const NeedsWork = ({ units, lessons, progress, onOpenLesson, onOpenStep, defaultOpen = false, title = 'What still needs work', unitHeadingLevel = 4 }: NeedsWorkProps) => {
  const UnitHeading = unitHeadingLevel === 3 ? 'h3' : 'h4';
  const rows = needsWork(units, lessons, progress).filter((r) => r.items.length > 0);
  const left = rows.reduce((n, r) => n + r.items.length, 0);

  return (
    <details className="needs-work" open={defaultOpen}>
      <summary>
        <span className="needs-work-title">{title}</span>
        <span className="needs-work-count">
          {left === 0 ? 'Nothing left' : `${left} ${left === 1 ? 'lesson' : 'lessons'} to go`}
        </span>
      </summary>
      {left === 0 ? (
        <p className="needs-work-empty">Every lesson is complete or tested out.</p>
      ) : (
        rows.map(({ unit, items, testedOut }) => (
          <section key={unit.id} className="needs-work-unit" aria-label={unit.title}>
            <UnitHeading className="about-heading">
              <span aria-hidden="true">{unit.icon} </span>
              {unit.title}
              {testedOut > 0 && <span className="needs-work-meta"> · {testedOut} tested out</span>}
            </UnitHeading>
            <ul className="needs-work-list">
              {items.map(({ lesson, missed, coreDone, coreTotal }) => (
                <li key={lesson.id} className={missed.length ? 'work-missed' : undefined}>
                  <div className="work-text">
                    <span className="work-title">{lesson.title}</span>
                    <span className="work-meta">
                      {missed.length > 0
                        ? `Missed ${missed.length} pretest ${missed.length === 1 ? 'question' : 'questions'}`
                        : coreDone > 0
                          ? `${coreDone} of ${coreTotal} core steps done`
                          : 'Not started'}
                    </span>
                    {missed.length > 0 && (
                      <ul className="work-missed-list">
                        {missed.map((s) => <li key={s.id}>{questionLabel(s)}</li>)}
                      </ul>
                    )}
                  </div>
                  {missed.length > 0 ? (
                    <button type="button" className="secondary-button" onClick={() => onOpenStep(lesson.id, missed[0].id)}>
                      Practice<span className="visually-hidden">: {lesson.title}, first missed question</span>
                    </button>
                  ) : (
                    <button type="button" className="secondary-button" onClick={() => onOpenLesson(lesson.id)}>
                      {coreDone > 0 ? 'Continue' : 'Start'}<span className="visually-hidden">: {lesson.title}</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </details>
  );
};

export default NeedsWork;
