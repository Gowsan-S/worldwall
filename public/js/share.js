// =========================================================
// WORLD WALL — Viral Social Media Share Card Suite
// Allows users to share their previous World Wall photos
// with official logo, author badges, and viral invitations
// =========================================================

const Share = {
  modal: null,
  linkInput: null,
  copyBtn: null,
  shareData: {},
  currentPost: null,
  userPosts: [],
  activeTab: 'my-moment',

  init() {
    this.modal = document.getElementById('modal-share');
    this.linkInput = document.getElementById('share-link-input');
    this.copyBtn = document.getElementById('btn-copy-share-link');

    this.bindEvents();
  },

  bindEvents() {
    // 1. Tab Switching
    const tabMyMoment = document.getElementById('tab-share-my-moment');
    const tabWall = document.getElementById('tab-share-wall');

    if (tabMyMoment) {
      tabMyMoment.addEventListener('click', () => {
        this.switchTab('my-moment');
      });
    }

    if (tabWall) {
      tabWall.addEventListener('click', () => {
        this.switchTab('wall');
      });
    }

    // 2. Copy General Wall Link
    if (this.copyBtn) {
      this.copyBtn.addEventListener('click', () => {
        const url = this.linkInput.value;
        navigator.clipboard.writeText(url).then(() => {
          const originalText = this.copyBtn.textContent;
          this.copyBtn.textContent = 'Copied!';
          setTimeout(() => {
            this.copyBtn.textContent = originalText;
          }, 2000);
          App.showToast('World Wall link copied to clipboard!', 'success');
        }).catch(() => {
          prompt('Copy this link:', url);
        });
      });
    }

    // 3. Copy Moment Direct Link
    const copyCardLinkBtn = document.getElementById('btn-copy-card-link');
    if (copyCardLinkBtn) {
      copyCardLinkBtn.addEventListener('click', () => {
        const cardLinkInput = document.getElementById('share-card-link-input');
        if (!cardLinkInput) return;
        navigator.clipboard.writeText(cardLinkInput.value).then(() => {
          const original = copyCardLinkBtn.textContent;
          copyCardLinkBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyCardLinkBtn.textContent = original;
          }, 2000);
          App.showToast('Link to your photo copied to clipboard!', 'success');
        }).catch(() => {
          prompt('Copy link to your photo:', cardLinkInput.value);
        });
      });
    }

    // 4. Download Story Card (HD Canvas)
    const btnDownloadCard = document.getElementById('btn-download-share-card');
    if (btnDownloadCard) {
      btnDownloadCard.addEventListener('click', () => {
        this.downloadStoryCard();
      });
    }

    // 5. Native Share Button (Mobile 1-Tap)
    const btnNativeShare = document.getElementById('btn-native-share-card');
    if (btnNativeShare) {
      btnNativeShare.addEventListener('click', () => {
        this.nativeShareCard();
      });
    }

    // 6. Go Upload from Empty State
    const btnGoUpload = document.getElementById('btn-share-go-upload');
    if (btnGoUpload) {
      btnGoUpload.addEventListener('click', () => {
        this.close();
        Upload.open();
      });
    }

    const btnGoLogin = document.getElementById('btn-share-go-login');
    if (btnGoLogin) {
      btnGoLogin.addEventListener('click', () => {
        this.close();
        Auth.open('login');
      });
    }
  },

  switchTab(tabName) {
    this.activeTab = tabName;
    const tabMyMoment = document.getElementById('tab-share-my-moment');
    const tabWall = document.getElementById('tab-share-wall');
    const panelMyMoment = document.getElementById('share-panel-my-moment');
    const panelWall = document.getElementById('share-panel-wall');

    if (tabMyMoment && tabWall && panelMyMoment && panelWall) {
      tabMyMoment.classList.toggle('active', tabName === 'my-moment');
      tabWall.classList.toggle('active', tabName === 'wall');
      panelMyMoment.style.display = (tabName === 'my-moment') ? 'block' : 'none';
      panelWall.style.display = (tabName === 'wall') ? 'block' : 'none';
    }
  },

  // Open Share for general Wall or user's photo
  async openForWall() {
    const user = API.getUser();
    if (user) {
      // User is logged in: show My Photo card first, but load wall fallback
      await this.openForMyMoments();
    } else {
      this.setupWallShareData();
      this.switchTab('wall');
      this.modal.classList.add('active');
    }
  },

  // Open Share for a specific Post (e.g. from PostDetail or right after Upload)
  async openForPost(post, isUploadCelebration = false) {
    this.currentPost = post;
    this.switchTab('my-moment');
    this.modal.classList.add('active');

    // Title & Celebration indicator
    const titleEl = document.getElementById('share-modal-title');
    if (titleEl) {
      titleEl.textContent = isUploadCelebration 
        ? '🎉 Moment Published! Share with the World' 
        : `Share ${post.display_name}'s World Wall Moment`;
    }

    // Load user's other previous photos to populate the selector strip
    await this.loadUserPhotosStrip(post);

    // Render the card preview
    this.selectPost(post);

    if (isUploadCelebration) {
      App.showToast('🎉 Your moment is live! Share your official World Wall card to invite your friends.', 'success');
    }
  },

  // Open for current logged-in user's previous moments
  async openForMyMoments() {
    const user = API.getUser();
    this.switchTab('my-moment');
    this.modal.classList.add('active');

    const titleEl = document.getElementById('share-modal-title');
    if (titleEl) {
      titleEl.textContent = 'Share Your World Wall Moment';
    }

    this.setupWallShareData();

    if (!user) {
      this.renderNoPhotosState(false);
      return;
    }

    await this.loadUserPhotosStrip(null);
  },

  // Load previous photos strip for selector
  async loadUserPhotosStrip(preselectedPost = null) {
    const user = API.getUser();
    const stripEl = document.getElementById('share-user-photos-strip');
    const layoutContent = document.getElementById('share-card-layout-content');
    const noPhotosCallout = document.getElementById('share-no-photos-callout');
    const stripWrap = document.getElementById('share-history-selector-wrap');
    const countEl = document.getElementById('share-photos-count');

    if (!stripEl) return;

    if (!user && !preselectedPost) {
      this.renderNoPhotosState(false);
      return;
    }

    const userId = preselectedPost ? (preselectedPost.user_id || user?.id) : user?.id;

    try {
      const data = await API.getUserProfile(userId);
      this.userPosts = data.posts || [];

      // If preselectedPost is not in the list, prepend it
      if (preselectedPost && !this.userPosts.some(p => p.id === preselectedPost.id)) {
        this.userPosts.unshift(preselectedPost);
      }

      if (this.userPosts.length === 0) {
        this.renderNoPhotosState(true);
        return;
      }

      // Hide empty state, show card layout & selector
      if (noPhotosCallout) noPhotosCallout.style.display = 'none';
      if (layoutContent) layoutContent.style.display = 'grid';
      if (stripWrap) stripWrap.style.display = 'block';

      if (countEl) {
        countEl.textContent = `${this.userPosts.length} photo${this.userPosts.length === 1 ? '' : 's'} shared`;
      }

      // Build strip thumbnails
      stripEl.innerHTML = '';
      this.userPosts.forEach((p, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'share-strip-thumb';
        thumb.dataset.id = p.id;
        thumb.innerHTML = `
          <img src="${p.image_url}" alt="Photo ${idx + 1}" loading="lazy">
          <span class="strip-thumb-badge">${p.date_utc || (idx === 0 ? 'Latest' : `#${idx + 1}`)}</span>
        `;

        thumb.addEventListener('click', () => {
          this.selectPost(p);
        });

        stripEl.appendChild(thumb);
      });

      // Select target post or latest post
      const target = preselectedPost || this.userPosts[0];
      this.selectPost(target);

    } catch (err) {
      console.error('Failed to load user photo strip:', err);
      if (preselectedPost) {
        this.selectPost(preselectedPost);
      } else {
        this.renderNoPhotosState(false);
      }
    }
  },

  renderNoPhotosState(isLoggedInWithNoPhotos) {
    const layoutContent = document.getElementById('share-card-layout-content');
    const noPhotosCallout = document.getElementById('share-no-photos-callout');
    const stripWrap = document.getElementById('share-history-selector-wrap');
    const btnGoLogin = document.getElementById('btn-share-go-login');

    if (stripWrap) stripWrap.style.display = 'none';
    if (layoutContent) layoutContent.style.display = 'none';
    if (noPhotosCallout) noPhotosCallout.style.display = 'block';
    if (btnGoLogin) btnGoLogin.style.display = isLoggedInWithNoPhotos ? 'none' : 'inline-block';
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  // Select a post and update preview card & social links
  selectPost(post) {
    if (!post) return;
    this.currentPost = post;

    // 1. Highlight active thumb in strip
    const thumbs = document.querySelectorAll('.share-strip-thumb');
    thumbs.forEach(t => {
      t.classList.toggle('active', t.dataset.id === String(post.id));
    });

    // 2. Update Card Preview Elements
    const user = API.getUser();
    const displayName = post.display_name || user?.display_name || 'World Citizen';
    const avatarUrl = post.avatar_url || user?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${post.username || 'user'}`;

    const cardImg = document.getElementById('share-card-img');
    const cardMsg = document.getElementById('share-card-message');
    const cardAuthor = document.getElementById('share-card-author-name');
    const cardAvatar = document.getElementById('share-card-author-avatar');
    const cardLocation = document.getElementById('share-card-location');
    const cardDisplayUrl = document.getElementById('share-card-display-url');
    const posterInner = document.getElementById('share-card-poster-inner');

    if (cardImg) cardImg.src = post.image_url;
    if (cardAuthor) cardAuthor.textContent = displayName.split(' ')[0].toUpperCase();
    if (cardAvatar) cardAvatar.src = avatarUrl;

    const locUpper = post.location ? post.location.split(',')[0].toUpperCase() : 'GLOBAL';
    if (cardLocation) {
      cardLocation.textContent = `📍 ${locUpper}`;
      cardLocation.style.display = 'inline-flex';
    }

    let theme = post.poster_style;
    if (!theme || theme === 'default') {
      theme = 'distressed-red';
    }
    if (posterInner) {
      posterInner.className = `poster-card poster-theme-${theme}`;
    }

    const cleanMessage = this.escapeHtml(post.message || 'Connecting humanity one moment at a time.');
    let headlineHtml = cleanMessage;
    if (theme === 'minimal-dark') {
      headlineHtml = cleanMessage.replace(/\b(HARD|ENOUGH|TRY|NOW|LIMIT|WILL|COMFORT|KILL|NOTHING|WORK|GROW)\b/gi, '<span class="highlight">$1</span>');
    }
    if (cardMsg) {
      cardMsg.innerHTML = headlineHtml;
    }

    const livePostUrl = `${window.location.origin}/?post=${post.id}`;
    if (cardDisplayUrl) {
      cardDisplayUrl.textContent = window.location.host;
    }

    // Populate surrounding cards dynamically from live Wall if available
    this.updateSurroundingCards(post);

    // 3. Update Link Input
    const cardLinkInput = document.getElementById('share-card-link-input');
    if (cardLinkInput) {
      cardLinkInput.value = livePostUrl;
    }

    // 4. Update Social Sharing URLs (Viral Growth Hooks)
    const encodedUrl = encodeURIComponent(livePostUrl);
    const viralText = `I'm featured on the World Wall! 🌍✨ See my photo among 77 global moments. Join the living wall and add yours today 👇`;
    const encodedText = encodeURIComponent(viralText);

    const btnX = document.getElementById('btn-post-share-x');
    if (btnX) btnX.href = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}&hashtags=WorldWall,GlobalMosaic`;

    const btnWa = document.getElementById('btn-post-share-whatsapp');
    if (btnWa) btnWa.href = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;

    const btnTg = document.getElementById('btn-post-share-telegram');
    if (btnTg) btnTg.href = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;

    const btnFb = document.getElementById('btn-post-share-facebook');
    if (btnFb) btnFb.href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  },

  // Update background mosaic cards with real posts from live World Wall
  updateSurroundingCards(currentPost) {
    if (!window.Wall || !Array.isArray(window.Wall.posts) || window.Wall.posts.length === 0) return;
    const pool = window.Wall.posts.filter(p => p.id !== currentPost.id);
    if (pool.length < 5) return;

    const bgSelectors = [
      '.bg-card-tl',
      '.bg-card-tr',
      '.bg-card-tm',
      '.bg-card-ml',
      '.bg-card-mr',
      '.bg-card-bl',
      '.bg-card-br'
    ];

    bgSelectors.forEach((sel, idx) => {
      const cardEl = document.querySelector(sel);
      if (!cardEl) return;
      const p = pool[idx % pool.length];
      if (!p) return;

      const pTheme = p.poster_style || (window.Wall.THEMES ? window.Wall.THEMES[idx % window.Wall.THEMES.length] : 'default');
      const pLoc = p.location ? p.location.split(',')[0].toUpperCase() : 'GLOBAL';
      const pName = this.escapeHtml(p.display_name.split(' ')[0].toUpperCase());
      const pMsg = this.escapeHtml(p.message);

      cardEl.innerHTML = `
        <div class="poster-card poster-theme-${pTheme}">
          <div class="poster-media-wrap">
            <img src="${this.escapeHtml(p.image_url)}" alt="${pName}" loading="lazy">
          </div>
          <div class="poster-content-layer">
            <div class="poster-author-stamp">
              <span>📍 ${pLoc}</span>
              <span>•</span>
              <span>${pName}</span>
            </div>
            <div class="poster-headline">${pMsg}</div>
          </div>
        </div>
      `;
    });
  },

  setupWallShareData() {
    const url = window.location.origin;
    const title = 'World Wall — A Global Wall of People';
    const text = '77 moments from around the globe. Join the living digital mosaic of humanity!';

    this.shareData = { url, title, text };

    if (this.linkInput) {
      this.linkInput.value = url;
    }

    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);

    const shareX = document.getElementById('btn-share-x');
    if (shareX) shareX.href = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;

    const shareWa = document.getElementById('btn-share-whatsapp');
    if (shareWa) shareWa.href = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;

    const shareTg = document.getElementById('btn-share-telegram');
    if (shareTg) shareTg.href = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;

    const shareReddit = document.getElementById('btn-share-reddit');
    if (shareReddit) shareReddit.href = `https://reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent(title)}`;
  },

  // Generate 1080x1440 World Wall Collage Scene Canvas (Matching live wall aesthetic)
  async generateStoryCardCanvas(post) {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1440;
    const ctx = canvas.getContext('2d');

    // 1. Deep Obsidian / Frosted Cosmic Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1440);
    bgGrad.addColorStop(0, '#060810');
    bgGrad.addColorStop(0.35, '#0b1020');
    bgGrad.addColorStop(0.70, '#090d18');
    bgGrad.addColorStop(1, '#05070c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1440);

    // Subtle ambient color glows
    const radCyan = ctx.createRadialGradient(250, 250, 0, 250, 250, 500);
    radCyan.addColorStop(0, 'rgba(56, 189, 248, 0.18)');
    radCyan.addColorStop(1, 'transparent');
    ctx.fillStyle = radCyan;
    ctx.fillRect(0, 0, 1080, 1440);

    const radGold = ctx.createRadialGradient(750, 800, 0, 750, 800, 600);
    radGold.addColorStop(0, 'rgba(234, 179, 8, 0.16)');
    radGold.addColorStop(1, 'transparent');
    ctx.fillStyle = radGold;
    ctx.fillRect(0, 0, 1080, 1440);

    // Helper: Image Loader Promise with 2s timeout
    const loadImage = (src) => new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      let done = false;
      const timer = setTimeout(() => {
        if (!done) { done = true; resolve(null); }
      }, 2000);
      img.onload = () => {
        if (!done) { done = true; clearTimeout(timer); resolve(img); }
      };
      img.onerror = () => {
        if (!done) { done = true; clearTimeout(timer); resolve(null); }
      };
      img.src = src;
    });

    // Helper: Draw rounded rect
    const drawRoundRect = (x, y, w, h, r) => {
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
      } else {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      }
    };

    // Preload logo and user image
    const [logoImg, userImg] = await Promise.all([
      loadImage('/assets/logo.png'),
      loadImage(post.image_url)
    ]);

    // 2. Top Header Glass Banner
    const headerY = 35;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 2;
    drawRoundRect(50, headerY, 980, 85, 42);
    ctx.fill();
    ctx.stroke();

    if (logoImg) {
      ctx.drawImage(logoImg, 75, headerY + 12, 60, 60);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('WORLD WALL', 150, headerY + 44);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('A LIVING GLOBAL MOSAIC OF HUMANITY', 152, headerY + 70);

    // 1 OF 77 GLOBAL Badge
    ctx.fillStyle = 'rgba(234, 179, 8, 0.20)';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    drawRoundRect(790, headerY + 20, 220, 45, 22);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('1 OF 77 GLOBAL', 900, headerY + 48);
    ctx.restore();

    // 3. Draw Background Collage Posters (Authentic Wall Atmosphere)
    const bgMoments = [
      {
        x: 60, y: 155, w: 320, h: 380, deg: -3.5,
        loc: 'LONDON', author: 'OLIVER', headline: 'FIND YOUR FIRE',
        bg: '#831843', textColor: '#ffffff'
      },
      {
        x: 405, y: 145, w: 300, h: 360, deg: -1,
        loc: 'TOKYO', author: 'KENJI', headline: 'THE WILL MUST BE STRONGER',
        bg: '#18181b', textColor: '#ffffff'
      },
      {
        x: 730, y: 155, w: 310, h: 380, deg: 2.8,
        loc: 'ZURICH', author: 'LUKAS', headline: "CREATE DON'T WAIT",
        bg: '#ca8a04', textColor: '#000000'
      },
      {
        x: 40, y: 550, w: 310, h: 380, deg: -4,
        loc: 'BUENOS AIRES', author: 'SOFIA', headline: 'JUST TRY.',
        bg: '#0f172a', textColor: '#ffffff'
      },
      {
        x: 60, y: 910, w: 320, h: 380, deg: 2.5,
        loc: 'SANTIAGO', author: 'MATEO', headline: 'ARE YOU WORKING HARD ENOUGH?',
        bg: '#020617', textColor: '#ffffff'
      },
      {
        x: 720, y: 890, w: 320, h: 390, deg: -2.8,
        loc: 'OSLO', author: 'FREJA', headline: "DON'T PANIC",
        bg: '#eab308', textColor: '#000000'
      }
    ];

    bgMoments.forEach((m) => {
      ctx.save();
      const cx = m.x + m.w / 2;
      const cy = m.y + m.h / 2;
      ctx.translate(cx, cy);
      ctx.rotate((m.deg * Math.PI) / 180);
      ctx.translate(-cx, -cy);

      // Shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 35;
      ctx.shadowOffsetY = 15;

      // Background fill & clip
      drawRoundRect(m.x, m.y, m.w, m.h, 16);
      ctx.fillStyle = m.bg;
      ctx.fill();
      ctx.clip();

      // Top vignette
      const cardGrad = ctx.createLinearGradient(m.x, m.y, m.x, m.y + m.h);
      cardGrad.addColorStop(0, 'rgba(0,0,0,0.65)');
      cardGrad.addColorStop(0.4, 'rgba(0,0,0,0.2)');
      cardGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = cardGrad;
      ctx.fillRect(m.x, m.y, m.w, m.h);

      // Author stamp
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      drawRoundRect(m.x + 16, m.y + 16, m.w - 32, 38, 19);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`📍 ${m.loc} • ${m.author}`, m.x + m.w / 2, m.y + 40);

      // Headline
      ctx.fillStyle = m.textColor;
      ctx.font = 'bold 30px "Impact", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(m.headline, m.x + m.w / 2, m.y + m.h - 40, m.w - 30);

      ctx.restore();
    });

    // 4. Center World Wall Gold Emblem (matching center logo on wall)
    const logoBoxX = 140;
    const logoBoxY = 560;
    const logoBoxW = 320;
    const logoBoxH = 220;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.90)';
    ctx.shadowBlur = 45;
    ctx.shadowOffsetY = 15;

    ctx.fillStyle = 'rgba(14, 18, 30, 0.94)';
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.75)';
    ctx.lineWidth = 4;
    drawRoundRect(logoBoxX, logoBoxY, logoBoxW, logoBoxH, 22);
    ctx.fill();
    ctx.stroke();

    if (logoImg) {
      ctx.drawImage(logoImg, logoBoxX + 35, logoBoxY + 20, logoBoxW - 70, logoBoxH - 40);
    } else {
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 36px "Impact", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('WORLD WALL', logoBoxX + logoBoxW / 2, logoBoxY + 110);
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('ONE WALL ENDLESS STORY', logoBoxX + logoBoxW / 2, logoBoxY + 145);
    }
    ctx.restore();

    // 5. THE USER'S FEATURED POSTER CARD (Foreground Layer!)
    const featX = 470;
    const featY = 440;
    const featW = 540;
    const featH = 700;
    const featDeg = 1.8;

    ctx.save();
    const featCx = featX + featW / 2;
    const featCy = featY + featH / 2;
    ctx.translate(featCx, featCy);
    ctx.rotate((featDeg * Math.PI) / 180);
    ctx.translate(-featCx, -featCy);

    // Deep outer shadow & Gold Rim
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 60;
    ctx.shadowOffsetY = 25;

    drawRoundRect(featX, featY, featW, featH, 24);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    // Clip for photo
    ctx.save();
    drawRoundRect(featX, featY, featW, featH, 24);
    ctx.clip();

    if (userImg) {
      // Draw image object-fit: cover
      const imgRatio = userImg.width / userImg.height;
      let sWidth = userImg.width;
      let sHeight = userImg.height;
      let sx = 0;
      let sy = 0;

      if (imgRatio > (featW / featH)) {
        sWidth = userImg.height * (featW / featH);
        sx = (userImg.width - sWidth) / 2;
      } else {
        sHeight = userImg.width / (featW / featH);
        sy = (userImg.height - sHeight) / 2;
      }
      ctx.drawImage(userImg, sx, sy, sWidth, sHeight, featX, featY, featW, featH);
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(featX, featY, featW, featH);
    }

    // Poster gradient overlay for text readability
    const featGrad = ctx.createLinearGradient(featX, featY, featX, featY + featH);
    featGrad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    featGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.15)');
    featGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.40)');
    featGrad.addColorStop(1, 'rgba(0, 0, 0, 0.90)');
    ctx.fillStyle = featGrad;
    ctx.fillRect(featX, featY, featW, featH);

    // Author Stamp Pill (top-left)
    const locUpper = post.location ? post.location.split(',')[0].toUpperCase() : 'GLOBAL';
    const nameUpper = (post.display_name || 'USER').split(' ')[0].toUpperCase();

    ctx.fillStyle = 'rgba(10, 14, 24, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    drawRoundRect(featX + 22, featY + 22, 330, 48, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`📍 ${locUpper} • ${nameUpper}`, featX + 42, featY + 54);

    // ★ MY MOMENT Gold Ribbon (top-right)
    ctx.fillStyle = 'linear-gradient(135deg, #facc15, #ca8a04)';
    drawRoundRect(featX + featW - 170, featY + 22, 145, 48, 24);
    ctx.fillStyle = '#facc15';
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.font = '900 20px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ MY MOMENT', featX + featW - 97, featY + 53);

    // Poster Headline Text (bottom)
    const userMsg = (post.message || 'Connecting humanity one moment at a time.').toUpperCase();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px "Impact", "Arial Black", sans-serif';
    ctx.textAlign = 'center';

    // Word wrap for headline
    const words = userMsg.split(' ');
    let line = '';
    const lines = [];
    for (let n = 0; n < words.length; n++) {
      const test = line + words[n] + ' ';
      if (test.length > 22 && n > 0) {
        lines.push(line.trim());
        line = words[n] + ' ';
      } else {
        line = test;
      }
    }
    lines.push(line.trim());

    const maxLines = Math.min(lines.length, 3);
    const startTextY = featY + featH - (maxLines * 50) - 25;
    lines.slice(0, 3).forEach((l, i) => {
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 10;
      ctx.fillText(l, featX + featW / 2, startTextY + (i * 50));
    });

    ctx.restore(); // restore clip

    // Glowing Gold Border Stroke around Featured Card
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.98)';
    ctx.lineWidth = 7;
    drawRoundRect(featX, featY, featW, featH, 24);
    ctx.stroke();

    ctx.restore(); // restore rotation & translation

    // 6. Bottom Viral Invitation Footer Bar
    const footerY = 1305;
    ctx.save();
    ctx.fillStyle = 'rgba(14, 20, 32, 0.88)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 2.5;
    drawRoundRect(50, footerY, 980, 95, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText("I'M ON THE WORLD WALL! 🌍✨", 85, footerY + 42);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Find my photo among 77 global moments & share yours', 85, footerY + 74);

    // URL Pill on right
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.50)';
    ctx.lineWidth = 1.5;
    drawRoundRect(740, footerY + 22, 260, 52, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(window.location.host || 'worldwall.app', 870, footerY + 56);
    ctx.restore();

    return canvas;
  },

  // 1-Click Download Story Card as High-Res Image
  async downloadStoryCard() {
    if (!this.currentPost) {
      App.showToast('Please select a photo to share.', 'info');
      return;
    }

    App.showToast('Rendering high-resolution Story Card...', 'info');

    try {
      const canvas = await this.generateStoryCardCanvas(this.currentPost);
      canvas.toBlob((blob) => {
        if (!blob) {
          App.showToast('Failed to create image.', 'error');
          return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `WorldWall-Moment-${this.currentPost.id || 'card'}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);

        App.showToast('📥 Story Card downloaded! Post it to your Instagram Story or WhatsApp Status.', 'success');
      }, 'image/png');
    } catch (err) {
      console.error('Failed to download story card:', err);
      App.showToast('Error rendering story card.', 'error');
    }
  },

  // 1-Tap Native Share (Mobile Instagram / WhatsApp / X)
  async nativeShareCard() {
    if (!this.currentPost) return;

    const liveUrl = `${window.location.origin}/?post=${this.currentPost.id}`;
    const title = `My moment on World Wall`;
    const text = `I'm featured on the World Wall! 🌍✨ Find my photo among 77 global moments and share yours too: ${liveUrl}`;

    try {
      if (navigator.share) {
        // Try file sharing if supported
        const canvas = await this.generateStoryCardCanvas(this.currentPost);
        canvas.toBlob(async (blob) => {
          if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], 'WorldWall.png', { type: 'image/png' })] })) {
            const file = new File([blob], `WorldWall-${this.currentPost.id}.png`, { type: 'image/png' });
            try {
              await navigator.share({
                title,
                text,
                files: [file]
              });
              App.showToast('Shared successfully!', 'success');
              return;
            } catch (e) {
              if (e.name === 'AbortError') return;
            }
          }

          // Fallback to URL/text sharing
          try {
            await navigator.share({ title, text, url: liveUrl });
            App.showToast('Shared successfully!', 'success');
          } catch (e) {
            if (e.name !== 'AbortError') {
              this.downloadStoryCard();
            }
          }
        }, 'image/png');
      } else {
        // Desktop fallback: download image + copy link
        this.downloadStoryCard();
      }
    } catch (err) {
      console.error('Native share error:', err);
      this.downloadStoryCard();
    }
  },

  close() {
    this.modal.classList.remove('active');
  }
};

