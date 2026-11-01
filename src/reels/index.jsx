import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import FlexCarousel from './FlexCarousel.jsx';
import './reels-layout.css';

const ICONS = {
  instagram: <><rect x="2.5" y="2.5" width="19" height="19" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="18" cy="6.3" r="1" fill="currentColor" stroke="none"/></>,
  facebook: <path d="M14.4 21v-8h2.7l.4-3.2h-3.1V7.7c0-.9.3-1.5 1.6-1.5h1.7V3.3a22 22 0 0 0-2.5-.1c-2.5 0-4.2 1.5-4.2 4.3v2.3H8.3V13H11v8z" fill="currentColor" stroke="none"/>,
  x: <path d="M3.5 3.5h3.8l13.2 17h-3.8zM20.5 3.5l-17 17"/>
};
const supportsWebGL2 = () => {
  try { return Boolean(document.createElement('canvas').getContext('webgl2')); }
  catch { return false; }
};
const captionFor = alt => {
  const short = alt.replace(/^Harper editorial cover showing /i, '').replace(/^Harper hotel /i, '');
  return short.charAt(0).toUpperCase() + short.slice(1);
};

function SocialLinks({ profiles }) {
  return ['instagram', 'facebook', 'x'].map(name => {
    const label = `Harper on ${name === 'x' ? 'X' : name}`;
    return <a key={name} className="reels-social-icon" href={profiles[name]} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>
    </a>;
  });
}

function HarperReels() {
  const [data, setData] = useState(null);
  const [mobile, setMobile] = useState(() => matchMedia('(max-width: 700px)').matches);
  const [webgl] = useState(supportsWebGL2);
  const dialogRef = useRef(null);
  useEffect(() => {
    const media = matchMedia('(max-width: 700px)');
    const update = () => setMobile(media.matches);
    media.addEventListener('change', update);
    const controller = new AbortController();
    fetch('./data/reels.json', { signal: controller.signal, cache: 'no-cache' })
      .then(response => { if (!response.ok) throw Error('Reel manifest unavailable'); return response.json(); })
      .then(setData)
      .catch(error => { if (error.name !== 'AbortError') setData({ profiles: {}, items: [] }); });
    return () => { controller.abort(); media.removeEventListener('change', update); };
  }, []);

  const valid = item => item && typeof item.alt === 'string' && typeof item.url === 'string' &&
    typeof (item.cover || item.thumbnail) === 'string';
  const items = (data?.items || []).filter(valid);
  const carouselItems = items.map((item, index) => ({
    ...item,
    src: item.cover || item.thumbnail,
    title: captionFor(item.alt),
    subtitle: `Harper moment ${String(index + 1).padStart(2, '0')}`
  }));
  const select = (_index, item) => {
    if (!item?.video) { window.open(item.url, '_blank', 'noopener,noreferrer'); return; }
    const dialog = dialogRef.current;
    if (!dialog) return;
    const video = dialog.querySelector('video');
    video.src = item.video;
    video.poster = item.src;
    video.setAttribute('aria-label', item.alt);
    dialog.querySelector('a').href = item.url;
    dialog.showModal();
    video.play().catch(() => {});
  };
  const close = () => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const video = dialog.querySelector('video');
    video.pause();
    video.removeAttribute('src');
    video.load();
  };

  useEffect(() => {
    const section = document.getElementById('moments');
    if (section) section.dataset.reelsState = items.length ? 'ready' : data ? 'empty' : 'loading';
  }, [data, items.length]);

  return <>
    {data && !items.length ? <div className="reels-empty"><p>See the latest moments from Harper.</p><a href="https://www.instagram.com/harperhotels/reels/" target="_blank" rel="noopener noreferrer">Explore official Reels ↗</a></div> : null}
    {items.length && webgl ? <>
      <FlexCarousel items={carouselItems} preset="liquid" intro="rise" fit="reel" cardHeight={mobile ? .7 : .69}
        gap={mobile ? 10 : 16} radius={0} lensWidth={mobile ? .92 : .77} roundness={.32}
        dispersion={.1} liquid={.05} squeeze={.1} focusOnClick={false} captions autoplay interval={5.5}
        captureWheel={false} onSelect={select} ariaLabel="Harper reels carousel" />
    </> : null}
    {items.length && !webgl ? <div className="reels-flex-fallback" role="region" aria-label="Harper reels carousel">
      {items.map((item, index) => <a key={`${item.url}-${index}`} href={item.url} target="_blank" rel="noopener noreferrer" aria-label={item.alt}>
        <img src={item.cover || item.thumbnail} alt={item.alt} loading="lazy" />
      </a>)}
    </div> : null}
    <dialog ref={dialogRef} className="reel-player" aria-label="Watch this Moment" onClose={close} onClick={event => { if (event.target === dialogRef.current) dialogRef.current.close(); }}>
      <div className="reel-player-heading"><h3>Moments at Harper</h3><button type="button" aria-label="Close video" onClick={() => dialogRef.current?.close()}>×</button></div>
      <video controls playsInline preload="metadata"/><a target="_blank" rel="noopener noreferrer">View original Reel on Instagram ↗</a>
    </dialog>
  </>;
}

const mount = document.getElementById('reels-orbit');
const social = document.getElementById('reels-social');
if (mount) createRoot(mount).render(<HarperReels />);
if (social) {
  fetch('./data/reels.json', { cache: 'no-cache' }).then(response => response.json()).then(data => {
    createRoot(social).render(<SocialLinks profiles={data.profiles || {}} />);
  }).catch(() => {});
}
