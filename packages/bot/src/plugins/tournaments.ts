import { formatNumber, wrap } from '../platform/texts';
import type { BotServices, Plugin } from '../platform/types';
import { db } from '@pumpking/database/db';
import { MIX_NAME_BY_ID, SUPPORTED_MIXES } from '@pumpking/utils/mixes';
import { sql } from 'kysely';

// Posts the monthly tournament to the tournaments channel: each bracket's pool and players
// when it starts, the podiums when it ends (docs/tournaments/PLAN.md)

const TOURNAMENTS_URL = 'https://pumpking.top/#/tournaments';

const MEDALS = { gold: '🥇', silver: '🥈', bronze: '🥉' } as const;

const mention = (player: { nickname: string; telegram_tag: string | null }) =>
  wrap(player.telegram_tag ? `@${player.telegram_tag}` : player.nickname);

const getTournament = (tournamentId: number) =>
  db
    .selectFrom('tournaments')
    .select([
      'name',
      sql<string>`DATE_FORMAT(start_date, '%Y-%m-%d')`.as('firstDay'),
      // end_date is exclusive: results count until the day before, 23:59
      sql<string>`DATE_FORMAT(end_date - INTERVAL 1 DAY, '%Y-%m-%d')`.as('lastDay'),
    ])
    .where('id', '=', tournamentId)
    .executeTakeFirstOrThrow();

const getBrackets = (tournamentId: number) =>
  db
    .selectFrom('tournament_brackets')
    .select(['id', 'name'])
    .where('tournament_id', '=', tournamentId)
    .orderBy('id')
    .execute();

/** One message per bracket: its pool (with each mix's label) and its players */
export const tournamentStartedMessages = async (tournamentId: number) => {
  const tournament = await getTournament(tournamentId);
  const brackets = await getBrackets(tournamentId);

  const pool = await db
    .selectFrom('tournament_charts')
    .innerJoin('shared_charts', 'shared_charts.id', 'tournament_charts.shared_chart_id')
    .innerJoin('tracks', 'tracks.id', 'shared_charts.track')
    .select(['tournament_charts.bracket_id', 'shared_charts.id', 'tracks.full_name'])
    .where('tournament_charts.tournament_id', '=', tournamentId)
    .orderBy('tournament_charts.id')
    .execute();

  const labels =
    pool.length === 0
      ? []
      : await db
          .selectFrom('chart_instances')
          .select(['shared_chart', 'mix', 'label'])
          .where(
            'shared_chart',
            'in',
            pool.map((chart) => chart.id)
          )
          .where('mix', 'in', SUPPORTED_MIXES)
          .orderBy('mix')
          .execute();

  const players = await db
    .selectFrom('tournament_player_brackets')
    .innerJoin('players', 'players.id', 'tournament_player_brackets.player_id')
    .select(['tournament_player_brackets.bracket_id', 'players.nickname', 'players.telegram_tag'])
    .where('tournament_player_brackets.tournament_id', '=', tournamentId)
    .orderBy('players.nickname')
    .execute();

  return brackets.map((bracket) => {
    let message =
      `Tournament <b>${wrap(tournament.name)}</b>  (${tournament.firstDay} - ${
        tournament.lastDay
      }),` +
      `  bracket <b>${wrap(bracket.name.toUpperCase())}</b>\n` +
      `<i>(more details at ${TOURNAMENTS_URL})</i>\n\n`;

    for (const chart of pool.filter((c) => c.bracket_id === bracket.id)) {
      const mixLabels = labels
        .filter((label) => label.shared_chart === chart.id)
        .map((label) => `${MIX_NAME_BY_ID[label.mix]} ${label.label}`)
        .join(' · ');
      message += ` • <b>${wrap(chart.full_name)}</b>  ${wrap(mixLabels)}\n`;
    }

    const mentions = players.filter((p) => p.bracket_id === bracket.id).map(mention);
    if (mentions.length > 0) {
      message += '\n' + mentions.join('  ') + '\n';
    }
    return message;
  });
};

/** The podium of every bracket */
export const tournamentEndedMessage = async (tournamentId: number) => {
  const tournament = await getTournament(tournamentId);
  const brackets = await getBrackets(tournamentId);

  const winners = await db
    .selectFrom('tournament_results')
    .innerJoin('players', 'players.id', 'tournament_results.player_id')
    .select([
      'tournament_results.bracket_id',
      'tournament_results.medal',
      'tournament_results.score',
      'players.nickname',
      'players.telegram_tag',
    ])
    .where('tournament_results.tournament_id', '=', tournamentId)
    .where('tournament_results.medal', 'is not', null)
    .orderBy('tournament_results.rank')
    .orderBy('tournament_results.id')
    .execute();

  let message =
    `Tournament <b>${wrap(tournament.name)}</b> has ended!\n` +
    `<i>(final results at ${TOURNAMENTS_URL})</i>\n`;
  for (const bracket of brackets) {
    message += `\n<b>${wrap(bracket.name)}</b>\n`;
    const podium = winners.filter((w) => w.bracket_id === bracket.id);
    if (podium.length === 0) {
      message += 'no results\n';
    }
    for (const winner of podium) {
      message += `${MEDALS[winner.medal!]} ${mention(winner)}  <code>${formatNumber(
        winner.score
      )}</code>\n`;
    }
  }
  return message;
};

const postToChannel = async (bot: BotServices, message: string) => {
  if (bot.config.tournamentsChannelId) {
    await bot.sender.send(bot.config.tournamentsChannelId, message);
  }
};

export const tournamentsPlugin: Plugin = {
  name: 'tournaments',
  events: {
    tournamentStarted: async ({ tournamentId }, bot) => {
      for (const message of await tournamentStartedMessages(tournamentId)) {
        await postToChannel(bot, message);
      }
    },
    tournamentEnded: async ({ tournamentId }, bot) => {
      await postToChannel(bot, await tournamentEndedMessage(tournamentId));
    },
  },
};
