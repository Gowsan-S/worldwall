// =========================================================
// WORLD WALL — 77-Poster Full-Viewport Collage Engine
// Exactly 77 photos simultaneously, zero scrolling,
// newest photo in foreground, center WORLD WALL logo fixed
// =========================================================

const Wall = {
  gridEl: null,
  viewportEl: null,
  posts: [],
  totalCount: 0,
  TARGET_CARDS: 77,
  isLoading: false,
  resizeTimer: null,
  cachedWidth: 0,
  cachedHeight: 0,

  THEMES: [
    'bold-yellow',       // "Good Vibes only!" style
    'distressed-red',    // "Your Comfort Zone Will Kill You" style
    'dark-gritty',       // Muhammad Ali / athlete motivational style
    'framed-white',      // "IDEAS ARE WORTHLESS WITHOUT EXECUTION" style
    'navy-quote',        // "dream. plan. do." style
    'minimal-dark',      // "ARE YOU WORKING HARD ENOUGH?" / "just TRY." style
    'retro-pop',         // "Rise & Grind" / "DON'T PANIC" style
    'vintage-cream',     // "good things take time." style
    'fullbleed'          // Cinematic photography style
  ],

  init() {
    this.gridEl = document.getElementById('wall-grid');
    this.viewportEl = document.getElementById('wall-viewport');
    this.cachedWidth = window.innerWidth;
    this.cachedHeight = window.innerHeight;

    this.bindEvents();
    this.loadInitialPosts();
  },

  bindEvents() {
    // Window Resize with debounce: recalculates card sizes & positions so collage fits viewport without scrolling
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        if (Math.abs(window.innerWidth - this.cachedWidth) > 10 || Math.abs(window.innerHeight - this.cachedHeight) > 10) {
          this.cachedWidth = window.innerWidth;
          this.cachedHeight = window.innerHeight;
          this.render();
        }
      }, 100);
    });

    // Real-time WebSocket events
    Socket.on('NEW_POST', (payload) => {
      if (payload && payload.post) {
        this.prependLivePost(payload.post);
      }
    });

    Socket.on('DELETE_POST', (payload) => {
      if (payload && payload.postId) {
        this.removePostFromWall(payload.postId);
      }
    });
  },

  pseudoRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  },

  async loadInitialPosts() {
    this.isLoading = true;
    try {
      // Request up to 150 posts so we have plenty to draw the 77 cards from
      const data = await API.getPosts(150, 0);
      this.posts = data.posts || [];
      this.totalCount = data.totalCount || this.posts.length;

      this.render();
      this.updateStatsDisplay();
    } catch (err) {
      console.error('Failed to load initial wall posts:', err);
      App.showToast('Unable to load World Wall moments. Check connection.', 'error');
    } finally {
      this.isLoading = false;
    }
  },

  // Deterministic 77-Card Viewport Mosaic Algorithm
  // Fits strictly inside the visible window (100dvh, 0 scroll)
  calculatePositions(vw, vh, count) {
    let cols = 11;
    let rows = 7;

    const aspect = vw / vh;
    if (aspect < 1.1) {
      cols = 7;
      rows = 11;
    } else if (aspect < 1.35) {
      cols = 9;
      rows = 9;
    }

    const cellW = vw / cols;
    const cellH = vh / rows;

    const logoCenter = { x: vw / 2, y: vh / 2 };
    const logoProtected = { w: 230, h: 160 };

    // 1. Build all grid cells
    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const centerX = (c + 0.5) * cellW;
        const centerY = (r + 0.5) * cellH;
        const dx = (centerX - logoCenter.x) / cellW;
        const dy = (centerY - logoCenter.y) / cellH;
        const dist = Math.sqrt(dx * dx + dy * dy);
        cells.push({ c, r, centerX, centerY, dist });
      }
    }

    // 2. Center-outward priority sorting:
    // Newest post (index 0) gets prominent position adjacent to center logo (e.g. directly above logo at col 5, row 2)
    // The exact center cell (5, 3) where the logo sits is placed behind the logo with lowest visual disturbance
    const centerC = Math.floor(cols / 2);
    const centerR = Math.floor(rows / 2);

    cells.sort((a, b) => {
      const isCenterA = (a.c === centerC && a.r === centerR);
      const isCenterB = (b.c === centerC && b.r === centerR);
      const distA = isCenterA ? 2.5 : a.dist;
      const distB = isCenterB ? 2.5 : b.dist;
      return distA - distB;
    });

    const positions = [];
    const totalToPlace = Math.min(count, cells.length);

    for (let i = 0; i < totalToPlace; i++) {
      const cell = cells[i];
      const post = this.posts[i] || {};
      const seed = ((post.id || (i + 1)) * 43) + (cell.r * cols + cell.c) * 17;

      // Card sizing: 35% - 50% smaller than previous oversized posters
      // Varied widths (0.92 to 1.15 x cellW) for organic mosaic feel
      const sizeMult = 0.92 + this.pseudoRandom(seed + 1) * 0.23;
      const width = Math.round(cellW * sizeMult);

      // Aspect ratio
      let ar = 1.25;
      const aspectStyle = post.aspect_ratio || '';
      if (aspectStyle === 'xtall' || aspectStyle === '9:16') {
        ar = 1.38;
      } else if (aspectStyle === 'tall' || aspectStyle === '2:3') {
        ar = 1.32;
      } else if (aspectStyle === 'standard' || aspectStyle === '3:4') {
        ar = 1.20;
      } else if (aspectStyle === 'square' || aspectStyle === '1:1') {
        ar = 1.0;
      } else {
        const arRand = this.pseudoRandom(seed + 2);
        if (arRand < 0.35) ar = 1.34;
        else if (arRand < 0.70) ar = 1.20;
        else if (arRand < 0.85) ar = 1.0;
        else ar = 1.38;
      }

      let height = Math.round(width * ar);
      // Cap height so it fits within cell allowance without vertical overflow
      height = Math.min(height, Math.round(cellH * 1.25));

      // Organic subtle jitter
      let posX = cell.centerX + (this.pseudoRandom(seed + 3) - 0.5) * (cellW * 0.18);
      let posY = cell.centerY + (this.pseudoRandom(seed + 4) - 0.5) * (cellH * 0.16);

      // Repel from center logo protected area
      const dLogoX = posX - logoCenter.x;
      const dLogoY = posY - logoCenter.y;
      if (Math.abs(dLogoX) < (logoProtected.w / 2 + width * 0.32) &&
          Math.abs(dLogoY) < (logoProtected.h / 2 + height * 0.32)) {
        const signX = dLogoX >= 0 ? 1 : -1;
        const signY = dLogoY >= 0 ? 1 : -1;
        posX += signX * (cellW * 0.18);
        posY += signY * (cellH * 0.16);
      }

      let left = Math.round(posX - width / 2);
      let top = Math.round(posY - height / 2);

      // STRICT CLAMP WITHIN VIEWPORT (Zero scroll)
      left = Math.max(2, Math.min(vw - width - 2, left));
      top = Math.max(2, Math.min(vh - height - 2, top));

      // Subtle rotation (-2.8deg to +2.8deg)
      const rotate = Number(((this.pseudoRandom(seed + 5) - 0.5) * 5.6).toFixed(2));

      // Stacking order:
      // Index 0 (newest upload) gets 350 (top foreground)
      // Existing cards layer beneath: 345, 340, ... down to 10
      // (Center logo is at 500, toolbar at 600)
      const zIndex = Math.max(10, 350 - i * 4);

      positions.push({ left, top, width, height, rotate, zIndex });
    }

    return positions;
  },

  render() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Display exactly 77 photo cards when >= 77 available, or all available if fewer
    const targetCount = Math.min(this.posts.length, this.TARGET_CARDS);
    const visiblePosts = this.posts.slice(0, targetCount);

    const positions = this.calculatePositions(vw, vh, visiblePosts.length);

    this.gridEl.innerHTML = '';

    const fragment = document.createDocumentFragment();

    visiblePosts.forEach((post, i) => {
      const pos = positions[i];
      if (!pos) return;

      const tile = this.createTileElement(post, pos, i);
      fragment.appendChild(tile);
    });

    this.gridEl.appendChild(fragment);
  },

  createTileElement(post, pos, index) {
    const tile = document.createElement('div');
    tile.className = 'wall-tile';
    tile.dataset.postId = post.id;
    tile.setAttribute('role', 'button');
    tile.setAttribute('tabindex', '0');
    tile.setAttribute('aria-label', `Poster by ${post.display_name}: "${post.message}"`);

    // Absolute Position & Rotation
    tile.style.left = `${pos.left}px`;
    tile.style.top = `${pos.top}px`;
    tile.style.width = `${pos.width}px`;
    tile.style.height = `${pos.height}px`;
    tile.style.transform = `rotate(${pos.rotate}deg)`;
    tile.style.zIndex = pos.zIndex;
    tile.dataset.baseRotate = pos.rotate;

    // Determine Poster Theme
    let theme = post.poster_style;
    if (!theme || theme === 'default') {
      const themeIndex = Math.abs((post.id || (index + 1)) * 13) % this.THEMES.length;
      theme = this.THEMES[themeIndex];
    }

    // Clean Message & Author Info
    const cleanMessage = this.escapeHtml(post.message);
    const authorLocation = post.location ? post.location.split(',')[0].toUpperCase() : 'GLOBAL';
    const authorShortName = this.escapeHtml(post.display_name.split(' ')[0]);

    let headlineHtml = cleanMessage;
    if (theme === 'minimal-dark') {
      headlineHtml = cleanMessage.replace(/\b(HARD|ENOUGH|TRY|NOW|LIMIT|WILL|COMFORT|KILL|NOTHING|WORK|GROW)\b/gi, '<span class="highlight">$1</span>');
    }

    tile.innerHTML = `
      <div class="poster-card poster-theme-${theme}">
        <div class="poster-media-wrap">
          <img src="${this.escapeHtml(post.image_url)}" alt="${this.escapeHtml(post.display_name)}" loading="lazy">
        </div>
        <div class="poster-content-layer">
          <div class="poster-author-stamp">
            <span>📍 ${authorLocation}</span>
            <span>•</span>
            <span>${authorShortName}</span>
          </div>
          <div class="poster-headline">${headlineHtml}</div>
        </div>
      </div>
    `;

    // Fade-in image once loaded
    const img = tile.querySelector('img');
    if (img.complete) {
      img.classList.add('loaded');
    } else {
      img.onload = () => img.classList.add('loaded');
      img.onerror = () => {
        img.src = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80';
        img.classList.add('loaded');
      };
    }

    // Interaction handlers
    tile.addEventListener('click', () => {
      PostDetail.open(post.id);
    });

    tile.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        PostDetail.open(post.id);
      }
    });

    return tile;
  },

  prependLivePost(post) {
    if (this.posts.some(p => p.id === post.id)) return;

    // Add new post to the top of collection
    this.posts.unshift(post);
    this.totalCount += 1;

    // Re-render the 77-card collage:
    // The new post takes index 0 in the prominent foreground position (zIndex: 350)
    // The 78th oldest visible card drops off the screen without being deleted from the DB
    this.render();

    // Trigger spotlight animation on the newly placed poster
    const newEl = this.gridEl.querySelector(`[data-post-id="${post.id}"]`);
    if (newEl) {
      newEl.classList.add('just-added');
    }

    this.updateStatsDisplay();
    App.showToast(`New moment added to the wall by ${post.display_name}!`, 'info');
  },

  removePostFromWall(postId) {
    this.posts = this.posts.filter(p => p.id != postId);
    const el = this.gridEl.querySelector(`[data-post-id="${postId}"]`);
    if (el) {
      el.style.transform = 'scale(0.01) rotate(0deg)';
      el.style.opacity = '0';
      setTimeout(() => {
        this.render();
      }, 300);
    }
    this.totalCount = Math.max(0, this.totalCount - 1);
    this.updateStatsDisplay();
  },

  updateStatsDisplay() {
    // Stats text badge removed per design request
  },

  setDensity(density) {
    this.density = density;
    this.render();
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
