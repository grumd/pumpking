# Real result screens

Each JSON file here, other than `catalog.json`, is a case of `screens.test.ts`: the screens
piu-spy sent, as ingestion receives them, with the answers and the stored rows they should
give. The test sends them to this service and compares.

## Where they come from

- The screens are real: rows of the dev DB (a copy of prod), rebuilt into the screen
  piu-spy sent for them. `results` rows for screens that were stored, `purgatory` rows for
  the ones that weren't. The `about` of a case names its rows.
- `mistakes/` take a real screen and change one thing, so that every validation step has
  a case. `same-play/`, `manual/` and `validate/` send real screens in a sequence, or to the
  other routes.
- No results of hidden players, also not as a misrecognized name. The one exception is the
  guest account (`???`, `PUMPITUP` on the arcade), which is hidden but isn't a person.
- The answers and stored rows were recorded from the legacy Python API, running on the
  same catalog. `"answersFrom": "ingest"` marks the cases where the legacy API failed, or
  where this service differs on purpose; the `about` says which.
- `catalog.json` holds the tables ingestion reads, from the dev DB: all arcade track
  names of XX, Phoenix and Phoenix 2, the charts of the cases' tracks, the visible
  players with their arcade names, and the cases' agents (with a made-up token).

## A case

```jsonc
{
  "about": "What the case shows, and its rows in the dev DB",
  "answersFrom": "legacy", // or "ingest"
  // Optional: rows before the first step (results; charts' number of steps)
  "before": {
    "results": [],
    "charts": [{ "id": 1, "min_total_steps": null, "max_total_steps": null }]
  },
  "steps": [
    {
      "path": "/results/screen/submit", // or manual/submit, screen/validate, manual/validate
      "agent": "kyiv_garage",
      "request": {}, // the screen, as piu-spy sends it
      "answer": {} // without the report lines, which print datetimes differently in Python
    }
  ],
  // After the last step: every results and purgatory row, and the charts whose number of
  // steps isn't the catalog's
  "stored": { "results": [], "purgatory": [], "charts": [] }
}
```

## Adding a case

All with `scripts/screenCases.ts` (its header has the details):

1. Write the case from rows of the dev DB:
   `npx tsx scripts/screenCases.ts new stored/xx-something.json --result 123 --about "..."`.
   Edit its request for a mistake, or add steps.
2. If it's on a track that no case had, rewrite the catalog:
   `npx tsx scripts/screenCases.ts catalog`.
3. Record it. Start the legacy Python API on the test database (`PIUTOP_DB_DATABASE` =
   `DB_DATABASE_TEST`, `PIUTOP_TS_HOST=http://127.0.0.1:3901`), then
   `npx tsx scripts/screenCases.ts record --url http://127.0.0.1:5000 stored/xx-something.json`.
   After the cutover, record from this service instead (`--source ingest`, with
   `NODE_ENV=test npm run start:tsx`), and read the recorded answer before you keep it.
4. Check that the answer is what the case is about, and run `npm run test:ingest`.
