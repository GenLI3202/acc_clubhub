# AGENTS.md

## Project

ACC ClubHub — Astro 5 (SSG) · Preact · TypeScript · FastAPI · PostgreSQL (Neon) · Vercel.

Cycling club platform for Across Cycling Club Munich. Multilingual (zh/en/de). Static frontend + separate FastAPI backend for event registration.

## Key Decisions

- **Email-based registration (no OAuth)**: Lower friction for event sign-ups; GDPR simpler without social login.
- **FastAPI as separate Vercel deployment**: Decoupled from static frontend; independent scaling and deployment.
- **Waline over Giscus for comments**: Giscus requires GitHub account (friction for Chinese users); Waline self-hosted, no account needed.
- **pg8000 over psycopg2**: Pure Python driver — works on Vercel's serverless runtime without native libs.
- **Transaction boundary in API layer**: FastAPI route handlers own commit/rollback; services stay pure.

## Commands

```bash
# Frontend (run from frontend/)
npm run dev          # dev server at http://localhost:4321
npm run build        # production build
npm run test         # unit tests (Vitest)
npm run test:e2e     # E2E tests (Playwright)
npm run test:all     # check + test + build
npm run check        # TypeScript/Astro type checking

# Backend (run from backend/)
uvicorn app:app --reload --port 8000   # dev server at http://localhost:8000
pytest                                  # run tests
pytest --cov                            # with coverage
ruff check .                            # lint
ruff format .                           # format
mypy .                                  # type check
```

---

# General Rules

- Before doing broad codebase searches, ask the user for the specific file path or location if the search isn't immediately productive. Do not spend more than 2 tool calls searching for a file without asking.

---

# Project Setup

- This project primarily uses Python and TypeScript. When scaffolding new projects, prefer manual file creation over interactive CLI tools (e.g., `npm create vite`) as they often stall in non-interactive environments.

---

# Bug Fixes

- When fixing bugs, always verify the fix works locally before considering it complete. If the fix cannot be verified locally (e.g., production-only issue), explicitly state that and suggest creating a tracking issue.

---

# Code Changes

- When making multi-file changes, verify that new files are placed in the correct directories and won't be picked up by content globs or build tools unintentionally. Double-check database table names and migration scripts before running them.

---

# Coding Style

> Rules for AI coding assistants. Follow strictly.

## Naming

| Element        | Style                   | Example                 |
| -------------- | ----------------------- | ----------------------- |
| Classes        | `PascalCase`          | `CustomerService`     |
| Functions/Vars | `snake_case`          | `get_account_by_id`   |
| Constants      | `UPPER_SNAKE`         | `MAX_RETRY_COUNT`     |
| Files          | `snake_case`          | `transfer_service.py` |
| Private        | `_leading_underscore` | `_validate_balance`   |

## Formatting

- **88 chars** max line length
- **4 spaces** indent (no tabs)
- **Double quotes** `"` for strings
- **Trailing commas** in multi-line structures

## Type Safety

- Type hints on **all** function signatures (params + return)
- **Never** use `# type: ignore` without a justification comment on the same line
- **Never** use `hasattr()` as a substitute for `isinstance()` — check the actual type

## Layer Separation

- Shared utility/helper functions **MUST NOT** live in route/handler/view files
- Database transaction boundaries (`commit`/`rollback`) must be in ONE consistent layer — this project uses the **API layer** (route handlers)
- Error handling must be consistent: use **domain exceptions**, not raw `HTTPException` in service code

## Documentation

- Comments must describe **current** functionality only
- **No references to development phases** ("Phase 3", "added for consistency", "TODO: future")
- Docstrings: `"""` brief summary, then Args/Returns/Raises sections

## Progress Tracking

- Update `progress.md` after completing each task
- `progress.md` is the **single source of truth** for project status

---

# Git Rules

- 📝 **Commits**: `<type>(scope): <50ch max>` — one logical change per commit
  - Types: `feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` | `chore`
  - **Commit after each file/logical unit** — don't batch entire phases
- 🌿 **Branching**: `phase-N/<topic>` (e.g., `phase-4/event-registration`)
- ✅ **Allowed**: `status`, `diff`, `log`, `add`, `commit`, `stash`, `switch`, `branch`, `revert`
- ❌ **Blocked**: `push`, `merge`, `rebase`, `reset --hard`, `clean -fd`, `branch -D`

# === fullstack archetype ===

# Fullstack — Archetype Rules

> Applied when building combined frontend + backend in one repository.

## Repository Structure

- Separate backend and frontend into distinct top-level directories (`backend/` and `frontend/`). Never mix server-side and client-side code in the same directory tree.
- Shared types, constants, or validators used by both sides should live in a dedicated `shared/` directory — not duplicated in both.

## API Contract

- The API contract (endpoints, request/response shapes, error codes) is defined by the FastAPI Pydantic schemas in `backend/`. Auto-generated OpenAPI docs at `http://localhost:8000/docs`.
- When the backend changes an endpoint, the corresponding frontend fetch call **MUST** be updated in the same commit. Never leave frontend and backend out of sync across commits.

## Backend Rules (FastAPI + PostgreSQL)

- Layer separation: `routes/` (API layer) → `services/` (business logic) → `models.py` (ORM) → `database.py` (infrastructure)
- Transaction boundary in **API layer** (route handlers). Services must remain pure — no `session.commit()` in service code.
- Domain exceptions (e.g., `EventNotFoundError`) in `backend/domain/exceptions.py` — never raise raw `HTTPException` from service code.
- Every error response must include a machine-readable `error_code` field, not just `detail`.
- Use pagination for all list endpoints (offset+limit). `/api/events` already does this.
- Test naming: `test_{function}_{scenario}` (e.g., `test_create_rsvp_event_full`).

## Frontend Rules (Astro + Preact)

- Component organization: **feature-based** within `src/components/` (`ui/`, `content/`, `search/`, `filter/`). Do not add atomic design directories alongside this.
- Design tokens live in `src/styles/` — never use magic hex codes or px values inline in components.
- State: local Preact state (`useState`) for component-level; props for parent-child. No global state library needed at current scale.
- All interactive elements must be keyboard-navigable and have ARIA labels.
- Images: always provide `alt` text. Large images go in `assets/` with descriptive filenames.

## Cross-Cutting

- Environment variables are documented in `docs/ENV.md`. Backend vars in `backend/.env.example`; frontend vars in `frontend/.env.example`.
- Shared test fixtures and mock event data: `backend/tests/fixtures/` (backend) and `frontend/src/lib/__tests__/` (frontend).
