# Retire the XX/Phoenix scoring toggle — Phoenix 1M scoring only

Leaderboards and display always use `score_phoenix`. The raw original score (`results.score`)
is kept in the DB and shown in the result detail popover. No DB migration needed: `score`
(original), `score_xx` (still written on upload — keep the most complete data in the DB),
`score_phoenix` (canonical). Backend/UI just stop *reading* `score_xx` for display.

Already Phoenix-only, no work: PP, EXP, difficulty interpolation, achievements, player grades,
profile views, best-grade tracking (keeps the stored XX-style `grade` column +
`constants/grades.ts`).

## API (`packages/api`)

- [x] `services/charts/chartsSearch.ts`: drop `scoring` param, hardcode
      `scoreField = 'score_phoenix'`; add `r.score as original_score` to the `ranked_results`
      select and `originalScore` to `ResultViewModel`.
- [x] `trpc/routes/charts/search.ts`, `trpc/routes/charts/chart.ts`: remove `scoring` from Zod
      inputs. (Auto-cleans web `ChartsFilter`, which is derived from `ApiInputs`.)
- [x] `services/players/playersPp.ts`: remove unused `r.score_xx` select.
- [x] `services/results/resultAddedEffect.ts`: remove unused `score_xx` select (same cleanup).
- [x] `services/results/addResult.ts`: keep writing `score_xx: result.score` as-is (data
      completeness for old-mix uploads). No change.

## Web (`packages/web`)

- [x] `hooks/useFilter.ts`: remove `scoring` from `initialFilter` and the zod schema. Existing
      localStorage filters are safe: `atomWithValidatedStorage` parses with zod, which strips
      unknown keys.
- [x] `search/SearchForm.tsx`: remove scoring `Select`, `scoringOptions`, `filterToForm` line.
- [x] `search/formTypes.ts`: remove `scoring`.
- [x] `hooks/useSingleChartQuery.ts`: stop passing `scoring`.
- [x] `charts/Result.tsx`: always render `<Grade scoring="phoenix">`; in the score popover show
      the original score when `originalScore != null && originalScore !== score` (pre-Phoenix
      results are on the 1.8M scale). Used the existing `ORIGINAL_SCORE` translation key.
- [x] `components/Grade/Grade.tsx`: remove the `xx` branch → Phoenix-only, simpler props.
- [x] `charts/MixPlate.tsx`: remove `scoringToMix`; badge when the result's mix differs from the
      newest mix in the current filter. (Supersedes the MixPlate item in `Phoenix2.md`.)
- [x] Delete XX grade images `public/grades/*.png` (keep `phoenix/` subdir).
- [x] Translations (en/ru/ua/pl): remove `SCORING_LABEL`.

## Behavior changes (confirmed)

- Rank-mode (VJ) results no longer appear in leaderboards at all (`score_phoenix` is NULL by
  design for rank mode; they already earn no PP/EXP).
- Users on the XX toggle land on the Phoenix board.
- Pre-Phoenix results always show the back-calculated Phoenix score.
- Note (discovered during implementation): ~9.5k non-VJ pre-Phoenix results in prod have
  `score_phoenix` NULL because their step stats (perfects/greats/...) were never imported, so
  they can't be back-calculated. They disappear from leaderboards too (affects ~3k charts that
  may still have other Phoenix-scorable results).

Ship as one commit: the tRPC input change breaks the web build until both sides are updated.
