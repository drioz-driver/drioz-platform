import {readFileSync,readdirSync} from 'node:fs';
/** Full production schema for PGlite tests: staging base + every Supabase migration, in order. */
export function schemaSql(){
 const dir=new URL('../supabase/migrations/',import.meta.url);
 const migrations=readdirSync(dir).filter(n=>n.endsWith('.sql')&&!readFileSync(new URL(n,dir),'utf8').includes('pg_cron')).sort().map(n=>readFileSync(new URL(n,dir),'utf8'));
 return 'BEGIN;'+readFileSync(new URL('../db/postgres-staging.sql',import.meta.url),'utf8')+';CREATE ROLE anon;CREATE ROLE authenticated;'+migrations.join(';')+';COMMIT;SET search_path=drioz_staging;';
}
