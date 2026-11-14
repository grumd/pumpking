import type { Tracks } from '@pumpking/database/database';
import { db } from '@pumpking/database/db';
import { MIXES } from '@pumpking/utils/mixes';
import { sql } from 'kysely';
import { getLiveTournamentMarks } from 'services/tournaments/tournament';

export interface ChartsSearchParams {
  currentPlayerId?: number;
  durations?: Array<Tracks['duration']> | undefined;
  minLevel?: number;
  maxLevel?: number;
  labels?: string[] | undefined;
  mixes?: number[];
  songName?: string;
  playersSome?: number[];
  playersNone?: number[];
  playersAll?: number[];
  sortChartsBy?: 'date' | 'difficulty' | 'pp';
  sortChartsDir?: 'asc' | 'desc';
  sortChartsByPlayers?: number[];
  limit?: number;
  offset?: number;
}

export interface ResultViewModel {
  id: number;
  playerId: number | null;
  playerName: string;
  playerNameArcade: string | null;
  score: number;
  scoreIncrease: number | null;
  pp: number | null;
  added: Date;
  gained: Date;
  stats: [number | null, number | null, number | null, number | null, number | null];
  combo: number | null;
  originalScore: number | null;
  grade: string | null;
  plate: string | null;
  passed: boolean | null;
  isExactGainedDate: boolean;
  mods: string | null;
  calories: number | null;
  region: string | null;
  mix: number;
  exp: number | null;
  isHidden: boolean;
  recognitionType: null | 'manual' | 'result' | 'personal_best' | 'machine_best';
  countsForTournament: boolean;
}

export interface ChartViewModel {
  id: number;
  songName: string;
  duration: Tracks['duration'];
  updatedOn: Date;
  results: Array<ResultViewModel>;
  label: string;
  level: number | null;
  difficulty: number | null;
  interpolatedDifficulty: number | null;
  inTournament: boolean;
  otherChartInstances: Array<{
    mix: number;
    label: string;
    level: number | null;
  }>;
}

const DEFAULT_MIXES = [MIXES.XX, MIXES.Phoenix, MIXES.Phoenix2];

const scoreField = 'score_phoenix';

interface Viewer {
  playerId?: number;
  // A player with hidden = 1 sees only their own results, and nobody else ever sees theirs
  isHidden: boolean;
  hiddenPlayerIds: number[];
  hiddenRegions: string[];
}

const getViewer = async (currentPlayerId?: number): Promise<Viewer> => {
  if (!currentPlayerId) {
    return { isHidden: false, hiddenPlayerIds: [], hiddenRegions: [] };
  }
  const player = await db
    .selectFrom('players')
    .select(['preferences', 'hidden'])
    .where('id', '=', currentPlayerId)
    .executeTakeFirstOrThrow();

  return {
    playerId: currentPlayerId,
    isHidden: player.hidden === 1,
    hiddenRegions: Object.entries(player.preferences?.hiddenRegions ?? {})
      .filter(([, enabled]) => enabled)
      .map(([region]) => region),
    hiddenPlayerIds: Object.entries(player.preferences?.playersHiddenStatus ?? {})
      .filter(([, hidden]) => hidden)
      .map(([id]) => Number(id)),
  };
};

// The instance of each chart in the latest of the mixes, with its track
const selectLatestInstances = (mixes: number[], sharedChartId?: number) =>
  db
    .with('latest_mix', (_db) => {
      let subQuery = _db
        .selectFrom('chart_instances')
        .select(({ fn }) => ['shared_chart', fn.max('mix').as('mix')])
        .where('mix', 'in', mixes)
        .groupBy('shared_chart');
      if (sharedChartId) {
        subQuery = subQuery.where('shared_chart', '=', sharedChartId);
      }
      return subQuery;
    })
    .selectFrom('latest_mix')
    .innerJoin('chart_instances as latest_ci', (join) =>
      join
        .onRef('latest_ci.shared_chart', '=', 'latest_mix.shared_chart')
        .onRef('latest_ci.mix', '=', 'latest_mix.mix')
    )
    .innerJoin('shared_charts as sc', 'sc.id', 'latest_mix.shared_chart')
    .innerJoin('tracks', 'tracks.id', 'sc.track');

interface ChartRow {
  shared_chart_id: number;
  full_name: string;
  duration: Tracks['duration'];
  difficulty: number | null;
  latest_chart_label: string;
  latest_chart_level: number | null;
  latest_chart_mix: number;
  chart_update_date: Date | null;
}

// Each player's best result on the charts, highest first
const selectBestResults = (viewer: Viewer, mixes: number[], chartIds: number[]) => {
  let ranked = db
    .selectFrom('results as r')
    .innerJoin('chart_instances as ci', (join) =>
      join.onRef('ci.shared_chart', '=', 'r.shared_chart').onRef('ci.mix', '=', 'r.mix')
    )
    .innerJoin('players', 'r.player_id', 'players.id')
    .leftJoin('arcade_player_names', (join) =>
      join
        .onRef('players.id', '=', 'arcade_player_names.player_id')
        .onRef('arcade_player_names.mix_id', '=', 'r.mix')
    )
    .select([
      'r.id as result_id',
      'r.shared_chart',
      'r.pp',
      'r.gained',
      'r.exact_gain_date',
      'r.added',
      'r.player_id',
      'r.mix',
      'r.perfects',
      'r.greats',
      'r.goods',
      'r.bads',
      'r.misses',
      'r.max_combo',
      'r.grade',
      'r.plate',
      'r.is_pass',
      'r.mods_list',
      'r.calories',
      'r.recognition_notes',
      'r.exp',
      'ci.label as result_chart_label',
      'ci.level as result_chart_level',
      'players.nickname',
      'players.region',
      'arcade_player_names.name as arcade_nickname',
      `${scoreField} as score`,
      'r.score as original_score',
      sql<number>`${sql.ref(scoreField)} - lead(${sql.ref(
        scoreField
      )}, 1) over (partition by r.shared_chart, r.player_id order by ${sql.ref(
        scoreField
      )} desc, r.added asc, r.id asc)`.as('score_increase_real'),
      sql<number>`row_number() over (partition by r.shared_chart, r.player_id order by ${sql.ref(
        scoreField
      )} desc, r.added asc, r.id asc)`.as('score_rank'),
    ])
    .where('r.shared_chart', 'in', chartIds)
    .where(scoreField, 'is not', null)
    .where('r.mix', 'in', mixes);

  if (!viewer.isHidden) {
    ranked = ranked.where('players.hidden', '=', 0);
  }
  if (viewer.isHidden && viewer.playerId) {
    ranked = ranked.where('r.player_id', '=', viewer.playerId);
  }

  return db
    .selectFrom(ranked.as('ranked_results'))
    .selectAll()
    .where('score_rank', '=', 1)
    .orderBy('score', 'desc')
    .orderBy('added', 'asc')
    .orderBy('result_id', 'asc')
    .execute();
};

const isHiddenByViewer = (viewer: Viewer, playerId: number | null, region: string | null) =>
  !!(playerId && viewer.hiddenPlayerIds.includes(playerId)) ||
  !!(region && viewer.hiddenRegions.includes(region));

// The charts in the given order, with their results; a chart without results is left out
const loadCharts = async (
  viewer: Viewer,
  mixes: number[],
  charts: ChartRow[]
): Promise<ChartViewModel[]> => {
  if (!charts.length) {
    return [];
  }
  const results = await selectBestResults(
    viewer,
    mixes,
    charts.map((chart) => chart.shared_chart_id)
  );
  const { poolChartIds, countingResultIds } = await getLiveTournamentMarks(
    results.map((r) => r.result_id)
  );

  const byId = new Map(
    charts.map((c): [number, ChartViewModel & { latestMix: number }] => [
      c.shared_chart_id,
      {
        id: c.shared_chart_id,
        duration: c.duration,
        songName: c.full_name,
        updatedOn: c.chart_update_date ?? new Date(0),
        label: c.latest_chart_label,
        level: c.latest_chart_level,
        difficulty: c.difficulty || c.latest_chart_level,
        interpolatedDifficulty: c.difficulty,
        inTournament: poolChartIds.has(c.shared_chart_id),
        otherChartInstances: [],
        results: [],
        latestMix: c.latest_chart_mix,
      },
    ])
  );

  for (const r of results) {
    const chart = byId.get(r.shared_chart);
    if (!chart || r.score === null) {
      continue;
    }

    if (r.mix !== chart.latestMix && !chart.otherChartInstances.some((ci) => ci.mix === r.mix)) {
      chart.otherChartInstances.push({
        mix: r.mix,
        label: r.result_chart_label,
        level: r.result_chart_level,
      });
    }

    chart.results.push({
      id: r.result_id,
      playerId: r.player_id,
      playerName: r.nickname,
      playerNameArcade: r.arcade_nickname,
      score: r.score,
      originalScore: r.original_score,
      scoreIncrease: r.score_increase_real,
      pp: r.pp,
      added: r.added,
      gained: r.gained,
      stats: [r.perfects, r.greats, r.goods, r.bads, r.misses],
      combo: r.max_combo,
      grade: r.grade,
      plate: r.plate,
      passed: r.is_pass == null ? null : r.is_pass === 1,
      isExactGainedDate: r.exact_gain_date === 1,
      mods: r.mods_list,
      calories: r.calories,
      region: r.region,
      mix: r.mix,
      exp: r.exp ? Number(r.exp) : null,
      isHidden: isHiddenByViewer(viewer, r.player_id, r.region),
      recognitionType:
        r.recognition_notes === 'manual'
          ? 'manual'
          : r.recognition_notes === 'personal_best'
          ? 'personal_best'
          : r.recognition_notes === 'machine_best'
          ? 'machine_best'
          : r.recognition_notes === 'result'
          ? 'result'
          : null,
      countsForTournament: countingResultIds.has(r.result_id),
    });
  }

  return [...byId.values()]
    .filter((chart) => chart.results.length > 0)
    .map(({ latestMix: _, ...chart }) => chart);
};

export const searchCharts = async (params: ChartsSearchParams) => {
  const {
    currentPlayerId,
    mixes = DEFAULT_MIXES,
    durations,
    labels,
    minLevel,
    maxLevel,
    songName,
    limit = 10,
    offset = 0,
    sortChartsBy = 'date',
    sortChartsDir = 'desc',
    sortChartsByPlayers,
    playersSome,
    playersNone,
    playersAll,
  } = params;

  if (!mixes.length) {
    return [];
  }

  const songNameParts = songName?.split(' ').filter((part) => part.length > 0);

  const viewer = await getViewer(currentPlayerId);

  const bestResult = (column: 'added' | 'pp', index: string) => {
    let subQuery = db
      .selectFrom('results as r')
      .innerJoin('players', 'players.id', 'r.player_id')
      // Without the hints MySQL reads other indexes of results, and runs several times slower
      .modifyFront(sql.raw(`/*+ INDEX(r ${index}) */`))
      .select(column === 'added' ? 'r.added' : 'r.pp')
      .where('r.shared_chart', '=', sql.ref('latest_mix.shared_chart'))
      .where('r.mix', 'in', mixes)
      .where(`r.${scoreField}`, 'is not', null)
      .where(({ not, exists }) =>
        not(
          exists(
            db
              .selectFrom('results as b')
              .modifyFront(
                sql.raw('/*+ INDEX(b index_results_player_id_shared_chart_score_phoenix) */')
              )
              .select('b.id')
              .where('b.player_id', '=', sql.ref('r.player_id'))
              .where('b.shared_chart', '=', sql.ref('r.shared_chart'))
              .where('b.mix', 'in', mixes)
              .where(`b.${scoreField}`, '>=', sql.ref(`r.${scoreField}`))
              .where(({ or, cmpr }) =>
                or([
                  cmpr(`b.${scoreField}`, '>', sql.ref(`r.${scoreField}`)),
                  cmpr('b.added', '<', sql.ref('r.added')),
                ])
              )
          )
        )
      );

    if (!viewer.isHidden) {
      subQuery = subQuery.where('players.hidden', '=', 0);
    }
    if (viewer.isHidden && viewer.playerId) {
      subQuery = subQuery.where('r.player_id', '=', viewer.playerId);
    }
    if (viewer.hiddenPlayerIds.length > 0) {
      subQuery = subQuery.where('r.player_id', 'not in', viewer.hiddenPlayerIds);
    }
    if (viewer.hiddenRegions.length > 0) {
      subQuery = subQuery.where(({ or, cmpr }) =>
        or([
          cmpr('players.region', 'is', null),
          cmpr('players.region', 'not in', viewer.hiddenRegions),
        ])
      );
    }
    if (sortChartsByPlayers && sortChartsByPlayers.length > 0) {
      subQuery = subQuery.where('r.player_id', 'in', sortChartsByPlayers);
    }

    // By shared_chart too, so MySQL reads the index backwards instead of sorting
    return subQuery.orderBy('r.shared_chart', 'desc').orderBy(`r.${column}`, 'desc').limit(1);
  };

  let query = selectLatestInstances(mixes)
    .innerJoinLateral(
      () => bestResult('added', 'results_shared_chart_added').as('latest_best'),
      (join) => join.onTrue()
    )
    .$if(sortChartsBy === 'pp', (qb) =>
      qb.innerJoinLateral(
        () => bestResult('pp', 'results_shared_chart_pp').as('top_pp'),
        (join) => join.onTrue()
      )
    )
    .select(({ fn }) => [
      'latest_mix.shared_chart as shared_chart_id',
      'tracks.full_name',
      'tracks.duration',
      'latest_best.added as chart_update_date',
      sortChartsBy === 'difficulty'
        ? fn.coalesce('sc.interpolated_difficulty', 'latest_ci.level').as('difficulty')
        : 'sc.interpolated_difficulty as difficulty',
      sortChartsBy === 'pp'
        ? sql<number | null>`top_pp.pp`.as('best_pp')
        : sql<number | null>`null`.as('best_pp'),
      'latest_ci.label as latest_chart_label',
      'latest_ci.level as latest_chart_level',
      'latest_ci.mix as latest_chart_mix',
    ]);

  if (songNameParts) {
    const escapedParts = songNameParts.map((part) => part.replace(/[\\%_]/g, '\\$&'));
    query = query.where(
      ({ ref, fn, val }) =>
        fn('concat', [
          fn('lower', [ref('tracks.full_name')]),
          val(' '),
          fn('lower', [ref('latest_ci.label')]),
        ]),
      'like',
      `%${escapedParts.join('%')}%`
    );
  }

  if (durations && durations.length) {
    query = query.where(({ or, cmpr }) =>
      or(durations.map((duration) => cmpr('tracks.duration', '=', duration)))
    );
  }

  if (minLevel || maxLevel) {
    query = query.where(({ or, and, cmpr }) =>
      or([
        cmpr('latest_ci.label', 'like', `COOP%`),
        and([
          cmpr('latest_ci.level', '>=', minLevel ?? 0),
          cmpr('latest_ci.level', '<=', maxLevel ?? 30),
        ]),
      ])
    );
  }

  if (labels && labels.length) {
    query = query.where(({ or, cmpr }) =>
      or(labels.map((label) => cmpr('latest_ci.label', 'like', `${label}%`)))
    );
  }

  if (playersSome && playersSome.length > 0) {
    query = query.where(({ exists }) =>
      exists((eb) =>
        eb
          .selectFrom('results as _r')
          .select('_r.id')
          .where('_r.shared_chart', '=', sql.ref('latest_mix.shared_chart'))
          .where('_r.player_id', 'in', playersSome)
          .where(`_r.${scoreField}`, 'is not', null)
          .where('_r.mix', 'in', mixes)
      )
    );
  }
  if (playersNone && playersNone.length > 0) {
    query = query.where(({ not, exists }) =>
      not(
        exists((eb) =>
          eb
            .selectFrom('results as _r')
            .select('_r.id')
            .where('_r.shared_chart', '=', sql.ref('latest_mix.shared_chart'))
            .where('_r.player_id', 'in', playersNone)
            .where(`_r.${scoreField}`, 'is not', null)
            .where('_r.mix', 'in', mixes)
        )
      )
    );
  }
  if (playersAll && playersAll.length > 0) {
    for (const playerId of playersAll) {
      query = query.where(({ exists }) =>
        exists((eb) =>
          eb
            .selectFrom('results as _r')
            .select('_r.id')
            .where('_r.shared_chart', '=', sql.ref('latest_mix.shared_chart'))
            .where('_r.player_id', '=', playerId)
            .where(`_r.${scoreField}`, 'is not', null)
            .where('_r.mix', 'in', mixes)
        )
      );
    }
  }

  const charts = await query
    .orderBy(
      sortChartsBy === 'pp'
        ? 'best_pp'
        : sortChartsBy === 'difficulty'
        ? 'difficulty'
        : 'chart_update_date',
      sortChartsDir
    )
    .orderBy('shared_chart_id', sortChartsDir)
    .offset(offset)
    .limit(limit)
    .execute();

  return loadCharts(viewer, mixes, charts);
};

/**
 * One chart with every result the viewer may see. Unlike the search, players the viewer hides
 * by id or region don't decide whether the chart is shown: their results come back marked
 * isHidden, so the page can show them. Players with hidden = 1 stay out, as everywhere.
 */
export const getChart = async ({
  sharedChartId,
  currentPlayerId,
}: {
  sharedChartId: number;
  currentPlayerId?: number;
}): Promise<ChartViewModel | null> => {
  const viewer = await getViewer(currentPlayerId);

  const chart = await selectLatestInstances(DEFAULT_MIXES, sharedChartId)
    .select([
      'latest_mix.shared_chart as shared_chart_id',
      'tracks.full_name',
      'tracks.duration',
      'sc.interpolated_difficulty as difficulty',
      'latest_ci.label as latest_chart_label',
      'latest_ci.level as latest_chart_level',
      'latest_ci.mix as latest_chart_mix',
    ])
    .executeTakeFirst();
  if (!chart) {
    return null;
  }

  const [loaded] = await loadCharts(viewer, DEFAULT_MIXES, [{ ...chart, chart_update_date: null }]);
  if (!loaded) {
    return null;
  }

  // As in the search: the latest best result, from the players the viewer doesn't hide when any
  const shown = loaded.results.filter((result) => !result.isHidden);
  const latest = (shown.length ? shown : loaded.results).reduce((a, b) =>
    b.added > a.added ? b : a
  );
  return { ...loaded, updatedOn: latest.added };
};
