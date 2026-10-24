# Lesson authoring tools

Optional steps (deep-dive `d01..`, interview `i01..`) are authored as Python in `lessons/*.py` and built into `frontend/src/data/lessons.json` and `frontend/tests/solutions.json`. Rebuilding with no edits reproduces the committed data.

- `build.py <frontend dir> [lesson ids]`: rebuild those lessons (all if none given). Expected output is computed by running each reference solution.
- `swap.py LESSON.py NEW.py`: replace whole steps, keyed by old heading. `NEW.py` holds `SWAP = {'old heading': '''C(...)'''}`.
- `show.py LESSON.py "heading" ...`: print step sources.
- `walk.spec.ts`: Playwright walk of whole lessons. Copy to `frontend/e2e/`, run with `WALK=id1,id2 npx playwright test e2e/walk.spec.ts --workers=3`, then delete the copy.
- `feedback-audit.ts`: runs every starter through the feedback engine. Copy `frontend/src/python/feedback.ts` next to it first (git-ignored), then `node --experimental-strip-types --no-warnings feedback-audit.ts frontend/src/data/lessons.json`.

Run Python with `python3 -I`.
