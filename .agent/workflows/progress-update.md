---
description: >
  Update progress.md after completing a task or significant code change.
  ALWAYS run this workflow after finishing a feature, fixing a bug, making
  an architecture decision, or ending a development session. If you just
  committed code and haven't updated progress.md, run this now.
---

## Why This Exists

Documentation drift — where docs describe a past version of the code — was the #1 reason a real project was rejected by reviewers. `progress.md` prevents this by being the single file that always reflects current state. But it only works if it's actually updated.

## Steps

1. Read `progress.md` in the project root.
2. Move any finished items from **In Progress** → **Completed Features** (mark with `[x]`).
3. Add any new work items to **In Progress**.
4. If you encountered or created bugs/tech debt, add them to **Known Issues**.
5. If the architecture changed (new module, moved responsibilities, changed transaction boundaries), update the **Current Architecture** table.
6. If a key design decision was made, add a row to **Architecture Decisions** with rationale and today's date.
7. Update the **Status** emoji if the project phase changed:
   - 🟡 Setup → 🔵 Development → 🟢 Complete → 🔴 Blocked

## Rules

- **One line per entry.** Keep entries concise — this is a dashboard, not a journal.
- **Never create separate phase summaries.** All status lives here.
- **Never reference development phases** ("Phase 3") — use feature names.
