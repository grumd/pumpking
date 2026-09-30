# Legacy Python API (piu-top) — Migration Plan

Status: inventory done 2026-09-30 · direction agreed 2026-09-30 (see "Agreed
decisions") · deploy approach revised 2026-09-30 (tsx + pm2 release dirs, see
"Build and release") · P1.1 and P1.2 deployed 2026-09-30 · P1.3 + P1.4
done 2026-09-30 (PR #39), which completes P1 · P2 deployed 2026-09-30
(PR #40) · P3 deployed 2026-09-30 (PR #41) · P4a deployed 2026-09-30
(PR #42) · P4b built 2026-09-30, not merged yet (see "Progress") · nothing
ported yet beyond
what TS already owns (see "Already in TS") · priorities not set yet

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
| P2 deploy pipeline | **Deployed** 2026-09-30 (PR #40). The first Deploy run was green and created the `deployed/{api,ingest,bot}` tags. On the server, `~/pumpking/{api,ingest,bot}` point at release `db8c1d29`, whose `packages/*/.env` link to `shared/`; `pumpking-ingest` / `pumpking-bot` run from their symlinks and answer `/healthz` (200). `pumpking-api` was moved onto its symlink by hand afterwards (pm2 keeps an app's `cwd` on reload, see "What P2 did") |
| P3 events + effects worker | **Deployed** 2026-09-30 (PR #41). The first Deploy run with the migration guard was green (all three guards passed); the release step ran both migrations on prod, and all three services moved to release `c2b241b5` (a `packages/core` change counts for every service). Checked on prod afterwards: every pm2 app online, API `/healthz` ok, no errors in the API log, `@@auto_increment_increment` = 1, and the backfill scored the rank mode rows (4,591 with a `score_phoenix`, 773 without full stats still null). No result had arrived yet, so `events` was empty and there was no `effects` cursor row (see "Next") |
| P4a stop using `results_best_grade` | **Deployed** 2026-09-30 (PR #42). Before merging: API tests pass (76), all packages type-check; master's tests pass with the new migration (the guard's check, run locally); on the dev DB (a copy of prod data), deleting a result the table points at fails before the migration and works after it (rolled back), and the migration's `down` works. The Deploy run was green (guards passed, migration ran on prod), all three services run `5a241f21`, and the table has no foreign keys left on prod |
| P4b drop `results_best_grade` | **Built, not merged.** API tests pass (76; the test code is P4a's, so this is also the guard's check), all packages type-check from a clean build, and the migration's up / down / up works on the dev DB |
| W tracks | Not started |

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

### Server state after P2

- The P2 layout: `~/pumpking/releases/<sha>/`, `~/pumpking/shared/{core,api,ingest,bot}.env`
  (`chmod 600`, in a `700` directory), and one symlink per service. The keys
  in `shared/api.env` match the old `packages/api/.env`.
- `~/pumpking-deployment/` (the pre-P2 live dir) and the old API env backup
  were removed after the P3 deploy. Nothing on the host runs outside
  `~/pumpking/` except the legacy apps (see "Production host").
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

- **`deploy.yml`** replaces `deploy-api.yml`. On a push to `master`:
  1. `changes`: `dorny/paths-filter` says which services changed since the
     previous push. A service counts as changed when its package does, or
     `packages/core`, the root `package.json` / lockfile, `pm2.config.js` or
     `deploy/`.
  2. `test-api`, `test-ingest`, `test-bot`: every service's tests, always.
  3. `guard-api`, `guard-ingest`, `guard-bot` (only when
     `packages/core/migrations` changed): the migration guard. Each checks out
     its `deployed/<service>` tag, swaps in the new migrations and runs that
     commit's tests.
  4. `release`: rsyncs the commit to `~/pumpking/releases/<sha>/` (without
     `.git`, `node_modules`, `packages/web`) and runs `deploy/release.sh`.
  5. `deploy-api`, `deploy-ingest`, `deploy-bot` (the changed ones, in
     parallel): run `deploy/deploy-service.sh`, then move the
     `deployed/<service>` tag to the commit.
- **`test-service.yml`** is the one reusable test workflow (inputs `service`,
  `ref`, `migrations_from`). `test-api.yml` / `test-services.yml` call it on
  PRs; `deploy-service.yml` is the reusable deploy job.
- **`deploy/release.sh <sha>`** links `~/pumpking/shared/<package>.env` into
  the release as `packages/<package>/.env`, runs `npm ci` and the prod
  migrations, and removes old releases (keeps the 5 newest, plus any a service
  runs). A `.ready` file makes a re-run for the same commit a no-op, so
  dependencies never get reinstalled under a running service.
- **`deploy/deploy-service.sh <service> <sha>`** points `~/pumpking/<service>`
  at the release, `pm2 startOrReload`s the app, and curls its `/healthz`. If
  the check fails, it points the link back, reloads, and fails the job (the
  tag stays on the running commit).
- **`pm2.config.js`** (root) defines the three apps. Each app's `cwd` is
  `~/pumpking/<service>/packages/<service>`, i.e. through the symlink: pm2
  (checked with 5.3) resolves it on every start, so a reload runs whatever the
  link points at. The per-package pm2 configs, the API's `npm run pm2` and
  `restart-server.sh` are gone.
- **pm2 keeps an existing app's `cwd` on reload** even when the ecosystem
  file changes it. So `pumpking-api`, which runs from `~/pumpking-deployment`,
  has to be moved once by hand (see "Next").
- **Ingest and bot listen on 127.0.0.1**, ports 3002 / 3003: the host has no
  firewall (ufw inactive). The ingestion smoke test against
  `/results/screen/validate` goes into `deploy-service.sh` with W1 / W7, once
  that endpoint exists.
- Left out: `--link-dest` (the upload is ~2 MB; `node_modules`, ~290 MB per
  release, is installed fresh either way, and the host has 132 GB free), pm2
  memory limits (the API uses ~210 MB of 8 GB).

### What P3 did

- **Tables** (migration `20260930050000_add_events`): `events` (`id` int
  auto-increment, `type`, `payload` JSON, `created_at` `datetime(3)` in
  UTC), `event_cursors` (`consumer` primary key, `event_id`, `updated_at`)
  and `event_failures` (`consumer` + `event_id`, `attempts`, `error`,
  `failed_at`: the events a consumer skipped). Added to `database.ts` by
  hand, like codegen would (not regenerated, see "Schema drift").
- **`packages/core/src/events.ts`**:
  - `EventPayloads` lists every event type and its payload. So far only
    `resultAdded: { resultId }`.
  - `addEvent(trx, type, payload)` is the producer helper: pass the
    transaction of the change, so the event is stored only if the change is.
  - `createEventConsumer(name, handle)` returns `processBatch()`, which reads
    up to 100 events after the consumer's cursor, in id order, and saves the
    cursor after each one. The bot will use the same helper with its own name.
  - **Gaps:** AUTO_INCREMENT hands out ids on insert, not on commit, so an
    event can become visible after one with a higher id. When ids are missing,
    the consumer stops there until the next event is 10 s old; by then the
    missing ids are rolled-back inserts. This holds as long as no producer
    transaction stays open longer than 10 s after inserting its event. It also
    assumes `auto_increment_increment = 1` (the default; checked on the dev DB
    only, MySQL 9.7). With another step, every event would wait the 10 s.
  - **Failures:** a failing event is retried with the next batches and skipped
    after 5 attempts (`console.error` for each attempt). A skipped event gets
    an `event_failures` row with the error, and is never deleted, so it can
    be looked at or replayed by hand. The attempt count lives in memory, so a
    restart starts it again.
  - `deleteOldEvents(days)` deletes events older than `days` only if every
    consumer's cursor is past them and no consumer skipped them. With no
    cursors at all it deletes nothing. A consumer that is retired has to have
    its `event_cursors` row removed, or it holds every later event.
- **API**: `services/effects/effectsConsumer.ts` is the `effects` consumer
  (`resultAdded` → `resultAddedEffect`). `jobs/effectsJob.ts` polls it every
  second (the next poll is scheduled when the current one ends) and runs
  `deleteOldEvents(30)` every day at 5 AM. `startEffectsJob()` returns a
  `stop()`; `jobs/index.ts` (loaded only by `src/index.ts`) starts it.
- **Tests** (`events.test.ts`, plus the add-result tests, which call
  `applyEffects()` from `test/helpers` after each add):
  - End to end, with the real job loop: a tRPC manual add gets pp / exp and
    the player totals; a Python callback gets its effect; a backlog of events
    that were queued while the job was stopped is worked through in order, and
    only the better of two results gets pp.
  - Producers: a manual add stores the result with `score_phoenix` plus one
    event and no effects; a rejected add stores neither; when the event
    can't be stored (table renamed), the result insert is rolled back; the
    callback stores an event and applies nothing inline.
  - Consumer: id order, cursor, waiting at a gap and moving past it once it
    times out, retries then skip + `event_failures` row, unknown event
    types, a result deleted before its event.
  - Retention and replay (see above).
  - Not covered: `addResult` passing its own transaction to `addEvent`
    (rather than `db`). With `db`, the event could be seen before the result
    commits and the effect would skip it as deleted; a test can't reliably
    hit that window.
- **Producers:**
  - `POST /results/result-added-effect/:id` (Python calls it after it inserts
    *or updates* a result) now only adds a `resultAdded` event and returns 200.
  - The web manual add (`addResult`, REST and tRPC) inserts the result and its
    event in one transaction. It now also writes `score_phoenix` (from the
    stats), which used to be left to the inline effect. After adding, the web navigates to the chart leaderboard,
    which may show the new result without pp for about a second.
  - Admin delete (`admin.deleteResult`) still recalculates inline; W6 turns
    admin edits and deletes into `resultChanged` events.
- **Replay safety:** `resultAddedEffect` already recomputed everything (score
  phoenix only when null, is-pass, exp and the player's exp total, pp only for
  the player's current best on the chart, player pp from their best pp per
  chart). A test runs it twice and compares results, players and pp history. A
  result deleted before its event is processed is now skipped instead of
  failing with a 404. A replay bumps `shared_charts.last_updated_at` again;
  the Python bot then gets that chart in its C2 feed again, but it only
  notifies about results `added` after the newest one it has seen, so nothing
  is sent twice.
- **Rank mode (VJ) results count like the others** (decided 2026-09-30).
  They used to get no `score_phoenix` (the effect's fallback and the 2024
  backfills skipped them), and that null alone kept them off the chart
  leaderboard, pp, exp and tournaments. Python ingestion always stored one,
  so ~20 of them counted already. Now the manual add and the effect compute
  it for rank mode too, and migration
  `20260930060000_backfill_rank_mode_score_phoenix` fills in the old ones:
  `score_phoenix` and `exp` for rank mode rows with full stats, then every
  player's total exp. It computes in DOUBLE, because MySQL's exact DECIMAL
  math comes out 1 higher than `getPhoenixScore` for some stats. On a copy of
  prod data (dev DB) it scored 4,571 rows, all equal to the JS functions; 773
  have missing stats and stay null. Their **pp arrives with the next nightly
  chart difficulty job** (4 AM), which recalculates all pp and player totals.
  Its `down` does nothing. Difficulty interpolation still ignores rank mode
  (`rank_mode = 0`, unchanged). Tested in `rankModeScores.test.ts`
  (manual add, effect, the migration's `up` on an old-style row), and
  `chartsSearch` / `tournaments` tests now exclude "no phoenix score" rather
  than "rank mode".
- **Deleted:** `controllers/results/index.ts` (an unused copy of the
  callback controller).
- **Not done:** only one API process may run the job. pm2 runs one
  fork-mode process, and a restart stops the old one before starting the new
  one. If two ever ran, both would process the same events (safe to replay,
  just wasted work).

### What P4a did

P4 is split in two (expand / contract). The migration guard runs the deployed
commit's tests against the new schema, and the code before P4a writes the
table, so the table can only be dropped once P4a runs everywhere.

- **Code**: `resultAddedEffect` and `deleteResult` no longer touch
  `results_best_grade`; the seed and the two add-result assertions that read
  it are gone. Nothing in P4a's code or tests names the table, so P4b's guard
  passes. `gradeSortValue` / `isValidGrade` in core lost their only user but
  stay (W7's validators need grades).
- **A new best grade no longer bumps `shared_charts.last_updated_at` /
  `top_results_added_at`**; only a new best score does. Nothing reads
  `top_results_added_at`. `last_updated_at` feeds the Python C2 feed, whose
  `bestGradeResults` only the dropped event stats used (`rivals.py` has that
  line commented out), and a result that isn't a best score is never in its
  `results`. So the rivals bot sends exactly what it sent before.
- **Migration `20260930070000_drop_results_best_grade_foreign_keys`** drops
  the table's three foreign keys. Without it, deleting a result the table
  still points at (82,707 rows in prod) would fail, now that nothing cleans
  the rows up. The code before P4a keeps working without the keys. Its `down`
  adds them back (and fails if rows point at deleted results by then).
- **What else names the table** (searched 2026-09-30: piu-top at `4cd3b3d`,
  the prod checkout including its untracked files, piu-spy, and the prod DB's
  views, triggers, routines, events and foreign keys): only piu-top.
  - B8 (`results.py:453`), already broken (see "Dead or broken").
  - D3 in `testing_routes.py`, dev only.
  - The integration tests' `verifyBestResults` (`rank_detection.py`,
    `result_edit.py`). It checks `results_highest_score_no_rank` first, which
    was dropped in 2023, so these checks have failed since then. When W7 ports
    those scenarios, leave the best-table checks out.

### What P4b did

- Migration `20260930080000_drop_results_best_grade` drops the table (82,707
  rows in prod, all derivable from `results`, and never read). Its `down`
  brings it back empty, in its P4a shape.
- `ResultsBestGrade` removed from `database.ts` by hand, the way codegen would.

### Next

1. When a result comes in through Python, check that it gets pp / exp within
   seconds (`events` gets a row, `select * from event_cursors` shows the
   `effects` cursor at the newest event id, `event_failures` is empty).
   Nothing had arrived by 19:25 UTC on 2026-09-30.
2. **Merge P4b.** Its guard runs P4a's tests, which don't name the table.
   After the deploy, check that `results_best_grade` is gone on prod.
3. Start a track (W1, W3, W9): P1–P3 unblock all of them, and P4 blocks none.
   W10's rivals plugin can consume `resultAdded` from now on.

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
| Post-insert effects | `POST /results/result-added-effect/:id` (REST, called by Python) | Since P3 it only enqueues a `resultAdded` event, which the effects job processes (see "What P3 did"). W12 drops the route once Python ingestion is gone |
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
  best-grade logic (C2) computes the value itself. Removed by P4 (see "What
  P4a did").
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
`packages/web` left out, change detection against the previous push rather
than the tags), is in "What P2 did".

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
| P2 | Deploy pipeline | **Deployed** (see "What P2 did"). Whole-repo release dirs + a symlink per service, one pm2 app per service, health check + ingestion smoke test + auto-rollback, `deployed/<service>` tags, single workflow with change detection, migration guard, one migrate step before deploys (run over SSH from the new release). Move the existing API deploy onto it first | M | P1 | |
| P3 | Events + effects worker | **Deployed** (see "What P3 did"). `events` table and producer helper in `core`; effects worker with a cursor in the API process; `result-added-effect` REST route enqueues instead of running inline; make effects safe to replay | S–M | P1 | |
| P4 | Drop `results_best_grade` | Two steps (see "What P4a did"): (a) **deployed**: stop using it, drop its foreign keys; (b) **built**: drop the table. Remove it from `resultAddedEffect`, `deleteResult`, tests and seeds; drop-table migration; regenerate types | S | Nothing (Python B8 is already broken; the table is never read) | |
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

