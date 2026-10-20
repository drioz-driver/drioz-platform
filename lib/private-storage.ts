import { createClient } from '@supabase/supabase-js';

// Call only after application-level ownership/role checks in operations.ts.
export function privateStorage() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!url || !key || !bucket) return undefined;
  const storage = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage.from(bucket);
  return {
    async get(path: string) {
      const { data, error } = await storage.createSignedUrl(path, 60, { download: true });
      if (error) throw new Error('Private document download unavailable');
      return { downloadUrl: data.signedUrl };
    },
    async put(path: string, bytes: Uint8Array, options: { httpMetadata: { contentType: string } }) {
      const { error } = await storage.upload(path, bytes, {
        contentType: options.httpMetadata.contentType, upsert: false,
      });
      if (error) throw new Error('Private document upload unavailable');
    },
    async delete(path: string) {
      const { error } = await storage.remove([path]);
      if (error) throw new Error('Private document cleanup unavailable');
    },
    maxUploadBytes: 4 * 1024 * 1024,
  };
}
