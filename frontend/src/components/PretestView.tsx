import { useId, useState } from 'react';
import type { Lesson, PretestResult, Unit, UserProgress } from '../types/lesson';
import { buildPretest, pretestLessons, questionLabel, scorePretest, type PretestItem } from '../game/pretest';
import { today } from '../game/review';
import { useDocumentTitle, useFocusOnMount } from '../a11y/hooks';
import Quiz from './Quiz';
import CodeSandbox from './CodeSandbox';
import RichText from './RichText';
import NeedsWork from './NeedsWork';

interface PretestViewProps {
  unit: Unit;
  lessons: Lesson[];
  progress: UserProgress;
  /** Saves per-lesson results once the pretest is finished. */
  onFinish: (results: Record<string, PretestResult>) => void;
  onOpenLesson: (lessonId: string) => void;
  onOpenStep: (lessonId: string, stepId: string) => void;
  onBackToMap: () => void;
}

type Phase =
  | { name: 'intro' }
  | { name: 'session'; items: PretestItem[] }
  | { name: 'results'; items: PretestItem[]; answers: boolean[]; results: Record<string, PretestResult> };

function Intro({ unit, lessons, progress, onStart, onBackToMap }: {
  unit: Unit;
  lessons: Lesson[];
  progress: UserProgress;
  onStart: (items: PretestItem[]) => void;
  onBackToMap: () => void;
}) {
  useDocumentTitle(`Pretest: ${unit.title}`);
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const open = pretestLessons(unit, lessons, progress);

  return (
    <div className="review-intro">
      <h2 ref={headingRef} tabIndex={-1}>Pretest: {unit.title}</h2>
      <p className="muted">
        Already know this? Answer a few core questions from each lesson you haven't finished. Get every question for a
        lesson right on the first try and you test out of it: it counts as complete and you can skip ahead. Anything you
        miss shows up in your "What still needs work" list.
      </p>
      {open.length === 0 ? (
        <div className="review-empty">
          <p>Every lesson in this unit is already complete.</p>
          <button type="button" className="primary-button" onClick={onBackToMap}>Back to the map</button>
        </div>
      ) : (
        <div className="review-start">
          <p className="review-count">
            Covers <strong>{open.length}</strong> {open.length === 1 ? 'lesson' : 'lessons'}: {open.map((l) => l.title).join(', ')}.
          </p>
          <button type="button" className="primary-button" onClick={() => onStart(buildPretest(open))}>Start pretest</button>
          <p className="muted small">Testing out earns no XP. You can still do any lesson later for its XP.</p>
        </div>
      )}
      <button type="button" className="secondary-button" onClick={onBackToMap}>
        <span aria-hidden="true">← </span>Back to the map
      </button>
    </div>
  );
}

function Session({ items, onFinish, onQuit }: {
  items: PretestItem[];
  onFinish: (answers: boolean[]) => void;
  onQuit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [outcome, setOutcome] = useState<boolean | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const hintId = useId();
  const item = items[index];
  useDocumentTitle(`Pretest question ${index + 1} of ${items.length}`);

  const record = (right: boolean) => {
    const all = [...answers, right];
    setAnswers(all);
    setOutcome(null);
    if (index + 1 >= items.length) onFinish(all);
    else setIndex(index + 1);
  };

  const { step } = item;
  return (
    <div className="review-session">
      <h2 className="visually-hidden">Pretest</h2>
      <div className="top-controls">
        <button type="button" className="secondary-button" onClick={onQuit}>
          <span aria-hidden="true">← </span>Quit pretest
        </button>
        <span className="chip chip-next">Pretest</span>
      </div>
      <div
        className="step-progress"
        role="progressbar"
        aria-label="Pretest progress"
        aria-valuemin={0}
        aria-valuemax={items.length}
        aria-valuenow={index}
        aria-valuetext={`Question ${index + 1} of ${items.length}`}
      >
        {items.map((_, i) => (
          <span key={i} className={`seg ${i < index ? 'done' : i === index ? 'current' : ''}`} />
        ))}
      </div>
      <QuestionCard key={index} item={item} index={index} total={items.length} onAnswered={setOutcome} />
      <nav className="lesson-nav-controls" aria-label="Pretest navigation">
        {outcome === null ? (
          <button type="button" className="secondary-button" onClick={() => record(false)}>
            I don't know this yet
          </button>
        ) : (
          <span />
        )}
        <div className="next-wrap">
          {outcome === null && (
            <span id={hintId} className="next-hint">
              {step.type === 'quiz' ? 'Choose an answer to continue.' : 'Pass the challenge or skip it.'}
            </span>
          )}
          <button
            type="button"
            className="primary-button"
            aria-disabled={outcome === null || undefined}
            aria-describedby={outcome === null ? hintId : undefined}
            onClick={() => outcome !== null && record(outcome)}
          >
            {index + 1 >= items.length ? 'See results' : 'Next question'}<span aria-hidden="true"> →</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function QuestionCard({ item, index, total, onAnswered }: {
  item: PretestItem;
  index: number;
  total: number;
  onAnswered: (right: boolean) => void;
}) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const { step, lesson } = item;
  return (
    <div className={`step-card step-${step.type}`}>
      <h3 ref={headingRef} tabIndex={-1} className="step-heading">
        <span className="step-kicker">
          Question {index + 1} of {total} · {step.type === 'code' ? 'Coding challenge' : step.code ? 'Predict the output' : 'Quiz'}
        </span>
        <span className="review-source">From: {lesson.title}</span>
      </h3>
      {step.type === 'quiz' ? (
        <Quiz step={step} onSolved={onAnswered} />
      ) : (
        <div className="code-section">
          <p className="task"><strong>Task:</strong> <RichText text={step.instruction} /></p>
          {/* A pass counts however many runs it took; the hint is left out so it can't give the answer away. */}
          <CodeSandbox
            initialCode={step.initial_code}
            expectedOutput={step.expected_output}
            expectedError={step.expected_error}
            onPass={() => onAnswered(true)}
          />
        </div>
      )}
    </div>
  );
}

function Results({ unit, lessons, progress, items, answers, results, onOpenLesson, onOpenStep, onBackToMap }: {
  unit: Unit;
  lessons: Lesson[];
  progress: UserProgress;
  items: PretestItem[];
  answers: boolean[];
  results: Record<string, PretestResult>;
  onOpenLesson: (lessonId: string) => void;
  onOpenStep: (lessonId: string, stepId: string) => void;
  onBackToMap: () => void;
}) {
  useDocumentTitle(`Pretest results: ${unit.title}`);
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const tested = lessons.filter((l) => results[l.id]);
  const passed = tested.filter((l) => results[l.id].missed.length === 0);
  const right = answers.filter(Boolean).length;

  return (
    <div className="review-summary">
      <h2 ref={headingRef} tabIndex={-1}>Pretest results</h2>
      <p className="completion-xp">
        {right} of {answers.length} right · tested out of {passed.length} of {tested.length} {tested.length === 1 ? 'lesson' : 'lessons'}
      </p>
      <ul className="review-results">
        {tested.map((l) => {
          const missed = results[l.id].missed;
          return (
            <li key={l.id} className={missed.length ? 'result-missed' : 'result-right'}>
              <span aria-hidden="true">{missed.length ? '↻ ' : '✓ '}</span>
              <span className="visually-hidden">{missed.length ? 'Needs work: ' : 'Tested out: '}</span>
              <span className="result-title">{l.title}</span>
              <span className="result-meta">
                {missed.length
                  ? `Missed: ${items.filter((i) => i.lesson.id === l.id && missed.includes(i.step.id)).map((i) => questionLabel(i.step)).join(' · ')}`
                  : 'Tested out, counts as complete'}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="pretest-needs-work">
        {/* Just this unit here; the map shows the whole course. */}
        <NeedsWork
          units={[unit]}
          unitHeadingLevel={3}
          title={`What still needs work in ${unit.title}`}
          lessons={lessons}
          progress={progress}
          onOpenLesson={onOpenLesson}
          onOpenStep={onOpenStep}
          defaultOpen
        />
      </div>
      <div className="completion-actions">
        <button type="button" className="primary-button" onClick={onBackToMap}>Back to the map</button>
      </div>
    </div>
  );
}

const PretestView = ({ unit, lessons, progress, onFinish, onOpenLesson, onOpenStep, onBackToMap }: PretestViewProps) => {
  const [phase, setPhase] = useState<Phase>({ name: 'intro' });

  if (phase.name === 'session') {
    return (
      <Session
        items={phase.items}
        onFinish={(answers) => {
          const results = scorePretest(phase.items, answers, today());
          onFinish(results);
          setPhase({ name: 'results', items: phase.items, answers, results });
        }}
        onQuit={() => setPhase({ name: 'intro' })}
      />
    );
  }
  if (phase.name === 'results') {
    return (
      <Results
        unit={unit}
        lessons={lessons}
        progress={progress}
        items={phase.items}
        answers={phase.answers}
        results={phase.results}
        onOpenLesson={onOpenLesson}
        onOpenStep={onOpenStep}
        onBackToMap={onBackToMap}
      />
    );
  }
  return (
    <Intro unit={unit} lessons={lessons} progress={progress} onStart={(items) => setPhase({ name: 'session', items })} onBackToMap={onBackToMap} />
  );
};

export default PretestView;
