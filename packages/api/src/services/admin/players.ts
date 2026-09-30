import {
  type ArcadeNames,
  getPlayerArcadeNames,
  normalizeArcadeNames,
  saveArcadeNames,
} from './arcadeNames';
import { describeChanges } from './report';
import { ARCADE_NAME_MIXES, MIX_NAME_BY_ID } from '@pumpking/core/constants/mixes';
import type { Players } from '@pumpking/core/database';
import { db } from '@pumpking/core/db';
import { type Selectable, sql } from 'kysely';
import { error } from 'utils';

const playerColumns = [
  'players.id',
  'players.nickname',
  'players.email',
  'players.region',
  'players.telegram_tag',
  'players.telegram_id',
  'players.hidden',
  'players.hidden_since',
  'players.discard_results',
  'players.is_admin',
  'players.can_add_results_manually',
  'players.actual_player_id',
] as const;

type PlayerRow = Pick<
  Selectable<Players>,
  | 'id'
  | 'nickname'
  | 'email'
  | 'region'
  | 'telegram_tag'
  | 'telegram_id'
  | 'hidden'
  | 'hidden_since'
  | 'discard_results'
  | 'is_admin'
  | 'can_add_results_manually'
  | 'actual_player_id'
>;

// The flags as booleans
const toPlayer = (row: PlayerRow) => ({
  id: row.id,
  nickname: row.nickname,
  email: row.email,
  region: row.region,
  telegram_tag: row.telegram_tag,
  telegram_id: row.telegram_id,
  hidden: !!row.hidden,
  hidden_since: row.hidden_since,
  discard_results: !!row.discard_results,
  is_admin: !!row.is_admin,
  can_add_results_manually: !!row.can_add_results_manually,
  actual_player_id: row.actual_player_id,
});

export const listPlayers = async () => {
  const [players, arcadeNames] = await Promise.all([
    db.selectFrom('players').select(playerColumns).orderBy('players.id').execute(),
    getPlayerArcadeNames(),
  ]);
  return players.map((player) => ({ ...toPlayer(player), arcadeNames: arcadeNames(player.id) }));
};

export const getPlayer = async (playerId: number) => {
  const player = await db
    .selectFrom('players')
    .select(playerColumns)
    .where('players.id', '=', playerId)
    .executeTakeFirst();
  if (!player) {
    throw error(404, `Player not found: id ${playerId}`);
  }

  const [results, arcadeNames] = await Promise.all([
    db
      .selectFrom('results')
      .select(({ fn }) => [
        fn.countAll<number>().as('count'),
        fn.max('results.gained').as('last_gained'),
      ])
      .where('player_id', '=', playerId)
      .executeTakeFirstOrThrow(),
    getPlayerArcadeNames([playerId]),
  ]);

  return {
    ...toPlayer(player),
    arcadeNames: arcadeNames(playerId),
    resultsCount: Number(results.count),
    lastResultGained: results.last_gained,
  };
};

export interface PlayerFields {
  nickname: string;
  email: string | null;
  region: string | null;
  telegramTag: string | null;
  telegramId: number | null;
  hidden: boolean;
  discardResults: boolean;
  isAdmin: boolean;
  canAddResultsManually: boolean;
  actualPlayerId: number | null;
  arcadeNames: ArcadeNames;
}

/**
 * Creates a player (no id) or saves all of a player's admin fields. Nicknames and arcade
 * names (per mix) must be unique. Hiding or unhiding a player sets hidden_since and bumps
 * last_updated_at of every chart they have results on, as the legacy admin did
 */
export const savePlayer = async (playerId: number | null, fields: PlayerFields) => {
  const nickname = fields.nickname.trim();
  if (!nickname) {
    throw error(400, 'Nickname is required');
  }
  const arcadeNames = normalizeArcadeNames(fields.arcadeNames, { upperCase: true });
  await checkUnique(playerId, nickname, arcadeNames);
  if (fields.actualPlayerId != null) {
    await checkAliasTarget(playerId, fields.actualPlayerId);
  }

  const before = playerId ? await getPlayer(playerId) : null;
  const row = {
    nickname,
    email: fields.email?.trim() || null,
    region: fields.region || null,
    telegram_tag: fields.telegramTag?.trim() || null,
    telegram_id: fields.telegramId,
    hidden: Number(fields.hidden),
    discard_results: Number(fields.discardResults),
    is_admin: Number(fields.isAdmin),
    can_add_results_manually: Number(fields.canAddResultsManually),
    actual_player_id: fields.actualPlayerId,
  };

  return db.transaction().execute(async (trx) => {
    const report: string[] = [];
    let id: number;

    if (before) {
      id = before.id;
      const hiddenChanged = before.hidden !== fields.hidden;
      await trx
        .updateTable('players')
        .set({ ...row, ...(hiddenChanged && { hidden_since: fields.hidden ? new Date() : null }) })
        .where('id', '=', id)
        .execute();
      report.push(...describeChanges(`Player #${id}`, { ...before, ...toRow(before) }, toRow(row)));

      if (hiddenChanged) {
        const { numUpdatedRows } = await trx
          .updateTable('shared_charts')
          .set({ last_updated_at: sql`UTC_TIMESTAMP(3)` })
          .where('id', 'in', (eb) =>
            eb.selectFrom('results').select('shared_chart').where('player_id', '=', id)
          )
          .executeTakeFirst();
        report.push(
          `Player #${id}: hidden status changed, marked updated on the charts they have results on (${numUpdatedRows})`
        );
      }
    } else {
      const { insertId } = await trx
        .insertInto('players')
        .values({ ...row, hidden_since: fields.hidden ? new Date() : null })
        .executeTakeFirstOrThrow();
      id = Number(insertId);
      report.push(`Player #${id} '${nickname}' created`);
    }

    report.push(
      ...(await saveArcadeNames(trx, 'player', id, before?.arcadeNames ?? null, arcadeNames))
    );
    return { id, report: report.length ? report : [`Player #${id}: nothing changed`] };
  });
};

// Compared for the report like the DB columns
const toRow = (player: {
  nickname: string;
  email: string | null;
  region: string | null;
  telegram_tag: string | null;
  telegram_id: number | null;
  hidden: boolean | number;
  discard_results: boolean | number | null;
  is_admin: boolean | number | null;
  can_add_results_manually: boolean | number | null;
  actual_player_id: number | null;
}) => ({
  nickname: player.nickname,
  email: player.email,
  region: player.region,
  telegram_tag: player.telegram_tag,
  telegram_id: player.telegram_id,
  hidden: Number(player.hidden),
  discard_results: Number(player.discard_results),
  is_admin: Number(player.is_admin),
  can_add_results_manually: Number(player.can_add_results_manually),
  actual_player_id: player.actual_player_id,
});

const checkUnique = async (playerId: number | null, nickname: string, arcadeNames: ArcadeNames) => {
  let nicknameQuery = db
    .selectFrom('players')
    .select(['id', 'nickname'])
    .where('nickname', '=', nickname);
  if (playerId != null) {
    nicknameQuery = nicknameQuery.where('id', '<>', playerId);
  }
  const sameNickname = await nicknameQuery.executeTakeFirst();
  if (sameNickname) {
    throw error(400, `Player #${sameNickname.id} already has nickname '${sameNickname.nickname}'`);
  }

  for (const mixId of ARCADE_NAME_MIXES) {
    const name = arcadeNames[mixId]?.name;
    if (!name) {
      continue;
    }
    let nameQuery = db
      .selectFrom('arcade_player_names')
      .select(['player_id', 'name'])
      .where('mix_id', '=', mixId)
      .where('name', '=', name);
    if (playerId != null) {
      nameQuery = nameQuery.where('player_id', '<>', playerId);
    }
    const sameName = await nameQuery.executeTakeFirst();
    if (sameName) {
      throw error(
        400,
        `Player #${sameName.player_id} already has ${MIX_NAME_BY_ID[mixId]} arcade name '${sameName.name}'`
      );
    }
  }
};

// Ingestion follows actual_player_id one step only, so an alias can't point at an alias
const checkAliasTarget = async (playerId: number | null, actualPlayerId: number) => {
  if (actualPlayerId === playerId) {
    throw error(400, "A player can't be an alias of themselves");
  }
  const target = await db
    .selectFrom('players')
    .select(['id', 'actual_player_id'])
    .where('id', '=', actualPlayerId)
    .executeTakeFirst();
  if (!target) {
    throw error(400, `Player #${actualPlayerId} doesn't exist`);
  }
  if (target.actual_player_id != null) {
    throw error(
      400,
      `Player #${actualPlayerId} is an alias of #${target.actual_player_id} itself: pick that player`
    );
  }
};
