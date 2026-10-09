-- TradePilot Pro D1 schema. Run only after authenticated API endpoints are ready.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL CHECK(length(symbol) BETWEEN 1 AND 10),
  side TEXT NOT NULL CHECK(side IN ('BUY','SELL')),
  quantity REAL NOT NULL CHECK(quantity > 0),
  price_usd REAL NOT NULL CHECK(price_usd > 0),
  fee_eur REAL NOT NULL DEFAULT 0 CHECK(fee_eur >= 0),
  eur_per_usd REAL NOT NULL CHECK(eur_per_usd > 0),
  executed_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id,executed_at,id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_symbol ON transactions(account_id,symbol);
