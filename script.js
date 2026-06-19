/* =============================================
   Get Color Code - 圖片取色工具
   JavaScript Application Logic
   ============================================= */

(function () {
  'use strict';

  // ─── DOM Elements ────────────────────────────

  const imageWrapper = document.getElementById('imageWrapper');
  const uploadOverlay = document.getElementById('uploadOverlay');
  const uploadBtn = document.getElementById('uploadBtn');
  const fileInput = document.getElementById('fileInput');
  const mainImage = document.getElementById('mainImage');
  const magnifier = document.getElementById('magnifier');
  const zoomLevel = document.getElementById('zoomLevel');
  const colorSwatch = document.getElementById('colorSwatch');
  const colorPlaceholder = document.getElementById('colorPlaceholder');
  const hexValue = document.getElementById('hexValue');
  const rgbValue = document.getElementById('rgbValue');
  const hslValue = document.getElementById('hslValue');
  const paletteGrid = document.getElementById('paletteGrid');
  const paletteCount = document.getElementById('paletteCount');
  const clearPalette = document.getElementById('clearPalette');
  const toast = document.getElementById('toast');
  const themeToggle = document.getElementById('themeToggle');
  const sunIcon = document.getElementById('sunIcon');
  const moonIcon = document.getElementById('moonIcon');

  let imageLoaded = false;
  let palette = [];
  let currentColor = null;
  let currentZoom = 1;

  // ─── Theme Management ────────────────────────

  function getPreferredTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getStoredTheme() {
    return localStorage.getItem('colorcode-theme');
  }

  function setTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      sunIcon.style.display = '';
      moonIcon.style.display = 'none';
    } else {
      document.documentElement.removeAttribute('data-theme');
      sunIcon.style.display = 'none';
      moonIcon.style.display = '';
    }
    localStorage.setItem('colorcode-theme', theme);
  }

  function initTheme() {
    var stored = getStoredTheme();
    if (stored) {
      setTheme(stored);
    } else {
      setTheme(getPreferredTheme());
    }
  }

  themeToggle.addEventListener('click', function () {
    var current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
  });

  // Listen for system theme changes (only if user hasn't stored a preference)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    if (!getStoredTheme()) {
      setTheme(e.matches ? 'dark' : 'light');
    }
  });

  initTheme();

  // ─── File Upload ──────────────────────────────

  uploadBtn.addEventListener('click', function () {
    fileInput.click();
  });

  fileInput.addEventListener('change', function (e) {
    if (e.target.files.length > 0) {
      loadImage(e.target.files[0]);
    }
  });

  /* Drag & Drop */
  imageWrapper.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.stopPropagation();
    uploadOverlay.classList.add('drag-over');
  });

  imageWrapper.addEventListener('dragleave', function (e) {
    e.preventDefault();
    e.stopPropagation();
    uploadOverlay.classList.remove('drag-over');
  });

  imageWrapper.addEventListener('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();
    uploadOverlay.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      loadImage(e.dataTransfer.files[0]);
    }
  });

  /* Paste from clipboard */
  document.addEventListener('paste', function (e) {
    var items = e.clipboardData && e.clipboardData.items;
    if (items) {
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image/') === 0) {
          e.preventDefault();
          loadImage(items[i].getAsFile());
          break;
        }
      }
    }
  });

  function loadImage(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      mainImage.src = e.target.result;
      mainImage.style.display = 'block';
      uploadOverlay.classList.add('hidden');
      imageLoaded = true;
      zoomLevel.style.display = 'block';
      mainImage.style.transform = '';
      currentZoom = 1;
      updateZoomDisplay();
    };
    reader.readAsDataURL(file);
  }

  // ─── Color Picking ────────────────────────────

  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');

  function getPixelColor(img, x, y) {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    var pixel = ctx.getImageData(x, y, 1, 1).data;
    return { r: pixel[0], g: pixel[1], b: pixel[2] };
  }

  imageWrapper.addEventListener('mousemove', function (e) {
    if (!imageLoaded) {
      magnifier.style.display = 'none';
      return;
    }

    var rect = imageWrapper.getBoundingClientRect();
    var imgRect = mainImage.getBoundingClientRect();

    var mouseX = e.clientX - imgRect.left;
    var mouseY = e.clientY - imgRect.top;

    var displayW = imgRect.width;
    var displayH = imgRect.height;
    var naturalW = mainImage.naturalWidth;
    var naturalH = mainImage.naturalHeight;

    var natX = Math.round((mouseX / displayW) * naturalW);
    var natY = Math.round((mouseY / displayH) * naturalH);

    var magX = e.clientX - rect.left - 65;
    var magY = e.clientY - rect.top - 65;

    magX = Math.max(0, Math.min(magX, rect.width - 130));
    magY = Math.max(0, Math.min(magY, rect.height - 130));

    magnifier.style.display = 'block';
    magnifier.style.left = magX + 'px';
    magnifier.style.top = magY + 'px';

    var zoomFactor = 3;
    var bgSize = (naturalW * zoomFactor) + 'px ' + (naturalH * zoomFactor);
    var bgX = -(natX * zoomFactor - 65) + 'px';
    var bgY = -(natY * zoomFactor - 65) + 'px';

    magnifier.style.backgroundImage = 'url(' + mainImage.src + ')';
    magnifier.style.backgroundSize = bgSize;
    magnifier.style.backgroundPosition = bgX + ' ' + bgY;
  });

  imageWrapper.addEventListener('mouseleave', function () {
    magnifier.style.display = 'none';
  });

  imageWrapper.addEventListener('click', function (e) {
    if (!imageLoaded) return;

    var imgRect = mainImage.getBoundingClientRect();
    var mouseX = e.clientX - imgRect.left;
    var mouseY = e.clientY - imgRect.top;

    var displayW = imgRect.width;
    var displayH = imgRect.height;
    var naturalW = mainImage.naturalWidth;
    var naturalH = mainImage.naturalHeight;

    var natX = Math.round((mouseX / displayW) * naturalW);
    var natY = Math.round((mouseY / displayH) * naturalH);

    var color = getPixelColor(mainImage, natX, natY);
    setCurrentColor(color);
    addToPalette(color);
  });

  // ─── Color Display ────────────────────────────

  function setCurrentColor(color) {
    currentColor = color;
    var hex = rgbToHex(color.r, color.g, color.b);
    var hsl = rgbToHsl(color.r, color.g, color.b);

    colorSwatch.style.background = hex;
    colorSwatch.classList.remove('picked');
    // Force reflow for animation restart
    void colorSwatch.offsetWidth;
    colorSwatch.classList.add('picked');
    colorPlaceholder.style.display = 'none';

    hexValue.textContent = hex.toUpperCase();
    rgbValue.textContent = 'rgb(' + color.r + ', ' + color.g + ', ' + color.b + ')';
    hslValue.textContent = hsl;
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (c) {
      return c.toString(16).padStart(2, '0');
    }).join('');
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }
    return 'hsl(' + Math.round(h * 360) + ', ' + Math.round(s * 100) + '%, ' + Math.round(l * 100) + '%)';
  }

  // ─── Palette / History ────────────────────────

  function addToPalette(color) {
    var hex = rgbToHex(color.r, color.g, color.b);
    if (palette.length > 0 && palette[palette.length - 1].hex === hex) return;
    palette.push({ r: color.r, g: color.g, b: color.b, hex: hex });
    renderPalette();
  }

  function renderPalette() {
    if (palette.length === 0) {
      paletteGrid.innerHTML = '<span class="palette-empty">點擊圖片來收集顏色</span>';
      paletteCount.textContent = '0 種顏色';
      return;
    }
    paletteGrid.innerHTML = palette.map(function (c, i) {
      var selected = currentColor && palette[i].hex === rgbToHex(currentColor.r, currentColor.g, currentColor.b);
      var cls = selected ? ' selected' : '';
      return '<div class="palette-color' + cls + '" ' +
             'style="background: ' + c.hex + ';" ' +
             'data-index="' + i + '" ' +
             'title="' + c.hex.toUpperCase() + '"></div>';
    }).join('');

    paletteCount.textContent = palette.length + ' 種顏色';

    paletteGrid.querySelectorAll('.palette-color').forEach(function (el) {
      el.addEventListener('click', function () {
        var idx = parseInt(el.dataset.index, 10);
        var c = palette[idx];
        setCurrentColor(c);
        currentColor = c;
        renderPalette();
      });
    });
  }

  clearPalette.addEventListener('click', function () {
    palette = [];
    currentColor = null;
    colorSwatch.style.background = '';
    colorSwatch.classList.remove('picked');
    colorPlaceholder.style.display = '';
    hexValue.textContent = '\u2014';
    rgbValue.textContent = '\u2014';
    hslValue.textContent = '\u2014';
    renderPalette();
    showToast('已清除所有顏色');
  });

  // ─── Copy to Clipboard ────────────────────────

  function getCurrentColorText(type) {
    switch (type) {
      case 'hex': return rgbToHex(currentColor.r, currentColor.g, currentColor.b).toUpperCase();
      case 'rgb': return 'rgb(' + currentColor.r + ', ' + currentColor.g + ', ' + currentColor.b + ')';
      case 'hsl': return rgbToHsl(currentColor.r, currentColor.g, currentColor.b);
      default: return '';
    }
  }

  document.querySelectorAll('.code-row').forEach(function (row) {
    row.addEventListener('click', function () {
      if (!currentColor) return;
      var text = getCurrentColorText(row.dataset.copy);
      var btn = row.querySelector('.copy-btn');
      copyToClipboard(text, row, btn);
    });

    // Keyboard support
    row.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!currentColor) return;
        var text = getCurrentColorText(row.dataset.copy);
        var btn = row.querySelector('.copy-btn');
        copyToClipboard(text, row, btn);
      }
    });
  });

  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!currentColor) return;
      var text = getCurrentColorText(btn.dataset.copy);
      var row = btn.closest('.code-row');
      copyToClipboard(text, row, btn);
    });
  });

  function copyToClipboard(text, row, btn) {
    navigator.clipboard.writeText(text).then(function () {
      // Update row
      row.classList.add('copied');
      // Update button
      btn.classList.add('copied');
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      showToast('已複製 ' + text);
      setTimeout(function () {
        row.classList.remove('copied');
        btn.classList.remove('copied');
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      }, 1500);
    });
  }

  // ─── Toast ─────────────────────────────────────

  var toastTimer;
  function showToast(msg) {
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.classList.add('show');
    toastTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, 1800);
  }

  // ─── Zoom (scroll wheel) ──────────────────────

  imageWrapper.addEventListener('wheel', function (e) {
    if (!imageLoaded) return;
    e.preventDefault();
    var delta = e.deltaY > 0 ? -0.1 : 0.1;
    currentZoom = Math.max(0.5, Math.min(3, currentZoom + delta));
    mainImage.style.transform = 'scale(' + currentZoom + ')';
    mainImage.style.transformOrigin = 'center center';
    updateZoomDisplay();
  }, { passive: false });

  function updateZoomDisplay() {
    zoomLevel.textContent = Math.round(currentZoom * 100) + '%';
  }

  // ─── Keyboard Shortcuts ────────────────────────

  document.addEventListener('keydown', function (e) {
    if (!currentColor) return;
    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
      e.preventDefault();
      var hex = rgbToHex(currentColor.r, currentColor.g, currentColor.b).toUpperCase();
      navigator.clipboard.writeText(hex).then(function () {
        showToast('已複製 ' + hex);
      });
    }
  });

  // ─── FAQ Accordion ─────────────────────────────

  document.querySelectorAll('.faq-item').forEach(function (item) {
    var question = item.querySelector('.faq-question');
    if (!question) return;
    question.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(function (el) {
        el.classList.remove('open');
        el.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        question.setAttribute('aria-expanded', 'true');
      }
    });
    // Keyboard support
    question.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        question.click();
      }
    });
  });

})();
