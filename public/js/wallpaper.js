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

    // 1-Click Automated Live Wallpaper Buttons
    const btnAutoWindows = document.getElementById('btn-auto-add-windows');
    if (btnAutoWindows) {
      btnAutoWindows.addEventListener('click', () => {
        this.autoAddWindows();
      });
    }

    const btnGuideAutoWindows = document.getElementById('btn-guide-auto-windows');
    if (btnGuideAutoWindows) {
      btnGuideAutoWindows.addEventListener('click', () => {
        this.autoAddWindows();
      });
    }

    const btnDownloadLively = document.getElementById('btn-download-lively-pkg');
    if (btnDownloadLively) {
      btnDownloadLively.addEventListener('click', () => {
        this.downloadLivelyPackage();
      });
    }

    const btnSetDesktopHd = document.getElementById('btn-set-desktop-hd');
    if (btnSetDesktopHd) {
      btnSetDesktopHd.addEventListener('click', () => {
        this.setDesktopHdSnapshot();
      });
    }
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
  },

  // 1-Click Windows Live Wallpaper Runner (.bat)
  autoAddWindows() {
    const liveUrl = `${window.location.origin}/?wallpaper=true`;

    // 1. Trigger the download of Add-WorldWall-LiveWallpaper.bat
    const link = document.createElement('a');
    link.href = '/api/wallpaper/download-bat';
    link.download = 'Add-WorldWall-LiveWallpaper.bat';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 2. Also attempt custom protocol lively:// if available
    try {
      const protoFrame = document.createElement('iframe');
      protoFrame.style.display = 'none';
      protoFrame.src = `lively://import?url=${encodeURIComponent(liveUrl)}`;
      document.body.appendChild(protoFrame);
      setTimeout(() => protoFrame.remove(), 2000);
    } catch (e) {}

    // 3. Success feedback toast
    App.showToast('⚡ "Add-WorldWall-LiveWallpaper.bat" downloaded! Click it once to automatically launch or set World Wall as your desktop live wallpaper.', 'success');
  },

  // 1-Click Lively Wallpaper Pack (.lively)
  downloadLivelyPackage() {
    const link = document.createElement('a');
    link.href = '/api/wallpaper/download-lively';
    link.download = 'WorldWall.lively';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    App.showToast('📥 "WorldWall.lively" downloaded! Double-click it to automatically import into Lively Wallpaper.', 'info');
  },

  // 1-Click HD Wallpaper Snapshot
  async setDesktopHdSnapshot() {
    App.showToast('Capturing high-resolution wallpaper snapshot...', 'info');

    try {
      const width = Math.max(window.innerWidth, 1920);
      const height = Math.max(window.innerHeight, 1080);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // Fill background
      ctx.fillStyle = '#07090e';
      ctx.fillRect(0, 0, width, height);

      // Render visible wall tiles
      const tiles = Array.from(document.querySelectorAll('.wall-tile'));
      for (const tile of tiles) {
        const rect = tile.getBoundingClientRect();
        const img = tile.querySelector('img');
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.save();
          const scaleX = width / window.innerWidth;
          const scaleY = height / window.innerHeight;
          const x = rect.left * scaleX;
          const y = rect.top * scaleY;
          const w = rect.width * scaleX;
          const h = rect.height * scaleY;

          ctx.drawImage(img, x, y, w, h);
          ctx.restore();
        }
      }

      // Draw center emblem if available
      const logoImg = document.querySelector('.center-emblem-img');
      if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
        const logoRect = logoImg.getBoundingClientRect();
        const scaleX = width / window.innerWidth;
        const scaleY = height / window.innerHeight;
        const lx = logoRect.left * scaleX;
        const ly = logoRect.top * scaleY;
        const lw = logoRect.width * scaleX;
        const lh = logoRect.height * scaleY;
        ctx.drawImage(logoImg, lx, ly, lw, lh);
      }

      // Export snapshot
      canvas.toBlob((blob) => {
        if (!blob) {
          App.showToast('Could not generate wallpaper image', 'error');
          return;
        }
        const imgUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = imgUrl;
        a.download = 'WorldWall-Desktop-Wallpaper.jpg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Download companion 1-click batch setter
        const batContent = `@echo off
title Setting World Wall as Windows Desktop Wallpaper...
echo Setting World Wall as your desktop background...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$code = '[DllImport(\\"\"user32.dll\\"\", CharSet=CharSet.Auto)] public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);'; Add-Type -MemberDefinition $code -Name Wallpaper -Namespace Win32; $img = [System.IO.Path]::GetFullPath('WorldWall-Desktop-Wallpaper.jpg'); [Win32.Wallpaper]::SystemParametersInfo(0x0014, 0, $img, 0x0001 -bor 0x0002)"
echo.
echo ===================================================
echo [SUCCESS] Your Windows Desktop Wallpaper has been updated!
echo ===================================================
timeout /t 4 >nul
`;
        const batBlob = new Blob([batContent], { type: 'application/x-bat' });
        const batUrl = URL.createObjectURL(batBlob);
        const batLink = document.createElement('a');
        batLink.href = batUrl;
        batLink.download = 'Apply-Desktop-Wallpaper.bat';
        document.body.appendChild(batLink);
        setTimeout(() => {
          batLink.click();
          document.body.removeChild(batLink);
        }, 500);

        App.showToast('🖼️ Downloaded Wallpaper image and 1-click installer "Apply-Desktop-Wallpaper.bat"!', 'success');
      }, 'image/jpeg', 0.95);
    } catch (err) {
      console.error('Error creating wallpaper snapshot:', err);
      App.showToast('Failed to capture wallpaper snapshot', 'error');
    }
  }
};
