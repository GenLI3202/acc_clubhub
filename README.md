# ACC ClubHub

> **Across Cycling Club Munich (ACC)** – More than a club, it's a lifestyle.

[**Visit the Website**](https://acc-clubhub.vercel.app/)

## Overview

ACC ClubHub is the digital heart of **Across Cycling Club Munich**, a cycling community for Chinese-speaking enthusiasts in the Munich area. 

Revitalized in 2026, this platform serves as a hub for our members to connect, learn, and ride together. Our goal is to create a professional, engaging, and supportive environment that makes every member feel at home.

## Core Pillars

We focus on five key areas to enrich the cycling experience:

*   **🎬 Media (Content)**: Capturing the beauty of our rides through films, interviews, and stories.
*   **🚴 Events (Life)**: Regular social rides, training sessions, and weekend adventures.
*   **🔧 Gear (Knowledge)**: Expert advice on maintenance, buying guides, and European market insights.
*   **📊 Training (Science)**: Methodologies for improvement, from safety basics to structured training frameworks.
*   **🗺️ Routes (Explore)**: A curated database of the best cycling routes around Munich.

## Technical Architecture

This project is rebuilt with a modern stack to ensure performance and ease of content management.

### Stack
*   **Framework**: [Astro](https://astro.build/) (Static Site Generation)
*   **CMS**: [Sveltia CMS](https://github.com/sveltia/sveltia-cms) (Git-based headless CMS)
*   **Auth**: GitHub OAuth (via [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth))
*   **Styling**: TailwindCSS & Custom Design System
*   **Deployment**: Vercel

### System Status (Layer 4 - Phase 4.3)
The **Event Registration System** is in progress.

**Completed (Layer 3)**:
*   ✅ **Decap/Sveltia CMS Integration**: Full content management via `/admin`.
*   ✅ **Content Collections**: Type-safe schemas for Media, Knowledge, and Routes.
*   ✅ **Dynamic Routing**: Automatic page generation from Markdown/MDX content.
*   ✅ **i18n**: Built-in support for multiple languages (Chinese/English/German).

**Phase 4.3 Progress**:
*   ✅ **Phase 4.3.1**: Backend API (FastAPI) + Database (Neon Postgres) deployed
*   ✅ **Phase 4.3.1**: Email-based registration (no OAuth) - Frontend form + Resend integration
*   ✅ **Phase 4.3.1**: Privacy policy pages (zh/en/de) + GDPR compliance (unsubscribe tokens)
*   🔄 **Phase 4.3.2**: Events page UI redesign (planning stage - see `docs/rebuild_plan/phase_4_3_2_event_ui.md`)

## Getting Started

### Prerequisites
*   Node.js (v18+)
*   npm or pnpm

### Development

```bash
# Install dependencies
npm install

# Start local development server
npm run dev
```

Visit `http://localhost:4321` to see the site.
Visit `http://localhost:4321/admin` to access the CMS (local backend).

### Content Management

To manage content locally:
1.  Run the dev server: `npm run dev`
2.  Open `http://localhost:4321/admin`
3.  Changes are saved directly to your local file system (`src/content/`).

## License

This project is proprietary to Across Cycling Club Munich.
