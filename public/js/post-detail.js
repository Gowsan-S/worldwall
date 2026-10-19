// Post Detail Modal & Deep Link Router
const PostDetail = {
  modal: null,
  currentPost: null,

  init() {
    this.modal = document.getElementById('modal-post-detail');
    this.bindEvents();
  },

  bindEvents() {
    // View Profile button
    document.getElementById('btn-detail-view-profile').addEventListener('click', () => {
      if (this.currentPost) {
        this.close();
        Profile.open(this.currentPost.username);
      }
    });

    // Author card click
    document.getElementById('detail-author-btn').addEventListener('click', () => {
      if (this.currentPost) {
        this.close();
        Profile.open(this.currentPost.username);
      }
    });

    // Message button
    document.getElementById('btn-detail-message').addEventListener('click', () => {
      if (this.currentPost) {
        const user = API.getUser();
        if (!user) {
          Auth.open('login');
          return;
        }
        if (user.id === this.currentPost.user_id) {
          App.showToast('You cannot send a message to yourself.', 'info');
          return;
        }
        this.close();
        Chat.openWithUser(this.currentPost.user_id, this.currentPost.display_name);
      }
    });

    // Share button
    document.getElementById('btn-detail-share').addEventListener('click', () => {
      if (this.currentPost) {
        Share.openForPost(this.currentPost);
      }
    });

    // Report button
    document.getElementById('btn-detail-report').addEventListener('click', () => {
      if (this.currentPost) {
        App.openReportModal('post', this.currentPost.id);
      }
    });

    // Delete button
    document.getElementById('btn-detail-delete').addEventListener('click', async () => {
      if (!this.currentPost) return;
      if (!confirm('Are you sure you want to remove this photo from World Wall?')) return;

      try {
        await API.deletePost(this.currentPost.id);
        App.showToast('Post removed successfully.', 'success');
        this.close();
        Wall.removePostFromWall(this.currentPost.id);
        Controls.syncEligibility();
      } catch (err) {
        App.showToast(err.message || 'Failed to delete post.', 'error');
      }
    });
  },

  async open(postId) {
    try {
      const data = await API.getPost(postId);
      const post = data.post;
      this.currentPost = post;

      // Update URL query string for deep linking
      const url = new URL(window.location);
      url.searchParams.set('post', post.id);
      window.history.replaceState({}, '', url);

      // Populate Modal Fields
      document.getElementById('detail-img').src = post.image_url;
      document.getElementById('detail-message').textContent = `"${post.message}"`;
      document.getElementById('detail-display-name').textContent = post.display_name;
      document.getElementById('detail-username').textContent = `@${post.username}`;
      document.getElementById('detail-avatar').src = post.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${post.username}`;

      // Views and Location
      document.getElementById('detail-views-count').textContent = `${(post.views_count || 1).toLocaleString()} views`;

      const locBadge = document.getElementById('detail-location-badge');
      if (post.location) {
        locBadge.textContent = post.location;
        locBadge.style.display = 'inline-flex';
      } else {
        locBadge.style.display = 'none';
      }

      // Timestamps
      document.getElementById('detail-timestamp-relative').textContent = this.formatRelativeTime(post.created_at);
      document.getElementById('detail-timestamp-utc').textContent = `${post.date_utc} UTC`;

      // Check if logged in user owns this post
      const currentUser = API.getUser();
      const deleteBtn = document.getElementById('btn-detail-delete');
      if (currentUser && (currentUser.id === post.user_id || currentUser.role === 'admin')) {
        deleteBtn.style.display = 'inline-flex';
      } else {
        deleteBtn.style.display = 'none';
      }

      this.modal.classList.add('active');
    } catch (err) {
      console.error('Failed to open post details:', err);
      App.showToast('Unable to load photo details.', 'error');
    }
  },

  close() {
    this.modal.classList.remove('active');
    this.currentPost = null;

    // Remove post query param from URL
    const url = new URL(window.location);
    if (url.searchParams.has('post')) {
      url.searchParams.delete('post');
      window.history.replaceState({}, '', url);
    }
  },

  formatRelativeTime(isoString) {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSec = Math.floor((now - date) / 1000);

      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      const days = Math.floor(diffSec / 86400);
      return `${days}d ago`;
    } catch (e) {
      return '';
    }
  }
};
