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
  const magnifierHex = document.getElementById('magnifierHex');
  const magnifierZoomLabel = document.getElementById('magnifierZoomLabel');
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

  // ─── Magnifier Grid Setup ───────────────────
  var GRID_SIZE = 5;
  var MAG_SIZE = 140;
  var ZOOM_FACTOR = 2;
  var magCells = [];
  var magnifierContent = document.getElementById('magnifierContent');
  for (var i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    var cell = document.createElement('div');
    cell.className = 'mag-cell';
    magnifierContent.appendChild(cell);
    magCells.push(cell);
  }

  // ─── Smooth Scroll for Topbar Links ──────────
  document.querySelectorAll('.topbar-tags a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        var topbar = document.querySelector('.topbar');
        var offset = topbar ? topbar.offsetHeight + 20 : 70;
        var targetPos = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: targetPos, behavior: 'smooth' });
      }
    });
  });
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
      document.querySelectorAll('.topbar-logo-img, .header-logo-img').forEach(function(img) {
        img.src = img.src.replace('getcolorcode.png', 'getcolorcodewhite.png');
      });
    } else {
      document.documentElement.removeAttribute('data-theme');
      sunIcon.style.display = 'none';
      moonIcon.style.display = '';
      document.querySelectorAll('.topbar-logo-img, .header-logo-img').forEach(function(img) {
        img.src = img.src.replace('getcolorcodewhite.png', 'getcolorcode.png');
      });
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
      canvasDrawn = false;
      zoomLevel.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  // ─── Color Picking ────────────────────────────

  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  var canvasDrawn = false;

  function getPixelColor(img, x, y) {
    if (!canvasDrawn || canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvasDrawn = true;
    }
    var pixel = ctx.getImageData(x, y, 1, 1).data;
    return { r: pixel[0], g: pixel[1], b: pixel[2] };
  }

  // Read a grid of pixels centered at (cx, cy) in a single getImageData call
  function getPixelGrid(img, cx, cy, size) {
    if (!canvasDrawn || canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvasDrawn = true;
    }
    var half = Math.floor(size / 2);
    var nw = img.naturalWidth;
    var nh = img.naturalHeight;
    var startX = Math.max(0, cx - half);
    var startY = Math.max(0, cy - half);
    var endX = Math.min(nw - 1, cx + half);
    var endY = Math.min(nh - 1, cy + half);
    var readW = endX - startX + 1;
    var readH = endY - startY + 1;
    var imageData = ctx.getImageData(startX, startY, readW, readH);
    var d = imageData.data;
    // Build 2D array of colors
    var colors = [];
    for (var y = 0; y < readH; y++) {
      colors[y] = [];
      for (var x = 0; x < readW; x++) {
        var idx = (y * readW + x) * 4;
        colors[y][x] = { r: d[idx], g: d[idx + 1], b: d[idx + 2] };
      }
    }
    return { colors: colors, offsetX: startX, offsetY: startY };
  }

  imageWrapper.addEventListener('mousemove', function (e) {
    if (!imageLoaded) {
      magnifier.style.display = 'none';
      return;
    }

    var imgRect = mainImage.getBoundingClientRect();

    var displayW = imgRect.width;
    var displayH = imgRect.height;
    var naturalW = mainImage.naturalWidth;
    var naturalH = mainImage.naturalHeight;

    // Mouse position relative to the image
    var relX = e.clientX - imgRect.left;
    var relY = e.clientY - imgRect.top;

    // Clamp to image bounds
    relX = Math.max(0, Math.min(relX, displayW));
    relY = Math.max(0, Math.min(relY, displayH));

    // Map to natural coordinates
    var natX = Math.round((relX / displayW) * naturalW);
    var natY = Math.round((relY / displayH) * naturalH);

    // Clamp to image bounds
    natX = Math.max(0, Math.min(natX, naturalW - 1));
    natY = Math.max(0, Math.min(natY, naturalH - 1));

    // Position magnifier (fixed) centered on cursor, clamped to viewport
    var magLeft = e.clientX - MAG_SIZE / 2;
    var magTop = e.clientY - MAG_SIZE / 2 - 10;
    var maxLeft = window.innerWidth - MAG_SIZE;
    var maxTop = window.innerHeight - MAG_SIZE;
    magLeft = Math.max(4, Math.min(magLeft, maxLeft - 4));
    magTop = Math.max(4, Math.min(magTop, maxTop - 4));

    magnifier.style.display = 'block';
    magnifier.style.left = magLeft + 'px';
    magnifier.style.top = magTop + 'px';

    // Update zoom label
    magnifierZoomLabel.textContent = ZOOM_FACTOR + '.0x';

    // Read 5x5 pixel grid centered at cursor
    var grid = getPixelGrid(mainImage, natX, natY, GRID_SIZE);
    var half = Math.floor(GRID_SIZE / 2);

    for (var dy = 0; dy < GRID_SIZE; dy++) {
      for (var dx = 0; dx < GRID_SIZE; dx++) {
        var cellIdx = dy * GRID_SIZE + dx;
        // Natural pixel this cell should display
        var px = natX - half + dx;
        var py = natY - half + dy;
        // Clamp to image bounds (repeat edge pixels)
        px = Math.max(0, Math.min(px, naturalW - 1));
        py = Math.max(0, Math.min(py, naturalH - 1));
        // Convert to grid data indices
        var gx = px - grid.offsetX;
        var gy = py - grid.offsetY;
        if (gy >= 0 && gy < grid.colors.length && gx >= 0 && gx < grid.colors[gy].length) {
          var pixel = grid.colors[gy][gx];
          magCells[cellIdx].style.backgroundColor = rgbToHex(pixel.r, pixel.g, pixel.b);
        }
      }
    }

    // Live color info in magnifier
    var centerColor = getPixelColor(mainImage, natX, natY);
    var hex = rgbToHex(centerColor.r, centerColor.g, centerColor.b);
    magnifierHex.textContent = hex.toUpperCase();
  });

  imageWrapper.addEventListener('mouseleave', function () {
    magnifier.style.display = 'none';
  });

  imageWrapper.addEventListener('click', function (e) {
    if (!imageLoaded) return;

    var imgRect = mainImage.getBoundingClientRect();

    var displayW = imgRect.width;
    var displayH = imgRect.height;
    var naturalW = mainImage.naturalWidth;
    var naturalH = mainImage.naturalHeight;

    var relX = e.clientX - imgRect.left;
    var relY = e.clientY - imgRect.top;

    relX = Math.max(0, Math.min(relX, displayW));
    relY = Math.max(0, Math.min(relY, displayH));

    var natX = Math.round((relX / displayW) * naturalW);
    var natY = Math.round((relY / displayH) * naturalH);

    natX = Math.max(0, Math.min(natX, naturalW - 1));
    natY = Math.max(0, Math.min(natY, naturalH - 1));

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
