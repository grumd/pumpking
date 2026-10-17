# Results from photos — Plan

Status: research and design done 2026-10-17 · S1–S4 built 2026-10-17, not released

## Progress

Start a new session here: this section says where the work stands and what
comes next. The rest of the document is the design it follows.

| Step | State |
|---|---|
| Research: models, prices, accuracy, checks | Done 2026-10-17 (see "What the research found") |
| S1 shared code into `database` / `utils` | Done 2026-10-17 |
| S2 migration: photo hash, OCR cost | Done 2026-10-17 (`20261017100000_add_photo_results`) |
| S3 API: reader, decision, endpoints | Done 2026-10-17, tests in `photoResults.test.ts` |
| S4 web: batch page and queue | Done 2026-10-17 (`features/add-results`); not tried with real reads yet |
| S5 small real-photo check before release | Not started |
| S6 remove the old crop OCR, drop `openai_*` | Code removed 2026-10-17 with the chart page's "Add result". Left: a held-back migration dropping `players.openai_*` after this ships. **Deadline:** `gpt-5-mini` shuts down 2026-12-11 |
| Cost limits, single-photo review | Done 2026-10-17 (see "Cost limits", "Single photo") |

Before release: S5, and `OPENROUTER_API_KEY` in prod's `~/pumpking/shared/api.env` (`OPENAI_API_KEY` can go).

Changes from the design made while building:

- `addResult`'s same-play check applies to every manual result, not only photos (409).
- A read that passes every check but that `addResult` still refuses (its own max score
  or rank mode checks) goes to manual input with the reason, instead of failing.
- When every reader fails (timeout, no key), the photo is marked failed: the user can try
  again, enter it by hand, or skip it. A reader that answers with invalid JSON counts as
  no read; its cost is still counted.
- The chart picker uses a new `results.photoCharts` query: `charts.search` lists only
  charts that have results, so an unplayed chart couldn't be picked.
- `checkPhotoHashes` is a mutation, so the batch's hashes go in the body, not the URL.
- A photo can't be added by two players (the hash is unique across results).

## Goal

The user selects several photos of result screens at once. For each photo the
system reads the song, chart and stats, checks them against the database, and
saves the result with no input when everything matches. When something doesn't
match, the queue pauses on that photo and asks only for the fields in doubt;
after the user fills them in, the queue goes on with the next photo.

Today's flow (pick a chart first, draw a box around the numbers, type the grade,
`gpt-5-mini` via the OpenAI API) is replaced.

## Agreed decisions

- **Provider:** OpenRouter, through the `openai` SDK with
  `baseURL: 'https://openrouter.ai/api/v1'`. Key: `OPENROUTER_API_KEY` in
  `packages/api/.env` (dev has it; prod's `~/pumpking/shared/api.env` needs it
  before release, never print it).
- **Two readers from two vendors:** A = `google/gemini-3.5-flash-lite`
  (reasoning can't be turned off: `reasoning: { effort: 'minimal' }`),
  B = `anthropic/claude-haiku-5.5` (`reasoning: { enabled: false }`). Requests
  use `provider: { require_parameters: true, data_collection: 'deny' }` and
  `usage: { include: true }` (the response then carries the cost in USD).
- **Phoenix and later:** read with A. If the checks fail, read the same image
  with B (a different model; the same model mostly repeats its mistake). If B
  passes, save. If both fail, pause and show the fields where A and B differ; if
  they agree on everything and still fail, show all seven numbers.
- **XX and earlier:** A and B in parallel. Save only when both pass the checks
  and agree on chart, the six counters, score, grade, broken grade and mod. When
  they don't, C = `openai/gpt-6-luna` (a third vendor, `reasoning: { enabled:
  false }`) reads the photo, and two reads that both pass and agree save it
  (added 2026-10-17, see "XX: shifted number column and a third reader").
  Otherwise pause on the fields where the reads aren't unanimous, starting from a
  read that passes every check if there is one. Counters that every read agrees on
  but that miss a known step count are asked too.
- **Song and chart are always detected**, never picked by the user up front. No
  unique song + chart whose exact step count equals the counters' total means
  the photo goes to manual input (chart picker plus the doubtful fields).
- **Duplicates:** SHA-256 of the original file, checked before anything is sent
  to OpenRouter (zero cost for a re-selected file). A second shot of the same
  screen or a re-encoded copy has a different hash: it is read once, then caught
  by the same-play check (same player, chart and identical counters + combo)
  before saving.
- **Mods:** read from the side badges (HJ, VJ, RANK). Tested not to hurt the
  counters (below).
- **Accepted risk:** XX max combo has no real check. On ~200 XX photos, one
  low-resolution stored photo was saved by both readers with max combo off by
  one (418 for 419, ~5 points of Phoenix score). Accepted 2026-10-17.
- **Grade and pass:**
  - Phoenix: grade = `getPhoenixGrade(score, mixId)` (Phoenix and Phoenix 2
    have different thresholds below 950,000, so the selected mix matters). The
    read grade must equal it: a mismatch pauses the photo, as it is a misread or
    the wrong mix selected (a Phoenix 2 photo uploaded as Phoenix passes every
    other check). Pass = a plate text is
    shown under the grade ("MARVELOUS GAME" ...). The read plate must equal
    `calcPlate(steps, pass)` (from ingest's `millionScoring.ts`), which also
    checks pass / fail. Not tested on photos yet: S5.
  - XX: the grade letter is read; a cracked / shattered letter is a failed
    stage. Pass `A` is stored as `A+` (as `addResult` already does).

## What the research found

All on 2026-10-17. OpenRouter list prices, $ per 1M tokens, input / output.

**Sets used:** 306 manual Phoenix photos from prod (stored copies, ~900px WebP,
other players, OK'd by the user), 181 of the user's manual XX photos from prod
(same quality), 14 fresh phone photos of XX screens (3072×4096, sent as
2048px), 8 prod XX photos with HJ / VJ. Correct values: the stored results,
read by eye where they disagreed. Prod data errors found on the way: result
301188 (Vacuum S16) has the Maria S16 photo attached; result 301186 is that
play.

**Image size:** 2048px on the long side is best. With `gpt-6-luna` on the
phone photos: 1024px 12/14 right, 2048px 14/14, full 12MP 10/14 at 4× the cost
(15,000 input tokens). Stored ~900px prod copies are worse than fresh uploads.

**Models, XX prod set (181) and phone set (14):**

| Model | Price | XX counters + combo right | Phone right | $/photo |
|---|---|---|---|---|
| Gemini 3.5 Flash-Lite | 0.30 / 2.50 | 177/181 | 13/14 | 0.00076 |
| Claude Haiku 5.5 | 0.10 / 0.50 | 177/181 | 13/14 | 0.00055 |
| Gemini 3.1 Flash-Lite | 0.25 / 1.50 | 174/181 | 13/14 | 0.00057 |
| gpt-6-luna | 0.10 / 0.50 | 164/181 | 14/14 | 0.00042 |
| Gemini 2.5 Flash-Lite | 0.10 / 0.40 | 170/181 | 13/14 | 0.00032 |
| Qwen 3.8 Flash, GLM-5.3 Flash | ~0.15 / 0.5 | 159, 151 | 10, 14 | ~0.0005 |
| Nemotron 3.5 VL, Mistral Small 4 | | broken (shifted columns, errors) | | |

- Two different models agreeing (XX prod set): Gemini 3.1 FL + 3.5 FL saved
  85% with 0 wrong, Haiku + Gemini 3.5 FL 82% with 0 wrong. A single read let
  2–3 wrong results through (max combo misreads; the XX "1" looks like "7").
- Phoenix: `gpt-6-luna` alone passed the score check on 96.7% with 0 wrong;
  Gemini 3.5 FL on the 11 failures fixed all 11.
- Mod badges in the prompt: counters + combo 15/20 → 15/20 (Gemini) and
  17/20 → 18/20 (Haiku), HJ / VJ right on 40/40.
- Haiku sometimes returns the player's title ("GLORY OF REVENGE") as the song
  on 2P-side screens; Gemini once made up a title for a photo whose title was
  cut off. Matching rejects both (no chart with that label and step count).
- Cost per photo: Phoenix ~$0.0008 (+ a second read ~5% of the time), XX
  ~$0.0013. ~300 manual results a month: well under $1 a month.
- OpenAI's `gpt-5-mini-2025-08-07` (today's model) shuts down 2026-12-11
  (`GET /v1/models/gpt-5-mini-2025-08-07` → `shutdown_date`).

**What the checks catch** (simulated over 19,856 real Phoenix results, every
possible misread):

| Misread | Passes score check + exact step count |
|---|---|
| 1 wrong digit in a counter (3.4M cases) | 0 |
| 2 wrong digits in two counters (12.4M cases) | 0 |
| 1 wrong digit, score check only | 0.03% |
| 1 wrong digit, step count only (XX) | 14% |

So for Phoenix the score check plus an exact step count is the guarantee. For
XX the exact step count catches any single misread among the five judgements;
max combo and score are only covered by two readers agreeing.

Do **not** auto-fix a failed read by changing one digit until the checks pass:
on one photo that changed max combo to fit a misread score (max combo barely
moves the Phoenix score).

**XX: shifted number column and a third reader** (2026-10-17, after the build). On XX the
numbers column is often a whole row off its labels. On such a photo (Gargoyle D20) Gemini
and Haiku both paired numbers by row and agreed on five wrong counters; `gpt-6-luna` read it
right. The XX counters line now anchors on the calories (the only number with a decimal
point, at the bottom) and counts up from it; Phoenix keeps the tested wording. Telling the
models realistic sizes of the values didn't help: Haiku still wrote a 7-digit max combo.

| 20 XX photos (13 that Gemini + Haiku didn't save, 7 that they did) | Old prompt | New prompt |
|---|---|---|
| Fully right: Gemini / Haiku / luna | 13 / 13 / 14 | 13 / 15 / 15 |
| Gemini + Haiku saved (wrong) | 7 (0) | 9 (0) |
| With luna as tie-breaker, two reads agree and pass (wrong) | 14 (0) | 14 (0) |

On all 181 XX photos (old prompt, saved reads, no new calls) luna as a tie-breaker raised the
saves from 168 to 175 with none wrong, reading 13 photos ($0.0058). The one "wrong" save,
result 215339, is a prod typo: the photo shows 2151600, prod has 2125600. A field-by-field
majority is not safe: on one photo Haiku and luna made the same row-shift misread.

## Design

### Checks for a read

Shared by both mixes, all must hold:

- **Chart:** song title fuzzy-matched to `arcade_track_names` of the mix
  (ingest's normalization and edit distance; tolerance up to 25% of the name's
  length), then the chart instances of those tracks in the mix whose label
  equals the read label (`D19`) and whose **exact** step count (`min_total_steps
  = max_total_steps`) equals perfect + great + good + bad + miss. Exactly one
  chart, or no match. A step range (e.g. Setsuna Trip D23, 1500–1800) is no
  match.
- **Step count fallback:** a Phoenix 2 chart without a step count uses the same
  shared chart's Phoenix count (they agreed on all 84 charts where both were
  known; coverage goes from 262 to 4542 of 5465 Phoenix 2 charts in the dev DB).
- **Combo** ≤ perfect + great, every mix (`addResult` already checks it; no
  Phoenix or Phoenix 2 result in the dev DB breaks it).
- **Phoenix:** `getPhoenixScore(stats)` equals the read score; the read grade
  equals `getPhoenixGrade(score, mixId)`; plate check above.
- **XX:** score is a multiple of 100 and ≥ the lower bound from ingest's
  `comboScoring.ts` (`minScoreForStats`); grade letter in the XX grade list.
- **Rank mode:** `addResult` already rejects VJ on charts that can't use it; a
  rejection there means manual input.
- **Duplicate play:** no result of this player on that shared chart with the
  same counters and max combo.

### Prompt and schema

Start from the tested prompt in "Prompt used in the tests" below. Strict JSON
schema with `song_title` (nullable), `chart_type` (`S` / `D` / `COOP`,
nullable), `level`, the six counters, `score`, `grade`, `grade_broken`,
`mod_badges` (string array) and, for Phoenix, `plate_text` (nullable, new: test
in S5). Send the image as a data URL with `detail: 'high'`.

### API (`packages/api`)

- `src/services/results/photos/reader.ts`: the OpenRouter client, prompt,
  schema, `readPhoto(model, image)` returning the read and its cost. 30 s
  timeout and one retry (one OpenAI call hung for 5 minutes during the tests).
  Tests never call it: the decision code takes reads as input.
- `src/services/results/photos/decide.ts`: pure functions, the core to unit
  test. Given the read(s), the candidate charts and the mix, return either
  `{ status: 'confident', chart, stats, grade, pass, mod, score }` or
  `{ status: 'needsInput', reads, chart?, fields: [...] }`, where `fields`
  lists what to ask (fields where the reads differ, `chart` when there's no
  match, all numbers when the reads agree and still fail).
- `src/services/results/photos/recognize.ts`: the pipeline. Hash check →
  read(s) per the mix rules → candidate charts from the DB → `decide` → if
  confident, same-play check and `addResult` (with the hash) → return
  `saved` with the result id and a short summary, or `needsInput`, or
  `duplicate`. Adds the readers' cost to `players.ocr_cost`.
- `addResult`: takes an optional `photoHash` and stores it; refuses a known
  hash and a same-play duplicate. It already runs `getScoreError` and adds the
  `resultAdded` event in the same transaction.
- tRPC, under `results` (behind `addResultProcedure`):
  - `checkPhotoHashes({ hashes })` → the hashes already stored. Called once
    for the batch, before any upload.
  - `recognizePhoto({ image, screenshot, hash, mix, date, isExactDate })` → as
    above. `image` is the 2048px JPEG for the readers, `screenshot` the stored
    copy made by the existing `compressImageData` (1000px WebP).
  - The manual step submits through the existing `addResultMutation`, plus
    `photoHash`.
- The JSON body limit is 2 MB (`app.ts`); a 2048px JPEG in base64 plus the
  screenshot is ~1–1.5 MB. Raise it to 4 MB; check whether the tRPC adapter has
  its own limit.
- Nothing is kept on the server while a photo waits for input: the client holds
  the images and the reads, and sends the final values.

### Shared code (S1)

The API must not import ingest. Move, with ingest importing them back:

- `findTracks`, `findChartInstances` and the name normalization from
  `packages/ingest/src/ingestion/tracks.ts` to `packages/database/src/tracks.ts`
  (they query the DB). The tolerance used for photos (25% of the name's length)
  is a parameter: ingest keeps `name_edist`.
- `calcPlate` and the plate names from `millionScoring.ts`, and
  `COMBO_GRADES` / `minScoreForStats` from `comboScoring.ts`, to
  `packages/utils/src/grades.ts` (pure Pump It Up rules).
- Ingest's tests must stay at 100% of lines; check whether c8 still counts the
  moved files and move their unit tests if needed.

### Database (S2)

One migration:

- `results.photo_sha256 CHAR(64) NULL` with a unique index (several NULLs are
  allowed).
- `players.ocr_cost DECIMAL(10,6) NOT NULL DEFAULT 0`, set from
  `openai_cost`. The `openai_*` columns stay until S6 (a held-back drop, as
  with `interpolated_difficulty`).
- Regenerate `packages/database/src/database.ts` and re-apply the
  `HAND-PATCHED` block.

### Web (S4)

- New page "Add results" (`/add-results`), linked for players with
  `can_add_results_manually`. Mix select (remembered, as today) and a multi-file
  input.
- For each selected file, in the browser: SHA-256 of the original bytes
  (`crypto.subtle.digest`), EXIF date (`getDateFromFile`, before resizing),
  a 2048px JPEG for the readers, the stored screenshot (`compressImageData`).
- One `checkPhotoHashes` call for the batch; known hashes and repeats within the
  batch are marked "Already added" and never uploaded.
- The queue runs one photo at a time: Reading → Saved (song, chart, score) /
  Already added / Needs input. On "Needs input" it pauses: the photo, what was
  read, and inputs only for the listed fields (chart picker when no chart
  matched). Submit → `addResultMutation` → the queue goes on.
- Built from the design system blocks; works at 375px; copy short and plain;
  strings in `src/constants/translations/`.
- The chart page's manual "Add result" stays for typing a result by hand.

### Cost limits

Agreed 2026-10-17. Every paid read is a `photo_reads` row (player, photo hash, cost). A
read is productive when a result with its hash exists, whether saved automatically or
typed in after a pause. Before reading, `services/results/photos/limits.ts` checks:

| Limit | Window | Player | Admin |
|---|---|---|---|
| Spend on reads with no result | rolling 24 h | $0.03 | $0.30 |
| All spend | rolling 3 days | $0.50 | $5.00 |

Over a limit, the photo is `limited` with the time the oldest spend leaves the window
enough to be under it again; the web says when the player can upload more, and offers
"Enter by hand" (free, still with the photo). The first refusal of a limit within its
window adds a `photoLimitReached` event; the bot's `photoLimits` plugin sends it to the
site admins with a linked Telegram and to the bot's admin chat. OpenRouter's credit limit
on the key is the backstop.

### Single photo

A selection of one photo is read and checked the same way but never saved
automatically (`autoSave: false`): every field is shown, filled from the read, with
"Check this" under the fields in doubt, and the user saves it. Several photos go through
the automatic queue. A new selection waits until the previous one is done, or until
"Cancel the rest" skips the photos left (a photo being read finishes; a result it saved
stays).

Every result needs a photo: the chart page's "Add result" (typing a result with a
screenshot and the crop OCR) is removed.

### Removal (S6)

Remove `ScreenshotRecognition.tsx`, the area selector, `recognizeScoreMutation`,
`services/results/recognizeScore.ts` and `OPENAI_API_KEY` (the `openai` package stays:
the reader talks to OpenRouter with it); drop `players.openai_prompt_tokens`,
`openai_completion_tokens` and `openai_cost`. Must ship before 2026-12-11, or
switch that endpoint's model first.

## Testing

- API unit tests (Mocha + Chai, `npm run test:api`) for `decide.ts` with read
  fixtures: Phoenix pass, Phoenix fail then second read passes, both fail with
  differing fields, both agree and fail; XX agree, XX disagree on max combo,
  grade or mod; chart matching (fuzzy title, label, exact steps, step range,
  Phoenix 2 fallback, two candidate charts); duplicates (known hash, same play);
  the Phoenix grade check with a score between the two mixes' thresholds
  (930,000: AA+ on Phoenix, AA on Phoenix 2) under each mix.
  The reader is stubbed: tests make no paid calls.
- Real-photo checks are manual and small: a handful of photos and two models
  first, more only when the result is unclear and worth the spend. Say the cost
  before running.

### S5 small real-photo check (before release, < $0.05)

- Phoenix: `plate_text` and pass / fail on ~10 photos, including a failed
  stage if one can be found.
- A few Phoenix 2 photos (none were tested: all prod manual photos are Phoenix
  mix 27).
- Phoenix grade reading (AAA+, SS+ ...): if it is often wrong, the grade check
  pauses too many photos; then keep it only for scores under 950,000, where the
  two mixes' grades differ.
- The new prompt on the 2P-side (mirrored) layout.

## Prompt used in the tests

```
This is a photo of a Pump It Up arcade result screen (XX or Phoenix). Read it exactly, digit by digit.
- song_title: the song name on the result panel. On XX it is the small text directly above the PERFECT row; the line above the song name may be the arcade's location name, never use that. On Phoenix it is in the banner near the top. Copy it as shown, including suffixes like "- FULL SONG" or "- SHORT CUT". Never use the artist, the big background text or the badges. null only if there is no song name in the photo.
- chart_type and level: from the round difficulty badge only (SINGLE = S, DOUBLE = D, plus the number in it). Not the stage number and not the player's title such as "EXPERT LV.1".
- perfect, great, good, bad, miss, max_combo: the counters on the same rows as their labels (they have leading zeroes; the number column can be left or right of the labels and sit slightly above or below them)
- score: the total score as an integer, without separators (on Phoenix the big SCORE number, not the smaller "+N" below it)
- grade: the big grade in the middle, e.g. A, S, SS, SSS on XX or AAA+, SS, SSS+ on Phoenix
- grade_broken: true if the big grade is drawn cracked or shattered (a failed stage)
- mod_badges: every small square badge along the side of the result panel, as written (e.g. "AV 620", "BGA DARK", "HJ", "VJ", "RANK")
```

Things it fixed over earlier versions: models returned the arcade location
("Funworld Central Park Mall"), "AV 620 BGA DARK", or the player title
"EXPERT LV.1" as the level. Earlier wording "null if not fully visible" made
models give up on readable titles: keep "null only if there is no song name".

## Open items

- The admin should fix result 301188 (wrong photo attached).
- `arcade_track_names` has gaps (an older "Bad Apple" XX track wasn't matched
  by its on-screen name): those photos go to manual input; fill names as found.
- OpenRouter charges a 5.5% fee on credit purchases (minimum $0.80).
