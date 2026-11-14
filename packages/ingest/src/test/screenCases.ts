import { clearTables } from './seed';
import type { DB } from '@pumpking/database/database';
import { db } from '@pumpking/database/db';
import fs from 'fs';
import { type Insertable, type Kysely, sql } from 'kysely';
import path from 'path';

export const SCREENS_DIR = path.join(__dirname, 'screens');

export const AGENT_TOKEN = 'screen-cases-token';

type Row = Record<string, unknown>;

export interface ChartSteps {
  id: number;
  min_total_steps: number | null;
  max_total_steps: number | null;
}

export interface Stored {
  results: Row[];
  purgatory: Row[];
  charts: ChartSteps[];
}

export interface Step {
  path: string;
  agent: string;
  request: Row;
  answer?: Row;
}

export interface ScreenCase {
  about: string;
  answersFrom?: 'legacy' | 'ingest';
  before?: { results?: Row[]; charts?: ChartSteps[] };
  steps: Step[];
  stored?: Stored;
}

export interface Catalog {
  agents: { id: number; name: string; title: string }[];
  players: Insertable<DB['players']>[];
  arcade_player_names: Insertable<DB['arcade_player_names']>[];
  tracks: Insertable<DB['tracks']>[];
  arcade_track_names: Insertable<DB['arcade_track_names']>[];
  shared_charts: Insertable<DB['shared_charts']>[];
  chart_instances: (Insertable<DB['chart_instances']> & ChartSteps)[];
}

export const CATALOG_FILE = path.join(SCREENS_DIR, 'catalog.json');

export const readCatalog = (): Catalog => JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));

export const listCases = (): string[] =>
  fs
    .readdirSync(SCREENS_DIR, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.json') && file !== 'catalog.json')
    .sort();

export const readCase = (file: string): ScreenCase =>
  JSON.parse(fs.readFileSync(path.join(SCREENS_DIR, file), 'utf8'));

export const writeCase = (file: string, screenCase: ScreenCase) => {
  const fullPath = path.join(SCREENS_DIR, file);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(screenCase, null, 2)}\n`);
};

export const RESULT_COLUMNS = [
  'id',
  'screen_file',
  'recognition_notes',
  'agent',
  'track_name',
  'mix_name',
  'chart_label',
  'player_name',
  'gained',
  'exact_gain_date',
  'rank_mode',
  'mods_list',
  'score',
  'score_increase',
  'misses',
  'bads',
  'goods',
  'greats',
  'perfects',
  'max_combo',
  'calories',
  'grade',
  'is_pass',
  'plate',
  'recognized_player_id',
  'player_id',
  'mix',
  'chart_instance',
  'shared_chart',
  'score_phoenix',
  'is_new_best_score',
] as const;

const PURGATORY_COLUMNS = [
  'id',
  'reason',
  'screen_file',
  'recognition_notes',
  'agent',
  'track_name',
  'mix_name',
  'chart_label',
  'player_name',
  'gained',
  'exact_gain_date',
  'rank_mode',
  'mods_list',
  'score',
  'score_increase',
  'misses',
  'bads',
  'goods',
  'greats',
  'perfects',
  'grade',
  'is_pass',
  'plate',
  'max_combo',
  'calories',
] as const;

const storedRows = async (database: Kysely<DB>, table: 'results' | 'purgatory') => {
  const columns = table === 'results' ? RESULT_COLUMNS : PURGATORY_COLUMNS;
  const rows = await database
    .selectFrom(table)
    .select(columns.filter((column) => column !== 'gained'))
    .select(sql<string>`CAST(gained AS CHAR)`.as('gained'))
    .orderBy('id')
    .execute();
  return rows.map((row) =>
    Object.fromEntries(
      columns.flatMap((column) => {
        const value = (row as Row)[column];
        return value === null ? [] : [[column, value]];
      })
    )
  );
};

const changedCharts = async (catalog: Catalog, database: Kysely<DB>) => {
  const catalogCharts = new Map(catalog.chart_instances.map((chart) => [chart.id, chart]));
  const charts = await database
    .selectFrom('chart_instances')
    .select(['id', 'min_total_steps', 'max_total_steps'])
    .orderBy('id')
    .execute();
  return charts.filter((chart) => {
    const before = catalogCharts.get(chart.id)!;
    return (
      before.min_total_steps !== chart.min_total_steps ||
      before.max_total_steps !== chart.max_total_steps
    );
  });
};

export const readStored = async (catalog: Catalog, database = db): Promise<Stored> => ({
  results: await storedRows(database, 'results'),
  purgatory: await storedRows(database, 'purgatory'),
  charts: await changedCharts(catalog, database),
});

const insertRows = async (database: Kysely<DB>, table: keyof DB, rows: object[]) => {
  for (let i = 0; i < rows.length; i += 1000) {
    await database
      .insertInto(table)
      .values(rows.slice(i, i + 1000) as never)
      .execute();
  }
};

export const seedCatalog = async (catalog: Catalog, database = db) => {
  await clearTables(database);
  await insertRows(
    database,
    'agents',
    catalog.agents.map((agent) => ({ ...agent, token: AGENT_TOKEN }))
  );
  const players = [...catalog.players].sort(
    (a, b) => Number(a.actual_player_id != null) - Number(b.actual_player_id != null)
  );
  await insertRows(database, 'players', players);
  for (const table of [
    'arcade_player_names',
    'tracks',
    'arcade_track_names',
    'shared_charts',
    'chart_instances',
  ] as const) {
    await insertRows(database, table, catalog[table]);
  }
};

export const prepareCase = async (catalog: Catalog, screenCase: ScreenCase, database = db) => {
  await database.deleteFrom('results').execute();
  await database.deleteFrom('purgatory').execute();
  await sql`truncate table events`.execute(database);
  await sql`ALTER TABLE results AUTO_INCREMENT = 1`.execute(database);
  await sql`ALTER TABLE purgatory AUTO_INCREMENT = 1`.execute(database);

  const catalogCharts = new Map(catalog.chart_instances.map((chart) => [chart.id, chart]));
  for (const { id } of await changedCharts(catalog, database)) {
    const { min_total_steps, max_total_steps } = catalogCharts.get(id)!;
    await database
      .updateTable('chart_instances')
      .set({ min_total_steps, max_total_steps })
      .where('id', '=', id)
      .execute();
  }

  for (const { id, ...steps } of screenCase.before?.charts ?? []) {
    await database.updateTable('chart_instances').set(steps).where('id', '=', id).execute();
  }
  if (screenCase.before?.results?.length) {
    await insertRows(database, 'results', screenCase.before.results);
  }
};

export const withoutReport = ({ report: _report, ...answer }: Row) => answer;
