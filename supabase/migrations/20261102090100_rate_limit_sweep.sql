-- Requires pg_cron (enabled on the DRIOZ Supabase project).
-- Expired rate-limit rows are swept here instead of on every API request.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'drioz-sweep-rate-limits';
    PERFORM cron.schedule('drioz-sweep-rate-limits', '*/5 * * * *',
      $job$DELETE FROM drioz_staging.rate_limits WHERE expires_at < (extract(epoch FROM now()) * 1000)::bigint$job$);
  END IF;
END $$;
