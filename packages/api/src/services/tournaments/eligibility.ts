import { SUPPORTED_MIXES } from '@pumpking/core/constants/mixes';
import { db, type Transaction } from '@pumpking/core/db';
import { sql, type RawBuilder } from 'kysely';

// Results that count for tournaments, shared by the skill rule and the scorer.
// `from`/`to` are naive wall-clock bounds compared in SQL, `to` is exclusive.
export const eligibleResults = (
  window: { from: RawBuilder<Date>; to: RawBuilder<Date> },
  trx?: Transaction
) =>
  (trx ?? db)
    .selectFrom('results as r')
    .innerJoin('players as p', 'p.id', 'r.player_id')
    .where('r.score_phoenix', 'is not', null)
    .where('r.exact_gain_date', '=', 1)
    .where('r.is_hidden', '=', 0)
    .where('p.hidden', '=', 0)
    .where('r.mix', 'in', SUPPORTED_MIXES)
    .where('r.gained', '>=', window.from)
    .where('r.gained', '<', window.to);

// S/D shared charts that exist in every supported mix.
export const poolChartIds = (trx?: Transaction) =>
  (trx ?? db)
    .selectFrom('chart_instances as ci')
    .innerJoin('shared_charts as sc', 'sc.id', 'ci.shared_chart')
    .select('ci.shared_chart')
    .where('sc.type', 'in', ['S', 'D'])
    .where('ci.mix', 'in', SUPPORTED_MIXES)
    .groupBy('ci.shared_chart')
    .having(sql`count(distinct ci.mix)`, '=', SUPPORTED_MIXES.length);
