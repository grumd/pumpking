import { eligibleResults, poolChartIds } from './eligibility';
import { bracketForSkill, medalForRank, skillLevel } from './rules';
import { getBracketLeaderboard } from './tournament';
import {
  FRESH_POOL_MONTHS,
  SITE_TIMEZONE,
  SKILL_WINDOW_DAYS,
  TOURNAMENT_BRACKETS,
  TOURNAMENT_END_DAY,
  TQ_QUALIFY_SCORE,
  type LadderSlot,
} from '@pumpking/core/constants/tournaments';
import { db, type Transaction } from '@pumpking/core/db';
import { addEvent } from '@pumpking/core/events';
import { sql } from 'kysely';
import _ from 'lodash/fp';
import { raiseNotices } from 'services/notices/notices';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Naive wall-clock "YYYY-MM-DD HH:MM:SS" in the site timezone.
export const siteNow = () => new Date().toLocaleString('sv-SE', { timeZone: SITE_TIMEZONE });

export const currentSiteMonth = () => {
  const [year, month] = siteNow().split('-').map(Number);
  return { year, month };
};

const pad = (n: number) => String(n).padStart(2, '0');

interface Candidate {
  id: number;
  type: 'S' | 'D';
  level: number;
}

const drawPool = (ladder: LadderSlot[], candidates: Candidate[], recent: Set<number>) => {
  const used = new Set<number>();
  return ladder.map((slot) => {
    const options = candidates.filter(
      (c) => c.type === slot.type && c.level === slot.level && !used.has(c.id)
    );
    const fresh = options.filter((c) => !recent.has(c.id));
    const chart = _.sample(fresh.length ? fresh : options);
    if (!chart) {
      throw new Error(`No pool charts left for ${slot.type}${slot.level}`);
    }
    used.add(chart.id);
    return { ...slot, sharedChartId: chart.id };
  });
};

const getPlayerSkills = async (startDate: string, trx: Transaction) => {
  const qualifying = await eligibleResults(
    {
      from: sql<Date>`${startDate} - interval ${sql.lit(SKILL_WINDOW_DAYS)} day`,
      to: sql<Date>`${startDate}`,
    },
    trx
  )
    .innerJoin('shared_charts as sc', 'sc.id', 'r.shared_chart')
    .select(['p.id', sql<number>`floor(sc.interpolated_difficulty)`.as('level')])
    .where('sc.id', 'in', poolChartIds(trx))
    .groupBy(['p.id', 'sc.id'])
    .having(sql`max(r.score_phoenix)`, '>=', TQ_QUALIFY_SCORE)
    .execute();

  const levelsByPlayer = _.groupBy('id', qualifying);
  const players = await trx.selectFrom('players').select('id').where('hidden', '=', 0).execute();

  return players.map(({ id }) => ({
    playerId: id,
    skill: skillLevel((levelsByPlayer[id] ?? []).map((row) => Number(row.level))),
  }));
};

export const createTournament = async ({ year, month }: { year: number; month: number }) => {
  const startDate = `${year}-${pad(month)}-01 00:00:00`;
  const endDate = `${year}-${pad(month)}-${pad(TOURNAMENT_END_DAY)} 00:00:00`;

  return db.transaction().execute(async (trx) => {
    const existing = await trx
      .selectFrom('tournaments')
      .select('id')
      .where('start_date', '=', sql<Date>`${startDate}`)
      .executeTakeFirst();
    if (existing) {
      return { id: existing.id, created: false };
    }

    const { insertId } = await trx
      .insertInto('tournaments')
      .values({
        name: `${MONTH_NAMES[month - 1]} ${year}`,
        start_date: sql`${startDate}`,
        end_date: sql`${endDate}`,
        created_at: new Date(),
      })
      .executeTakeFirstOrThrow();
    const tournamentId = Number(insertId);

    const candidates = (
      await trx
        .selectFrom('shared_charts')
        .select(['id', 'type', sql<number>`floor(interpolated_difficulty)`.as('level')])
        .where('id', 'in', poolChartIds(trx))
        .where('interpolated_difficulty', 'is not', null)
        .execute()
    ).map((c) => ({ id: c.id, type: c.type as 'S' | 'D', level: Number(c.level) }));

    const recent = await trx
      .selectFrom('tournament_charts as tc')
      .innerJoin('tournaments as t', 't.id', 'tc.tournament_id')
      .select('tc.shared_chart_id')
      .where('t.start_date', '<', sql<Date>`${startDate}`)
      .where(
        't.start_date',
        '>=',
        sql<Date>`${startDate} - interval ${sql.lit(FRESH_POOL_MONTHS)} month`
      )
      .execute();
    const recentIds = new Set(recent.map((row) => row.shared_chart_id));

    const bracketIds = new Map<string, number>();
    for (const bracket of TOURNAMENT_BRACKETS) {
      const result = await trx
        .insertInto('tournament_brackets')
        .values({
          tournament_id: tournamentId,
          code: bracket.code,
          name: bracket.name,
          min_id: bracket.minSkill,
          max_id: bracket.maxSkill,
          singles_count: bracket.ladder.filter((slot) => slot.type === 'S').length,
          doubles_count: bracket.ladder.filter((slot) => slot.type === 'D').length,
        })
        .executeTakeFirstOrThrow();
      const bracketId = Number(result.insertId);
      bracketIds.set(bracket.code, bracketId);

      await trx
        .insertInto('tournament_charts')
        .values(
          drawPool(bracket.ladder, candidates, recentIds).map((chart) => ({
            tournament_id: tournamentId,
            bracket_id: bracketId,
            shared_chart_id: chart.sharedChartId,
            ladder_level: chart.level,
            ladder_type: chart.type,
          }))
        )
        .execute();
    }

    const skills = await getPlayerSkills(startDate, trx);
    if (skills.length) {
      await trx
        .insertInto('tournament_player_brackets')
        .values(
          skills.map(({ playerId, skill }) => ({
            tournament_id: tournamentId,
            bracket_id: bracketIds.get(bracketForSkill(skill))!,
            player_id: playerId,
            skill_level: skill,
            created_at: new Date(),
          }))
        )
        .execute();
    }
    await raiseNotices(
      trx,
      'tournament',
      tournamentId,
      skills.map((s) => s.playerId)
    );
    await addEvent(trx, 'tournamentStarted', { tournamentId });

    return { id: tournamentId, created: true };
  });
};

// Ends Live tournaments past their end date and freezes their final results.
export const endTournaments = async (now: string = siteNow()) =>
  db.transaction().execute(async (trx) => {
    const ending = await trx
      .selectFrom('tournaments')
      .select('id')
      .where('state', '=', 'Live')
      .where('end_date', '<=', sql<Date>`${now}`)
      .forUpdate()
      .execute();

    for (const { id } of ending) {
      const brackets = await trx
        .selectFrom('tournament_brackets')
        .select('id')
        .where('tournament_id', '=', id)
        .execute();

      for (const bracket of brackets) {
        const leaderboard = await getBracketLeaderboard(bracket.id, trx);
        if (leaderboard.length) {
          await trx
            .insertInto('tournament_results')
            .values(
              leaderboard.map((entry) => ({
                tournament_id: id,
                bracket_id: bracket.id,
                player_id: entry.playerId,
                rank: entry.rank,
                score: entry.total,
                medal: medalForRank(entry.rank),
                charts: JSON.stringify(entry.charts),
                created_at: new Date(),
              }))
            )
            .execute();
        }
      }

      await trx.updateTable('tournaments').set({ state: 'Ended' }).where('id', '=', id).execute();
      await addEvent(trx, 'tournamentEnded', { tournamentId: id });
    }

    return ending.length;
  });
