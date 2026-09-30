/**
 * Shadow validation before the ingestion cutover: sends the same result screens to the
 * legacy Python API and to this service, both on their side-effect free
 * `/results/screen/validate`, and prints where the answers differ.
 *
 *   npx tsx scripts/shadowValidate.ts --legacy http://127.0.0.1:5001 --ingest http://127.0.0.1:3002 \
 *     [--from-db 2000 [--mix XX]] [scan.json ...]
 *
 * The screens come from piu-spy's scan JSONs (the uploads, `<agent>/<date>/<time>.json`),
 * and/or with `--from-db N` are rebuilt from the newest N results (of one mix with
 * `--mix`) and every purgatory row, each also sent with a few deliberate mistakes, so that
 * every validation step gets compared. Both services must use the same database.
 *
 * The `report` lines aren't compared: they print the changed datetimes differently.
 */
import '../src/env';
import { db } from '@pumpking/core/db';
import fs from 'fs';
import minimist from 'minimist';
import { isDeepStrictEqual } from 'util';

type Json = Record<string, unknown>;

interface Screen {
  agentId: number;
  source: string;
  payload: Json;
}

const args = minimist(process.argv.slice(2), { string: ['legacy', 'ingest', 'mix'] });
if (!args.legacy || !args.ingest) {
  console.error(
    'Usage: shadowValidate.ts --legacy <url> --ingest <url> [--from-db N] [scan.json ...]'
  );
  process.exit(1);
}

// piu-spy's conversion of its scan data into a submission (`ConvertedScanDataForBackend`)
const VALUES: Record<string, string> = {
  score: 'score',
  m: 'misses',
  b: 'bads',
  gd: 'goods',
  gr: 'greats',
  p: 'perfects',
  combo: 'max_combo',
  calories: 'calories',
  scoreIncrease: 'score_increase',
};

const convertScanEntry = (scan: Json | undefined, recognitionNotes: string) => {
  if (!scan || !scan.values) {
    return undefined;
  }
  const entry: Json = { player_name: scan.name || 'PUMPITUP', recognition_notes: recognitionNotes };
  for (const [from, to] of [
    ['grade', 'grade'],
    ['isPass', 'is_pass'],
    ['plate', 'plate'],
  ]) {
    if (from in scan) {
      entry[to] = scan[from];
    } else if (`${from}:manual` in scan) {
      entry[to] = scan[`${from}:manual`];
    }
  }
  if (Array.isArray(scan.mods)) {
    entry.mods_list = scan.mods.join(' ');
  }
  for (const [from, to] of Object.entries(VALUES)) {
    if (from in (scan.values as Json)) {
      entry[to] = (scan.values as Json)[from];
    }
  }
  return entry;
};

const convertScan = (scan: Json, screenFile: string): Json => {
  const payload: Json = {
    screen_file: screenFile,
    mix_name: scan.mixName,
    track_name: scan.trackName,
    gained: scan.time,
  };
  for (const sideName of ['left', 'right']) {
    const side = scan[sideName] as Json | undefined;
    if (!side) {
      continue;
    }
    const converted: Json = { chart_label: side.chartLabel };
    for (const [to, from] of [
      ['result', 'result'],
      ['personal_best', 'personalBest'],
      ['machine_best', 'machineBest'],
    ]) {
      const entry = convertScanEntry(side[from] as Json | undefined, to);
      if (entry) {
        converted[to] = entry;
      }
    }
    payload[sideName] = converted;
  }
  return payload;
};

type Agent = { id: number; name: string; token: string };
let agentByName = new Map<string, Agent>();
let agentById = new Map<number, Agent>();

const screensFromScans = (files: string[]): Screen[] =>
  files.flatMap((file) => {
    // <uploads>/<agent>/<date>/<time>.json, whose screen is the .mp4 next to it
    const parts = file.split('/');
    const agent = agentByName.get(parts[parts.length - 3]);
    if (!agent) {
      console.warn(`Skipping ${file}: no agent named ${parts[parts.length - 3]}`);
      return [];
    }
    const screenFile = parts
      .slice(-2)
      .join('/')
      .replace(/\.json$/, '.mp4');
    const scan = JSON.parse(fs.readFileSync(file, 'utf8'));
    return [{ agentId: agent.id, source: file, payload: convertScan(scan, screenFile) }];
  });

const formatNaive = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')} ${date.toTimeString().slice(0, 8)}`;

// Rows of `results` or `purgatory` as the screen that produced them
const rowScreen = (source: string, row: Json): Screen => {
  const agent = agentById.get(row.agent as number)!;
  const result: Json = {};
  for (const field of [
    'player_name',
    'score',
    'recognition_notes',
    'grade',
    'plate',
    'mods_list',
    'misses',
    'bads',
    'goods',
    'greats',
    'perfects',
    'max_combo',
    'calories',
    'score_increase',
  ]) {
    if (row[field] != null) {
      result[field] = row[field];
    }
  }
  if (row.is_pass != null) {
    result.is_pass = Boolean(row.is_pass);
  }
  if (row.rank_mode) {
    result.rank_mode = true;
  }
  return {
    agentId: agent.id,
    source,
    payload: {
      screen_file: String(row.screen_file ?? '').replace(`${agent.name}/`, ''),
      mix_name: row.mix_name,
      track_name: row.track_name,
      // mysql2 reads the naive datetimes as local time
      gained: formatNaive(row.gained as Date),
      left: { chart_label: row.chart_label, result },
    },
  };
};

// The same screen with one mistake each, so every validation step gets compared
const withMistakes = (screen: Screen): Screen[] => {
  const variant = (name: string, change: (result: Json, payload: Json) => void): Screen => {
    const payload = structuredClone(screen.payload);
    change((payload.left as Json).result as Json, payload);
    return { ...screen, source: `${screen.source} (${name})`, payload };
  };
  const bump = (field: string, by: number) => (r: Json) => {
    if (typeof r[field] === 'number') {
      r[field] = (r[field] as number) + by;
    }
  };
  return [
    screen,
    variant('score +3', bump('score', 3)),
    variant('score +100', bump('score', 100)),
    variant('perfects -50', bump('perfects', -50)),
    variant('misses +30', bump('misses', 30)),
    variant('max combo +1', bump('max_combo', 1)),
    variant('grade', (r) => (r.grade = r.grade === 'A' ? 'B' : 'A')),
    variant('plate', (r) => (r.plate = r.plate === 'MG' ? 'SG' : 'MG')),
    variant('no pass', (r) => (r.is_pass = false)),
    variant('pass unknown', (r) => delete r.is_pass),
    variant('no stats', (r) => delete r.goods),
    variant('mods', (r) => (r.mods_list = `${r.mods_list ?? ''} QQ`.trim())),
    variant('no mods', (r) => delete r.mods_list),
    variant('VJ', (r) => (r.mods_list = `VJ ${r.mods_list ?? ''}`.trim())),
    variant('player typo', (r) => (r.player_name = `${String(r.player_name).slice(0, -1)}Q`)),
    variant('player unknown', (r) => (r.player_name = 'ZZZZQQQQ')),
    variant('track typo', (_r, p) => (p.track_name = `${String(p.track_name).slice(0, -2)}xy`)),
    variant('track unknown', (_r, p) => (p.track_name = 'Qwerty Asdfgh Zxcvbn')),
    variant('label', (_r, p) => ((p.left as Json).chart_label = 'S99')),
    variant('ucs', (_r, p) => ((p.left as Json).chart_label = 'SP')),
    variant('score 0', (r) => (r.score = 0)),
    variant('later', (_r, p) => (p.gained = String(p.gained).replace(/:(\d\d)$/, ':59'))),
  ];
};

const screensFromDb = async (count: number, mixName?: string): Promise<Screen[]> => {
  let query = db
    .selectFrom('results')
    .selectAll()
    .where('agent', 'in', [...agentById.keys()])
    .orderBy('id', 'desc')
    .limit(count);
  if (mixName) {
    query = query.where('mix_name', '=', mixName);
  }
  const results = await query.execute();
  const purgatory = await db.selectFrom('purgatory').selectAll().execute();
  return [
    ...results.map((row) => rowScreen(`result #${row.id}`, row as unknown as Json)),
    ...purgatory.map((row) => rowScreen(`purgatory #${row.id}`, row as unknown as Json)),
  ].flatMap(withMistakes);
};

const validate = async (baseUrl: string, screen: Screen) => {
  const agent = agentById.get(screen.agentId)!;
  const response = await fetch(`${baseUrl}/results/screen/validate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'agent-name': agent.name,
      'agent-token': agent.token,
    },
    body: JSON.stringify(screen.payload),
  });
  const body = (await response.json()) as Json;
  // Python's errors are tracebacks: compare their last line
  if (typeof body.error === 'string') {
    body.error = body.error.trim().split('\n').pop();
  }
  delete body.report;
  return body;
};

const main = async () => {
  const agents = await db.selectFrom('agents').select(['id', 'name', 'token']).execute();
  agentByName = new Map(agents.map((agent) => [agent.name, agent]));
  agentById = new Map(agents.map((agent) => [agent.id, agent]));

  const screens = [
    ...(args['from-db'] ? await screensFromDb(Number(args['from-db']), args.mix) : []),
    ...screensFromScans(args._.map(String)),
  ];

  let same = 0;
  const differences: { source: string; legacy: Json; ingest: Json }[] = [];
  for (const screen of screens) {
    const [legacy, ingest] = await Promise.all([
      validate(args.legacy, screen),
      validate(args.ingest, screen),
    ]);
    if (isDeepStrictEqual(legacy, ingest)) {
      same++;
    } else {
      differences.push({ source: screen.source, legacy, ingest });
    }
  }

  for (const difference of differences) {
    console.log(`\n${difference.source}`);
    console.log(`  legacy: ${JSON.stringify(difference.legacy)}`);
    console.log(`  ingest: ${JSON.stringify(difference.ingest)}`);
  }
  console.log(`\n${screens.length} screens: ${same} same, ${differences.length} different`);
  await db.destroy();
};

main();
