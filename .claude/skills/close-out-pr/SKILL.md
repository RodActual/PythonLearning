---
name: close-out-pr
description: Use right after a PR in this repo merges, to add the task-list.md row, propose the Notion Tracker entry, and finish the hub bookkeeping in CLAUDE.md order.
---

# Close out a merged PR

Follow CLAUDE.md. Order after a merge:

1. Fetch `origin/main`, branch from it. Note the squash merge commit sha (this repo squash-merges; never cite branch commits).
2. Add rows to `task-list.md` for the merged PR and for any earlier merged PR that has no row yet: Date, Project, Change, reasoning, anticipated outcome. The row goes in this follow-up change, never inside the PR it describes.
3. Push, open a draft PR, subscribe to it. It needs the owner's approval to merge, like any other PR.
4. Propose the Notion Tracker entry in one message: Type, Status, App relation (the PythonLearning App page), Project text, Notes with the PR number and merge commit. Write it only after the owner approves. For a hub decision or status change, name the page that needs updating and set Last reviewed to today after approval.
5. Never put passwords, API keys or account numbers in Notion, CLAUDE.md or the change log.
