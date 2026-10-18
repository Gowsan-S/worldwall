// Social Sharing Module
const Share = {
  modal: null,
  linkInput: null,
  copyBtn: null,
  shareData: {},

  init() {
    this.modal = document.getElementById('modal-share');
    this.linkInput = document.getElementById('share-link-input');
    this.copyBtn = document.getElementById('btn-copy-share-link');

    this.bindEvents();
  },

  bindEvents() {
    this.copyBtn.addEventListener('click', () => {
      const url = this.linkInput.value;
      navigator.clipboard.writeText(url).then(() => {
        const originalText = this.copyBtn.textContent;
        this.copyBtn.textContent = 'Copied!';
        this.copyBtn.classList.add('btn-primary');
        setTimeout(() => {
          this.copyBtn.textContent = originalText;
        }, 2000);
        App.showToast('Link copied to clipboard!', 'success');
      }).catch(() => {
        prompt('Copy this link:', url);
      });
    });
  },

  async openForWall() {
    const url = window.location.origin;
    const title = 'K-Wall — A Global Wall of People';
    const text = 'One world. One wall. One photo per person per day. Come join the global digital wall!';

    this.shareData = { url, title, text };

    if (navigator.share) {
      try {
        await navigator.share(this.shareData);
        App.showToast('Shared successfully!', 'success');
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          this.showModal();
        }
      }
    } else {
      this.showModal();
    }
  },

  async openForPost(post) {
    const url = `${window.location.origin}/?post=${post.id}`;
    const title = `Moment by ${post.display_name} on K-Wall`;
    const text = `"${post.message}" — Shared on K-Wall, a global digital wall.`;

    this.shareData = { url, title, text };

    if (navigator.share) {
      try {
        await navigator.share(this.shareData);
        App.showToast('Shared successfully!', 'success');
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          this.showModal();
        }
      }
    } else {
      this.showModal();
    }
  },

  showModal() {
    const { url, title, text } = this.shareData;

    document.getElementById('share-modal-title').textContent = title.includes('Moment') ? 'Share This Moment' : 'Share K-Wall';
    document.getElementById('share-modal-desc').textContent = text;
    this.linkInput.value = url;

    // Social URLs
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);

    document.getElementById('btn-share-x').href = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
    document.getElementById('btn-share-whatsapp').href = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
    document.getElementById('btn-share-telegram').href = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
    document.getElementById('btn-share-reddit').href = `https://reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent(title)}`;

    this.modal.classList.add('active');
  },

  close() {
    this.modal.classList.remove('active');
  }
};
