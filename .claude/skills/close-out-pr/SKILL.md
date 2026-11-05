---
name: close-out-pr
description: Use when a PR in this repo is ready to merge (add its task-list.md row inside it) and right after it merges (check the row landed, close the PR's issues, update the second-brain app page).
---

# Close out a PR

Follow CLAUDE.md.

Before merge:

1. Once the change is final, merge `origin/main` into the branch, then add the PR's own row to the end of `task-list.md` as the last commit: Date, Project, Change (start with "PR #N:"), reasoning, anticipated outcome. Cite the PR number only; the squash commit belongs in the closing comment on the issue. Also add a row for any earlier merged PR that has none.
2. If any commit lands after the row (review fix, CI fix, main merge), re-read the row and update it so it still describes what will merge.

After merge:

3. Check that the PR's row is on `main`. If it is missing, add it in the next PR's step 1. Never open a PR just to add a log row.
4. Note the squash merge commit sha (this repo squash-merges; never cite branch commits). It goes in the issue's closing comment, not in `task-list.md`.
5. Close each issue in this repo that the PR resolves as completed, with a one-line comment citing the PR number and merge commit. If the work had no issue, open one (`type:` and `priority:` labels) and close it the same way. If the PR changed status, scope, a decision or Next up, update `apps/pythonlearning.md` in RodActual/second-brain right away and set Last reviewed to today.
6. Never put passwords, API keys, tokens or account numbers in issues, second-brain, CLAUDE.md or the change log.
