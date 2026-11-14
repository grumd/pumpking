import { Kysely, sql } from 'kysely';

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
  await renameTables(
    db,
    Object.fromEntries(Object.entries(PARKED).map(([from, to]) => [to, from]))
  );
}
