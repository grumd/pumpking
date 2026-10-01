import { db, type Transaction } from '@pumpking/database/db';
import { ARCADE_NAME_MIXES, MIX_NAME_BY_ID } from '@pumpking/utils/mixes';

/**
 * Arcade names: the names players and tracks have on the arcade screen, per mix
 * (`arcade_player_names`, `arcade_track_names`). Ingestion matches recognized names
 * against them
 */

export interface ArcadeName {
  name: string;
  // How many edits (Levenshtein distance) a recognized name may be off by and still match
  edist: number;
}

// Arcade names by mix id, for the mixes in ARCADE_NAME_MIXES
export type ArcadeNames = Record<number, ArcadeName | null>;

// Arcade names by mix of each id, from `arcade_player_names` or `arcade_track_names` rows
const groupArcadeNames = (
  rows: { id: number; mix_id: number; name: string; name_edist: number }[]
) => {
  const byId = new Map<number, ArcadeNames>();
  for (const row of rows) {
    const names = byId.get(row.id) ?? {};
    names[row.mix_id] = { name: row.name, edist: row.name_edist };
    byId.set(row.id, names);
  }
  return (id: number): ArcadeNames =>
    Object.fromEntries(ARCADE_NAME_MIXES.map((mixId) => [mixId, byId.get(id)?.[mixId] ?? null]));
};

export const getPlayerArcadeNames = async (playerIds?: number[]) => {
  let query = db
    .selectFrom('arcade_player_names')
    .select(['player_id as id', 'mix_id', 'name', 'name_edist'])
    .where('mix_id', 'in', ARCADE_NAME_MIXES);
  if (playerIds) {
    query = query.where('player_id', 'in', playerIds);
  }
  return groupArcadeNames(await query.execute());
};

export const getTrackArcadeNames = async (trackIds?: number[]) => {
  let query = db
    .selectFrom('arcade_track_names')
    .select(['track_id as id', 'mix_id', 'name', 'name_edist'])
    .where('mix_id', 'in', ARCADE_NAME_MIXES);
  if (trackIds) {
    query = query.where('track_id', 'in', trackIds);
  }
  return groupArcadeNames(await query.execute());
};

// Trims the names; an empty one means no name on that mix. Player names are stored upper
// case, like the recognized names they're matched with
export const normalizeArcadeNames = (
  arcadeNames: ArcadeNames,
  { upperCase }: { upperCase: boolean }
): ArcadeNames =>
  Object.fromEntries(
    ARCADE_NAME_MIXES.map((mixId) => {
      const arcadeName = arcadeNames[mixId];
      const trimmed = arcadeName?.name.trim() ?? '';
      const name = upperCase ? trimmed.toUpperCase() : trimmed;
      return [mixId, arcadeName && name ? { name, edist: arcadeName.edist } : null];
    })
  );

/**
 * Saves a player's or track's arcade names: a name upserts the row for its mix, an empty
 * name deletes it (the columns are NOT NULL, so "no name" is no row)
 */
export const saveArcadeNames = async (
  trx: Transaction,
  kind: 'player' | 'track',
  id: number,
  before: ArcadeNames | null,
  after: ArcadeNames
) => {
  const report: string[] = [];
  const label = `${kind === 'player' ? 'Player' : 'Track'} #${id}`;

  for (const mixId of ARCADE_NAME_MIXES) {
    const old = before?.[mixId] ?? null;
    const next = after[mixId] ?? null;
    if (old?.name === next?.name && old?.edist === next?.edist) {
      continue;
    }
    const mixName = MIX_NAME_BY_ID[mixId];

    if (next) {
      const row = { mix_id: mixId, name: next.name, name_edist: next.edist };
      if (kind === 'player') {
        await trx
          .insertInto('arcade_player_names')
          .values({ ...row, player_id: id })
          .onDuplicateKeyUpdate({ name: next.name, name_edist: next.edist })
          .execute();
      } else {
        await trx
          .insertInto('arcade_track_names')
          .values({ ...row, track_id: id })
          .onDuplicateKeyUpdate({ name: next.name, name_edist: next.edist })
          .execute();
      }
      report.push(
        `${label}: ${mixName} arcade name ${old ? `'${old.name}' (${old.edist})` : '—'} → '${
          next.name
        }' (${next.edist})`
      );
    } else {
      if (kind === 'player') {
        await trx
          .deleteFrom('arcade_player_names')
          .where('mix_id', '=', mixId)
          .where('player_id', '=', id)
          .execute();
      } else {
        await trx
          .deleteFrom('arcade_track_names')
          .where('mix_id', '=', mixId)
          .where('track_id', '=', id)
          .execute();
      }
      report.push(`${label}: ${mixName} arcade name '${old?.name}' removed`);
    }
  }
  return report;
};
