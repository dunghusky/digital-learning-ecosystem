# Quang Tri Craft Villages – Digital Learning Ecosystem

> **“Digitizing heritage – Awakening love for our homeland.”**

A website that helps students **explore, digitize, tell stories about and promote** the traditional craft villages of Quang Tri province, and uses those materials to study local Vietnamese language and literature in more depth.

Piloted at Thien Thanh Primary & Secondary School, Dien Sanh commune, Quang Tri province. For the detailed plan (features, roadmap, technical decisions), see [plan.md](plan.md) (in Vietnamese).

## Table of contents

- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
  - [Option 1: Run locally (recommended for development)](#option-1-run-locally-recommended-for-development)
  - [Option 2: Run everything with Docker](#option-2-run-everything-with-docker)
- [Environment variables](#environment-variables)
- [Local URLs](#local-urls)
- [Public API](#public-api)
- [Accounts API](#accounts-api)
- [Importing craft village data](#importing-craft-village-data)
- [Importing archive documents](#importing-archive-documents)
- [Linting & testing](#linting--testing)
- [Conventions](#conventions)
- [Troubleshooting](#troubleshooting)

## Tech stack

| Area | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Backend | Python 3.13, Django 5.2 LTS, Django REST Framework, JWT (SimpleJWT) |
| API docs | OpenAPI / Swagger (drf-spectacular) |
| Database | PostgreSQL 17 |
| Dev environment | Docker Compose |
| CI | GitHub Actions |
| Deployment (planned) | Vercel (frontend), Render (backend), Neon (PostgreSQL) |

## Project structure

```
digital-learning-ecosystem/
├── backend/                    # API + admin site (Django)
│   ├── config/                 # Django project configuration
│   │   ├── settings/
│   │   │   ├── base.py         #   shared settings
│   │   │   ├── dev.py          #   development
│   │   │   └── prod.py         #   production
│   │   ├── urls.py             # root routes: /admin, /api/v1, /api/docs
│   │   ├── wsgi.py / asgi.py   # deployment entry points
│   ├── apps/                   # One Django app per domain module
│   │   ├── core/               #   shared building blocks, health check, import helpers
│   │   ├── accounts/           #   users, authentication (JWT)
│   │   ├── villages/           #   craft villages, GeoJSON for the map
│   │   └── archive/            #   folk verse, riddles, stories (the digital archive)
│   ├── manage.py
│   ├── requirements.txt        # production dependencies
│   ├── requirements-dev.txt    # + development tools (pytest, ruff)
│   ├── pyproject.toml          # ruff and pytest configuration
│   ├── Dockerfile
│   └── .env.example            # environment variable template
├── frontend/                   # Web UI (Next.js)
│   ├── src/
│   │   ├── app/                # pages & layouts (App Router): /villages, /map, /archive
│   │   ├── components/         # UI, map (MapLibre) and archive components
│   │   └── lib/                # shared utilities (API client, ...)
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── eslint.config.mjs
│   └── .env.example
├── docs/                       # design docs, craft-village materials
├── .github/workflows/ci.yml    # automated checks on push / pull request
├── docker-compose.yml          # Postgres + backend + frontend for development
├── plan.md                     # project plan (Vietnamese)
└── README.md
```

Upcoming modules (lessons, quizzes, gamification) will be added as new apps in `backend/apps/` and matching route groups in `frontend/src/app/`.

## Prerequisites

| Tool | Version | Install on Windows |
|---|---|---|
| Git | latest | `winget install Git.Git` |
| Docker Desktop | latest | `winget install Docker.DockerDesktop` |
| Node.js | 22 LTS or newer | `winget install OpenJS.NodeJS.LTS` |
| uv (Python manager) | latest | `winget install astral-sh.uv` |

Open a new terminal after installing so the commands are picked up. No separate Python install is needed – `uv` downloads the right version. If you only use [Option 2](#option-2-run-everything-with-docker), Git and Docker Desktop are enough.

## Getting started

Clone the repository:

```bash
git clone <repo-url>
cd digital-learning-ecosystem
```

### Option 1: Run locally (recommended for development)

PostgreSQL runs in Docker; the backend and frontend run directly on your machine → fast startup and full editor support (autocomplete, type errors).

**Step 1 – Start the database** (in the background):

```bash
docker compose up -d db
```

**Step 2 – Backend** (terminal 1):

```bash
cd backend
cp .env.example .env                        # first time only
uv venv                                     # first time only: creates .venv
uv pip install -r requirements-dev.txt      # first time and whenever requirements change
uv run python manage.py migrate
uv run python manage.py createsuperuser     # first time only: create an admin account
uv run python manage.py runserver
```

**Step 3 – Frontend** (terminal 2):

```bash
cd frontend
cp .env.example .env.local                  # first time only
npm install                                 # first time and whenever package.json changes
npm run dev
```

Both the backend and the frontend **reload automatically on save** – no restart needed.

To stop: `Ctrl + C` in each terminal, and `docker compose stop db` to stop the database.

### Option 2: Run everything with Docker

No Node.js or Python required – handy for a quick try-out.

```bash
cp backend/.env.example backend/.env                          # first time only
docker compose up --build                                      # first time / after requirements change
docker compose exec backend python manage.py createsuperuser   # first time only
```

- Afterwards, `docker compose up` is enough.
- Source code is mounted into the containers, so code changes still reload automatically.
- Only rebuild (`--build`) when `backend/requirements*.txt` changes.
- To stop: `docker compose down` (Postgres data is kept; add `-v` to wipe it).

> Don't run Option 1 and Option 2 at the same time – both use ports 3000 and 8000.

## Environment variables

**`backend/.env`** (template: `backend/.env.example`)

| Variable | Description | Example |
|---|---|---|
| `DJANGO_SECRET_KEY` | Django secret key – must be a long random string in production | `change-me` |
| `DJANGO_DEBUG` | Enable debug mode | `True` |
| `DJANGO_ALLOWED_HOSTS` | Host names the backend may serve | `localhost,127.0.0.1` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres:postgres@localhost:5432/langnghe` |
| `CORS_ALLOWED_ORIGINS` | Frontend origins allowed to call the API | `http://localhost:3000` |
| `AUTH_THROTTLE_RATE` | Max sign-up / login / token-refresh / password-change requests per client (optional) | `20/min` |

When running with Docker (Option 2), `docker-compose.yml` switches the `DATABASE_URL` host to `db`; no `.env` change is needed.

**`frontend/.env.local`** (template: `frontend/.env.example`)

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:8000/api/v1` |

`.env` / `.env.local` files hold private values and must **not be committed** (already in `.gitignore`).

## Local URLs

| Service | URL |
|---|---|
| Website (frontend) | http://localhost:3000 |
| API health check | http://localhost:8000/api/v1/health/ |
| API docs (Swagger) | http://localhost:8000/api/docs/ |
| Django admin | http://localhost:8000/admin/ |
| PostgreSQL | `localhost:5432` – user `postgres`, password `postgres`, database `langnghe` |

## Public API

Read-only and anonymous; only *published* content is returned. Base URL: `/api/v1`. The full,
interactive reference is at `/api/docs/`.

| Endpoint | Description |
|---|---|
| `GET /villages/` | Paginated villages. Filters: `craft_type`, `former_region`, `recognition_status`, `search` (accent-insensitive), `ordering` |
| `GET /villages/{code}/` | One village with its full profile |
| `GET /villages/map/` | Every village as a GeoJSON `FeatureCollection` (unpaginated, same filters as the list). Unlocated villages have `geometry: null`; `properties.document_count` counts the village's published documents |
| `GET /documents/` | Paginated documents. Filters: `genre`, `grade_level`, `village` (code), `theme` (slug), `search`, `ordering` |
| `GET /documents/{slug}/` | One document with its glossary, reading questions, related documents, and its villages including `latitude`/`longitude` (for the mini map) |
| `GET /documents/featured/?genre=` | A document that changes once a day (the home page's "folk verse of the day") |
| `GET /documents/random/` | The slug of a random document matching the list filters |
| `GET /documents/genres/` | Number of published documents per genre |

## Accounts API

Students sign themselves up; there is no e-mail verification in the pilot. Base URL:
`/api/v1/auth`. Authenticated calls send `Authorization: Bearer <access>`.

| Endpoint | Description |
|---|---|
| `POST /register/` | Create a student account: `username`, `password`, `school_name`, `class_name` (required), `phone`, `email` (optional). Returns the profile, **not** tokens: the student then logs in |
| `POST /token/` | Log in with `username` + `password`; returns `access` (30 min) and `refresh` (7 days) |
| `POST /token/refresh/` | New `access` **and** `refresh`; the old refresh token is revoked (rotation) |
| `POST /logout/` | Revoke a `refresh` token |
| `GET /me/` · `PATCH /me/` | Read or edit your profile (`school_name`, `class_name`, `phone`, `email`, names); `username` and `role` are read-only |
| `POST /password/change/` | `current_password` + `new_password` (Django's password validators apply) |

Sign-up, login, refresh and password change are rate limited (`AUTH_THROTTLE_RATE`). On the
frontend the session lives in `localStorage` behind `src/lib/auth/session.ts`; components read
it through `useAuth()` / `useCurrentUser()`, and `authSend()` refreshes an expired access
token once before retrying.

## Importing craft village data

Village records are collected in a workbook (`docs/data/craft-villages.xlsx`, kept out of
version control) and imported by code — re-importing an updated workbook refreshes the existing
rows instead of duplicating them:

```bash
cd backend
uv run python manage.py import_villages ../docs/data/craft-villages.xlsx --dry-run   # report only
uv run python manage.py import_villages ../docs/data/craft-villages.xlsx
```

Imported villages start as drafts; publish them in the Django admin (select rows → *Publish
selected villages*), or pass `--publish` to publish everything the import touches:

```bash
uv run python manage.py import_villages ../docs/data/craft-villages.xlsx --publish
```

Without `--publish` the import never changes the editorial status, so re-importing an updated
workbook cannot unpublish a village an editor has already reviewed.

## Importing archive documents

Archive documents (folk verse, proverbs, riddles, legends…) come from
`docs/data/documents.xlsx` and are matched by `slug`, so re-importing updates rows in place.
Each import replaces a document's villages, themes and glossary with what the workbook says:

```bash
cd backend
uv run python manage.py import_documents ../docs/data/documents.xlsx --dry-run   # report only
uv run python manage.py import_documents ../docs/data/documents.xlsx
uv run python manage.py import_documents ../docs/data/documents.xlsx --publish   # also publish
```

- Rows that fail validation are skipped and listed in the report (e.g. a folk genre without a
  `source`, or an `answer` on something that is not a riddle).
- `--publish` never publishes a document whose license is `unknown`.
- Unknown themes are created with a placeholder name; rename them in the admin.
- For riddles, a trailing `Đáp án: …` line in the body is moved into `answer`.

## Linting & testing

**Backend** (inside `backend/`):

```bash
uv run ruff check .                        # lint
uv run ruff format .                       # auto-format
uv run pytest                              # run tests
uv run python manage.py makemigrations     # after changing models
```

**Frontend** (inside `frontend/`):

```bash
npm run lint                               # ESLint
npm run typecheck                          # TypeScript type check
npm run build                              # production build
```

GitHub Actions runs these checks on every push to `main` / `dev` and on every pull request.

## Conventions

- **Language:** code, comments and documentation are written in English (except `plan.md`). User-facing text will be localized, with Vietnamese as the default language.
- **Branches:** `main` – stable; `dev` – day-to-day development; build features on their own branch (e.g. `feature/craft-village-map`) and open a PR into `dev`.
- **Backend:** each module is an app in `backend/apps/`; APIs live under `/api/v1/`; endpoints require authentication by default – public endpoints must opt out explicitly.
- **Frontend:** call the backend only through helpers in `src/lib/`; use the `@/` alias instead of long relative paths.
- **Commits:** include lock files (`package-lock.json`) and migrations whenever they change.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Set the DJANGO_SECRET_KEY environment variable` | `backend/.env` is missing or empty → `cp backend/.env.example backend/.env` |
| Backend cannot connect to the database | Check Postgres is running: `docker compose ps`; start it with `docker compose up -d db` |
| `port is already allocated` / ports 3000 or 8000 in use | Both options are running at once → `docker compose down`, then use a single option |
| Editor can't find `next` or `react` | Dependencies aren't installed locally → `cd frontend && npm install` |
| `uv` or `npm` not recognized | Open a new terminal after installing; verify with `uv --version`, `node --version` |
