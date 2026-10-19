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

// Static file serving with CORS and no-cache
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, '..', 'public'), {
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// WebSocket Server (safe for both standalone Node and Serverless)
let wss = null;
const clients = new Set();

if (!process.env.VERCEL) {
  try {
    wss = new WebSocketServer({ server });
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
  } catch (wsErr) {
    console.warn('WebSocket server failed to initialize:', wsErr.message);
  }
}

// Broadcast helper
function broadcast(payload) {
  if (clients.size === 0) return;
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

// API Routes (Mounted on both /api/* and root /* for universal compatibility across reverse proxies and serverless rewrites)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/posts', postsRoutes);
app.use('/posts', postsRoutes);

app.use('/api/messages', messagesRoutes);
app.use('/messages', messagesRoutes);

app.use('/api/users', usersRoutes);
app.use('/users', usersRoutes);

app.use('/api/reports', reportsRoutes);
app.use('/reports', reportsRoutes);

// Server time and countdown endpoint
const timeHandler = (req, res) => {
  res.json({
    countdown: getUtcCountdown(),
    serverTimeUtc: new Date().toISOString()
  });
};
app.get('/api/time', timeHandler);
app.get('/time', timeHandler);

// Pure JS Uncompressed Zip Generator for .lively packages
function createSimpleZip(filename, content) {
  const data = Buffer.from(content, 'utf8');
  const nameBuf = Buffer.from(filename, 'utf8');
  
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    crcTable[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < data.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xFF];
  crc = (crc ^ (-1)) >>> 0;

  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0, 6);
  localHeader.writeUInt16LE(0, 8);
  localHeader.writeUInt16LE(0, 10);
  localHeader.writeUInt16LE(0, 12);
  localHeader.writeUInt32LE(crc, 14);
  localHeader.writeUInt32LE(data.length, 18);
  localHeader.writeUInt32LE(data.length, 22);
  localHeader.writeUInt16LE(nameBuf.length, 26);
  localHeader.writeUInt16LE(0, 28);

  const localPart = Buffer.concat([localHeader, nameBuf, data]);

  const cdHeader = Buffer.alloc(46);
  cdHeader.writeUInt32LE(0x02014b50, 0);
  cdHeader.writeUInt16LE(20, 4);
  cdHeader.writeUInt16LE(20, 6);
  cdHeader.writeUInt16LE(0, 8);
  cdHeader.writeUInt16LE(0, 10);
  cdHeader.writeUInt16LE(0, 12);
  cdHeader.writeUInt16LE(0, 14);
  cdHeader.writeUInt32LE(crc, 16);
  cdHeader.writeUInt32LE(data.length, 20);
  cdHeader.writeUInt32LE(data.length, 24);
  cdHeader.writeUInt16LE(nameBuf.length, 28);
  cdHeader.writeUInt16LE(0, 30);
  cdHeader.writeUInt16LE(0, 32);
  cdHeader.writeUInt16LE(0, 34);
  cdHeader.writeUInt16LE(0, 36);
  cdHeader.writeUInt32LE(0, 38);
  cdHeader.writeUInt32LE(0, 42);

  const cdPart = Buffer.concat([cdHeader, nameBuf]);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(cdPart.length, 12);
  eocd.writeUInt32LE(localPart.length, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([localPart, cdPart, eocd]);
}

// 1-Click Automatic Windows Live Wallpaper Runner (.bat)
const downloadBatHandler = (req, res) => {
  const host = req.get('host') || `localhost:${PORT}`;
  const protocol = req.protocol || 'http';
  const liveUrl = `${protocol}://${host}/?wallpaper=true`;

  const batContent = `@echo off
chcp 65001 >nul
title World Wall — Automatic Live Wallpaper
color 0B
echo.
echo  =============================================================
echo    WORLD WALL — Automatic Live Desktop Wallpaper Setup
echo  =============================================================
echo.
echo  [1/3] Connecting to World Wall live canvas...
set "WALL_URL=${liveUrl}"

:: 1. Check for Lively Wallpaper
set "LIVELY_CMD="
if exist "%LOCALAPPDATA%\\Programs\\Lively Wallpaper\\Lively.exe" (
    set "LIVELY_CMD=%LOCALAPPDATA%\\Programs\\Lively Wallpaper\\Lively.exe"
)
if exist "C:\\Program Files\\Lively Wallpaper\\Lively.exe" (
    set "LIVELY_CMD=C:\\Program Files\\Lively Wallpaper\\Lively.exe"
)
if exist "%ProgramFiles(x86)%\\Lively Wallpaper\\Lively.exe" (
    set "LIVELY_CMD=%ProgramFiles(x86)%\\Lively Wallpaper\\Lively.exe"
)

if not "%LIVELY_CMD%"=="" (
    echo  [2/3] Lively Wallpaper detected!
    echo  [3/3] Setting World Wall as your active desktop wallpaper...
    start "" "%LIVELY_CMD%" setwp --file "%WALL_URL%"
    echo.
    echo  =============================================================
    echo    SUCCESS! World Wall is now your active desktop wallpaper!
    echo  =============================================================
    timeout /t 4 >nul
    exit /b 0
)

:: 2. Fallback: Launch borderless fullscreen Edge Kiosk Live Wallpaper
echo  [2/3] Lively Wallpaper not found.
echo        Launching World Wall in borderless fullscreen live wallpaper mode...
start msedge.exe --app="%WALL_URL%" --start-fullscreen

:: 3. Pin shortcut to Desktop
echo  [3/3] Creating "World Wall Live" shortcut on your Desktop...
set "VBS_SCRIPT=%TEMP%\\WorldWallShortcut_%RANDOM%.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_SCRIPT%"
echo sLinkFile = "%USERPROFILE%\\Desktop\\World Wall Live.lnk" >> "%VBS_SCRIPT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SCRIPT%"
echo oLink.TargetPath = "msedge.exe" >> "%VBS_SCRIPT%"
echo oLink.Arguments = "--app=""%WALL_URL%"" --start-fullscreen" >> "%VBS_SCRIPT%"
echo oLink.Description = "World Wall Live Wallpaper" >> "%VBS_SCRIPT%"
echo oLink.Save >> "%VBS_SCRIPT%"
cscript //nologo "%VBS_SCRIPT%" >nul 2>&1
del "%VBS_SCRIPT%" >nul 2>&1

echo.
echo  =============================================================
echo    SUCCESS! World Wall is running.
echo    A 1-click shortcut has been added to your Desktop:
echo    "World Wall Live.lnk"
echo  =============================================================
timeout /t 5 >nul
exit /b 0
`;

  res.setHeader('Content-Disposition', 'attachment; filename="Add-WorldWall-LiveWallpaper.bat"');
  res.setHeader('Content-Type', 'application/x-bat');
  res.send(batContent);
};
app.get('/api/wallpaper/download-bat', downloadBatHandler);
app.get('/wallpaper/download-bat', downloadBatHandler);

// 1-Click Lively Wallpaper Pack (.lively)
const downloadLivelyHandler = (req, res) => {
  const host = req.get('host') || `localhost:${PORT}`;
  const protocol = req.protocol || 'http';
  const liveUrl = `${protocol}://${host}/?wallpaper=true`;

  const livelyInfo = {
    Title: "World Wall Live",
    Desc: "Living global mosaic canvas of humanity",
    Author: "World Wall",
    License: "MIT",
    Contact: liveUrl,
    Type: 1,
    FileName: liveUrl,
    Arguments: ""
  };

  const zipBuffer = createSimpleZip('LivelyInfo.json', JSON.stringify(livelyInfo, null, 2));
  res.setHeader('Content-Disposition', 'attachment; filename="WorldWall.lively"');
  res.setHeader('Content-Type', 'application/zip');
  res.send(zipBuffer);
};
app.get('/api/wallpaper/download-lively', downloadLivelyHandler);
app.get('/wallpaper/download-lively', downloadLivelyHandler);

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

// Start listening when executed directly in Node (e.g., local dev)
if (require.main === module && !process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`  WORLD WALL — A Global Wall of People`);
    console.log(`  Server running on http://localhost:${PORT}`);
    console.log(`  WebSockets ready for live wall updates`);
    console.log(`=========================================`);
  });
}

// Export app for Vercel Serverless Functions
module.exports = app;
