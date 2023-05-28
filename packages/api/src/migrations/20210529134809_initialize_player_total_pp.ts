import { Knex } from 'knex';
import _ from 'lodash/fp';

import { knex } from 'db';

import { mix } from 'constants/currentMix';
import { Player } from 'models/Player';
import { Result } from 'models/Result';
import { getGroupedBestResults } from 'utils/results';

const debug = require('debug')('backend-ts:migrations:initialize_player_total_pp');

const TABLE = 'players';
const COLUMN = 'pp';

type ScoreRecord = { id: number; song: string; label: string; diff: number; pp: number };
type PlayersMap = Record<number, { nickname: string; pp: number; bestScores: ScoreRecord[] }>;

const getResultsQuery = () => {
  return knex
    .query(Result)
    .innerJoinColumn('shared_chart')
    .innerJoinColumn('chart_instance')
    .innerJoinColumn('player')
    .innerJoinColumn('shared_chart.track')
    .select(
      'id',
      'score_xx',
      'grade',
      'perfects',
      'greats',
      'goods',
      'bads',
      'misses',
      'pp',
      'shared_chart.id',
      'player.id',
      'player.nickname',
      'chart_instance.level',
      'chart_instance.label',
      'chart_instance.interpolated_difficulty',
      'shared_chart.track.short_name'
    )
    .where('player.hidden', 0)
    .where('rank_mode', 0)
    .where('is_new_best_score', 1)
    .where('mix', mix)
    .where('chart_label', 'NOT LIKE', 'COOP%')
    .orderBy('gained', 'desc');
};

const getPlayerPpFromResults = (
  allResults: {
    shared_chart: {
      id: number;
      track: { short_name: string };
    };
    player: {
      id: number;
      nickname: string;
    };
    chart_instance: {
      label: string;
      interpolated_difficulty: number;
    };
    id: number;
    pp: number;
  }[]
) => {
  const sharedCharts = getGroupedBestResults(allResults);

  const players: PlayersMap = {};

  for (const chartId in sharedCharts) {
    const results = sharedCharts[chartId];
    for (const result of results) {
      if (!players[result.player.id]) {
        players[result.player.id] = {
          nickname: result.player.nickname,
          pp: 0,
          bestScores: [],
        };
      }
      const newScore: ScoreRecord = {
        id: result.id,
        song: result.shared_chart.track.short_name,
        label: result.chart_instance.label,
        diff: result.chart_instance.interpolated_difficulty,
        pp: result.pp,
      };
      const insertIndex = _.sortedLastIndexBy(
        (score) => score.pp,
        newScore,
        players[result.player.id].bestScores
      );
      players[result.player.id].bestScores.splice(insertIndex, 0, newScore);
    }
  }

  for (const playerId in players) {
    const player = players[playerId];
    const scoresCount = player.bestScores.length;
    player.bestScores.forEach((score, index) => {
      // reversing the index because our array is sorted from worst to best scores
      player.pp += 0.95 ** (scoresCount - index - 1) * score.pp;
    });
    player.bestScores = player.bestScores.slice(-20).reverse();
  }

  return players;
};

const getPlayersTotalPp = async () => {
  const allResults = await getResultsQuery().getMany();
  const players: PlayersMap = getPlayerPpFromResults(allResults);
  return players;
};

export async function up(knex: Knex): Promise<void> {
  debug('Start');

  if (!(await knex.schema.hasColumn(TABLE, COLUMN))) {
    await knex.schema.alterTable(TABLE, (table: Knex.TableBuilder) => {
      table.float(COLUMN);
    });
  }

  debug('Added new pp column');

  const players = await getPlayersTotalPp();

  const queries: Knex.QueryBuilder<Player, number>[] = [];
  _.toPairs(players).forEach(([id, { pp }]) => {
    queries.push(knex(TABLE).where('id', id).update(COLUMN, pp));
  });

  debug('Updating pp column values');

  return Promise.all(queries).then(() => {
    debug('Finished');
  });
}

export async function down(knex: Knex): Promise<void> {
  debug('Rolling back');

  if (await knex.schema.hasColumn(TABLE, COLUMN)) {
    await knex.schema.alterTable(TABLE, (table: Knex.TableBuilder) => {
      table.dropColumn(COLUMN);
    });

    debug(`Removed column ${COLUMN}`);
  } else {
    debug(`Column ${COLUMN} doesnt exist`);
  }
}
