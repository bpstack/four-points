// config/timezone.ts
// The backend runs in UTC on every machine, as it does on Render (ADR-047).
// Imported first by index.ts: Node reads TZ when it next builds a Date. Business
// dates ("today", the hotel day) come from config/date-utils.ts, in Madrid.

process.env.TZ = 'UTC'
