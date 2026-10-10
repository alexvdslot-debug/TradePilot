-- B3 identity and settings: separate user-scoped records, no shared bearer secret.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY,
 auth_subject TEXT NOT NULL UNIQUE,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS user_settings (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 display_name TEXT NOT NULL DEFAULT '',
 locale TEXT NOT NULL DEFAULT 'nl-NL',
 timezone TEXT NOT NULL DEFAULT 'Europe/Amsterdam',
 display_currency TEXT NOT NULL DEFAULT 'EUR' CHECK(display_currency IN ('EUR','USD')),
 risk_budget_eur TEXT NOT NULL DEFAULT '100.00',
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>=1),
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_auth_subject ON users(auth_subject);
