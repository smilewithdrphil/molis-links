/* Molis Links PWA — app.js */
(function () {
  'use strict';

  // ── State ──
  let favorites = JSON.parse(localStorage.getItem('molis_favorites') || '[]');
  let currentModule = '';
  let currentQuery = '';

  // ── DOM refs ──
  const searchInput   = document.getElementById('searchInput');
  const searchClear   = document.getElementById('searchClear');
  const moduleSelect  = document.getElementById('moduleSelect');
  const favSection    = document.getElementById('favoritesSection');
  const favList       = document.getElementById('favoritesList');
  const lessonList    = document.getElementById('lessonList');
  const emptyState    = document.getElementById('emptyState');
  const toast         = document.getElementById('toast');
  const headerCount   = document.getElementById('headerCount');

  // ── Init ──
  populateModuleFilter();
  render();
  initInstallBanner();

  // ── Events ──
  searchInput.addEventListener('input', () => {
    currentQuery = searchInput.value.trim().toLowerCase();
    searchClear.classList.toggle('visible', currentQuery.length > 0);
    render();
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    currentQuery = '';
    searchClear.classList.remove('visible');
    searchInput.focus();
    render();
  });

  moduleSelect.addEventListener('change', () => {
    currentModule = moduleSelect.value;
    render();
  });

  // ── Populate module dropdown ──
  function populateModuleFilter() {
    MODULES.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.name;
      opt.textContent = m.name;
      moduleSelect.appendChild(opt);
    });
  }

  // ── Filtering ──
  function getFilteredLinks() {
    return DEFAULT_LINKS.filter(link => {
      if (currentModule && link.module !== currentModule) return false;
      if (currentQuery && !link.name.toLowerCase().includes(currentQuery)) return false;
      return true;
    });
  }

  // ── Render ──
  function render() {
    const filtered = getFilteredLinks();
    const isSearching = currentQuery.length > 0;

    // Header count
    headerCount.textContent = filtered.length + ' / ' + DEFAULT_LINKS.length;

    // Favorites
    renderFavorites(filtered);

    // Main list
    lessonList.innerHTML = '';

    if (filtered.length === 0) {
      emptyState.classList.add('visible');
      return;
    }
    emptyState.classList.remove('visible');

    if (isSearching) {
      // Flat list when searching
      filtered.forEach(link => {
        const row = createLessonRow(link, true);
        lessonList.appendChild(row);
      });
    } else {
      // Grouped by module > section
      const grouped = groupByModule(filtered);
      grouped.forEach(({ moduleName, sections }) => {
        const group = createModuleGroup(moduleName, sections);
        lessonList.appendChild(group);
      });
    }
  }

  function renderFavorites(filtered) {
    const favLinks = filtered.filter(l => favorites.includes(l.id));
    if (favLinks.length === 0) {
      favSection.classList.remove('has-items');
      favList.innerHTML = '';
      return;
    }
    favSection.classList.add('has-items');
    favList.innerHTML = '';
    favLinks.forEach(link => {
      favList.appendChild(createLessonRow(link, false));
    });
  }

  // ── Group links ──
  function groupByModule(links) {
    const map = new Map();
    links.forEach(link => {
      if (!map.has(link.module)) map.set(link.module, new Map());
      const secMap = map.get(link.module);
      if (!secMap.has(link.category)) secMap.set(link.category, []);
      secMap.get(link.category).push(link);
    });

    const result = [];
    // Preserve MODULES order
    MODULES.forEach(mod => {
      if (map.has(mod.name)) {
        const secMap = map.get(mod.name);
        const sections = [];
        mod.sections.forEach(secName => {
          if (secMap.has(secName)) {
            sections.push({ sectionName: secName, lessons: secMap.get(secName) });
          }
        });
        // catch any sections not in MODULES.sections
        secMap.forEach((lessons, secName) => {
          if (!mod.sections.includes(secName)) {
            sections.push({ sectionName: secName, lessons });
          }
        });
        if (sections.length > 0) {
          result.push({ moduleName: mod.name, sections });
        }
      }
    });

    // catch any modules not in MODULES
    map.forEach((secMap, modName) => {
      if (!MODULES.find(m => m.name === modName)) {
        const sections = [];
        secMap.forEach((lessons, secName) => {
          sections.push({ sectionName: secName, lessons });
        });
        result.push({ moduleName: modName, sections });
      }
    });

    return result;
  }

  // ── Create module group ──
  function createModuleGroup(moduleName, sections) {
    const group = document.createElement('div');
    group.className = 'module-group';

    const totalCount = sections.reduce((n, s) => n + s.lessons.length, 0);

    const header = document.createElement('div');
    header.className = 'module-header';
    header.innerHTML = `
      <div><span class="module-name">${esc(moduleName)}</span><span class="module-count">${totalCount}</span></div>
      <svg class="module-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
    `;
    header.addEventListener('click', () => {
      group.classList.toggle('expanded');
    });

    const body = document.createElement('div');
    body.className = 'module-body';

    sections.forEach(({ sectionName, lessons }) => {
      // Only show section label if more than one section
      if (sections.length > 1) {
        const label = document.createElement('div');
        label.className = 'section-label';
        label.textContent = sectionName;
        body.appendChild(label);
      }
      lessons.forEach(link => {
        body.appendChild(createLessonRow(link, false));
      });
    });

    group.appendChild(header);
    group.appendChild(body);
    return group;
  }

  // ── Create lesson row ──
  function createLessonRow(link, showModule) {
    const row = document.createElement('div');
    row.className = 'lesson-row';

    const name = document.createElement('span');
    name.className = 'lesson-name';
    name.textContent = link.name;
    if (showModule) {
      const sub = document.createElement('span');
      sub.style.cssText = 'display:block;font-size:11px;font-weight:400;color:#999;margin-top:2px;';
      sub.textContent = link.module + ' \u2022 ' + link.category;
      name.appendChild(sub);
    }

    const star = document.createElement('button');
    star.className = 'lesson-star' + (favorites.includes(link.id) ? ' favorited' : '');
    star.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="currentColor" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
    star.addEventListener('click', e => {
      e.stopPropagation();
      toggleFavorite(link.id);
      star.classList.toggle('favorited');
      renderFavorites(getFilteredLinks());
    });

    const copyIcon = document.createElement('span');
    copyIcon.className = 'lesson-copy-icon';
    copyIcon.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';

    row.addEventListener('click', () => {
      copyToClipboard(link.url);
      row.classList.add('just-copied');
      setTimeout(() => row.classList.remove('just-copied'), 600);
      showToast('Copied!');
    });

    row.appendChild(name);
    row.appendChild(star);
    row.appendChild(copyIcon);
    return row;
  }

  // ── Favorites persistence ──
  function toggleFavorite(id) {
    const idx = favorites.indexOf(id);
    if (idx === -1) {
      favorites.push(id);
    } else {
      favorites.splice(idx, 1);
    }
    localStorage.setItem('molis_favorites', JSON.stringify(favorites));
  }

  // ── Clipboard ──
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (_) { /* noop */ }
    document.body.removeChild(ta);
  }

  // ── Toast ──
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 1400);
  }

  // ── Install banner ──
  function initInstallBanner() {
    const banner = document.getElementById('installBanner');
    const dismiss = document.getElementById('installDismiss');

    // Don't show if already installed as standalone or dismissed
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (navigator.standalone) return;
    if (localStorage.getItem('molis_install_dismissed')) return;

    // Show after a short delay
    setTimeout(() => banner.classList.add('visible'), 2000);

    dismiss.addEventListener('click', () => {
      banner.classList.remove('visible');
      localStorage.setItem('molis_install_dismissed', '1');
    });

    // Listen for beforeinstallprompt (Chrome/Edge)
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredPrompt = e;
    });

    banner.addEventListener('click', e => {
      if (e.target === dismiss) return;
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt = null;
      }
    });
  }

  // ── Escape HTML ──
  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ── Register service worker ──
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
})();
