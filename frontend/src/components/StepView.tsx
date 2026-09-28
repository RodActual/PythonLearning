import { useId, useRef, useState } from 'react';
import Confetti from 'react-confetti';
import CodeSandbox from './CodeSandbox';
import RichText from './RichText';
import type { CourseAbout, Lesson, QuizStep, Step, Unit } from '../types/lesson';
import { stepReward } from '../game/xp';
import { useDocumentTitle, useFocusOnMount, usePrefersReducedMotion } from '../a11y/hooks';

interface StepViewProps {
  lesson: Lesson;
  stepIndex: number;
  /** True when this step was already completed earlier, so no XP is at stake. */
  alreadyCompleted: boolean;
  lessonXpEarned: number;
  unit?: Unit;
  unitComplete: boolean;
  courseComplete: boolean;
  about: CourseAbout;
  onNext: (firstTry: boolean) => void;
  onPrev: () => void;
  onBackToMenu: () => void;
  onRestart: () => void;
}

const stepLabel = (step: Step) =>
  step.type === 'text' ? 'Lesson' : step.type === 'code' ? 'Coding challenge' : step.code ? 'Predict the output' : 'Quiz';
const LETTERS = 'ABCDEFGH';

const CodeBlock = ({ code }: { code: string }) => (
  <pre className="code-block"><code>{code}</code></pre>
);

type CompletionProps = Pick<
  StepViewProps,
  'lesson' | 'lessonXpEarned' | 'unit' | 'unitComplete' | 'courseComplete' | 'about' | 'onBackToMenu' | 'onRestart'
>;

function CompletionScreen({ lesson, lessonXpEarned, unit, unitComplete, courseComplete, about, onBackToMenu, onRestart }: CompletionProps) {
  useDocumentTitle(`${lesson.title} complete`);
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const reducedMotion = usePrefersReducedMotion();
  return (
    <div className="completion-screen">
      {!reducedMotion && (
        <div aria-hidden="true">
          <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={400} />
        </div>
      )}
      <p className="completion-trophy" aria-hidden="true">🏆</p>
      <h2 ref={headingRef} tabIndex={-1}>Lesson complete!</h2>
      <p>You finished <strong>{lesson.title}</strong>.</p>
      <p className="completion-xp">{lessonXpEarned} XP earned in this lesson</p>

      <div className="completion-details">
        {lesson.unlocks && (
          <section className="completion-card" aria-labelledby="unlocks-heading">
            <h3 id="unlocks-heading"><span aria-hidden="true">🔓 </span>You can now</h3>
            <p>{lesson.unlocks}</p>
          </section>
        )}

        {unit && unitComplete && !courseComplete && (
          <section className="completion-card unit-card" aria-labelledby="unit-done-heading">
            <h3 id="unit-done-heading"><span aria-hidden="true">{unit.icon} </span>{unit.title} unit complete</h3>
            <p>With this unit behind you, you're ready to build programs like:</p>
            <ul>
              {unit.applications.map((a) => <li key={a}>{a}</li>)}
            </ul>
          </section>
        )}

        {courseComplete && (
          <section className="completion-card course-card" aria-labelledby="course-done-heading">
            <h3 id="course-done-heading"><span aria-hidden="true">🎓 </span>You finished the whole course</h3>
            <p>You now have the foundation for:</p>
            <ul>
              {about.paths.map((p) => (
                <li key={p.title}><strong>{p.title}.</strong> {p.description}</li>
              ))}
            </ul>
            <p>{about.next_steps}</p>
          </section>
        )}
      </div>

      <div className="completion-actions">
        <button type="button" onClick={onBackToMenu} className="primary-button">Back to the map</button>
        <button type="button" onClick={onRestart} className="secondary-button">Review lesson</button>
      </div>
    </div>
  );
}

function Quiz({ step, alreadyCompleted, onSolved }: { step: QuizStep; alreadyCompleted: boolean; onSolved: (firstTry: boolean) => void }) {
  const questionId = useId();
  const [selected, setSelected] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const attempts = useRef(0);

  const choose = (option: string) => {
    if (solved) return;
    attempts.current += 1;
    setSelected(option);
    const correct = step.answer === undefined || option.trim() === step.answer.trim();
    if (correct) {
      setSolved(true);
      onSolved(attempts.current === 1);
    }
  };

  const firstTry = attempts.current === 1;
  let feedback = '';
  if (solved) {
    feedback = step.answer === undefined ? 'Thanks for answering!' : 'Correct!';
    if (!alreadyCompleted) feedback += ` +${stepReward(step, firstTry)} XP${firstTry ? ' (includes first-try bonus)' : ''}`;
  } else if (selected) {
    const why = step.feedback?.[selected];
    feedback = `Not quite. ${why ?? `"${selected}" is not right.`} Try another answer.`;
  }

  return (
    <div className="quiz-section">
      {step.code && (
        <div className="predict-code">
          <p className="predict-label">Read this code:</p>
          <CodeBlock code={step.code} />
        </div>
      )}
      <p id={questionId} className="question-text"><RichText text={step.question} /></p>
      <div className="options-grid" role="group" aria-labelledby={questionId}>
        {step.options.map((option, i) => {
          const isSelected = selected === option;
          const state = isSelected ? (solved ? 'correct' : 'incorrect') : '';
          return (
            <button
              key={option}
              type="button"
              className={`option-button ${state}`}
              onClick={() => choose(option)}
              aria-pressed={isSelected}
              aria-disabled={solved || undefined}
            >
              <span className="option-letter" aria-hidden="true">{LETTERS[i]}</span>
              <span className="option-text">{option}</span>
              {state && (
                <span className="option-mark" aria-hidden="true">{state === 'correct' ? '✓' : '✗'}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className={`feedback ${solved ? 'feedback-good' : selected ? 'feedback-bad' : ''}`} role="status">
        {feedback && <p className="feedback-line">{feedback}</p>}
        {solved && step.explanation && (
          <p className="explanation"><strong>Why: </strong><RichText text={step.explanation} /></p>
        )}
      </div>
    </div>
  );
}

// Rendered with key={stepIndex} by the parent, so local state starts fresh on every step.
function StepView({
  lesson,
  stepIndex,
  alreadyCompleted,
  lessonXpEarned,
  unit,
  unitComplete,
  courseComplete,
  about,
  onNext,
  onPrev,
  onBackToMenu,
  onRestart,
}: StepViewProps) {
  const total = lesson.steps.length;
  const finished = stepIndex >= total;
  const step = finished ? null : lesson.steps[stepIndex];
  useDocumentTitle(step ? `${lesson.title}, step ${stepIndex + 1} of ${total}` : `${lesson.title} complete`);
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const hintId = useId();
  const [solved, setSolved] = useState<{ firstTry: boolean } | null>(null);

  if (!step) {
    return (
      <CompletionScreen
        lesson={lesson}
        lessonXpEarned={lessonXpEarned}
        unit={unit}
        unitComplete={unitComplete}
        courseComplete={courseComplete}
        about={about}
        onBackToMenu={onBackToMenu}
        onRestart={onRestart}
      />
    );
  }

  const canProceed = step.type === 'text' || solved !== null;
  const isLast = stepIndex === total - 1;
  const handleNext = () => {
    if (canProceed) onNext(solved?.firstTry ?? false);
  };
  const hint = step.type === 'quiz' ? 'Choose the correct answer to continue.' : 'Pass the challenge to continue.';

  return (
    <div className="lesson-view">
      <div className="top-controls">
        <button type="button" className="secondary-button" onClick={onBackToMenu}>
          <span aria-hidden="true">← </span>Map
        </button>
        <button type="button" className="secondary-button" onClick={onRestart}>Restart lesson</button>
      </div>

      <h2 className="lesson-title">{lesson.title}</h2>
      <div
        className="step-progress"
        role="progressbar"
        aria-label="Lesson progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={stepIndex}
        aria-valuetext={`Step ${stepIndex + 1} of ${total}`}
      >
        {lesson.steps.map((s, i) => (
          <span key={i} className={`seg seg-${s.type} ${i < stepIndex ? 'done' : i === stepIndex ? 'current' : ''}`} />
        ))}
      </div>

      {stepIndex === 0 && lesson.why && (
        <aside className="why-banner" aria-label="Why this lesson matters">
          <p className="why-title"><span aria-hidden="true">💡 </span>Why this matters</p>
          <p>{lesson.why}</p>
          {lesson.unlocks && <p className="why-unlocks"><strong>By the end:</strong> {lesson.unlocks}</p>}
        </aside>
      )}

      <div className={`step-card step-${step.type}`}>
        <h3 ref={headingRef} tabIndex={-1} className="step-heading">
          <span className="step-kicker">Step {stepIndex + 1} of {total} · {stepLabel(step)}</span>
          {step.type !== 'quiz' && step.heading && (
            <span className="step-heading-text"><span className="visually-hidden">: </span>{step.heading}</span>
          )}
        </h3>
        {!alreadyCompleted && step.type !== 'text' && (
          <p className="xp-stake">
            <span aria-hidden="true">⭐ </span>Worth {stepReward(step, false)} XP, {stepReward(step, true)} if solved on the first try
            {step.type === 'code' && step.hint ? ' without the hint' : ''}
          </p>
        )}

        {step.type === 'text' && (
          <div className="text-step">
            <p><RichText text={step.content} /></p>
            {step.example_code && <CodeBlock code={step.example_code} />}
          </div>
        )}

        {step.type === 'quiz' && (
          <Quiz step={step} alreadyCompleted={alreadyCompleted} onSolved={(firstTry) => setSolved({ firstTry })} />
        )}

        {step.type === 'code' && (
          <div className="code-section">
            <p className="task"><strong>Task:</strong> <RichText text={step.instruction} /></p>
            <CodeSandbox
              initialCode={step.initial_code}
              expectedOutput={step.expected_output}
              expectedError={step.expected_error}
              hint={step.hint}
              rewardText={alreadyCompleted ? undefined : (firstTry) => `+${stepReward(step, firstTry)} XP${firstTry ? ' (includes first-try bonus)' : ''}`}
              onPass={(firstTry) => setSolved((prev) => prev ?? { firstTry })}
            />
          </div>
        )}
      </div>

      <nav className="lesson-nav-controls" aria-label="Step navigation">
        <button type="button" onClick={onPrev} disabled={stepIndex === 0} className="secondary-button">
          <span aria-hidden="true">← </span>Previous
        </button>
        <div className="next-wrap">
          {!canProceed && <span id={hintId} className="next-hint">{hint}</span>}
          <button
            type="button"
            onClick={handleNext}
            className="primary-button"
            aria-disabled={!canProceed || undefined}
            aria-describedby={!canProceed ? hintId : undefined}
          >
            {isLast ? 'Finish lesson' : 'Next step'}<span aria-hidden="true"> →</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default StepView;
