// World Wall API Client & Authentication Management
const API = {
  baseUrl: '/api',

  getToken() {
    return localStorage.getItem('kwall_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('kwall_token', token);
    } else {
      localStorage.removeItem('kwall_token');
    }
  },

  getUser() {
    const data = localStorage.getItem('kwall_user');
    try {
      if (!data) return null;
      const user = JSON.parse(data);
      if (user && user.display_name && /k-wall/i.test(user.display_name)) {
        user.display_name = user.display_name.replace(/k-wall/gi, 'World Wall');
        localStorage.setItem('kwall_user', JSON.stringify(user));
      }
      return user;
    } catch (e) {
      return null;
    }
  },

  setUser(user) {
    if (user) {
      localStorage.setItem('kwall_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('kwall_user');
    }
  },

  clearAuth() {
    localStorage.removeItem('kwall_token');
    localStorage.removeItem('kwall_user');
  },

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = options.headers || {};

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && options.body && typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    options.headers = headers;

    try {
      const res = await fetch(url, options);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  },

  // Posts
  getPosts(limit = 200, offset = 0, filter = '') {
    const params = new URLSearchParams({ limit, offset });
    if (filter) params.append('filter', filter);
    return this.request(`/posts?${params.toString()}`);
  },

  getPost(id) {
    return this.request(`/posts/${id}`);
  },

  uploadPost(formData) {
    return this.request('/posts', {
      method: 'POST',
      body: formData
    });
  },

  deletePost(id) {
    return this.request(`/posts/${id}`, {
      method: 'DELETE'
    });
  },

  checkEligibility() {
    return this.request('/posts/eligibility');
  },

  // Auth
  login(identifier, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: { identifier, password }
    });
  },

  guestLogin() {
    return this.request('/auth/guest', {
      method: 'POST'
    });
  },

  register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: userData
    });
  },

  getMe() {
    return this.request('/auth/me');
  },

  updateProfile(profileData) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: profileData
    });
  },

  // Users & Profiles
  getUserProfile(identifier) {
    return this.request(`/users/${identifier}`);
  },

  blockUser(userId) {
    return this.request(`/users/${userId}/block`, {
      method: 'POST'
    });
  },

  unblockUser(userId) {
    return this.request(`/users/${userId}/block`, {
      method: 'DELETE'
    });
  },

  getBlockedUsers() {
    return this.request('/users/me/blocked');
  },

  // Messaging
  getConversations() {
    return this.request('/messages/conversations');
  },

  getThread(targetUserId) {
    return this.request(`/messages/thread/${targetUserId}`);
  },

  sendMessage(receiverId, content) {
    return this.request('/messages', {
      method: 'POST',
      body: { receiver_id: receiverId, content }
    });
  },

  // Reports
  submitReport(reportData) {
    return this.request('/reports', {
      method: 'POST',
      body: reportData
    });
  },

  // Time & countdown sync
  getServerTime() {
    return this.request('/time');
  }
};
