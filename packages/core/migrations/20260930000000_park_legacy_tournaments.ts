import { Kysely, sql } from 'kysely';

/**
 * Migration A of the tournament relaunch (docs/tournaments/PLAN.md): the legacy
 * tables are shaped for a per-mix system with a voting window and mostly-NULL
 * columns, so instead of teaching the new code to tolerate that shape we park
 * the history under new names and let the next migration create clean tables
 * under the original names.
 *
 * Renaming instead of deleting keeps the clear reversible and 6 years of
 * history queryable (`SELECT * FROM tournaments_legacy_2026`). If the history
 * is never wanted again, a later migration drops the *_legacy_2026 tables.
 *
 * Before applying to a database with real rows, take a plain
 * `mysqldump --no-create-info` of the three tables and archive it off-repo.
 *
 * The retired Python API (piu-top) writes `tournaments` from a cron on the 1st
 * of each month; from here on that job fails on the missing table. That is the
 * point - see the cutover order in the plan.
 */
const PARKED: Record<string, string> = {
  tournaments: 'tournaments_legacy_2026',
  tournament_brackets: 'tournament_brackets_legacy_2026',
  tournament_charts: 'tournament_charts_legacy_2026',
};

const hasTable = async (db: Kysely<any>, table: string): Promise<boolean> => {
  const { rows } = await sql<{ c: number }>`
    SELECT COUNT(*) AS c
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = ${table}
  `.execute(db);

  return Number(rows[0]?.c ?? 0) > 0;
};

/**
 * Rename every `from` that exists while its `to` does not. One RENAME TABLE
 * statement, so the swap is atomic; InnoDB re-points the FKs between these
 * tables at the new names, which is why they are renamed together.
 */
const renameTables = async (db: Kysely<any>, pairs: Record<string, string>) => {
  const clauses: string[] = [];

  for (const [from, to] of Object.entries(pairs)) {
    if (await hasTable(db, from)) {
      if (await hasTable(db, to)) {
        throw new Error(`Cannot rename ${from} to ${to}: target table already exists`);
      }
      clauses.push(`\`${from}\` TO \`${to}\``);
    } else if (!(await hasTable(db, to))) {
      throw new Error(`Neither ${from} nor ${to} exists - nothing to rename`);
    }
  }

  if (clauses.length === 0) {
    return;
  }

  await sql.raw(`RENAME TABLE ${clauses.join(', ')}`).execute(db);
};

export async function up(db: Kysely<any>): Promise<void> {
  await renameTables(db, PARKED);
}

export async function down(db: Kysely<any>): Promise<void> {
  // The new tables have to be gone first (the rollback of the next migration
  // drops them), otherwise the names are taken.
  await renameTables(
    db,
    Object.fromEntries(Object.entries(PARKED).map(([from, to]) => [to, from]))
  );
}
