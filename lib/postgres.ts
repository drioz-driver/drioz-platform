import { Pool, types } from 'pg';
import { postgresOptions } from './postgres-options.mjs';

// Domain timestamps are epoch milliseconds, safely inside JavaScript's integer range.
types.setTypeParser(20, value => {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error('Database integer exceeds safe range');
  return number;
});

export function parameterize(sql: string) {
  let position = 0;
  // Only translate placeholders outside SQL strings and quoted identifiers.
  return sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|\?/g,
    token => token === '?' ? '$' + (++position) : token);
}

type Query = (sql: string, args: any[]) => Promise<{ rows: any[]; rowCount: number | null }>;
export function databaseAdapter(query: Query, transaction: (work: (query: Query) => Promise<any>) => Promise<any>) {
  function statement(sql: string, args: any[] = []) {
    async function execute(run: Query = query) {
      const result = await run(parameterize(sql), args);
      return { results: result.rows, meta: { changes: result.rowCount || 0 } };
    }
    return {
      bind: (...values: any[]) => statement(sql, values),
      all: () => execute(),
      first: async () => (await execute()).results[0] || null,
      run: () => execute(),
      execute,
    };
  }
  return {
    prepare: statement,
    batch: (statements: ReturnType<typeof statement>[]) => transaction(async run => {
      const results = [];
      for (const statement of statements) results.push(await statement.execute(run));
      return results;
    }),
  };
}

let pool: Pool | undefined;
export function postgresDatabase() {
  if (!process.env.DATABASE_URL) return undefined;
  if (!pool) pool = new Pool({
    ...postgresOptions(process.env.DATABASE_URL),
    max: 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000,
  });
  const active = pool;
  async function transaction(work: (query: Query) => Promise<any>) {
    const client = await active.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      await client.query("SET LOCAL search_path=drioz_staging; SET LOCAL statement_timeout='15s'");
      const result = await work((sql, args) => client.query(sql, args));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
  // SET LOCAL also works through transaction poolers; no connection session state leaks.
  const query: Query = (sql, args) => transaction(run => run(sql, args));
  return databaseAdapter(query, transaction);
}
