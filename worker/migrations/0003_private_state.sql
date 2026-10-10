-- Additive private state storage. No existing records are altered.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS user_state (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 state_json TEXT NOT NULL CHECK(json_valid(state_json)),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>=1),
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
