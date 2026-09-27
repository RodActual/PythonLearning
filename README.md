# PythonLearning
A basic application that teaches Python.

## How it works
- React + TypeScript frontend (Vite) in `frontend/`.
- Lessons live in `frontend/src/data/lessons.json` and ship with the app. They are validated at startup (`src/data/lessons.ts`).
- Learner code runs in the browser with [Pyodide](https://pyodide.org) inside a Web Worker. Runs time out after 10 seconds.
- Firebase is used only for sign-in and saving progress (`user_progress/{uid}` in Firestore). Access rules are in `firestore.rules`.

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
Lessons live in `frontend/src/data/lessons.json`: a list of `units` and an ordered list of `lessons` (each with a `unit`). The course has 5 units and 20 lessons.

Step types:
- `text`: `heading`, `content` (supports `code` and **bold**), optional `example_code`
- `quiz`: `question`, `options`, `answer` (omit to accept any option), `explanation`, optional `feedback` per wrong option, optional `code` (makes it a predict-the-output question)
- `code`: `heading`, `instruction`, `initial_code` (starter, never the solution), `expected_output` or `expected_error`, `hint`

Every coding step needs a reference solution in `frontend/tests/solutions.json`, keyed `lessonId:stepIndex`. Run `npm run check:lessons` (needs Python) after editing: it runs every solution, confirms starters don't already pass, and checks that predict-the-output answers match what the code really prints.

**Progress is saved by lesson id and step index.** Never rename a lesson id or insert/remove steps in a lesson people may have started; edit steps in place or add a new lesson instead.

## Deploy
Vercel reads `vercel.json`, builds `frontend/`, and serves `frontend/dist`. Set the `VITE_FIREBASE_*` environment variables in the Vercel project.
