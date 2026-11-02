import { useEffect, useRef } from 'react';
import type { Lesson, Unit, UserProgress } from '../types/lesson';
import { toHash } from '../router';
import { pretestLessons } from '../game/pretest';
import { lessonState, recommendedLessonIndex, type LessonState } from '../game/summary';
import { lessonXp } from '../game/xp';
import { doneCount, isCoreDone, isStepDone, isTestedOut, resumeIndex } from '../game/progress';
import { useDocumentTitle, useFocusOnMount } from '../a11y/hooks';

interface SkillMapProps {
  units: Unit[];
  lessons: Lesson[];
  progress: UserProgress;
  /** Unit chosen in the URL; otherwise the unit holding the next lesson. */
  selectedUnitId?: string;
  onOpenLesson: (lessonId: string) => void;
  onResetLesson: (lessonId: string) => void;
  reviewsDue: number;
  onOpenReview: () => void;
  onOpenPretest: (unitId: string) => void;
}

const ROW = 216; // px between nodes
const NODE_Y = 44; // center of the node circle within a row
const ZIGZAG = [50, 70, 80, 70, 50, 30, 20, 30]; // horizontal position, % of width

const STATE_LABEL: Record<LessonState, string> = {
  completed: 'Completed',
  'in-progress': 'In progress',
  'not-started': 'Not started',
};

function ProgressRing({ fraction }: { fraction: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg className="node-ring" viewBox="0 0 76 76" aria-hidden="true" focusable="false">
      <circle className="ring-track" cx="38" cy="38" r={r} />
      <circle
        className="ring-fill"
        cx="38"
        cy="38"
        r={r}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - fraction)}
        transform="rotate(-90 38 38)"
      />
    </svg>
  );
}

interface UnitPathProps {
  lessons: Lesson[];
  allLessons: Lesson[];
  progress: UserProgress;
  recommendedId?: string;
  onOpenLesson: (lessonId: string) => void;
  onResetLesson: (lessonId: string) => void;
}

/** One unit's winding path of lesson nodes. */
function UnitPath({ lessons, allLessons, progress, recommendedId, onOpenLesson, onResetLesson }: UnitPathProps) {
  const height = lessons.length * ROW;
  const points = lessons.map((_, i) => `${ZIGZAG[i % ZIGZAG.length]},${i * ROW + NODE_Y}`);

  return (
    <div className="skill-map" style={{ height }}>
      <svg className="map-path" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        {points.slice(1).map((pt, i) => (
          <polyline
            key={i}
            points={`${points[i]} ${pt}`}
            className={lessonState(lessons[i], progress) === 'completed' ? 'path-done' : 'path-todo'}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <ol className="map-nodes">
        {lessons.map((lesson, i) => {
          const state = lessonState(lesson, progress);
          const reached = doneCount(progress, lesson);
          const resumeAt = resumeIndex(progress, lesson);
          // Tested out without working through the core: shown as done, with a full ring.
          const testedOutOnly = state === 'completed' && isTestedOut(progress, lesson.id) && !isCoreDone(progress, lesson);
          const optional = lesson.steps.filter((s) => s.track);
          const optionalDone = optional.filter((s) => isStepDone(progress, lesson.id, s.id)).length;
          const isNext = lesson.id === recommendedId;
          const number = allLessons.indexOf(lesson) + 1;
          const xp = lessonXp(lesson, progress);
          return (
            <li
              key={lesson.id}
              className={`map-node state-${state}${isNext ? ' is-next' : ''}`}
              style={{ top: i * ROW, ['--x' as string]: `${ZIGZAG[i % ZIGZAG.length]}%` }}
              aria-current={isNext ? 'step' : undefined}
            >
              <button type="button" className="node-button" onClick={() => onOpenLesson(lesson.id)}>
                <span className="node-circle" aria-hidden="true">
                  <ProgressRing fraction={testedOutOnly ? 1 : reached / lesson.steps.length} />
                  <span className="node-number">{state === 'completed' ? '✓' : number}</span>
                </span>
                <span className="node-label">
                  <span className="node-title">{number}. {lesson.title}</span>
                  <span className="node-status">
                    {isNext && <span className="chip chip-next">Up next</span>}
                    {state === 'in-progress'
                      ? `Step ${resumeAt + 1} of ${lesson.steps.length}`
                      : testedOutOnly
                        ? 'Tested out'
                        : STATE_LABEL[state]}
                    {state === 'completed' && optional.length > 0 && optionalDone < optional.length && (
                      <> · Deep dive {optionalDone}/{optional.length}</>
                    )}
                    {xp > 0 && <> · {xp} XP</>}
                  </span>
                </span>
              </button>
              {(state !== 'not-started' || progress.pretest[lesson.id]) && (
                <button
                  type="button"
                  className="node-reset"
                  onClick={() => onResetLesson(lesson.id)}
                  aria-label={`Reset progress for ${lesson.title}`}
                >
                  Reset
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const SkillMap = ({ units, lessons, progress, selectedUnitId, onOpenLesson, onResetLesson, reviewsDue, onOpenReview, onOpenPretest }: SkillMapProps) => {
  useDocumentTitle('Learning path');
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const recommended = recommendedLessonIndex(lessons, progress);
  const next = recommended >= 0 ? lessons[recommended] : null;

  const unitIndex = Math.max(0, units.findIndex((u) => u.id === (selectedUnitId ?? next?.unit)));
  const unit = units[unitIndex];
  const unitLessons = lessons.filter((l) => l.unit === unit.id);
  const doneIn = (u: Unit) => lessons.filter((l) => l.unit === u.id && lessonState(l, progress) === 'completed').length;
  const totalIn = (u: Unit) => lessons.filter((l) => l.unit === u.id).length;
  const done = doneIn(unit);
  const complete = done === unitLessons.length;
  // The unit trophy needs every core worked through, not just tested out.
  const trophy = unitLessons.every((l) => isCoreDone(progress, l));
  const canTestOut = pretestLessons(unit, lessons, progress).length;
  const headingId = `unit-${unit.id}`;
  const prevUnit = units[unitIndex - 1];
  const nextUnit = units[unitIndex + 1];

  // Switching units moves focus to the new unit's heading, so keyboard and screen-reader users land on it.
  const unitHeadingRef = useRef<HTMLHeadingElement>(null);
  const shownUnit = useRef(unit.id);
  useEffect(() => {
    if (shownUnit.current === unit.id) return;
    shownUnit.current = unit.id;
    unitHeadingRef.current?.focus();
  }, [unit.id]);

  const unitLabel = (u: Unit) => `Unit ${units.indexOf(u) + 1}: ${u.title}`;

  return (
    <div className="skill-map-view">
      <h2 ref={headingRef} tabIndex={-1}>Your Learning Path</h2>

      {next ? (
        <div className="continue-card">
          <div>
            <p className="eyebrow">Up next</p>
            <p className="continue-title">{recommended + 1}. {next.title}</p>
            {next.summary && <p className="continue-summary">{next.summary}</p>}
          </div>
          <button type="button" className="primary-button" onClick={() => onOpenLesson(next.id)}>
            {doneCount(progress, next) > 0 ? 'Continue' : 'Start'}
            <span className="visually-hidden">: {next.title}</span>
          </button>
        </div>
      ) : (
        <div className="continue-card done">
          <p className="continue-title"><span aria-hidden="true">🎓 </span>You finished every lesson. Replay any lesson to review.</p>
        </div>
      )}

      {reviewsDue > 0 && (
        <div className="review-card">
          <p>
            <span aria-hidden="true">🔁 </span>
            <strong>{reviewsDue}</strong> review {reviewsDue === 1 ? 'card is' : 'cards are'} due. A quick review helps you remember earlier lessons.
          </p>
          <button type="button" className="secondary-button" onClick={onOpenReview}>Start review</button>
        </div>
      )}

      <nav className="unit-picker" aria-label="Units">
        <ol>
          {units.map((u, i) => {
            const d = doneIn(u);
            const n = totalIn(u);
            const current = u.id === unit.id;
            return (
              <li key={u.id}>
                <a
                  href={toHash({ name: 'home', unitId: u.id })}
                  className={`unit-tab${current ? ' active' : ''}${d === n ? ' done' : ''}`}
                  aria-current={current ? 'page' : undefined}
                >
                  <span className="unit-tab-icon" aria-hidden="true">{u.icon}</span>
                  <span className="unit-tab-text">
                    <span className="unit-tab-meta">
                      <span className="unit-tab-eyebrow">Unit {i + 1}</span>
                      <span className="unit-tab-count">
                        {d === n ? <span aria-hidden="true">✓ </span> : null}
                        {d}/{n}
                        <span className="visually-hidden"> lessons complete</span>
                      </span>
                    </span>
                    <span className="unit-tab-title">{u.title}</span>
                  </span>
                  <span className="unit-tab-bar" aria-hidden="true">
                    <span style={{ width: `${(d / n) * 100}%` }} />
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      <section className={`unit${complete ? ' unit-done' : ''}`} aria-labelledby={headingId}>
        <div className="unit-header">
          <span className="unit-icon" aria-hidden="true">{unit.icon}</span>
          <div className="unit-text">
            <p className="eyebrow">Unit {unitIndex + 1} of {units.length}</p>
            <h3 id={headingId} ref={unitHeadingRef} tabIndex={-1} className="unit-title">{unit.title}</h3>
            <p className="unit-desc">{unit.description}</p>
            <details className="unit-details">
              <summary>What this unit prepares you for</summary>
              <div className="unit-details-body">
                <div>
                  <h4 className="about-heading">You'll learn to</h4>
                  <ul>
                    {unit.prepares.map((p) => <li key={p}>{p}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="about-heading">Programs you could build</h4>
                  <ul>
                    {unit.applications.map((a) => <li key={a}>{a}</li>)}
                  </ul>
                </div>
              </div>
            </details>
          </div>
          <p className="unit-progress">
            {done} of {unitLessons.length} lessons complete
            {trophy && <span className="chip chip-done">Trophy earned</span>}
          </p>
          {canTestOut > 0 && (
            <button type="button" className="secondary-button unit-pretest" onClick={() => onOpenPretest(unit.id)}>
              Take the pretest<span className="visually-hidden">: {unit.title}</span>
            </button>
          )}
        </div>
        <UnitPath
          lessons={unitLessons}
          allLessons={lessons}
          progress={progress}
          recommendedId={next?.id}
          onOpenLesson={onOpenLesson}
          onResetLesson={onResetLesson}
        />
      </section>

      {(prevUnit || nextUnit) && (
        <nav className="unit-pager" aria-label="Previous and next unit">
          {prevUnit ? (
            <a className="secondary-button" href={toHash({ name: 'home', unitId: prevUnit.id })}>
              <span aria-hidden="true">← </span>
              <span className="visually-hidden">Previous: </span>
              {unitLabel(prevUnit)}
            </a>
          ) : <span />}
          {nextUnit && (
            <a className="secondary-button" href={toHash({ name: 'home', unitId: nextUnit.id })}>
              <span className="visually-hidden">Next: </span>
              {unitLabel(nextUnit)}
              <span aria-hidden="true"> →</span>
            </a>
          )}
        </nav>
      )}
    </div>
  );
};

export default SkillMap;
