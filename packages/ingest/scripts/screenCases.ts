import '../src/env';
import {
  type Catalog,
  CATALOG_FILE,
  listCases,
  readCase,
  readCatalog,
  readStored,
  AGENT_TOKEN,
  RESULT_COLUMNS,
  type ScreenCase,
  prepareCase,
  seedCatalog,
  withoutReport,
  writeCase,
} from '../src/test/screenCases';
import { db } from '@pumpking/database/db';
import { createTestDatabase, deleteTestDatabase } from '@pumpking/database/test/testDatabase';
import { findTracks } from '@pumpking/database/tracks';
import { findMixId, SUPPORTED_MIXES } from '@pumpking/utils/mixes';
import { distance } from 'fastest-levenshtein';
import fs from 'fs';
import http from 'http';
import { sql } from 'kysely';
import minimist from 'minimist';

type Row = Record<string, unknown>;

const args = minimist(process.argv.slice(2), {
  string: ['about', 'result', 'purgatory', 'path', 'before', 'url', 'source', 'ts-port'],
});
const [command, ...files] = args._.map(String);

const SENT_FIELDS = [
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
];

const sentResult = (row: Row) => {
  const result: Row = {};
  for (const field of SENT_FIELDS) {
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
  return result;
};

const datetimes = [
  sql<string>`CAST(gained AS CHAR)`.as('gained'),
  sql<string>`CAST(added AS CHAR)`.as('added'),
];

const resultRows = async (ids: string): Promise<Row[]> => {
  const idList = ids.split(',').map(Number);
  const rows = await db
    .selectFrom('results')
    .selectAll()
    .select(datetimes)
    .where('id', 'in', idList)
    .execute();
  return idList.map((id) => rows.find((row) => row.id === id)!);
};

const sourceRows = async (): Promise<Row[]> => {
  if (args.result) {
    return resultRows(args.result);
  }
  if (args.purgatory) {
    return db
      .selectFrom('purgatory')
      .selectAll()
      .select(datetimes)
      .where('id', '=', Number(args.purgatory))
      .execute();
  }
  throw new Error('Give --result or --purgatory');
};

const GUEST_PLAYER_ID = 1;

const isVisible = (player: { id: number; hidden: number }) =>
  !player.hidden || player.id === GUEST_PLAYER_ID;

const checkNotHidden = async (row: Row) => {
  if (row.recognized_player_id != null) {
    const player = await db
      .selectFrom('players')
      .select(['id', 'hidden'])
      .where('id', '=', row.recognized_player_id as number)
      .executeTakeFirstOrThrow();
    if (!isVisible(player)) {
      throw new Error(`Row #${row.id} is a hidden player's`);
    }
  }
  const mixId = findMixId(String(row.mix_name));
  const names = await db
    .selectFrom('arcade_player_names as apn')
    .innerJoin('players', 'players.id', 'apn.player_id')
    .select(['apn.name', 'players.id', 'players.hidden'])
    .where('apn.mix_id', '=', mixId ?? -1)
    .execute();
  const name = String(row.player_name).toUpperCase();
  const closest = names.sort((a, b) => distance(name, a.name) - distance(name, b.name))[0];
  if (closest && !isVisible(closest)) {
    throw new Error(`Row #${row.id}'s player name is closest to a hidden player's`);
  }
};

const newCase = async () => {
  const [file] = files;
  if (!file || !args.about) {
    throw new Error('Give the case file and --about');
  }
  const rows = await sourceRows();
  for (const row of rows) {
    await checkNotHidden(row);
  }
  const [first] = rows;
  const agent = await db
    .selectFrom('agents')
    .select('name')
    .where('id', '=', first.agent as number)
    .executeTakeFirstOrThrow();
  const request: Row = {
    screen_file: String(first.screen_file ?? '').replace(`${agent.name}/`, ''),
    mix_name: first.mix_name,
    track_name: first.track_name,
    gained: first.gained,
  };
  rows.forEach((row, i) => {
    request[i === 0 ? 'left' : 'right'] = {
      chart_label: row.chart_label,
      result: sentResult(row),
    };
  });
  const screenCase: ScreenCase = {
    about: args.about,
    steps: [{ path: args.path ?? '/results/screen/submit', agent: agent.name, request }],
  };
  if (args.before) {
    const before = await resultRows(args.before);
    for (const row of before) {
      await checkNotHidden(row);
    }
    const columns: string[] = [
      ...RESULT_COLUMNS.filter((column) => column !== 'id' && column !== 'player_id'),
      'added',
    ];
    screenCase.before = {
      results: before.map((row) => ({
        ...Object.fromEntries(
          columns.flatMap((column) => (row[column] == null ? [] : [[column, row[column]]]))
        ),
        token: 'before0000',
      })),
    };
  }
  writeCase(file, screenCase);
  console.log(`Wrote ${file}`);
};

const formatCatalog = (catalog: Catalog) =>
  `{\n${Object.entries(catalog)
    .map(
      ([table, rows]: [string, Row[]]) =>
        `  "${table}": [\n${rows.map((row) => `    ${JSON.stringify(row)}`).join(',\n')}\n  ]`
    )
    .join(',\n')}\n}\n`;

const writeCatalog = async () => {
  const cases = listCases().map(readCase);

  const trackIds = new Set<number>();
  for (const step of cases.flatMap((screenCase) => screenCase.steps)) {
    const mixId = findMixId(String(step.request.mix_name));
    if (mixId != null) {
      const { tracks } = await findTracks(db, mixId, String(step.request.track_name));
      tracks.forEach((track) => trackIds.add(track.track));
    }
  }
  const agentNames = [...new Set(cases.flatMap((c) => c.steps.map((step) => step.agent)))];

  const visiblePlayers = (
    await db
      .selectFrom('players')
      .select(['id', 'nickname', 'hidden', 'discard_results', 'actual_player_id'])
      .orderBy('id')
      .execute()
  )
    .filter(isVisible)
    .map(({ hidden: _hidden, ...player }) => player);
  const visibleIds = new Set(visiblePlayers.map((player) => player.id));
  const playerNames = (
    await db
      .selectFrom('arcade_player_names')
      .select(['mix_id', 'player_id', 'name', 'name_edist'])
      .where('mix_id', 'in', SUPPORTED_MIXES)
      .orderBy('mix_id')
      .orderBy('player_id')
      .orderBy('name')
      .execute()
  ).filter((name) => visibleIds.has(name.player_id));
  const neededIds = new Set(playerNames.map((name) => name.player_id));
  for (const player of visiblePlayers) {
    if (neededIds.has(player.id) && player.actual_player_id != null) {
      neededIds.add(player.actual_player_id);
    }
  }
  const players = visiblePlayers.filter(
    (player) =>
      neededIds.has(player.id) &&
      (player.actual_player_id == null || visibleIds.has(player.actual_player_id))
  );
  const playerIds = new Set(players.map((player) => player.id));

  const trackNames = await db
    .selectFrom('arcade_track_names')
    .select(['mix_id', 'track_id', 'name', 'name_edist'])
    .where('mix_id', 'in', SUPPORTED_MIXES)
    .orderBy('mix_id')
    .orderBy('track_id')
    .orderBy('name')
    .execute();
  const sharedCharts = await db
    .selectFrom('shared_charts')
    .select(['id', 'track', 'index_in_track', 'type'])
    .where('track', 'in', [...trackIds, -1])
    .orderBy('id')
    .execute();

  const catalog: Catalog = {
    agents: await db
      .selectFrom('agents')
      .select(['id', 'name', 'title'])
      .where('name', 'in', [...agentNames, ''])
      .orderBy('id')
      .execute(),
    players,
    arcade_player_names: playerNames.filter((name) => playerIds.has(name.player_id)),
    tracks: await db
      .selectFrom('tracks')
      .select(['id', 'external_id', 'full_name', 'short_name', 'duration'])
      .where('id', 'in', [...new Set(trackNames.map((name) => name.track_id))])
      .orderBy('id')
      .execute(),
    arcade_track_names: trackNames,
    shared_charts: sharedCharts,
    chart_instances: await db
      .selectFrom('chart_instances')
      .select([
        'id',
        'track',
        'shared_chart',
        'mix',
        'label',
        'level',
        'min_total_steps',
        'max_total_steps',
      ])
      .where('shared_chart', 'in', [...sharedCharts.map((chart) => chart.id), -1])
      .where('mix', 'in', SUPPORTED_MIXES)
      .orderBy('id')
      .execute(),
  };
  fs.writeFileSync(CATALOG_FILE, formatCatalog(catalog));
  console.log(
    Object.entries(catalog)
      .map(([table, rows]) => `${table}: ${rows.length}`)
      .join(', ')
  );
};

const startTsStub = (port: number) =>
  new Promise<http.Server>((resolve) => {
    const server = http.createServer((_req, res) => res.end('{}'));
    server.listen(port, '127.0.0.1', () => resolve(server));
  });

const post = async (url: string, step: ScreenCase['steps'][number]) => {
  const response = await fetch(`${url}${step.path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'agent-name': step.agent,
      'agent-token': AGENT_TOKEN,
    },
    body: JSON.stringify(step.request),
  });
  return (await response.json()) as Row;
};

const record = async () => {
  const source = args.source === 'ingest' ? 'ingest' : 'legacy';
  if (!args.url) {
    throw new Error('Give --url of the service to record');
  }
  process.env.NODE_ENV = 'test';
  await createTestDatabase();
  const tsStub = source === 'legacy' ? await startTsStub(Number(args['ts-port'] ?? 3901)) : null;

  const catalog = readCatalog();
  await seedCatalog(catalog);
  for (const file of files.length > 0 ? files : listCases()) {
    const screenCase = readCase(file);
    await prepareCase(catalog, screenCase);
    const answers: Row[] = [];
    for (const step of screenCase.steps) {
      answers.push(withoutReport(await post(args.url, step)));
    }
    const failed = answers.find(
      (answer) => typeof answer.error === 'string' && answer.error.includes('Traceback')
    );
    if (failed) {
      console.log(`${file}: not recorded, ${source} failed: ${failed.error}`);
      continue;
    }
    screenCase.steps.forEach((step, i) => (step.answer = answers[i]));
    writeCase(file, {
      about: screenCase.about,
      answersFrom: source,
      before: screenCase.before,
      steps: screenCase.steps,
      stored: await readStored(catalog),
    });
    console.log(`${file}: ${JSON.stringify(answers)}`);
  }

  tsStub?.close();
  await deleteTestDatabase();
};

const main = async () => {
  if (command === 'new') {
    await newCase();
  } else if (command === 'catalog') {
    await writeCatalog();
  } else if (command === 'record') {
    await record();
  } else {
    throw new Error('Commands: new, catalog, record');
  }
  await db.destroy();
};

main().catch(async (error) => {
  console.error(error);
  await db.destroy();
  process.exit(1);
});
