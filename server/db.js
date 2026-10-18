const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const dbPath = path.join(DATA_DIR, 'kwall.db');
const db = new Database(dbPath);

// Enable WAL mode for high concurrency and enforce foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      bio TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      location TEXT DEFAULT '',
      role TEXT DEFAULT 'user', -- 'user', 'moderator', 'admin'
      account_status TEXT DEFAULT 'active', -- 'active', 'suspended'
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      message TEXT NOT NULL,
      location TEXT DEFAULT '',
      date_utc TEXT NOT NULL, -- YYYY-MM-DD in UTC
      created_at TEXT NOT NULL,
      status TEXT DEFAULT 'published', -- 'published', 'flagged', 'hidden'
      views_count INTEGER DEFAULT 0
    );

    -- Enforce strictly 1 post per user per calendar day (UTC)
    CREATE TABLE IF NOT EXISTS daily_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date_utc TEXT NOT NULL, -- YYYY-MM-DD
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      CONSTRAINT unique_user_daily_upload UNIQUE (user_id, date_utc)
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_message_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      CONSTRAINT unique_conversation_pair UNIQUE (user1_id, user2_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL, -- 'post', 'user', 'message'
      target_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      details TEXT DEFAULT '',
      status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'dismissed', 'actioned'
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id)
    );

    CREATE INDEX IF NOT EXISTS idx_posts_date_utc ON posts(date_utc);
    CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
    CREATE INDEX IF NOT EXISTS idx_daily_uploads_lookup ON daily_uploads(user_id, date_utc);
    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_messages_receiver_read ON messages(receiver_id, is_read);
  `);

  try {
    db.exec("ALTER TABLE posts ADD COLUMN poster_style TEXT DEFAULT 'default'");
  } catch(e) {}
  try {
    db.exec("ALTER TABLE posts ADD COLUMN aspect_ratio TEXT DEFAULT 'standard'");
  } catch(e) {}
}

initSchema();

// Helper to get current UTC date string YYYY-MM-DD
function getTodayUtcDate() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Helper to calculate seconds and formatted countdown until next UTC midnight
function getUtcCountdown() {
  const now = new Date();
  const nextMidnightUtc = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  
  const totalSeconds = Math.max(0, Math.floor((nextMidnightUtc.getTime() - now.getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formatted = [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0')
  ].join(':');

  return {
    todayUtc: getTodayUtcDate(),
    nextMidnightUtc: nextMidnightUtc.toISOString(),
    totalSeconds,
    hours,
    minutes,
    seconds,
    formatted
  };
}

module.exports = {
  db,
  getTodayUtcDate,
  getUtcCountdown,
  UPLOADS_DIR
};
