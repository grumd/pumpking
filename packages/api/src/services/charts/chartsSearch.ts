import { db } from 'db';
import { sql } from 'kysely';
import type { Tracks } from 'types/database';
// import { replaceSqlParams } from 'utils/sql';

interface ChartsSearchParams {
  /** Used to filter hidden players/regions from preferences */
  currentPlayerId?: number; // TODO: make required later
  /** */
  scoring?: 'xx' | 'phoenix';
  /** */
  duration?: Tracks['duration'];
  /** */
  minLevel?: number;
  /** */
  maxLevel?: number;
  /** Example: 'S', 'D', 'COOP', etc */
  label?: string;
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
}

export const searchCharts = async (params: ChartsSearchParams) => {
  const {
    currentPlayerId,
    scoring = 'xx',
    mixes = [26, 27],
    duration,
    label,
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
  const scoreField = scoring === 'xx' ? 'score_xx' : 'score_phoenix';

  const songNameParts = songName?.split(' ').filter((part) => part.length > 0);

  console.log(params);

  const preferences = currentPlayerId
    ? ((
        await db
          .selectFrom('players')
          .select('preferences')
          .where('id', '=', currentPlayerId)
          .executeTakeFirstOrThrow()
      ).preferences as {
        playersHiddenStatus: Record<number, boolean>;
        hiddenRegions: Record<string, boolean>;
      } | null)
    : null;

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
        .innerJoin(
          'chart_instances as ci',
          (join) =>
            join.onRef('ci.shared_chart', '=', 'sc.id').on('ci.mix', '=', mixes[mixes.length - 1]) // get chart_instance from the latest mix
        )
        .innerJoin('tracks', 'ci.track', 'tracks.id')
        .innerJoin('players', 'r.player_id', 'players.id')
        .select(({ fn }) => [
          'r.shared_chart as shared_chart_id',
          fn.max('r.added').as('chart_update_date'),
          fn.max('ci.interpolated_difficulty').as('interpolated_difficulty'),
          fn.max('r.pp').as('best_pp'),
        ])
        .where('players.hidden', '=', 0)
        .where(scoreField, 'is not', null);

      /**
       * Below are filters that filter CHARTS, not results
       */

      if (hiddenPlayerIds) {
        // We filter hidden players here so that charts that were recently played by them are not at the top
        subQuery = subQuery.where('r.player_id', 'not in', hiddenPlayerIds);
      }
      if (hiddenRegions) {
        subQuery = subQuery.where('players.region', 'not in', hiddenRegions);
      }

      if (songNameParts) {
        subQuery = subQuery.where(
          ({ ref, fn, val }) =>
            fn('concat', [
              fn('lower', [ref('tracks.full_name')]),
              val(`' '`),
              fn('lower', [ref('ci.label')]),
            ]),
          'like',
          `%${songNameParts.join('%')}%`
        );
      }

      if (duration) {
        subQuery = subQuery.where('tracks.duration', '=', duration);
      }

      if (minLevel) {
        subQuery = subQuery.where('ci.level', '>=', minLevel);
      }
      if (maxLevel) {
        subQuery = subQuery.where('ci.level', '<=', maxLevel);
      }

      if (label) {
        subQuery = subQuery.where('ci.label', 'like', `${label}%`);
      }

      if (sortChartsByPlayers) {
        subQuery = subQuery.where('r.player_id', 'in', sortChartsByPlayers);
      }

      if (playersSome) {
        subQuery = subQuery.where(({ exists }) =>
          exists((eb) =>
            eb
              .selectFrom('results as _r')
              .select('_r.id')
              .where('_r.shared_chart', '=', sql.ref('r.shared_chart'))
              .where('_r.player_id', 'in', playersSome)
          )
        );
      }
      if (playersNone) {
        subQuery = subQuery.where(({ not, exists }) =>
          not(
            exists((eb) =>
              eb
                .selectFrom('results as _r')
                .select('_r.id')
                .where('_r.shared_chart', '=', sql.ref('r.shared_chart'))
                .where('_r.player_id', 'in', playersNone)
            )
          )
        );
      }
      if (playersAll) {
        for (const playerId of playersAll) {
          subQuery = subQuery.where(({ exists }) =>
            exists((eb) =>
              eb
                .selectFrom('results as _r')
                .select('_r.id')
                .where('_r.shared_chart', '=', sql.ref('r.shared_chart'))
                .where('_r.player_id', '=', playerId)
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
            ? 'interpolated_difficulty'
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
        .innerJoin(
          'chart_instances as ci',
          (join) =>
            join.onRef('ci.shared_chart', '=', 'sc.id').on('ci.mix', '=', mixes[mixes.length - 1]) // get chart_instance from the latest mix
        )
        .innerJoin('tracks', 'tracks.id', 'sc.track')
        .innerJoin('players', 'r.player_id', 'players.id')
        .select([
          'r.id as result_id',
          'r.shared_chart',
          'r.pp',
          'r.gained',
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
          'tracks.duration',
          'tracks.full_name',
          'ci.label',
          'ci.level',
          'ci.interpolated_difficulty',
          'chart_update_date',
          'players.nickname',
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
          sql<number>`rank() over (partition by r.shared_chart, r.player_id order by ${sql.ref(
            scoreField
          )} desc)`.as('score_rank'),
        ])
        .where('players.hidden', '=', 0)
        .where(scoreField, 'is not', null)
        .where('r.mix', 'in', mixes);

      /**
       * Below are filters that filter RESULTS after the list of charts is already decided
       */

      if (hiddenPlayerIds) {
        subQuery = subQuery.where('r.player_id', 'not in', hiddenPlayerIds);
      }

      if (hiddenRegions) {
        subQuery = subQuery.where('players.region', 'not in', hiddenRegions);
      }

      return subQuery
        .orderBy(
          sortChartsBy === 'pp'
            ? 'filtered_charts.best_pp'
            : sortChartsBy === 'difficulty'
            ? 'filtered_charts.interpolated_difficulty'
            : 'filtered_charts.chart_update_date',
          sortChartsDir
        )
        .orderBy(scoreField, 'desc');
    })
    .selectFrom('ranked_results')
    .selectAll()
    .where('score_rank', '=', 1);

  // console.log(replaceSqlParams(query.compile()));

  // const timeStart = performance.now();
  const results = await query.execute();
  // const timeEnd = performance.now();

  interface ResultViewModel {
    id: number;
    playerId: number | null;
    playerName: string;
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
  }

  interface ChartViewModel {
    id: number;
    songName: string;
    duration: Tracks['duration'];
    updatedOn: Date;
    label: string;
    level: number | null;
    difficulty: number | null;
    interpolatedDifficulty: number | null;
    results: Array<ResultViewModel>;
  }

  const charts = results.reduce((acc: ChartViewModel[], r) => {
    if (r.score !== null) {
      let lastChart = !acc.length ? null : acc[acc.length - 1];

      if (!lastChart || lastChart.id !== r.shared_chart) {
        lastChart = {
          id: r.shared_chart,
          duration: r.duration,
          songName: r.full_name,
          updatedOn: r.chart_update_date,
          label: r.label,
          level: r.level,
          difficulty: r.interpolated_difficulty || r.level,
          interpolatedDifficulty: r.interpolated_difficulty,
          results: [],
        };
        acc.push(lastChart);
      }

      lastChart.results.push({
        id: r.result_id,
        playerId: r.player_id,
        playerName: r.nickname,
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
      });
    }

    return acc;
  }, []);

  return charts;
};
