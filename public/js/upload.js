// Daily Photo Upload Handler
const Upload = {
  modal: null,
  dropzone: null,
  fileInput: null,
  previewBox: null,
  previewImg: null,
  removePreviewBtn: null,
  messageInput: null,
  locationInput: null,
  charCounter: null,
  submitBtn: null,
  selectedFile: null,

  init() {
    this.modal = document.getElementById('modal-upload');
    this.dropzone = document.getElementById('upload-dropzone');
    this.fileInput = document.getElementById('upload-file-input');
    this.previewBox = document.getElementById('upload-preview-box');
    this.previewImg = document.getElementById('upload-preview-img');
    this.removePreviewBtn = document.getElementById('btn-remove-preview');
    this.messageInput = document.getElementById('upload-message-input');
    this.locationInput = document.getElementById('upload-location-input');
    this.charCounter = document.getElementById('upload-char-counter');
    this.submitBtn = document.getElementById('btn-submit-upload');

    this.bindEvents();
  },

  bindEvents() {
    // Dropzone & File selection
    this.dropzone.addEventListener('click', () => {
      this.fileInput.click();
    });

    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleFileSelected(e.target.files[0]);
      }
    });

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

    // Character counter
    this.messageInput.addEventListener('input', () => {
      this.updateCharCounter();
    });

    // Submit
    this.submitBtn.addEventListener('click', () => {
      this.submit();
    });
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
      this.previewBox.style.display = 'block';
    };
    reader.readAsDataURL(file);
  },

  clearSelectedFile() {
    this.selectedFile = null;
    this.fileInput.value = '';
    this.previewImg.src = '';
    this.previewBox.style.display = 'none';
    this.dropzone.style.display = 'flex';
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
    this.submitBtn.innerHTML = `<span class="spinner"></span> <span>Publishing...</span>`;

    try {
      const formData = new FormData();
      formData.append('photo', this.selectedFile);
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

      App.showToast('Your moment is now live on K-Wall for the entire world!', 'success');
      this.close();

      // Prepend to wall immediately
      if (res.post) {
        Wall.prependLivePost(res.post);
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
