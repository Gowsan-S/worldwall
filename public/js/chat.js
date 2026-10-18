// Private Messaging Engine
const Chat = {
  modal: null,
  convListEl: null,
  messagesContainer: null,
  sendForm: null,
  inputEl: null,
  sendBtn: null,
  headerTitle: null,
  blockBtn: null,
  activeTargetUser: null,
  activeConvId: null,

  init() {
    this.modal = document.getElementById('modal-chat');
    this.convListEl = document.getElementById('chat-conversations-list');
    this.messagesContainer = document.getElementById('chat-messages-container');
    this.sendForm = document.getElementById('chat-send-form');
    this.inputEl = document.getElementById('chat-input-text');
    this.sendBtn = document.getElementById('btn-chat-send');
    this.headerTitle = document.getElementById('chat-header-title');
    this.blockBtn = document.getElementById('btn-chat-block-user');

    this.bindEvents();
    this.listenSocket();
  },

  bindEvents() {
    this.sendForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = this.inputEl.value.trim();
      if (!content || !this.activeTargetUser) return;

      this.inputEl.value = '';

      // Optimistic append
      const user = API.getUser();
      const tempMsg = {
        id: 'temp-' + Date.now(),
        sender_id: user.id,
        content,
        created_at: new Date().toISOString()
      };
      this.appendMessageBubble(tempMsg, true);

      try {
        const res = await API.sendMessage(this.activeTargetUser.id, content);
        if (res.data) {
          // Replace temp or refresh
        }
      } catch (err) {
        App.showToast(err.message || 'Failed to send message.', 'error');
      }
    });

    this.blockBtn.addEventListener('click', async () => {
      if (!this.activeTargetUser) return;
      if (confirm(`Block ${this.activeTargetUser.display_name}? You will no longer receive messages from each other.`)) {
        try {
          await API.blockUser(this.activeTargetUser.id);
          App.showToast(`Blocked ${this.activeTargetUser.display_name}`, 'info');
          this.close();
        } catch (err) {
          App.showToast(err.message || 'Error blocking user.', 'error');
        }
      }
    });
  },

  listenSocket() {
    Socket.on('NEW_MESSAGE', (payload) => {
      const user = API.getUser();
      if (!user) return;

      const msg = payload.message;
      if (msg.receiver_id === user.id) {
        // If chat is open with sender
        if (this.modal.classList.contains('active') && this.activeTargetUser && this.activeTargetUser.id === msg.sender_id) {
          this.appendMessageBubble(msg, false);
        } else {
          // Increment dock unread badge
          this.incrementUnreadBadge();
          App.showToast(`New message from ${payload.sender ? payload.sender.display_name : 'a user'}`, 'info');
        }
        this.loadConversations();
      }
    });
  },

  incrementUnreadBadge() {
    const badge = document.getElementById('dock-unread-badge');
    if (badge) {
      let count = parseInt(badge.textContent) || 0;
      count += 1;
      badge.textContent = count;
      badge.style.display = 'flex';
    }
  },

  resetUnreadBadge() {
    const badge = document.getElementById('dock-unread-badge');
    if (badge) {
      badge.textContent = '0';
      badge.style.display = 'none';
    }
  },

  async open() {
    const user = API.getUser();
    if (!user) {
      Auth.open('login');
      return;
    }

    this.modal.classList.add('active');
    this.resetUnreadBadge();
    await this.loadConversations();
  },

  async openWithUser(targetUserId, targetDisplayName) {
    await this.open();
    await this.loadThread(targetUserId, targetDisplayName);
  },

  close() {
    this.modal.classList.remove('active');
    this.activeTargetUser = null;
    this.activeConvId = null;
  },

  async loadConversations() {
    try {
      const data = await API.getConversations();
      const convs = data.conversations || [];
      this.convListEl.innerHTML = '';

      if (convs.length === 0) {
        this.convListEl.innerHTML = `
          <div style="padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">
            No conversations yet. Click "Message" on any photo or profile to connect!
          </div>
        `;
        return;
      }

      convs.forEach(c => {
        const item = document.createElement('div');
        item.className = `chat-conv-item ${this.activeConvId === c.id ? 'active' : ''}`;
        const other = c.otherUser || { display_name: 'User', username: 'user' };
        const avatar = other.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${other.username}`;
        const lastSnippet = c.lastMessage ? c.lastMessage.content : 'Started a conversation';

        item.innerHTML = `
          <img src="${avatar}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover;" alt="${other.display_name}">
          <div class="chat-conv-info">
            <div class="chat-conv-name">${other.display_name}</div>
            <div class="chat-conv-snippet">${lastSnippet}</div>
          </div>
          ${c.unreadCount > 0 ? `<span class="badge" style="background: var(--accent-cyan); color: #000; font-weight: 800;">${c.unreadCount}</span>` : ''}
        `;

        item.addEventListener('click', () => {
          this.loadThread(other.id, other.display_name);
        });

        this.convListEl.appendChild(item);
      });
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  },

  async loadThread(targetUserId, fallbackName = 'Chat') {
    this.inputEl.disabled = true;
    this.sendBtn.disabled = true;
    this.messagesContainer.innerHTML = '<div style="text-align:center; padding: 30px;"><span class="spinner"></span></div>';

    try {
      const data = await API.getThread(targetUserId);
      this.activeTargetUser = data.targetUser;
      this.activeConvId = data.conversationId;

      this.headerTitle.textContent = `Chat with ${data.targetUser.display_name}`;
      this.blockBtn.style.display = 'inline-flex';

      if (data.blockStatus && data.blockStatus.isBlocked) {
        this.messagesContainer.innerHTML = `
          <div style="text-align: center; color: var(--accent-rose); padding: 30px; font-size: 0.9rem;">
            Messaging unavailable: user is blocked.
          </div>
        `;
        this.inputEl.placeholder = 'Conversation is blocked';
        return;
      }

      this.renderMessages(data.messages || []);
      this.inputEl.disabled = false;
      this.sendBtn.disabled = false;
      this.inputEl.placeholder = `Message ${data.targetUser.display_name}...`;
      this.inputEl.focus();

      // Highlight active sidebar item
      const allItems = this.convListEl.querySelectorAll('.chat-conv-item');
      allItems.forEach(el => el.classList.remove('active'));
    } catch (err) {
      this.messagesContainer.innerHTML = `<div style="text-align: center; color: var(--accent-rose); padding: 30px;">${err.message || 'Failed to load messages'}</div>`;
    }
  },

  renderMessages(messages) {
    this.messagesContainer.innerHTML = '';
    const user = API.getUser();

    if (messages.length === 0) {
      this.messagesContainer.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; margin-top: 40px;">
          Say hello to ${this.activeTargetUser ? this.activeTargetUser.display_name : 'your peer'}!
        </div>
      `;
      return;
    }

    messages.forEach(msg => {
      const isOutgoing = msg.sender_id === user.id;
      this.appendMessageBubble(msg, isOutgoing);
    });

    this.scrollToBottom();
  },

  appendMessageBubble(msg, isOutgoing) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;

    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bubble.innerHTML = `
      <div>${this.escapeHtml(msg.content)}</div>
      <div class="chat-bubble-time">${time}</div>
    `;

    this.messagesContainer.appendChild(bubble);
    this.scrollToBottom();
  },

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
