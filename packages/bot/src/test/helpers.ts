import type { BotConfig } from '../env';
import { createPlatform } from '../platform/platform';
import type { BotPreferences } from '../platform/preferences';
import type { BotServices, ChatContext, Keyboard, Plugin, Sender } from '../platform/types';
import { db } from '@pumpking/core/db';
import { sql } from 'kysely';

export const ADMIN_ID = 9000;

export const testConfig: BotConfig = {
  telegramToken: 'test',
  adminId: ADMIN_ID,
  adminNickname: 'admin_tag',
  tournamentsChannelId: -100,
  trackedLocationName: 'arcade',
  trackedLocationWatchers: [9001],
  healthChecks: [],
};

export interface SentMessage {
  chatId: number;
  html: string;
  keyboard?: Keyboard;
}

export const createFakeSender = () => {
  const sent: SentMessage[] = [];
  const sender: Sender = {
    send: async (chatId, html, keyboard) => {
      sent.push({ chatId, html, keyboard });
    },
  };
  return { sender, sent };
};

export const createTestPlatform = (plugins: Plugin[]) => {
  const { sender, sent } = createFakeSender();
  return { platform: createPlatform(plugins, testConfig, sender), sent };
};

/** A private chat message; replies land in `replies` */
export const chatContext = (
  bot: BotServices,
  { chatId = 1001, username, text = '' }: { chatId?: number; username?: string; text?: string }
) => {
  const replies: string[] = [];
  const ctx: ChatContext = {
    bot,
    chatId,
    username,
    text,
    reply: async (html) => {
      replies.push(html);
    },
    editMessage: async (html) => {
      replies.push(html);
    },
  };
  return { ctx, replies };
};

export const rivalsPreferences = (
  rivals: Partial<BotPreferences['rivals']> = {}
): BotPreferences => ({
  version: 2,
  rivals: { list: [], levels: [1, 30], track: true, trackInferior: true, ...rivals },
});

export const clearTables = async () => {
  await db.deleteFrom('tournaments').execute();
  await db.deleteFrom('results').execute();
  await db.deleteFrom('chart_instances').execute();
  await db.deleteFrom('shared_charts').execute();
  await db.deleteFrom('tracks').execute();
  await db.deleteFrom('players').execute();
  await db.deleteFrom('agent_sessions').execute();
  await db.deleteFrom('agents').execute();
  await sql`truncate table events`.execute(db);
  await db.deleteFrom('event_cursors').execute();
  await db.deleteFrom('event_failures').execute();
  await db.deleteFrom('bot_state').execute();
};

export const addPlayer = (player: {
  id: number;
  nickname: string;
  pp?: number;
  region?: string;
  hidden?: number;
  telegramId?: number;
  telegramTag?: string;
  preferences?: BotPreferences;
}) =>
  db
    .insertInto('players')
    .values({
      id: player.id,
      nickname: player.nickname,
      pp: player.pp ?? 0,
      region: player.region ?? null,
      hidden: player.hidden ?? 0,
      telegram_id: player.telegramId ?? null,
      telegram_tag: player.telegramTag ?? null,
      telegram_bot_preferences: player.preferences ? JSON.stringify(player.preferences) : null,
    })
    .execute();

// Track 1 with a single chart: shared chart 1, S20 on Phoenix 2 (instance 1)
export const addChart = async ({ level = 20 as number | null } = {}) => {
  await db
    .insertInto('tracks')
    .values({
      id: 1,
      external_id: '1',
      full_name: 'Track <1>',
      short_name: 'Track',
      duration: 'Standard',
    })
    .execute();
  await db
    .insertInto('shared_charts')
    .values({ id: 1, track: 1, index_in_track: 1, type: 'S' })
    .execute();
  await db
    .insertInto('chart_instances')
    .values({ id: 1, track: 1, shared_chart: 1, mix: 28, label: 'S20', level })
    .execute();
};

export const addResult = async (result: {
  playerId: number;
  score: number;
  scoreIncrease?: number | null;
  rankMode?: number;
  isHidden?: number;
  exactGainDate?: number;
  addedMinutesAgo?: number;
  agent?: number;
  gainedMinutesAgo?: number;
}) => {
  const { insertId } = await db
    .insertInto('results')
    .values({
      token: '',
      recognition_notes: '',
      added: sql`UTC_TIMESTAMP() - INTERVAL ${result.addedMinutesAgo ?? 0} MINUTE`,
      agent: result.agent ?? 0,
      track_name: '',
      mix_name: 'Phoenix2',
      mix: 28,
      chart_label: 'S20',
      shared_chart: 1,
      chart_instance: 1,
      player_name: '',
      recognized_player_id: result.playerId,
      gained: sql`UTC_TIMESTAMP() - INTERVAL ${result.gainedMinutesAgo ?? 0} MINUTE`,
      exact_gain_date: result.exactGainDate ?? 1,
      rank_mode: result.rankMode ?? 0,
      score: result.score,
      score_phoenix: result.score,
      score_increase: result.scoreIncrease ?? null,
      is_hidden: result.isHidden ?? 0,
    })
    .executeTakeFirstOrThrow();
  return Number(insertId);
};

// Tournament 1, October 2026: the Easy bracket (10) has chart 1 and players 1-3, Mid (11) is empty
export const seedTournament = async () => {
  await addChart();
  await db
    .insertInto('chart_instances')
    .values([
      { id: 2, track: 1, shared_chart: 1, mix: 26, label: 'S18', level: 18 },
      { id: 3, track: 1, shared_chart: 1, mix: 27, label: 'S19', level: 19 },
    ])
    .execute();
  await addPlayer({ id: 1, nickname: 'Alice', telegramTag: 'alice_tg' });
  await addPlayer({ id: 2, nickname: 'Bob' });
  await addPlayer({ id: 3, nickname: 'Carol' });

  await db
    .insertInto('tournaments')
    .values({
      id: 1,
      name: 'October 2026',
      start_date: sql`'2026-10-01 00:00:00'`,
      end_date: sql`'2026-10-25 00:00:00'`,
      created_at: new Date(),
    })
    .execute();
  await db
    .insertInto('tournament_brackets')
    .values([
      {
        id: 10,
        tournament_id: 1,
        code: 'Easy',
        name: 'Easy',
        min_id: null,
        max_id: 14,
        singles_count: 6,
        doubles_count: 0,
      },
      {
        id: 11,
        tournament_id: 1,
        code: 'Mid',
        name: 'Mid',
        min_id: 14,
        max_id: 17,
        singles_count: 5,
        doubles_count: 1,
      },
    ])
    .execute();
  await db
    .insertInto('tournament_charts')
    .values({
      tournament_id: 1,
      bracket_id: 10,
      shared_chart_id: 1,
      ladder_level: 13,
      ladder_type: 'S',
    })
    .execute();
  await db
    .insertInto('tournament_player_brackets')
    .values(
      [2, 1, 3].map((playerId) => ({
        tournament_id: 1,
        bracket_id: 10,
        player_id: playerId,
        skill_level: null,
        created_at: new Date(),
      }))
    )
    .execute();
};
