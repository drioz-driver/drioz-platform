import { rootCertificates } from 'node:tls';
import supabaseCa from './certificates/supabase-ca.json' with { type: 'json' };

export function postgresOptions(connectionString) {
  const url = new URL(connectionString);
  // pg URL SSL settings override the explicit CA object. Keep one verified source.
  for (const key of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'ssl']) url.searchParams.delete(key);
  return {
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true, ca: [...rootCertificates, supabaseCa.certificate] },
  };
}
