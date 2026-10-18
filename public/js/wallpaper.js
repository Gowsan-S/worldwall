// Live Wallpaper Suite Controller
const Wallpaper = {
  modal: null,
  deferredPwaPrompt: null,

  init() {
    this.modal = document.getElementById('modal-wallpaper');
    this.bindEvents();
    this.checkUrlForWallpaperMode();
  },

  bindEvents() {
    // Fullscreen Wallpaper Button
    document.getElementById('btn-enter-fullscreen-wallpaper').addEventListener('click', () => {
      this.enterWallpaperMode();
    });

    document.getElementById('btn-exit-wallpaper').addEventListener('click', () => {
      this.exitWallpaperMode();
    });

    // Density Options
    const densityChips = document.querySelectorAll('#density-options .option-chip');
    densityChips.forEach(chip => {
      chip.addEventListener('click', () => {
        densityChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        Wall.setDensity(chip.dataset.density);
      });
    });


    // Theme Options
    const themeChips = document.querySelectorAll('#theme-options .option-chip');
    themeChips.forEach(chip => {
      chip.addEventListener('click', () => {
        themeChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.setTheme(chip.dataset.theme);
      });
    });

    // Display Toggles
    const toggleLogo = document.getElementById('toggle-wallpaper-logo');
    toggleLogo.addEventListener('change', (e) => {
      const logo = document.getElementById('center-logo');
      if (e.target.checked) {
        logo.classList.remove('logo-hidden');
      } else {
        logo.classList.add('logo-hidden');
      }
    });

    const toggleTooltips = document.getElementById('toggle-wallpaper-tooltips');
    toggleTooltips.addEventListener('change', (e) => {
      document.body.classList.toggle('hide-tile-tooltips', !e.target.checked);
    });

    const toggleMotion = document.getElementById('toggle-wallpaper-motion');
    toggleMotion.addEventListener('change', (e) => {
      document.body.classList.toggle('wallpaper-ambient-motion', e.target.checked);
    });

    // Copy Live Wallpaper Link
    const copyLinkBtn = document.getElementById('btn-copy-live-link');
    copyLinkBtn.addEventListener('click', () => {
      const liveUrl = `${window.location.origin}/?wallpaper=true`;
      navigator.clipboard.writeText(liveUrl).then(() => {
        App.showToast('Live Wallpaper link copied to clipboard!', 'success');
      }).catch(() => {
        prompt('Copy your Live Wallpaper link:', liveUrl);
      });
    });

    // Guide Accordions
    const guideHeaders = document.querySelectorAll('.guide-header');
    guideHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const item = header.closest('.guide-item');
        item.classList.toggle('open');
      });
    });

    // Update dynamic URL in guide box
    const winGuideUrl = document.getElementById('guide-url-box-win');
    if (winGuideUrl) {
      winGuideUrl.textContent = `${window.location.origin}/?wallpaper=true`;
    }

    // PWA Install prompt listener
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPwaPrompt = e;
      const pwaBtn = document.getElementById('btn-pwa-install');
      if (pwaBtn) {
        pwaBtn.style.display = 'inline-block';
        pwaBtn.addEventListener('click', () => {
          this.deferredPwaPrompt.prompt();
        });
      }
    });
  },

  checkUrlForWallpaperMode() {
    const url = new URL(window.location);
    if (url.searchParams.get('wallpaper') === 'true') {
      setTimeout(() => {
        this.enterWallpaperMode(false);
      }, 500);
    }
  },

  setTheme(theme) {
    document.body.classList.remove('theme-obsidian', 'theme-cyber', 'theme-midnight', 'theme-monochrome');
    document.body.classList.add(`theme-${theme}`);
  },

  enterWallpaperMode(requestBrowserFullscreen = true) {
    this.close();
    document.body.classList.add('mode-wallpaper');

    if (requestBrowserFullscreen && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }

    App.showToast('Entered Live Wallpaper Mode. Move cursor to bottom for controls, or top right to exit.', 'info');
  },

  exitWallpaperMode() {
    document.body.classList.remove('mode-wallpaper');

    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }

    const url = new URL(window.location);
    if (url.searchParams.has('wallpaper')) {
      url.searchParams.delete('wallpaper');
      window.history.replaceState({}, '', url);
    }

    App.showToast('Exited Wallpaper Mode', 'info');
  },

  open() {
    this.modal.classList.add('active');
  },

  close() {
    this.modal.classList.remove('active');
  }
};
