# 🌍 K-Wall — A Global Wall of People

> **One world. One wall. One photo per person per day.**  
> A living digital canvas connecting humanity through moments, memories, and reflections.

---

## 🌟 Overview

**K-Wall** is an interactive, full-stack platform designed around a single shared global wall for the entire world. Rather than behaving like an endless social feed filled with large disparate cards, **the wall is the main experience**.

Every person can share **one photo and a short personal reflection (up to 150 characters) per calendar day (UTC)**. Their photo joins thousands of others in a dense, living photo mosaic.

---

## ✨ Core Features

### 1. The Overlapping Poster Collage Wall
- **Dense, Freeform Poster Collage**: Replaced the previous uniform grid with an artistic, multi-track overlapping poster wall inspired by creative studio moodboards and street art poster walls.
- **Controlled Organic Overlaps**: Posters overlap both vertically (35px to 80px) and horizontally across tracks, eliminating large empty black gaps and creating rich three-dimensional layered depth.
- **Deterministic Placement Engine**: Tile coordinates, dimensions, rotations (-4.2° to +4.2°), and stacking orders (`z-index`) are calculated using a deterministic pseudo-random formula seeded by post ID. The arrangement remains rock-solid and reproducible across page refreshes.
- **Varied Aspect Ratios & Dimensions**: Features large focal point posters, tall portrait prints (2:3, 9:16), standard gallery frames (3:4), square art (1:1), and wide landscape shots (16:10).
- **Artistic Poster Themes**: Authentic designs matching Reference Image 2: Framed Gallery Prints with white mats, Bold Yellow Script (*"Good Vibes only!"*), Crimson Stencil (*"Your Comfort Zone Will Kill You"*), Deep Navy Minimal (*"dream. plan. do."*), Athletic Monochrome (*"THE WILL MUST BE STRONGER..."*, *"CONQUER."*), and Obsidian Minimalist (*"ARE YOU WORKING HARD ENOUGH?"*, *"just TRY."*).
- **Centered Glassmorphic Logo**: A vector emblem floating at the exact center with a frosted glass backdrop and live pulse dot, sitting cleanly above the posters without obstructing them.
- **Hover & Detail Interaction**: Hovering over any poster elevates it smoothly to `z-index: 500`, scales it up (`scale(1.06)`), and straightens rotation to 0° with an accent glow; clicking opens the full post detail window.
- **Real-Time Live Wall Updates**: Powered by WebSockets (`ws`). When any user publishes a photo anywhere in the world, the new poster instantly ripples into the wall without requiring a page refresh.

### 2. Daily Upload System & Server-Enforced UTC Limit
- **One photo per calendar day (UTC)**: Enforced directly at the database level with a `UNIQUE(user_id, date_utc)` constraint on the `daily_uploads` table. Cannot be bypassed by cookie clearing, page refreshing, or multi-device sessions.
- **Live UTC Countdown Timer**: The floating bottom dock features a dynamic countdown (`"Next photo in 13:42:16"`) synchronized down to the second. At UTC midnight (`00:00:00`), the upload button reactivates automatically.
- **Image validation**: Multer storage supporting JPEG, PNG, WebP, and GIF up to 10MB, with local file storage in `/uploads`.
- **Character limit counter**: Real-time counter ensuring concise messages (&le; 150 characters).

### 3. Photo Tile Interaction & Deep Linking
- **Post Detail Window**: High-res image display, author avatar, display name, handle, country/city badge, relative timestamp (e.g. `2h ago`) and exact UTC timestamp.
- **Actions Toolbar**: Direct buttons to **View Profile**, **Send Private Message**, **Share**, and **Report Content**.
- **Deep Linking**: Direct URLs such as `/?post=12` automatically open that specific post's detail modal.
- **Owner Controls**: Post authors and administrators have direct delete capabilities.

### 4. Private Messaging
- **1-on-1 Direct Messaging**: Private conversations between registered members.
- **Inbox & Thread View**: Sidebar listing active conversations with unread badges, message snippets, and timestamps.
- **Real-Time Delivery**: Messages are pushed via WebSockets directly to the recipient's screen with unread counter badges on the bottom dock.
- **Safety**: User blocking and message reporting directly from the conversation header.

### 5. Live Wallpaper Suite (`/?wallpaper=true`)
- **Fullscreen Live Canvas**: Distraction-free mode that turns K-Wall into a live desktop or mobile wallpaper.
- **Customization Settings**:
  - **Grid Density**: Compact (dense mosaic), Balanced (standard), Relaxed (larger cards).
  - **Color Themes**: Deep Obsidian Dark, Cyber Glow, Midnight Blue, Monochrome.
  - **Display Toggles**: Center Logo on/off, Hover tooltips on/off, Subtle ambient breathing motion on/off.
  - **Shareable Live URL**: Dedicated link for Raspberry Pi displays, smart TVs, or browser kiosks.
- **Setup Guides Included**:
  - **Windows**: Step-by-step instructions for **Lively Wallpaper** (free open source) and **Wallpaper Engine**.
  - **macOS**: Setup guide for **Plash** and WebScreenSaver.
  - **Mobile**: Progressive Web App (PWA) install with `manifest.json` and `sw.js` for full-screen home-screen wallpaper.

### 6. User Accounts & Profiles
- JWT-based authentication with bcrypt-hashed passwords.
- Public profile pages showing bio, location, member join date, and **Upload History gallery** of past contributions.
- Profile editing (display name, bio, location, avatar).
- Block list management.

### 7. Community Safety & Moderation
- Report system for inappropriate images, commercial spam, harassment, and privacy violations.
- Automatic flagging threshold when multiple reports are submitted.
- Admin moderation endpoints for reviewing reports, hiding/deleting posts, and account suspension.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology |
|---|---|
| **Backend Server** | Node.js (v24+), Express.js |
| **Real-time Engine** | WebSockets (`ws`) with auto-reconnection and client broadcasts |
| **Database** | SQLite via `better-sqlite3` with WAL mode and ACID transactions |
| **Authentication** | JWT (`jsonwebtoken`) and `bcryptjs` password hashing |
| **Image Storage** | `multer` multipart upload to `/uploads/` |
| **Frontend Styling** | Vanilla CSS with design tokens, glassmorphism, and responsive CSS Grid |
| **Frontend Logic** | Vanilla JavaScript ES6 modules with decoupled event architecture |
| **PWA Support** | `manifest.json` and `sw.js` Service Worker for offline resilience |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18 or higher, tested on Node v24)
- **npm** (v9 or higher)

### 2. Installation
```bash
git clone <repo-url>
cd K-WALL
npm install
```

### 3. Seed Sample Community Data
Initialize the database with 45+ international community members from Tokyo, Nairobi, Paris, São Paulo, Sydney, Cairo, and more:
```bash
npm run seed
```

### 4. Start the Application
```bash
npm start
# Or for development:
npm run dev
```

Open your browser to:
```
http://localhost:3000
```

---

## 👤 Pre-configured Test Accounts

For instant testing, the login modal includes 1-click demo buttons:

| Username | Password | Role | Description |
|---|---|---|---|
| `demo` | `demo123` | User | Alex Chen (San Francisco, Street Photographer) |
| `admin` | `admin123` | Admin / Curator | K-Wall Curator (Geneva, Switzerland) |
| `kenji_tokyo` | `kwall2026` | User | Kenji Takahashi (Tokyo, Japan) |
| `amara_nairobi` | `kwall2026` | User | Amara Kiprono (Nairobi, Kenya) |
| `chloe_paris` | `kwall2026` | User | Chloé Mercier (Paris, France) |

*(Or click **Create Account** to register your own custom user!)*

---

## 📁 Repository Structure

```
K-WALL/
├── package.json
├── README.md
├── server/
│   ├── index.js               # Express app, HTTP & WebSocket server
│   ├── db.js                  # SQLite database schema, WAL mode, UTC countdown
│   ├── seed.js                # Seed generator with 45+ global portraits & moments
│   ├── middleware/
│   │   └── auth.js            # JWT verification & session validation
│   └── routes/
│       ├── auth.js            # Register, login, session, profile update
│       ├── posts.js           # Wall mosaic, atomic daily upload, delete
│       ├── messages.js        # Private conversations, thread history, send message
│       ├── users.js           # Public profiles, upload history, blocking
│       └── reports.js         # Content reporting and moderation review
├── uploads/                   # User-uploaded photos
├── data/
│   └── kwall.db               # SQLite database
└── public/
    ├── index.html             # Single Page Application HTML & SEO meta
    ├── manifest.json          # PWA Web App Manifest
    ├── sw.js                  # Service Worker for PWA
    ├── assets/
    │   └── logo.svg           # Stylized glowing K-Wall vector logo
    ├── css/
    │   ├── variables.css      # Design tokens, color palette, glassmorphism
    │   ├── main.css           # Base reset, buttons, inputs, toasts, badges
    │   ├── wall.css           # Mosaic grid layout, tile hover, centered logo
    │   ├── controls.css       # Floating bottom dock, countdown clock, states
    │   ├── modals.css         # Post detail, upload dropzone, chat, profile, share
    │   └── wallpaper.css      # Live wallpaper mode, themes, density options
    └── js/
        ├── api.js             # API client & auth token persistence
        ├── socket.js          # WebSocket client with auto-reconnection
        ├── wall.js            # Dynamic mosaic renderer & live updates
        ├── controls.js        # Dock manager & real-time UTC timer
        ├── upload.js          # Daily upload form, preview, character counter
        ├── post-detail.js     # Post detail modal & URL query router
        ├── chat.js            # Private messaging & conversation threads
        ├── profile.js         # Public user profile & past uploads history
        ├── wallpaper.js       # Live wallpaper fullscreen & guide controller
        ├── share.js           # Web Share API & social share dialog
        ├── auth.js            # Sign in, registration, demo logins
        └── app.js             # Main coordinator, toasts, and initialization
```

---

## 🌐 Live Wallpaper Modes

- **Direct Live Wall**: Visit `http://localhost:3000/?wallpaper=true` for fullscreen kiosk mode.
- **Density Customizer**: Toggle between `compact`, `balanced`, or `relaxed` via the Wallpaper Suite modal.
- **Themes**: Switch between Obsidian Dark, Cyber Glow, Midnight Blue, or Monochrome.
- **Ambient Breathing**: Optional gentle Ken Burns zoom effect for a tranquil background on secondary screens.
