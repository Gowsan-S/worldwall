const path = require('path');
const fs = require('fs');
const os = require('os');

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

// Ensure UPLOADS_DIR is writable (safe for read-only lambdas on Vercel)
let UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (e) {
  UPLOADS_DIR = path.join(os.tmpdir(), 'worldwall-uploads');
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  } catch (err) {}
}

function initSchema(sqliteDb) {
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      bio TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      location TEXT DEFAULT '',
      role TEXT DEFAULT 'user',
      account_status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      message TEXT NOT NULL,
      location TEXT DEFAULT '',
      date_utc TEXT NOT NULL,
      created_at TEXT NOT NULL,
      status TEXT DEFAULT 'published',
      views_count INTEGER DEFAULT 0,
      poster_style TEXT DEFAULT 'default',
      aspect_ratio TEXT DEFAULT 'standard'
    );

    CREATE TABLE IF NOT EXISTS daily_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date_utc TEXT NOT NULL,
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
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      details TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
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

  try { sqliteDb.exec("ALTER TABLE posts ADD COLUMN poster_style TEXT DEFAULT 'default'"); } catch(e) {}
  try { sqliteDb.exec("ALTER TABLE posts ADD COLUMN aspect_ratio TEXT DEFAULT 'standard'"); } catch(e) {}
}

// In-Memory Database for Vercel Serverless environment
function createUniversalMemoryDb() {
  console.log('[World Wall DB] Initializing Universal In-Memory Store...');
  let seed = { users: [], posts: [] };
  try {
    const seedPath = path.join(__dirname, 'seed-data.json');
    if (fs.existsSync(seedPath)) {
      seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
      console.log(`[World Wall DB] Loaded seed data: ${seed.users?.length || 0} users, ${seed.posts?.length || 0} posts.`);
    }
  } catch (e) {
    console.warn('[World Wall DB] Notice: seed-data.json not loaded, starting fresh:', e.message);
  }

  const users = (seed.users || []).map(u => ({ ...u }));
  const posts = (seed.posts || []).map(p => ({ ...p }));
  const daily_uploads = [];
  const conversations = [];
  const messages = [];
  const reports = [];
  const blocks = [];

  let nextUserId = users.reduce((max, u) => Math.max(max, u.id || 0), 0) + 1;
  let nextPostId = posts.reduce((max, p) => Math.max(max, p.id || 0), 0) + 1;
  let nextConvId = 1;
  let nextMsgId = 1;
  let nextReportId = 1;
  let nextBlockId = 1;
  let nextDailyId = 1;

  function executeSelect(sql, lower, params) {
    // 1. users queries
    if (lower.includes('from users')) {
      if (lower.includes('count(*)')) {
        return [{ count: users.length }];
      }
      if (lower.includes('where username = ? or email = ? or lower(display_name) = ?')) {
        const p0 = String(params[0] || '').toLowerCase();
        const p1 = String(params[1] || '').toLowerCase();
        const p2 = String(params[2] || '').toLowerCase();
        const found = users.find(u => 
          (u.username && u.username.toLowerCase() === p0) || 
          (u.email && u.email.toLowerCase() === p1) || 
          (u.display_name && u.display_name.toLowerCase() === p2)
        );
        return found ? [{ ...found }] : [];
      }
      if (lower.includes('where username = ? or email = ?')) {
        const p0 = String(params[0] || '').toLowerCase();
        const p1 = String(params[1] || '').toLowerCase();
        const found = users.find(u => 
          (u.username && u.username.toLowerCase() === p0) || 
          (u.email && u.email.toLowerCase() === p1)
        );
        return found ? [{ ...found }] : [];
      }
      if (lower.includes('where id = ?')) {
        const id = Number(params[0]);
        const found = users.find(u => u.id === id);
        return found ? [{ ...found }] : [];
      }
      if (lower.includes('where username = ?')) {
        const name = String(params[0] || '').toLowerCase();
        const found = users.find(u => u.username && u.username.toLowerCase() === name);
        return found ? [{ ...found }] : [];
      }
    }

    // 2. posts queries
    if (lower.includes('from posts')) {
      if (lower.includes('count(*) as count') || lower.includes('count(*)')) {
        const activeUserIds = new Set(users.filter(u => u.account_status === 'active').map(u => u.id));
        const count = posts.filter(p => p.status === 'published' && activeUserIds.has(p.user_id)).length;
        return [{ count }];
      }
      if (lower.includes('count(*) as total_posts')) {
        const uid = Number(params[0]);
        const count = posts.filter(p => p.user_id === uid && p.status === 'published').length;
        return [{ total_posts: count }];
      }
      if (lower.includes('join users') && lower.includes('where p.status = \'published\'')) {
        const activeUserMap = new Map(users.filter(u => u.account_status === 'active').map(u => [u.id, u]));
        let list = posts
          .filter(p => p.status === 'published' && activeUserMap.has(p.user_id))
          .map(p => {
            const u = activeUserMap.get(p.user_id) || {};
            return {
              id: p.id,
              image_url: p.image_url,
              message: p.message,
              location: p.location || '',
              date_utc: p.date_utc,
              created_at: p.created_at,
              views_count: p.views_count || 0,
              poster_style: p.poster_style || 'default',
              aspect_ratio: p.aspect_ratio || 'standard',
              user_id: u.id,
              username: u.username || 'traveler',
              display_name: u.display_name || 'Traveler',
              avatar_url: u.avatar_url || '',
              user_location: u.location || ''
            };
          });

        if (lower.includes('views_count desc')) {
          list.sort((a, b) => (b.views_count || 0) - (a.views_count || 0) || new Date(b.created_at) - new Date(a.created_at));
        } else if (lower.includes('random()')) {
          list.sort(() => Math.random() - 0.5);
        } else {
          list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        const limit = params[0] !== undefined ? Number(params[0]) : 200;
        const offset = params[1] !== undefined ? Number(params[1]) : 0;
        return list.slice(offset, offset + limit);
      }
      if (lower.includes('where p.id = ?') || lower.includes('where id = ?')) {
        const id = Number(params[0]);
        const p = posts.find(item => item.id === id);
        if (!p) return [];
        const u = users.find(item => item.id === p.user_id) || {};
        return [{
          id: p.id,
          image_url: p.image_url,
          message: p.message,
          location: p.location || '',
          date_utc: p.date_utc,
          created_at: p.created_at,
          views_count: p.views_count || 0,
          poster_style: p.poster_style || 'default',
          aspect_ratio: p.aspect_ratio || 'standard',
          status: p.status || 'published',
          user_id: u.id,
          username: u.username || 'traveler',
          display_name: u.display_name || 'Traveler',
          avatar_url: u.avatar_url || '',
          user_location: u.location || ''
        }];
      }
      if (lower.includes('where user_id = ?') || lower.includes('where p.user_id = ?')) {
        const uid = Number(params[0]);
        const list = posts
          .filter(p => p.user_id === uid && p.status === 'published')
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return list;
      }
      if (lower.includes('where date_utc = ?')) {
        const dt = String(params[0]);
        return posts.filter(p => p.date_utc === dt);
      }
    }

    // 3. daily_uploads queries
    if (lower.includes('from daily_uploads')) {
      if (lower.includes('where user_id = ? and date_utc = ?')) {
        const uid = Number(params[0]);
        const dt = String(params[1]);
        const found = daily_uploads.find(d => d.user_id === uid && d.date_utc === dt);
        return found ? [{ ...found }] : [];
      }
    }

    // 4. blocks queries
    if (lower.includes('from blocks')) {
      if (lower.includes('or (blocker_id = ? and blocked_id = ?)')) {
        const b1 = Number(params[0]), b2 = Number(params[1]), b3 = Number(params[2]), b4 = Number(params[3]);
        const found = blocks.find(b => (b.blocker_id === b1 && b.blocked_id === b2) || (b.blocker_id === b3 && b.blocked_id === b4));
        return found ? [{ ...found }] : [];
      }
      if (lower.includes('where blocker_id = ? and blocked_id = ?')) {
        const b1 = Number(params[0]), b2 = Number(params[1]);
        const found = blocks.find(b => b.blocker_id === b1 && b.blocked_id === b2);
        return found ? [{ ...found }] : [];
      }
      if (lower.includes('where b.blocker_id = ?')) {
        const uid = Number(params[0]);
        const userMap = new Map(users.map(u => [u.id, u]));
        return blocks
          .filter(b => b.blocker_id === uid)
          .map(b => {
            const u = userMap.get(b.blocked_id) || {};
            return {
              id: b.id,
              blocked_id: b.blocked_id,
              username: u.username || '',
              display_name: u.display_name || '',
              avatar_url: u.avatar_url || '',
              blocked_at: b.created_at
            };
          });
      }
    }

    // 5. conversations queries
    if (lower.includes('from conversations')) {
      if (lower.includes('where user1_id = ? and user2_id = ?')) {
        const u1 = Number(params[0]), u2 = Number(params[1]);
        const found = conversations.find(c => c.user1_id === u1 && c.user2_id === u2);
        return found ? [{ ...found }] : [];
      }
      if (lower.includes('where c.user1_id = ? or c.user2_id = ?')) {
        const uid = Number(params[0]);
        return conversations
          .filter(c => c.user1_id === uid || c.user2_id === uid)
          .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at))
          .map(c => ({
            conversation_id: c.id,
            last_message_at: c.last_message_at,
            created_at: c.created_at,
            other_user_id: c.user1_id === uid ? c.user2_id : c.user1_id
          }));
      }
    }

    // 6. messages queries
    if (lower.includes('from messages')) {
      if (lower.includes('order by created_at desc limit 1')) {
        const cid = Number(params[0]);
        const list = messages.filter(m => m.conversation_id === cid).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return list.length ? [{ ...list[0] }] : [];
      }
      if (lower.includes('count(*) as count') && lower.includes('is_read = 0')) {
        const cid = Number(params[0]), rid = Number(params[1]);
        const count = messages.filter(m => m.conversation_id === cid && m.receiver_id === rid && !m.is_read).length;
        return [{ count }];
      }
      if (lower.includes('where conversation_id = ?')) {
        const cid = Number(params[0]);
        return messages.filter(m => m.conversation_id === cid).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).slice(0, 100);
      }
      if (lower.includes('where id = ?')) {
        const id = Number(params[0]);
        const found = messages.find(m => m.id === id);
        return found ? [{ ...found }] : [];
      }
    }

    // 7. reports queries
    if (lower.includes('from reports')) {
      if (lower.includes('count(*) as count') && lower.includes('status = \'pending\'')) {
        const tid = Number(params[0]);
        const count = reports.filter(r => r.target_type === 'post' && r.target_id === tid && r.status === 'pending').length;
        return [{ count }];
      }
      if (lower.includes('where id = ?')) {
        const id = Number(params[0]);
        const found = reports.find(r => r.id === id);
        return found ? [{ ...found }] : [];
      }
      const userMap = new Map(users.map(u => [u.id, u]));
      return reports.slice(0, 100).map(r => {
        const u = userMap.get(r.reporter_id) || {};
        return {
          ...r,
          reporter_username: u.username || '',
          reporter_name: u.display_name || ''
        };
      });
    }

    return [];
  }

  function executeMutation(sql, lower, params) {
    if (lower.includes('insert into users') || lower.includes('insert or ignore into users')) {
      const username = String(params[0] || '').toLowerCase();
      const existing = users.find(u => u.username.toLowerCase() === username);
      if (existing && lower.includes('or ignore')) {
        return { lastInsertRowid: existing.id, changes: 0 };
      }
      const role = params.length >= 9 ? String(params[7] || 'user') : 'user';
      const createdAt = params.length >= 9 ? String(params[8] || new Date().toISOString()) : String(params[7] || new Date().toISOString());

      const newUser = {
        id: nextUserId++,
        username,
        email: String(params[1] || '').toLowerCase(),
        password_hash: String(params[2] || ''),
        display_name: String(params[3] || 'Traveler'),
        bio: String(params[4] || ''),
        location: String(params[5] || ''),
        avatar_url: String(params[6] || `https://api.dicebear.com/7.x/identicon/svg?seed=${params[0]}`),
        role,
        account_status: 'active',
        created_at: createdAt
      };
      users.push(newUser);
      return { lastInsertRowid: newUser.id, changes: 1 };
    }

    if (lower.includes('update users set display_name')) {
      const uid = Number(params[4]);
      const user = users.find(u => u.id === uid);
      if (user) {
        user.display_name = params[0];
        user.bio = params[1];
        user.location = params[2];
        user.avatar_url = params[3];
      }
      return { changes: user ? 1 : 0 };
    }

    if (lower.includes('update users set account_status = "suspended"')) {
      const uid = Number(params[0]);
      const user = users.find(u => u.id === uid);
      if (user) user.account_status = 'suspended';
      return { changes: user ? 1 : 0 };
    }

    if (lower.includes('delete from users')) {
      users.length = 0;
      return { changes: 1 };
    }

    if (lower.includes('insert into posts')) {
      let viewsCount = 0;
      let posterStyle = 'default';
      let aspectRatio = 'standard';
      if (params.length >= 9) {
        viewsCount = Number(params[6] || 0);
        posterStyle = String(params[7] || 'default');
        aspectRatio = String(params[8] || 'standard');
      } else {
        viewsCount = 0;
        posterStyle = String(params[6] || 'default');
        aspectRatio = String(params[7] || 'standard');
      }

      const newPost = {
        id: nextPostId++,
        user_id: Number(params[0]),
        image_url: String(params[1]),
        message: String(params[2]),
        location: String(params[3] || ''),
        date_utc: String(params[4] || getTodayUtcDate()),
        created_at: String(params[5] || new Date().toISOString()),
        status: 'published',
        views_count: viewsCount,
        poster_style: posterStyle,
        aspect_ratio: aspectRatio
      };
      posts.unshift(newPost);
      return { lastInsertRowid: newPost.id, changes: 1 };
    }

    if (lower.includes('update posts set views_count = views_count + 1')) {
      const id = Number(params[0]);
      const p = posts.find(item => item.id === id);
      if (p) p.views_count = (p.views_count || 0) + 1;
      return { changes: p ? 1 : 0 };
    }

    if (lower.includes('update posts set status')) {
      const id = Number(params[0]);
      const p = posts.find(item => item.id === id);
      if (p) {
        if (lower.includes('flagged')) p.status = 'flagged';
        else if (lower.includes('hidden')) p.status = 'hidden';
      }
      return { changes: p ? 1 : 0 };
    }

    if (lower.includes('delete from posts where id = ?')) {
      const id = Number(params[0]);
      const idx = posts.findIndex(item => item.id === id);
      if (idx !== -1) posts.splice(idx, 1);
      return { changes: idx !== -1 ? 1 : 0 };
    }

    if (lower.includes('delete from posts')) {
      posts.length = 0;
      return { changes: 1 };
    }

    if (lower.includes('insert into daily_uploads') || lower.includes('insert or ignore into daily_uploads')) {
      const uid = Number(params[0]);
      const dt = String(params[1]);
      const existing = daily_uploads.find(d => d.user_id === uid && d.date_utc === dt);
      if (existing && lower.includes('or ignore')) {
        return { lastInsertRowid: existing.id, changes: 0 };
      }
      daily_uploads.push({
        id: nextDailyId++,
        user_id: uid,
        date_utc: dt,
        post_id: Number(params[2]),
        created_at: String(params[3] || new Date().toISOString())
      });
      return { lastInsertRowid: nextDailyId - 1, changes: 1 };
    }

    if (lower.includes('delete from daily_uploads')) {
      daily_uploads.length = 0;
      return { changes: 1 };
    }

    if (lower.includes('insert or ignore into blocks') || lower.includes('insert into blocks')) {
      const b1 = Number(params[0]), b2 = Number(params[1]);
      if (!blocks.some(b => b.blocker_id === b1 && b.blocked_id === b2)) {
        blocks.push({
          id: nextBlockId++,
          blocker_id: b1,
          blocked_id: b2,
          created_at: String(params[2] || new Date().toISOString())
        });
      }
      return { lastInsertRowid: nextBlockId - 1, changes: 1 };
    }

    if (lower.includes('delete from blocks where blocker_id = ? and blocked_id = ?')) {
      const b1 = Number(params[0]), b2 = Number(params[1]);
      const idx = blocks.findIndex(b => b.blocker_id === b1 && b.blocked_id === b2);
      if (idx !== -1) blocks.splice(idx, 1);
      return { changes: idx !== -1 ? 1 : 0 };
    }

    if (lower.includes('insert into conversations')) {
      const newConv = {
        id: nextConvId++,
        user1_id: Number(params[0]),
        user2_id: Number(params[1]),
        last_message_at: String(params[2] || new Date().toISOString()),
        created_at: String(params[3] || new Date().toISOString())
      };
      conversations.push(newConv);
      return { lastInsertRowid: newConv.id, changes: 1 };
    }

    if (lower.includes('update conversations set last_message_at')) {
      const conv = conversations.find(c => c.id === Number(params[1]));
      if (conv) conv.last_message_at = String(params[0]);
      return { changes: conv ? 1 : 0 };
    }

    if (lower.includes('delete from conversations')) {
      conversations.length = 0;
      return { changes: 1 };
    }

    if (lower.includes('insert into messages')) {
      const newMsg = {
        id: nextMsgId++,
        conversation_id: Number(params[0]),
        sender_id: Number(params[1]),
        receiver_id: Number(params[2]),
        content: String(params[3]),
        is_read: Number(params[4] || 0),
        created_at: String(params[5] || new Date().toISOString())
      };
      messages.push(newMsg);
      return { lastInsertRowid: newMsg.id, changes: 1 };
    }

    if (lower.includes('update messages set is_read = 1')) {
      const cid = Number(params[0]), rid = Number(params[1]);
      messages.forEach(m => {
        if (m.conversation_id === cid && m.receiver_id === rid) m.is_read = 1;
      });
      return { changes: 1 };
    }

    if (lower.includes('delete from messages')) {
      messages.length = 0;
      return { changes: 1 };
    }

    if (lower.includes('insert into reports')) {
      const newRep = {
        id: nextReportId++,
        reporter_id: Number(params[0]),
        target_type: String(params[1]),
        target_id: Number(params[2]),
        reason: String(params[3]),
        details: String(params[4] || ''),
        status: String(params[5] || 'pending'),
        created_at: String(params[6] || new Date().toISOString())
      };
      reports.push(newRep);
      return { lastInsertRowid: newRep.id, changes: 1 };
    }

    if (lower.includes('update reports set status')) {
      const rep = reports.find(r => r.id === Number(params[1]));
      if (rep) rep.status = String(params[0]);
      return { changes: rep ? 1 : 0 };
    }

    if (lower.includes('delete from reports')) {
      reports.length = 0;
      return { changes: 1 };
    }

    return { lastInsertRowid: 1, changes: 1 };
  }

  return {
    prepare(rawSql) {
      const sql = rawSql.replace(/\s+/g, ' ').trim();
      const lower = sql.toLowerCase();
      return {
        get(...params) {
          const results = executeSelect(sql, lower, params);
          return results && results.length > 0 ? results[0] : null;
        },
        all(...params) {
          const results = executeSelect(sql, lower, params);
          return results || [];
        },
        run(...params) {
          return executeMutation(sql, lower, params);
        }
      };
    },
    exec(sql) {
      return this;
    },
    pragma(cmd) {
      return this;
    },
    transaction(fn) {
      return (...args) => fn(...args);
    }
  };
}

let db = null;
const isVercel = !!(process.env.VERCEL || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.USE_MEMORY_DB);

if (!isVercel) {
  try {
    const Database = require('better-sqlite3');
    const DATA_DIR = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(DATA_DIR)) {
      try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
    }
    const dbPath = path.join(DATA_DIR, 'kwall.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  } catch (err) {
    console.warn('[World Wall DB] better-sqlite3 unavailable or threw, falling back to Universal Memory DB:', err.message);
    db = null;
  }
}

if (!db) {
  db = createUniversalMemoryDb();
}

module.exports = {
  db,
  getTodayUtcDate,
  getUtcCountdown,
  UPLOADS_DIR
};
