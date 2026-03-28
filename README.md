# ACC ClubHub

Digital platform for **Across Cycling Club Munich** — events, media, knowledge, routes. Multilingual (zh/en/de).

**Live site:** [www.accross-cc.de](https://www.accross-cc.de) 

## Site Sections

| Section | Route | Description |
|---------|-------|-------------|
| 🎬 Media | `/media` | Videos, interviews, ride records |
| 🚴 Events | `/events` | Social rides, training days, event registration |
| 🔧 Gear | `/knowledge/gear` | Gear guides, maintenance, reviews |
| 📊 Training | `/knowledge/training` | Training methodology, safety |
| 🗺️ Routes | `/routes` | Searchable route database with Strava/Komoot links |

## Quick Start

```bash
# Frontend
cd frontend && npm install && npm run dev     # → http://localhost:4321

# Backend
cd backend && pip install -r requirements.txt
cp .env.example .env                          # fill in DATABASE_URL, RESEND_API_KEY
uvicorn app:app --reload --port 8000          # → http://localhost:8000/docs
```

---

## Documentation

| Doc                                       | Purpose                                                           |
| ----------------------------------------- | ----------------------------------------------------------------- |
| [progress.md](progress.md)                   | Project status — what's done, in progress, planned               |
| [MAINTENANCE.md](MAINTENANCE.md)             | Day-to-day ops: DB queries, publishing events, email, deployments |
| [AGENTS.md](AGENTS.md)                       | Coding rules and architecture for AI assistants                   |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Full dev environment setup                                        |
| [docs/ENV.md](docs/ENV.md)                   | All environment variables                                         |

---

*Proprietary — Across Cycling Club Munich*
