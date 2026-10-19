const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Get public profile and upload history by username or user ID
router.get('/:identifier', optionalAuth, (req, res) => {
  try {
    const identifier = req.params.identifier;
    let user;

    if (/^\d+$/.test(identifier)) {
      user = db.prepare('SELECT id, username, display_name, avatar_url, bio, location, created_at, role, account_status FROM users WHERE id = ?').get(parseInt(identifier));
    } else {
      user = db.prepare('SELECT id, username, display_name, avatar_url, bio, location, created_at, role, account_status FROM users WHERE username = ?').get(identifier.toLowerCase());
    }

    if (!user || user.account_status !== 'active') {
      return res.status(404).json({ error: 'User not found or account is not active.' });
    }

    // Get user's published posts history
    const posts = db.prepare(`
      SELECT id, image_url, message, location, date_utc, created_at, views_count, poster_style, aspect_ratio
      FROM posts 
      WHERE user_id = ? AND status = 'published'
      ORDER BY created_at DESC
    `).all(user.id);

    let isBlocked = false;
    let hasBlocked = false;

    if (req.user && req.user.id !== user.id) {
      const block1 = db.prepare('SELECT * FROM blocks WHERE blocker_id = ? AND blocked_id = ?').get(req.user.id, user.id);
      const block2 = db.prepare('SELECT * FROM blocks WHERE blocker_id = ? AND blocked_id = ?').get(user.id, req.user.id);
      isBlocked = !!block1;
      hasBlocked = !!block2;
    }

    return res.json({
      profile: user,
      posts,
      stats: {
        totalPosts: posts.length,
        joinedDate: user.created_at
      },
      relationship: {
        isSelf: req.user ? req.user.id === user.id : false,
        isBlocked,
        hasBlocked
      }
    });
  } catch (err) {
    console.error('Error fetching public profile:', err);
    return res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// Block a user
router.post('/:id/block', requireAuth, (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    if (req.user.id === targetUserId) {
      return res.status(400).json({ error: 'You cannot block yourself.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR IGNORE INTO blocks (blocker_id, blocked_id, created_at)
      VALUES (?, ?, ?)
    `).run(req.user.id, targetUserId, now);

    return res.json({ message: 'User blocked successfully.' });
  } catch (err) {
    console.error('Error blocking user:', err);
    return res.status(500).json({ error: 'Failed to block user.' });
  }
});

// Unblock a user
router.delete('/:id/block', requireAuth, (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    db.prepare('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?').run(req.user.id, targetUserId);
    return res.json({ message: 'User unblocked successfully.' });
  } catch (err) {
    console.error('Error unblocking user:', err);
    return res.status(500).json({ error: 'Failed to unblock user.' });
  }
});

// List blocked users
router.get('/me/blocked', requireAuth, (req, res) => {
  try {
    const blocked = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.avatar_url, b.created_at as blocked_at
      FROM blocks b
      JOIN users u ON b.blocked_id = u.id
      WHERE b.blocker_id = ?
      ORDER BY b.created_at DESC
    `).all(req.user.id);

    return res.json({ blocked });
  } catch (err) {
    console.error('Error listing blocked users:', err);
    return res.status(500).json({ error: 'Failed to retrieve blocked users.' });
  }
});

module.exports = router;
