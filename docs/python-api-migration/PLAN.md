# Legacy Python API (piu-top) — Migration Plan

Status: inventory done 2026-09-30 · direction agreed 2026-09-30 (see "Agreed
decisions") · deploy approach revised 2026-09-30 (tsx + pm2 release dirs, see
"Build and release") · P1.1 and P1.2 deployed 2026-09-30 · P1.3 + P1.4
done 2026-09-30 (PR #39), which completes P1 · P2 built 2026-09-30, not
merged yet: its first run needs the server's `shared/` env files (see
"Progress") · nothing ported yet beyond what TS
already owns (see "Already in TS") · priorities not set yet

## Progress

Start a new session here: this section says where the work stands and what
comes next. The rest of the document is the design it follows.

| Step | State |
|---|---|
| Inventory, direction, deploy approach | Done 2026-09-30 |
| P1.1 API runs on tsx in prod + `/healthz` | Done 2026-09-30 (PR #37). Deploy green, `/healthz` ok; on the server `pm2 describe pumpking-api` shows `packages/api/src/index.ts` with `--import tsx`, and all 5 pm2 apps are online |
| P1.2 `packages/core` with the DB layer | Done 2026-09-30 (PR #38). Deploy green (env check passed, migrate "already up to date", `/healthz` ok, `tracks.mostPlayed` serves data). The server's DB config now lives only in `packages/core/.env`: the `DB_*` lines were removed from `packages/api/.env` (backup: `~/pumpking-api.env.bak-20260930`, outside the deploy dir) and the API was restarted once to prove it runs without them |
| Side fix | PR #34 merged 2026-09-30: `chart_instances.interpolated_difficulty` dropped in prod (migration renamed to `20260930040000_…` so it sorts after the tournaments migrations prod had already run — Kysely 0.25 rejects anything that sorts earlier) |
| P1.3 constants + pure logic into core | Done 2026-09-30 (PR #39, together with P1.4). Core / API / web type-check, API tests pass, `npm run build:web` bundles `MIXES` from core. Nothing server-side changes: the API deploy runs it as before |
| P1.4 `ingest` / `bot` skeletons | Done 2026-09-30 (PR #39). Both type-check, their `/healthz` tests pass, and a local start serves `/healthz` (200, and 503 with a bad `DB_DATABASE`). Not deployed: the API deploy rsyncs them to the server, but nothing starts them |
| P2 deploy pipeline | **Built, not merged** (branch `feature/deploy-pipeline`). `deploy.yml` replaces `deploy-api.yml`. Tested locally against a fake `~/pumpking` (first deploy, redeploy, the move off an old cwd, rollback of a broken release, pruning, change detection); actionlint clean. Before merging: create `~/pumpking/shared/*.env` on the server (see "Next: merge P2") |
| P3 onwards | Not started |

### What P1.2 did

- `packages/core` (`@pumpking/core`) is a workspace package whose `exports`
  map `./*` to `./src/*.ts`. It holds `src/db.ts` (the Kysely client),
  `src/database.ts` (generated types, `npm run generate-kysely --prefix
  packages/core`), `src/MigrationProvider.ts`, `src/migrator.ts`
  (`createMigrator`, `migrateToLatest`), `src/test/testDatabase.ts` (create /
  drop the test DB), `migrations/` and `scripts/` (migrate, rollback, make).
  The seeds stay in the API.
- **Core owns the DB, including its config.** The DB variables (`DB_DATABASE`,
  `DB_DATABASE_TEST`, `DB_USERNAME`, `DB_PASSWORD`) live in
  `packages/core/.env`, which `src/env.ts` loads for whichever service,
  script or test imports core. Variables already set in the environment win.
  A missing one fails on the first query with "`X` is not set: add it to
  packages/core/.env". Service `.env` files hold only their own settings.
- **Migrations are core's:** `npm run migrate:latest|migrate:rollback|migrate:make
  --prefix packages/core`. The API has no migrate scripts anymore.
  `generate-kysely` builds its URL from core's `.env`.
- **Prod, until P2:** the API deploy still runs the migrations (the rsync into
  the live directory is the only way code reaches the server), now with
  `npm run migrate:latest --prefix packages/core` from the repo root. A step
  before the rsync fails the deploy if `packages/core/.env` or
  `packages/api/.env` is missing on the server. P2 moves migrations to their
  own pipeline step (see "Pipeline").
- **Type resolution:** the API resolves modules like node10 (no `exports`), so
  its `tsconfig.json` maps `@pumpking/core/*` to `../core/src/*`. At runtime
  Node resolves the package `exports` and tsx loads the `.ts` files. `rootDir`
  moved from the API's `tsconfig.json` to `tsconfig.ref.json`, which
  references core's composite project, so the web's `tsc --build` goes
  web → API → core. Services that start fresh (ingest, bot) can use
  `moduleResolution: bundler` and skip the path mapping.
- Core's `tsconfig.json` checks `src/` and `scripts/`, not `migrations/`
  (never type-checked before either; several have kysely typing errors).
  `npm run ts` and the Test API workflow run core's `ts-check` first.
- CI: `packages/core/**` added to the paths of `deploy-api.yml` and
  `test-api.yml`.
- Core pins `@types/node` to the API's version (24.10.7), so the API program
  sees one copy of the Node types.
- **Schema drift:** the Python side has changed the schema outside pumpking's
  migrations. The dev DB has `phoenix2_track_names` and
  `players.arcade_phoenix2_name[_edist]` (piu-top `4da8040`, 2026-09-22), which
  `arcade_track_names` / `arcade_player_names` replaced a week later
  (`2f9b96e`). They're in no migration and not in `database.ts`, so codegen
  against a real DB adds them; `database.ts` is also hand-patched
  (`PlayerPreferencesJson`), so a regen needs a manual review. `generate-kysely`
  used to have a password-less URL hardcoded. Before W5 / W7, check which of these
  exist in prod and either drop them or add them to a migration.

### What P1.3 did

- Moved with `git mv` into core: `src/constants/{currentMix,grades,mixes,tournaments}.ts`,
  `src/scoring/{grades,phoenixScore}.ts` and `src/profile/exp.ts` (the API's
  `utils/` level dropped: in core they're domain logic, not utils). They import
  nothing, so they're browser-safe.
- The 17 API importers use `@pumpking/core/constants/…`,
  `@pumpking/core/scoring/…` and `@pumpking/core/profile/exp`. The API's
  `constants/*` path alias is gone; `src/constants/`, `utils/scoring/` and
  `utils/profile/` no longer exist in the API.
- **The web depends on core at runtime.** `@pumpking/core` is a web
  dependency (`"*"`, like the API). `AddResult.tsx` and
  `ScreenshotRecognition.tsx` import `MIXES` from
  `@pumpking/core/constants/mixes`. The web's `tsconfig.json` references
  `../core` directly (web → core and web → API → core): without it, `tsc
  --build` rejects core files that aren't in a referenced project. Vite
  resolves the package `exports` through the workspace symlink with no config.
- The web's own `utils/scoring/grades.ts` stays (it has `Mixes`,
  `getPhoenixGrade`, `getPhoenixPlate`), but its `GradePhoenix` /
  `PlatePhoenix`, which were identical copies, are now re-exported from core.
- CI: `packages/core/**` added to the paths of `test-web.yml` and
  `deploy-web.yml` (a core-only change now changes the web bundle).
- Stale `packages/*/types` declarations for moved files can hide errors
  locally; delete `packages/{api,core}/types` and the `*.tsbuildinfo` files
  for a clean `tsc --build` (CI always builds clean).

### Server state after P1.2

- Still the old layout: `~/pumpking-deployment/` (rsync into the live dir).
  Env files: `packages/core/.env` (DB) and `packages/api/.env` (the rest);
  both are excluded from rsync, so deploys never touch them. P2 moves this to
  `~/pumpking/` (see "Next: merge P2").
- `ssh piutop@api.pumpking.top` works from the dev machine. When touching env
  files over SSH, print key names only (`sed "s/=.*//"`), never values.
- The dev machine's `packages/core/.env` holds the local DB config; the local
  `packages/api/.env` has no `DB_*` lines anymore.

### What P1.4 did

- `packages/ingest` (`@pumpking/ingest`, dev port 3002) and `packages/bot`
  (`@pumpking/bot`, dev port 3003): Express apps with only `/healthz`,
  `src/index.ts` listening on `APP_PORT` from the package's own optional
  `.env` (`src/env.ts`), DB config from core. Dev: `npm start --prefix
  packages/<service>` (`tsx watch`, `DEBUG=<service>:*`).
- **`/healthz` is shared**: core's `src/health.ts` exports `pingDb()` (`select
  1`); the API's `/healthz` uses it too. Each service keeps its own handler
  (200 `{status: 'ok'}` / 503 `{status: 'error'}`), since core doesn't depend
  on Express.
- **TS setup**: `module: preserve` + `moduleResolution: bundler`, no path
  aliases and no project references: nothing imports their types, so they're
  plain `tsc --noEmit` programs that include core's sources through the
  package `exports`. Both are in the root `npm run ts`.
- **`@types/node` pinned** to 24.10.7 in the lockfile, like the API and core
  (a fresh install picked 24.19.0, and their programs include core's files, so
  that would have meant two copies of the Node types).
- **Tests**: Mocha + Chai + supertest, with root hooks that create and drop
  the test DB through core (`npm run test:ingest`, `npm run test:bot`). Every
  suite uses the same `DB_DATABASE_TEST`, so don't run two suites at once
  locally. CI: `test-services.yml`, a matrix over `[ingest, bot]` on
  `packages/{ingest,bot,core}/**`.
- **`pm2.config.js`** per package (`pumpking-ingest` / `pumpking-bot`,
  `--import tsx`), no `pm2` npm script, and nothing in `deploy-api.yml`.
- **On the server** they arrive through the API deploy's rsync (it only
  excludes `packages/web`), and its root `npm ci` installs their
  dependencies, all of which the API already has. They sit unused until P2.

### What P2 did

- **One `Deploy` workflow** (`.github/workflows/deploy.yml`) for every service
  on the host; `deploy-api.yml` is gone. Jobs: `changes` → `test` (per
  affected service) + `guard` → `release` (upload, `npm ci`, prod migrations)
  → `deploy` (per service, in parallel, `fail-fast: false`). Runs on pushes to
  `master` that touch a service, core, the root `package.json` / lockfile,
  `pm2.config.js` or `deploy/`, and by hand (`force` redeploys everything).
  `concurrency: deploy` queues runs instead of interleaving them.
- **Change detection compares against the `deployed/<service>` tags**, not the
  push's parent: a service deploys when `packages/<service>`, `packages/core`,
  `package.json`, `package-lock.json`, `pm2.config.js` or `deploy/` differ
  from the commit it runs, or when it has no tag yet. So a failed or skipped
  deploy is picked up by the next run. The deploy job moves the tag only
  after its health check passes (a rollback leaves it on the old commit).
- **Migration guard**: for every service whose `deployed/<service>` commit has
  other `packages/core/migrations` than the new commit, `test-service.yml`
  checks out that commit, swaps in the new commit's migrations folder and runs
  its tests (no type-check). Nothing is released or migrated unless the tests
  and the guard pass.
- **`test-service.yml`** is the one reusable test workflow (inputs `service`,
  `ref`, `migrations_ref`); `test-api.yml` and `test-services.yml` are
  PR-triggered callers.
- **Prod migrations run always** in the `release` job, inside the new release
  directory, before any symlink moves ("already up to date" when nothing is
  pending). Always rather than only on `migrations/` changes: a run whose
  migrate step failed would otherwise leave the next run's code on the old
  schema. The guard is what's conditional.
- **Server side lives in `deploy/`**, run from the release over SSH:
  - `release.sh`: links `shared/<package>.env` to `packages/<package>/.env`
    (fails without `shared/core.env`), `HUSKY=0 npm ci`, marks the release
    ready (`.release-ready`, so a re-run or a later service of the same commit
    reuses it), prunes to the 5 newest releases plus any a symlink points at.
  - `activate.sh <service>`: moves `~/pumpking/<service>` atomically, `pm2
    startOrReload` from the release's `pm2.config.js`, polls `/healthz`, and
    checks that the process's cwd is the new release. On failure it points the
    link back, reloads, and exits 1. It prints no app logs: the repo is
    public, so they stay on the server (`pm2 logs pumpking-<service>`).
    Requires `shared/<service>.env`.
- **pm2 and symlinks** (checked locally with pm2 5.3): an app whose `cwd` is
  the symlink path itself starts the new target on reload. But `startOrReload`
  keeps an existing app's old `cwd` even when the ecosystem file changes it,
  so `activate.sh` deletes and restarts an app that runs from anywhere else.
  That's what moves `pumpking-api` off `~/pumpking-deployment` on the first
  run (a few seconds of downtime, like any restart).
- **One root `pm2.config.js`** for the three apps; the per-package configs,
  the API's `npm run pm2` and `restart-server.sh` are gone. Loaded from
  `~/pumpking/releases/<sha>/`, an app's `cwd` is
  `~/pumpking/<service>/packages/<service>`; from anywhere else, the checkout.
- **Uploads**: plain `rsync -az --delete` of the CI checkout into
  `releases/<sha>/`, without `.git`, `node_modules` and `packages/web` (served
  from GitHub Pages; including it would add the web toolchain to every
  install). No `--link-dest`: the rest is ~2 MB, and `node_modules` is
  installed fresh anyway (~290 MB per release, 5 kept, 132 GB free).
- **SSH**: `.github/actions/ssh` sets up `ssh pumpking` from
  `SSH_PRIVATE_KEY`, with the host's ed25519 key pinned instead of
  `ssh-keyscan`. The appleboy / rsync-deployments actions are no longer used.
- **Ingest and bot listen on 127.0.0.1** (`APP_HOST` overrides it): the host
  has no firewall (ufw inactive). Prod ports: ingest 3002, bot 3003 (free on
  the host; the API has 3001, Flask 5000 / 5001). The ingestion smoke test
  against `/results/screen/validate` joins `activate.sh` with W1 / W7, once
  that endpoint exists.
- No pm2 memory limits yet (the API uses ~210 MB of 8 GB); add
  `max_memory_restart` in `pm2.config.js` if one misbehaves.

### Next: merge P2

1. **Create the shared env files on the server** (not done: the session's
   permission rules block remote writes). `ssh piutop@api.pumpking.top`,
   then:

   ```bash
   mkdir -p ~/pumpking/releases ~/pumpking/shared && chmod 700 ~/pumpking/shared
   cd ~/pumpking/shared
   cp -p ~/pumpking-deployment/packages/core/.env core.env
   cp -p ~/pumpking-deployment/packages/api/.env api.env
   printf 'NODE_ENV=production\nAPP_PORT=3002\n' > ingest.env
   printf 'NODE_ENV=production\nAPP_PORT=3003\n' > bot.env
   chmod 600 *.env && for f in *.env; do echo "$f: $(sed 's/=.*//' "$f" | tr '\n' ' ')"; done
   ```

   Without them the run fails safely in `release.sh`, before any migration
   or symlink move.
2. Merge the PR and watch the first `Deploy` run. With no `deployed/*` tags
   yet, it deploys all three services and skips the guard. Then check on the
   server: `pm2 ls` (`pumpking-ingest` and `pumpking-bot` online),
   `readlink ~/pumpking/*`, `pm2 describe pumpking-api` (cwd
   `~/pumpking/api/packages/api`), `curl -s 127.0.0.1:3002/healthz`, and that
   the tags exist.
3. **If the API's first deploy fails**, there's no previous release in the
   new layout to roll back to. Bring the old one back by hand: `cd
   ~/pumpking-deployment/packages/api && pm2 delete pumpking-api; pm2 start
   ./pm2.config.js && pm2 save` (the old dir still has its per-package pm2
   config; nothing deploys there anymore).
4. Once a second deploy has gone through the new layout, remove
   `~/pumpking-deployment/` and update "Server state after P1.2".
5. Then P3 (events + effects worker), P4 any time, or start a track
   (W1, W3, W9): P1 and P2 unblock all of them.

## Target architecture overview

A short overview of where the migration ends up. Details are in "Service
boundaries and deployment", "Events and effects" and "Telegram bot platform".

### Packages

```
packages/
  core/     shared code, never deployed on its own: DB client + Kysely types, migrations,
            constants, domain logic (validators, scoring, pp/exp), event helpers
  api/      web API: tRPC + admin procedures, effects worker, cron jobs
  ingest/   result ingestion for piu-spy (legacy-compatible REST)
  bot/      Telegram bot platform + feature plugins
  web/      React frontend (imports API types via @/api/*)
```

### Deployment

- **Deploys on change.** A service redeploys when its own package or `core`
  changes; a `package-lock.json` change redeploys all of them. The web stays
  on GitHub Pages.
- **Pipeline** (one workflow):
  1. Detect which packages changed.
  2. Run the tests of each affected service.
  3. Migration guard (when migrations changed): run the tests of the
     currently deployed commit of every service against the new schema.
  4. Migrate prod once.
  5. Deploy the affected services in parallel.
- **Release:** the whole repo at one commit goes to `releases/<sha>/` on the
  server, `npm ci` runs inside that new directory → the service's symlink
  points at it → `pm2 startOrReload` of that one service. Services run their
  TS sources with tsx; nothing is built or bundled.

### Fallbacks

- **Type errors:** `tsc` fails in CI and nothing reaches the server.
- **Failing tests or migration guard:** no migration runs and nothing deploys.
- **Failed deploy:** a failed health check (and, for ingestion, a failed
  smoke test against the side-effect-free validate endpoint) points the
  symlink back to the previous release and reloads it. Only that service
  rolls back; the others deploy normally.
- **API or worker down:** ingestion keeps accepting results. Effects (pp,
  exp, totals) catch up from the event backlog once it's back. The
  leaderboard still shows new results, with pp and exp missing until then.
- **Bot down:** events pile up and get processed on restart; notifications
  that are too old are skipped.
- **Schema changes:** expand/contract (additive first, drops later) plus the
  migration guard, so older running code keeps working on the new schema.

### Data flow

```
piu-spy ──REST──▶ ingest ──┐  one transaction: result row (all leaderboard fields) + resultAdded event
                           ▼
                    ┌────────────┐
web ──tRPC──▶ api ─▶│   MySQL    │◀── bot (reads data via core)
   admin edits ────▶│  + events  │
 tournaments job ──▶└────────────┘
                     │        │
        effects worker        bot plugins
        (in api: pp, exp,     (rivals, locations, tournament
         totals, history)      notifications, …) ──▶ Telegram
```

- Each consumer of the `events` table keeps its own cursor and can safely
  re-run events.
- Ingestion depends only on MySQL and the uploads directory; nothing calls it
  synchronously.
- Screenshots are written by ingestion to the shared uploads directory and
  served to the web by the API.

## Summary

`piu-top` (`/home/grumd/coding/piu-top`, Flask, entry `backend/main.py`) is the
legacy results server. This inventory describes `master` at `4cd3b3d`
(2026-09-30).

It runs raw SQL over `mysql-connector` against the **same MySQL database**
pumpking uses, so the migration needs no data migration: endpoints can be
ported and cut over one by one, as long as the TS side writes the same rows.

The web frontend no longer calls it (the web only talks to
`VITE_API_BASE_PATH` → TS). Its remaining consumers are all non-browser
clients: the **piu-spy** recognition agents at arcades, the **PyQt admin
desktop tool** and the **Telegram bot**. It also calls back into the TS API
after every result change.

It has about 2k lines of live backend code. The **result ingestion pipeline**
(validation, fuzzy player/track matching, purgatory, de-duplication) is by far
the largest and riskiest part. Everything else is thin CRUD.

## Agreed decisions

| Decision | Value |
|---|---|
| Admin desktop tool | Still in use. It gets replaced by a **web admin page** in pumpking that mirrors all its features, with UX improvements and fixes for its bugs and gaps. Only players with `players.is_admin = 1` can open it (tRPC `adminProcedure` plus a route guard in the web). The desktop tool is retired once the web admin matches it |
| Admin API shape | Admin endpoints (group B) are **not** ported as wire-compatible REST. They become tRPC `admin.*` procedures designed for the new UI. The super-agent concept (`agents.id = 1`) goes away; agent tokens remain only for piu-spy ingestion |
| Telegram bot | **All** current features stay (see "Telegram bot features"). The bot is rewritten in TS as an **extensible bot platform** with a plugin system: each feature is a plugin that registers commands, buttons, scheduled jobs and event handlers. New features are expected, e.g. tournament start/end notifications |
| Bot ↔ backend | The bot talks to services in-process instead of going through the `/telegram/*` REST endpoints (group C). Group C is replaced, not ported |
| Hosting | TS and Python run on the **same host**, so the uploads directory is shared as is |
| piu-spy transport | Either the deployed agents are updated to post to the new port, or a reverse proxy forwards the legacy port/paths to TS. In both cases the ingestion endpoints (group A) keep their **paths, headers, multipart field and response shapes** |
| piu-spy modes | Only **screen** and **manual** are in use and get ported. Stream and test are deferred |
| owjibot | Left alone for now; it keeps running on the legacy public endpoint (C6). May become a plugin later |
| Telegram account link | Keep matching by `telegram_tag`, so linked users don't have to link again |
| Bot event stats | Dropped, not ported. It was a leaderboard for one official piugame event (6 hard-coded charts, "Nightmare event"); monthly tournaments cover the idea |
| Web admin scope | Parity with the desktop tool (plus the listed bug fixes); no extra UX work for now |
| DB config | Lives with the DB in `packages/core/.env` (prod: `shared/core.env`); services' own `.env` files hold only their settings. Migrations are run through core's scripts, over SSH from the new release directory |
| Server layout | New deploys live under `~/pumpking/` (see "Build and release") |
| Service boundaries | Result ingestion and the Telegram bot are **separate services** (`packages/ingest`, `packages/bot`) with their own processes and deploys. Web / API changes don't redeploy them, and they keep working when an API deploy fails or the API is down. Ingestion is the most critical service (see "Service boundaries and deployment") |
| Deploy trigger | Every service deploys **on change** of its own package or `packages/core`, like the other packages. No release tags. Deploys are atomic, and roll back automatically when the health check fails |
| Migration guard | Before prod migrations run, CI runs the tests of **every currently deployed service** against the new migrations. Prod migrations run only if they pass |
| Database access | One shared MySQL user for all services. No per-service users |
| Effects | Ingestion only stores the result plus an event. pp / exp / totals are computed asynchronously by a worker that reads events. Results without effects yet show correctly on the leaderboard (see "Events and effects") |
| `results_best_grade` | Never read anywhere. Remove it (P4) |
| Runtime | Services run their TS sources with **tsx** in prod, the same runtime as dev, tests and migrations. No bundling, no build output. Type-checking happens only in CI (`tsc`). Node's built-in type stripping is a possible later cleanup (it needs the path aliases replaced and `.ts` extensions on imports) |
| Process manager | **pm2**, like every other app on the host. No Docker: it would split one small host between two ways of running, logging and restarting things |
| Releases | A release is the **whole repo** at one commit plus its `node_modules`, never a per-package selection, so adding a package or dependency changes nothing in the deploy. Capistrano-style release dirs with a symlink per service (see "Build and release") |
| Monorepo tooling | npm workspaces + TS project references only. No Nx / Lerna: nothing is built, and the dependency graph (everything → `core`) is covered by a few path filters |

## Consumers

| Client | Source | Auth | Uses |
|---|---|---|---|
| piu-spy agents (arcade capture / stream recognition) | `~/coding/piu-spy` (local copy last committed 2023-10) | headers `agent-name` + `agent-token` | `/status`, `/upload`, `/results/{mode}/validate`, `/results/{mode}/submit` |
| Admin desktop tool (PyQt) + CLI | `piu-top/admin/` | agent headers; **super agent = `agents.id = 1`** | `/admin/*`, `/agent`, `/tracklist`, `/track`, `/sharedChart`, `/chartInstance`, `/downloads/*` |
| Telegram bot (rivals, location activity, heater) | `piu-top/bot/` | header `telegram-bot-token` | `/telegram/*` |
| owjibot (location activity bot) | `piu-top/owjibot/` | none | `/agent/:id/lastPlayers/` (public) |
| Integration tests | `piu-top/tests/` | root agent | `/test/*` (dev only) and the submit endpoints |
| TS API (callback target) | pumpking | none | Python calls `POST results/result-added-effect/:id` and `POST shared-charts/:id/refresh` |

`backend/redirect.py` is a separate tiny Flask app that 307-redirects every
request to `REDIRECT_TO_HOST`. It was used for host moves and could be reused
at cutover.

## Admin desktop tool features (to mirror in the web admin)

The PyQt tool (`admin/ui_*.py`) has one tab per area. The web admin needs at
least:

| Area | Features | Known gaps / bugs to fix |
|---|---|---|
| Purgatory | List all rows; the field named in the rejection reason is highlighted; edit fields and resend (edit + recheck); recheck one row or all; delete (with confirmation); download the screenshot and scan JSON | Recheck-all runs synchronously over the whole table |
| Results | Search by score; edit (scores, stats, grade, mods, actual player picker, hidden, notes); delete (with confirmation); download files; copy the screenshot to the clipboard | The UI has **Track** and **Player** search fields that the backend ignores; edits and deletes skip recalculation (broken refresh callback, see below) |
| Players | List all players; create / edit nickname, email, telegram tag, region, hidden, discard results, is admin, can add manually, actual (alias) player, and per-mix arcade names + edit-distance tolerance | |
| Tracks | Search by name; edit per-mix arcade names + tolerance | |
| Charts | Look up a chart instance by id; edit learned min/max total steps and hidden | Lookup by id only |
| Agents | Search by name; edit name / title; create an agent (CLI) | Tokens are shown in plain text; no rotate / revoke |
| Tracklist sync (CLI) | Diff a local tracklist JSON against the server and push new or changed tracks, shared charts and chart instances | Not part of the UI today |
| Log panel | Shows the `report` lines the backend returns | Useful to keep as a per-action result panel |

## Telegram bot features (`piu-top/bot/`, python-telegram-bot)

| Feature | Trigger | What it does | Backend data |
|---|---|---|---|
| Account link | `/register`, or the text `hi` / `hello` | Links a Telegram chat to a player by `telegram_tag` = Telegram username | C3 |
| Rivals notifications | Job every 15 s | Polls the best-results feed since the last check. For each new result, notifies the player (you improved / you beat N rivals / you're on par / your next rival is…) and notifies rivals who were beaten. Filters by the player's rival list, level range and "smart" (inferior-rival) tracking | C1, C2 |
| Rivals settings | `/rivals`, and text `rivals add / remove / on / off / smart on / off / levels / test` | Manages the rival list, level range and tracking switches, stored in the versioned `players.telegram_bot_preferences` JSON | C4 |
| Location monitoring | Job every 60 s | Watches agent sessions: notifies configured watchers when the tracked location starts, stalls (no heartbeat for 5–10 min) or resumes, and when a new player shows up there | C5 |
| Locations dialog | `/locations` plus inline buttons | Pick a location, see who played there recently and how long ago | C5 / C6 |
| Heater (Kasa plug) | Job every 60 s, optional | Polls a TP-Link Kasa device through the cloud API and tells the admin when it turns on or off (5 min debounce) | External (`tplinkcloud`) |
| Event stats | Text `event` | Totals the scores for a hard-coded piugame event chart list | Calls the dead `results/best/trusted/chart/:id` → **broken today**. Dropped, not ported |
| Error reporting | Any failure | Replies with the exception and pings the admin; a failing job stops itself and notifies the admin | — |
| owjibot (separate bot) | Group chat, inline buttons | Per-location "who played recently" message, with RU / UA wording; deletes its previous message to reduce spam | C6 (public) |

State today: `bot.json` (last poll time), a pickle persistence file,
in-memory location state, and config from environment variables (admin id,
tracked location, watchers, Kasa credentials).

## Endpoint inventory

Auth: **agent** = any registered agent, **super** = agent #1, **bot** = Telegram
bot token, **none** = public. Request args are the JSON body merged with the
query string (GET requests also send a JSON body).

### A. Result ingestion and agents (piu-spy)

| # | Endpoint | Auth | What it does |
|---|---|---|---|
| A1 | `POST /results/screen/submit` | agent | Capture mode: split the screen into left/right results, validate, add or merge into `results`; unrecognized results go to `purgatory` |
| A2 | `POST /results/stream/submit` | agent | Same as A1, plus a fallback for bad track-name OCR: guess the track from chart label + step-count range |
| A3 | `POST /results/manual/submit` | agent | Manual mode: unrecognized results are rejected instead of going to purgatory; merges with an existing same-score result (Step It Up profile import) |
| A4 | `POST /results/test/submit` | agent | Like A1, but rejects instead of using purgatory (used by tests) |
| A5 | `POST /results/{screen,stream,manual}/validate` | agent | Dry run of A1–A3 (`checkOnly`): per side, whether it's valid, the discard reason, or what would be updated |
| A6 | `POST /status` | agent | Heartbeat: upsert `agent_sessions` by `(agent, client_session_mark)` with a JSON status; on a new session, prune the agent's sessions older than 7 days |
| A7 | `POST /upload` | agent | Multipart `file` (jpeg / json / mp4, ≤ 512 KB) saved to `UPLOADS_ROOT/<agent name>/<path>` (path traversal guarded) |
| A8 | `GET /upload?path=` | agent | Stat an uploaded file (dir / file / size / mtime) so the agent can skip re-uploading it |

### B. Admin tool

| # | Endpoint | Auth | What it does |
|---|---|---|---|
| B1 | `POST /agent` | super | Create an agent (name `[-._a-zA-Z0-9]`, random 30-char token); returns the existing agent if the name is taken |
| B2 | `GET /admin/agents?name=` | super | Search agents (response includes tokens) |
| B3 | `POST /admin/agent/edit/:id` | super | Edit an agent's name / title |
| B4 | `GET /admin/players` | super | All players with admin fields and per-mix arcade names + edit-distance tolerance (flattened `arcade_<mix>_name[_edist]` from `arcade_player_names`) |
| B5 | `POST /admin/player/create`, `POST /admin/player/edit/:id` | super | Create or edit a player. Checks nickname and per-mix arcade-name uniqueness. Toggling `hidden` sets `hidden_since` and bumps `shared_charts.last_updated_at` for every chart the player has results on. Upserts an `arcade_player_names` row per mix |
| B6 | `GET /admin/results?score=&result=` | super | Search results by score (`score` or `score_phoenix`) or by id, up to 1000 |
| B7 | `POST /admin/result/edit/:id` | super | Edit scores, step stats, grade, `actual_player_id`, mods (re-validated, recomputes `rank_mode`), `is_hidden`, notes; then calls TS `shared-charts/:id/refresh` |
| B8 | `POST /admin/result/delete/:id` | super | Delete a result and clear `results_best_grade` / `results_highest_score_*` for its shared chart; then calls TS refresh |
| B9 | `GET /admin/purgatory` | super | List all purgatory rows |
| B10 | `POST /admin/purgatory/recheck` `{ids?: [from, to]}` | super | Re-run validation over purgatory (all rows or an id range): valid rows move to `results`, discarded rows are deleted, changed reasons are updated |
| B11 | `POST /admin/purgatory/editAndRecheck` | super | Patch a purgatory row (track, chart, player name, stats, mods…), then recheck it |
| B12 | `POST /admin/purgatory/delete` | super | Delete a purgatory row |
| B13 | `GET /admin/chart_instances/?id=` | super | A chart instance with its learned `min/max_total_steps` |
| B14 | `POST /admin/chart_instance/edit/:id` | super | Edit `min/max_total_steps`, `is_hidden` |
| B15 | `GET /admin/tracks/?name=` | super | Track search with per-mix arcade names + tolerance (`arcade_track_names`) |
| B16 | `POST /admin/track/edit/:id` | super | Upsert / delete a track's arcade names per mix |
| B17 | `GET /tracklist` | **none** | Dump tracks, shared charts, chart instances and per-mix arcade track names (input to the tracklist sync script) |
| B18 | `POST /track` | super | Upsert a track |
| B19 | `POST /sharedChart` | super | Upsert a shared chart (`track`, `index_in_track`, `type`) |
| B20 | `POST /chartInstance` | super | Upsert a chart instance; on insert, seed the track's arcade name for that mix (copied from the previous mix, else `full_name`) |
| B21 | `GET /downloads/:agentID?path=` | **none** | Send an uploaded file as an attachment (agentID is only checked for existence; the path is relative to `UPLOADS_ROOT`) |

The tracklist sync itself is client-side (`admin/admin_tracklist.py`). It
diffs a local tracklist JSON against B17 and pushes changes through B18–B20.

### C. Telegram bot and activity

| # | Endpoint | Auth | What it does |
|---|---|---|---|
| C1 | `GET /telegram/players` | bot | Visible players with `telegram_tag`, `telegram_id`, bot preferences |
| C2 | `GET /telegram/best_results` `{since}` | bot | "Best results" feed for charts updated since `since`: per chart, each player's best score per rank mode, plus the best-grade result where it differs. Drives the rivals notifications |
| C3 | `POST /telegram/link_user` | bot | Link a Telegram id to a player by `telegram_tag` |
| C4 | `GET` / `POST /telegram/preferences/:telegramID` | bot | Read / write the bot preferences JSON |
| C5 | `GET /telegram/agents/info` | bot | All agents' last session times, and the players who scored on each agent in the last 6 h (hidden players shown as `PUMP IT UP`) |
| C6 | `GET /agent/:id/lastPlayers/` | **none** | C5 for one agent, plus its uptime / last-update minutes |

### D. Dev / test only (registered only with `main.py dev`)

| # | Endpoint | What it does |
|---|---|---|
| D1 | `GET /test/record/:table` | Fetch a row by arbitrary `where` |
| D2 | `POST /test/clear/:table` | Truncate a table |
| D3 | `POST /test/clear_all_results` | Truncate results / purgatory / best tables and reset chart stats |

## Functionality behind the endpoints

1. **Result ingestion** (A1–A5, B10, B11), in `results.py`,
   `result_validation*.py`, `results_update.py`, `scoring_*.py`,
   `tracklist.py`, `players.py`:
   - **Payload**: a header (`screen_file`, `mix_name`, `track_name`,
     `gained`) plus `left` / `right` sides, each with `result`,
     `personal_best` and `machine_best`. Only `result` is stored. PB/MB are
     used only for XX glitch cleanup.
   - **XX quirks**: the PB grade glitch, the machine best of the other side
     showing up, duplicate PB/MB. `is_pass` is derived from the grade on XX.
   - **Player resolution**: Levenshtein distance against per-mix arcade names
     (`arcade_player_names`), with a per-player tolerance (`name_edist`).
     Ambiguous near-ties are rejected. Spaces are stripped except on Phoenix 2
     (`NICK #1234`). Alias accounts redirect via `actual_player_id`.
     `discard_results` players are discarded.
   - **Track resolution**: normalized-character Levenshtein against
     `arcade_track_names` per mix, with "best guess" hints in the rejection
     reason. Stream mode falls back to label + step-sum matching.
   - **Chart resolution**: by label within the mix. UCS labels and RANDOM
     TRAIN are discarded. The step sum must fall within the chart's learned
     `min/max_total_steps` ± 1.
   - **Scoring validation**:
     - Combo scoring (pre-Phoenix): multiple of 100, grade enum, minimum score
       for the stats, `max_combo` rules, `score_increase` rules.
     - Million scoring (Phoenix, Phoenix 2): recompute the score from stats
       (±1), the grade from the per-mix grade table, and the plate from
       misses/bads/goods. Pass status is required.
     - Mods whitelist (it differs per scoring system). Rank mode (`VJ`) is
       allowed only on Standard, non-performance charts of level ≥ 13, and
       not together with `HJ` / `BGADARK` / `BGAOFF`.
   - **Outcomes**: *Unrecognized* goes to purgatory (or is rejected in
     manual / test mode). *Discarded* is dropped silently.
   - **Normalization**: `score_phoenix` is computed from stats for
     pre-Phoenix mixes, so every result has a comparable million score.
   - **De-duplication and merge** (same chart instance + recognized player +
     score):
     - Manual mode merges into the closest-in-time result with matching
       stats, filling in missing perfects and grade.
     - An exact-date result overwrites an inexact ("brief") one, or a
       re-recognition within 10 s.
     - A brief result is skipped if a detailed one already exists.
   - **Side effects**: learns `chart_instances.min/max_total_steps` from
     complete stats, stores a random result `token`, inserts with
     `is_new_best_score = false`, commits, then calls TS
     `result-added-effect` over HTTP (pp, ELO, exp and best flags live in TS).
2. **Purgatory**: parks unrecognized results with a reason, so they can be
   rechecked after admins fix arcade names, the tracklist or the row itself.
3. **Agents and sessions**: the agent registry and tokens, heartbeat
   sessions, and "who played where recently" activity queries.
4. **File storage**: a per-agent upload tree. `results.screen_file` is stored
   as `<agent name>/<path>`, and the TS screenshot endpoint reads the same
   tree (`SCREENSHOT_BASE_FOLDER` = `PIUTOP_UPLOADS_ROOT`). This path layout is
   a shared contract.
5. **Tracklist management**: track, shared chart and chart instance upserts,
   plus per-mix arcade track names and their seeding.
6. **Player management**: admin fields, per-mix arcade names, and hidden-flag
   propagation to `shared_charts.last_updated_at`.
7. **Telegram integration**: user linking, preferences, the best-results feed
   and the activity feed.
8. **Constants**: the mix list and ids, `MAIN_MIX` (Phoenix 2), the million
   scoring start (Phoenix), mixes with arcade-name lookup (XX and later), and
   the grade tables. Part of this exists in TS (`constants/mixes.ts`).

## Already in TS

| Legacy piece | TS counterpart | Gap |
|---|---|---|
| Post-insert effects | `POST /results/result-added-effect/:id` (REST, called by Python) | P3 turns it into "enqueue an event", processed by the effects worker. W12 drops the route once Python ingestion is gone |
| B8 result delete | `admin.deleteResult` → `services/results/deleteResult.ts` | None known; the web admin uses it |
| B5 player edit | `admin.updatePlayer` (can-add-manually, region, telegram tag/id, hidden) | No nickname / arcade names / `discard_results` / `is_admin` / `actual_player_id` / create. `hidden` doesn't set `hidden_since` or bump `shared_charts.last_updated_at` |
| A3 manual submit | `results.addResultMutation` + `recognizeScoreMutation` (web manual add) | Different flow: the web user picks the chart; no agent, no fuzzy matching. Decide whether agent-side manual mode is still needed |
| B21 downloads (for the web) | `GET /results/:id/screenshot` (incl. mp4 first frame) | The admin tool's raw file download isn't covered |

## Dead or broken on the legacy side (don't port)

- **Broken callback**: Python calls `POST shared-charts/:id/refresh` after an
  admin result edit or delete (B7, B8), but TS has no such route, so those
  edits silently skip recalculation today.
- **Python admin delete is broken**: B8 deletes from
  `results_highest_score_no_rank` / `_rank`, but a 2023 migration dropped those
  tables. The transaction rolls back and the endpoint returns a traceback with
  HTTP 200. Deleting from the web admin (TS `admin.deleteResult`) works.
- **`results_best_grade` is write-only**: the TS effect and delete code, the
  tests and seeds, and Python B8 write it. Nothing reads it, and Python's own
  best-grade logic (C2) computes the value itself. Removed by P4.
- **Called by clients but no longer served**: `/top` (`admin/get_top.py`), and
  `/admin/resetResults`, `/purgatory`, `/results/search`,
  `/result/assignToPlayer`, `/results/reestimateRank` (`admin/admin.py`
  CLI). Also `results/best/trusted/chart/:id` (bot `piugame_event.py`) and
  `/lastResults` (piu-spy `scan_and_upload_images.py`).
- **Unused code**: `backend/alchemy/` (SQLAlchemy models, unused),
  `scoring_test.py`, `_tests.py` (scratch), and `backend-ts/` (only
  `node_modules` + `.env`).
- **Branches that can't be reached**: `context.login` / `profileID` are never
  set anymore, so the region / hidden-profile branches in C2 and the
  `players.stat_top_*` counters are dead.

## Legacy issues to fix, not copy

- SQL is built by string interpolation. Most values are escaped, but some
  aren't (the `id` in B13, `sharedChartId` in C2). Kysely removes this class
  of bug.
- Agent- and bot-guarded endpoints return **HTTP 200 with a traceback string**
  on errors (`jsonSecureCall` never sets a status code). A compatibility layer
  must decide whether clients rely on that.
- B17 and B21 are unauthenticated, B2 returns agent tokens, and tokens are
  stored in plain text.
- Production runs the Flask dev server, single process, with `debug=True`.

## Migration approach

- **Incremental, per group.** The database is shared, so each group can be
  ported and cut over on its own, with no dual-write period. There are three
  mostly independent tracks: **ingestion** (piu-spy), **web admin** and
  **Telegram**.
- **Ingestion stays wire-compatible.** Serve group A from the `packages/ingest`
  service with the same paths, `agent-name` / `agent-token` headers, multipart `file` field
  and response shapes. Then either point updated agents at the TS port, or
  have the reverse proxy forward the legacy port / paths to TS.
- **Admin becomes tRPC + web.** Group B is redesigned as `admin.*` procedures
  behind `adminProcedure` (already checks `players.is_admin`) and a guarded
  `/admin` section in the web. Feature parity with the desktop tool (see
  "Admin desktop tool features") is the bar for retiring it. Improvements are
  welcome on top of that. File downloads (B21) become an admin-only
  procedure / route instead of an open endpoint. The tracklist sync becomes an
  admin page or a TS script.
- **Telegram becomes a TS bot platform** (see "Telegram bot platform") in
  `packages/bot`. Group C is replaced by calls to `packages/core` services. It can be built before the rest,
  because the bot only reads data that Python already writes to the shared
  database.
- **Characterization before replacing ingestion.** Port the `piu-top/tests`
  scenarios (`adding_results`, `validation_xx`, `validation_phoenix`,
  `rank_detection`, `result_edit`, `player_edit`) to Mocha. Then shadow-run
  real traffic: the `/validate` endpoints are side-effect free, and the
  uploaded scan JSONs under `UPLOADS_ROOT` are a replay corpus. Diff the
  Python and TS outcomes before flipping `/submit`.
- **Libraries**: plain Levenshtein (Python `editdistance`), e.g.
  `fastest-levenshtein`; `multer` (or similar) for uploads; `grammY` for the
  bot.

## Service boundaries and deployment

### Services

| Service | Package | Runs as | Deploys when changed | Must keep working through |
|---|---|---|---|---|
| Web API (+ effects worker, cron jobs) | `packages/api` | pm2 `pumpking-api` | `api/**`, `core/**` | — |
| Result ingestion | `packages/ingest` | pm2 `pumpking-ingest`, own port | `ingest/**`, `core/**` | API / bot outages, failed API / web deploys |
| Telegram bot | `packages/bot` | pm2 `pumpking-bot` | `bot/**`, `core/**` | API / ingestion outages |
| Web | `packages/web` | GitHub Pages (unchanged) | `web/**` | — |
| Shared code | `packages/core` | Not deployed itself; each service imports its TS sources (workspace package, `exports` point at `.ts`) | — | — |

A `package-lock.json` change counts as a change to every service.
`packages/core` holds:
- the database client, Kysely types, migrations and migration scripts;
- constants;
- pure domain logic (validators, scoring, pp / exp calculation);
- the event table helpers.

Core uses only relative imports internally: tsx applies the running service's
tsconfig, so core can't have path aliases of its own. Modules the web imports
at runtime (e.g. mix constants) must stay browser-safe (no `node:` imports).

The web keeps importing types from `@/api/*`. Once API types import from core,
core becomes a composite TS project that the API's `tsconfig.ref.json`
references, so the web's `tsc --build` keeps working.

### Build and release

- **Nothing is built.** Services run their TS sources with tsx (see
  "Agreed decisions"). CI type-checks (`tsc`) and runs the tests; that is the
  gate a build step used to be.
- **One release = the whole repo at one commit**, shared by every service:

  ```
  ~/pumpking/
    releases/<sha>/   full checkout (rsync --link-dest against the previous
                      release) + `npm ci` run inside this new directory
    shared/core.env   DB config, symlinked into each release as packages/core/.env
    shared/<service>.env
    api    -> releases/<sha>     one symlink per service, so services can
    ingest -> releases/<sha>     run different commits and roll back alone
    bot    -> releases/<sha>
  ```

  Nothing selects which files or packages go into a release, so a new
  package or dependency needs no deploy change. `npm ci` never runs in a live
  directory: if it fails, the symlinks haven't moved.
- **Deploying a service**:
  1. Create `releases/<sha>/` if an earlier service deploy of the same commit
     hasn't already.
  2. Point that service's symlink at it.
  3. `pm2 startOrReload` that one app from the repo's pm2 ecosystem file.
  4. Poll its `/healthz`. For ingestion, also run a smoke test: POST a
     fixture payload to `/results/screen/validate` (side-effect free) and
     check the response.
  5. If the check fails, point the symlink back and reload.

  Keep the last 5 releases for manual rollback. Verify on the first run that
  pm2 re-resolves a symlinked `cwd` on reload (if not, use delete + start,
  which costs the same downtime for a single fork-mode process).
- **Each service is isolated at runtime**: its own pm2 app, port, `.env`,
  logs, memory limit and auto-restart. The deploy runs `pm2 save` so the
  apps come back after a reboot.
- After a successful deploy, CI moves the git tag `deployed/<service>` to
  that commit.

This replaced the old deploy (P2), which rsynced with `--delete` into the
live directory and then ran `npm ci`, migrations and a pm2 restart in place,
leaving broken files under the running process if any step failed. How it's
implemented, and where it differs from the sketch above (no `--link-dest`,
`packages/web` left out, pm2 `cwd` = the symlink), is in "What P2 did".

### Production host

A single Ubuntu VPS (`api.pumpking.top`) runs everything under pm2 as one
user:

| pm2 app | What it is |
|---|---|
| `pumpking-api` | TS API on `:3001`, terminates its own TLS (Let's Encrypt certs) |
| `pumpking-python-backend` | Legacy Flask API under gunicorn on `127.0.0.1:5001`; nginx terminates TLS on `:5000` and proxies to it |
| `rivals-bot` | Legacy Telegram bot |
| `owji-bot` | owjibot |
| `spy-updates` | Static file server for piu-spy agent updates |

- MySQL listens on localhost only.
- Uploads: `~/uploads` (agent uploads, `SCREENSHOT_AGENT_BASE_FOLDER` /
  `PIUTOP_UPLOADS_ROOT`) and `~/uploads_players` (`SCREENSHOT_BASE_FOLDER`).
- **nginx already fronts the legacy port.** At ingestion cutover (W12),
  pointing the group A paths on `:5000` at `packages/ingest` is an nginx
  config change, and the agents need no update.
- The pm2 boot service is enabled, but the saved process list was stale (it
  pointed the API at a directory that no longer exists), so the API wouldn't
  have come back after a reboot. The deploy now runs `pm2 save`.

### Pipeline

One "Deploy" workflow, so migrations run exactly once and always before
service deploys. Web stays on its own GitHub Pages workflow.

1. **Detect** changed packages (e.g. `dorny/paths-filter`) and map them to
   affected services.
2. **Test** each affected service.
3. **Migration guard** (only when `migrations/` changed): check out each
   `deployed/<service>` commit and run its tests against the new migrations,
   alongside the new code's tests. This covers services that aren't being
   redeployed, and services whose deploy might fail and roll back onto the
   new schema.
4. **Migrate prod** once, only if steps 2–3 pass, and only when
   `packages/core/migrations/` changed: over SSH, `npm run migrate:latest
   --prefix packages/core` inside the new release directory (so the new
   migrations are there before any service switches to it), with
   `shared/core.env`.
5. **Deploy** the affected services in parallel. Each has its own rollback;
   a failed ingestion deploy doesn't stop the API deploy and vice versa.

### Database rules

- One shared MySQL user; all services read and write the same tables.
- Migrations run only in the pipeline, never on service start.
- **Expand / contract**: ship additive changes first. Drop or rename only
  after every service has been released on the new shape. The migration
  guard enforces this in practice.

### Events and effects

- An **`events` table** (id, type, JSON payload, created at) works as an
  outbox. Producers insert events in the same transaction as the change:
  - ingestion: `resultAdded`;
  - admin edits / deletes: `resultChanged`;
  - the tournaments job: `tournamentStarted` / `tournamentEnded`.
- **Consumers keep their own persisted cursors**: the effects worker (pp,
  exp, player totals, pp history; runs inside the API process like the
  existing `jobs/`) and the bot. Old events are cleaned up after a retention
  period. After downtime, the bot skips notifications that are too old
  instead of sending stale ones.
- **Ingestion's critical path is validate → store the result row + event in
  one transaction.** It depends only on MySQL and the uploads directory. It
  makes no HTTP calls, and nothing calls it synchronously.
- **Rule: ingestion writes every field the leaderboard reads from the row**:
  `score_phoenix`, `is_pass`, grade, plate, stats (Python already does). The
  effect's `score_phoenix` / `is_pass` fallback stays only as a safety net.
  Effects compute only derived or aggregate values.
- **Rule: effects are safe to replay.** They recompute values, never
  increment them. When several results for the same player and chart are
  processed late, only the current best gets pp. Nothing reads pp from
  non-best results.
- **Results without effects yet** already appear on the chart leaderboard,
  which is computed live from `results` (`services/charts/chartsSearch.ts`):
  score, rank, grade, plate, stats and chart order by latest `added`. Until
  the worker catches up (normally about a second), the gaps are:

  | Field | Visible as |
  |---|---|
  | `results.pp` | No pp on that result; missing from "sort by pp" and from the profile's highest-pp charts |
  | `players.pp`, pp history | Stale ranking position and profile pp chart |
  | `results.exp`, `players.exp` | No result exp; stale profile level |
  | `shared_charts.last_updated_at` | Not bumped. Only the Python bot's C2 feed reads it, and the new bot uses events |

  Today an effect whose HTTP callback fails is lost for good. The nightly job
  (`jobs/chartDifficulty`) recomputes all pp, but exp is never fixed. With
  events, the backlog is processed after an outage.
- **Before W7**: P3 turns the existing `result-added-effect` REST route that
  Python calls into "insert a `resultAdded` event". Effects become durable,
  and the bot gets events while Python still does ingestion.

### Monitoring

- `/healthz` on every service.
- An external uptime check on ingestion.
- A bot plugin that alerts the admin when ingestion or the API is unhealthy.
  Ingestion never depends on the bot.

## Telegram bot platform

A high-level design; details get settled in its own plan when the work
starts.

- **Library**: grammY. It's TS-native and middleware-based, and has plugins
  for inline menus, conversations and a long-polling runner.
- **Process**: the `packages/bot` service (see "Service boundaries and
  deployment"), using `packages/core` for data access. It runs as a single
  instance, because a Telegram token supports only one long-polling consumer.
  Jobs use `node-cron` like the API's `src/jobs/`.
- **Plugin contract**: each feature is a module that declares its
  - text commands (with help text, registered with `setMyCommands`),
  - callback-button handlers (namespaced `plugin:action` data),
  - scheduled jobs (cron or interval),
  - domain event handlers (e.g. `resultAdded`, `tournamentStarted`,
    `tournamentEnded`, `agentSessionChanged`),
  - its preferences schema (Zod), with defaults and migrations.

  Plugins are enabled / disabled through config.
- **Shared services for plugins**: find the player linked to a chat; send to
  a player or chat (HTML, with rate limiting); per-plugin persistent state in
  a key-value table (replaces `bot.json` and the pickle file); per-plugin
  preferences namespaced inside `players.telegram_bot_preferences` (migrate
  the existing versioned `rivals` block); error handling that reports to the
  admin chat and pauses a failing job instead of killing the bot.
- **Event delivery**: the bot reads the shared `events` table (see "Events and
  effects") with its own persisted cursor. This survives restarts without
  missing or repeating notifications, and replaces the 15 s best-results
  polling for rivals.
- **First plugins**: port every feature in "Telegram bot features". The first
  new plugin is tournament start/end notifications.

## Workstreams

Complexity: **S** = hours to a day, **M** = a few days, **L** = a week or more
including testing. The Priority column is left for triage.

| ID | Workstream | Covers | Complexity | Notes / depends on | Priority |
|---|---|---|---|---|---|
| **Platform track** | | | | | |
| P1 | Package split | Steps, one PR each: (1) run the API on tsx in prod + `/healthz` — **done**; (2) `packages/core` with the DB layer (client without dotenv, Kysely types + codegen, migrations + `MigrationProvider` + scripts, test-DB helpers) as a composite TS project — **done**; (3) move the existing constants and pure logic (`constants/*`, `utils/scoring/*`, `utils/profile/exp.ts`), with the web importing mixes from core — **done**; (4) `packages/ingest` / `packages/bot` skeletons with `/healthz` — **done** (3 and 4 in one PR). Other logic moves to core when a second consumer needs it | M | Needed by W1, W9 | |
| P2 | Deploy pipeline | **Built** (see "What P2 did"). Whole-repo release dirs + a symlink per service, one pm2 app per service, health check + ingestion smoke test + auto-rollback, `deployed/<service>` tags, single workflow with change detection, migration guard, one migrate step before deploys (run over SSH from the new release). Move the existing API deploy onto it first | M | P1 | |
| P3 | Events + effects worker | `events` table and producer helper in `core`; effects worker with a cursor in the API process; `result-added-effect` REST route enqueues instead of running inline; make effects safe to replay | S–M | P1 | |
| P4 | Drop `results_best_grade` | Remove it from `resultAddedEffect`, `deleteResult`, tests and seeds; drop-table migration; regenerate types | S | Nothing (Python B8 is already broken; the table is never read) | |
| **Ingestion track** | | | | | |
| W1 | Ingestion foundations | Legacy REST scaffold in `packages/ingest` (body + query arg merge, Flask-compatible responses and error shapes), agent-header auth, mix / grade / mods constants in `core`, Levenshtein util | S–M | P1, P2; needed by W2, W7 | |
| W2 | Agent heartbeat and uploads | A6, A7, A8 | S | Keep the `<agent>/<path>` layout under the shared uploads directory | |
| W7 | Result ingestion pipeline | A1, A3, A5 for screen and manual (stream A2 and test A4 deferred) | **L** | Highest risk. Sub-steps: player / track / chart resolvers → combo + million validators, mods, rank mode → XX quirks → dedup / merge → persist the complete result row + `resultAdded` event in one transaction → purgatory write. Shadow-validate before cutover | |
| **Web admin track** | | | | | |
| W3 | Admin shell | `/admin` section in the web, guarded by `is_admin` (route guard + nav entry for admins only; server-side `adminProcedure`); tab layout; a shared panel for per-action results; admin-only file viewer / download for screenshots and scan JSON (replaces B21) | S–M | Nothing | |
| W4 | Admin: tracks and charts | B13–B20, tracklist sync (page or script) | M | W3 | |
| W5 | Admin: players and agents | B1–B5: extend `admin.updatePlayer` (nickname, email, discard, is admin, alias, create, per-mix arcade names), hidden → `hidden_since` + chart bump; agent create and token rotation | M | W3 | |
| W6 | Admin: results | B6–B8, plus the missing track / player search and recalculation after edits (fixes the broken refresh callback) | M | W3; B7 reuses the W7 mods / rank validators (port those first if W6 goes before W7) | |
| W8 | Admin: purgatory | B9–B12, reason-field highlighting, edit + recheck, batch recheck that doesn't block | M | W3, W7 (reuses the pipeline) | |
| **Telegram track** | | | | | |
| W9 | Bot platform | `packages/bot`: grammY runner, plugin contract, state and preferences storage, events cursor, jobs, error reporting, health alerts for ingestion / API | M–L | P1, P2; P3 for events | |
| W10 | Port bot features | Plugins: account link, rivals notifications + settings (best-results logic from C2), location monitoring + dialog, heater (Kasa). Event stats is dropped; owjibot stays as is for now | M–L | W9; rivals uses `resultAdded` events (produced since P3, even while Python ingests) | |
| W11 | New notifications | Tournament start / end first (the removed legacy bot command posted bracket announcements to a tournaments channel, configured as `TOURNAMENTS_CHANNEL_ID`; that channel can be reused), more later | S each | W9; tournaments creation job (tournaments plan M5) | |
| **Wrap-up** | | | | | |
| W12 | Cutover and decommission | Proxy flip or agent update for ingestion, retire the desktop tool once the web admin matches it, stop the Python bot, serve C6 (`/agent/:id/lastPlayers/`) from TS so owjibot keeps working (or port owjibot), clean up dead client calls, drop the REST `result-added-effect` route, stop Flask, archive piu-top, remove the legacy mention from `CLAUDE.md` | S | Last, per track | |

Suggested order per track (the tracks can run in parallel once P1 and P2 are
done):
- Platform: P1 → P2 → P3; P4 any time.
- Ingestion: W1 → W2 → W7.
- Admin: W3 → W4, W5 → W6 → W8 (after W7).
- Telegram: W9 → W10 → W11.
- W12 closes each track.

## Open questions

Answered 2026-09-30 (see "Agreed decisions"): piu-spy modes, owjibot, account
linking, web admin scope, where prod migrations run, server layout, event
stats.

1. At cutover, can the deployed agents be updated to the new port, or do we
   use a proxy? Decided at W12. nginx already fronts the legacy port (see
   "Production host"), so the proxy route is just a config change.

