const jwt = require('jsonwebtoken');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'k-wall-global-secret-key-2026-production';
const TOKEN_EXPIRY = '30d';

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }

  const user = db.prepare('SELECT id, username, email, display_name, avatar_url, bio, location, role, account_status FROM users WHERE id = ?').get(payload.id);
  if (!user || user.account_status !== 'active') {
    return res.status(401).json({ error: 'User account not found or suspended.' });
  }

  req.user = user;
  next();
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (payload) {
      const user = db.prepare('SELECT id, username, email, display_name, avatar_url, bio, location, role, account_status FROM users WHERE id = ?').get(payload.id);
      if (user && user.account_status === 'active') {
        req.user = user;
      }
    }
  }
  next();
}

module.exports = {
  signToken,
  verifyToken,
  requireAuth,
  optionalAuth
};
