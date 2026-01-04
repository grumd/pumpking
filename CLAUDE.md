# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pumpking is a Pump It Up (arcade rhythm game) score tracking and leaderboard system. It's a monorepo with two packages:

- **packages/api**: Node.js backend (Express + tRPC + Kysely + MySQL)
- **packages/web**: React frontend (Vite + Mantine + tRPC client)
- **Legacy Python API**: A legacy API exists in a separate repository, not part of this monorepo, but still rarely used in legacy frontend code. Avoid using when possible and gradually phase out.

## Common Commands

```bash
# Development
npm start                 # Start both API (:3001) and web (:3000) dev servers
npm run start:api         # Start API only
npm run start:web         # Start web only

# Testing
npm run test:api          # Run backend tests (Mocha + Chai)

# Building
npm run build:web         # Build frontend

# Database migrations
npm run migrate:latest --prefix packages/api    # Apply migrations
npm run migrate:rollback --prefix packages/api  # Revert last migration
npm run migrate:make --prefix packages/api -- migrationName  # Create migration
```

## Architecture

### Backend (packages/api)

- **Entry**: `src/index.ts` → `src/app.ts` (Express setup)
- **API Layer**: tRPC router at `src/trpc/router.ts`, routes in `src/trpc/routes/`
- **Business Logic**: Services in `src/services/{domain}/`
- **Database**: Kysely with types auto-generated in `src/types/database.ts`
- **Legacy REST** (to be removed): Routes in `src/routes/`, controllers in `src/controllers/` (being phased out)

### Frontend (packages/web)

- **Entry**: `src/main.tsx` → `src/App.tsx`
- **Features**: Organized by domain in `src/features/` (login, leaderboards, profile, ranking)
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

**API** (`packages/api/.env`):

```
NODE_ENV=development
APP_PORT=3001
DB_DATABASE=db_name
DB_USERNAME=
DB_PASSWORD=
SCREENSHOT_BASE_FOLDER=~/screenshots
```

**Web** (`packages/web/.env.development`):

```
VITE_API_BASE_PATH=http://localhost:3001
```

## Adding New Features

### New API Endpoint

1. Create service: `packages/api/src/services/{domain}/feature.ts`
2. Create tRPC route: `packages/api/src/trpc/routes/{domain}.ts`
3. Register in router: `packages/api/src/trpc/router.ts`
4. Create hook: `packages/web/src/.../useFeature.ts`

### Database Changes

1. Create migration: `npm run migrate:make --prefix packages/api -- name`
2. Write SQL/TS migration in `packages/api/migrations/`
3. Run: `npm run migrate:latest --prefix packages/api`
4. Regenerate types if needed (requires DB running)

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
