import React, { useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './TextType.css';

// These files are verified Harper room photographs bundled with the site.
const rooms = [
  { src: './assets/harper-room-01.jpg', hotel: 'Harper Kuta Bali', place: 'Kuta, Bali', alt: 'Harper Kuta Bali guest room opening toward a terrace', position: '53% center' },
  { src: './assets/harper-room-02.jpg', hotel: 'Harper Malioboro Yogyakarta', place: 'Yogyakarta', alt: 'Guest room at Harper Malioboro Yogyakarta', position: '51% center' },
  { src: './assets/harper-room-03.jpg', hotel: 'Harper MT Haryono', place: 'Jakarta', alt: 'Suite at Harper MT Haryono', position: '54% center' },
  { src: './assets/harper-room-04.jpg', hotel: 'Harper Perintis', place: 'Makassar', alt: 'Deluxe room at Harper Perintis', position: '50% center' },
  { src: './assets/harper-room-05.jpg', hotel: 'Harper Palembang', place: 'Palembang', alt: 'Guest room at Harper Palembang', position: '52% center' },
  { src: './assets/harper-room-06.jpg', hotel: 'Harper Kuta Bali', place: 'Kuta, Bali', alt: 'Harper Kuta Bali guest room with lounge', position: '48% center' },
  { src: './assets/harper-room-07.jpg', hotel: 'Harper Banjarmasin', place: 'Banjarmasin', alt: 'Twin guest room at Harper Banjarmasin', position: '52% center' },
  { src: './assets/harper-room-08.jpg', hotel: 'Harper Kupang', place: 'Kupang', alt: 'Guest room at Harper Kupang', position: '50% center' },
  { src: './assets/harper-room-09.jpg', hotel: 'Harper Perintis', place: 'Makassar', alt: 'Executive suite at Harper Perintis', position: '54% center' },
  { src: './assets/harper-room-10.jpg', hotel: 'Harper MT Haryono', place: 'Jakarta', alt: 'Guest room at Harper MT Haryono', position: '50% center' },
];

const mod = (value, length) => ((value % length) + length) % length;
const mix = (a, b, t) => a + (b - a) * t;
function RusticOrbit() {
  const [active, setActive] = useState(1);
  const cardRefs = useRef([]), orbitRef = useRef(null), controller = useRef(null), touch = useRef(null), suppressClick = useRef(false), clickReset = useRef(null);
  const paused = useRef({ hover: false, focus: false, touch: false, offscreen: false });

  useLayoutEffect(() => {
    let phase = 1, move = null, frame, previous = 0, idle = 0;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const paint = () => {
      const width = orbitRef.current.clientWidth, mobile = window.innerWidth < 701;
      const mainWidth = Math.min(width * (mobile ? .78 : .408), mobile ? 420 : 636);
      const mainHeight = mobile ? Math.min(320, mainWidth * .96) : Math.min(322, window.innerHeight * .345, mainWidth * .505);
      const nearest = mod(Math.round(phase), rooms.length);
      setActive(nearest);
      cardRefs.current.forEach((card, index) => {
        let offset = mod(index - phase + rooms.length / 2, rooms.length) - rooms.length / 2;
        const depth = Math.abs(offset), visible = depth < 2.5;
        // Interpolate between five fixed, vertically centered layers.
        const slots = mobile ? [0, .50, .76, 1.05] : [0, .235, .39, .64];
        const sizes = [1, .75, .54, .44];
        const slot = Math.min(2, Math.floor(depth)), fraction = Math.min(1, depth - slot);
        const scale = mix(sizes[slot], sizes[slot + 1], fraction);
        const x = Math.sign(offset) * width * mix(slots[slot], slots[slot + 1], fraction);
        card.style.width = `${mainWidth}px`;
        card.style.height = `${mainHeight}px`;
        card.style.transform = `translate(-50%,-50%) translate(${x}px,${mobile ? 0 : -depth * 10}px) scale(${scale})`;
        card.style.opacity = '1';
        card.style.visibility = visible ? 'visible' : 'hidden';
        card.style.zIndex = String(30 - Math.round(depth * 5));
        card.style.pointerEvents = visible ? 'auto' : 'none';
        card.querySelector('img').style.filter = `grayscale(${Math.min(1, depth)}) blur(${Math.min(1.8, depth * 1.2)}px)`;
        card.tabIndex = visible ? 0 : -1;
        card.setAttribute('aria-hidden', String(!visible));
        card.classList.toggle('is-featured', index === nearest);
        card.classList.toggle('is-left-preview', offset < -.5);
        if(index === nearest) card.setAttribute('aria-current','true'); else card.removeAttribute('aria-current');
      });
    };
    const moveTo = target => {
      idle = 0;
      if (move) return;
      if (motion.matches) { phase = target; paint(); return; }
      move = {from:phase,to:target,elapsed:0};
    };
    controller.current = {
      finishIntro() {},
      step(delta) { moveTo(Math.round(phase) + delta); },
      select(index) {
        let difference = mod(index - mod(Math.round(phase), rooms.length), rooms.length);
        if(difference > rooms.length/2) difference -= rooms.length;
        moveTo(Math.round(phase)+difference);
      }
    };
    const observer = new IntersectionObserver(entries => { paused.current.offscreen = !entries[0].isIntersecting; });
    observer.observe(orbitRef.current);
    const tick = now => {
      const dt = previous ? Math.min(now - previous, 50) : 0; previous = now;
      const frozen = document.hidden || paused.current.offscreen || paused.current.touch;
      if(move && !frozen) {
        move.elapsed += dt;
        const t = Math.min(1, move.elapsed / 500), eased = t*t*(3-2*t);
        phase = mix(move.from,move.to,eased); paint();
        if(t === 1) {move=null;idle=0;}
      } else if(!move && !motion.matches && !frozen && !Object.values(paused.current).some(Boolean)) {
        idle += dt;
        if(idle >= 4000) moveTo(Math.round(phase)+1);
      }
      frame=requestAnimationFrame(tick);
    };
    const onMotion = () => { if(motion.matches && move) {phase=move.to;move=null;paint();} idle=0; };
    paint(); frame=requestAnimationFrame(tick);
    window.__harperOrbitReady = true;
    window.dispatchEvent(new Event('harper:hero-orbit-ready'));
    window.dispatchEvent(new Event('harper:hero-orbit-complete'));
    window.addEventListener('resize',paint);
    motion.addEventListener('change',onMotion);
    return () => {cancelAnimationFrame(frame);observer.disconnect();clearTimeout(clickReset.current);window.removeEventListener('resize',paint);motion.removeEventListener('change',onMotion);controller.current=null;};
  }, []);

  return (
    <div ref={orbitRef} className="rustic-orbit" role="region" aria-roledescription="carousel" aria-label="Harper hotel room carousel" tabIndex={0}
      onMouseEnter={() => { paused.current.hover = true; }}
      onMouseLeave={() => { paused.current.hover = false; }}
      onFocusCapture={() => { paused.current.focus = true; controller.current?.finishIntro(); }}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) paused.current.focus = false; }}
      onClickCapture={event => {
        if (!suppressClick.current) return;
        event.preventDefault(); event.stopPropagation(); suppressClick.current = false;
      }}
      onKeyDown={event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault(); controller.current?.step(event.key === 'ArrowRight' ? 1 : -1);
        }
        if (event.key === 'Home') { event.preventDefault(); controller.current?.select(0, true); }
        if (event.key === 'End') { event.preventDefault(); controller.current?.select(rooms.length - 1, true); }
      }}
      onTouchStart={event => { paused.current.touch = true; touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }}
      onTouchCancel={() => { paused.current.touch = false; touch.current = null; }}
      onTouchEnd={event => {
        paused.current.touch = false;
        if (!touch.current) return;
        const dx = event.changedTouches[0].clientX - touch.current.x;
        const dy = event.changedTouches[0].clientY - touch.current.y;
        if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.2) {
          suppressClick.current = true;
          clearTimeout(clickReset.current);
          clickReset.current = setTimeout(() => { suppressClick.current = false; }, 350);
          controller.current?.step(dx < 0 ? 1 : -1);
        }
        touch.current = null;
      }}>
      {rooms.map((room, index) => <button type="button" key={index} ref={element => { cardRefs.current[index] = element; }}
        className="rustic-orbit__card"
        onClick={() => controller.current?.select(index)}
        tabIndex={index === active ? 0 : -1}
        aria-hidden={index === active ? undefined : true}
        aria-current={index === active ? 'true' : undefined}
        aria-label={`Show ${room.hotel} room in ${room.place}${index === active ? ', featured' : ''}`}>
        <img src={room.src} alt={room.alt} style={{ objectPosition: room.position }} draggable="false" loading="eager" />
        {index === active && <span className="rustic-orbit__caption" aria-hidden="true"><span className="rustic-orbit__hotel"><svg className="rustic-orbit__pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 0 1 14 0Z"/><circle cx="12" cy="9" r="2.3"/></svg><span><strong>{room.hotel}</strong><small>{room.place}, Indonesia</small></span></span></span>}
      </button>)}
      <span className="visually-hidden" aria-live="polite">Featured room: {rooms[active].hotel}, {rooms[active].place}. Use left and right arrow keys or select a surrounding room.</span>
    </div>
  );
}

const mount = document.getElementById('hero-orbit');
if (mount) createRoot(mount).render(<RusticOrbit />);

function setupHeroIntro() {
  const hero = document.querySelector('.hero-contour');
  if (!hero || !mount) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let started = false, ready = Boolean(window.__harperOrbitReady), timer;
  const reveal = () => {
    if (started || !ready || document.documentElement.classList.contains('entrance-pending')) return;
    started = true;
    document.documentElement.classList.remove('hero-intro-pending');
    hero.classList.add('hero-intro-revealed');
    window.dispatchEvent(new Event('harper:hero-orbit-start'));
    timer = setTimeout(() => hero.classList.add('hero-intro-complete'), motion.matches ? 0 : 750);
  };
  const observer = new MutationObserver(reveal);
  observer.observe(document.documentElement, {attributes:true,attributeFilter:['class']});
  const onReady = () => { ready = true; reveal(); };
  window.addEventListener('harper:hero-orbit-ready', onReady, {once:true});
  reveal();
  addEventListener('pagehide', () => { observer.disconnect(); clearTimeout(timer); window.removeEventListener('harper:hero-orbit-ready', onReady); }, {once:true});
}
setupHeroIntro();
