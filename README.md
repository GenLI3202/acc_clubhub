# ACC ClubHub

> **Across Cycling Club Munich (ACC)** – More than a club, it's a lifestyle.

[**Visit the Website**](https://acc-clubhub.vercel.app/)

## Overview

ACC ClubHub is the digital heart of **Across Cycling Club Munich**, a cycling community for Chinese-speaking enthusiasts in the Munich area.

Revitalized in 2026, this platform serves as a hub for our members to connect, learn, and ride together. Our goal is to create a professional, engaging, and supportive environment that makes every member fedel at home.

## Core Pillars

We focus on five key areas to enrich the cycling experience:

* **🎬 Media (Content)**: Capturing the beauty of our rides through films, interviews, and stories.
* **🚴 Events (Life)**: Regular social rides, training sessions, and weekend adventures.
* **🔧 Gear (Knowledge)**: Expert advice on maintenance, buying guides, and European market insights.
* **📊 Training (Science)**: Methodologies for improvement, from safety basics to structured training frameworks.
* **🗺️ Routes (Explore)**: A curated database of the best cycling routes around Munich.

## Technical Architecture

This project is rebuilt with a modern stack to ensure performance and ease of content management.

### Stack

* **Framework**: [Astro](https://astro.build/) (Static Site Generation)
* **CMS**: [Sveltia CMS](https://github.com/sveltia/sveltia-cms) (Git-based headless CMS)
* **Auth**: GitHub OAuth (via [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth))
* **Styling**: TailwindCSS & Custom Design System
* **Deployment**: Vercel

### System Status (Layer 4 - Phase 4.3)

The **Event Registration System** is partially complete.

**Completed (Layer 3)**:

* ✅ **Decap/Sveltia CMS Integration**: Full content management via `/admin`.
* ✅ **Content Collections**: Type-safe schemas for Media, Knowledge, and Routes.
* ✅ **Dynamic Routing**: Automatic page generation from Markdown/MDX content.
* ✅ **i18n**: Built-in support for multiple languages (Chinese/English/German).

**Phase 4.3.1 - Basic Registration** (✅ Complete):

* ✅ Backend API (FastAPI + Neon Postgres) deployed to Vercel
* ✅ Email-based registration (Email + Name, no OAuth required)
* ✅ Multi-language email notifications (Resend API, zh/en/de)
* ✅ Frontend Preact registration form component
* ✅ Privacy policy pages (zh/en/de) + GDPR compliance
* ✅ Database triggers for seat management

**Phase 4.3.1.5 - Testing & Deployment** (⏳ TODO):

* ⏳ E2E functional testing (8 test scenarios)
* ⏳ Frontend deployment to production
* ⏳ Email delivery monitoring

**Phase 4.3.2 - UI Redesign** (📋 Planned):

* 📋 Featured events hero section (see `docs/rebuild_plan/phase_4_3_2_event_ui.md`)
* 📋 Weekly regulars card grid
* 📋 Responsive design improvements

## Getting Started

<!-- AUTO-GENERATED -->

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | v18+ | For frontend |
| npm | v8+ | For frontend |
| Python | 3.11+ | For backend |
| Poetry | latest | Python dependency management |

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:4321` to see the site.
Visit `http://localhost:4321/admin` to access the CMS.

### Backend Development

```bash
cd backend
poetry install
cp .env.example .env   # fill in DATABASE_URL, RESEND_API_KEY, ALLOWED_ORIGINS
uvicorn app:app --reload --port 8000
```

Visit `http://localhost:8000/docs` for the interactive Swagger UI.

### Frontend Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run check` | TypeScript/Astro type checking |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run test:all` | Full quality gate: check + test + build |

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed setup and [docs/ENV.md](docs/ENV.md) for all environment variables.

<!-- END AUTO-GENERATED -->

### Content Management

To manage content locally:

1. Run the dev server: `npm run dev` (from `frontend/`)
2. Open `http://localhost:4321/admin`
3. Changes are saved directly to your local file system (`src/content/`).

## License

This project is proprietary to Across Cycling Club Munich.
