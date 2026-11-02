/* React Bits BlurText's word reveal, adapted to a reversible scroll timeline.
   Text stays in its original elements so links, page turns, and live labels keep working. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.querySelector('main');
  const footer = document.querySelector('footer');
  if (!root || !footer) return;

  const textElement = 'h2,h3,h4,p,li,a,button,small,strong,time,figcaption,span';
  const excluded = '#hero-title,.hero-orbit,.reels-orbit,.reels-actions,.membership-device,.prism-caption,' +
    '.site-nav,.hero-booking,.journal-cover,.journal-spine,.journal-page-count,' +
    '.journal-page-button,.journal-open-button,.news-read,.offer-action,.visually-hidden,.scroll-blur-word,' +
    '.footer-corporate,.footer-bottom,.journal-simple,.mobile-journal,.mobile-pager,.mobile-city-selection,' +
    '[aria-hidden="true"],[inert],script,style,svg,option,textarea';
  const blocks = new Set();
  const visible = new Set();
  const clamp = value => Math.max(0, Math.min(1, value));
  let frame = 0;

  const darkSurface = element => {
    // The Reels surface is a gray gradient, whose CSS backgroundColor is transparent.
    if (element.closest('.moments')) return true;
    for (let node = element; node && node !== document.documentElement; node = node.parentElement) {
      const color = getComputedStyle(node).backgroundColor.match(/^rgba?\(([^)]+)\)/);
      if (!color) continue;
      const channels = color[1].split(/[ ,/]+/).map(Number);
      if (channels.length > 3 && channels[3] < .75) continue;
      const [r, g, b] = channels.map(value => {
        const linear = value / 255;
        return linear <= .04045 ? linear / 12.92 : ((linear + .055) / 1.055) ** 2.4;
      });
      return .2126 * r + .7152 * g + .0722 * b < .48;
    }
    return false;
  };

  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visible.add(entry.target);
      else {
        visible.delete(entry.target);
        entry.target.style.setProperty('--blur-progress', '0');
      }
    });
    schedule();
  }, { rootMargin: '22% 0px 22% 0px' }) : null;

  function enhance(scope) {
    if (reduced.matches || !scope || scope.nodeType !== Node.ELEMENT_NODE || scope.matches(excluded)) return;
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    const pending = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (!parent || !node.textContent.trim() || parent.closest(excluded)) continue;
      const block = parent.closest(textElement);
      if (!block || !scope.contains(block) && block !== scope) continue;
      if (block.closest('.footer-brand-marquee')) continue;
      pending.push({ node, block });
    }
    pending.forEach(({ node, block }) => {
      if (!node.isConnected || node.parentElement.closest(excluded)) return;
      const pieces = node.textContent.match(/\s+|\S+/g);
      if (!pieces) return;
      const words = pieces.filter(piece => !/^\s+$/.test(piece));
      const fragment = document.createDocumentFragment();
      let rank = 0;
      pieces.forEach(piece => {
        if (/^\s+$/.test(piece)) {
          fragment.append(document.createTextNode(piece));
        } else {
          const span = document.createElement('span');
          span.className = 'scroll-blur-word';
          span.style.setProperty('--blur-rank', String(words.length > 1 ? rank / (words.length - 1) : 0));
          span.textContent = piece;
          fragment.append(span);
          rank++;
        }
      });
      const display = getComputedStyle(node.parentElement).display;
      if (display.includes('flex') || display.includes('grid')) {
        // Keep a flex/grid label as one item; individual words would become
        // separate tracks and collapse framed kickers and button labels.
        const line = document.createElement('span');
        line.className = 'scroll-blur-line';
        line.append(fragment);
        node.replaceWith(line);
      } else {
        node.replaceWith(fragment);
      }
      if (!blocks.has(block)) {
        blocks.add(block);
        block.classList.add('scroll-blur-text');
        block.style.setProperty('--blur-from', darkSurface(block) ? '#f5f2ec' : '#f08b1d');
        observer?.observe(block);
      }
    });
    schedule();
  }

  function update() {
    frame = 0;
    if (reduced.matches) return;
    const height = innerHeight;
    const topLimit = (document.getElementById('site-nav')?.getBoundingClientRect().height || 56) - 8;
    const entrance = Math.min(190, height * .24);
    const items = observer ? visible : blocks;
    for (const block of items) {
      if (!block.isConnected) {
        visible.delete(block);
        blocks.delete(block);
        observer?.unobserve(block);
        continue;
      }
      const rect = block.getBoundingClientRect();
      const entering = clamp((height - rect.top) / entrance);
      const exiting = clamp((rect.bottom - topLimit) / 52);
      const progress = Math.min(entering, exiting);
      block.style.setProperty('--blur-progress', progress.toFixed(3));
    }
  }

  function schedule() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(update);
  }

  enhance(root);
  enhance(footer);
  // City selections, journal pages, and reel captions can be regenerated later.
  const mutations = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes' && !record.target.hasAttribute('inert') &&
          record.target.getAttribute('aria-hidden') !== 'true') enhance(record.target);
      for (const node of record.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE && !node.matches('.scroll-blur-word')) enhance(node);
      }
    }
  });
  mutations.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['inert', 'aria-hidden'] });
  mutations.observe(footer, { childList: true, subtree: true });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  reduced.addEventListener('change', () => {
    if (!reduced.matches) { enhance(root); enhance(footer); schedule(); }
  });
  schedule();
})();
