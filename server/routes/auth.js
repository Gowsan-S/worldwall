const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db, getTodayUtcDate, getUtcCountdown } = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');

// Register a new user
router.post('/register', async (req, res) => {
  try {
    let { username, email, password, display_name, bio, location, avatar_url } = req.body;

    if (!username || !email || !password || !display_name) {
      return res.status(400).json({ error: 'Username, email, password, and display name are required.' });
    }

    username = username.trim().toLowerCase();
    email = email.trim().toLowerCase();
    display_name = display_name.trim();

    if (username.length < 3 || username.length > 25) {
      return res.status(400).json({ error: 'Username must be between 3 and 25 characters.' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores.' });
    }

    if (!email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Check existing
    const existing = db.prepare('SELECT id, username, email FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      if (existing.username.toLowerCase() === username) {
        return res.status(400).json({ error: 'Username is already taken. Please choose another.' });
      }
      return res.status(400).json({ error: 'Email is already registered. Please sign in instead.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const created_at = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, display_name, bio, location, avatar_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      username,
      email,
      password_hash,
      display_name,
      bio || '',
      location || '',
      avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`,
      created_at
    );

    const user = db.prepare('SELECT id, username, email, display_name, bio, location, avatar_url, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = signToken(user);

    const countdown = getUtcCountdown();

    return res.status(201).json({
      message: 'Account created successfully! Welcome to World Wall.',
      user,
      token,
      uploadStatus: {
        eligible: true,
        countdown
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    let { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Please enter your username/email and password.' });
    }

    identifier = identifier.trim().toLowerCase();

    // Match by username, email, or lower display_name
    const user = db.prepare(`
      SELECT id, username, email, password_hash, display_name, bio, location, avatar_url, role, account_status, created_at 
      FROM users 
      WHERE username = ? OR email = ? OR LOWER(display_name) = ?
    `).get(identifier, identifier, identifier);

    if (!user) {
      return res.status(404).json({ 
        error: `No account found for '${identifier}'. If you are new to World Wall, click 'Create Account' above to sign up in 5 seconds!`,
        notFound: true 
      });
    }

    if (user.account_status !== 'active') {
      return res.status(403).json({ error: 'This account has been suspended.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      let hint = '';
      if (user.username === 'demo') hint = ' (Demo password is: demo123)';
      else if (user.username === 'admin') hint = ' (Admin password is: admin123)';
      return res.status(401).json({ 
        error: `Incorrect password.${hint} Please try again or create a new account.` 
      });
    }

    const token = signToken(user);
    const { password_hash, ...safeUser } = user;

    // Upload status (unlimited uploads - no time limit)
    const countdown = getUtcCountdown();

    return res.json({
      message: 'Welcome back!',
      user: safeUser,
      token,
      uploadStatus: {
        eligible: true,
        todayPostId: null,
        countdown
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Failed to sign in. Please try again.' });
  }
});

// 1-Click Guest Login (Instant zero-friction access)
router.post('/guest', async (req, res) => {
  try {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const username = `traveler_${randomSuffix}`;
    const email = `traveler_${randomSuffix}@worldwall.app`;
    const display_name = `World Traveler #${randomSuffix}`;
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash('guest123', salt);
    const created_at = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, display_name, bio, location, avatar_url, created_at)
      VALUES (?, ?, ?, ?, 'Exploring the global wall of moments.', 'Global Traveler', ?, ?)
    `).run(username, email, password_hash, display_name, `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`, created_at);

    const user = db.prepare('SELECT id, username, email, display_name, bio, location, avatar_url, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = signToken(user);
    const countdown = getUtcCountdown();

    return res.status(201).json({
      message: 'Signed in as World Traveler!',
      user,
      token,
      uploadStatus: {
        eligible: true,
        todayPostId: null,
        countdown
      }
    });
  } catch (err) {
    console.error('Guest auth error:', err);
    return res.status(500).json({ error: 'Failed to create guest session.' });
  }
});

// Get current user session info
router.get('/me', requireAuth, (req, res) => {
  const countdown = getUtcCountdown();

  // Get total posts count for user
  const stats = db.prepare('SELECT COUNT(*) as total_posts FROM posts WHERE user_id = ?').get(req.user.id);

  return res.json({
    user: req.user,
    stats: {
      totalPosts: stats.total_posts
    },
    uploadStatus: {
      eligible: true,
      todayPostId: null,
      countdown
    }
  });
});

// Update profile
router.put('/profile', requireAuth, (req, res) => {
  try {
    const { display_name, bio, location, avatar_url } = req.body;

    if (!display_name || !display_name.trim()) {
      return res.status(400).json({ error: 'Display name cannot be empty.' });
    }

    db.prepare(`
      UPDATE users 
      SET display_name = ?, bio = ?, location = ?, avatar_url = ?
      WHERE id = ?
    `).run(
      display_name.trim(),
      bio ? bio.trim().slice(0, 300) : '',
      location ? location.trim().slice(0, 80) : '',
      avatar_url ? avatar_url.trim() : req.user.avatar_url,
      req.user.id
    );

    const updated = db.prepare('SELECT id, username, email, display_name, bio, location, avatar_url, role, created_at FROM users WHERE id = ?').get(req.user.id);

    return res.json({
      message: 'Profile updated successfully!',
      user: updated
    });
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

module.exports = router;
