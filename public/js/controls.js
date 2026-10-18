// Bottom Floating Control Bar & UTC Countdown Engine
const Controls = {
  uploadBtn: null,
  lockedBtn: null,
  countdownText: null,
  timerInterval: null,
  countdownSeconds: 0,
  isEligible: true,

  init() {
    this.uploadBtn = document.getElementById('btn-dock-upload');
    this.lockedBtn = document.getElementById('btn-dock-locked');
    this.countdownText = document.getElementById('dock-countdown-text');

    this.bindEvents();
    this.syncEligibility();
  },

  bindEvents() {
    // 1. Upload click
    this.uploadBtn.addEventListener('click', () => {
      const user = API.getUser();
      if (!user) {
        App.showToast('Please sign in or create an account to share your photo on K-Wall.', 'info');
        Auth.open('login');
      } else {
        Upload.open();
      }
    });

    // Locked click fallback
    if (this.lockedBtn) {
      this.lockedBtn.addEventListener('click', () => {
        Upload.open();
      });
    }


    // 2. Wallpaper click
    document.getElementById('btn-dock-wallpaper').addEventListener('click', () => {
      Wallpaper.open();
    });

    // 3. Share click
    document.getElementById('btn-dock-share').addEventListener('click', () => {
      Share.openForWall();
    });

    // 4. Messages click
    const messagesBtn = document.getElementById('btn-dock-messages');
    if (messagesBtn) {
      messagesBtn.addEventListener('click', () => {
        Chat.open();
      });
    }

    // 5. Auth / Profile clicks
    document.getElementById('btn-dock-signin').addEventListener('click', () => {
      Auth.open('login');
    });

    document.getElementById('btn-dock-profile').addEventListener('click', () => {
      const user = API.getUser();
      if (user) {
        Profile.open(user.username, true);
      }
    });

    // WebSocket sync for countdown or new post
    Socket.on('WELCOME', (payload) => {
      if (payload && payload.countdown) {
        this.setCountdownFromData(payload.countdown);
      }
    });
  },

  async syncEligibility() {
    try {
      const data = await API.checkEligibility();
      this.isEligible = true; // Unlimited uploads - no time limit
      if (data && data.countdown) {
        this.setCountdownFromData(data.countdown);
      }
      this.updateButtonState();
    } catch (err) {
      console.error('Error checking eligibility:', err);
    }
  },

  setCountdownFromData(countdown) {
    this.countdownSeconds = countdown.totalSeconds || 0;
    this.startCountdownTimer();
  },

  startCountdownTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.renderCountdownText();

    this.timerInterval = setInterval(() => {
      if (this.countdownSeconds > 0) {
        this.countdownSeconds -= 1;
        this.renderCountdownText();
      } else {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    }, 1000);
  },

  renderCountdownText() {
    const hours = Math.floor(this.countdownSeconds / 3600);
    const minutes = Math.floor((this.countdownSeconds % 3600) / 60);
    const seconds = this.countdownSeconds % 60;

    const formatted = [
      String(hours).padStart(2, '0'),
      String(minutes).padStart(2, '0'),
      String(seconds).padStart(2, '0')
    ].join(':');

    if (this.countdownText) {
      this.countdownText.textContent = formatted;
    }
  },

  onMidnightReached() {
    console.log('[K-Wall] UTC Midnight reached.');
  },

  updateButtonState() {
    const user = API.getUser();

    // Update Dock Profile Trigger
    const signinBtn = document.getElementById('btn-dock-signin');
    const profileBtn = document.getElementById('btn-dock-profile');
    const messagesBtn = document.getElementById('btn-dock-messages');

    if (user) {
      signinBtn.style.display = 'none';
      profileBtn.style.display = 'flex';
      messagesBtn.style.display = 'flex';

      document.getElementById('dock-avatar-img').src = user.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`;
      document.getElementById('dock-username-label').textContent = user.display_name.split(' ')[0];

      // Unlimited uploads: always show upload button, hide locked button
      this.uploadBtn.style.display = 'flex';
      if (this.lockedBtn) this.lockedBtn.style.display = 'none';
    } else {
      signinBtn.style.display = 'block';
      profileBtn.style.display = 'none';
      messagesBtn.style.display = 'none';

      this.uploadBtn.style.display = 'flex';
      if (this.lockedBtn) this.lockedBtn.style.display = 'none';
    }
  },

  setUploadedToday(todayPostId) {
    this.isEligible = true; // Stay eligible for next upload immediately
    this.updateButtonState();
  }
};
