-- Time-and-distance rate card per city (JSON). Empty object keeps the legacy flat pricing.
ALTER TABLE drioz_staging.cities ADD COLUMN IF NOT EXISTS pricing text NOT NULL DEFAULT '{}';
