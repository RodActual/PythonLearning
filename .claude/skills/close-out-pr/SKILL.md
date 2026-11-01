---
name: close-out-pr
description: Use when a PR in this repo is ready to merge (add its task-list.md row inside it) and right after it merges (propose the Notion Tracker entry and finish the hub bookkeeping), in CLAUDE.md order.
---

# Close out a PR

Follow CLAUDE.md.

Before merge:

1. Add the PR's own row to `task-list.md` as the last commit on its branch, once the change is final: Date, Project, Change (start with "PR #N:"), reasoning, anticipated outcome. Cite the PR number only; the squash commit doesn't exist yet. Also add a row for any earlier merged PR that has none.

After merge:

2. Note the squash merge commit sha (this repo squash-merges; never cite branch commits). It goes in the Tracker, not in `task-list.md`.
3. Propose the Notion Tracker entry in one message: Type, Status, App relation (the PythonLearning App page), Project text, Notes with the PR number and merge commit. Write it only after the owner approves. For a hub decision or status change, name the page that needs updating and set Last reviewed to today after approval.
4. Never open a PR just to add a log row. If a merged PR was missed, its row rides in the next PR.
5. Never put passwords, API keys or account numbers in Notion, CLAUDE.md or the change log.
