import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { arrayUnion, deleteField, doc, FieldPath, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { about, getLesson, getUnit, lessons, units } from './data/lessons';
import type { PretestResult, UserProgress } from './types/lesson';
import { summarize, type GameSummary } from './game/summary';
import { BADGES } from './game/badges';
import { lessonXp, LESSON_COMPLETE_BONUS } from './game/xp';
import {
  EMPTY_PROGRESS,
  PROGRESS_VERSION,
  fromDoc,
  isCoreDone,
  isLessonComplete,
  isStepDone,
  resumeIndex,
  toDoc,
  withStepDone,
  withoutLesson,
  type ProgressDoc,
} from './game/progress';
import { reportError } from './monitoring';
import { dueItems, nextCard, reviewItems } from './game/review';
import SkillMap from './components/SkillMap';
import AuthForm from './components/AuthForm';
import ThemeToggle from './components/ThemeToggle';
import Hud from './components/Hud';
import Toasts, { type Toast } from './components/Toasts';
import ErrorBoundary from './components/ErrorBoundary';
import SaveStatus, { type SaveState } from './components/SaveStatus';
import NotFound from './components/NotFound';
import { toHash, useHashRoute, type Route } from './router';

// Loaded on demand so the first page (sign-in and map) downloads less.
const StepView = lazy(() => import('./components/StepView'));
const TrophyCase = lazy(() => import('./components/TrophyCase'));
const ReviewView = lazy(() => import('./components/ReviewView'));
const Playground = lazy(() => import('./components/Playground'));
const PretestView = lazy(() => import('./components/PretestView'));
const ProgressView = lazy(() => import('./components/ProgressView'));

const USER_PROGRESS_COLLECTION = 'user_progress';
const TOAST_MS = 6000;

const NAV: { route: Route; icon: string; label: string; covers: Route['name'][] }[] = [
  { route: { name: 'home' }, icon: '🗺️', label: 'Learning path', covers: ['home', 'lesson', 'pretest'] },
  { route: { name: 'review' }, icon: '🔁', label: 'Review', covers: ['review'] },
  { route: { name: 'progress' }, icon: '📈', label: 'Progress', covers: ['progress', 'trophies'] },
  { route: { name: 'playground' }, icon: '🧪', label: 'Playground', covers: ['playground'] },
];

const Loading = () => (
  <div className="loading-state" role="status">
    Loading…
  </div>
);

const LoadFailed = ({ onSignOut }: { onSignOut: () => void }) => (
  <div className="loading-state" role="alert">
    <p>Your saved progress couldn't be loaded, so nothing is shown that could overwrite it.</p>
    <p>
      <button type="button" className="secondary-button" onClick={() => window.location.reload()}>Try again</button>{' '}
      <button type="button" className="secondary-button" onClick={onSignOut}>Log out</button>
    </p>
  </div>
);

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Set when saved progress can't be loaded. The map stays hidden so empty progress is never shown as real.
  const [loadFailed, setLoadFailed] = useState(false);
  // The signed-in user whose progress has arrived, so a repeat sign-in callback doesn't reset the app.
  const readyUid = useRef<string | null>(null);
  const [route, navigate] = useHashRoute();
  const [progress, setProgress] = useState<UserProgress>(EMPTY_PROGRESS);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  // Mirrors progress so callbacks always see the latest value.
  const progressRef = useRef<UserProgress>(EMPTY_PROGRESS);
  const toastId = useRef(0);
  const hasSaved = useRef(false);

  const summary = summarize(lessons, progress);
  const reviewsDue = dueItems(reviewItems(lessons, progress)).length;
  const currentLesson = route.name === 'lesson' ? getLesson(route.lessonId) : undefined;
  const pretestUnit = route.name === 'pretest' ? getUnit(route.unitId) : undefined;
  const homeUnit = route.name === 'home' && route.unitId ? getUnit(route.unitId) : undefined;
  // The URL step is 1-based; one past the last step is the completion screen.
  const stepIndex =
    currentLesson && route.name === 'lesson' && route.step
      ? Math.min(route.step - 1, currentLesson.steps.length)
      : currentLesson
        ? resumeIndex(progress, currentLesson)
        : 0;
  // Ids in the URL that match nothing (an old bookmark or a typo) get a "not found" page.
  const notFound =
    route.name === 'not-found' ||
    (route.name === 'lesson' && (!currentLesson || (route.step ?? 0) > currentLesson.steps.length + 1)) ||
    (route.name === 'pretest' && !pretestUnit) ||
    (route.name === 'home' && !!route.unitId && !homeUnit);

  const applyProgress = (next: UserProgress) => {
    progressRef.current = next;
    setProgress(next);
  };

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const pushToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = ++toastId.current;
      setToasts((t) => [...t, { ...toast, id }]);
      setTimeout(() => dismissToast(id), TOAST_MS);
    },
    [dismissToast],
  );

  const announceRewards = useCallback(
    (before: GameSummary, after: GameSummary, completedLessonTitle?: string) => {
      if (completedLessonTitle) {
        pushToast({ tone: 'xp', icon: '🏁', title: `Lesson complete: ${completedLessonTitle}`, detail: `+${LESSON_COMPLETE_BONUS} XP bonus` });
      }
      if (after.level.level > before.level.level) {
        pushToast({ tone: 'level', icon: '⬆️', title: `Level up! Level ${after.level.level}`, detail: `You are now a ${after.level.title}.` });
      }
      for (const id of after.badges.filter((b) => !before.badges.includes(b))) {
        const badge = BADGES.find((b) => b.id === id);
        if (badge) pushToast({ tone: 'badge', icon: badge.icon, title: `Trophy unlocked: ${badge.name}`, detail: badge.description });
      }
    },
    [pushToast],
  );

  /** Writes to Firestore and surfaces failures instead of only logging them. */
  const write = useCallback((op: Promise<unknown>, context: string) => {
    hasSaved.current = true;
    setSaveState(navigator.onLine ? 'saving' : 'offline');
    op.catch((error) => {
      setSaveState('error');
      reportError(error, { context });
    });
  }, []);

  // --- ONLINE / OFFLINE ---
  useEffect(() => {
    const update = () => {
      if (!hasSaved.current) return;
      setSaveState((s) => (!navigator.onLine ? 'offline' : s === 'offline' ? 'saving' : s));
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // --- AUTH + LIVE PROGRESS (with one-time migration of old progress) ---
  useEffect(() => {
    let unsubscribeProgress: (() => void) | undefined;
    let giveUp: ReturnType<typeof setTimeout> | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      unsubscribeProgress?.();
      unsubscribeProgress = undefined;
      clearTimeout(giveUp);
      setUser(currentUser);
      hasSaved.current = false;
      setSaveState('idle');

      if (!currentUser) {
        // Signing out drops the old place, so the next sign-in starts on the map, not someone's lesson step.
        if (readyUid.current) navigate({ name: 'home' }, { replace: true });
        readyUid.current = null;
        applyProgress(EMPTY_PROGRESS);
        setLoadFailed(false);
        setLoading(false);
        return;
      }

      // Keep the loading screen until saved progress arrives, so the map never flashes as empty.
      // If Firestore stays silent (offline with nothing cached), say so instead of showing empty progress.
      if (readyUid.current !== currentUser.uid) {
        setLoadFailed(false);
        setLoading(true);
        giveUp = setTimeout(() => {
          setLoadFailed(true);
          setLoading(false);
        }, 8000);
      }

      const ref = doc(db, USER_PROGRESS_COLLECTION, currentUser.uid);
      let migrated = false;
      unsubscribeProgress = onSnapshot(
        ref,
        { includeMetadataChanges: true },
        (snap) => {
          const { progress: next, needsMigration } = fromDoc(snap.data() as ProgressDoc | undefined);
          // A cache-only snapshot with no document may just mean this device has nothing cached yet:
          // wait for the server's answer rather than showing empty progress.
          if (snap.metadata.fromCache && !snap.exists()) return;
          applyProgress(next);
          clearTimeout(giveUp);
          readyUid.current = currentUser.uid;
          setLoadFailed(false);
          setLoading(false);
          if (needsMigration && !migrated) {
            // Rewrite old position-based progress as step ids. Old fields stay for rollback.
            migrated = true;
            setDoc(ref, toDoc(next), { merge: true }).catch((error) => reportError(error, { context: 'migrate progress' }));
          }
          if (hasSaved.current) {
            if (snap.metadata.hasPendingWrites) setSaveState(navigator.onLine ? 'saving' : 'offline');
            else setSaveState((s) => (s === 'error' ? s : 'saved'));
          }
        },
        (error) => {
          clearTimeout(giveUp);
          if (readyUid.current !== currentUser.uid) setLoadFailed(true);
          setLoading(false);
          setSaveState('error');
          reportError(error, { context: 'progress listener' });
        },
      );
    });

    return () => {
      clearTimeout(giveUp);
      unsubscribeProgress?.();
      unsubscribeAuth();
    };
  }, [navigate]);

  // --- PROGRESS SAVING (each step counts once, so XP can't be farmed by replaying) ---
  const completeStep = useCallback(
    (lessonId: string, stepId: string, firstTry: boolean) => {
      if (!user) return;
      const prev = progressRef.current;
      if (isStepDone(prev, lessonId, stepId)) return;

      const next = withStepDone(prev, lessonId, stepId, firstTry);
      applyProgress(next);

      const lesson = getLesson(lessonId);
      // Only the step that finishes the core counts; optional steps after it don't re-announce.
      // A tested-out lesson still announces when its core is worked through, since that earns the bonus.
      const justFinished = lesson && !isCoreDone(prev, lesson) && isCoreDone(next, lesson) ? lesson.title : undefined;
      announceRewards(summarize(lessons, prev), summarize(lessons, next), justFinished);

      const update: Record<string, unknown> = {
        version: PROGRESS_VERSION,
        done: { [lessonId]: arrayUnion(stepId) },
      };
      if (firstTry) update.first_try_ids = { [lessonId]: arrayUnion(stepId) };
      write(setDoc(doc(db, USER_PROGRESS_COLLECTION, user.uid), update, { merge: true }), 'save step');
    },
    [user, announceRewards, write],
  );

  /** Saves one scheduled review answer (spaced repetition). */
  const recordReview = useCallback(
    (key: string, correct: boolean) => {
      if (!user) return;
      const card = nextCard(progressRef.current.review[key], correct);
      applyProgress({ ...progressRef.current, review: { ...progressRef.current.review, [key]: card } });
      write(
        setDoc(doc(db, USER_PROGRESS_COLLECTION, user.uid), { version: PROGRESS_VERSION, review: { [key]: card } }, { merge: true }),
        'save review',
      );
    },
    [user, write],
  );

  /** Saves a finished pretest. Each lesson's latest result replaces its previous one. */
  const savePretest = useCallback(
    (results: Record<string, PretestResult>) => {
      if (!user) return;
      const prev = progressRef.current;
      const next = { ...prev, pretest: { ...prev.pretest, ...results } };
      applyProgress(next);
      announceRewards(summarize(lessons, prev), summarize(lessons, next));
      write(
        setDoc(doc(db, USER_PROGRESS_COLLECTION, user.uid), { version: PROGRESS_VERSION, pretest: results }, { merge: true }),
        'save pretest',
      );
    },
    [user, announceRewards, write],
  );

  const resetLessonProgress = (lessonId: string) => {
    if (!user) return;
    const title = getLesson(lessonId)?.title ?? 'this lesson';
    if (!window.confirm(`Reset your progress for ${title}? The XP from this lesson will be removed.`)) return;

    applyProgress(withoutLesson(progressRef.current, lessonId));
    write(
      updateDoc(
        doc(db, USER_PROGRESS_COLLECTION, user.uid),
        new FieldPath('done', lessonId),
        deleteField(),
        new FieldPath('first_try_ids', lessonId),
        deleteField(),
        new FieldPath('pretest', lessonId),
        deleteField(),
      ),
      'reset lesson',
    );
  };

  const resetAllProgress = () => {
    if (!user) return;
    if (!window.confirm('This permanently erases ALL your progress, XP, and trophies. Are you sure?')) return;

    applyProgress(EMPTY_PROGRESS);
    // No merge: replaces the whole document, including any old-format fields.
    write(setDoc(doc(db, USER_PROGRESS_COLLECTION, user.uid), toDoc(EMPTY_PROGRESS)), 'reset all');
  };

  // --- NAVIGATION ---
  // A lesson URL without a step resolves to where the learner left off, so refresh and Back land there.
  // So does a link to the completion screen of a lesson whose core isn't done, so a URL can't fake a finish.
  useEffect(() => {
    if (loading || !user || route.name !== 'lesson' || !currentLesson) return;
    const fakeFinish = route.step === currentLesson.steps.length + 1 && !isCoreDone(progressRef.current, currentLesson);
    if (!route.step || fakeFinish) {
      navigate({ ...route, step: resumeIndex(progressRef.current, currentLesson) + 1 }, { replace: true });
    }
  }, [loading, user, route, currentLesson, navigate]);

  // New page: start at the top. Steps within a lesson and unit switches on the map handle their own focus.
  const pageKey =
    route.name === 'lesson'
      ? `lesson:${route.lessonId}`
      : route.name === 'pretest'
        ? `pretest:${route.unitId}`
        : route.name === 'home'
          ? `home:${route.unitId ?? ''}`
          : route.name;
  // The map keeps one error boundary across unit switches, so a unit change doesn't remount it.
  const boundaryKey = route.name === 'home' ? 'home' : pageKey;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pageKey]);

  const openLesson = (lessonId: string) => {
    const lesson = getLesson(lessonId);
    if (!lesson) return;
    navigate({ name: 'lesson', lessonId, step: resumeIndex(progressRef.current, lesson) + 1 });
  };

  const openStep = (lessonId: string, stepId: string) => {
    const lesson = getLesson(lessonId);
    const index = lesson?.steps.findIndex((s) => s.id === stepId) ?? -1;
    if (!lesson || index === -1) return;
    navigate({ name: 'lesson', lessonId, step: index + 1 });
  };

  // Steps replace the history entry, so Back leaves the lesson instead of stepping through it.
  const goToStep = (index: number) => {
    if (!currentLesson) return;
    navigate({ name: 'lesson', lessonId: currentLesson.id, step: Math.max(0, Math.min(index, currentLesson.steps.length)) + 1 }, { replace: true });
  };

  const nextStep = (firstTry: boolean) => {
    if (!currentLesson) return;
    const step = currentLesson.steps[stepIndex];
    if (step) completeStep(currentLesson.id, step.id, firstTry);
    goToStep(stepIndex + 1);
  };

  const prevStep = () => goToStep(stepIndex - 1);

  /** Moves past an optional (deep-dive or mastery) step without completing it. */
  const skipStep = () => goToStep(stepIndex + 1);

  // Moves the cursor only; saved progress and XP are kept.
  const restartLesson = () => {
    if (window.confirm('Restart this lesson from step 1? Your saved progress and XP are kept.')) {
      goToStep(0);
      window.scrollTo(0, 0);
    }
  };

  const startOver = () => {
    goToStep(0);
    window.scrollTo(0, 0);
  };

  const goHome = () => navigate({ name: 'home' });

  // Trophies open from the stats bar on any page, so Back returns there (e.g. mid-lesson) instead of to Progress.
  const trophiesOpenedInApp = useRef(false);
  const openTrophies = () => {
    trophiesOpenedInApp.current = true;
    navigate({ name: 'trophies' });
  };
  const leaveTrophies = () => {
    if (trophiesOpenedInApp.current) window.history.back();
    else navigate({ name: 'progress' });
  };
  /** Back to the map, showing the unit the learner was working in. */
  const backToUnit = (unitId: string) => () => navigate({ name: 'home', unitId });

  if (loading) return <Loading />;
  if (loadFailed) return <LoadFailed onSignOut={() => signOut(auth)} />;

  const currentStep = currentLesson?.steps[stepIndex];

  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <div className="app-shell">
        <header className="app-header">
          <h1 className="app-title">Python Learning Path</h1>
          <div className="user-info">
            <ThemeToggle />
            {user && (
              <>
                <span className="user-email">{user.email}</span>
                <button type="button" onClick={() => signOut(auth)} className="secondary-button">Log out</button>
              </>
            )}
          </div>
        </header>

        {user && (
          <>
            <Hud summary={summary} totalLessons={lessons.length} onOpenTrophies={openTrophies} />
            <nav className="main-nav" aria-label="Main">
              <ul>
                {NAV.map(({ route: target, icon, label, covers }) => {
                  const current = covers.includes(route.name);
                  return (
                    <li key={label}>
                      <a
                        href={toHash(target)}
                        className={`nav-tab${current ? ' active' : ''}`}
                        aria-current={current ? 'page' : undefined}
                        onClick={(e) => {
                          // Let modified clicks open a new tab or window as usual.
                          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                          // Always lands on the page's start, even when already there (e.g. back to the default unit).
                          e.preventDefault();
                          navigate(target);
                        }}
                      >
                        <span aria-hidden="true">{icon} </span>
                        {label}
                        {target.name === 'review' && reviewsDue > 0 && (
                          <span className="nav-badge">
                            {reviewsDue}
                            <span className="visually-hidden"> due</span>
                          </span>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <SaveStatus state={saveState} />
          </>
        )}

        <main id="main" className="app-main" tabIndex={-1}>
          <ErrorBoundary key={notFound ? 'not-found' : boundaryKey} onReset={goHome}>
            <Suspense fallback={<Loading />}>
              {!user ? (
                <AuthForm />
              ) : notFound ? (
                <NotFound onGoHome={goHome} />
              ) : route.name === 'trophies' ? (
                <TrophyCase earned={summary.badges} onBack={leaveTrophies} />
              ) : route.name === 'progress' ? (
                <ProgressView
                  about={about}
                  units={units}
                  lessons={lessons}
                  progress={progress}
                  summary={summary}
                  onOpenLesson={openLesson}
                  onOpenStep={openStep}
                  onOpenTrophies={openTrophies}
                  onResetAll={resetAllProgress}
                />
              ) : route.name === 'review' ? (
                <ReviewView lessons={lessons} progress={progress} onResult={recordReview} onBackToMap={goHome} />
              ) : route.name === 'playground' ? (
                <Playground uid={user.uid} onBackToMap={goHome} />
              ) : pretestUnit ? (
                <PretestView
                  unit={pretestUnit}
                  lessons={lessons}
                  progress={progress}
                  onFinish={savePretest}
                  onOpenLesson={openLesson}
                  onOpenStep={openStep}
                  onBackToMap={backToUnit(pretestUnit.id)}
                />
              ) : currentLesson ? (
                <StepView
                  key={`${currentLesson.id}:${stepIndex}`}
                  lesson={currentLesson}
                  stepIndex={stepIndex}
                  alreadyCompleted={!!currentStep && isStepDone(progress, currentLesson.id, currentStep.id)}
                  lessonXpEarned={lessonXp(currentLesson, progress)}
                  unit={getUnit(currentLesson.unit)}
                  unitComplete={lessons.filter((l) => l.unit === currentLesson.unit).every((l) => isLessonComplete(progress, l))}
                  courseComplete={lessons.every((l) => isCoreDone(progress, l))}
                  about={about}
                  onNext={nextStep}
                  onSkip={skipStep}
                  onPrev={prevStep}
                  onBackToMenu={backToUnit(currentLesson.unit)}
                  onRestart={restartLesson}
                  onStartOver={startOver}
                />
              ) : (
                <SkillMap
                  about={about}
                  units={units}
                  lessons={lessons}
                  progress={progress}
                  selectedUnitId={homeUnit?.id}
                  onOpenLesson={openLesson}
                  onResetLesson={resetLessonProgress}
                  reviewsDue={reviewsDue}
                  onOpenReview={() => navigate({ name: 'review' })}
                  onOpenPretest={(unitId) => navigate({ name: 'pretest', unitId })}
                />
              )}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export default App;
