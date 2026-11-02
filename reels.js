/* FlexCarousel-inspired layout with native video frames: data/reels.json. */
(() => {
  const section = document.getElementById('moments');
  if (!section) return;
  const stage = document.getElementById('reels-stage');
  const orbit = document.getElementById('reels-orbit');
  const center = document.getElementById('reels-center');
  const social = document.getElementById('reels-social');
  const pagination = document.getElementById('reels-pagination');
  const empty = document.getElementById('reels-empty');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const phone = matchMedia('(max-width: 700px)');
  const icons = {
    instagram: '<rect x="2.5" y="2.5" width="19" height="19" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="18" cy="6.3" r="1" fill="currentColor" stroke="none"/>',
    facebook: '<path d="M14.4 21v-8h2.7l.4-3.2h-3.1V7.7c0-.9.3-1.5 1.6-1.5h1.7V3.3a22 22 0 0 0-2.5-.1c-2.5 0-4.2 1.5-4.2 4.3v2.3H8.3V13H11v8z" fill="currentColor" stroke="none"/>',
    x: '<path d="M3.5 3.5h3.8l13.2 17h-3.8zM20.5 3.5l-17 17"/>'
  };
  let cards = [], lights = [], sparks = [], items = [], state = 'idle';
  let playbackPaused = false, manualPreview = false, player = null, featuredIndex = 0;
  function syncPlayback() {
    const playing = visible && !document.hidden && !player?.open && (manualPreview || (!reduced.matches && !playbackPaused));
    cards.forEach((card,index) => {
      const video = card.querySelector('video');
      if (!video) return;
      const wanted = playing && card.dataset.inView === 'true' && card.dataset.orbitVisible === 'true' && (!reduced.matches || index === featuredIndex);
      if (wanted && card.dataset.playbackWanted !== 'true') {
        card.dataset.playbackWanted = 'true';
        video.play().catch(() => { card.dataset.playbackWanted = 'false'; });
      } else if (!wanted) {
        card.dataset.playbackWanted = 'false';
        if (!video.paused) video.pause();
      }
    });
  }
  function highlight(index) {
    if (featuredIndex !== index) { featuredIndex = index; manualPreview = false; syncPlayback(); }
    cards.forEach((card,i) => {
      card.classList.toggle('is-highlighted',i === index);
      if (i === index) card.setAttribute('aria-current','true'); else card.removeAttribute('aria-current');
    });

  }
  function alignTo(index) {
    const target = -index / cards.length;
    stepFrom = phase;
    stepTo = phase + wrap(target - phase);
    stepAt = performance.now();
    selectedIndex = index;
    carouselElapsed = 0;
    updatePagination();
    if (reduced.matches) { phase = stepTo; stepAt = 0; render(); }
  }
  function openVideo(item) {
    stepAt=0;
    if (!player) {
      player = document.createElement('dialog');
      player.className = 'reel-player';
      player.setAttribute('aria-label','Watch this Moment');
      player.innerHTML = '<div class="reel-player-heading"><h3>Lorem ipsum</h3><button type="button" aria-label="Close video">×</button></div><video controls playsinline preload="metadata"></video><a target="_blank" rel="noopener noreferrer">View original Reel on Instagram ↗</a>';
      document.body.append(player);
      player.querySelector('button').addEventListener('click',()=>player.close());
      player.addEventListener('close',()=>{const video=player.querySelector('video');video.pause();video.removeAttribute('src');video.load();syncPlayback();});
      player.addEventListener('click',event=>{if(event.target===player){const r=player.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)player.close();}});
    }
    const video = player.querySelector('video');
    video.src = item.video; video.poster = item.cover || item.thumbnail;
    video.setAttribute('aria-label',item.alt);
    player.querySelector('a').href = item.url;
    player.showModal(); syncPlayback();
    if (!reduced.matches) video.play().catch(()=>{});
  }
  let visible = false, hover = false, focused = false, dragging = false;
  let phase = 0, last = 0, raf = 0, pointerX = 0, pointerStart = 0, pointerActive = false, suppressClickUntil = 0;
  let carouselElapsed = 0, selectedIndex = 0;
  const AUTOPLAY_MS = 6000;
  let stepFrom = 0, stepTo = 0, stepAt = 0;
  let geometry = {x:0,y:0,w:0,h:0,length:1,points:[],focal:0};
  const wrap = value => ((value + .5) % 1 + 1) % 1 - .5;
  const ease = t => { t = Math.max(0, Math.min(1,t)); return t*t*(3-2*t); };
  const setState = next => { state = next; section.dataset.reelsState = next; social.inert = false; };
  social.inert = false;
  const valid = item => item && typeof item.alt === 'string' && item.alt.trim() &&
    typeof item.cover === 'string' &&
    (/^https:\/\/www\.instagram\.com\/favehotels\/reels\/?$/.test(item.url || '') ||
      /^https:\/\/www\.instagram\.com\/reel\/[\w-]+\/?(?:\?.*)?$/.test(item.url || ''));
  function updatePagination() {
    if (!pagination) return;
    [...pagination.children].forEach((button,index) => {
      const amount = index < selectedIndex ? 1 : index === selectedIndex ? carouselElapsed / AUTOPLAY_MS : 0;
      button.querySelector('span').style.transform = `scaleX(${Math.min(1,amount).toFixed(4)})`;
      if (index === selectedIndex) button.setAttribute('aria-current','true');
      else button.removeAttribute('aria-current');
    });
  }
  function makePagination() {
    if (!pagination) return;
    pagination.replaceChildren();
    items.forEach((_,index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label',`Show reel ${index+1} of ${items.length}`);
      button.innerHTML = '<span aria-hidden="true"></span>';
      button.addEventListener('click',() => alignTo(index));
      pagination.append(button);
    });
    updatePagination();
  }
  function renderSocial(profiles) {
    social.replaceChildren();
    for (const name of ['instagram','facebook','x']) {
      const url = profiles?.[name];
      const icon = document.createElement(url ? 'a' : 'span');
      icon.className = 'reels-social-icon' + (url ? '' : ' is-unlinked');
      icon.setAttribute('aria-label', url ? `${name === 'instagram' ? 'Favehotels' : 'Harper'} on ${name === 'x' ? 'X' : name}` : `${name === 'x' ? 'X' : name} profile link pending verification`);
      icon.title = icon.getAttribute('aria-label');
      if (url) { icon.href = url; icon.target = '_blank'; icon.rel = 'noopener noreferrer'; }
      icon.innerHTML = `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
      social.append(icon);
    }
  }
  // Fit the whole composition below the nav; keep every frame in portrait 9:16.
  function measure() {
    stage.setAttribute('aria-description', 'Drag or swipe to browse Reels. Use the left and right arrow keys to navigate.');
    const mobile = phone.matches;
    const navHeight = document.getElementById('site-nav')?.getBoundingClientRect().height || 0;
    const viewportHeight = window.visualViewport?.height || innerHeight;
    const sectionStyle = getComputedStyle(section);
    const verticalPadding = parseFloat(sectionStyle.paddingTop) + parseFloat(sectionStyle.paddingBottom);
    const margin = element => { const style=getComputedStyle(element); return (parseFloat(style.marginTop)||0)+(parseFloat(style.marginBottom)||0); };
    const available = viewportHeight - navHeight - verticalPadding - center.getBoundingClientRect().height - margin(center) - (pagination?.getBoundingClientRect().height||0) - margin(pagination) - 8;
    const galleryHeight = Math.max(210, Math.min(available, mobile ? 520 : 660));
    const h = Math.max(192, galleryHeight - 18);
    const w = h * 9 / 16;
    const spacing = mobile ? w*.82 : w*.905+18;
    const outerStep = mobile ? spacing : w*.785+25;
    geometry = {x:spacing,outerStep,y:0,w,h,length:spacing*cards.length,points:[0],focal:0};
    orbit.style.setProperty('--gallery-height',`${galleryHeight}px`);
    render();
  }
  function renderCards() {
    orbit.replaceChildren();
    lights = [];
    sparks = [.08,.31,.59,.83].map(progress => {
      const spark=document.createElement('span');spark.className='reels-orbit-spark';spark.setAttribute('aria-hidden','true');orbit.append(spark);return {node:spark,progress};
    });
    cards = items.map((item,i) => {
      const link = document.createElement('a');
      link.className = 'reels-card'; link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.draggable = false;
      link.setAttribute('aria-label', item.url.includes('/favehotels/reels') ? `Browse Favehotels Reels on Instagram. Preview photo: ${item.alt}` : `Watch Reel on Instagram. Cover: ${item.alt}`);
      if (item.cover || item.thumbnail) {
        if (/^\.\/assets\/reels\/[\w-]+\.mp4$/.test(item.video || '')) {
          const video = document.createElement('video');
          video.muted = true; video.defaultMuted = true; video.autoplay = false; video.loop = true; video.playsInline = true;
          video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
          video.poster = item.cover || item.thumbnail; video.preload = 'none';
          video.setAttribute('aria-hidden', 'true'); video.src = item.video;
          link.classList.add('has-video'); link.append(video);
        } else {
          const img = document.createElement('img'); img.src = item.cover || item.thumbnail; img.alt = item.alt; img.loading = i < 2 ? 'eager' : 'lazy'; img.decoding = 'async'; img.draggable = false;
          link.append(img);
        }
        const badge = document.createElement('span');
        badge.className = 'reels-card-badge';
        badge.setAttribute('aria-hidden', 'true');
        badge.innerHTML = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 5l3 5M15 5l3 5"/><path d="m10 13 5 2.5-5 2.5z" fill="currentColor" stroke="none"/></svg>';
        link.append(badge);
      } else {
        const placeholder = document.createElement('span'); placeholder.className = 'reels-card-placeholder';
        placeholder.innerHTML = '<span class="reels-card-play" aria-hidden="true"><svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor"><path d="M6 3.5v13l10-6.5z"/></svg></span><span>Watch this Reel</span><small>On Instagram ↗</small>';
        link.append(placeholder);
      }
      const light=document.createElement('span');
      light.className='reels-card-light';light.setAttribute('aria-hidden','true');
      lights.push(light);orbit.append(light,link);
      link.setAttribute('aria-description', 'Press Enter to watch this Reel.');
      link.addEventListener('click', e => {
        if (performance.now() < suppressClickUntil) { e.preventDefault(); return; }
        if (i !== featuredIndex) { e.preventDefault(); alignTo(i); return; }
        if (item.video && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) { e.preventDefault(); openVideo(item); }
      });
      link.addEventListener('focus', () => { if (!pointerActive) alignTo(i); });
      link.addEventListener('keydown', e => {
        if (e.code !== 'Space' || !link.querySelector('video')) return;
        e.preventDefault();
        if (reduced.matches) manualPreview = !manualPreview; else playbackPaused = !playbackPaused;
        syncPlayback();
      });
      return link;
    });
    measure();
  }
  function render() {
    if (!cards.length || !geometry.points.length) return;
    const n=cards.length;
    let nearest=0, distance=Infinity, visibilityChanged=false;
    cards.forEach((card,i) => {
      const offset=wrap(i/n+phase)*n;
      const depth=Math.abs(offset);
      if(depth<distance){distance=depth;nearest=i;}
      const x=Math.sign(offset)*(Math.min(depth,1)*geometry.x+Math.max(0,depth-1)*geometry.outerStep);
      const y=Math.min(depth*depth,5)*(phone.matches?5:11);
      const scale=1-.19*Math.min(1,depth)-.05*Math.max(0,Math.min(depth-1,1));
      const visibility=depth<=(phone.matches?1.2:2.4)?1:0;
      card.style.width=`${geometry.w}px`;
      card.style.height=`${geometry.h}px`;
      card.style.setProperty('--card-width',`${geometry.w}px`);
      card.style.setProperty('--card-height',`${geometry.h}px`);
      card.style.transform=`translate(-50%,-50%) translate3d(${x.toFixed(3)}px,${y.toFixed(3)}px,0) rotate(${(-offset*1.1).toFixed(3)}deg) scale(${scale.toFixed(5)})`;
      card.style.setProperty('--card-transform',card.style.transform);
      const orbitVisible=String(visibility>.08);
      if(card.dataset.orbitVisible!==orbitVisible){card.dataset.orbitVisible=orbitVisible;visibilityChanged=true;}
      card.style.setProperty('opacity',String(visibility),'important');
      card.style.pointerEvents=visibility?'auto':'none';
      card.style.zIndex=String(Math.round(100-depth*10));
      card.style.setProperty('--reel-blur','0px');
      card.style.setProperty('--reel-saturation','1');
      card.style.setProperty('--reel-brightness','1');
      card.tabIndex=visibility?0:-1;
    });
    highlight(nearest);
    if(visibilityChanged)syncPlayback();
  }
  function frame(now) {
    const dt=Math.min(64,Math.max(0,now-last));last=now;
    const before=phase;
    const motion = !visible?'offscreen':document.hidden?'hidden':hover?'hover':focused?'focus':pointerActive?'drag':player?.open?'player':reduced.matches?'reduced':'running';
    if(section.dataset.orbitMotion!==motion)section.dataset.orbitMotion=motion;
    if(stepAt){
      const t=reduced.matches?1:ease((now-stepAt)/650);
      phase=stepFrom+(stepTo-stepFrom)*t;
      if(t>=1)stepAt=0;
    }
    if(visible&&!document.hidden&&!hover&&!focused&&!pointerActive&&!player?.open&&!reduced.matches){
      carouselElapsed+=dt;
      if(carouselElapsed>=AUTOPLAY_MS)alignTo((selectedIndex+1)%cards.length);
      else updatePagination();
    }
    // Phase wraps continuously: there is no reset frame or positional jump.
    phase=((phase%1)+1)%1;
    if(phase!==before)render();
    raf=requestAnimationFrame(frame);
  }
  function initialize(data) {
    items=(data.items || []).filter(valid);
    renderSocial(data.profiles);
    if (!items.length) {empty.hidden=false;setState('empty');return;}
    makePagination();
    renderCards();
    // Refresh the existing scroll pin after async Reel data determines the final section height.
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    const cardObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { entry.target.dataset.inView = String(entry.isIntersecting && entry.intersectionRatio > .05); });
      syncPlayback();
    }, {threshold:[0,.05]});
    cards.forEach(card => cardObserver.observe(card));
    setState('spinning');
    const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;document.body.classList.toggle('reels-in-view',visible);last=performance.now();syncPlayback();},{threshold:0});observer.observe(section);
    document.addEventListener('visibilitychange',()=>{last=performance.now();syncPlayback();});
    orbit.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')hover=true;});
    orbit.addEventListener('pointerleave',()=>{hover=false;});
    orbit.addEventListener('focusin',()=>{focused=true;});
    orbit.addEventListener('focusout',()=>queueMicrotask(()=>{focused=orbit.contains(document.activeElement);if(!focused)manualPreview=false;syncPlayback();}));
    orbit.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;
      pointerActive=true;stepAt=0;pointerX=pointerStart=event.clientX;
    });
    orbit.addEventListener('pointermove',event=>{
      if(!pointerActive)return;
      if(!dragging&&Math.abs(event.clientX-pointerStart)>8){dragging=true;stepAt=0;orbit.setPointerCapture(event.pointerId);}
      if(!dragging)return;
      phase+=(event.clientX-pointerX)/geometry.length;
      pointerX=event.clientX;render();
    });
    const finish=()=>{if(dragging){suppressClickUntil=performance.now()+400;alignTo(featuredIndex);}dragging=false;pointerActive=false;};
    orbit.addEventListener('pointerup',finish);orbit.addEventListener('pointercancel',finish);orbit.addEventListener('lostpointercapture',finish);
    orbit.addEventListener('keydown',event=>{
      if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
      event.preventDefault();
      const index=(featuredIndex+(event.key==='ArrowRight'?1:-1)+cards.length)%cards.length;
      cards[index].focus({preventScroll:true});alignTo(index);
    });
    addEventListener('resize',measure);
    window.visualViewport?.addEventListener('resize',measure);
    reduced.addEventListener('change',()=>{manualPreview=false;if(reduced.matches&&stepAt){phase=stepTo;stepAt=0;}render();syncPlayback();});
    last=performance.now();raf=requestAnimationFrame(frame);
  }
  fetch('./data/reels.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Reel manifest unavailable');return r.json();}).then(initialize).catch(()=>initialize({profiles:{instagram:'https://www.instagram.com/favehotels/reels/'},items:[]}));
})();
