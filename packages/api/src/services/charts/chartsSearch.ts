import type { Tracks } from '@pumpking/database/database';
import { db } from '@pumpking/database/db';
import { MIXES } from '@pumpking/utils/mixes';
import { sql } from 'kysely';
import { getLiveTournamentMarks } from 'services/tournaments/tournament';

// import { replaceSqlParams } from 'utils/sql';

export interface ChartsSearchParams {
  /** Used to filter hidden players/regions from preferences */
  currentPlayerId?: number; // TODO: make required later
  /** */
  durations?: Array<Tracks['duration']> | undefined;
  /** */
  minLevel?: number;
  /** */
  maxLevel?: number;
  /** Example: ['S', 'D', 'COOP'], etc */
  labels?: string[] | undefined;
  /** Ids of mixes to include in leaderboards, by default [XX, Phoenix, Phoenix2] */
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
  /** Raw score from the original scoring system (1.8M scale for XX and earlier), differs from `score` for pre-Phoenix results */
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

export const searchCharts = async (params: ChartsSearchParams) => {
  const {
    currentPlayerId,
    mixes = [MIXES.XX, MIXES.Phoenix, MIXES.Phoenix2],
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

  if (!mixes.length) {
    return [];
  }

  // Phoenix scoring is the only scoring system used for leaderboards
  const scoreField = 'score_phoenix';

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

  // The results that count for a chart's date and pp: each player's best on the chart in these
  // mixes (of equal best scores the earliest, so a later tie doesn't move the chart up), from
  // the players the viewer sees. `column` is read from `index` newest / highest first, and
  // the first result that counts is the chart's one: its latest best date, or its highest pp
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

    if (!isCurrentPlayerHidden) {
      subQuery = subQuery.where('players.hidden', '=', 0);
    }
    if (isCurrentPlayerHidden && currentPlayerId) {
      subQuery = subQuery.where('r.player_id', '=', currentPlayerId);
    }
    if (hiddenPlayerIds && hiddenPlayerIds.length > 0) {
      // Hidden players are still shown on the chart, but they don't move it up
      subQuery = subQuery.where('r.player_id', 'not in', hiddenPlayerIds);
    }
    if (hiddenRegions && hiddenRegions.length > 0) {
      // Players without a region are not in a hidden region
      subQuery = subQuery.where(({ or, cmpr }) =>
        or([cmpr('players.region', 'is', null), cmpr('players.region', 'not in', hiddenRegions)])
      );
    }
    if (sortChartsByPlayers && sortChartsByPlayers.length > 0) {
      subQuery = subQuery.where('r.player_id', 'in', sortChartsByPlayers);
    }

    // By shared_chart too, so MySQL reads the index backwards instead of sorting
    return subQuery.orderBy('r.shared_chart', 'desc').orderBy(`r.${column}`, 'desc').limit(1);
  };

  const query = db
    // The chart's instance in the latest of the mixes
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
    .with('filtered_charts', (_db) => {
      let subQuery = _db
        .selectFrom('latest_mix')
        .innerJoin('chart_instances as latest_ci', (join) =>
          join
            .onRef('latest_ci.shared_chart', '=', 'latest_mix.shared_chart')
            .onRef('latest_ci.mix', '=', 'latest_mix.mix')
        )
        .innerJoin('shared_charts as sc', 'sc.id', 'latest_mix.shared_chart')
        .innerJoin('tracks', 'tracks.id', 'sc.track')
        // Charts without a result that counts are not listed
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

      /**
       * Below are filters that filter CHARTS, not results
       */

      if (songNameParts) {
        // The typed % and _ are matched as themselves
        const escapedParts = songNameParts.map((part) => part.replace(/[\\%_]/g, '\\$&'));
        subQuery = subQuery.where(
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

      if (playersSome && playersSome.length > 0) {
        subQuery = subQuery.where(({ exists }) =>
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
        subQuery = subQuery.where(({ not, exists }) =>
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
          subQuery = subQuery.where(({ exists }) =>
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

      // Charts with the same sort value are ordered by id, so they keep their order from page to page
      return subQuery
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
          'r.score as original_score',
          // score - LEAD(score, 1) OVER (
          //   PARTITION BY player_id, shared_chart
          //   ORDER BY score DESC
          // ) AS `score_increase_real`
          sql<number>`${sql.ref(scoreField)} - lead(${sql.ref(
            scoreField
          )}, 1) over (partition by r.shared_chart, r.player_id order by ${sql.ref(
            scoreField
          )} desc, r.added asc, r.id asc)`.as('score_increase_real'),
          // RANK() OVER (
          //   PARTITION BY player_id, shared_chart
          //   ORDER BY score DESC
          // ) AS `score_rank`
          // Of equal scores the earliest one ranks first, it's the one that was a new best. The
          // same result is sometimes stored twice in the same second: the first stored has the pp
          sql<number>`row_number() over (partition by r.shared_chart, r.player_id order by ${sql.ref(
            scoreField
          )} desc, r.added asc, r.id asc)`.as('score_rank'),
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
    .orderBy('shared_chart', sortChartsDir)
    // Of equal scores, the one that was set first ranks higher
    .orderBy('score', 'desc')
    .orderBy('added', 'asc')
    .orderBy('result_id', 'asc');

  // console.log(replaceSqlParams(query.compile()));

  // const timeStart = performance.now();
  const results = await query.execute();
  // const timeEnd = performance.now();
  // console.log('searchCharts query time:', timeEnd - timeStart, 'ms');

  const chartsArray: ChartViewModel[] = [];
  const { poolChartIds, countingResultIds } = await getLiveTournamentMarks(
    results.map((r) => r.result_id)
  );

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
          inTournament: poolChartIds.has(r.shared_chart),
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
        countsForTournament: countingResultIds.has(r.result_id),
      };

      acc[r.shared_chart].results.push(result);
    }

    return acc;
  }, {});

  return chartsArray;
};
