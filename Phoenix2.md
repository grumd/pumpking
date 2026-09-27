# Adding Phoenix 2 (mix 28) — checklist

Mixes are identified by an integer (Prime=24, Prime2=25, XX=26, Phoenix=27) and are wired
through a handful of hardcoded lists rather than one registry. Phoenix 2 keeps Phoenix scoring
(1,000,000 scale, same grades and plates), so no scoring/grade changes are needed.

**Status (2026-09-27): mix-28 code + tests + local DB data done and verified against the live
dev stack. The HD half-double feature below is done and verified (tests, live API, browser
filter/label checks).**

## Database and data

- [x] **Insert the mix row** into the `mixes` table (id 28, name `Phoenix2`) — as data migration
      `migrations/20260927032417_add_mix_phoenix2.ts` (idempotent insert + `down`), applied to the
      local dev DB and picked up by every test-DB rebuild; prod gets it on the next
      `migrate:latest`. (The table was empty in the prod dump, so prod needs it too.)
- [x] **Create `chart_instances` rows for mix 28** — already present from the prod dump
      (5,465 rows incl. 790 `HD`). Verified: adding a result finds the instance by shared chart
      + mix at `packages/api/src/services/results/addResult.ts` and works (tested via tRPC).
- [x] **Add new tracks and shared charts** for songs new in Phoenix 2 — already present from the
      prod dump (50 tracks only in mix 28).
- [ ] **Add `arcade_player_names` rows with `mix_id = 28`** — deferred: this data comes from
      arcade exports via the legacy API (prod has only 3 rows for mix 27). Nothing to fabricate
      in this repo; it appears as arcade uploads arrive. The players list filter joins on that
      table at `packages/api/src/services/players/players.ts:19`.
- [x] **Run the difficulty interpolation** — ran `updateChartsDifficulty()` on the local dev DB
      (mix 28: 218 → 240 instances gained `interpolated_difficulty`; the rest need more player
      results, same mechanism as prod).

## API (`packages/api`)

- [x] `src/constants/mixes.ts`: added `Phoenix2: 28` plus a `MixName` type and a `MIX_NAMES`
      literal tuple used by the Zod enums. The `keyof typeof MIXES` type flows into the
      add-result service and the web `ScreenshotRecognition` component automatically.
- [x] `src/constants/currentMix.ts`: set `mix = 28`. Verified: least-played track stats now use
      mix 28 (new P2 tracks top the list). `minMixToGetPp` left at 25.
- [x] `src/trpc/routes/results/addResult.ts` and `src/trpc/routes/results/recognizeScore.ts`:
      the hand-written Zod enums are replaced by `z.enum(MIX_NAMES)` derived from the `MIXES`
      registry — future mixes no longer need this step.
- [x] **Screenshot OCR keyed on the string `'Phoenix'`** — changed to
      `MIXES[mix] >= MIXES.Phoenix` in `src/services/results/recognizeScore.ts` (3 spots) and
      `src/trpc/routes/results/recognizeScore.ts`. Still to verify with a real Phoenix 2
      screenshot: same number order and the "dotted zero" font.
- [x] `src/services/charts/chartsSearch.ts`: default `mixes = [26, 27, 28]`.
- [x] **Tests**: `initialSeed.ts` now seeds a mix 28 instance; `add-result.test.ts` gained a
      tRPC-level Phoenix 2 suite (unknown-mix rejection, phoenix score validation, mix/grade/
      chart-instance persistence, no `+` appended to grades). Note: the tRPC path requires a
      non-empty screenshot data-URL, so the 0-byte `test/files/test.jpg` placeholder was replaced
      with a real 1×1 JPEG (legacy multipart tests unaffected).
- [ ] ~~The WIP grade recognition in `src/services/results/recognizeGrade.ts`~~ — **not on
      master**: it exists only on the `wip/opencv-grade-recognition` branch (commit
      `abfcb7bb`, OpenCV template matching against `src/assets/grades/*.png`, XX-style grades
      only). Nothing to do for this slice; if/when that branch is merged it needs Phoenix-grade
      templates to cover Phoenix-family screenshots.

Already fine (no change needed):

- Score validation and grade "+" logic in `addResult.ts` use `>= MIXES.Phoenix` / `< MIXES.Phoenix`.
- `resultAddedEffect.ts:94` uses `mix <= 26` for XX-style pass detection.
- `playerGrades.ts`, `playerMostPlayedCharts.ts`, `playerHighestPpCharts.ts` pick the latest mix
  via `ORDER BY mix DESC`, so they switch to 28 as soon as instances exist.
- `chartDifficultyInterpolation.ts` and `controllers/charts/difficultyInterpolation.ts` use `mix >= 25`.
- `src/types/database.ts` — no schema change, no regeneration needed.
- Legacy REST controller `src/controllers/results/addResult.ts:19` has a mix enum without Phoenix;
  it is slated for removal, leave it.

## Web (`packages/web`)

- [x] `src/utils/scoring/grades.ts`: added `28: 'Phoenix2'` to `Mixes`; TypeScript enforced the
      matching `colorByMix` entry.
- [x] `src/constants/colors.ts`: added a `28` color to `colorByMix` (continues the 24→27 hue
      drift: `#2a4e4399`).
- [x] `src/features/leaderboards/components/search/SearchForm.tsx`: Phoenix 2 in `mixOptions` and
      in the `filterToForm` default.
- [x] `src/features/leaderboards/hooks/useFilter.ts`: 28 in `initialFilter.mixes` plus a one-time
      localStorage migration (stored default `[26, 27]` becomes `[26, 27, 28]`; custom selections
      untouched; guarded by a one-shot flag — no storage-key bump, so other filters survive).
- [x] `src/features/leaderboards/components/charts/MixPlate.tsx`: no change needed — the checklist
      was stale (`scoringToMix` no longer exists). Current logic badges a result when its mix ≠
      max of the selected mixes, so with the new default Phoenix 2 results are unbadged and
      Phoenix/XX results get badges. Verified in the browser on a mixed 27/28 chart.
- [x] `src/features/leaderboards/components/add-result/AddResult.tsx`: Phoenix 2 in `MIX_OPTIONS`;
      `AddResultFormData.mix` derived from `keyof typeof MIXES`; grade dropdown uses
      `MIXES[mix] >= MIXES.Phoenix`.
- [ ] `src/hooks/useMixes.ts` still returns only `[{ id: 26 }]` (the TODO). Deferred: widening to
      27/28 makes the `getPlayers` inner-join return a row per mix, so players with arcade names
      in several mixes would appear duplicated in the player dropdown until the query dedupes.

Already fine (no change needed):

- `ChartHeader.tsx` uses `Mixes` / `colorByMix` and picks up 28 once the maps are updated.
- `ScreenshotRecognition.tsx` passes `mix` through typed as `keyof typeof MIXES`.
- Grade images in `public/grades/phoenix/` are reused.
- Translations: mix labels are hardcoded English in the option lists, nothing to add.

## Suggested refactor while doing this

Derive every mix list from `packages/api/src/constants/mixes.ts`: the two Zod enums, the web
`Mixes` map, `mixOptions`, `MIX_OPTIONS`, and the `AddResultFormData.mix` type. Replace every
`=== 'Phoenix'` string check with `MIXES[mix] >= MIXES.Phoenix`. Then the next mix is a one-line change.

**Done in the slice:** the two Zod enums (`z.enum(MIX_NAMES)` from the `MIXES` registry), the
`AddResultFormData.mix` type, and every `=== 'Phoenix'` string check.
**Intentionally not derived:** the web `Mixes` map is the source of the numeric `MixNumbers` keys
that make `colorByMix` exhaustive (deriving it via `Object.fromEntries` would degrade to
`Record<number, …>`); `mixOptions`/`MIX_OPTIONS` keep human display labels (`Prime 2`) and stay
explicit.
**Also fixed while testing:** `src/trpc/trpc.ts` `errorFormatter` mapped every non-`StatusError`
(incl. Zod input validation) to HTTP 500 — `BAD_REQUEST` errors now return 400.

---

# Half-Double chart type (label prefix `HD`)

**Status (2026-09-27): DONE and verified.** Phoenix 2 adds a new chart type: half-double. Decision: the label
prefix is **`HD`** (e.g. `HD18`).

Data discovery that corrected the plan below: the legacy `HD-` labels (mixes 15-20, e.g.
`HD-7`) are a **different chart family** - those shared charts appear as `S#` singles in mix 28
and have zero shared-chart overlap with the new `HD#` labels. The backfill is therefore scoped
to `label REGEXP '^HD[0-9]'` (790 mix-28 rows), not `LIKE 'HD%'`.

Product decisions (defaults picked, easy to flip - confirm):
- **PP**: HD charts earn PP (no `HD%` exclusion added; only `COOP%` is excluded).
- **Rank mode (VJ)**: allowed on HD (no block added; VJ results have `score_phoenix` NULL and
  never appear in leaderboards anyway).
- **Profile grade stats**: HD is excluded from the S/D-specific views (`LevelAchievements`,
  `DoubleSingleGradesGraph` unchanged - they hardcode S/D and simply ignore the HD rows the
  API now returns). If the decision is to fold HD into doubles or add a third row/graph, only
  those two components change.

Known starting state (from the prod dump in the local dev DB):

- 790 `HD%` `chart_instances` rows for mix 28 already exist, all with `type = NULL` and most
  missing `max_total_steps`/`max_possible_score_norank` (same partial state as the rest of mix 28);
  the `type` column is still `ENUM('S','D')`.
- HD rows for mix 27 and earlier: none.
- Open product decisions that must land with (or before) the code: **PP** (do HD charts earn PP?),
  **rank mode** (is VJ allowed on HD in Phoenix 2?), **profile grade stats** (how to present HD
  alongside S/D).
- Suggested order: enum migration → `database.ts` regen → `playerGrades` widening → web display
  (ChartFilter/ChartLabel/colors) → tests. The localStorage label list (`initialFilter.labels`) gets
  the same one-time `[26,27]-style` migration pattern already used for mixes in slice 1 (old stored
  default `['S','D']` → `['S','D','HD']`, one-shot flag, no key bump).

Chart types are mostly convention: a free-text `label` on `chart_instances` (`S20`, `D18`, `SP`,
`DP`, `COOP`) that code parses by prefix, plus a stricter `type ENUM('S','D')` column used only by
the profile grade stats. `HD` does not collide with the existing `LIKE 'S%'` / `LIKE 'D%'` prefix
filters, and the web label parser (`labelToTypeLevel`) splits it into type `HD` and level `18`
automatically.

## Database

- [x] **Extend the type enum** with migration
      `migrations/20260927053730_add_hd_chart_type.ts` (**`.ts` with a `down`**, applied to the
      local dev DB, picked up by every test-DB rebuild):
      - `ALTER TABLE chart_instances MODIFY type ENUM('S','D','HD')`
      - backfill `type='HD'` scoped to `label REGEXP '^HD[0-9]'` - NOT `LIKE 'HD%'`, which would
        also hit the 843 legacy `HD-x` rows (different chart family, see above).
      - also backfilled the mix-28 S/D rows (`mix = 28 AND label LIKE 'S%'/'D%'`): the mix 28
        import skipped the original type backfill (all 5,465 rows were NULL), and without it the
        current mix is invisible to profile grade stats (join on `type is not null`). All mix 28
        S/D rows were NULL beforehand, so `down` reverts exactly this set.
      - `down`: re-null the HD rows + mix-28 S/D rows, shrink back to `ENUM('S','D')`.
      - Left alone (out of scope): the 914 NULL-type S/D rows of mix 27.
      - **Superseded (2026-09-27):** the code no longer reads the `type` column at all -
        profile stats derive the type from the label prefix (see API section below). The
        backfilled values are now inert data; the column and the migration are left in place
        (decision: don't modify the database further; dropping the column would be a separate
        migration if ever wanted).
- [x] **Regenerate `packages/api/src/types/database.ts`** - took only the one-line change
      (`type: 'D' | 'HD' | 'S' | null`). A full regeneration also pulled in unrelated drift:
      `phoenix2_track_names` table, `players.arcade_phoenix2_name` columns, `best_results` table
      (absent in the dev DB), the inferred `PlayerPreferencesJson` structure (inference depends
      on the data present), and a quote-style flip. Needs a manual merge when it is next
      regenerated; note the `generate-kysely` npm script hardcodes a no-password URL that fails.
- [x] **Chart data**: HD `chart_instances` rows already present in the dev DB (790, mix 28),
      `level` set (4-27) so exp and the level filter work.

## API (`packages/api`)

- [x] `src/services/players/playerGrades.ts`: **stops reading the `chart_instances.type`
      column entirely** and derives the type from the label prefix in the query
      (`CASE label LIKE 'S%' -> 'S', 'D%' -> 'D', 'HD%' -> 'HD'`). The join subqueries select
      the latest-mix instance with `level > 0` **and an S/D/HD label** (replacing
      `type is not null`), so COOP/legacy-labelled charts still fall through to the newest
      gradeable instance. `GradeStatsChartType` is now the literal `'S' | 'D' | 'HD'`.
      This makes the stats immune to import-time `type` backfill drift - the 914 NULL-type
      mix-27 rows (and any future import gap) now count correctly, and the `type` column is
      dead weight the code never touches. The API output shape is unchanged, so the web
      presentation components needed no changes.
- [x] **PP**: HD earns PP - default kept, no `HD%` exclusion in `resultsPp.ts`. Confirm.
- [x] **Rank mode (VJ)**: allowed on HD - no block added in `addResult.ts`. Confirm.
- [x] **Tests**: `initialSeed.ts` gained a mix-28 `HD18` instance (chart 4) and an `S15`
      instance with a NULL `type` column (chart 6); `chartsSearch.test.ts` gained an HD-label
      filter case (HD matches `HD`, does not leak into `S`); `add-result.test.ts` gained an
      add-result case on the HD chart (label/instance/mix/grade persisted); `players.test.ts`
      gained a regression case asserting the NULL-type S15 chart is counted by its label in the
      profile grade stats.

Already fine (no change needed):

- `src/utils/profile/exp.ts` uses the level formula for anything that isn't `COOP`, so HD gets
  normal exp. The exp backfill migrations (`profile_exp_init`, `refresh_exp`) follow the same rule.
- Difficulty interpolation and the search level filter treat only `COOP` as level-less.
- `src/services/charts/chartsSearch.ts:250` filters labels by prefix (`LIKE 'HD%'`), so passing
  `HD` from the web just works.
- `src/services/results/addResult.ts` has no other type-specific logic; manual entry for an HD
  chart works once the chart instance exists.

## Web (`packages/web`)

- [x] `src/features/leaderboards/components/search/ChartFilter.tsx`: `Half-Double` / `HD` toggle
      option (between Double and COOP), `'HD'` in the default selected list.
- [x] `src/features/leaderboards/hooks/useFilter.ts`: `'HD'` in `initialFilter.labels` plus a
      second one-time migration (separate `filterAtom_hdLabelsMigrated` flag key, same pattern as
      the Phoenix 2 mix migration): stored default `['S','D']` becomes `['S','D','HD']`, custom
      label selections untouched, no storage-key bump.
- [x] `src/components/ChartLabel/ChartLabel.tsx`: `[css.halfdouble]: type === 'HD'`.
- [x] `src/components/ChartLabel/chart-label.module.css`: `.halfdouble` rule using
      `--half_double_chart_color`.
- [x] `src/features/root/colors.scss`: `--half_double_chart_color: #a8621d` (dark orange, between
      the single red and the double green). The legacy `Root.scss` mirror block was **skipped** -
      those classes (`chart-label`, `.single`, `.coop`, ...) are not referenced anywhere outside
      the CSS module, the `ChartLabel` module is the only live one.
- [x] **Profile grade stats**: default is to exclude HD from the S/D-specific views (components
      unchanged; verified in the browser on a profile with HD results - no errors, HD rows are
      silently ignored by the hardcoded S/D presentation). Open product decision remains: fold HD
      into the double side, or add a third row / separate graph:
  - `src/features/profile/components/LevelAchievements/LevelAchievements.tsx`
    (`types = ['S', 'D']`, colors by `type === 'D'`).
  - `src/features/profile/components/DoubleSingleGradesGraph.tsx`: mirrored bar chart (singles
    positive, doubles negative), hardcoded S/D key list, `S-` / `D-` prefix filters in the tooltip.
  - `src/features/profile/hooks/usePlayerGrades.ts` groups by whatever `type` the API returns, so
    only the presentation components change.

Already fine (no change needed):

- `labelToTypeLevel` in `src/utils/leaderboards.tsx` parses `HD18` into `['HD', '18']`.
- `ChartHeader`, `HighestPpCharts`, `MostPlayedCharts` render `ChartLabel` from the parsed label.
- `AddResult.tsx` has no type-specific logic.

## Out of this repo

The legacy Python API does arcade screenshot recognition and chart imports. It must learn to
recognize the half-double result screen and emit the `HD` label, or arcade uploads for those
charts will be mislabeled or rejected.
