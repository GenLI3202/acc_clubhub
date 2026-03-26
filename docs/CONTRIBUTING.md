# Contributing Guide

<!-- AUTO-GENERATED -->

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | v18+ | Frontend development |
| npm | v8+ | Frontend package management |
| Python | 3.11+ | Backend development |
| Poetry | latest | Python dependency management |

## Repository Structure

```
acc-clubhub/
├── frontend/          # Astro static site (Node.js / TypeScript)
├── backend/           # FastAPI event registration API (Python)
├── docs/              # Project documentation
│   ├── rebuild_plan/  # Phase implementation plans
│   └── deployment/    # Deployment guides
└── assets/            # Static assets (images, GPX, styles)
```

## Development Setup

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # configure PUBLIC_WALINE_SERVER_URL and PUBLIC_API_URL
npm run dev            # starts at http://localhost:4321
```

### Backend

```bash
cd backend
poetry install         # or: pip install -r requirements.txt
cp .env.example .env   # configure DATABASE_URL, RESEND_API_KEY, ALLOWED_ORIGINS
uvicorn app:app --reload --port 8000
```

See [ENV.md](./ENV.md) for details on all environment variables.

## Frontend Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run check` | Astro + TypeScript type checking |
| `npm run check:assets` | Verify asset file sizes are within limits |
| `npm run test` | Run unit tests once (Vitest) |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:e2e` | Run end-to-end tests (Playwright) |
| `npm run test:e2e:ui` | Run E2E tests with Playwright UI |
| `npm run test:all` | Full quality gate: type check + unit tests + build |

## Backend Commands

| Command | Description |
|---------|-------------|
| `uvicorn app:app --reload` | Run dev server with hot reload |
| `pytest` | Run test suite |
| `pytest --cov` | Run tests with coverage report |
| `ruff check .` | Lint Python code |
| `ruff format .` | Format Python code |
| `mypy .` | Static type checking |

## Testing

### Frontend

```bash
cd frontend
npm run test           # unit tests (Vitest)
npm run test:e2e       # E2E tests (Playwright) — requires running backend
npm run test:all       # full quality gate
```

Unit tests live alongside source files in `src/lib/`. E2E tests are in `e2e/` (Playwright).

### Backend

```bash
cd backend
pytest                  # all tests
pytest -v               # verbose output
pytest --cov --cov-report=term-missing  # with coverage
```

Tests live in `backend/tests/`. Aim for 80%+ coverage.

## Code Style

### Frontend (TypeScript / Astro)

- TypeScript strict mode enabled
- File names: `kebab-case`
- Components: `PascalCase`
- Max line length: 100 chars

### Backend (Python)

- Formatter: **black** / **ruff** (88 char line length)
- Linter: **ruff** (E, F, I, W rules)
- Type checker: **mypy**
- Naming: `snake_case` functions/vars, `PascalCase` classes, `UPPER_SNAKE` constants
- All function signatures require type hints

## Git Workflow

Branch naming: `phase-N/<topic>` (e.g., `phase-4/event-registration`)

Commit format: `<type>(scope): <description>` (max 50 chars)

Types: `feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` | `chore`

Commit after each logical unit of work — do not batch entire phases into one commit.

## PR Submission Checklist

- [ ] Branch created from `master` with correct naming convention
- [ ] All tests pass (`npm run test:all` / `pytest`)
- [ ] No linting errors (`ruff check .` / `npm run check`)
- [ ] Environment variables documented in [ENV.md](./ENV.md) if new ones added
- [ ] PR description explains what changed and why
- [ ] Screenshots attached for UI changes

<!-- END AUTO-GENERATED -->
