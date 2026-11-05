/**
 * Recognises "the code is newer than the database" errors (Postgres 42P01/42703, SQLite "no such …")
 * so users see an actionable message instead of a generic failure after a deploy.
 */
export function databaseOutOfDate(error:unknown){
 const e=error as {code?:string;message?:string}|null;
 return !!e&&(e.code==='42P01'||e.code==='42703'||/no such (table|column)|relation .* does not exist|column .* does not exist/i.test(String(e.message||'')));
}
export const MIGRATIONS_PENDING={
 message:'You are signed in, but the DRIOZ database is out of date. Run the latest file in supabase/migrations (20261030090000_v5_features.sql) in the Supabase SQL editor, then refresh.',
 code:'migrations_pending',
};
