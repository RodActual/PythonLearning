# CLAUDE.md

## Second brain
This repo's App page: https://app.notion.com/p/3f7e5083a1bf8169aa57c1a78a595f89 (Apps database, "PythonLearning")

The Notion page "Business Context" is the source of truth for my business, clients, and apps. Hub: https://app.notion.com/p/3f7e5083a1bf81b69bf7f021c148bd9b
Databases: Apps collection://5a43a83c-f228-4f7e-bfbf-255515a2b15b, Clients collection://96f37541-085a-4787-9d4b-c7108115b2b0, Playbooks collection://87a40bae-6b9e-4643-91ea-364392b60393, Web App Tracker collection://58778dc7-a02b-48ae-a3ad-4900ce8d8500.

Session start: use the Notion connector to fetch this repo's App page (linked above) and its linked Playbooks before the first change. This repo is an App, not a Client, so skip the Clients database. Read the Constraints, Next up, and Key decisions sections, and open Tracker items for this app. Do not ask me for context the hub already holds. If the Notion connector is unavailable, say so in one line and continue without it; do not block on it.

Conflicts: my latest statement wins over the hub and memory. Name any stale page. Ignore Archived pages. Treat an old Last reviewed date as possibly outdated.

Hub updates: when work produces a decision, scope change, status change, or new dependency, say in one line which page needs updating. After I approve, write the update and set Last reviewed to today yourself.

Tracker: at the end of a session, propose Tracker entries for features, bugs, and tasks with the App relation and Project text set. Write after I approve. Reference the PR number in Notes, plus the merge commit on main once it has merged. This repo squash-merges, so branch commits do not survive on main; do not cite them.

Boundaries: code and technical detail stay in this repo. The Apps page holds the why and links here. Do not copy hub content into the repo. `task-list.md` in this repo is a technical change log (date, project, change, reasoning, anticipated outcome), not a second Tracker: add a row to it in the change after a PR merges, never inside the PR it describes, and the Tracker stays the record of features, bugs, and tasks. Never put passwords, API keys, or account numbers in Notion or in this file.
