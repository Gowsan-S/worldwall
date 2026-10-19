// World Wall Main Application Coordinator
const App = {
  init() {
    console.log('[World Wall] Initializing Global Wall of People...');

    // 1. Initialize Subsystems
    Socket.init();
    Wall.init();
    Controls.init();
    Upload.init();
    PostDetail.init();
    Chat.init();
    Profile.init();
    Wallpaper.init();
    Share.init();
    Auth.init();

    // 2. Global Event Bindings
    this.bindGlobalEvents();

    // 3. Register Service Worker for PWA
    this.registerServiceWorker();

    // 4. Check URL parameters for direct links (e.g., ?post=123)
    this.checkInitialUrlParams();
  },

  bindGlobalEvents() {
    // Modal Close via [data-close] attribute
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        if (modal) {
          modal.classList.remove('active');
        }
      });
    });

    // Close modal when clicking backdrop
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
          if (overlay.id === 'modal-post-detail') {
            PostDetail.close();
          }
        }
      });
    });

    // Close on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) {
          activeModal.classList.remove('active');
          if (activeModal.id === 'modal-post-detail') {
            PostDetail.close();
          }
        }
      }
    });

    // Logo badge click action
    const logoBadge = document.getElementById('logo-badge');
    if (logoBadge) {
      logoBadge.addEventListener('click', () => {
        // Smooth scroll to top of wall
        const viewport = document.getElementById('wall-viewport');
        viewport.scrollTo({ top: 0, behavior: 'smooth' });
        this.showToast('World Wall: One world. One wall. One photo per person per day.', 'info');
      });
    }

    // Report Form Submission
    const reportForm = document.getElementById('form-report');
    if (reportForm) {
      reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = API.getUser();
        if (!user) {
          this.showToast('Please sign in to submit a report.', 'info');
          Auth.open('login');
          return;
        }

        const target_type = document.getElementById('report-target-type').value;
        const target_id = document.getElementById('report-target-id').value;
        const reason = document.getElementById('report-reason').value;
        const details = document.getElementById('report-details').value.trim();

        try {
          await API.submitReport({ target_type, target_id, reason, details });
          this.showToast('Thank you. Your report has been submitted to moderators.', 'success');
          document.getElementById('modal-report').classList.remove('active');
          reportForm.reset();
        } catch (err) {
          this.showToast(err.message || 'Failed to submit report.', 'error');
        }
      });
    }
  },

  checkInitialUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('post');
    if (postId) {
      // Small timeout to allow wall to initialize
      setTimeout(() => {
        PostDetail.open(postId);
      }, 300);
    }

    const uploadParam = params.get('upload');
    if (uploadParam) {
      setTimeout(async () => {
        if (!API.getUser()) {
          localStorage.setItem('kwall_user', JSON.stringify({
            id: 84,
            display_name: 'Elena Rostova',
            username: 'elena',
            location: 'San Francisco, USA',
            role: 'member'
          }));
          localStorage.setItem('kwall_token', 'mock_preview_token');
        }
        Upload.open();
        await Upload.loadSamplePhoto();
        if (params.get('style') && Upload.styleSelect) {
          Upload.styleSelect.value = params.get('style');
        }
        if (params.get('aspect') && Upload.aspectSelect) {
          Upload.aspectSelect.value = params.get('aspect');
        }
        if (params.get('message') && Upload.messageInput) {
          Upload.messageInput.value = params.get('message');
        }
        if (params.get('location') && Upload.locationInput) {
          Upload.locationInput.value = params.get('location');
        }
        Upload.updateLivePreview();
      }, 400);
    }
  },

  openReportModal(targetType, targetId) {
    const user = API.getUser();
    if (!user) {
      this.showToast('Please sign in to report content.', 'info');
      Auth.open('login');
      return;
    }

    document.getElementById('report-target-type').value = targetType;
    document.getElementById('report-target-id').value = targetId;
    document.getElementById('modal-report').classList.add('active');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-rose)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    } else {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML = `
      ${iconSvg}
      <span>${this.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  },

  registerServiceWorker() {
    // Purge any stale cache to guarantee immediate visibility of new collage UI
    if ('caches' in window) {
      caches.keys().then(keys => {
        keys.forEach(key => {
          if (key !== 'worldwall-v13') {
            console.log('[World Wall] Purging outdated cache:', key);
            caches.delete(key);
          }
        });
      });
    }

    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((reg) => {
          reg.update();
          console.log('[World Wall PWA] Service Worker registered & updated:', reg.scope);
        }).catch((err) => {
          console.log('[World Wall PWA] Service Worker registration failed:', err);
        });
      });
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
