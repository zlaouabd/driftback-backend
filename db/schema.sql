CREATE TABLE IF NOT EXISTS memory_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  episode_id TEXT NOT NULL,
  concept TEXT NOT NULL,
  explanation TEXT NOT NULL,
  ts_seconds REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_memory_user_ts ON memory_events(user_id, ts_seconds);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  episode_id TEXT NOT NULL,
  episode_title TEXT,
  start_seconds REAL NOT NULL,
  end_seconds REAL NOT NULL,
  transcript TEXT,
  caption TEXT,
  clip_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
