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
type Transaction = (work: (query: Query) => Promise<any>) => Promise<any>;
// batchTransaction may retry: a batch is pure SQL, so re-running it after a rollback is safe.
export function databaseAdapter(query: Query, transaction: Transaction, batchTransaction: Transaction = transaction) {
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
    transaction: <T>(work:(db:any)=>Promise<T>):Promise<T> => transaction(run=>work(databaseAdapter(run,nested=>nested(run)))),
    batch: (statements: ReturnType<typeof statement>[]) => batchTransaction(async run => {
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
  type Isolation = 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
  // BEGIN and the transaction-local settings travel in one round trip.
  // SET LOCAL also works through transaction poolers; no connection session state leaks.
  async function once(work: (query: Query) => Promise<any>, isolation: Isolation) {
    const client = await active.connect();
    try {
      await client.query(`BEGIN ISOLATION LEVEL ${isolation}; SET LOCAL search_path=drioz_staging; SET LOCAL statement_timeout='15s'`);
      const result = await work((sql, args) => client.query(sql, args));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally { client.release(); }
  }
  // Callers of db.transaction() (payments, wallet, ride offers) already retry their own work.
  const transaction = (work: (query: Query) => Promise<any>) => once(work, 'SERIALIZABLE');
  // Serializable batches can be aborted by concurrent writers (40001) or deadlocks (40P01).
  // The whole batch rolled back, so re-running it is safe. Retry with jitter instead of failing the user.
  async function retrying(work: (query: Query) => Promise<any>, isolation: Isolation = 'SERIALIZABLE') {
    for (let attempt = 0; ; attempt++) {
      try { return await once(work, isolation); }
      catch (error: any) {
        if (attempt >= 3 || !['40001', '40P01'].includes(error?.code)) throw error;
        await new Promise(resolve => setTimeout(resolve, 15 * 2 ** attempt + Math.random() * 25));
      }
    }
  }
  // A single statement is already atomic; SERIALIZABLE adds abort risk without adding safety.
  const query: Query = (sql, args) => once(run => run(sql, args), 'READ COMMITTED');
  return {...databaseAdapter(query, transaction, retrying),
    // One consistent view for the whole dashboard read without serializable aborts.
    readSnapshot: <T>(work: (db: ReturnType<typeof databaseAdapter>) => Promise<T>) => retrying(run => work(databaseAdapter(run, nested => nested(run))), 'REPEATABLE READ'),
  };
}
