# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pumpking is a Pump It Up (arcade rhythm game) score tracking and leaderboard system. It's a monorepo with these packages:

- **packages/database**: the database itself: Kysely client and types, migrations and their scripts, the `events` table helpers, `pingDb`. Never deployed on its own; services import its TS sources as `@pumpking/database/*`
- **packages/utils**: Pump It Up rules that several services and the web need (mixes, grades, phoenix score, mods), no DB. Imported as `@pumpking/utils/*`. Keep code that only one service uses in that service
- **packages/api**: Node.js backend (Express + tRPC + Kysely + MySQL)
- **packages/web**: React frontend (Vite + Mantine + tRPC client)
- **packages/ingest**: result ingestion for piu-spy, compatible with the legacy Python API's endpoints (port 3002). The pipeline (validation, player / track matching, de-duplication, purgatory) is in `src/ingestion/`. The API's admin purgatory recheck calls ingest's `POST /internal/purgatory/recheck` (`INGEST_URL`, default `http://127.0.0.1:3002`)
- **packages/bot**: the Telegram bot, a grammY bot with plugins in `src/plugins/` (port 3003 for `/healthz`). Ingest and bot listen on 127.0.0.1 (see `docs/python-api-migration/PLAN.md`)
- api, ingest and bot are separate services: each deploys only when its own package changes, or `database/src`, `utils`, the lockfile or the deploy setup. They don't import each other's code; they share the database, and talk over HTTP on the host when they must
- **Legacy Python API**: A legacy API exists in a separate repository, not part of this monorepo, but still rarely used in legacy frontend code. Avoid using when possible and gradually phase out.

## Common Commands

```bash
# Development
npm start                 # Start both API (:3001) and web (:3000) dev servers
npm run start:api         # Start API only
npm run start:web         # Start web only

# Testing
npm run test:api          # Run backend tests (Mocha + Chai)
npm run test:ingest       # Run ingest / bot tests (each creates and drops the same test DB,
npm run test:bot          # so don't run them at the same time as test:api)

# Building
npm run build:web         # Build frontend

# Database migrations
npm run migrate:latest --prefix packages/database    # Apply migrations
npm run migrate:rollback --prefix packages/database  # Revert last migration
npm run migrate:make --prefix packages/database -- migrationName  # Create migration
```

## Architecture

### Backend (packages/api)

- **Entry**: `src/index.ts` → `src/app.ts` (Express setup)
- **API Layer**: tRPC router at `src/trpc/router.ts`, routes in `src/trpc/routes/`
- **Business Logic**: Services in `src/services/{domain}/`
- **Database**: Kysely client from `@pumpking/database/db`, with types auto-generated in `packages/database/src/database.ts`
- **Events**: code that adds a result also adds a `resultAdded` event in the same transaction (`addEvent` from `@pumpking/database/events`); admin edits and deletes add `resultChanged`. The effects job (`src/jobs/effectsJob.ts`) applies pp / exp / totals from the events about a second later; tests call `applyEffects()`
- **Legacy REST** (to be removed): Routes in `src/routes/`, controllers in `src/controllers/` (being phased out)

### Frontend (packages/web)

- **Entry**: `src/main.tsx` → `src/App.tsx`
- **Features**: Organized by domain in `src/features/` (login, leaderboards, profile, ranking, admin)
- **API Client**: tRPC client configured in `src/utils/trpc.ts`
- **Hooks**: Custom hooks in `src/hooks/` wrap tRPC queries

### Data Flow Pattern

1. Frontend calls tRPC procedure via React Query hook
2. Backend tRPC route validates input with Zod, calls service
3. Service executes Kysely queries, returns typed data
4. Types flow end-to-end automatically via tRPC

### Key Type Sharing

Frontend imports backend types via path alias `@/api/*` → `packages/api/src/*`

## Environment Setup

**Database** (`packages/database/.env`), the DB config for every service, script and test:

```
DB_DATABASE=db_name
DB_DATABASE_TEST=test_db_name
DB_USERNAME=
DB_PASSWORD=
```

**API** (`packages/api/.env`):

```
NODE_ENV=development
APP_PORT=3001
SCREENSHOT_BASE_FOLDER=~/screenshots
# Optional, where ingest runs (this is the default)
INGEST_URL=http://127.0.0.1:3002
```

**Ingest** (`packages/ingest/.env`, optional `APP_PORT`):

```
# piu-spy's uploads, one folder per agent (the API serves screenshots from the same tree)
UPLOADS_ROOT=~/uploads
```

**Bot** (`packages/bot/.env`, see `packages/bot/.env.example`): without `TELEGRAM_BOT_TOKEN` it serves only `/healthz`

**Web** (`packages/web/.env.development`):

```
VITE_API_BASE_PATH=http://localhost:3001
```

## Deployment

- Pushes to `master` run `.github/workflows/deploy.yml` for the services on the host (api, ingest, bot): tests, a migration guard when migrations changed, then `deploy/release.sh` prepares `~/pumpking/releases/<sha>` (install + prod migrations) and `deploy/deploy-service.sh` switches each changed service to it, with a health check and rollback. Details: "What P2 did" in `docs/python-api-migration/PLAN.md`
- pm2 apps for all services: root `pm2.config.js`
- The web deploys to GitHub Pages (`deploy-web.yml`)

## Adding New Features

### New API Endpoint

1. Create service: `packages/api/src/services/{domain}/feature.ts`
2. Create tRPC route: `packages/api/src/trpc/routes/{domain}.ts`
3. Register in router: `packages/api/src/trpc/router.ts`
4. Create hook: `packages/web/src/.../useFeature.ts`

### Database Changes

1. Create migration: `npm run migrate:make --prefix packages/database -- name`
2. Write SQL/TS migration in `packages/database/migrations/`
3. Run: `npm run migrate:latest --prefix packages/database`
4. Regenerate types if needed (requires DB running): `npm run generate-kysely --prefix packages/database`, then review the diff (the file is hand-patched in places)

## Code Patterns

- **New code**: Use tRPC + React Query + Jotai
- **Styling**: Mantine components + SASS modules
- **i18n**: Translations in `packages/web/src/constants/translations/`

## Testing

Backend tests use Mocha + Chai with a separate test database. Tests are in `packages/api/src/test/`.

```bash
npm run test --prefix packages/api        # Run all tests
npm run test:watch --prefix packages/api  # Watch mode
```

## Trello

A Trello workspace and board are available for tracking tasks:

- **Workspace**: Pumpking — https://trello.com/w/pumpking1
- **Board**: Pumpking — https://trello.com/b/aSxSZhd7/pumpking

Use the board for task/work items related to this project.
