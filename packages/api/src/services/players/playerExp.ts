import { Transaction, db } from 'db';
import { sql } from 'kysely';

const getRefreshExpBaseQuery = (trx?: Transaction) => {
  return (trx || db).updateTable('players').set((eb) => ({
    exp: db
      .with('ranked_results', (_db) => {
        return _db
          .selectFrom('results as r')
          .select([
            'player_id',
            'exp',
            sql<number>`row_number() over (partition by r.shared_chart, r.player_id order by ${sql.ref(
              'score_phoenix'
            )} desc)`.as('score_rank'),
          ]);
      })
      .selectFrom('ranked_results')
      .select((eb2) => eb2.fn.sum<number>('ranked_results.exp').as('total_exp'))
      .whereRef('ranked_results.player_id', '=', eb.ref('players.id'))
      .where('ranked_results.score_rank', '=', 1),
  }));
};

export const refreshPlayerTotalExp = async (playerId: number, trx?: Transaction) => {
  await getRefreshExpBaseQuery(trx).where('id', '=', playerId).execute();
};

export const refreshAllPlayersTotalExp = async (trx?: Transaction) => {
  await getRefreshExpBaseQuery(trx).execute();
};
