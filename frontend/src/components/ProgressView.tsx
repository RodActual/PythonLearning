import type { CourseAbout as About, Lesson, Unit, UserProgress } from '../types/lesson';
import type { GameSummary } from '../game/summary';
import { BADGES } from '../game/badges';
import CourseAbout from './CourseAbout';
import MasteryGoal from './MasteryGoal';
import NeedsWork from './NeedsWork';
import { useDocumentTitle, useFocusOnMount } from '../a11y/hooks';

interface ProgressViewProps {
  about: About;
  units: Unit[];
  lessons: Lesson[];
  progress: UserProgress;
  summary: GameSummary;
  onOpenLesson: (lessonId: string) => void;
  onOpenStep: (lessonId: string, stepId: string) => void;
  onOpenTrophies: () => void;
  onResetAll: () => void;
}

/** Everything about how the course is going, kept off the map so the map stays about what to do next. */
const ProgressView = ({ about, units, lessons, progress, summary, onOpenLesson, onOpenStep, onOpenTrophies, onResetAll }: ProgressViewProps) => {
  useDocumentTitle('Progress');
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const nothingDone = Object.values(progress.done).every((ids) => ids.length === 0);

  return (
    <div className="progress-view">
      <h2 ref={headingRef} tabIndex={-1}>Your Progress</h2>

      <MasteryGoal units={units} lessons={lessons} progress={progress} onOpenStep={onOpenStep} />

      <NeedsWork
        units={units}
        lessons={lessons}
        progress={progress}
        onOpenLesson={onOpenLesson}
        onOpenStep={onOpenStep}
        defaultOpen={Object.keys(progress.pretest).length > 0}
      />

      <section className="trophy-summary" aria-labelledby="trophy-summary-heading">
        <div>
          <h3 id="trophy-summary-heading" className="goal-title">
            <span aria-hidden="true">🏆 </span>Trophies
          </h3>
          <p className="muted">
            {summary.badges.length} of {BADGES.length} earned
          </p>
        </div>
        <button type="button" className="secondary-button" onClick={onOpenTrophies}>View trophy case</button>
      </section>

      <CourseAbout about={about} defaultOpen={nothingDone} />

      <section className="danger-zone" aria-labelledby="danger-zone-heading">
        <h3 id="danger-zone-heading">Start over</h3>
        <p className="muted">Erase every lesson, XP point, trophy, and review card. This can't be undone.</p>
        <button type="button" onClick={onResetAll} className="danger-button">Reset all progress</button>
      </section>
    </div>
  );
};

export default ProgressView;
