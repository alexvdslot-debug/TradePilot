# Existing holding snapshot

OPENING_POSITION records an existing quantity and average cost at a declared snapshot time. It creates inventory without a purchase, deposit, cash change or realized return. Fees are rejected because the supplied average cost already defines the basis. It must precede all other records for that symbol. Sales subsequently use the exact average cost; history before the snapshot remains unknown.

Lesson: existing holdings require a distinct opening event. Never synthesize cash deposits or historic purchases from a current quantity and average cost.

Validation: independent decimal arithmetic confirms 15722 × 2.363387 = 37157.170414 USD. Hand-calculated expected test values must be independently checked. Browser registration works in Chromium and WebKit without cash changes.
