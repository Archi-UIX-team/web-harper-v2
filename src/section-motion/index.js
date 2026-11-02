import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

// Native scrolling keeps wheel and trackpad input immediate. Each pin only
// holds its scene for the pixels needed by its scroll-linked detail.
const media = gsap.matchMedia();

media.add({
  desktop: '(min-width: 961px) and (prefers-reduced-motion: no-preference)',
  tall: '(min-width: 961px) and (min-height: 821px) and (prefers-reduced-motion: no-preference)'
}, ({ conditions }) => {
  if (!conditions.desktop) return;
  const nav = document.getElementById('site-nav');
  const scenes = [['hotels', .45], ...(conditions.tall ? [['journal', .06]] : []), ['moments', .16], ['membership', .13]];
  const pins = scenes.map(([id, distance]) => {
    const section = document.getElementById(id);
    section.classList.add('motion-pinned');
    const timeline = gsap.fromTo(section,
      { '--pin-progress': 0 },
      { '--pin-progress': 1, duration: 1, ease: 'none', paused: true }
    );
    const trigger = ScrollTrigger.create({
      trigger: section,
      pin: section,
      pinSpacing: true,
      start: () => `top top+=${nav.getBoundingClientRect().height}`,
      end: () => `+=${Math.round(Math.min(innerHeight * distance, id === 'hotels' ? 460 : 170))}`,
      animation: timeline,
      scrub: true,
      anticipatePin: 1,
      invalidateOnRefresh: true
    });
    return { section, timeline, trigger };
  });
  let disposed = false;
  const refresh = () => {
    if (!disposed) ScrollTrigger.refresh();
  };
  const pendingImages = [...document.images].filter(image => !image.complete);
  pendingImages.forEach(image => image.addEventListener('load', refresh, { once: true }));
  addEventListener('load', refresh, { once: true });
  addEventListener('resize', refresh);
  document.fonts?.ready.then(refresh);
  requestAnimationFrame(refresh);

  return () => {
    disposed = true;
    removeEventListener('load', refresh);
    removeEventListener('resize', refresh);
    pendingImages.forEach(image => image.removeEventListener('load', refresh));
    pins.forEach(({ section, timeline, trigger }) => {
      trigger.kill(true);
      timeline.kill();
      section.classList.remove('motion-pinned');
      section.style.removeProperty('--pin-progress');
    });
    ScrollTrigger.refresh();
  };
});
