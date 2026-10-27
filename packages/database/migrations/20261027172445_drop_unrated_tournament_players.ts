import { Kysely, sql } from 'kysely';

/**
 * Unrated players are no longer put in Easy: they pick a bracket themselves. This takes
 * the unrated players without a result out of the ended tournaments, so their brackets
 * list only the players who played. `down` can't tell them apart any more and does nothing
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    DELETE tpb FROM tournament_player_brackets tpb
    JOIN tournaments t ON t.id = tpb.tournament_id
    LEFT JOIN tournament_results tr
      ON tr.tournament_id = tpb.tournament_id AND tr.player_id = tpb.player_id
    WHERE t.state = 'Ended'
      AND tpb.skill_level IS NULL
      AND tr.id IS NULL
  `.execute(db);
}

export async function down(): Promise<void> {}
