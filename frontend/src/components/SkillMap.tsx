import type { CourseAbout as About, Lesson, Unit, UserProgress } from '../types/lesson';
import CourseAbout from './CourseAbout';
import { lessonState, recommendedLessonIndex, type LessonState } from '../game/summary';
import { lessonXp } from '../game/xp';
import { doneCount, resumeIndex } from '../game/progress';
import { useDocumentTitle, useFocusOnMount } from '../a11y/hooks';

interface SkillMapProps {
  about: About;
  units: Unit[];
  lessons: Lesson[];
  progress: UserProgress;
  onOpenLesson: (lessonId: string) => void;
  onResetLesson: (lessonId: string) => void;
  reviewsDue: number;
  onOpenReview: () => void;
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
                  <ProgressRing fraction={reached / lesson.steps.length} />
                  <span className="node-number">{state === 'completed' ? '✓' : number}</span>
                </span>
                <span className="node-label">
                  <span className="node-title">{number}. {lesson.title}</span>
                  <span className="node-status">
                    {isNext && <span className="chip chip-next">Up next</span>}
                    {state === 'in-progress' ? `Step ${resumeAt + 1} of ${lesson.steps.length}` : STATE_LABEL[state]}
                    {xp > 0 && <> · {xp} XP</>}
                  </span>
                </span>
              </button>
              {state !== 'not-started' && (
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

const SkillMap = ({ about, units, lessons, progress, onOpenLesson, onResetLesson, reviewsDue, onOpenReview }: SkillMapProps) => {
  useDocumentTitle('Learning path');
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const recommended = recommendedLessonIndex(lessons, progress);
  const next = recommended >= 0 ? lessons[recommended] : null;

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

      <CourseAbout about={about} defaultOpen={Object.values(progress.done).every((ids) => ids.length === 0)} />

      {units.map((unit, u) => {
        const unitLessons = lessons.filter((l) => l.unit === unit.id);
        const done = unitLessons.filter((l) => lessonState(l, progress) === 'completed').length;
        const complete = done === unitLessons.length;
        const headingId = `unit-${unit.id}`;
        return (
          <section key={unit.id} className={`unit${complete ? ' unit-done' : ''}`} aria-labelledby={headingId}>
            <div className="unit-header">
              <span className="unit-icon" aria-hidden="true">{unit.icon}</span>
              <div className="unit-text">
                <p className="eyebrow">Unit {u + 1}</p>
                <h3 id={headingId} className="unit-title">{unit.title}</h3>
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
                {complete && <span className="chip chip-done">Trophy earned</span>}
              </p>
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
        );
      })}
    </div>
  );
};

export default SkillMap;
