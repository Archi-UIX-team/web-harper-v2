import { gsap } from 'gsap';

const root = document.documentElement;
const overlay = document.querySelector('.harper-entrance');
const brand = document.querySelector('#site-nav .brand');
const entranceDuration = 3.16;
const revealDelay = 2;
const entranceSpeed = entranceDuration / revealDelay;

if (root.classList.contains('entrance-pending') && overlay && brand) {
  const logo = overlay.querySelector('.harper-entrance__logo');
  const back = overlay.querySelector('.harper-entrance__back');
  const wordmarks = overlay.querySelector('.harper-entrance__wordmarks');
  const harper = overlay.querySelector('.harper-entrance__harper');
  const aston = overlay.querySelector('.harper-entrance__aston');
  const finalLogo = overlay.querySelector('.harper-entrance__final');
  // The slices fall in the transparent gaps of the supplied Harper artwork.
  const letterEdges = [0, 60, 92, 124, 155, 185, 235];
  const letters = letterEdges.slice(0, -1).map((start, index) => {
    const letter = index ? harper.cloneNode() : harper;
    letter.style.clipPath = `inset(0 ${(1 - letterEdges[index + 1] / 350) * 100}% 0 ${(start / 350) * 100}%)`;
    if (index) wordmarks.insertBefore(letter, aston);
    return letter;
  });
  const seam = overlay.querySelector('.harper-entrance__seam');
  const shine = overlay.querySelector('.harper-entrance__shine');
  const leftDoor = overlay.querySelector('.harper-entrance__door--left');
  const rightDoor = overlay.querySelector('.harper-entrance__door--right');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const nav = document.getElementById('site-nav');
  let timeline, resizeFrame = 0, complete = false;
  let timeout;
  const brandSizeObserver = new ResizeObserver(scheduleResize);
  const navClassObserver = new MutationObserver(scheduleResize);

  const stopInput = event => event.preventDefault();
  const stopKeys = event => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) event.preventDefault();
  };
  const lockInput = () => {
    addEventListener('wheel', stopInput, { passive: false });
    addEventListener('touchmove', stopInput, { passive: false });
    addEventListener('keydown', stopKeys, true);
  };
  const unlockInput = () => {
    removeEventListener('wheel', stopInput);
    removeEventListener('touchmove', stopInput);
    removeEventListener('keydown', stopKeys, true);
  };
  function finish() {
    if (complete) return;
    complete = true;
    timeline?.kill();
    clearTimeout(timeout);
    cancelAnimationFrame(resizeFrame);
    brandSizeObserver.disconnect();
    navClassObserver.disconnect();
    removeEventListener('resize', scheduleResize);
    unlockInput();
    brand.style.removeProperty('opacity');
    root.classList.remove('entrance-pending');
    overlay.remove();
    delete window.__harperEntrance;
  }

  function buildTimeline() {
    const header = brand.getBoundingClientRect();
    const width = Math.min(520, Math.max(270, innerWidth * (innerWidth < 700 ? .85 : .48)));
    const height = width * 106 / 350;
    const expandedWidth = width * 1.16;
    const scale = header.height / height;
    const targetX = header.left + header.width / 2 - innerWidth / 2;
    const targetY = header.top + header.height / 2 - innerHeight / 2;
    gsap.set([leftDoor, rightDoor], { xPercent: 0, rotationY: 0 });
    gsap.set(brand, { opacity: 0 });
    gsap.set(logo, { width, height, xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 1, opacity: 1 });
    gsap.set(back, { opacity: 0, backgroundColor: '#808285' });
    gsap.set(wordmarks, { width });
    gsap.set(letters, { opacity: 0, y: 9 });
    gsap.set(aston, { opacity: 0, y: 9, clipPath: 'inset(0 0 0 71.4%)' });
    gsap.set(finalLogo, { opacity: 0 });
    gsap.set(seam, { left: '50%', width: 3, height: innerHeight, xPercent: -50, yPercent: -50, scaleY: 0, opacity: 1, backgroundColor: '#f08b1d' });
    gsap.set(shine, { opacity: 0, x: 0 });

    return gsap.timeline({ paused: true, onComplete: finish })
      .to(seam, { scaleY: 1, duration: .70, ease: 'power2.inOut' }, 0)
      .to(back, { opacity: 1, duration: .28, ease: 'power2.out' }, .73)
      .to(seam, { left: '69.3%', width: '2.86%', height, scaleY: 1, duration: .82, ease: 'power2.inOut', boxShadow: '0 0 5px #f08b1d99' }, .73)
      .to(letters, { opacity: 1, y: 0, duration: .33, stagger: .07, ease: 'back.out(1.2)' }, .84)
      .to(aston, { opacity: 1, y: 0, duration: .45, ease: 'power2.out' }, 1.08)
      .to(leftDoor, { xPercent: -115, duration: 1.44, ease: 'power2.inOut' }, 1.64)
      .to(rightDoor, { xPercent: 115, duration: 1.44, ease: 'power2.inOut' }, 1.64)
      .to(leftDoor, { rotationY: -7, duration: 1.15, ease: 'power2.inOut' }, 1.64)
      .to(rightDoor, { rotationY: 7, duration: 1.15, ease: 'power2.inOut' }, 1.64)
      .to(logo, { width: expandedWidth, duration: .57, ease: 'power2.inOut' }, 1.65)
      .to(logo, { x: targetX, y: targetY, scale, duration: 1.42, ease: 'power2.inOut' }, 1.70)
      .to(shine, { opacity: .25, duration: .12 }, 1.68)
      .to(shine, { x: expandedWidth * 1.45, duration: .44, ease: 'power2.inOut' }, 1.70)
      .to(shine, { opacity: 0, duration: .16 }, 2.07)
      .to(logo, { width, duration: .90, ease: 'power2.inOut' }, 2.22)
      .to(finalLogo, { opacity: 1, duration: .10, ease: 'power1.inOut' }, 3.02)
      .to([back, wordmarks], { opacity: 0, duration: .10, ease: 'power1.inOut' }, 3.02)
      // Exchange the artwork on the landing frame with no overlapping copies.
      .set(brand, { opacity: 1 }, 3.12)
      .set(logo, { opacity: 0 }, 3.12)
      .call(() => {}, null, entranceDuration)
      .timeScale(entranceSpeed);
  }

  function rebuild() {
    resizeFrame = 0;
    if (complete) return;
    const time = timeline?.time() || 0;
    const paused = timeline?.paused() ?? false;
    timeline?.kill();
    timeline = buildTimeline();
    timeline.time(time);
    if (!paused) timeline.play();
  }
  function scheduleResize() {
    if (!timeline || complete) return;
    if (!resizeFrame) resizeFrame = requestAnimationFrame(rebuild);
  }
  function imageReady(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = resolve;
      image.onerror = reject;
      image.src = src;
      if (image.complete) image.naturalWidth ? resolve() : reject();
    });
  }

  lockInput();
  addEventListener('resize', scheduleResize);
  reduceMotion.addEventListener('change', () => { if (reduceMotion.matches) finish(); });
  window.__harperEntrance = {
    seek(seconds) { timeline?.pause(Math.max(0, Math.min(entranceDuration - .01, seconds * entranceSpeed))); },
    play() { timeline?.play(); },
    get duration() { return revealDelay; }
  };
  timeout = setTimeout(finish, 6500);
  Promise.all([
    imageReady('./assets/entrance/stone-texture.webp'),
    imageReady(harper.src), imageReady(finalLogo.src)
  ]).then(async () => {
    if (complete || reduceMotion.matches || scrollY > 2) return finish();
    // Let the navbar settle before measuring the mark's exact landing spot.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (complete || reduceMotion.matches || scrollY > 2) return finish();
    timeline = buildTimeline();
    brandSizeObserver.observe(brand);
    if (nav) navClassObserver.observe(nav, { attributes: true, attributeFilter: ['class'] });
    timeline.play();
  }).catch(finish);
} else if (root.classList.contains('entrance-pending')) {
  root.classList.remove('entrance-pending');
}
