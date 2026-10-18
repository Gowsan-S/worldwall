const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db, getTodayUtcDate, getUtcCountdown, UPLOADS_DIR } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Setup Multer for disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `post-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mime = file.mimetype.toLowerCase();

    if (allowed.test(ext) || allowed.test(mime)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WEBP, and GIF images are allowed.'));
    }
  }
});

// Middleware for broadcasting WebSocket events
let broadcastFn = null;
router.setBroadcast = (fn) => {
  broadcastFn = fn;
};

// Check daily upload eligibility (Unlimited uploads - no time limit)
router.get('/eligibility', optionalAuth, (req, res) => {
  const countdown = getUtcCountdown();

  if (!req.user) {
    return res.json({
      authenticated: false,
      eligible: true,
      message: 'Sign in to share your photo on K-Wall.',
      countdown
    });
  }

  const todayUtc = getTodayUtcDate();

  return res.json({
    authenticated: true,
    eligible: true,
    todayPost: null,
    todayUtc,
    countdown
  });
});

// Get wall posts (mosaic)
router.get('/', (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 200, 10), 1000);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    const filter = req.query.filter; // 'recent', 'popular', 'random'

    let orderBy = 'p.created_at DESC';
    if (filter === 'popular') {
      orderBy = 'p.views_count DESC, p.created_at DESC';
    } else if (filter === 'random') {
      orderBy = 'RANDOM()';
    }

    const posts = db.prepare(`
      SELECT 
        p.id, 
        p.image_url, 
        p.message, 
        p.location, 
        p.date_utc, 
        p.created_at, 
        p.views_count,
        p.poster_style,
        p.aspect_ratio,
        u.id as user_id, 
        u.username, 
        u.display_name, 
        u.avatar_url,
        u.location as user_location
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.status = 'published' AND u.account_status = 'active'
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const totalCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM posts p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.status = 'published' AND u.account_status = 'active'
    `).get().count;

    return res.json({
      posts,
      totalCount,
      limit,
      offset,
      countdown: getUtcCountdown()
    });
  } catch (err) {
    console.error('Error fetching wall posts:', err);
    return res.status(500).json({ error: 'Failed to load K-Wall posts.' });
  }
});

// Get single post detail
router.get('/:id', (req, res) => {
  try {
    const post = db.prepare(`
      SELECT 
        p.id, 
        p.image_url, 
        p.message, 
        p.location, 
        p.date_utc, 
        p.created_at, 
        p.views_count,
        p.poster_style,
        p.aspect_ratio,
        p.status,
        u.id as user_id, 
        u.username, 
        u.display_name, 
        u.avatar_url, 
        u.bio as user_bio,
        u.location as user_location
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Photo not found or has been removed.' });
    }

    // Increment views count asynchronously
    db.prepare('UPDATE posts SET views_count = views_count + 1 WHERE id = ?').run(post.id);
    post.views_count += 1;

    return res.json({ post });
  } catch (err) {
    console.error('Error fetching post:', err);
    return res.status(500).json({ error: 'Failed to retrieve photo.' });
  }
});

// Upload photo (Unlimited uploads - no time limit)
router.post('/', requireAuth, upload.single('photo'), (req, res) => {
  try {
    const todayUtc = getTodayUtcDate();
    const countdown = getUtcCountdown();

    // 1. Validate Message
    let message = req.body.message ? req.body.message.trim() : '';
    if (!message) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'A personal message is required (up to 150 characters).' });
    }

    if (message.length > 150) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: `Message exceeds the 150 character limit (${message.length}/150).` });
    }

    // 2. Resolve Image URL
    let imageUrl = '';
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.image_url && req.body.image_url.trim()) {
      imageUrl = req.body.image_url.trim();
    } else {
      return res.status(400).json({ error: 'Please select a photo to upload or capture.' });
    }

    const location = req.body.location ? req.body.location.trim().slice(0, 80) : (req.user.location || '');
    const createdAt = new Date().toISOString();

    // 3. Atomic Database Transaction to insert post
    const insertTransaction = db.transaction(() => {
      const posterStyle = req.body.poster_style || 'fullbleed';
      const aspectRatio = req.body.aspect_ratio || 'tall';

      const postResult = db.prepare(`
        INSERT INTO posts (user_id, image_url, message, location, date_utc, created_at, status, poster_style, aspect_ratio)
        VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?)
      `).run(req.user.id, imageUrl, message, location, todayUtc, createdAt, posterStyle, aspectRatio);

      const postId = postResult.lastInsertRowid;

      // Maintain daily_uploads record without throwing on duplicate uploads
      db.prepare(`
        INSERT OR IGNORE INTO daily_uploads (user_id, date_utc, post_id, created_at)
        VALUES (?, ?, ?, ?)
      `).run(req.user.id, todayUtc, postId, createdAt);

      return postId;
    });

    let newPostId;
    try {
      newPostId = insertTransaction();
    } catch (txError) {
      if (req.file) fs.unlink(req.file.path, () => {});
      throw txError;
    }

    // Retrieve the full new post with author info
    const newPost = db.prepare(`
      SELECT 
        p.id, 
        p.image_url, 
        p.message, 
        p.location, 
        p.date_utc, 
        p.created_at, 
        p.views_count,
        p.poster_style,
        p.aspect_ratio,
        u.id as user_id, 
        u.username, 
        u.display_name, 
        u.avatar_url,
        u.location as user_location
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(newPostId);

    // Broadcast new post live to all connected WebSocket clients!
    if (broadcastFn) {
      broadcastFn({
        type: 'NEW_POST',
        post: newPost
      });
    }

    const updatedCountdown = getUtcCountdown();

    return res.status(201).json({
      message: 'Your moment is now live on K-Wall for the world to see!',
      post: newPost,
      uploadStatus: {
        eligible: true,
        todayPostId: newPostId,
        countdown: updatedCountdown
      }
    });

  } catch (err) {
    console.error('Post upload error:', err);
    return res.status(500).json({ error: 'Failed to publish post. Please try again.' });
  }
});

// Delete user's own post
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    if (post.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You are not authorized to delete this post.' });
    }

    // Delete post (cascades to daily_uploads via foreign key)
    db.prepare('DELETE FROM posts WHERE id = ?').run(post.id);

    // If local file, delete it
    if (post.image_url.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', '..', post.image_url);
      fs.unlink(filePath, () => {});
    }

    if (broadcastFn) {
      broadcastFn({
        type: 'DELETE_POST',
        postId: post.id
      });
    }

    return res.json({ message: 'Post removed successfully.' });
  } catch (err) {
    console.error('Error deleting post:', err);
    return res.status(500).json({ error: 'Failed to delete post.' });
  }
});

module.exports = router;
