import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './reels-layout.css';

const mod = (value, length) => ((value % length) + length) % length;
const distance = (index, active, count) => mod(index - active + Math.floor(count / 2), count) - Math.floor(count / 2);
const captionFor = alt => {
  const short = alt.replace(/^Harper editorial cover showing /i, '').replace(/^Harper hotel /i, '');
  return short.charAt(0).toUpperCase() + short.slice(1);
};
const ICONS = {
  instagram: <><rect x="2.5" y="2.5" width="19" height="19" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="18" cy="6.3" r="1" fill="currentColor" stroke="none"/></>,
  facebook: <path d="M14.4 21v-8h2.7l.4-3.2h-3.1V7.7c0-.9.3-1.5 1.6-1.5h1.7V3.3a22 22 0 0 0-2.5-.1c-2.5 0-4.2 1.5-4.2 4.3v2.3H8.3V13H11v8z" fill="currentColor" stroke="none"/>,
  x: <path d="M3.5 3.5h3.8l13.2 17h-3.8zM20.5 3.5l-17 17"/>
};

function SocialLinks({ profiles }) {
  return ['instagram', 'facebook', 'x'].map(name => {
    const url = profiles?.[name];
    if (!url) return null;
    const label = name === 'instagram' && url.includes('/favehotels/') ? 'Favehotels on Instagram' : `Harper on ${name === 'x' ? 'X' : name}`;
    return <a key={name} className="reels-social-icon" href={url} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>
    </a>;
  });
}

const socialMount = document.getElementById('reels-social');
const socialRoot = socialMount ? createRoot(socialMount) : null;
function HarperReels() {
  const [data, setData] = useState(null);
  const [active, setActive] = useState(0);
  const [width, setWidth] = useState(1440);
  const [inView, setInView] = useState(false);
  const [entered, setEntered] = useState(matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [tabVisible, setTabVisible] = useState(!document.hidden);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [reduced, setReduced] = useState(matchMedia('(prefers-reduced-motion: reduce)').matches);
  const stageRef = useRef(null);
  const previousActive = useRef(0);
  const pointer = useRef(null);
  const suppressClickUntil = useRef(0);
  const videoRefs = useRef(new Map());

  useEffect(() => {
    const controller = new AbortController();
    fetch('./data/reels.json', { cache: 'no-cache', signal: controller.signal })
      .then(response => { if (!response.ok) throw Error('Reel manifest unavailable'); return response.json(); })
      .then(setData)
      .catch(error => { if (error.name !== 'AbortError') setData({ profiles: {}, items: [] }); });
    return () => controller.abort();
  }, []);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const resize = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    resize.observe(stage);
    const section = document.getElementById('moments');
    const observer = new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting && entry.intersectionRatio > .05;
      setInView(visible);
      if (visible) setEntered(true);
    }, { threshold: [0, .05] });
    observer.observe(section);
    const visibility = () => setTabVisible(!document.hidden);
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => setReduced(motion.matches);
    document.addEventListener('visibilitychange', visibility);
    motion.addEventListener('change', onMotion);
    return () => { resize.disconnect(); observer.disconnect(); document.removeEventListener('visibilitychange', visibility); motion.removeEventListener('change', onMotion); };
  }, []);

  const items = (data?.items || []).filter(item => item && typeof item.url === 'string' && typeof item.alt === 'string' && typeof (item.cover || item.thumbnail) === 'string');
  const mobile = width < 701;
  const cardHeight = mobile ? Math.min(370, width * .93) : Math.min(410, Math.max(330, width * .30));
  const cardWidth = cardHeight * 9 / 16;
  const spacing = cardWidth + (mobile ? 10 : 18);
  const visibleRadius = Math.min(3, Math.ceil(width / spacing / 2));
  const canAdvance = inView && tabVisible && !hovered && !focused && !dragging && !reduced && items.length > 1;

  useEffect(() => {
    if (!canAdvance) return;
    const timer = setTimeout(() => setActive(index => mod(index + 1, items.length)), 5500);
    return () => clearTimeout(timer);
  }, [active, canAdvance, items.length]);
  useEffect(() => { previousActive.current = active; }, [active]);
  useEffect(() => {
    const section = document.getElementById('moments');
    if (section) section.dataset.reelsState = items.length ? 'ready' : data ? 'empty' : 'loading';
    if (data) socialRoot?.render(<SocialLinks profiles={data.profiles || {}} />);
  }, [data, items.length]);
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      const shouldPlay = inView && tabVisible && !reduced && Math.abs(distance(index, active, items.length)) <= visibleRadius;
      if (shouldPlay) video.play().catch(() => { video.closest('.reels-flex-card')?.classList.remove('is-playing'); });
      else { video.pause(); video.closest('.reels-flex-card')?.classList.remove('is-playing'); }
    });
  }, [active, inView, tabVisible, reduced, visibleRadius, items.length]);

  const step = delta => setActive(index => mod(index + delta, items.length));
  const onPointerDown = event => {
    if (event.button !== 0 || !items.length) return;
    pointer.current = { id:event.pointerId, x:event.clientX, y:event.clientY, moved:false };
    setDragging(true);
  };
  const onPointerMove = event => {
    const start = pointer.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.moved && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) { pointer.current = null; setDragging(false); return; }
    if (Math.abs(dx) > 8) start.moved = true;
    if (start.moved) {
      stageRef.current.style.setProperty('--reels-drag-x', `${Math.max(-spacing, Math.min(spacing, dx))}px`);
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
    }
  };
  const onPointerUp = event => {
    const start = pointer.current;
    pointer.current = null;
    setDragging(false);
    if (start?.moved) {
      suppressClickUntil.current = performance.now() + 400;
      if (Math.abs(event.clientX - start.x) > 42) step(event.clientX < start.x ? 1 : -1);
    }
    requestAnimationFrame(() => stageRef.current?.style.setProperty('--reels-drag-x', '0px'));
  };
  const onPointerCancel = () => {
    pointer.current = null;
    setDragging(false);
    stageRef.current?.style.setProperty('--reels-drag-x', '0px');
  };
  const selectCard = (event, index) => {
    if (performance.now() < suppressClickUntil.current) { event.preventDefault(); return; }
    if (index !== active) { event.preventDefault(); setActive(index); }
  };

  return <>
    {data && !items.length && <div className="reels-empty"><p>See the latest moments from Harper.</p><a href="https://www.instagram.com/harperhotels/reels/" target="_blank" rel="noopener noreferrer">Explore official Reels ↗</a></div>}
    <div ref={stageRef} className={`reels-flex${entered ? ' is-entered' : ''}${dragging ? ' is-dragging' : ''}`} role="region" aria-roledescription="carousel" aria-label="Harper reels carousel" tabIndex={0}
      onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }} onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}
      onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); step(event.key === 'ArrowRight' ? 1 : -1); } }}>
      {items.map((item, index) => {
        const offset = distance(index, active, items.length);
        const previousOffset = distance(index, previousActive.current, items.length);
        const wrapJump = Math.abs(offset - previousOffset) > 1.5;
        const isActive = index === active;
        const near = Math.abs(offset) <= visibleRadius;
        const videoUrl = typeof item.video === 'string' && /^(?:\.\/|https:\/\/)/i.test(item.video) && !/^https:\/\/(?:www\.)?instagram\.com\//i.test(item.video) ? item.video : null;
        const mediaReady = near && inView && tabVisible && !reduced;
        const accountPage = item.url.endsWith('/reels/');
        const label = accountPage ? `Browse Favehotels Reels. Preview: ${item.alt}` : `Watch Reel: ${item.alt}`;
        return <a key={`${item.url}-${index}`} className={`reels-flex-card${isActive ? ' is-active' : ''}${wrapJump ? ' is-wrapping' : ''}${near ? '' : ' is-far'}`}
          href={item.url} target="_blank" rel="noopener noreferrer" aria-label={label} aria-current={isActive ? 'true' : undefined}
          tabIndex={near ? 0 : -1} onClick={event => selectCard(event, index)}
          style={{ '--reels-x':`${offset * spacing}px`, '--reels-y':`${Math.abs(offset) * (mobile ? 12 : 17)}px`, '--reels-scale':Math.max(.8, 1 - Math.abs(offset) * .045), '--reels-card-width':`${cardWidth}px`, '--reels-card-height':`${cardHeight}px`, zIndex:100 - Math.abs(offset) }}>
          <img src={item.cover || item.thumbnail} alt="" loading={index === 0 || (inView && near) ? 'eager' : 'lazy'} decoding="async" />
          {videoUrl && <video ref={node => { if (node) videoRefs.current.set(index, node); else videoRefs.current.delete(index); }}
            src={mediaReady ? videoUrl : undefined} poster={item.cover || item.thumbnail} muted loop playsInline preload="none" aria-hidden="true"
            onPlaying={event => event.currentTarget.closest('.reels-flex-card')?.classList.add('is-playing')}
            onPause={event => event.currentTarget.closest('.reels-flex-card')?.classList.remove('is-playing')}
            onError={event => event.currentTarget.closest('.reels-flex-card')?.classList.remove('is-playing')} />}
          <span className="reels-flex-play" aria-hidden="true">{accountPage ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18 18 6M8 6h10v10"/></svg> : <svg viewBox="0 0 24 24" fill="currentColor"><path d="m8 5 11 7-11 7V5Z"/></svg>}</span>
          <span className="reels-flex-label" aria-hidden="true">{isActive ? <>{captionFor(item.alt)}<small>{accountPage ? 'View Favehotels Reels' : 'Watch Reel'}</small></> : ''}</span>
        </a>;
      })}
      {items.length > 0 && <div className="reels-flex-caption" aria-live="polite"><span>{String(active + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</span><span className="reels-flex-caption-line"/><span>{captionFor(items[active].alt)}</span></div>}
    </div>
  </>;
}

const mount = document.getElementById('reels-orbit');
if (mount) createRoot(mount).render(<HarperReels />);
