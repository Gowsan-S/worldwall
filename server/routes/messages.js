const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

let broadcastFn = null;
router.setBroadcast = (fn) => {
  broadcastFn = fn;
};

// Helper to check block status between two users
function checkBlockStatus(userA, userB) {
  const block = db.prepare(`
    SELECT * FROM blocks 
    WHERE (blocker_id = ? AND blocked_id = ?) 
       OR (blocker_id = ? AND blocked_id = ?)
  `).get(userA, userB, userB, userA);

  if (!block) return { isBlocked: false };
  return {
    isBlocked: true,
    isBlocker: block.blocker_id === userA
  };
}

// Get all conversations for current user
router.get('/conversations', requireAuth, (req, res) => {
  try {
    const currentUserId = req.user.id;

    const convs = db.prepare(`
      SELECT 
        c.id as conversation_id,
        c.last_message_at,
        c.created_at,
        CASE 
          WHEN c.user1_id = ? THEN c.user2_id 
          ELSE c.user1_id 
        END as other_user_id
      FROM conversations c
      WHERE c.user1_id = ? OR c.user2_id = ?
      ORDER BY c.last_message_at DESC
    `).all(currentUserId, currentUserId, currentUserId);

    const conversations = convs.map(c => {
      const otherUser = db.prepare(`
        SELECT id, username, display_name, avatar_url, location, account_status
        FROM users WHERE id = ?
      `).get(c.other_user_id);

      const lastMessage = db.prepare(`
        SELECT id, sender_id, content, created_at, is_read 
        FROM messages 
        WHERE conversation_id = ? 
        ORDER BY created_at DESC LIMIT 1
      `).get(c.conversation_id);

      const unreadCount = db.prepare(`
        SELECT COUNT(*) as count 
        FROM messages 
        WHERE conversation_id = ? AND receiver_id = ? AND is_read = 0
      `).get(c.conversation_id, currentUserId).count;

      const blockStatus = checkBlockStatus(currentUserId, c.other_user_id);

      return {
        id: c.conversation_id,
        otherUser,
        lastMessage,
        unreadCount,
        isBlocked: blockStatus.isBlocked,
        last_message_at: c.last_message_at
      };
    });

    return res.json({ conversations });
  } catch (err) {
    console.error('Error fetching conversations:', err);
    return res.status(500).json({ error: 'Failed to retrieve messages.' });
  }
});

// Get or start message thread with a specific user
router.get('/thread/:targetUserId', requireAuth, (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = parseInt(req.params.targetUserId);

    if (currentUserId === targetUserId) {
      return res.status(400).json({ error: 'You cannot message yourself.' });
    }

    const targetUser = db.prepare(`
      SELECT id, username, display_name, avatar_url, bio, location 
      FROM users WHERE id = ? AND account_status = 'active'
    `).get(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found or account is inactive.' });
    }

    const blockStatus = checkBlockStatus(currentUserId, targetUserId);

    // Find existing conversation
    const user1 = Math.min(currentUserId, targetUserId);
    const user2 = Math.max(currentUserId, targetUserId);

    let conv = db.prepare(`
      SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ?
    `).get(user1, user2);

    let messages = [];
    if (conv) {
      // Mark messages sent to current user as read
      db.prepare(`
        UPDATE messages SET is_read = 1 
        WHERE conversation_id = ? AND receiver_id = ? AND is_read = 0
      `).run(conv.id, currentUserId);

      messages = db.prepare(`
        SELECT id, conversation_id, sender_id, receiver_id, content, is_read, created_at 
        FROM messages 
        WHERE conversation_id = ? 
        ORDER BY created_at ASC 
        LIMIT 100
      `).all(conv.id);
    }

    return res.json({
      targetUser,
      conversationId: conv ? conv.id : null,
      messages,
      blockStatus
    });
  } catch (err) {
    console.error('Error fetching thread:', err);
    return res.status(500).json({ error: 'Failed to retrieve conversation.' });
  }
});

// Send a private message
router.post('/', requireAuth, (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiver_id, content } = req.body;

    if (!receiver_id) {
      return res.status(400).json({ error: 'Receiver ID is required.' });
    }

    const targetUserId = parseInt(receiver_id);
    if (senderId === targetUserId) {
      return res.status(400).json({ error: 'You cannot send messages to yourself.' });
    }

    const trimmedContent = (content || '').trim();
    if (!trimmedContent) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    if (trimmedContent.length > 1000) {
      return res.status(400).json({ error: 'Message exceeds 1,000 characters limit.' });
    }

    // Check if target user exists
    const targetUser = db.prepare('SELECT id, username, display_name, account_status FROM users WHERE id = ?').get(targetUserId);
    if (!targetUser || targetUser.account_status !== 'active') {
      return res.status(404).json({ error: 'User does not exist or account is inactive.' });
    }

    // Check blocking
    const blockStatus = checkBlockStatus(senderId, targetUserId);
    if (blockStatus.isBlocked) {
      return res.status(403).json({ error: 'Unable to deliver message. You cannot message this user.' });
    }

    const now = new Date().toISOString();
    const user1 = Math.min(senderId, targetUserId);
    const user2 = Math.max(senderId, targetUserId);

    let conv = db.prepare('SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ?').get(user1, user2);
    let convId;

    if (!conv) {
      const convResult = db.prepare(`
        INSERT INTO conversations (user1_id, user2_id, last_message_at, created_at)
        VALUES (?, ?, ?, ?)
      `).run(user1, user2, now, now);
      convId = convResult.lastInsertRowid;
    } else {
      convId = conv.id;
      db.prepare('UPDATE conversations SET last_message_at = ? WHERE id = ?').run(now, convId);
    }

    const msgResult = db.prepare(`
      INSERT INTO messages (conversation_id, sender_id, receiver_id, content, is_read, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(convId, senderId, targetUserId, trimmedContent, now);

    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(msgResult.lastInsertRowid);

    // Live broadcast to receiver through WebSockets!
    if (broadcastFn) {
      broadcastFn({
        type: 'NEW_MESSAGE',
        message,
        sender: {
          id: req.user.id,
          username: req.user.username,
          display_name: req.user.display_name,
          avatar_url: req.user.avatar_url
        }
      });
    }

    return res.status(201).json({
      message: 'Message delivered.',
      data: message
    });
  } catch (err) {
    console.error('Error sending message:', err);
    return res.status(500).json({ error: 'Failed to send message.' });
  }
});

module.exports = router;
