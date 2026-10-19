// Public Profile & Profile Management
const Profile = {
  modal: null,
  currentUserProfile: null,
  isSelf: false,

  init() {
    this.modal = document.getElementById('modal-profile');
    this.bindEvents();
  },

  bindEvents() {
    // Tabs
    const tabs = ['view', 'history', 'edit', 'blocks'];
    tabs.forEach(tab => {
      const btn = document.getElementById(`tab-profile-${tab}`);
      if (btn) {
        btn.addEventListener('click', () => {
          this.switchTab(tab);
        });
      }
    });

    // Send Message from Profile
    document.getElementById('btn-profile-message').addEventListener('click', () => {
      if (this.currentUserProfile) {
        this.close();
        Chat.openWithUser(this.currentUserProfile.id, this.currentUserProfile.display_name);
      }
    });

    // Block/Unblock User
    document.getElementById('btn-profile-block').addEventListener('click', async () => {
      if (!this.currentUserProfile) return;
      try {
        await API.blockUser(this.currentUserProfile.id);
        App.showToast(`User ${this.currentUserProfile.display_name} blocked.`, 'info');
        this.close();
      } catch (err) {
        App.showToast(err.message || 'Error blocking user.', 'error');
      }
    });

    // Edit Profile Form
    document.getElementById('form-edit-profile').addEventListener('submit', async (e) => {
      e.preventDefault();
      const displayName = document.getElementById('edit-display-name').value.trim();
      const bio = document.getElementById('edit-bio').value.trim();
      const location = document.getElementById('edit-location').value.trim();

      try {
        const res = await API.updateProfile({ display_name: displayName, bio, location });
        API.setUser(res.user);
        Controls.updateButtonState();
        App.showToast('Profile updated successfully!', 'success');
        this.open(res.user.username, true);
      } catch (err) {
        App.showToast(err.message || 'Failed to update profile.', 'error');
      }
    });

    // Share Photo Card from Profile
    const btnProfileShareCard = document.getElementById('btn-profile-share-card');
    if (btnProfileShareCard) {
      btnProfileShareCard.addEventListener('click', () => {
        const targetPost = (this.currentUserPosts && this.currentUserPosts.length > 0)
          ? this.currentUserPosts[0]
          : null;
        this.close();
        if (targetPost) {
          Share.openForPost(targetPost);
        } else {
          Share.openForMyMoments();
        }
      });
    }

    // Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
      API.clearAuth();
      Controls.updateButtonState();
      this.close();
      App.showToast('Signed out successfully.', 'info');
    });
  },

  switchTab(tabName) {
    ['view', 'history', 'edit', 'blocks'].forEach(t => {
      const btn = document.getElementById(`tab-profile-${t}`);
      const content = document.getElementById(`profile-${t}-tab`);
      if (btn) btn.classList.toggle('active', t === tabName);
      if (content) content.style.display = (t === tabName) ? 'block' : 'none';
    });
  },

  async open(identifier, isSelfExplicit = false) {
    try {
      const data = await API.getUserProfile(identifier);
      const user = data.profile;
      this.currentUserProfile = user;
      this.currentUserPosts = data.posts || [];

      const loggedInUser = API.getUser();
      this.isSelf = isSelfExplicit || (loggedInUser && loggedInUser.id === user.id);

      // Populate view fields
      document.getElementById('profile-name-display').textContent = user.display_name;
      document.getElementById('profile-username-display').textContent = `@${user.username}`;
      document.getElementById('profile-avatar-display').src = user.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`;
      document.getElementById('profile-location-display').textContent = user.location ? `📍 ${user.location}` : '';
      
      const bioBox = document.getElementById('profile-bio-box');
      if (user.bio) {
        document.getElementById('profile-bio-display').textContent = `"${user.bio}"`;
        bioBox.style.display = 'block';
      } else {
        bioBox.style.display = 'none';
      }

      document.getElementById('profile-joined-display').textContent = new Date(user.created_at).toLocaleDateString();
      document.getElementById('profile-posts-count-display').textContent = (data.posts || []).length;

      // Populate Upload History Grid
      const historyGrid = document.getElementById('profile-history-grid');
      historyGrid.innerHTML = '';
      if ((data.posts || []).length === 0) {
        historyGrid.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 20px;">No photos published yet.</div>';
      } else {
        data.posts.forEach(p => {
          const thumb = document.createElement('div');
          thumb.className = 'profile-thumb';
          thumb.title = `"${p.message}" (${p.date_utc})`;
          thumb.innerHTML = `<img src="${p.image_url}" alt="Moment">`;
          thumb.addEventListener('click', () => {
            this.close();
            PostDetail.open(p.id);
          });
          historyGrid.appendChild(thumb);
        });
      }

      // Self vs Other controls
      const editTabBtn = document.getElementById('tab-profile-edit');
      const blocksTabBtn = document.getElementById('tab-profile-blocks');
      const actionsBar = document.getElementById('profile-actions-bar');
      const logoutBtn = document.getElementById('btn-logout');
      const msgBtn = document.getElementById('btn-profile-message');
      const blockBtn = document.getElementById('btn-profile-block');
      const shareCardBtn = document.getElementById('btn-profile-share-card');

      if (actionsBar) actionsBar.style.display = 'flex';

      if (this.isSelf) {
        if (editTabBtn) editTabBtn.style.display = 'inline-block';
        if (blocksTabBtn) blocksTabBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'inline-flex';
        if (msgBtn) msgBtn.style.display = 'none';
        if (blockBtn) blockBtn.style.display = 'none';
        if (shareCardBtn) shareCardBtn.style.display = (this.currentUserPosts.length > 0) ? 'inline-flex' : 'none';

        // Pre-fill edit inputs
        document.getElementById('edit-display-name').value = user.display_name;
        document.getElementById('edit-bio').value = user.bio || '';
        document.getElementById('edit-location').value = user.location || '';

        this.loadBlockedUsers();
      } else {
        if (editTabBtn) editTabBtn.style.display = 'none';
        if (blocksTabBtn) blocksTabBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (msgBtn) msgBtn.style.display = 'inline-flex';
        if (blockBtn) blockBtn.style.display = 'inline-flex';
        if (shareCardBtn) shareCardBtn.style.display = (this.currentUserPosts.length > 0) ? 'inline-flex' : 'none';
      }

      this.switchTab('view');
      this.modal.classList.add('active');
    } catch (err) {
      console.error('Error opening profile:', err);
      App.showToast('Unable to load profile.', 'error');
    }
  },

  async loadBlockedUsers() {
    const listEl = document.getElementById('blocked-users-list');
    listEl.innerHTML = '<span class="spinner"></span>';

    try {
      const data = await API.getBlockedUsers();
      const blocked = data.blocked || [];
      listEl.innerHTML = '';

      if (blocked.length === 0) {
        listEl.innerHTML = '<div style="color: var(--text-muted); font-size: 0.82rem; padding: 12px;">No blocked users.</div>';
        return;
      }

      blocked.forEach(b => {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(255,255,255,0.05); border-radius: var(--radius-sm);';
        row.innerHTML = `
          <div style="font-size: 0.88rem; color: #fff;">${b.display_name} (@${b.username})</div>
          <button class="btn btn-secondary btn-sm" style="padding: 4px 10px; font-size: 0.75rem;">Unblock</button>
        `;
        row.querySelector('button').addEventListener('click', async () => {
          await API.unblockUser(b.id);
          App.showToast(`Unblocked ${b.display_name}`, 'info');
          this.loadBlockedUsers();
        });
        listEl.appendChild(row);
      });
    } catch (err) {
      listEl.innerHTML = '<div style="color: var(--accent-rose); font-size: 0.82rem;">Failed to load blocked users.</div>';
    }
  },

  close() {
    this.modal.classList.remove('active');
    this.currentUserProfile = null;
  }
};
