# Monthly Tournaments — Relaunch Plan (shared cross-mix pool)

Status: design decisions finalized 2026-09-29 · M1 (ID moved to
`shared_charts`), M2 (legacy tables parked, v2 tables created), M3 (backend)
and M4 (web page) done · creation job not enabled yet (M5)

## Summary

Relaunch the monthly tournament (last run: Phoenix-only, Sep 2026) as a single
**cross-mix** tournament: players on XX (26), Phoenix (27) and Phoenix 2 (28)
compete in the same event. The chart pool is **shared across mixes** (only
charts that exist in all three mixes), and charts are assigned to skill
brackets by **interpolated difficulty (ID)**, not by the official level number
(which drifts per mix — e.g. one shared chart is D7 on XX, D9 on Phoenix,
D10 on Phoenix 2).

**Format (agreed 2026-09-29):**
- **Fully automatic**: a monthly job creates the tournament, brackets, pool and
  bracket assignments. No manual approval, no admin screen, no join step, no
  voting/review window.
- Pool: **6 charts per bracket on a fixed difficulty ladder** — two charts at
  each of the bracket's three levels, so every month's pool has the same shape
  and difficulty is predictable. Only the *identity* of the charts is random
  (random within `(level, type)`).
- Metric: **sum of the player's best 3 Phoenix scores** (`score_phoenix`) over
  the pool — plain machine scores, no PP or other derived metrics.
- Brackets: the **highest level the player can back with 5 charts scoring
  950,000+** (their 5th-highest qualifying chart level, 180-day window). Unrated
  players get the Easy bracket instead of being excluded.
- Result eligibility is deliberately **minimal**: a Phoenix score must exist and
  its date must be exact. No mod or rank-mode filters (see "Result
  eligibility").
- Awards (post-launch, M7): gold/silver/bronze cups for the bracket podium
  (ties share), accumulated per player — see "Cups and tournament results".
- Storage: the legacy tournament tables are **cleared and rebuilt from scratch**
  for the new system — no legacy columns, no legacy states, no NULL-tolerance.

The legacy system (68 tournaments since 2020, driven by the retired Python API —
source snapshot at `/home/grumd/coding/piu-top`, from 2021-12, XX era) left the
tables `tournaments`, `tournament_brackets`, `tournament_charts` in place with
history. We park that history in `_legacy_2026` copies and create clean tables
under the original names, then re-implement everything in the new tRPC/TS stack
**in this repo (pumpking)**. The old tournament code in piu-top is retired as
part of this work (see "Retiring the legacy code"). See "Legacy mechanism"
below for how the old system worked.

## Agreed design decisions

| Decision | Value |
|---|---|
| Supported mixes | XX (26), Phoenix (27), Phoenix 2 (28) — a `SUPPORTED_MIXES` constant (exists: `constants/mixes.ts`) |
| Cadence | One tournament per calendar month; window 1st–24th (ends 25th); final results shown 25th–1st |
| Chart pool | Shared: `shared_charts` of type S or D that have a `chart_instance` in all 3 supported mixes (3,117 charts: 1,923 S / 1,194 D) |
| Pool grouping | By `shared_charts.interpolated_difficulty` (ID), not official `level` — one ID per shared chart, shared by all its mixes |
| Pool selection | **Fixed ladder** (2 charts per level over 3 levels per bracket, type per bracket) + uniform random *which* chart within `(level, type)`; no popularity ranking, no voting, no approval |
| Pool size | 6 charts per bracket; **top 3 count** |
| Player brackets | 4 brackets — Easy (unrated or skill level in [1,14)), Mid [14,17), High [17,20), Top [20,28]. Skill level = the **5th-highest ID level with a 950,000+ chart best** (180-day window, no grades); snapshot at creation |
| Participation | Automatic: every non-hidden player gets a bracket assignment at creation (no join concept) |
| Metric | Sum of the player's best 3 per-chart `score_phoenix` over the pool |
| Result eligibility | `score_phoenix IS NOT NULL` + `exact_gain_date = 1` (date is exact, not approximate) + `gained` inside the window + player/result not hidden. **No `mods_list`, no `rank_mode`, no `is_manual_input` filters** |
| Dates | Naive "site wall-clock" datetimes, compared in SQL only — see "Date and time convention" |
| Tables | Fresh `tournaments` / `tournament_brackets` / `tournament_charts` / `tournament_player_brackets` built from scratch; legacy rows parked in `*_legacy_2026` |
| Code location | All new code in the pumpking repo; piu-top tournament code deleted |
| Cups (M7) | Gold/silver/bronze per bracket podium (ties share); recorded in `tournament_results` at end; profile + ranking list show accumulated counts |
| Main leaderboard highlight (M8) | While Live: badge on pool charts + on counting results, and a banner linking to `/tournaments` |
| Nav notice badge (M9) | Red "!" on the Tournaments nav link while an unread notice exists (materialized `player_notices` rows written at tournament creation, cleared by one mutation on page visit) |

## Why this works (data, measured on prod 2026-09-28/29)

- The shared S/D pool is large: **3,117 shared charts** (1,923 S over 486 songs,
  1,194 D over 479 songs) exist in all three mixes. (Plus 109 COOP — excluded.)
- **Every ladder slot has candidates.** Pool charts available per ID level
  (`floor(ID)`, mix-26 instance of each pool chart) — each bracket needs 2
  charts per level:

  | ID level | S | D | used by |
  |---|---|---|---|
  | 11 | 104 | 15 | Easy |
  | 12 | 80 | 52 | Easy |
  | 13 | 98 | 95 | Easy |
  | 14 | 102 | 80 | Mid |
  | 15 | 110 | 77 | Mid |
  | 16 | 108 | 91 | Mid |
  | 17 | 115 | 95 | High |
  | 18 | 147 | 121 | High |
  | 19 | 103 | 103 | High |
  | 20 | 103 | 125 | Top |
  | 21 | 71 | 101 | Top |
  | 22 | 33 | 68 | Top |

  Above 22 the pool thins fast (23: 12 S / 32 D, 24: 8 S / 22 D, 25+: 0 S) —
  which is why the Top ladder stops at 22.
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
  an unfamiliar pick.

### Indicative bracket sizes (measured 2026-09-29, final rule)

Produced by the skill query of "Player skill algorithm" — the same SQL the skill
service will use — run as a throwaway query against prod (not committed, the
numbers below are the record), 180 days before 2026-10-01:

| Bracket | Players | Active (90d) | Results pace (Aug–Sep) |
|---|---|---|---|
| Easy | 136 (133 of them unrated) | 8 | ~28/mo |
| Mid | 10 | 6 | ~256/mo |
| High | 11 | 6 | ~34/mo |
| Top | 9 | 10 | ~539/mo |

33 of 166 non-hidden players are rated; skill levels run 9, 11, 12, 14×2,
15×4, 16×4, 17×4, 18×5, 19×2, 20×4, 21×4, 23.

**These counts are indicative, not acceptance criteria.** They drift with the
player base (a 365-day window instead of 180 rates 51 players: 120/15/16/15).
We start with sane rules and revisit the thresholds if the real bracket sizes
turn out badly. Notes:

- Above ID 22 the shared pool thins out (254 pool charts exist above 22, 0
  singles above 24), which is why the Top ladder stops at 22 — and why almost
  nobody reaches skill level 22+.
- The active mass sits at skill 14–19; the 17 boundary leaves High quiet
  (~34/mo) — accepted, and it is a one-constant change if ever revisited.
- A one-day bulk import dated Jul 31 (~1,300 results) inflates 90-day totals;
  the Aug–Sep pace is the honest number.
- M3 tests a seeded synthetic scenario, not these real counts.

## Prerequisite: one ID per shared chart — **done (M1, 2026-09-29)**

The ID-based design needs a difficulty for **every** pool chart. ID lived on
`chart_instances` and was written only to instances that had results, so
Phoenix 2 was 95% NULL:

| mix | S/D charts | null ID (before) |
|---|---|---|
| 26 XX | 3,878 | 3 |
| 27 Phoenix | 4,434 | 68 |
| 28 Phoenix 2 | 4,535 | **4,292 (95%)** |

`chartDifficultyInterpolation.ts` has always computed **one difficulty per
shared chart** (weighted from all mixes' results + the built-in level of the
latest result) — storing that per-instance number per instance was the bug.

**ID now lives on `shared_charts.interpolated_difficulty`**
(`20260929000000_move_interpolated_difficulty_to_shared_charts`): 5,370 charts
backfilled from the instance column with **0 conflicts** (every instance of a
chart already carried the same value), and the daily job writes it with one
`UPDATE … JOIN` instead of ~6,500 per-chart updates.

All readers moved with it — `resultsPp`, `playersPp`, `chartsSearch` (still
coalescing with the instance `level`) and the `/charts/interpolated-difficulty`
debug view. Measured on current data: **no
result's PP changes**, because every best `(shared_chart, player)` result
already sat on an instance carrying that same value.

Coverage after the move: **no NULL ID among the 3,117 pool charts** on any of
the three mixes (verified 2026-09-29). Tests: `src/test/unit/chartDifficulty.test.ts`.

The per-instance copy still has one reader: the **deployed Python backend**
(`backend/results_best.py` selects `latest_instances.interpolated_difficulty`,
`backend/testing_routes.py` nulls it) — `backend-ts`, the other reader, is not
deployed and was deleted in `0ca4f7e`. PR
[Zdreni/piu-top#22](https://github.com/Zdreni/piu-top/pull/22) points those at
`shared_charts`, and only then can the copy be dropped. That second migration
(`20260929120000_drop_chart_instances_interpolated_difficulty`) is **not in the
repo**: `migrate:latest` on the VPS applies *every* pending migration at once, so
the two pumpking steps have to be separate merges, and a queued file in
`migrations/` would only corrupt the ledger of what has actually run. It waits in
`~/coding/pumpking-migration-hold/` for step 3:

1. pumpking, migration `20260929000000` only → prod gains
   `shared_charts.interpolated_difficulty` (additive, invisible to the Python
   queries). The instance column stops being refreshed and goes stale for a few
   days — **accepted**, its only consumer displays a difficulty number.
2. piu-top #22 merged and deployed → the last reader is off the old column.
3. copy the held migration into `packages/api/migrations/`, merge → drop.

Its `down` re-adds the column and refills from `shared_charts`, so either
migration rolls back and re-applies: every mix of a chart comes back carrying
the chart's value (pre-move drift between two instances of one chart is not
recoverable, and is not wanted).

Side note: this rewrite also fixed a pre-existing bug — the update loops in
`updateChartsDifficulty` were `reduce(async …)` chains that were never awaited,
so PP/profile updates raced the job's exit. They are awaited now.

## Brackets

A bracket has two ranges, and they are **not the same thing**: a *player range*
(who lands in the bracket) and a *pool ladder* (which charts they play).

| Bracket | Player skill range | Pool ladder (2 charts per level) | Composition |
|---|---|---|---|
| Easy | unrated, or skill in [1, 14) | 13, 12, 11 — 2 × S each | 6 × S |
| Mid | skill in [14, 17) | 14, 15, 16 — 2 charts each, one D at the ladder's bottom level | 5 × S + 1 × D |
| High | skill in [17, 20) | 17, 18, 19 — 1 × S + 1 × D each | 3 × S + 3 × D |
| Top | skill in [20, 28] or above | 20, 21, 22 — 1 × S + 1 × D each | 3 × S + 3 × D |

Top 3 of 6 count. Band edges are fixed: Mid from 14, High from 17, Top from 20.

Deliberate consequences of the ladder choice:

- **The ladder sits at the top of the bracket's range.** Players compete at
  their bracket's ceiling, not on charts far below them — an Easy player is not
  asked to 100% a level-4 chart for points. The cost: Easy spans unrated up to
  skill 13, so the weakest Easy players have no makeable chart and can only
  post low scores. Accepted — if that ever bites, the cheapest lever is a fifth
  "Bronze" bracket with a ladder at 8/9/10 (out of scope now).
- **Top plays 20–22**, not 23+. Players rated above 22 still play 20–22; their
  edge shows up as 990k+ scores rather than harder charts. Also forced by data:
  almost no shared charts exist above 24.
- **At High/Top you must be able to play doubles** (or be strong enough at
  singles that your best 3 are all singles). Accepted.
- Mid's single double sits at the **bottom** of its ladder (level 14) as the
  gentle introduction to doubles. Alternative: put it at 16. Pick one at
  implementation; it is one entry in a constant.

## Player skill algorithm (score-based, Phoenix)

Per player, over the **180 days** before the tournament `start_date` (chosen
over the legacy's 365: the player base and machine mix shift fast — Phoenix 2
rollout — so recency matters more).

1. Players: non-hidden. (The legacy's `stat_top_req_counter > 5` is **not**
   carried over — it counts profile page views, not play activity; dropping it
   avoids excluding 102 of 166 visible players.)
2. Candidate charts: the **shared pool charts only** (type S/D, instance in all
   3 supported mixes) — the same set the pool is drawn from, so being placed in
   a bracket always means "you have shown the level on charts you could be
   given".
3. Per player × shared chart, best = `max(score_phoenix)` over that chart's
   instances in any supported mix, **restricted to results that pass the
   eligibility predicate in "Result eligibility"** — one shared SQL fragment
   used by both the skill rule and the scorer, so the two can never disagree.
4. A chart **qualifies** if that best is **≥ 950,000** (95% on the 1,000,000
   Phoenix scale — `TQ_QUALIFY_SCORE` constant). Grades are not involved.
5. **Skill level** = the **5th-highest** `floor(ID)` among the player's
   qualifying charts — equivalently, *the highest level L such that the player
   has ≥ 5 qualifying charts at level **L or harder***. Fewer than 5 qualifying
   charts → **unrated**.
6. **Bracket** = the bracket whose range contains the skill level (Easy
   `[1,14)`, Mid `[14,17)`, High `[17,20)`, Top `[20,28]`). Unrated → Easy.

The rule measures **depth**: hard charts count toward the requirement for every
lower level, so a player is placed at the level they can back up with five
charts, and a player whose 950k+ charts are spread across levels is placed by
their real strength instead of falling through the cracks of one narrow band.

Worked examples (each row is one player's set of 950k+ chart levels):

| Qualifying chart levels | Skill level | Bracket |
|---|---|---|
| 19, 18, 17, 17 (4 charts) | unrated (no 5th chart) | Easy |
| 19, 18, 17, 17, 17 | 17 | High |
| 19, 18, 17, 17, 16 | 16 | Mid |
| 18, 18, 18, 18, 19 | 18 | High |
| 20, 21, 20, 21, 20 | 20 | Top |
| 12, 14, 15, 16, 17 | 12 | Easy |
| 14, 15, 16, 17, 18 | 14 | Mid |

The last two rows are the point of the rule: the 12-row player is honestly not
proven at 14+ yet, and the 14-row player is Mid even though neither a single
level nor a whole bracket range holds five of their charts — under both earlier
readings that player would have been dumped into Easy.

**Implementation:** one window function over the qualifying-chart set —
`row_number() over (partition by player order by level desc)` and take `rn = 5`.
No per-band grouping, no band-width constant to misread. The worked examples
above are the acceptance list for the skill function in the M3 test suite — they
need no database, only that function over a list of levels.

Snapshot at tournament creation (1st): each non-hidden player gets one row in
`tournament_player_brackets` with their `skill_level` and bracket. The
leaderboard never recomputes skill.

## Pool selection (fixed ladder + random chart identity)

For each bracket, for each ladder slot `(level, type)`:

1. Candidates = shared pool charts (type = the slot's type) with
   `floor(interpolated_difficulty) = level`.
2. Pick **one** chart by uniform random, **without replacement** across the
   bracket's pool (the legacy used `random.choice` with replacement — a pool
   never repeats a chart here).
3. Skip charts already used in the **last two months' pools** when enough
   candidates remain (keeps the pool fresh; at level 22 there are only 33 S, so
   the rule degrades gracefully to "allow repeats" rather than failing).
4. Store one row per chart in `tournament_charts` with the `ladder_level` and
   `ladder_type` it was drawn for, so a fix by hand is obvious later.

What is predictable: level composition, S/D mix, per-bracket difficulty.
What is random every month: which songs.

**Fixing a bad pool.** There is no review/voting stage by design. In the rare
case a drawn chart turns out to be unplayable (broken chart data, machine
issues), fix it by hand in SQL — same shape as the row the job wrote:

```sql
UPDATE tournament_charts
SET shared_chart_id = :newSharedChartId
WHERE id = :rowId;          -- then let the leaderboard recompute on its own
```

Either the field plays it for fun, or the row gets swapped. No admin screen.

## Result eligibility (one predicate, shared by skill + scoring)

A result counts if **all** of these hold:

- `score_phoenix IS NOT NULL` — a Phoenix score exists. **This alone excludes
  VJ runs**: `resultAddedEffect.ts` only computes `score_phoenix` when
  `rank_mode` is falsy, so VJ results have no Phoenix score and contribute
  nothing anywhere in the app. If VJ ever gets a Phoenix score, re-add an
  explicit exclusion here.
- `exact_gain_date = 1` — the result's date is exact. Only ~118 of ~5,284
  recent 950k+ results are approximate; approximate dates are too ambiguous to
  sit next to a hard window cutoff. Decision 2026-09-29.
- `gained` inside `[start_date, end_date)` (naive comparison, see next section).
- `player.hidden = 0` and `results.is_hidden = 0`.

**Explicitly NOT filtered:** `mods_list`, `rank_mode`, `is_manual_input`.
`mods_list` is not a mod list but the arcade's play-option dump — observed
tokens since Jan 2026: `AV###` 12,645 / `BGADARK` 11,868 / `PASS_G` 1,164 /
`HJ` 533 / `FD` 263 / `M` 33 / `PASS_M` 20 / `EW`,`V`,`RS`,`DR` 3 each.
Filtering on "mods_list empty" would have disqualified ~93% of otherwise valid
results (82 of 1,111 in a sample month). Players who want to run the tournament
on HJ or mirror may do so; it costs no code and keeps the field open. Manual
input stays included (decided: self-service, self-only, screenshot-backed,
Phoenix score must match the step-stat calculation exactly).

## Date and time convention

Decided 2026-09-29, because the tournament has a hard cutoff and the app
currently mixes conventions (`added` is UTC-shifted via `prepareForKnexUtc`,
`gained` is not).

**Convention: tournament dates are naive "site wall-clock" datetimes, and the
window is always evaluated in SQL between naive values.**

- `tournaments.start_date` / `end_date` are stored as naive `DATETIME`
  (`1st 00:00:00`, `25th 00:00:00`), exactly like `results.gained` is stored.
- The window test is `r.gained >= t.start_date AND r.gained < t.end_date` —
  naive column vs naive column. **Never** build JS `Date`s for the comparison,
  never apply `prepareForKnexUtc` to these columns.
- The UI shows dates the way it already shows `gained` (naive value parsed and
  formatted in the browser's own zone = shown verbatim), so **the date a player
  sees on their own result row is the date the window compares** — no
  conversions anywhere, and a player can always verify their own result.
- Cron jobs are registered with node-cron's per-job
  `{ timezone: 'Europe/Warsaw' }` option (node-cron 3.0.3 supports it), and the
  month boundaries are built from the Warsaw calendar, not from `new Date()` in
  the host's zone. Do **not** set `process.env.TZ` globally — that would
  silently change how mysql2 parses every existing date column.
- Wording in the UI: "counts until the 24th, 23:59".

Note: 25 Oct 2026 is the EU daylight-saving switch. With wall-clock semantics
there is nothing to get wrong — the change happens at 03:00, midnight of the
25th is unambiguous, and no JS arithmetic crosses the boundary.

## Scoring

For a given tournament + bracket:

1. Player set: `tournament_player_brackets` for that bracket.
2. Pool: the bracket's 6 `shared_chart_id`s.
3. Per pool shared chart, the player's counting results = `results` where the
   result's `shared_chart` is that pool chart, its `chart_instance` is in
   `SUPPORTED_MIXES`, and the eligibility predicate above holds.
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

States (fresh table, so an `ENUM` with only the states we use):
`Live → Ended` — no Draft, no Announced, no `ChartPoolVoting`, no `voting_end_date`.
The pool is public the moment it is created.

| Event | Effect |
|---|---|
| Job on the 1st of month M (00:00 site time) | Create tournament (`name` = "October 2026", `start_date` = 1st 00:00, `end_date` = 25th 00:00); create 4 brackets (player ranges + ladder config); draw pools into `tournament_charts`; assign brackets to all non-hidden players (skill snapshot → `tournament_player_brackets`); write a pending notice per assigned player (M9); state `Live` — results count immediately |
| Job on the 25th of month M (00:00 site time) | state `Ended` — window closed, winners final; writes `tournament_results` (ranks + medals — M7) |
| 25th → 1st of next month (UI only) | Show the final winners with a "new tournament starts on the 1st" notice; no job needed |

### Participation — no "join"

There is no join concept: the tournament is created, and any counting score on
a pool chart counts for a player in that bracket. The bracket assignment is a
**stored snapshot** (`tournament_player_brackets`): brackets are stable (a
player can't shift brackets mid-month when old results are deleted or a player
is un-hidden), the leaderboard query stays a simple join, and the 6-month skill
scan runs once per month instead of per request. Cost: ~170 rows/month.

Players who register or unhide after the snapshot wait for the next tournament
— no catch-up job. The UI tells them "you join on the 1st" and shows the pool.

## Cups and tournament results (post-launch finishing — M7)

**Awards**: per bracket per tournament, 1st place gets a **gold** cup, 2nd
**silver**, 3rd **bronze**. Ties share the place and the cup. Cups accumulate
per player across tournaments, and each award records **which bracket** it was
won in — the cup icon can vary by bracket × medal (up to 12 variants).

**Recording** — new table `tournament_results`, populated **once** by the Ended
job on the 25th:

- `id, tournament_id, bracket_id, player_id, rank INT (shared rank),
  score INT (top-3 total), medal ENUM('gold','silver','bronze') NULL,
  created_at, unique(tournament_id, player_id)`
- One row per bracket player with 1+ qualifying results (rank + final score);
  `medal` set for the top-3 places.
- No minimum participation in v1 — a solo player's gold is a gold (the
  bracket's participation is visible on the leaderboard); a minimum would be
  a one-constant change later.

**Authority**: from the moment of `Ended` on, `tournament_results` is the single
source of truth for that tournament — the 25th–1st winners display, the
`getCurrent` Ended view and the past-tournaments list (`list`) all read from it
instead of recomputing. Medals are settled on the 25th; later moderation of
results does not revoke them (accepted). The "subject to moderation" label
applies to the live window only.

**Display** (queries aggregate a tiny table — no denormalization on `players`):

- **Profile**: accumulated cups — counts per medal (e.g. 2 gold, 1 silver,
  1 bronze) plus the award list (tournament, bracket, medal) so per-bracket icon
  variants can be shown.
- **Ranking list**: gold/silver/bronze counters per player replace the
  grade-based stat columns; EXP/PP/play-count stay. Exact column layout is a UI
  detail at implementation time.

## Main leaderboard highlight (post-launch — M8)

While a tournament is **Live**, the main leaderboard (charts list page +
single-chart page) advertises it, so players browsing for new scores immediately
see there is a tournament and can go participate:

- **Chart badge**: a shared chart that is in the current pool gets a tournament
  badge in the `ChartHeader` (cup icon / "T" mark).
- **Result badge**: result rows that count for the tournament (pool chart,
  `gained` inside the window, eligible) get a small mark.
- **Banner** (main leaderboard page): "<Month> tournament is live — ends on the
  25th" with a link to `/tournaments`. Shown while Live only; the ended
  25th–1st window stays quiet (nav link + tournament page cover it).

Backend: the leaderboard query tags rows server-side — `inTournament` on the
chart (its `shared_chart_id` is in the Live tournament's `tournament_charts`)
and `countsForTournament` on the result. One small lookup against ≤ 24 pool
charts (4 brackets × 6) — negligible cost; reuses the existing highlight
machinery in `features/leaderboards/components/charts/Chart.tsx` for styling.

## Nav notice badge (post-launch — M9)

A red "!" mark next to the **Tournaments** link in `TopBar` while the logged-in
player has an unread notice for that scope.

**Notice model** — notices are **materialized at event time** (write-time), not
computed at read time:

- A **scope** is a surface that can raise notices; scopes map to nav surfaces
  (now `tournament`; later e.g. `cup` for awards).
- When the event happens, the responsible job writes a `player_notices` row for
  each **affected** player:
  - Tournament creation job (1st): upsert a notice per assigned player — exactly
    the set that got a `tournament_player_brackets` row, in the same
    transaction. Players not selected (hidden at creation, registered
    mid-month) simply get no row and no notice — applicability is decided at
    write time and stored, so the read side never checks it.
  - (M7, later) the Ended job can upsert `scope='cup'` rows for medal winners —
    same table, no new mechanism.
- **At most one notice per player per scope** — the upsert coalesces: if the
  player already has a pending notice (they skipped months without visiting),
  the row is re-pointed at the new tournament instead of stacking; if the
  previous notice was read, a fresh pending one is created. A player who skips
  months therefore never accumulates multiple tournament notices — one badge,
  always pointing at the newest.
- **Unread** = the player's row for that scope has `read_at IS NULL`.
- **Clear** = one mutation: `SET read_at = NOW()` on the player's pending row of
  that scope. The tournaments page calls it in an on-mount effect. The badge
  lingers into the 25th–1st Ended window until the first visit.

Why write-time rather than read-time computation (the cursor model considered
first): the read path stays **constant** — one indexed "any unread?" query on
the player's own rows no matter how many scopes are added; the `user` route
never touches tournament tables; and the table stays bounded (one row per
player per scope). (Continuous high-frequency surfaces, e.g. "new results"
markers, would not use this table — that would be a lightweight timestamp; this
model is for discrete events. A full history inbox, if ever wanted, would be a
separate event log.)

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

Creation-job upsert (per assigned player; set-based in the real implementation):

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

- `notices.unread` query → `{ [scope]: boolean }` for the logged-in player (one
  indexed query on the player's own rows); guests get an empty map.
- `notices.markRead(scope)` mutation → clears that scope's pending rows, returns
  the fresh unread map; the web hook writes the result into the `notices.unread`
  query data (same pattern as `hooks/usePreferencesMutation.ts`).

**Nav**: the TopBar Tournaments `NavLink` renders a small red "!" when
`unread.tournament` is true (its own `useNoticesQuery`); the tournaments page
(M4) calls `notices.markRead('tournament')` on mount.

## Schema: clear the legacy tables, build new ones

The legacy tables are shaped for a per-mix system with a voting window and
mostly-NULL columns. Rather than adding nullable columns to them and teaching
the new code to tolerate legacy states, we **clear and rebuild**.

**Migration A — clear** (`20260930000000_park_legacy_tournaments`): rename the
old tables
aside instead of deleting, so the "clear" is reversible and 6 years of history
stay queryable:

```sql
RENAME TABLE tournaments           TO tournaments_legacy_2026,
         tournament_brackets       TO tournament_brackets_legacy_2026,
         tournament_charts         TO tournament_charts_legacy_2026;
```

(`down` renames back. If we never want the history again, a later migration
drops the `_legacy_2026` tables. Before merging, take a plain
`mysqldump --no-create-info` of the three tables and archive it off-repo.)

Consequences to accept: the new web app shows no past tournaments until the
first new one ends (it never showed the legacy ones anyway), and the retired
piu-top job, if it still fires, errors on a missing table instead of writing —
see the cutover order.

Verified on a scratch database built from the migration chain (2026-09-30),
with legacy rows present (2 tournaments + brackets + pool rows, the shape prod
has):

- The rename is one atomic `RENAME TABLE`, and **InnoDB re-points the FKs
  between the three tables at the new names** — after the swap,
  `tournament_brackets_legacy_2026` still references `tournaments_legacy_2026`,
  an insert against the parked parent is accepted and an orphan is still
  rejected. Renaming only one of them would be safe for the same reason, but
  they move together anyway.
- Rows survive the swap and the whole up/down round trip (`up` → `down` → `up`
  leaves the history under the original names, with the original constraint
  names).
- `up` checks `information_schema` and no-ops when the tables are already
  parked, but **throws** when neither name exists or when a target is taken — a
  half-parked database is a state worth failing on, not one to guess about.

**Migration B — create** (`20260930010000_init_tournaments_v2`), clean design:

```sql
CREATE TABLE tournaments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(64) NOT NULL,              -- 'October 2026'
  start_date DATETIME NOT NULL,           -- naive site wall-clock
  end_date DATETIME NOT NULL,             -- naive, exclusive
  state ENUM('Live','Ended') NOT NULL DEFAULT 'Live',
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_tournaments_start (start_date)   -- one per month
);

CREATE TABLE tournament_brackets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tournament_id INT NOT NULL,             -- FK -> tournaments, on delete cascade
  code ENUM('Easy','Mid','High','Top') NOT NULL,
  name VARCHAR(40) NOT NULL,
  min_id DECIMAL(4,1) NULL,               -- player range; NULL = unrated bucket
  max_id DECIMAL(4,1) NOT NULL,
  singles_count TINYINT NOT NULL,
  doubles_count TINYINT NOT NULL,
  UNIQUE KEY uq_bracket (tournament_id, code)
);

CREATE TABLE tournament_charts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tournament_id INT NOT NULL,             -- FK -> tournaments, cascade
  bracket_id INT NOT NULL,                -- FK -> tournament_brackets, cascade
  shared_chart_id INT NOT NULL,           -- FK -> shared_charts
  ladder_level TINYINT NOT NULL,          -- floor(ID) the slot was drawn for
  ladder_type ENUM('S','D') NOT NULL,
  UNIQUE KEY uq_pool_chart (bracket_id, shared_chart_id)  -- no repeat in a pool
);

CREATE TABLE tournament_player_brackets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tournament_id INT NOT NULL,             -- FK -> tournaments, cascade
  bracket_id INT NOT NULL,                -- FK -> tournament_brackets
  player_id INT NOT NULL,                 -- FK -> players
  skill_level TINYINT NULL,               -- 5th-highest 950k+ level; NULL = unrated
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_tournament_player (tournament_id, player_id),
  KEY ix_bracket (bracket_id)
);
```

Notes:

- Everything is `NOT NULL` where it can be; the code never has to handle legacy
  rows. `mix` is gone (a tournament is cross-mix by definition);
  `voting_end_date`, `min_level`/`max_level`, `min_player_level`/
  `max_player_level` and `chart_instance_id` are gone with the old shape.
- `min_id`/`max_id` on brackets are the **player** range. The pool ladder lives
  in `tournament_charts` (as drawn rows), not on the bracket — one source of
  truth per concept, and it makes the manual pool fix obvious.
- Migrations follow the house style (kysely schema builder, named PK/FK
  constraints, `onDelete cascade`, see `migrations/20240111021047_init_pp_history.ts`).
- `shared_chart_id` is the one FK **without** cascade (RESTRICT, like the other
  `shared_charts` references in this schema): deleting a chart that is in a
  published pool must fail loudly instead of silently shrinking the pool.
- The plan's `KEY ix_bracket (bracket_id)` is not written explicitly: MySQL
  creates an index for every FK column, and on `tournament_charts` the
  `(bracket_id, shared_chart_id)` pool key already covers `bracket_id`.
- The same scratch database confirms the constraints the services will rely
  on: one tournament per `start_date`, one bracket per `(tournament, code)`,
  no repeated chart in a pool, `state` rejects the legacy values (`Draft`,
  `ChartPoolVoting`) and defaults to `Live`, and deleting a tournament cascades
  its brackets, pool and assignments while the parked history is untouched.
- `src/types/database.ts` is regenerated after both migrations. One block is
  **hand-patched** and marked `HAND-PATCHED` in the file: the JSON column typed
  with the app's own interface (`PlayerPreferencesJson`) — codegen types JSON as
  plain `Json` and has no way to know better. Re-apply it after any regen. The
  regen also corrected three places where the hand-edited file had drifted from
  the database, none of them used by code:
  `chart_instances.interpolated_difficulty` is back in the types (the column
  still exists until the held-back drop migration ships), `players.openai_cost`
  is nullable (which is what that stored generated column actually is), and the
  `best_results` interface is **gone** — no migration creates it and it exists in
  no database (dev, test, or a chain-built one); it was a leftover of the
  hand-written era (the `results_highest_score_*` tables dropped in
  `20231129184107`), not a view codegen refused to emit.
- M7 adds `tournament_results` and M9 adds `player_notices` as separate
  migrations; the launch is not blocked on either.

## API (tRPC) and UI

New router `tournaments.ts` + service `src/services/tournaments/`:

| Procedure | Purpose |
|---|---|
| `getCurrent` | Current tournament (or the ended one shown 25th–1st): state, dates, brackets (ranges + ladder), pool per bracket, player's own bracket + skill level + per-chart bests + current rank; final results + "new tournament on the 1st" flag when Ended (M7: read from `tournament_results`) |
| `getLeaderboard` (bracketId, page) | Bracket leaderboard: rank, player, per-chart bests, top-3 total (live query while Live; from `tournament_results` once M7 lands) |
| `list` | Past tournaments (name, dates, top 3 per bracket) — from `tournament_results` once M7 lands |

No join action, no admin procedures — everything is automatic.

Web: new `features/tournaments/` (page route `/tournaments`, nav link). The
route constant `routes.tournaments` and translations already exist; the old
route/component is commented out in `features/root/Root.tsx:26,65` and gets
wired back. Content: current tournament card (state + dates; final results +
"new tournament on the 1st" notice during 25th–1st), pool table per bracket
(chart name, ID, per-mix level/label — so a player sees what their mix's version
is), bracket leaderboard tabs, "my progress" (per-chart bests, which 3 count,
current rank, plus the placement reason: "you have 5 charts at 950k+ on level 18
or harder → High"), past-tournaments list. Reuse table components from
`features/leaderboards` where they fit.

## HD and other chart types

HD (half-double) charts exist only in Phoenix 2 (790 shared charts, mix 28
only), so they can **never** be pool-eligible under "instance in all 3
supported mixes". The pool also filters `shared_charts.type IN ('S','D')`,
which keeps COOP out too and keeps the exclusion explicit if a future mix adds
HD. Tournament charts are playable by everyone on every supported mix — that is
the point of the shared pool.

## Legacy mechanism (from `piu-top` code, 2021-12 snapshot)

Checked out at `/home/grumd/coding/piu-top` (XX era: `targetMixNumber = 26`;
the prod copy used 27 for the 2024–2026 Phoenix tournaments). Authoritative
description of how the old system worked:

- **Creation** (`jobs/main.py` + `jobs/tournament_jobs.py`): cron on day 1 of
  each month created the tournament (state `ChartPoolVoting`) with 4 hardcoded
  brackets and called `bracket.randomizeCharts()`. Cron on day 26 set state
  `Ended`. "Voting end" was a **manual GET route** (`/tournament/voting-end`)
  flipping state to `Active` — there is no voting code anywhere; the state name
  is a misnomer for a human review/edit window on the random pool.
- **Chart selection** (`TournamentBracket.randomizeCharts` in
  `backend/alchemy/tables.py`): per bracket, take target-mix instances with
  `min_level <= level <= max_level`; singles = labels `S*` (not `SP`), doubles =
  `D*` (not `DP`); pick `singles_count`/`doubles_count` charts via
  `random.choice` (with replacement — no dedupe). No popularity weighting, no
  player input.
- **Player level** (`getPlayerLevels` in `backend/tournaments.py`): over the
  365 days before the start date, for non-hidden players with
  `stat_top_req_counter > 5`, per player per chart take the PB
  (`max(score_xx)`), then count PB-tying results per (chart level, grade).
  Player level = the **highest level with ≥ 5 PB-tying results whose top grade
  is A+/S/SS/SSS**. Unrated players → level -1 → in no bracket.
- **Scoring**: `getBrackets` returned all qualifying raw results (single target
  mix, window `[start, end]`, `mods_list NOT LIKE %VJ%`, player in bracket). The
  legacy web (`Tournaments.jsx`, in this repo's git history at `298a0c29^`)
  aggregated client-side: per chart, *player best score / field best score* (%),
  **total = sum of per-chart percents** — a relative metric. The new system uses
  the agreed absolute metric (sum of best 3 `score_phoenix`), computed
  server-side.
- **Single mix only**: everything was filtered by `mix == targetMixNumber` — the
  exact limitation this relaunch removes.

## Retiring the legacy code (piu-top)

Self-contained (verified: no references to tournament code anywhere else in
piu-top, including the admin frontend — grep over `.py`/`.js`/`.jsx` hits only
the files below). Delete:

| File | What |
|---|---|
| `backend/tournaments.py` | whole module (routes' handlers + PB/grade + bracket/score assembly) |
| `backend/jobs/tournament_jobs.py` | whole module (create/voting-end/end) |
| `backend/jobs/main.py` | `from jobs.tournament_jobs import ...` (line 8) + the two cron registrations (`create_tournament` day 1, `conclude_tournament` day 26) |
| `backend/main.py` | `import tournaments` (line 24) + 5 routes: `/tournament/add`, `/tournament/voting-end`, `/tournament/end`, `/tournament/players`, `/tournament/info` (lines 499–518) |
| `backend/alchemy/tables.py` | `getTournamentStart/VotingEnd/End` helpers (lines 14–18) + `Tournament`, `TournamentBracket`, `TournamentChart` models (lines 22–84) |

**Timing note (dated):** the legacy `create_tournament` cron fires on day 1 of
each month, and the latest row in `tournaments` starts 1 Sep 2026 — so it is
live and will fire again on **1 Oct 2026**. Either the legacy tournament code is
gone before then, or we expect one more legacy Phoenix-only tournament (or, if
migration A already renamed the tables, one errored job run).

**What M2 merging decides (2026-09-30):** merging M2 runs migration A on prod,
and from that moment the legacy cron cannot create a tournament any more. If M2
reaches prod before M6, **October has no tournament at all** — not a legacy one,
and the new creation job does not exist until M3/M5. Merge M6 first if October
should still have a legacy tournament; otherwise the errored run above is the
accepted outcome and M2 can merge now.

**Update (2026-09-30): the legacy code is removed and never fires.** piu-top
has had its whole tournament scheduler commented out since `36cdaf0`
(2026-09-29), so no legacy cron runs on 1 Oct, whether or not M2 is merged.
The dead code (backend modules, `jobs/` scheduler, models, the bot's
`tournament` command) is deleted in
[Zdreni/piu-top#23](https://github.com/Zdreni/piu-top/pull/23). The two notes
above are superseded; merging M2 only decides when the legacy tables get
parked.

Database: no drops of tournament data — migration A parks the old rows in
`_legacy_2026` tables. The new tables are fresh; nothing is backfilled into them.

**`backend-ts/` in piu-top is dead code.** The VPS runs the pumpking API (this
repo, deployed by GitHub Actions); piu-top's TypeScript backend is not run and
was deleted in `0ca4f7e` (2026-09-25).

Everything else in this section is about the **Python `backend/`, which is still
deployed** — the tournament cron lives there, and so does the last reader of
`chart_instances.interpolated_difficulty` (see the ID section above for that
sequence).

Cutover order (avoids two systems writing the same table):
1. Deploy the new pumpking tournament code with the creation job **disabled**
   (env switch, e.g. `TOURNAMENT_JOB=enabled`).
2. Remove the tournament code from piu-top and redeploy the legacy API (its
   scheduler no longer has tournament jobs).
3. Run migrations A + B on prod, then enable the new creation job. First run:
   1st of the next month (or a manual one-off run of the creation function to
   start immediately, then monthly on the 1st).

Also confirm at M6: how the legacy API is deployed/run in prod (scheduler
process) so the cron removal actually stops tournament creation.

## Milestones

| # | Work | Est. |
|---|---|---|
| M0 | ~~Review this doc, confirm open decisions~~ — **done 2026-09-28/29** (re-reviewed 2026-09-29 against prod data: ladder pools, minimal eligibility, fresh tables, date convention) | — |
| M1 | ~~ID storage~~ — **done 2026-09-29** (ID moved to `shared_charts`: one value per chart, 5,372 charts backfilled with 0 conflicts, no NULL ID left among the 3,117 pool charts; all readers moved off `chart_instances`, whose copy is dropped by the following migration; 3 tests; also fixes the un-awaited update loops) | — |
| M2 | ~~Migrations A + B~~ — **done 2026-09-30** (`20260930000000_park_legacy_tournaments` + `20260930010000_init_tournaments_v2`, verified up/down/up with legacy rows, `database.ts` regenerated). Bracket sizes were measured beforehand with a throwaway query (not committed — see "Indicative bracket sizes") | — |
| M3 | ~~Backend~~ — **done 2026-09-30**: `services/tournaments/` (`eligibility.ts` shared predicate + pool query, `rules.ts` pure skill/bracket/ranking rules, `lifecycle.ts` create/end, `tournament.ts` read side), `constants/tournaments.ts`, env-gated cron (`jobs/tournamentsJob.ts`), CLI `npm run tournament -- create [YYYY-MM] \| end`, tRPC `tournaments.get({ tournamentId? })` (tournament + brackets + pools + live leaderboards + own bracket) and `tournaments.list`; 17 tests in `src/test/unit/tournaments.test.ts`. Mid's double sits at 14 | — |
| M4 | ~~Web~~ — **done 2026-09-30**: `features/tournaments/Tournaments.tsx` at `/tournaments` + nav link: tournament picker, state/dates card with the player's bracket and placement reason, bracket tabs (default: own bracket) with the pool (per-mix labels, ID) and the leaderboard (counted scores bold) | — |
| M5 | Enable creation job; first live month; watch participation per bracket | 0.5 d |
| M6 | Retire the piu-top **Python** tournament code (separate repo; note `36cdaf0` already commented the tournament logic out) + merge [piu-top#22](https://github.com/Zdreni/piu-top/pull/22) and the held-back drop migration; confirm the prod scheduler no longer creates tournaments — **before 1 Oct** | 0.5 d |
| M7 | Cups: `tournament_results` + population by the Ended job; profile cups (per-medal counts + award list with bracket); ranking-list cup counters replacing grade-based stats; `getCurrent`/`getLeaderboard`/`list` (Ended) read from the table | 1.5–2 d |
| M8 | Main leaderboard highlight while Live: pool-chart badge, counting-result badge, "tournament is live" banner linking to `/tournaments` | 0.5–1 d |
| M9 | Nav notice badge: `player_notices` table + write from the creation job, `notices.unread` query + `notices.markRead(scope)` mutation, red "!" on the TopBar Tournaments link | 0.5 d |

Total: ~1.5–2 weeks single dev (launch, M1–M6); +1.5–2 d post-launch for M7;
+0.5–1 d for M8; +0.5 d for M9.

## Running it by hand

The creation and end logic runs without the cron through the CLI (same code as
the jobs, idempotent per month):

    npm run tournament --prefix packages/api -- create 2026-10   # default: current month
    npm run tournament --prefix packages/api -- end              # ends every Live tournament past its end_date

`DELETE FROM tournaments WHERE id = ?` removes a tournament with its brackets,
pool and assignments (cascade), e.g. to redraw in a dev database. On prod the
cron runs only with `TOURNAMENT_JOB=enabled`.

## Decisions

Decided 2026-09-28 (unchanged):

1. **Participation** — stored bracket-assignment snapshot
   (`tournament_player_brackets`). Players who register or unhide after the
   snapshot wait for the next tournament.
2. **Manual-input results** (`is_manual_input`) — include. Self-service,
   self-only, screenshot-backed, Phoenix score must match the step-stat
   calculation. 180d data: 305 manual results from only 2 players (283 of them
   950k+) — excluding them would gut the Top bracket.
3. **Legacy filter `stat_top_req_counter > 5`** — drop. It is a profile-page-view
   counter, not play activity; it would have excluded 102 of 166 visible
   players. Skill is a pure function of the player's results.
4. **Tie-breaks** — no tie-break chain. Ties on the top-3 total share the place;
   prizes go to everyone holding it. Display order inside a tie: best single
   desc, then player_id.
5. **Small brackets** — no merging in v1, no warnings or badges; the leaderboard
   shows who is in the bracket. Merging can be revisited later.
6. **Creation timing** — create on the 1st, window `[1st, 25th)`, end on the
   25th; winners displayed 25th–1st. An announced-but-not-counting pool would
   confuse players; the off period becomes the winners-display window.

Decided 2026-09-29 (this review):

7. **No mod/rank-mode filters** — drop `mods_list` and `rank_mode` from
   eligibility entirely. `mods_list` holds arcade play options (`AV###`,
   `BGADARK`, …), and filtering it would disqualify ~93% of valid results. VJ is
   excluded for free because VJ results have no `score_phoenix`.
8. **Approximate dates excluded** — require `exact_gain_date = 1` (a 0/1 flag,
   not a date). ~118 of ~5,284 recent 950k+ results are approximate.
9. **Date convention** — naive site wall-clock datetimes, compared in SQL only,
   crons pinned to `Europe/Warsaw`; see "Date and time convention".
10. **Ladder pools** — fixed 2-per-level composition per bracket (see
    "Brackets"), random chart identity within `(level, type)`; replaces
    uniform-random-over-band, so monthly pools are comparable and no bracket can
    drift a whole level up or down.
11. **Fresh tables** — legacy tournament tables parked in `_legacy_2026`, new
    ones built from scratch (no legacy columns or states).
12. **No voting/review stage** — a bad draw is fixed with a manual `UPDATE`
    (SQL in "Pool selection").
13. **Skill rule = depth, not band counting** — skill level is the player's
    **5th-highest** qualifying chart level (the highest level they can back with
    5 charts at 950k+ *or harder*), and the bracket is the range containing it.
    Decided 2026-09-29, replacing both earlier readings ("5 charts at one exact
    level" and "5 charts inside the bracket range"), which either dropped
    spread-out strong players into Easy or ignored level depth entirely. See
    "Player skill algorithm" for the worked examples and "Indicative bracket
    sizes" for the current counts.

Fixed for reference: qualify threshold = 950,000 (`TQ_QUALIFY_SCORE`); band
edges per the Brackets table; skill window 180 days; ladder levels per bracket.

## Risks

- **P2 ID estimate**: until P2 results accumulate, P2 charts carry a cross-mix
  estimate. Mitigation: ID is one value per shared chart, the daily job keeps
  improving it, and pools are drawn per `floor(ID)`.
- **Cross-mix fairness**: the same shared chart is a different pattern per mix.
  Mitigation: ID banding + raw-score metric; accepted as inherent to a shared
  pool.
- **Easy's ladder is at the bracket ceiling**: Easy pools are ID 11–13, so the
  weakest Easy players (and unrated ones) have no makeable chart and will post
  low totals. Accepted — the alternative (a 1–13 spread) handed the bracket to
  whoever drew easy charts. If it bites, add a fifth bracket at 8/9/10.
- **A skill-20 Top player still faces 21s and 22s**: placement means "5 charts
  at 20+", not "can do 22". The ladder deliberately sits at the bracket's
  ceiling, so the top of every bracket is a stretch. Accepted.
- **High bracket is quiet** (~34 results/mo, 6 active players) under the decided
  17 boundary. Accepted; one-constant change if revisited.
- **Doubles at High/Top** are mandatory to fill the top 3 well. Accepted.
- **Retroactive moderation**: deleted/hidden results move the live leaderboard
  after the fact — accepted, UI labeled; medals frozen at `Ended`.
- **Cutover race**: the legacy cron (day 1, next 1 Oct 2026) and the new creation
  job must never both be live — enforced by the cutover order (new code deployed
  disabled → legacy removed and redeployed → tables migrated → new job enabled).
- **History is parked, not displayed**: past tournaments in the new UI start
  empty. Accepted (the new web never showed the legacy ones).
- **Level-22 depth**: only 33 S charts at ID 22, so the Top ladder's S slot at
  22 repeats within a couple of years; the "skip the last two months" rule
  softens it.

## Out of scope (later)

- A fifth "Bronze" bracket (ladder at 8/9/10) if Easy's spread turns out to
  exclude the low end.
- Player-picked charts from a larger per-bracket pool (v1 = ladder + random).
- Chart pool voting (the legacy "voting" state was a human review window, not
  real voting; not wanted).
- Bracket merging by participation when a bracket is too small.
- Rewards beyond cups: badges, titles, notifications (Telegram hooks exist).
  Cups are specced in "Cups and tournament results" (M7).
- HD in tournaments: structurally impossible (P2-only charts can't be in the
  shared pool).
- Phoenix 3: the design generalizes — add the mix to `SUPPORTED_MIXES` and the
  shared-pool query; no other change.
