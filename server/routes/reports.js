const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

// Submit a content report
router.post('/', requireAuth, (req, res) => {
  try {
    const { target_type, target_id, reason, details } = req.body;

    if (!target_type || !target_id || !reason) {
      return res.status(400).json({ error: 'Target type, target ID, and reason are required.' });
    }

    if (!['post', 'user', 'message'].includes(target_type)) {
      return res.status(400).json({ error: 'Invalid report target type.' });
    }

    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO reports (reporter_id, target_type, target_id, reason, details, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).run(
      req.user.id,
      target_type,
      parseInt(target_id),
      reason.trim().slice(0, 100),
      details ? details.trim().slice(0, 500) : '',
      now
    );

    // If target is post, check total pending reports for auto-flagging
    if (target_type === 'post') {
      const count = db.prepare("SELECT COUNT(*) as count FROM reports WHERE target_type = 'post' AND target_id = ? AND status = 'pending'").get(target_id).count;
      if (count >= 3) {
        db.prepare("UPDATE posts SET status = 'flagged' WHERE id = ?").run(target_id);
      }
    }

    return res.status(201).json({
      message: 'Thank you for helping keep K-Wall safe. Your report has been submitted for moderation review.'
    });
  } catch (err) {
    console.error('Error submitting report:', err);
    return res.status(500).json({ error: 'Failed to submit report. Please try again.' });
  }
});

// Admin/Moderator view all reports
router.get('/', requireAuth, (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const reports = db.prepare(`
      SELECT 
        r.*,
        u.username as reporter_username,
        u.display_name as reporter_name
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      ORDER BY r.created_at DESC
      LIMIT 100
    `).all();

    return res.json({ reports });
  } catch (err) {
    console.error('Error fetching reports:', err);
    return res.status(500).json({ error: 'Failed to retrieve reports.' });
  }
});

// Admin review report & take action
router.put('/:id', requireAuth, (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { status, action } = req.body; // status: 'reviewed', 'dismissed', 'actioned'
    const reportId = parseInt(req.params.id);

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    if (action === 'hide_post' && report.target_type === 'post') {
      db.prepare('UPDATE posts SET status = "hidden" WHERE id = ?').run(report.target_id);
    } else if (action === 'delete_post' && report.target_type === 'post') {
      db.prepare('DELETE FROM posts WHERE id = ?').run(report.target_id);
    } else if (action === 'suspend_user' && report.target_type === 'user') {
      db.prepare('UPDATE users SET account_status = "suspended" WHERE id = ?').run(report.target_id);
    }

    db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status || 'reviewed', reportId);

    return res.json({ message: 'Report updated and moderation action applied.' });
  } catch (err) {
    console.error('Error updating report:', err);
    return res.status(500).json({ error: 'Failed to update report.' });
  }
});

module.exports = router;
