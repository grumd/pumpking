import { db } from 'db';
import { sql } from 'kysely';
import type { Tracks } from 'types/database';

// import { replaceSqlParams } from 'utils/sql';

export interface ChartsSearchParams {
  /** Used to filter hidden players/regions from preferences */
  currentPlayerId?: number; // TODO: make required later
  /** */
  scoring?: 'xx' | 'phoenix';
  /** */
  durations?: Array<Tracks['duration']> | undefined;
  /** */
  minLevel?: number;
  /** */
  maxLevel?: number;
  /** Example: ['S', 'D', 'COOP'], etc */
  labels?: string[] | undefined;
  /** Id of mixes to include in leaderboards, by default [26, 27] */
  mixes?: number[];
  /** Song name search, can be any text, @example 'matador d22', 'l i a d z' */
  songName?: string;
  /* Only charts that have ANY of these players */
  playersSome?: number[];
  /* Only charts that have NONE of these players */
  playersNone?: number[];
  /* Only charts that have ALL of these players */
  playersAll?: number[];
  /**
   * Sort by:
   * - 'date' - last played date (can be used with sortChartsByPlayers)
   * - 'difficulty' - chart interpolated difficulty
   * - 'pp' - highest pp on the chart (can be used with sortChartsByPlayers)
   */
  sortChartsBy?: 'date' | 'difficulty' | 'pp';
  /** */
  sortChartsDir?: 'asc' | 'desc';
  /* When using sorting by 'pp' or 'date', you can specify which players' pp and last played date to use for sorting */
  sortChartsByPlayers?: number[];
  /** Pagination, use limit + offset together */
  limit?: number;
  offset?: number;
  /** Shared chart ID for single-chart requests */
  sharedChartId?: number;
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
  otherChartInstances: Array<{
    mix: number;
    label: string;
    level: number | null;
  }>;
}

export const searchCharts = async (params: ChartsSearchParams) => {
  const {
    currentPlayerId,
    scoring = 'xx',
    mixes = [26, 27],
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
    sharedChartId,
  } = params;
  // console.log({ params });

  if (!mixes.length) {
    return [];
  }

  const scoreField = scoring === 'xx' ? 'score_xx' : 'score_phoenix';

  const songNameParts = songName?.split(' ').filter((part) => part.length > 0);

  const currentPlayer = currentPlayerId
    ? await db
        .selectFrom('players')
        .select(['preferences', 'hidden'])
        .where('id', '=', currentPlayerId)
        .executeTakeFirstOrThrow()
    : null;
  const preferences = currentPlayer?.preferences;
  const isCurrentPlayerHidden = currentPlayer?.hidden === 1;

  const hiddenRegions =
    preferences?.hiddenRegions &&
    Object.entries(preferences.hiddenRegions)
      .filter(([, enabled]) => enabled)
      .map(([region]) => region);

  const hiddenPlayerIds =
    preferences?.playersHiddenStatus &&
    Object.entries(preferences.playersHiddenStatus)
      .filter(([, hidden]) => hidden)
      .map(([id]) => Number(id));

  const query = db
    .with('filtered_charts', (_db) => {
      let subQuery = _db
        .selectFrom('results as r')
        .innerJoin(
          (eb) =>
            eb
              .selectFrom('results')
              .select(({ fn }) => [
                'player_id',
                'shared_chart',
                fn.max(scoreField).as('best_score'),
              ])
              .groupBy(['shared_chart', 'player_id'])
              .where(scoreField, 'is not', null)
              .where('mix', 'in', mixes) // filter by mix - only get top scores of players for these mixes
              .as('max_score_results'),
          (join) =>
            join
              .onRef('max_score_results.player_id', '=', 'r.player_id')
              .onRef('max_score_results.shared_chart', '=', 'r.shared_chart')
              .onRef('max_score_results.best_score', '=', `r.${scoreField}`)
        )
        .innerJoin('shared_charts as sc', 'sc.id', 'r.shared_chart')
        .innerJoin('tracks', 'tracks.id', 'sc.track')
        .innerJoin('chart_instances as latest_ci', (join) =>
          join.on('latest_ci.id', '=', (eb) =>
            eb
              .selectFrom('chart_instances')
              .select('id')
              .where('shared_chart', '=', sql.ref('r.shared_chart'))
              .where('mix', 'in', mixes)
              .orderBy('mix', 'desc')
              .limit(1)
          )
        )
        .innerJoin('players', 'r.player_id', 'players.id')
        .select(({ fn }) => [
          'r.shared_chart as shared_chart_id',
          fn.max('r.added').as('chart_update_date'),
          sortChartsBy === 'difficulty'
            ? fn
                .coalesce(fn.max('latest_ci.interpolated_difficulty'), fn.max('latest_ci.level'))
                .as('difficulty')
            : fn.max('latest_ci.interpolated_difficulty').as('difficulty'),
          fn.max('r.pp').as('best_pp'),
          fn.max('latest_ci.label').as('latest_chart_label'),
          fn.max('latest_ci.level').as('latest_chart_level'),
          fn.max('latest_ci.mix').as('latest_chart_mix'),
        ])
        .where(scoreField, 'is not', null);

      /**
       * Below are filters that filter CHARTS, not results
       */

      if (!isCurrentPlayerHidden) {
        subQuery = subQuery.where('players.hidden', '=', 0);
      }
      if (isCurrentPlayerHidden && currentPlayerId) {
        subQuery = subQuery.where('r.player_id', '=', currentPlayerId);
      }

      if (sharedChartId) {
        subQuery = subQuery.where('r.shared_chart', '=', sharedChartId);
      }

      if (hiddenPlayerIds && hiddenPlayerIds.length > 0) {
        // We filter hidden players here so that charts that were recently played by them are not at the top
        subQuery = subQuery.where('r.player_id', 'not in', hiddenPlayerIds);
      }
      if (hiddenRegions && hiddenRegions.length > 0) {
        subQuery = subQuery.where('players.region', 'not in', hiddenRegions);
      }

      if (songNameParts) {
        subQuery = subQuery.where(
          ({ ref, fn, val }) =>
            fn('concat', [
              fn('lower', [ref('tracks.full_name')]),
              val(`' '`),
              fn('lower', [ref('latest_ci.label')]),
            ]),
          'like',
          `%${songNameParts.join('%')}%`
        );
      }

      if (durations && durations.length) {
        subQuery = subQuery.where(({ or, cmpr }) =>
          or(durations.map((duration) => cmpr('tracks.duration', '=', duration)))
        );
      }

      if (minLevel || maxLevel) {
        subQuery = subQuery.where(({ or, and, cmpr }) =>
          or([
            cmpr('latest_ci.label', 'like', `COOP%`), // coop do not have levels for now
            and([
              cmpr('latest_ci.level', '>=', minLevel ?? 0),
              cmpr('latest_ci.level', '<=', maxLevel ?? 30),
            ]),
          ])
        );
      }

      if (labels && labels.length) {
        subQuery = subQuery.where(({ or, cmpr }) =>
          or(labels.map((label) => cmpr('latest_ci.label', 'like', `${label}%`)))
        );
      }

      if (sortChartsByPlayers && sortChartsByPlayers.length > 0) {
        subQuery = subQuery.where('r.player_id', 'in', sortChartsByPlayers);
      }

      if (playersSome && playersSome.length > 0) {
        subQuery = subQuery.where(({ exists }) =>
          exists((eb) =>
            eb
              .selectFrom('results as _r')
              .select('_r.id')
              .where('_r.shared_chart', '=', sql.ref('r.shared_chart'))
              .where('_r.player_id', 'in', playersSome)
              .where(scoreField, 'is not', null)
              .where('mix', 'in', mixes)
          )
        );
      }
      if (playersNone && playersNone.length > 0) {
        subQuery = subQuery.where(({ not, exists }) =>
          not(
            exists((eb) =>
              eb
                .selectFrom('results as _r')
                .select('_r.id')
                .where('_r.shared_chart', '=', sql.ref('r.shared_chart'))
                .where('_r.player_id', 'in', playersNone)
                .where(scoreField, 'is not', null)
                .where('mix', 'in', mixes)
            )
          )
        );
      }
      if (playersAll && playersAll.length > 0) {
        for (const playerId of playersAll) {
          subQuery = subQuery.where(({ exists }) =>
            exists((eb) =>
              eb
                .selectFrom('results as _r')
                .select('_r.id')
                .where('_r.shared_chart', '=', sql.ref('r.shared_chart'))
                .where('_r.player_id', '=', playerId)
                .where(scoreField, 'is not', null)
                .where('mix', 'in', mixes)
            )
          );
        }
      }

      return subQuery
        .groupBy('shared_chart_id')
        .orderBy(
          sortChartsBy === 'pp'
            ? 'best_pp'
            : sortChartsBy === 'difficulty'
            ? 'difficulty'
            : 'chart_update_date',
          sortChartsDir
        )
        .offset(offset)
        .limit(limit);
    })
    .with('ranked_results', (_db) => {
      let subQuery = _db
        .selectFrom('results as r')
        .innerJoin('filtered_charts', 'filtered_charts.shared_chart_id', 'r.shared_chart')
        .innerJoin('shared_charts as sc', 'sc.id', 'r.shared_chart')
        .innerJoin('chart_instances as ci', (join) => {
          return join.onRef('ci.shared_chart', '=', 'sc.id').onRef('ci.mix', '=', 'r.mix');
        })
        .innerJoin('tracks', 'tracks.id', 'sc.track')
        .innerJoin('players', 'r.player_id', 'players.id')
        .leftJoin('arcade_player_names', (join) =>
          join
            .onRef('players.id', '=', 'arcade_player_names.player_id')
            .onRef('arcade_player_names.mix_id', '=', 'r.mix')
        )
        .select([
          'filtered_charts.best_pp',
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
          'tracks.duration',
          'tracks.full_name',
          'ci.label as result_chart_label',
          'ci.level as result_chart_level',
          'latest_chart_label',
          'latest_chart_level',
          'latest_chart_mix',
          'difficulty',
          'chart_update_date',
          'players.nickname',
          'players.region',
          'arcade_player_names.name as arcade_nickname',
          `${scoreField} as score`,
          // score - LEAD(score, 1) OVER (
          //   PARTITION BY player_id, shared_chart
          //   ORDER BY score DESC
          // ) AS `score_increase_real`
          sql<number>`${sql.ref(scoreField)} - lead(${sql.ref(
            scoreField
          )}, 1) over (partition by r.shared_chart, r.player_id order by ${sql.ref(
            scoreField
          )} desc)`.as('score_increase_real'),
          // RANK() OVER (
          //   PARTITION BY player_id, shared_chart
          //   ORDER BY score DESC
          // ) AS `score_rank`
          sql<number>`row_number() over (partition by r.shared_chart, r.player_id order by ${sql.ref(
            scoreField
          )} desc)`.as('score_rank'),
        ])
        .where(scoreField, 'is not', null)
        .where('r.mix', 'in', mixes);

      /**
       * Below are filters that filter RESULTS after the list of charts is already decided
       */

      if (!isCurrentPlayerHidden) {
        subQuery = subQuery.where('players.hidden', '=', 0);
      }
      if (isCurrentPlayerHidden && currentPlayerId) {
        subQuery = subQuery.where('r.player_id', '=', currentPlayerId);
      }

      return subQuery;
    })
    .selectFrom('ranked_results')
    .selectAll()
    .where('score_rank', '=', 1)
    .orderBy(
      sortChartsBy === 'pp'
        ? 'best_pp'
        : sortChartsBy === 'difficulty'
        ? 'difficulty'
        : 'chart_update_date',
      sortChartsDir
    )
    .orderBy('score', 'desc');

  // console.log(replaceSqlParams(query.compile()));

  // const timeStart = performance.now();
  const results = await query.execute();
  // const timeEnd = performance.now();
  // console.log('searchCharts query time:', timeEnd - timeStart, 'ms');

  const chartsArray: ChartViewModel[] = [];

  results.reduce((acc: Record<number, ChartViewModel>, r) => {
    if (r.score !== null) {
      if (!acc[r.shared_chart]) {
        acc[r.shared_chart] = {
          id: r.shared_chart,
          duration: r.duration,
          songName: r.full_name,
          updatedOn: r.chart_update_date,
          label: r.latest_chart_label,
          level: r.latest_chart_level,
          difficulty: r.difficulty || r.latest_chart_level,
          interpolatedDifficulty: r.difficulty,
          otherChartInstances: [],
          results: [],
        };
        chartsArray.push(acc[r.shared_chart]);
      }

      if (
        r.mix !== r.latest_chart_mix &&
        !acc[r.shared_chart].otherChartInstances.some((ci) => ci.mix === r.mix)
      ) {
        acc[r.shared_chart].otherChartInstances.push({
          mix: r.mix,
          label: r.result_chart_label,
          level: r.result_chart_level,
        });
      }

      const isResultHidden =
        !!(r.player_id && hiddenPlayerIds && hiddenPlayerIds.includes(r.player_id)) ||
        !!(r.region && hiddenRegions && hiddenRegions.includes(r.region));

      const result: ResultViewModel = {
        id: r.result_id,
        playerId: r.player_id,
        playerName: r.nickname,
        playerNameArcade: r.arcade_nickname,
        score: r.score,
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
        isHidden: isResultHidden,
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
      };

      acc[r.shared_chart].results.push(result);
    }

    return acc;
  }, {});

  return chartsArray;
};
