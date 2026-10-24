---
name: retheme-units
description: Use when changing the theme or context of optional exercises (deep-dive and interview steps) in this repo's lessons, or adding a new unit's optional steps. Covers the swap, build, check, browser walk and PR order.
---

# Re-theme or extend lesson exercises

Tools live in `tools/lesson-authoring/` (read its README). Keep step ids, order and kinds unchanged so saved progress is unaffected. Change only context: instruction, starter, solution, hint and tiers. Leave core steps and classic interview problems alone. The repo is public, so keep employer names, salaries and posting details out of lesson content.

Order, per unit:

1. Branch from `origin/main`. Show the sources to change with `show.py`.
2. Write a `SWAP` file and apply it with `python3 -I tools/lesson-authoring/swap.py lessons/X.py NEW.py`. Write swap files with the Write tool, not through Python strings, or escapes double up.
3. Rebuild only those lessons: `python3 tools/lesson-authoring/build.py frontend lesson-id ...`.
4. From `frontend/`: `npm run check`, then the feedback audit, then the browser walk of the changed lessons, then the full `npx playwright test`.
5. Verify only the intended lessons differ from `origin/main` (compare `lessons.json` by lesson id and `solutions.json` by key prefix).
6. Commit, push, open a draft PR. Do not merge without explicit approval.

Rules the checker enforces: the starter must not already pass; tier examples must run and must not contain the solution; text examples need `how` and `use`. When two PRs both regenerate `lessons.json`, merge main into the branch, take main's `solutions.json` (`git checkout --theirs`), rebuild that unit, and re-verify the diff scope.

After merge, follow the `close-out-pr` skill.
