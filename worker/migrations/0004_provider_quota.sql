-- Shared provider budgets only; no user, account, key, symbol, or portfolio records.
CREATE TABLE IF NOT EXISTS provider_quota (
 provider TEXT PRIMARY KEY,
 minute_window INTEGER NOT NULL CHECK(minute_window>=0),
 minute_count INTEGER NOT NULL CHECK(minute_count BETWEEN 1 AND 8),
 day_window INTEGER NOT NULL CHECK(day_window>=0),
 day_count INTEGER NOT NULL CHECK(day_count BETWEEN 1 AND 800)
);
