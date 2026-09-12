(() => {
  function kindFor(text) {
    const value = text.replace(/[▸▌【】\[\]\s：:]/g, '').toLowerCase();
    if (value.includes('ie思維重點')) return 'prompt-ie';
    if (value.includes('ai共學') || value.startsWith('ai')) return 'prompt-ai';
    if (value.includes('先想一想') || value.includes('思考題')) return 'prompt-think';
    if (value.includes('本節小結') || value.includes('本節收束') || value.includes('本章整理')) return 'prompt-summary';
    if (value.includes('教師提醒') || value.includes('教學核心')) return 'prompt-teacher';
    return null;
  }

  document.querySelectorAll('h2, h3, h4, h5').forEach(heading => {
    const kind = kindFor(heading.textContent);
    if (kind) heading.classList.add('prompt-heading', kind);
  });

  document.querySelectorAll('p > strong:first-child').forEach(label => {
    const kind = kindFor(label.textContent);
    if (kind) label.parentElement.classList.add('prompt-label-row', kind);
  });

  const images = [...document.querySelectorAll('main img, .lecture-note img, .content-page img')];
  if (!images.length) return;

  const lightbox = document.createElement('div');
  lightbox.className = 'image-lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', '教材圖片全螢幕預覽');
  lightbox.innerHTML = '<button class="image-lightbox-close" type="button" aria-label="關閉圖片">×</button><img alt=""><div class="image-lightbox-caption"></div>';
  document.body.appendChild(lightbox);
  const preview = lightbox.querySelector('img');
  const caption = lightbox.querySelector('.image-lightbox-caption');
  const closeButton = lightbox.querySelector('.image-lightbox-close');
  let previousFocus = null;

  function open(image) {
    previousFocus = document.activeElement;
    preview.src = image.currentSrc || image.src;
    preview.alt = image.alt || '教材圖片';
    caption.textContent = image.closest('figure')?.querySelector('figcaption')?.textContent || image.alt || '';
    lightbox.classList.add('is-open');
    document.body.classList.add('lightbox-open');
    closeButton.focus();
  }

  function close() {
    lightbox.classList.remove('is-open');
    document.body.classList.remove('lightbox-open');
    preview.removeAttribute('src');
    previousFocus?.focus?.();
  }

  images.forEach(image => {
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    image.setAttribute('aria-label', `放大圖片：${image.alt || '教材圖片'}`);
    image.title = '點選放大全螢幕';
    image.addEventListener('click', () => open(image));
    image.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open(image);
      }
    });
  });

  closeButton.addEventListener('click', close);
  preview.addEventListener('click', close);
  lightbox.addEventListener('click', event => { if (event.target === lightbox) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && lightbox.classList.contains('is-open')) close(); });
})();
