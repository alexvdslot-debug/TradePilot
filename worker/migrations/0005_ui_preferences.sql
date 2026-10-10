-- Additive user-scoped preferences; existing account and ledger records remain intact.
ALTER TABLE user_settings ADD COLUMN preferences_json TEXT NOT NULL DEFAULT '{"showUSD":true,"defaultInterval":"15min","inAppAlerts":true,"maxPositionPercent":"25.00","hideAmounts":false}' CHECK(json_valid(preferences_json));
