-- Additive background admission counters; no account, preference or ledger rows changed.
ALTER TABLE provider_quota ADD COLUMN background_minute_count INTEGER NOT NULL DEFAULT 0 CHECK(background_minute_count BETWEEN 0 AND 4);
ALTER TABLE provider_quota ADD COLUMN background_day_count INTEGER NOT NULL DEFAULT 0 CHECK(background_day_count BETWEEN 0 AND 300);
CREATE TABLE IF NOT EXISTS alert_scheduler (
 name TEXT PRIMARY KEY CHECK(name='price-alerts'),
 lease_owner TEXT NOT NULL DEFAULT '',
 lease_until_ms INTEGER NOT NULL DEFAULT 0 CHECK(lease_until_ms>=0),
 cursor_key TEXT NOT NULL DEFAULT '',
 last_run_ms INTEGER NOT NULL DEFAULT 0 CHECK(last_run_ms>=0),
 last_outcome TEXT NOT NULL DEFAULT 'never'
);
