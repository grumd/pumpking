# Monthly Tournaments — Relaunch Plan (shared cross-mix pool)

Status: design decisions finalized 2026-09-28 · no code written yet

## Summary

Relaunch the monthly tournament (last run: Phoenix-only, Aug 2026) as a single
**cross-mix** tournament: players on XX (26), Phoenix (27) and Phoenix 2 (28)
compete in the same event. The chart pool is **shared across mixes** (only
charts that exist in all three mixes), and charts are assigned to skill
brackets by **interpolated difficulty (ID)**, not by the official level number
(which drifts per mix — e.g. one shared chart is D7 on XX, D9 on Phoenix,
D10 on Phoenix 2).

**Format (agreed):**
- Pool selection: the **legacy random algorithm** (uniform random within the
  bracket's ID band, per the old `randomizeCharts`), ported to the shared pool.
- **Fully automatic**: a monthly job creates the tournament, brackets, random
  pool and bracket assignments. No manual approval, no admin screen, no join step.
- Each bracket's pool: **6 charts** (Easy 6S, Mid 5S+1D, High/Top 3S+3D) —
  **only the player's best 3 count**.
- Metric: **sum of the player's best 3 Phoenix scores** (`score_phoenix`) over
  the pool — plain machine scores, no PP or other derived metrics.
- Brackets: the **highest ID band in which the player has 5+ chart bests of
  950,000+** (6-month window) — the legacy PB algorithm shape with the grade
  filter replaced by a plain score threshold. Unrated players get the Easy
  bracket instead of being excluded.
- Awards (post-launch, M7): gold/silver/bronze cups for the bracket podium
  (ties share), accumulated per player — see "Cups and tournament results".

The legacy system (68 tournaments since 2020, driven by the retired Python API —
source snapshot at `/home/grumd/coding/piu-top`, from 2021-12, XX era) left the
tables `tournaments`, `tournament_brackets`, `tournament_charts` in place with
history. We reuse these tables and re-implement everything in the new tRPC/TS
stack **in this repo (pumpking)**. The old tournament code in piu-top is
retired as part of this work (see "Retiring the legacy code"). Old rows are
never modified. See "Legacy mechanism" below for how the old system worked.

## Agreed design decisions

| Decision | Value |
|---|---|
| Supported mixes | XX (26), Phoenix (27), Phoenix 2 (28) — a `SUPPORTED_MIXES` constant |
| Cadence | One tournament per calendar month; window 1st–24th (ends 25th); final results shown 25th–1st |
| Chart pool | Shared: `shared_charts` (type S or D) that have a `chart_instance` in all 3 supported mixes |
| Pool grouping | By `chart_instances.interpolated_difficulty` (ID) band per bracket — not official `level` |
| Pool selection | Legacy `random.choice` within the band, per bracket (ported, without replacement); fully automatic |
| Pool size | 6 charts per bracket (6S / 5S+1D / 3S+3D / 3S+3D), **top 3 count** |
| Player brackets | 4 brackets — Easy [1,14) incl. unrated, Mid [14,17), High [17,20), Top [20,28]: highest ID band with **5+ chart bests of 950,000+** (6-month window, no grades); snapshot at creation |
| Participation | Automatic: every non-hidden player gets a bracket assignment at creation (no join concept) |
| Metric | Sum of the player's best 3 per-chart `score_phoenix` over the 6-chart pool |
| Result eligibility | `rank_mode = 0` (no VJ), no mods, result `gained` inside the tournament window, player + result not hidden |
| Tables | Reuse `tournaments` / `tournament_brackets` / `tournament_charts` (+ small additions, below) |
| Code location | All new code in the pumpking repo; piu-top tournament code deleted |
| Cups (M7) | Gold/silver/bronze per bracket podium (ties share); recorded in `tournament_results` at end; profile + ranking list show accumulated counts |
| Main leaderboard highlight (M8) | While Live: badge on pool charts + on counting results, and a banner linking to `/tournaments` |
| Nav notice badge (M9) | Red "!" on the Tournaments nav link while an unread notice exists (materialized `player_notices` rows written at tournament creation, cleared by one mutation on page visit) |

## Why this works (data, from prod on 2026-09-28)

- The shared S/D pool is large: **3,117 shared charts** (1,923 S over 486 songs,
  1,194 D over 479 songs) exist in all three mixes.
- ID band depth for the shared pool (count of shared charts, `floor(ID)`):
  bands 1–5 hold ~260, 6–18 each ~85–270, 19–28 another ~350. Every bracket
  band has far more candidate charts than the 5 we will select.
- A level 12–14 player on *any* mix has ~100+ shared charts in their comfort
  band — the pool is deep enough that mid-level players get a real field, and
  the raw-score metric lets them compete on their own terms.
- Official levels are not comparable across mixes for the same chart, but ID is
  a single cross-mix number — which is why we pool on it.
- **Every player gets a bracket.** The old system's PB/grade algorithm left
  unrated players (level -1) out entirely; EXP-rank distribution shows most of
  the base is low-level (93 of 166 non-hidden players below old-bracket
  equivalent rank 11). Unrated players now fall into the Easy bracket.
- **Top-3-of-6 counting** keeps the pool interesting for weak players: they
  only need to shine on 3 charts, and the 3 extra charts absorb a bad month /
  an unfamiliar pick — addressing the "only top players can win" problem.
- **Singles/doubles depth per band** (shared charts in all 3 mixes):
  Easy [1,14): 994 S / 217 D, Mid [14,17): 320 S / 248 D, High [17,20):
  365 S / 319 D, Top [20,28]: 244 S / 410 D. Every bracket's composition
  (6S / 5S+1D / 3S+3D) has ample candidates.

### Current player base (measured 2026-09-28, 180d skill window)

| Bracket | Players | Active (90d) | Results pace (Aug–Sep) |
|---|---|---|---|
| Easy | 132 | 8 | ~28/mo |
| Mid | 11 | 6 | ~256/mo |
| High | 11 | 6 | ~34/mo |
| Top | 12 | 10 | ~539/mo |

Notes: Top 22+ was tested first but only 2 players qualify (only 254 shared
charts exist above ID 22, so the 5-chart rule is structurally hard there). The
active mass sits at skill 14–19; the 17 boundary leaves High quiet (~34/mo) —
accepted, and it is a one-constant change if ever revisited. A one-day bulk
import dated Jul 31 (~1,300 results) inflates 90-day totals; the Aug–Sep pace
is the honest number.

## Prerequisite: Phoenix 2 ID coverage

Blocker for the ID-based design: `interpolated_difficulty` is only populated
for chart instances that have results, and P2 is new:

| mix | S/D charts | null ID |
|---|---|---|
| 26 XX | 3,878 | 3 |
| 27 Phoenix | 4,434 | 68 |
| 28 Phoenix 2 | 4,535 | **4,292 (95%)** |

The interpolation (`chartDifficultyInterpolation.ts`) computes **one difficulty
per shared chart** (weighted from all mixes' results + the built-in level of
the latest result), then writes it back only to the instances that appear in
`bestResults`. Fix: after computing per-shared-chart difficulties, write the
value to **all** `chart_instances` of that shared chart (at least those where
`interpolated_difficulty IS NULL`) within the supported mixes. One-off run +
the daily job then keeps P2 filling in organically as P2 results accumulate.

- Fallback if the backfill proves noisy: band by the XX/Phoenix instance's ID
  (99%+ covered) and ignore the P2 instance when banding. We don't expect to
  need this.
- Accept: until P2 results accumulate, P2 instances carry the cross-mix
  estimate. Band width (±2) absorbs that error.
- Note: after this backfill, all instances of a shared chart share one ID value,
  which makes "the chart's ID" unambiguous for both banding and random selection.

## Brackets (confirmed)

A bracket is defined by **one ID band** used for both charts and players:

| Bracket | Chart ID band | Player: skill band (950k rule) | Pool (composition) |
|---|---|---|---|
| Easy | [1, 14) | unrated, or skill in [1, 14) | 6 × S |
| Mid | [14, 17) | skill in [14, 17) | 5 × S + 1 × D |
| High | [17, 20) | skill in [17, 20) | 3 × S + 3 × D |
| Top | [20, 28] | skill in [20, 28] (or above) | 3 × S + 3 × D |

Bands are half-open ([lo, hi)) except Top, which is closed. Doubles phase in
gradually: Easy plays singles only, Mid one double, High/Top full 3S+3D.
Top 3 of 6 count. Band edges are fixed (as decided): Mid from 14, High from
17, Top from 20.

## Player skill algorithm (score-based, Phoenix)

Per player, over the 180 days (6 months) before the tournament `start_date`:

(6-month window chosen over the legacy's 365: the player base and machine
mix are shifting fast — Phoenix 2 rollout — so recency matters more.)

1. Players: non-hidden. (Legacy's `stat_top_req_counter > 5` is **not**
   carried over — it counts profile page views, not play activity; see open
   decision #3.)
2. Per player × shared chart (S/D) with results in **any supported mix**:
   best = `max(score_phoenix)` on that shared chart's instances.
3. A chart **qualifies** if the player's best on it is **≥ 950,000** (95% on
   the 1,000,000 Phoenix scale — `TQ_QUALIFY_SCORE` constant). No grades are
   involved in bracket selection at all.
4. Count qualifying charts per **ID band** (the shared chart's band). Skill
   band = the **highest** band with **≥ 5 qualifying charts**. No band
   qualifies → unrated.
5. Bracket = the bracket of the skill band; unrated → Easy.

Same shape as the legacy PB/grade algorithm (best per chart, ≥ 5 in a band,
highest band wins), with the grade filter (A+/S/SS/SSS) replaced by the plain
950k score threshold, the best taken per shared chart across mixes, and
grouping by ID band instead of per-mix official level. Unrated players are
included (Easy) instead of excluded.

Snapshot at tournament creation (1st): each non-hidden player gets one row in
`tournament_player_brackets` with their skill band and bracket. The leaderboard
never recomputes skill.

## Pool selection (ported legacy algorithm, automatic)

Port of `randomizeCharts`: for each bracket,
1. Candidates = shared charts (type S or D) whose ID falls in the bracket band.
2. Split into S and D.
3. Pick the bracket's S and D counts (6S / 5S+1D / 3S+3D / 3S+3D) by
   **uniform random, without replacement** (legacy used `random.choice` with
   replacement — dedupe is a deliberate fix; a pool never repeats a chart).
4. Store in `tournament_charts` by `shared_chart_id`.

No popularity ranking, no voting, no approval. Fresh random pool every month
(legacy pools rotated ~100% month to month for the same reason).

## Scoring rules

For a given tournament + bracket:

1. Player set: `tournament_player_brackets` for that bracket.
2. Pool: the bracket's 6 `shared_chart_id`s.
3. Per pool shared chart, the player's qualifying results = `results` where
   `chart_instance` is that shared chart's instance in `SUPPORTED_MIXES`, and:
   - `gained` (use `exact_gain_date`) in `[start_date, end_date)`
   - `rank_mode = 0` (no VJ)
   - `mods_list` NULL/empty
   - `score_phoenix IS NOT NULL`
   - player `hidden = 0` and result `is_hidden = 0`
   - `player_id` is the player
4. Best `score_phoenix` per pool chart per player (≤ 6 values).
5. **Tournament score = sum of the player's top 3 of those bests** (fewer than
   3 qualifying charts → sum of what exists).
6. Ranking: total desc **only** — ties share the place (standard competition
   ranking: rank = 1 + number of players with a strictly higher total), and a
   prize goes to everyone holding the place. Order inside a tie is display-only
   and deterministic (best single desc, then player_id asc).
7. Leaderboard is a live query (6 charts per bracket — tiny); result
   deletions/moderation reflect immediately — label the UI "subject to
   moderation". After `Ended`, display is served from `tournament_results`
   instead (see the M7 section below).

## Lifecycle (fully automatic)

States (additive strings on `tournaments.state`):
`Live → Ended` (no Draft, no Announced, no approval — the pool goes public the
moment it is created)

| Event | Effect |
|---|---|
| Job on the 1st of month M | Create tournament (`name` = month, `start_date` = 1st of M, `end_date` = 25th of M); create 4 brackets with ID bands; randomize pools (stored in `tournament_charts`); assign brackets to all non-hidden players (skill snapshot → `tournament_player_brackets`); write a pending notice per assigned player (M9); state `Live` — pool public, results count immediately |
| 25th of month M (job) | state `Ended` — window `[1st, 25th)` closed, winners final; also writes `tournament_results` (ranks + medals — M7) |
| 25th → 1st of next month (UI only) | Show the final winners with a "new tournament starts on the 1st" notice; no job needed |

`voting_end_date` stays NULL for new rows (the old review window is gone).

### Participation — do we need "join"?

No join concept at all: the tournament is created, and any score made on a
pool chart during the window counts for a player in that bracket. The only
remaining question is where the bracket assignment lives:

- **Stored snapshot (decided — see open decision #1)**: the
  `tournament_player_brackets` table below. Reasons: brackets are stable
  (a player can't shift brackets mid-month when old results are deleted or
  a player is un-hidden), the leaderboard query stays a simple join, and the
  6-month skill scan runs once per month instead of per request. Cost: ~170
  rows/month.
- **Stateless (alternative)**: no table; the leaderboard computes each
  player's band live per request (the legacy approach). Works, but costs a
  6-month scan per request and brackets drift when history is moderated.

Timing (decided — open decision #6): create on the 1st, window 1st–24th
(`[1st, 25th)`), end on the 25th; final winners displayed 25th–1st with a
"new tournament on the 1st" notice. The pool is announced the day it goes live
(no practice lead-in — accepted, to avoid a visible-but-not-counting pool).

## Cups and tournament results (post-launch finishing — M7)

**Awards**: per bracket per tournament, 1st place gets a **gold** cup, 2nd
**silver**, 3rd **bronze**. Ties share the place and the cup (per the ranking
decision). Cups accumulate per player across tournaments, and each award
records **which bracket** it was won in — the cup icon can vary by
bracket × medal (up to 12 variants).

**Recording** — new table `tournament_results`, populated **once** by the
Ended job on the 25th:

- `id, tournament_id, bracket_id, player_id, rank INT (shared rank),
  score BIGINT (top-3 total), medal ENUM('gold','silver','bronze') NULL,
  created_at, unique(tournament_id, player_id)`
- One row per bracket player with 1+ qualifying results (rank + final
  score); `medal` set for the top-3 places.
- No minimum participation in v1 — a solo player's gold is a gold (the
  bracket's participation is visible on the leaderboard); a minimum would be
  a one-constant change later.

**Authority**: from the moment of `Ended` on, `tournament_results` is the
single source of truth for that tournament — the 25th–1st winners display,
the `getCurrent` Ended view and the past-tournaments list (`list`) all read
from it instead of recomputing. Medals are settled on the 25th; later
moderation of results does not revoke them (accepted — same spirit as the
retroactive-moderation risk). The "subject to moderation" label applies to
the live window only.

**Display** (queries aggregate a tiny table — no denormalization on
`players`):

- **Profile**: accumulated cups — counts per medal (e.g. 2 gold, 1 silver,
  1 bronze) plus the award list (tournament, bracket, medal) so per-bracket
  icon variants can be shown.
- **Ranking list**: gold/silver/bronze counters per player replace the
  grade-based stat columns; EXP/PP/play-count stay. Exact column layout is a
  UI detail at implementation time.

## Main leaderboard highlight (post-launch — M8)

While a tournament is **Live**, the main leaderboard (charts list page +
single-chart page) advertises it, so players browsing for new scores
immediately see there is a tournament and can go participate:

- **Chart badge**: a shared chart that is in the current pool gets a
  tournament badge in the `ChartHeader` (cup icon / "T" mark).
- **Result badge**: result rows that count for the tournament (pool chart,
  `gained` inside `[start_date, end_date)`, non-hidden) get a small mark.
- **Banner** (main leaderboard page): "<Month> tournament is live — ends on
  the 25th" with a link to `/tournaments`. Shown while Live only; the ended
  25th–1st window stays quiet (nav link + tournament page cover it).

Backend: the leaderboard query tags rows server-side — `inTournament` on the
chart (its `shared_chart_id` is in the Live tournament's `tournament_charts`)
and `countsForTournament` on the result. One small lookup against ≤ 24 pool
charts (4 brackets × 6) — negligible cost; reuses the existing highlight
machinery in `Chart.tsx` for styling the rows.

## Nav notice badge (post-launch — M9)

A red "!" mark next to the **Tournaments** link in the `TopBar` while the
logged-in player has an unread notice for that scope.

**Notice model** — notices are **materialized at event time** (write-time),
not computed at read time:

- A **scope** is a surface that can raise notices; scopes map to nav
  surfaces (now `tournament`; later e.g. `cup` for awards).
- When the event happens, the responsible job writes a `player_notices` row
  for each **affected** player:
  - Tournament creation job (1st): upsert a notice per assigned player —
    exactly the set that got a `tournament_player_brackets` row, in the
    same transaction. Players not selected (hidden at creation, registered
    mid-month) simply get no row and no notice — applicability is decided
    at write time and stored, so the read side never checks it.
  - (M7, later) the Ended job can upsert `scope='cup'` rows for medal
    winners — same table, no new mechanism.
- **At most one notice per player per scope** — the upsert coalesces: if
  the player already has a pending notice (they skipped months without
  visiting), the row is re-pointed at the new tournament instead of
  stacking; if the previous notice was read, a fresh pending one is
  created. A player who skips months therefore never accumulates multiple
  tournament notices — one badge, always pointing at the newest.
- **Unread** = the player's row for that scope has `read_at IS NULL`.
- **Clear** = one mutation: `SET read_at = NOW()` on the player's pending
  row of that scope. The tournaments page calls it in an on-mount effect.
  The badge lingers into the 25th–1st Ended window until the first visit.

Why write-time rather than read-time computation (the cursor model that was
considered first): the read path stays **constant** — one indexed
"any unread?" query on the player's own rows no matter how many scopes are
added; the `user` route never touches tournament tables; and the table
stays bounded (one row per player per scope). (Continuous high-frequency
surfaces, e.g. "new results" markers, would not use this table — that would
be a lightweight timestamp; this model is for discrete events. A full
history inbox, if ever wanted, would be a separate event log.)

**Storage**:

```sql
CREATE TABLE player_notices (
  player_id INT NOT NULL,
  scope VARCHAR(32) NOT NULL,   -- 'tournament', later 'cup', ...
  ref_id INT NULL,              -- newest event for this scope (e.g. tournament_id)
  created_at DATETIME NOT NULL, -- when the current pending state began
  read_at DATETIME NULL,
  PRIMARY KEY (player_id, scope)
);
```

Creation-job upsert (per assigned player; set-based in the real
implementation):

```sql
INSERT INTO player_notices (player_id, scope, ref_id, created_at, read_at)
VALUES (:pid, 'tournament', :tid, NOW(), NULL)
ON DUPLICATE KEY UPDATE
  ref_id = VALUES(ref_id),
  read_at = NULL,  -- always pending after a new event...
  created_at = IF(read_at IS NULL, created_at, VALUES(created_at));
  -- ...keep created_at if one was already pending, else reset it
```

The table is bounded by players × scopes (a few hundred rows total) — no
retention policy needed.

**API** — dedicated `notices` router (keeps `user.current` domain-free):

- `notices.unread` query → `{ [scope]: boolean }` for the logged-in player
  (one indexed query on the player's own rows); guests get an empty map.
- `notices.markRead(scope)` mutation → clears that scope's pending rows,
  returns the fresh unread map; the web hook writes the result into the
  `notices.unread` query data (same pattern as `usePreferencesMutation`).

**Nav**: the TopBar Tournaments `NavLink` renders a small red "!" when
`unread.tournament` is true (its own `useNoticesQuery`); the tournaments
page (M4) calls `notices.markRead('tournament')` on mount.

## Schema changes (migrations)

1. `tournament_brackets`: add `min_interpolated_difficulty DECIMAL NULL`,
   `max_interpolated_difficulty DECIMAL NULL` (half-open band). Legacy
   `min_level`/`max_level` (official level) and `mix` stay for history; new
   rows leave `mix` NULL (NULL = cross-mix).
2. `tournament_charts`: add `shared_chart_id INT NULL`. New tournaments store
   the shared chart (players resolve their own mix's instance at scoring
   time); legacy rows keep `chart_instance_id`.
3. New table `tournament_player_brackets`:
   `id, tournament_id, bracket_id, player_id, skill_id DECIMAL NULL (NULL =
   unrated), created_at, unique(tournament_id, player_id)` — bulk-inserted at
   creation, one row per non-hidden player. It is a bracket-assignment
   snapshot, not a join record (see the participation note in Lifecycle).
4. `tournaments`: add `name VARCHAR NULL` (e.g. "October 2026"), auto-filled.
5. (M7, post-launch) `tournament_results` — see "Cups and tournament
   results"; separate migration so the launch is not blocked.
6. (M9, post-launch) `player_notices` table — see "Nav notice badge";
   separate migration.

## API (tRPC) and UI

New router `tournaments.ts` + service `src/services/tournaments/`:

| Procedure | Purpose |
|---|---|
| `getCurrent` | Current tournament (or the ended one shown 25th–1st): state, dates, brackets (bands), pool per bracket, player's own bracket + per-chart bests + current rank; final results + "new tournament on the 1st" flag when Ended (M7: read from `tournament_results`) |
| `getLeaderboard` (bracketId, page) | Bracket leaderboard: rank, player, per-chart bests, top-3 total (live query while Live; from `tournament_results` once M7 lands) |
| `list` | Past tournaments (name, dates, top 3 per bracket) — from `tournament_results` once M7 lands |

No join action, no admin procedures — everything is automatic.

Web: new `features/tournaments/` (page route `/tournaments`, nav link):
current tournament card (state + dates; final results + "new tournament on the
1st" notice during 25th–1st), pool table per bracket (chart name,
ID, per-mix level/label), bracket leaderboard tabs, "my progress" (per-chart
bests, which 3 count, current rank), past-tournaments list. Reuse leaderboard
table components from `features/leaderboards` where they fit.

## Legacy mechanism (from `piu-top` code, 2021-12 snapshot)

Checked out at `/home/grumd/coding/piu-top` (XX era: `targetMixNumber = 26`;
the prod copy used 27 for the 2024–2026 Phoenix tournaments). Authoritative
description of how the old system worked:

- **Creation** (`jobs/main.py` + `jobs/tournament_jobs.py`): cron on day 1 of
  each month created the tournament (state `ChartPoolVoting`) with 4 hardcoded
  brackets and called `bracket.randomizeCharts()`. Cron on day 26 set state
  `Ended`. "Voting end" was a **manual GET route** (`/tournament/voting-end`)
  flipping state to `Active` — there is no voting code anywhere; the state
  name is a misnomer for a human review/edit window on the random pool.
- **Chart selection** (`TournamentBracket.randomizeCharts` in
  `backend/alchemy/tables.py`): per bracket, take target-mix instances with
  `min_level <= level <= max_level`; singles = labels `S*` (not `SP`), doubles
  = `D*` (not `DP`); pick `singles_count`/`doubles_count` charts via
  `random.choice` (with replacement — no dedupe). No popularity weighting, no
  player input.
- **Player level** (`getPlayerLevels` in `backend/tournaments.py`): over the
  365 days before the start date, for non-hidden players with
  `stat_top_req_counter > 5`, per player per chart take the PB
  (`max(score_xx)`), then count PB-tying results per (chart level, grade).
  Player level = the **highest level with ≥ 5 PB-tying results whose top grade
  is A+/S/SS/SSS**. Unrated players → level -1 → in no bracket.
- **Scoring**: `getBrackets` returned all qualifying raw results (single
  target mix, window `[start, end]`, `mods_list NOT LIKE %VJ%`, player in
  bracket). The legacy web (`Tournaments.jsx`, in this repo's git history at
  `298a0c29^`) aggregated client-side: per chart, *player best score / field
  best score* (%), **total = sum of per-chart percents** — a relative metric.
  The new system uses the agreed absolute metric (sum of best 3
  `score_phoenix`), computed server-side.
- **Single mix only**: everything was filtered by `mix == targetMixNumber` —
  the exact limitation this relaunch removes.

## Retiring the legacy code (piu-top)

Self-contained (verified: no other references). Delete:

| File | What |
|---|---|
| `backend/tournaments.py` | whole module (routes' handlers + PB/grade + bracket/score assembly) |
| `backend/jobs/tournament_jobs.py` | whole module (create/voting-end/end) |
| `backend/jobs/main.py` | `from jobs.tournament_jobs import ...` (line 8) + the two cron registrations (`create_tournament` day 1, `conclude_tournament` day 26) |
| `backend/main.py` | `import tournaments` (line 24) + 5 routes: `/tournament/add`, `/tournament/voting-end`, `/tournament/end`, `/tournament/players`, `/tournament/info` (lines 499–518) |
| `backend/alchemy/tables.py` | `getTournamentStart/VotingEnd/End` helpers (lines 14–18) + `Tournament`, `TournamentBracket`, `TournamentChart` models (lines 22–84) |

Database: **keep the tables and all history** — no drops, no backfills. The
new system adds nullable columns; old rows are untouched.

Cutover order (avoids two systems writing the same table):
1. Deploy the new pumpking tournament code, creation job **disabled** (feature
   flag / env switch).
2. Remove the tournament code from piu-top and redeploy the legacy API (its
   scheduler no longer has tournament jobs).
3. Enable the new creation job. First run: 1st of next month (or a manual
   one-off run of the creation function to start it immediately, then it runs
   monthly on the 1st).

Also confirm at M6: how the legacy API is deployed/run in prod (scheduler
process) so we know the cron removal actually stops tournament creation.

## Milestones

| # | Work | Est. |
|---|---|---|
| M0 | ~~Review this doc, confirm open decisions~~ — **done 2026-09-28** (all six decided, see "Open decisions") | — |
| M1 | ID backfill: extend `updateChartsDifficulty` write-back to all instances of a shared chart; one-off run; verify ≥ 99% coverage on the 3,117 shared charts' instances; test | 1 d |
| M2 | Migrations (bracket ID bands, `tournament_charts.shared_chart_id`, `tournament_player_brackets`, `tournaments.name`) | 0.5 d |
| M3 | Backend: tournament creation job (1st, feature-flagged) with random pool + bracket-assignment snapshot; state-transition job (Ended on 25th); skill service (950k / ≥ 5 rule); scoring/leaderboard service (top 3 of 6); tRPC router; Mocha tests with seeded 3-mix scenario (incl. XX `score_phoenix` normalization, mods/VJ/hidden/window exclusions, top-3-of-6 counting, unrated → Easy) | 3 d |
| M4 | Web: tournament page (pool, bracket leaderboards, my progress incl. which 3 count, past list) | 2–3 d |
| M5 | Enable creation job; first live month; watch participation per bracket | 0.5 d |
| M6 | Retire piu-top tournament code per the table above (separate repo, small PR); confirm prod scheduler no longer creates tournaments | 0.5 d |
| M7 | Cups: `tournament_results` + population by the Ended job; profile cups (per-medal counts + award list with bracket); ranking-list cup counters replacing grade-based stats; `getCurrent`/`getLeaderboard`/`list` (Ended) read from the table | 1.5–2 d |
| M8 | Main leaderboard highlight while Live: pool-chart badge, counting-result badge, "tournament is live" banner linking to `/tournaments` | 0.5–1 d |
| M9 | Nav notice badge: `player_notices` table + write from the creation job, `notices.unread` query + `notices.markRead(scope)` mutation, red "!" on the TopBar Tournaments link | 0.5 d |

Total: ~1.5–2 weeks single dev (launch, M1–M6); +1.5–2 d post-launch for M7;
+0.5–1 d for M8; +0.5 d for M9.

## Open decisions (all decided 2026-09-28)

1. ~~**Participation**~~ — **Decided: stored bracket-assignment snapshot**
   (`tournament_player_brackets`). Players who register or unhide after the
   creation snapshot wait for the next tournament — no catch-up job.
2. ~~**Manual-input results** (`is_manual_input`)~~ — **Decided: include.**
   Manual input is a self-service, self-only, screenshot-backed flow where the
   Phoenix score must exactly match the step-stats calculation. 180d data:
   305 manual results from only 2 players (283 of them 950k+) — excluding them
   would gut the Top bracket. No extra filter needed in scoring.
3. ~~**Legacy filter** `stat_top_req_counter > 5` for skill computation~~ —
   **Decided: drop.** The counter is a profile-page-view count (incremented on
   high-score/best API requests with the player's profile id), not play
   activity — it would have excluded 102 of 166 visible players, including
   many active ones. Skill is a pure function of the player's results.
4. ~~**Tie-breaks**~~ — **Decided: no tie-break chain.** Ties on the top-3
   total share the place; prizes go to everyone holding it. Display order
   inside a tie: best single desc, then player_id.
5. ~~**Small brackets**~~ — **Decided: no merging in v1 and no warnings or
   badges** — keep it simple; the leaderboard itself shows who is in the
   bracket. Merging (with a threshold) can be revisited later if a bracket is
   structurally too small.
6. ~~**Creation timing**~~ — **Decided: create on the 1st, window 1st–24th
   (`[1st, 25th)`), end on the 25th; winners displayed 25th–1st.** An
   announced-but-not-counting pool (the 25th idea) would confuse players; the
   off period becomes the winners-display window instead.

(Fixed, for reference: qualify threshold = 950,000 — `TQ_QUALIFY_SCORE`
constant; band edges and pool compositions per the Brackets table.)

## Risks

- **P2 ID estimate**: until P2 results accumulate, P2 instances carry a
  cross-mix estimate. Mitigation: wide bands, backfill propagates the shared
  value, daily job improves it.
- **Cross-mix fairness**: the same shared chart is a different pattern per
  mix. Mitigation: ID banding + raw-score metric; accepted as inherent to a
  shared pool.
- **Cutover race**: legacy piu-top cron (day 1) and the new creation job (now
  also day 1) must never both be live — enforced by the cutover order (new
  code deployed disabled → legacy removed and redeployed → new job enabled,
  ideally same day and well before the 1st).
- **Easy bracket is large and mixed**: 132 players (76% of the base), from
  total beginners to skill-13 players, competing on the same raw-score total.
  Accepted — it is exactly who the relaunch is for.
- **High bracket is quiet** (~34 results/mo, 6 active players) under the
  decided 17 boundary. Accepted; one-constant change if revisited.
- **Retroactive moderation**: deleted/hidden results move the leaderboard
  after the fact — accepted, UI labeled.
- **History**: 68 old tournaments remain as read-only history; the new code
  must tolerate NULLs in all new columns and legacy states (`ChartPoolVoting`,
  `Active`, `Ended`, per-mix `mix` values).

## Out of scope (later)

- Player-picked charts from a larger per-bracket pool (v1 = random fixed pool).
- Chart pool voting (the legacy "voting" state was a human review window, not
  real voting; revisit if players ask).
- Bracket merging by participation when a bracket is too small.
- Rewards beyond cups: badges, titles, notifications (Telegram hooks
  exist). Cups are specced in "Cups and tournament results" (M7).
- Phoenix 3: the design generalizes — add the mix to `SUPPORTED_MIXES` and the
  shared-pool query; no other change.
