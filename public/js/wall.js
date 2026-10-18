// =========================================================
// K-WALL — Freeform Overlapping Poster Collage Engine
// Inspired by Reference Image 2: Dense, Layered, Artistic Wall
// =========================================================

const Wall = {
  gridEl: null,
  viewportEl: null,
  posts: [],
  totalCount: 0,
  limit: 150,
  offset: 0,
  isLoading: false,
  hasMore: true,
  resizeTimer: null,
  cachedWidth: 0,

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

    this.bindEvents();
    this.loadInitialPosts();
  },

  bindEvents() {
    // Infinite scroll - loads more posts when approaching bottom
    this.viewportEl.addEventListener('scroll', () => {
      if (this.isLoading || !this.hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = this.viewportEl;
      if (scrollTop + clientHeight >= scrollHeight - 450) {
        this.loadMorePosts();
      }
    });

    // Window Resize with debounce
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        if (Math.abs(window.innerWidth - this.cachedWidth) > 30) {
          this.cachedWidth = window.innerWidth;
          this.render();
        }
      }, 180);
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
      const data = await API.getPosts(this.limit, 0);
      this.posts = data.posts || [];
      this.totalCount = data.totalCount || this.posts.length;
      this.offset = this.posts.length;
      this.hasMore = this.offset < this.totalCount;

      this.render();
      this.updateStatsDisplay();
    } catch (err) {
      console.error('Failed to load initial wall posts:', err);
      App.showToast('Unable to load K-Wall moments. Check connection.', 'error');
    } finally {
      this.isLoading = false;
    }
  },

  async loadMorePosts() {
    if (this.isLoading || !this.hasMore) return;
    this.isLoading = true;

    try {
      const data = await API.getPosts(this.limit, this.offset);
      const newPosts = data.posts || [];
      if (newPosts.length === 0) {
        this.hasMore = false;
      } else {
        this.posts.push(...newPosts);
        this.offset += newPosts.length;
        this.hasMore = this.offset < data.totalCount;
        this.render();
      }
    } catch (err) {
      console.error('Error fetching more posts:', err);
    } finally {
      this.isLoading = false;
    }
  },

  // Deterministic Gap-Free Collage Packing Algorithm
  calculatePositions(viewportWidth) {
    // Determine number of placement columns/tracks
    let numTracks;
    if (viewportWidth >= 1700) {
      numTracks = 8;
    } else if (viewportWidth >= 1350) {
      numTracks = 7;
    } else if (viewportWidth >= 1000) {
      numTracks = 6;
    } else if (viewportWidth >= 680) {
      numTracks = 5;
    } else if (viewportWidth >= 460) {
      numTracks = 4;
    } else {
      numTracks = 3; // Mobile Portrait
    }

    // Apply density adjustment if set from wallpaper controls
    if (this.density === 'compact') {
      numTracks += 1;
    } else if (this.density === 'relaxed' && numTracks > 3) {
      numTracks -= 1;
    }

    // Track spacing ensures posters bleed nicely over left and right boundaries
    const trackSpacing = viewportWidth / (numTracks - 0.25);

    // Initial staggered top coordinates for each column track (positive, fully visible at top of viewport)
    const initialTops = [15, 28, 12, 32, 20, 14, 26, 18];
    const tracks = new Array(numTracks).fill(0).map((_, t) => initialTops[t % initialTops.length]);

    const positions = [];

    this.posts.forEach((post, i) => {
      const seed = (post.id || (i + 1)) * 41 + (i % 7);

      // 1. Choose size factor - posters are wider than trackSpacing so adjacent columns overlap!
      const sizeRand = this.pseudoRandom(seed);
      let widthFactor;
      if (sizeRand < 0.20) {
        widthFactor = 1.34 + this.pseudoRandom(seed + 1) * 0.16;
      } else if (sizeRand < 0.65) {
        widthFactor = 1.22 + this.pseudoRandom(seed + 2) * 0.14;
      } else if (sizeRand < 0.85) {
        widthFactor = 1.15 + this.pseudoRandom(seed + 3) * 0.12;
      } else {
        widthFactor = 1.08 + this.pseudoRandom(seed + 4) * 0.10;
      }

      let width = Math.round(trackSpacing * widthFactor);
      if (numTracks <= 3) {
        width = Math.min(width, Math.round(viewportWidth * 0.68));
      }

      // 2. Determine aspect ratio
      let ratio;
      const aspectStyle = post.aspect_ratio || '';
      if (aspectStyle === 'xtall' || aspectStyle === '9:16') {
        ratio = 1.58 + this.pseudoRandom(seed + 5) * 0.14;
      } else if (aspectStyle === 'tall' || aspectStyle === '2:3') {
        ratio = 1.36 + this.pseudoRandom(seed + 5) * 0.12;
      } else if (aspectStyle === 'standard' || aspectStyle === '3:4') {
        ratio = 1.22 + this.pseudoRandom(seed + 5) * 0.10;
      } else if (aspectStyle === 'wide' || aspectStyle === '16:10') {
        ratio = 0.82 + this.pseudoRandom(seed + 5) * 0.12;
      } else if (aspectStyle === 'square' || aspectStyle === '1:1') {
        ratio = 1.0;
      } else {
        const rRand = this.pseudoRandom(seed + 6);
        if (rRand < 0.42) ratio = 1.38 + this.pseudoRandom(seed + 7) * 0.14;
        else if (rRand < 0.72) ratio = 1.22 + this.pseudoRandom(seed + 7) * 0.12;
        else if (rRand < 0.88) ratio = 1.58 + this.pseudoRandom(seed + 7) * 0.14;
        else ratio = 0.84 + this.pseudoRandom(seed + 7) * 0.12;
      }

      const height = Math.round(width * ratio);

      // 3. Find track with shortest height (greedy bin packing eliminates gaps)
      let trackIdx = 0;
      for (let t = 1; t < numTracks; t++) {
        if (tracks[t] < tracks[trackIdx]) {
          trackIdx = t;
        }
      }

      // 4. Calculate X (Horizontal position with subtle organic jitter & edge bleed)
      const baseLeft = Math.round(trackIdx * trackSpacing - 30);
      const jitterX = Math.round((this.pseudoRandom(seed + 8) - 0.5) * (trackSpacing * 0.22));
      const left = baseLeft + jitterX;

      // 5. Calculate Y:
      // First poster in a track starts at initial top (no negative offset clipping)
      // Subsequent posters overlap the previous poster by 70px to 115px
      let top;
      if (tracks[trackIdx] <= 40) {
        top = tracks[trackIdx];
      } else {
        const overlapY = Math.round(70 + this.pseudoRandom(seed + 9) * 45);
        top = Math.round(tracks[trackIdx] - overlapY);
      }

      // 6. Update track heights and distribute weight across adjacent tracks
      tracks[trackIdx] = top + height;
      if (trackIdx + 1 < numTracks) {
        tracks[trackIdx + 1] = Math.max(tracks[trackIdx + 1], top + Math.round(height * 0.45));
      }
      if (trackIdx - 1 >= 0) {
        tracks[trackIdx - 1] = Math.max(tracks[trackIdx - 1], top + Math.round(height * 0.45));
      }

      // 7. Calculate Rotation (-3.2deg to +3.2deg)
      const rotate = Number(((this.pseudoRandom(seed + 10) - 0.5) * 6.4).toFixed(2));

      // 8. Stacking order:
      // Newest posts (index 0, 1, 2...) are in FRONT (highest zIndex: 260, 256, 252...)
      // Older posts layer behind them, down to zIndex: 10
      const zIndex = Math.max(10, 260 - i * 4);

      positions.push({ left, top, width, height, rotate, zIndex });
    });

    const maxCanvasHeight = Math.max(...tracks) + 160;
    return { positions, maxCanvasHeight };
  },

  render() {
    const viewportWidth = window.innerWidth;
    const { positions, maxCanvasHeight } = this.calculatePositions(viewportWidth);

    this.gridEl.innerHTML = '';
    this.gridEl.style.height = `${maxCanvasHeight}px`;

    const fragment = document.createDocumentFragment();

    this.posts.forEach((post, i) => {
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

    this.posts.unshift(post);
    this.totalCount += 1;

    // Re-render whole canvas seamlessly
    this.render();

    // Smoothly scroll viewport to the top so user immediately sees their photo
    if (this.viewportEl) {
      this.viewportEl.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Trigger spotlight animation on the newly placed poster
    const newEl = this.gridEl.querySelector(`[data-post-id="${post.id}"]`);
    if (newEl) {
      newEl.classList.add('just-added');
      setTimeout(() => {
        newEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }, 80);
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
    const statsEl = document.getElementById('wall-stats-text');
    if (statsEl) {
      statsEl.textContent = `${this.totalCount.toLocaleString()} moments worldwide • Live`;
    }
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
