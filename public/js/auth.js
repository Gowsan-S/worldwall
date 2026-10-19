// Authentication Controller (Sign In & Registration)
const Auth = {
  modal: null,

  init() {
    this.modal = document.getElementById('modal-auth');
    this.bindEvents();
  },

  bindEvents() {
    // Tabs
    const loginTabBtn = document.getElementById('tab-login-btn');
    const regTabBtn = document.getElementById('tab-register-btn');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');

    loginTabBtn.addEventListener('click', () => {
      loginTabBtn.classList.add('active');
      regTabBtn.classList.remove('active');
      formLogin.style.display = 'block';
      formRegister.style.display = 'none';
    });

    regTabBtn.addEventListener('click', () => {
      regTabBtn.classList.add('active');
      loginTabBtn.classList.remove('active');
      formLogin.style.display = 'none';
      formRegister.style.display = 'block';
    });

    // Switch buttons
    const btnSwitchReg = document.getElementById('btn-switch-to-register');
    if (btnSwitchReg) {
      btnSwitchReg.addEventListener('click', () => {
        this.open('register');
      });
    }

    const btnSwitchLogin = document.getElementById('btn-switch-to-login');
    if (btnSwitchLogin) {
      btnSwitchLogin.addEventListener('click', () => {
        this.open('login');
      });
    }

    // Login submit
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const identifier = document.getElementById('login-identifier').value.trim();
      const password = document.getElementById('login-password').value;

      try {
        const res = await API.login(identifier, password);
        API.setToken(res.token);
        API.setUser(res.user);
        await Controls.syncEligibility();
        this.close();
        App.showToast(`Welcome back, ${res.user.display_name}!`, 'success');
      } catch (err) {
        const msg = err.message || 'Login failed. Please check your credentials.';
        App.showToast(msg, 'error');

        // If user wasn't found, auto-switch to register with their credentials pre-filled
        if (msg.includes('No account found') || msg.includes('Create Account')) {
          setTimeout(() => {
            const regUsername = document.getElementById('reg-username');
            const regEmail = document.getElementById('reg-email');
            const regPassword = document.getElementById('reg-password');
            const regName = document.getElementById('reg-name');

            if (regUsername && identifier) {
              const cleanUser = identifier.replace(/[^a-zA-Z0-9_]/g, '_');
              regUsername.value = cleanUser;
              if (regName) regName.value = cleanUser.charAt(0).toUpperCase() + cleanUser.slice(1);
            }
            if (regEmail && identifier.includes('@')) {
              regEmail.value = identifier;
            }
            if (regPassword && password) {
              regPassword.value = password;
            }

            this.open('register');
            App.showToast(`We filled in your details! Click 'Create Account' to join World Wall.`, 'info');
          }, 1200);
        }
      }
    });

    // Register submit
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('reg-username').value.trim();
      const display_name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const location = document.getElementById('reg-location').value.trim();

      try {
        const res = await API.register({ username, display_name, email, password, location });
        API.setToken(res.token);
        API.setUser(res.user);
        await Controls.syncEligibility();
        this.close();
        App.showToast(`Account created! Welcome to World Wall, ${res.user.display_name}!`, 'success');
      } catch (err) {
        App.showToast(err.message || 'Registration failed.', 'error');
      }
    });

    // Quick demo buttons
    const btnDemo = document.getElementById('btn-quick-demo');
    if (btnDemo) {
      btnDemo.addEventListener('click', async () => {
        try {
          const res = await API.login('demo', 'demo123');
          API.setToken(res.token);
          API.setUser(res.user);
          await Controls.syncEligibility();
          this.close();
          App.showToast(`Signed in as Alex Chen (Demo)`, 'success');
        } catch (err) {
          App.showToast('Demo login error: ' + err.message, 'error');
        }
      });
    }

    const btnAdmin = document.getElementById('btn-quick-admin');
    if (btnAdmin) {
      btnAdmin.addEventListener('click', async () => {
        try {
          const res = await API.login('admin', 'admin123');
          API.setToken(res.token);
          API.setUser(res.user);
          await Controls.syncEligibility();
          this.close();
          App.showToast(`Signed in as Curator (Admin)`, 'success');
        } catch (err) {
          App.showToast('Admin login error: ' + err.message, 'error');
        }
      });
    }

    // 1-Click Guest Login
    const btnGuest = document.getElementById('btn-quick-guest');
    if (btnGuest) {
      btnGuest.addEventListener('click', async () => {
        try {
          const res = await API.guestLogin();
          API.setToken(res.token);
          API.setUser(res.user);
          await Controls.syncEligibility();
          this.close();
          App.showToast(`✨ Welcome, ${res.user.display_name}! (Guest Session Active)`, 'success');
        } catch (err) {
          App.showToast('Guest sign-in error: ' + err.message, 'error');
        }
      });
    }
  },

  open(mode = 'login') {
    const loginTabBtn = document.getElementById('tab-login-btn');
    const regTabBtn = document.getElementById('tab-register-btn');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');

    if (mode === 'register') {
      regTabBtn.classList.add('active');
      loginTabBtn.classList.remove('active');
      formLogin.style.display = 'none';
      formRegister.style.display = 'block';
    } else {
      loginTabBtn.classList.add('active');
      regTabBtn.classList.remove('active');
      formLogin.style.display = 'block';
      formRegister.style.display = 'none';
    }

    this.modal.classList.add('active');
  },

  close() {
    this.modal.classList.remove('active');
  }
};
