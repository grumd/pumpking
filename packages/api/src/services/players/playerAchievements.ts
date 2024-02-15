import { Transaction, db } from 'db';
import { sql } from 'kysely';
import _ from 'lodash/fp';

export const getPlayerAchievements = async (
  playerId: number,
  trx?: Transaction
): Promise<{
  combo500: boolean;
  combo1000: boolean;
  combo2000: boolean;
  fingering: number;
  bit8: number;
  loveIs: number;
  snail: number;
  brownS: boolean;
  lowHealth: boolean;
  padMiss: boolean;
  weekLongTraining: boolean;
  sightread: boolean;
}> => {
  const combo2000 = !!(await (trx ?? db)
    .selectFrom('results')
    .selectAll()
    .where('player_id', '=', playerId)
    .where('max_combo', '>=', 2000)
    .limit(1)
    .executeTakeFirst());
  const combo1000 =
    combo2000 ||
    !!(await (trx ?? db)
      .selectFrom('results')
      .selectAll()
      .where('player_id', '=', playerId)
      .where('max_combo', '>=', 1000)
      .limit(1)
      .executeTakeFirst());
  const combo500 =
    combo1000 ||
    !!(await (trx ?? db)
      .selectFrom('results')
      .selectAll()
      .where('player_id', '=', playerId)
      .where('max_combo', '>=', 500)
      .limit(1)
      .executeTakeFirst());

  const fingeringCount = await (trx ?? db)
    .selectFrom('results as r')
    .leftJoin('shared_charts', 'shared_charts.id', 'r.shared_chart')
    .leftJoin('tracks', 'tracks.id', 'shared_charts.track')
    .distinct()
    .select('tracks.id')
    .where('player_id', '=', playerId)
    .where('tracks.id', 'in', [453, 644, 674, 804])
    .execute();

  const bit8Count = await (trx ?? db)
    .selectFrom('results')
    .leftJoin('shared_charts', 'shared_charts.id', 'shared_chart')
    .leftJoin('tracks', 'tracks.id', 'shared_charts.track')
    .distinct()
    .select('tracks.id')
    .where('player_id', '=', playerId)
    .where('tracks.id', 'in', [523, 829, 653])
    .execute();

  const liadzCount = await (trx ?? db)
    .selectFrom('results')
    .leftJoin('shared_charts', 'shared_charts.id', 'shared_chart')
    .leftJoin('tracks', 'tracks.id', 'shared_charts.track')
    .distinct()
    .select('tracks.id')
    .where('player_id', '=', playerId)
    .where('tracks.id', 'in', [52, 156, 157, 250, 738, 744, 763, 767])
    .execute();

  const snailCount = await (trx ?? db)
    .selectFrom('results as r')
    .leftJoin('shared_charts as sc', 'sc.id', 'r.shared_chart')
    .leftJoin('tracks', 'tracks.id', 'sc.track')
    .distinct()
    .select('tracks.id')
    .where('player_id', '=', playerId)
    .where('r.shared_chart', 'in', [2771, 2772, 2267, 2269, 2819, 2820, 4804, 4802])
    .execute();

  return {
    combo500,
    combo1000,
    combo2000,
    fingering: fingeringCount.length / 4,
    bit8: bit8Count.length / 3,
    loveIs: liadzCount.length / 8,
    snail: snailCount.length / 4,
    brownS: !!(await (trx ?? db)
      .selectFrom('results')
      .selectAll()
      .where('player_id', '=', playerId)
      .where('misses', '=', 0)
      .where('bads', '>=', 5)
      .limit(1)
      .executeTakeFirst()),
    lowHealth: !!(await (trx ?? db)
      .selectFrom('results')
      .selectAll()
      .where('player_id', '=', playerId)
      .where('score_phoenix', '<', 800000)
      .where('is_pass', '=', 1)
      .limit(1)
      .executeTakeFirst()),
    padMiss: !!(await (trx ?? db)
      .selectFrom('results')
      .selectAll()
      .where('player_id', '=', playerId)
      .where('bads', '=', 0)
      .where('goods', '=', 0)
      .where('greats', '=', 0)
      .where('misses', '>', 0)
      .limit(1)
      .executeTakeFirst()),
    weekLongTraining: !!(await (trx ?? db)
      .selectFrom((qb) =>
        qb
          .selectFrom((qb2) =>
            qb2
              .selectFrom('results')
              .select([({ ref, fn }) => fn('DATE', [ref('results.gained')]).as('date')])
              .distinct()
              .where('player_id', '=', playerId)
              .as('tmp1')
          )
          .select([
            'date',
            ({ ref, fn }) =>
              fn('DATEDIFF', [
                ref('date'),
                sql<string>`lead(date, 6) over (order by date desc)`,
              ]).as('days_in_a_row'),
          ])
          .as('tmp2')
      )
      .select('date')
      .where('days_in_a_row', '=', 6)
      .executeTakeFirst()),
    sightread: !!(await (trx ?? db)
      .selectFrom('results as r')
      .select('r.id')
      .where('player_id', '=', playerId)
      .where('score_phoenix', '=', 1_000_000)
      .where(({ exists, not, selectFrom }) =>
        not(
          exists(
            selectFrom('results as r1')
              .select('r1.id')
              .whereRef('r1.player_id', '=', 'r.player_id')
              .whereRef('r1.shared_chart', '=', 'r.shared_chart')
              .whereRef('r1.gained', '<', 'r.gained')
          )
        )
      )
      .executeTakeFirst()),
  };
};
