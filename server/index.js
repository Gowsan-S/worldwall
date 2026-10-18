const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { WebSocketServer, WebSocket } = require('ws');
const { db, getUtcCountdown, UPLOADS_DIR } = require('./db');
const { seed } = require('./seed');

const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const messagesRoutes = require('./routes/messages');
const usersRoutes = require('./routes/users');
const reportsRoutes = require('./routes/reports');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Auto-seed on first run if database is fresh
seed().catch(err => console.error('Seed error:', err));

// Middleware
app.use(cors());
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));

// Static file serving with no-cache in dev to ensure immediate UI updates
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, '..', 'public'), {
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// WebSocket Server
const wss = new WebSocketServer({ server });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);

  // Send initial countdown sync and connection confirmation
  ws.send(JSON.stringify({
    type: 'WELCOME',
    countdown: getUtcCountdown(),
    connectedClients: clients.size
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      }
    } catch (e) {
      // Ignore invalid payload
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });

  ws.on('error', () => {
    clients.delete(ws);
  });
});

// Broadcast helper
function broadcast(payload) {
  const json = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  }
}

// Pass broadcast function to route handlers
postsRoutes.setBroadcast(broadcast);
messagesRoutes.setBroadcast(broadcast);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/reports', reportsRoutes);

// Server time and countdown endpoint
app.get('/api/time', (req, res) => {
  res.json({
    countdown: getUtcCountdown(),
    serverTimeUtc: new Date().toISOString()
  });
});

// Single Page Application fallback - serve index.html for non-API GET routes
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    return res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`  K-WALL — A Global Wall of People`);
  console.log(`  Server running on http://localhost:${PORT}`);
  console.log(`  WebSockets ready for live wall updates`);
  console.log(`=========================================`);
});
