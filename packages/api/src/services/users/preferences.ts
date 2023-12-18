import { db } from 'db';
import { PlayerPreferencesJson } from 'types/database';

export const updatePreferences = async (
  userId: number,
  preferences: Partial<PlayerPreferencesJson>
) => {
  const prevPreferences = await db
    .selectFrom('players')
    .select(['preferences'])
    .where('id', '=', userId)
    .executeTakeFirst();

  await db
    .updateTable('players')
    .set({
      preferences: JSON.stringify({
        ...(prevPreferences?.preferences ?? {}),
        ...(preferences ?? {}),
      }),
    })
    .where('id', '=', userId)
    .execute();

  return await db
    .selectFrom('players')
    .select([
      'players.nickname',
      'players.id',
      'players.is_admin',
      'players.can_add_results_manually',
      'players.preferences',
      'players.region',
    ])
    .where('id', '=', userId)
    .executeTakeFirst();
};
