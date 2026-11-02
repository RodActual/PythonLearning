---
name: close-out-pr
description: Use when a PR in this repo is ready to merge (add its task-list.md row inside it) and right after it merges (check the row landed, propose the Notion Tracker entry, finish the hub bookkeeping).
---

# Close out a PR

Follow CLAUDE.md.

Before merge:

1. Once the change is final, merge `origin/main` into the branch, then add the PR's own row to the end of `task-list.md` as the last commit: Date, Project, Change (start with "PR #N:"), reasoning, anticipated outcome. Cite the PR number only; the squash commit belongs in the Tracker. Also add a row for any earlier merged PR that has none.
2. If any commit lands after the row (review fix, CI fix, main merge), re-read the row and update it so it still describes what will merge.

After merge:

3. Check that the PR's row is on `main`. If it is missing, add it in the next PR's step 1. Never open a PR just to add a log row.
4. Note the squash merge commit sha (this repo squash-merges; never cite branch commits). It goes in the Tracker, not in `task-list.md`.
5. Propose the Notion Tracker entry in one message: Type, Status, App relation (the PythonLearning App page), Project text, Notes with the PR number and merge commit. Write it only after the owner approves. For a hub decision or status change, name the page that needs updating and set Last reviewed to today after approval.
6. Never put passwords, API keys or account numbers in Notion, CLAUDE.md or the change log.
