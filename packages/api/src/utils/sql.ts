export function replaceSqlParams(obj: { sql: string; parameters: readonly unknown[] }) {
  return obj.parameters.reduce((sql: string, param) => sql.replace('?', String(param)), obj.sql);
}
