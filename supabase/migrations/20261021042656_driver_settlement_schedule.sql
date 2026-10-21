-- Schedule is database-owned; no application or external HTTP credential is required.
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('drioz-driver-earnings-release','*/15 * * * *','SELECT drioz_staging.driver_release_earnings()');
