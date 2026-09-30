import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('pp_history')
    .addColumn('date', 'date', (col) => col.notNull())
    .addColumn('player_id', 'integer', (col) => col.notNull())
    .addColumn('pp', 'decimal(8, 2)', (col) => col.notNull())
    .addForeignKeyConstraint(
      'pp_history_player_id_foreign',
      ['player_id'],
      'players',
      ['id'],
      (constraint) => constraint.onDelete('cascade')
    )
    .addPrimaryKeyConstraint('date_player_id_primary', ['date', 'player_id'])
    .execute();

  await db.schema
    .createTable('pp_rank_history')
    .addColumn('date', 'date', (col) => col.notNull())
    .addColumn('player_id', 'integer', (col) => col.notNull())
    .addColumn('rank', 'integer', (col) => col.notNull())
    .addForeignKeyConstraint(
      'pp_rank_history_player_id_foreign',
      ['player_id'],
      'players',
      ['id'],
      (constraint) => constraint.onDelete('cascade')
    )
    .addPrimaryKeyConstraint('pp_rank_history_date_player_id_primary', ['date', 'player_id'])
    .execute();

  const firstResultDate = await db
    .selectFrom('results')
    .select('added')
    .where('added', 'is not', null)
    .orderBy('added', 'asc')
    .limit(1)
    .executeTakeFirst();

  if (!firstResultDate) {
    return;
  }

  const firstDay = new Date(firstResultDate.added.toISOString().slice(0, 10) + 'T23:59:59.999Z');
  let cutoff = firstDay;
  const today = new Date();

  const playerIds = await db.selectFrom('players').select('id').where('id', '>', 1).execute();
  const previousStats: Record<number, { pp: string; place?: number }> = {};

  while (cutoff < today) {
    console.log(
      `${cutoff} - day #${Math.floor(
        (cutoff.getTime() - firstDay.getTime()) / 86400000
      )}/${Math.floor((today.getTime() - firstDay.getTime()) / 86400000)}`
    );
    let ranksUpdated = 0,
      ppUpdated = 0;
    const todayStats: Record<number, { pp: string; place?: number }> = {};

    for (const { id: playerId } of playerIds) {
      const results = await db
        .with('ranked_results', (_db) => {
          return _db
            .selectFrom('results')
            .select([
              'player_id',
              'track_name',
              'chart_label',
              'pp',
              sql<number>`row_number() over (partition by results.shared_chart order by pp desc)`.as(
                'pp_rank'
              ),
            ])
            .where('player_id', '=', playerId)
            .where('pp', 'is not', null)
            .where('added', '<', cutoff.toISOString())
            .orderBy('pp', 'desc');
        })
        .selectFrom('ranked_results')
        .selectAll()
        .where('pp_rank', '=', 1)
        .orderBy('pp', 'desc')
        .limit(200)
        .execute();

      const totalPp = results
        .reduce((sum, item, index) => {
          return sum + 0.95 ** index * item.pp;
        }, 0)
        .toFixed(2);

      if (!todayStats[playerId]) todayStats[playerId] = { pp: totalPp };
      todayStats[playerId].pp = totalPp;
    }

    const playerIdsSorted = Object.keys(todayStats)
      .map((key) => Number(key))
      .sort((a, b) => {
        return Number(todayStats[b].pp) - Number(todayStats[a].pp);
      });

    for (let i = 0; i < playerIdsSorted.length; i++) {
      const id = playerIdsSorted[i];
      todayStats[id].place = i + 1;

      if (previousStats[id]?.place !== todayStats[id].place) {
        await db
          .insertInto('pp_rank_history')
          .values({
            date: cutoff.toISOString().slice(0, 10),
            player_id: id,
            rank: todayStats[id].place,
          })
          .execute();
        ranksUpdated++;
      }
      if (previousStats[id]?.pp !== todayStats[id].pp) {
        await db
          .insertInto('pp_history')
          .values({
            date: cutoff.toISOString().slice(0, 10),
            player_id: id,
            pp: todayStats[id].pp,
          })
          .execute();
        ppUpdated++;
      }
      previousStats[id] = { ...todayStats[id] };
    }

    console.log(`Updated ${ranksUpdated} ranks and ${ppUpdated} pp values`);
    cutoff = new Date(cutoff.getTime() + 86400000);
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('pp_history').execute();
  await db.schema.dropTable('pp_rank_history').execute();
}
