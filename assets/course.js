(() => {
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch {} }
  };
  const prefix = document.body.dataset.storagePrefix || 'course';
  const pages = [...document.querySelectorAll('.content-page')];
  const chapterButtons = [...document.querySelectorAll('.chapter-toggle')];
  const resourceButtons = [...document.querySelectorAll('.resource-toggle')];
  const desktop = window.matchMedia('(min-width: 981px)');
  const available = new Set(pages.map(page => `${page.dataset.chapter}-${page.dataset.view}`));
  const initialChapter = Number(storage.get(`${prefix}-chapter`)) || 1;
  const initialView = storage.get(`${prefix}-view`) || 'guide';
  const state = {
    chapter: available.has(`${initialChapter}-${initialView}`) ? initialChapter : 1,
    view: available.has(`${initialChapter}-${initialView}`) ? initialView : 'guide',
    activeIndex: 0,
    fontScale: Math.min(2.4, Math.max(.85, Number(storage.get(`${prefix}-font`)) || 1)),
    sections: {}
  };

  const menu = document.getElementById('menu-button');
  const indicator = document.getElementById('section-indicator');
  const progress = document.getElementById('progress-bar');
  const fontValue = document.getElementById('font-value');
  const contentToggle = document.getElementById('content-toggle');

  pages.forEach(page => {
    const key = `${page.dataset.chapter}-${page.dataset.view}`;
    state.sections[key] = [...page.querySelectorAll('[data-nav-heading]')];
    buildToc(page.dataset.chapter, page.dataset.view, state.sections[key]);
  });
  addPairLinks();
  setFont(state.fontScale);
  if (desktop.matches && storage.get(`${prefix}-sidebar`) === 'collapsed') document.body.classList.add('sidebar-collapsed');
  syncAll(false);

  function key(chapter = state.chapter, view = state.view) { return `${chapter}-${view}`; }
  function sections() { return state.sections[key()] || []; }

  function buildToc(chapter, view, headings) {
    const toc = document.querySelector(`[data-toc-chapter="${chapter}"][data-toc-view="${view}"]`);
    if (!toc) return;
    toc.innerHTML = '';
    headings.forEach((heading, index) => {
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      link.dataset.index = index;
      link.dataset.depth = heading.dataset.depth || '1';
      link.addEventListener('click', event => {
        event.preventDefault();
        select(Number(chapter), view, index, true);
        closeMobileSidebar();
      });
      toc.appendChild(link);
    });
  }

  function normalize(value) {
    return value.replace(/[\s　：:，,？?"'「」]/g, '').toLowerCase();
  }

  function addPairLinks() {
    const chapters = [...new Set(pages.map(page => Number(page.dataset.chapter)))];
    chapters.forEach(chapter => {
      const guide = state.sections[`${chapter}-guide`] || [];
      const full = state.sections[`${chapter}-full`] || [];
      const fullMap = new Map(full.map((heading, index) => [normalize(heading.textContent), index]));
      guide.forEach((heading, guideIndex) => {
        const fullIndex = fullMap.get(normalize(heading.textContent));
        if (fullIndex === undefined) return;
        createPairLink(heading, '前往完整教材', chapter, 'full', fullIndex);
        createPairLink(full[fullIndex], '返回課程導讀', chapter, 'guide', guideIndex);
      });
    });
  }

  function createPairLink(heading, label, chapter, view, index) {
    const link = document.createElement('a');
    link.href = '#';
    link.className = 'pair-link';
    link.textContent = `${label} →`;
    link.addEventListener('click', event => {
      event.preventDefault();
      select(chapter, view, index, true);
    });
    heading.insertAdjacentElement('afterend', link);
  }

  function select(chapter, view, index = 0, scroll = false) {
    if (!available.has(`${chapter}-${view}`)) view = 'guide';
    state.chapter = chapter;
    state.view = view;
    state.activeIndex = Math.min(index, Math.max(0, (state.sections[`${chapter}-${view}`] || []).length - 1));
    storage.set(`${prefix}-chapter`, chapter);
    storage.set(`${prefix}-view`, view);
    syncAll(scroll);
  }

  function syncAll(scroll) {
    pages.forEach(page => page.classList.toggle('is-active', Number(page.dataset.chapter) === state.chapter && page.dataset.view === state.view));
    chapterButtons.forEach(button => {
      const active = Number(button.dataset.chapter) === state.chapter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-expanded', String(active));
      document.getElementById(button.getAttribute('aria-controls'))?.classList.toggle('is-open', active);
    });
    resourceButtons.forEach(button => {
      const active = Number(button.dataset.chapter) === state.chapter && button.dataset.view === state.view;
      button.classList.toggle('is-active', active);
      if (active) {
        button.setAttribute('aria-expanded', 'true');
        document.getElementById(button.getAttribute('aria-controls'))?.classList.add('is-open');
      }
    });
    updateContentToggle();
    updateStatus();
    if (scroll) sections()[state.activeIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function updateContentToggle() {
    const targetView = state.view === 'guide' ? 'full' : 'guide';
    const enabled = available.has(`${state.chapter}-${targetView}`);
    contentToggle.disabled = !enabled;
    contentToggle.textContent = enabled ? (targetView === 'full' ? '完整教材' : '課程導讀') : '尚無對應內容';
  }

  function updateStatus() {
    const current = sections()[state.activeIndex];
    const mode = state.view === 'guide' ? '課程導讀' : '完整教材';
    indicator.textContent = `第 ${state.chapter} 章｜${mode}${current ? `｜${current.textContent}` : ''}`;
    let activeLink = null;
    document.querySelectorAll('.toc a').forEach(link => {
      const toc = link.closest('.toc');
      const active = Number(toc.dataset.tocChapter) === state.chapter && toc.dataset.tocView === state.view && Number(link.dataset.index) === state.activeIndex;
      link.classList.toggle('is-current', active);
      if (active) activeLink = link;
    });
    keepVisible(activeLink);
    document.getElementById('prev-section').disabled = state.chapter === 1 && state.activeIndex === 0;
    const maxChapter = Math.max(...pages.map(page => Number(page.dataset.chapter)));
    document.getElementById('next-section').disabled = state.chapter === maxChapter && state.activeIndex === sections().length - 1;
  }

  function keepVisible(link) {
    const panel = link?.closest('.resource-panel');
    if (!panel || !panel.clientHeight) return;
    const a = link.getBoundingClientRect();
    const b = panel.getBoundingClientRect();
    if (a.top < b.top + 16) panel.scrollTop += a.top - b.top - 16;
    else if (a.bottom > b.bottom - 16) panel.scrollTop += a.bottom - b.bottom + 16;
  }

  function move(direction) {
    let index = state.activeIndex + direction;
    const currentSections = sections();
    const maxChapter = Math.max(...pages.map(page => Number(page.dataset.chapter)));
    if (index < 0 && state.chapter > 1) {
      const chapter = state.chapter - 1;
      const view = available.has(`${chapter}-${state.view}`) ? state.view : 'guide';
      select(chapter, view, (state.sections[`${chapter}-${view}`] || []).length - 1, true);
    } else if (index >= currentSections.length && state.chapter < maxChapter) {
      const chapter = state.chapter + 1;
      const view = available.has(`${chapter}-${state.view}`) ? state.view : 'guide';
      select(chapter, view, 0, true);
    } else if (index >= 0 && index < currentSections.length) select(state.chapter, state.view, index, true);
  }

  function setFont(value) {
    state.fontScale = Math.round(Math.min(2.4, Math.max(.85, value)) * 100) / 100;
    document.documentElement.style.setProperty('--font-scale', state.fontScale);
    storage.set(`${prefix}-font`, state.fontScale);
    fontValue.textContent = `${Math.round(state.fontScale * 100)}%`;
    document.getElementById('font-down').disabled = state.fontScale <= .85;
    document.getElementById('font-up').disabled = state.fontScale >= 2.4;
  }

  function closeMobileSidebar() {
    document.body.classList.remove('sidebar-open');
    if (!desktop.matches) menu.setAttribute('aria-expanded', 'false');
  }

  chapterButtons.forEach(button => button.addEventListener('click', () => {
    const chapter = Number(button.dataset.chapter);
    if (chapter !== state.chapter) select(chapter, 'guide');
    else {
      const panel = document.getElementById(button.getAttribute('aria-controls'));
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open));
      panel?.classList.toggle('is-open', open);
    }
  }));
  resourceButtons.forEach(button => button.addEventListener('click', () => {
    const chapter = Number(button.dataset.chapter);
    const view = button.dataset.view;
    const wasActive = chapter === state.chapter && view === state.view;
    const wasOpen = button.getAttribute('aria-expanded') === 'true';
    select(chapter, view);
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    const open = !(wasActive && wasOpen);
    button.setAttribute('aria-expanded', String(open));
    panel?.classList.toggle('is-open', open);
  }));
  menu.addEventListener('click', () => {
    if (desktop.matches) {
      document.body.classList.toggle('sidebar-collapsed');
      storage.set(`${prefix}-sidebar`, document.body.classList.contains('sidebar-collapsed') ? 'collapsed' : 'open');
    } else document.body.classList.toggle('sidebar-open');
  });
  document.getElementById('backdrop').addEventListener('click', closeMobileSidebar);
  document.getElementById('font-up').addEventListener('click', () => setFont(state.fontScale + .15));
  document.getElementById('font-down').addEventListener('click', () => setFont(state.fontScale - .15));
  contentToggle.addEventListener('click', () => select(state.chapter, state.view === 'guide' ? 'full' : 'guide', state.activeIndex, true));
  document.getElementById('fullscreen').addEventListener('click', async () => {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
  });
  document.getElementById('prev-section').addEventListener('click', () => move(-1));
  document.getElementById('next-section').addEventListener('click', () => move(1));
  window.addEventListener('scroll', () => {
    const total = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = `${total > 0 ? scrollY / total * 100 : 0}%`;
    let index = 0;
    sections().forEach((heading, i) => { if (heading.getBoundingClientRect().top <= 112) index = i; });
    if (index !== state.activeIndex) { state.activeIndex = index; updateStatus(); }
  }, { passive: true });
  document.addEventListener('keydown', event => {
    if (event.target.matches('input, textarea, select')) return;
    if (event.key === 'ArrowLeft') move(-1);
    if (event.key === 'ArrowRight') move(1);
    if (event.key === '+' || event.key === '=') setFont(state.fontScale + .15);
    if (event.key === '-') setFont(state.fontScale - .15);
    if (event.key.toLowerCase() === 'f') document.getElementById('fullscreen').click();
    if (event.key === 'Escape') closeMobileSidebar();
  });
})();
