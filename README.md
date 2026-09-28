# PythonLearning
A basic application that teaches Python.

## How it works
- React + TypeScript frontend (Vite) in `frontend/`.
- Lessons live in `frontend/src/data/lessons.json` and ship with the app. They are validated at startup (`src/data/lessons.ts`).
- Learner code runs in the browser with [Pyodide](https://pyodide.org) inside a Web Worker. Runs time out after 10 seconds.
- Firebase is used only for sign-in and saving progress (`user_progress/{uid}` in Firestore). Access rules are in `firestore.rules`.

## Review and Playground
- **Review** (`src/game/review.ts`): every completed quiz and coding challenge becomes a spaced-repetition card (Leitner boxes). Right on the first try moves a card up a box (next review in 3, 7, 14, then 30 days); a miss sends it back to tomorrow. Sessions show up to 10 due cards, at most 3 of them coding challenges, mixed across lessons. The schedule is saved in the progress document's `review` field. "Practice anyway" never changes the schedule.
- **Playground** (`src/components/Playground.tsx`): a free-form editor with runnable examples (`src/data/playground-examples.ts`). Code is saved in the browser's localStorage per account; no grading or XP.

## Game layer
- XP is derived from saved progress (`src/game/xp.ts`), so replaying a lesson can't farm it and resetting a lesson removes exactly what it earned. Steps are worth 5 (text), 10 (quiz), 20 (code), with first-try bonuses of +5/+10 and +50 per finished lesson.
- Levels and titles come from total XP. Trophies are defined in `src/game/badges.ts`.
- Firestore stores `completed_steps` and `first_try` (step indices solved on the first attempt) per user.
- The lesson map recommends the first unfinished lesson but every lesson stays open.

## Accessibility
Target: WCAG 2.1/2.2 AA. Skip link, landmarks, one focus target per view (headings receive focus on navigation), unique page titles, live-region feedback for quizzes, code runs and rewards, visible focus rings, 44px buttons, reduced-motion support (no confetti or pulsing), forced-colors support, and reflow down to 320px. The code editor uses Tab for indenting; Esc then Tab leaves it. `npm run check:contrast` verifies the palette.

## Development
```bash
cd frontend
npm install
npm run dev        # copies the Pyodide runtime into public/pyodide, then starts Vite
npm run typecheck
npm run lint
npm run build
```
`frontend/.env` needs the `VITE_FIREBASE_*` values from your Firebase project.

## Editing lessons
Lessons live in `frontend/src/data/lessons.json`: an `about` block, a list of `units`, and an ordered list of `lessons` (each with a `unit`). The course has 5 units and 20 lessons.

Learner-facing guidance about what the course prepares people for:
- `about`: `tagline`, `outcomes`, `paths` (where the skills lead, e.g. automation, data, web), and `next_steps`. Shown under the sign-in form and at the top of the map.
- Each unit: `prepares` (skills) and `applications` (example programs). Shown in the unit header and when a unit is finished.
- Each lesson: `why` (shown before step 1) and `unlocks` (shown on the completion screen).

Step types:
- `text`: `heading`, `content` (supports `code` and **bold**), optional `example_code`
- `quiz`: `question`, `options`, `answer` (omit to accept any option), `explanation`, optional `feedback` per wrong option, optional `code` (makes it a predict-the-output question)
- `code`: `heading`, `instruction`, `initial_code` (starter, never the solution), `expected_output` or `expected_error`, `hint`

Every coding step needs a reference solution in `frontend/tests/solutions.json`, keyed `lessonId:stepId`. Run `npm run check:lessons` (needs Python) after editing: it runs every solution, confirms starters don't already pass, and checks that predict-the-output answers match what the code really prints.

**Progress is saved by lesson id and step id.** Every step has a permanent `id` (unique within its lesson). You can add, remove, and reorder steps freely; never rename a lesson id, and never change or reuse a step id. Progress saved before step ids existed is migrated automatically using `frontend/src/data/legacy-step-ids.json`, which must never be edited.

## Testing
From `frontend/`:
- `npm run check`: type check, lint, color contrast, and lesson checks (needs Python).
- `npm run test:e2e`: Playwright browser tests with automated accessibility (axe) checks. They use an in-memory Firebase (`e2e/mocks`), so no accounts or network are needed. First time only: `npx playwright install chromium`.

From `firestore-tests/`: `npm test` runs the security-rule tests against the Firestore emulator (needs Java 21).

GitHub Actions (`.github/workflows/ci.yml`) runs all of the above on every push and pull request. Dependabot (`.github/dependabot.yml`) opens weekly dependency update PRs.

## Reliability features
- Progress is cached offline and syncs when the connection returns; a status line shows Saving, Saved, Offline, or a save error.
- A crash in one screen shows a recovery screen instead of a blank page.
- Learner code is stopped after 10 seconds or 100,000 characters of output.
- Optional, off unless configured: Firebase App Check (`VITE_RECAPTCHA_SITE_KEY`) and Sentry error monitoring (`VITE_SENTRY_DSN`).

## Deploy
Vercel reads `vercel.json`, builds `frontend/` with Node 22 (see `.nvmrc` and `engines`), and serves `frontend/dist`. Set the `VITE_FIREBASE_*` environment variables in the Vercel project. The Python runtime is served from `/pyodide/<version>/` and cached for a year; a Pyodide upgrade changes the path. Deploy `firestore.rules` from the Firebase console (or `firebase deploy --only firestore:rules`) whenever it changes.
