// WebSocket Real-time Client
const Socket = {
  ws: null,
  reconnectTimer: null,
  listeners: {},

  init() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[World Wall WS] Connected to live wall stream');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data);
        } catch (e) {
          console.error('[World Wall WS] Invalid message format:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('[World Wall WS] Connection closed. Reconnecting in 3s...');
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('[World Wall WS] Socket error:', err);
      };
    } catch (err) {
      console.error('[World Wall WS] Init error:', err);
      this.scheduleReconnect();
    }
  },

  scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.init();
      }, 3000);
    }
  },

  on(type, callback) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(callback);
  },

  emit(type, data) {
    if (this.listeners[type]) {
      this.listeners[type].forEach(cb => {
        try { cb(data); } catch (e) { console.error(e); }
      });
    }
  },

  send(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }
};
