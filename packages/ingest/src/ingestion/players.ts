import { UnrecognizedResult } from './errors';
import type { DB } from '@pumpking/database/database';
import { distance } from 'fastest-levenshtein';
import type { Kysely } from 'kysely';

// Phoenix 2 shows player names as `NICKNAME #1234`: the spaces are part of the name there
const MIX_NAMES_WITH_IDS_IN_PLAYER_NAMES = ['Phoenix2'];

/**
 * The player whose arcade name on the mix is closest to the recognized one, within that
 * name's tolerance (`arcade_player_names.name_edist`). Two names nearly as close are too
 * ambiguous to pick from (edit distances are Levenshtein, as the legacy `editdistance`).
 * An alias account resolves to its actual player (one step).
 * Throws an UnrecognizedResult when no player fits
 */
export const findPlayer = async (
  db: Kysely<DB>,
  mix: { id: number; name: string },
  recognizedName: string
) => {
  const mixName = mix.name;
  const playerName = MIX_NAMES_WITH_IDS_IN_PLAYER_NAMES.includes(mixName)
    ? recognizedName
    : recognizedName.replaceAll(' ', '');

  const candidates = (
    await db
      .selectFrom('players')
      .innerJoin('arcade_player_names as apn', 'apn.player_id', 'players.id')
      .select([
        'players.id',
        'players.nickname',
        'players.discard_results',
        'players.actual_player_id',
        'apn.name',
        'apn.name_edist',
      ])
      .where('apn.mix_id', '=', mix.id)
      .orderBy('players.id')
      .execute()
  )
    .map((player) => ({ ...player, editDistance: distance(playerName, player.name) }))
    .sort((a, b) => a.editDistance - b.editDistance);

  const allowed = candidates.filter((player) => player.editDistance <= player.name_edist);
  if (allowed.length === 0) {
    const closest = candidates[0];
    throw new UnrecognizedResult(
      closest
        ? `Unknown player ${playerName} for mix ${mixName}, closest is ${closest.name} with ${closest.editDistance} edits`
        : `Unknown player ${playerName} for mix ${mixName}, no similar name`
    );
  }

  const [first, second] = allowed;
  if (second && first.editDistance > 0 && second.editDistance - first.editDistance <= 1) {
    throw new UnrecognizedResult(
      `Unknown player ${playerName}, can't decide between ${first.name} with ${first.editDistance} edits and ${second.name} with ${second.editDistance} edits`
    );
  }

  if (first.actual_player_id == null) {
    return first;
  }
  const actualPlayer = await db
    .selectFrom('players')
    .select(['id', 'nickname', 'discard_results', 'actual_player_id'])
    .where('id', '=', first.actual_player_id)
    .executeTakeFirst();
  if (!actualPlayer) {
    throw new UnrecognizedResult(
      `Invalid actual_player_id ${first.actual_player_id} specified for player ${first.id}`
    );
  }
  return actualPlayer;
};
