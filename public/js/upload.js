// Daily Photo Upload Handler
const Upload = {
  modal: null,
  dropzone: null,
  fileInput: null,
  previewHeader: null,
  formatTag: null,
  previewBox: null,
  previewImg: null,
  removePreviewBtn: null,
  changePhotoBtn: null,
  changePhotoWrap: null,
  samplePhotoBtn: null,
  messageInput: null,
  locationInput: null,
  charCounter: null,
  submitBtn: null,
  styleSelect: null,
  aspectSelect: null,
  posterCard: null,
  previewLocation: null,
  previewAuthor: null,
  previewHeadline: null,
  selectedFile: null,

  init() {
    this.modal = document.getElementById('modal-upload');
    this.dropzone = document.getElementById('upload-dropzone');
    this.fileInput = document.getElementById('upload-file-input');
    this.previewHeader = document.getElementById('upload-preview-header');
    this.formatTag = document.getElementById('preview-format-tag');
    this.previewBox = document.getElementById('upload-preview-box');
    this.previewImg = document.getElementById('upload-preview-img');
    this.removePreviewBtn = document.getElementById('btn-remove-preview');
    this.changePhotoBtn = document.getElementById('btn-change-photo');
    this.changePhotoWrap = document.getElementById('upload-change-photo-wrap');
    this.samplePhotoBtn = document.getElementById('btn-sample-photo');
    this.messageInput = document.getElementById('upload-message-input');
    this.locationInput = document.getElementById('upload-location-input');
    this.charCounter = document.getElementById('upload-char-counter');
    this.submitBtn = document.getElementById('btn-submit-upload');
    this.styleSelect = document.getElementById('upload-style-select');
    this.aspectSelect = document.getElementById('upload-aspect-select');
    this.posterCard = document.getElementById('upload-poster-card');
    this.previewLocation = document.getElementById('preview-location-text');
    this.previewAuthor = document.getElementById('preview-author-text');
    this.previewHeadline = document.getElementById('preview-headline-text');

    this.bindEvents();
  },

  bindEvents() {
    // Dropzone & File selection
    this.dropzone.addEventListener('click', (e) => {
      // Don't trigger if clicked sample photo button
      if (e.target.closest('#btn-sample-photo')) return;
      this.fileInput.click();
    });

    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleFileSelected(e.target.files[0]);
      }
    });

    // Sample photo test button
    if (this.samplePhotoBtn) {
      this.samplePhotoBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await this.loadSamplePhoto();
      });
    }

    // Change photo quick button
    if (this.changePhotoBtn) {
      this.changePhotoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.fileInput.click();
      });
    }

    // Drag and drop
    ['dragenter', 'dragover'].forEach(eventName => {
      this.dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        this.dropzone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      this.dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        this.dropzone.classList.remove('drag-over');
      });
    });

    this.dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.handleFileSelected(e.dataTransfer.files[0]);
      }
    });

    // Remove preview
    this.removePreviewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearSelectedFile();
    });

    // Character counter & live message preview
    ['input', 'keyup', 'change'].forEach(evt => {
      this.messageInput.addEventListener(evt, () => {
        this.updateCharCounter();
        this.updateLivePreview();
      });
    });

    // Location live preview
    if (this.locationInput) {
      ['input', 'keyup', 'change'].forEach(evt => {
        this.locationInput.addEventListener(evt, () => {
          this.updateLivePreview();
        });
      });
    }

    // Poster style live preview
    if (this.styleSelect) {
      ['change', 'input'].forEach(evt => {
        this.styleSelect.addEventListener(evt, () => {
          this.updateLivePreview();
        });
      });
    }

    // Poster format / aspect ratio live preview
    if (this.aspectSelect) {
      ['change', 'input'].forEach(evt => {
        this.aspectSelect.addEventListener(evt, () => {
          this.updateLivePreview();
        });
      });
    }

    // Submit
    this.submitBtn.addEventListener('click', () => {
      this.submit();
    });
  },

  async loadSamplePhoto() {
    try {
      // Create a canvas with a stylish modern gradient landscape as sample photo
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 1200;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 800, 1200);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.3, '#1e293b');
      grad.addColorStop(0.6, '#0369a1');
      grad.addColorStop(1, '#0284c7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 1200);

      // Add atmospheric glow
      ctx.beginPath();
      ctx.arc(400, 600, 320, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.fill();

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], 'sample-photo.png', { type: 'image/png' });
        this.handleFileSelected(file);
      }, 'image/png');
    } catch (err) {
      console.warn('Sample photo error:', err);
    }
  },

  handleFileSelected(file) {
    if (!file.type.startsWith('image/')) {
      App.showToast('Please select a valid image file (JPEG, PNG, WebP, GIF).', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      App.showToast('Image size must be less than 10MB.', 'error');
      return;
    }

    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewImg.src = e.target.result;
      this.dropzone.style.display = 'none';
      if (this.previewHeader) {
        this.previewHeader.style.display = 'flex';
      }
      this.previewBox.style.display = 'flex';
      if (this.changePhotoWrap) {
        this.changePhotoWrap.style.display = 'block';
      }
      this.updateLivePreview();
    };
    reader.readAsDataURL(file);
  },

  compressImage(file) {
    return new Promise((resolve) => {
      if (!file) return resolve(null);
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          const maxDim = 1200;
          let w = img.width;
          let h = img.height;

          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        } catch (e) {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };

      img.src = url;
    });
  },

  clearSelectedFile() {
    this.selectedFile = null;
    this.fileInput.value = '';
    this.previewImg.src = '';
    if (this.previewHeader) {
      this.previewHeader.style.display = 'none';
    }
    this.previewBox.style.display = 'none';
    if (this.changePhotoWrap) {
      this.changePhotoWrap.style.display = 'none';
    }
    this.dropzone.style.display = 'flex';
  },

  updateLivePreview() {
    if (!this.posterCard) return;

    const style = this.styleSelect ? this.styleSelect.value : 'fullbleed';
    const aspect = this.aspectSelect ? this.aspectSelect.value : 'tall';
    const rawMessage = this.messageInput ? this.messageInput.value : '';
    const location = this.locationInput ? this.locationInput.value.trim() : '';
    const user = API.getUser();

    // 1. Update theme class on poster card
    const themeClasses = Array.from(this.posterCard.classList).filter(c => c.startsWith('poster-theme-'));
    themeClasses.forEach(c => this.posterCard.classList.remove(c));
    this.posterCard.classList.add(`poster-theme-${style}`);

    // 2. Update aspect ratio on preview wrapper
    if (this.previewBox) {
      const aspectClasses = Array.from(this.previewBox.classList).filter(c => c.startsWith('aspect-'));
      aspectClasses.forEach(c => this.previewBox.classList.remove(c));
      this.previewBox.classList.add(`aspect-${aspect}`);
    }

    // Update aspect format text tag
    if (this.formatTag && this.aspectSelect) {
      const selectedOption = this.aspectSelect.options[this.aspectSelect.selectedIndex];
      if (selectedOption) {
        this.formatTag.textContent = selectedOption.textContent;
      }
    }

    // 3. Update author stamp
    if (this.previewLocation) {
      let loc = 'GLOBAL';
      if (location) {
        loc = location.split(',')[0].toUpperCase();
      } else if (user && user.location) {
        loc = user.location.split(',')[0].toUpperCase();
      }
      this.previewLocation.textContent = loc;
    }

    if (this.previewAuthor) {
      let name = 'YOU';
      if (user && user.display_name) {
        name = user.display_name.split(' ')[0].toUpperCase();
      }
      this.previewAuthor.textContent = name;
    }

    // 4. Update headline text with theme-specific styling and default taglines
    const themeDefaults = {
      'fullbleed': 'Your personal message...',
      'bold-yellow': 'Good Vibes Only',
      'distressed-red': 'COMFORT ZONE WILL KILL YOU',
      'framed-white': 'IDEAS ARE WORTHLESS UNTIL EXECUTED',
      'dark-gritty': 'CONQUER FROM WITHIN',
      'minimal-dark': 'TRY HARD ENOUGH',
      'navy-quote': 'dream. plan. do.',
      'retro-pop': 'RISE & GRIND',
      'vintage-cream': 'Notes from the journey...'
    };

    if (this.previewHeadline) {
      const hasCustomText = rawMessage.trim().length > 0;
      const displayMsg = hasCustomText ? rawMessage.trim() : (themeDefaults[style] || 'Your personal message...');

      if (hasCustomText) {
        this.previewHeadline.classList.remove('is-placeholder');
      } else {
        this.previewHeadline.classList.add('is-placeholder');
      }

      let clean = (typeof Wall !== 'undefined' && Wall.escapeHtml) ? Wall.escapeHtml(displayMsg) : displayMsg;
      if (style === 'minimal-dark') {
        clean = clean.replace(/\b(HARD|ENOUGH|TRY|NOW|LIMIT|WILL|COMFORT|KILL|NOTHING|WORK|GROW)\b/gi, '<span class="highlight">$1</span>');
      }
      this.previewHeadline.innerHTML = clean;
    }
  },

  updateCharCounter() {
    const len = this.messageInput.value.length;
    this.charCounter.textContent = `${len} / 150`;

    this.charCounter.classList.remove('limit-near', 'limit-exceeded');
    if (len > 140) {
      this.charCounter.classList.add('limit-near');
    }
  },

  open() {
    const user = API.getUser();
    if (!user) {
      Auth.open('login');
      return;
    }

    if (this.locationInput && user.location && !this.locationInput.value) {
      this.locationInput.value = user.location;
    }

    this.updateLivePreview();
    this.modal.classList.add('active');
  },

  close() {
    this.modal.classList.remove('active');
    this.clearSelectedFile();
    this.messageInput.value = '';
    this.updateCharCounter();
  },

  async submit() {
    if (!this.selectedFile) {
      App.showToast('Please choose a photo for your daily contribution.', 'error');
      return;
    }

    const message = this.messageInput.value.trim();
    if (!message) {
      App.showToast('Please write a short personal message (up to 150 characters).', 'error');
      this.messageInput.focus();
      return;
    }

    if (message.length > 150) {
      App.showToast('Message exceeds 150 characters limit.', 'error');
      return;
    }

    // Set loading state
    this.submitBtn.disabled = true;
    this.submitBtn.innerHTML = `<span class="spinner"></span> <span>Optimizing &amp; Publishing...</span>`;

    try {
      // Fast client-side image compression to high-resolution JPEG Data URL
      const dataUrl = await this.compressImage(this.selectedFile);

      const formData = new FormData();
      formData.append('photo', this.selectedFile);
      if (dataUrl) {
        formData.append('image_url', dataUrl);
      }
      formData.append('message', message);
      if (this.locationInput.value.trim()) {
        formData.append('location', this.locationInput.value.trim());
      }
      const styleSelect = document.getElementById('upload-style-select');
      if (styleSelect) {
        formData.append('poster_style', styleSelect.value);
      }
      const aspectSelect = document.getElementById('upload-aspect-select');
      if (aspectSelect) {
        formData.append('aspect_ratio', aspectSelect.value);
      }

      const res = await API.uploadPost(formData);

      App.showToast('Your moment is now live on World Wall for the entire world!', 'success');
      this.close();

      // Prepend to wall immediately
      if (res.post) {
        Wall.prependLivePost(res.post);

        // Automatically open the Viral Social Media Share Card Suite
        setTimeout(() => {
          Share.openForPost(res.post, true);
        }, 800);
      }

      // Update eligibility button state
      Controls.setUploadedToday(res.post ? res.post.id : null);
      if (res.uploadStatus && res.uploadStatus.countdown) {
        Controls.setCountdownFromData(res.uploadStatus.countdown);
      }

    } catch (err) {
      console.error('Upload submission error:', err);
      App.showToast(err.message || 'Failed to upload photo. Please try again.', 'error');
    } finally {
      this.submitBtn.disabled = false;
      this.submitBtn.innerHTML = `<span>Publish to Global Wall</span>`;
    }
  }
};
