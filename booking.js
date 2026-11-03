/* Booking stays available from the navbar without occupying the hero. */
(() => {
  const form = document.getElementById('booking-form');
  const nav = document.getElementById('site-nav');
  const hero = document.querySelector('.hero-orbit-stage');
  const heroBooking = hero.querySelector('.hero-booking');
  const sheet = document.getElementById('booking-sheet');
  const sheetPopup = document.getElementById('booking-popover');
  const heroPopup = document.getElementById('hero-booking-popover');
  let popup = sheetPopup, popupMode = 'sheet';
  const results = document.getElementById('booking-results');
  const fields = [...form.querySelectorAll('[data-field]')];
  const hotels = [
    { name: 'Harper Kuta Bali', city: 'Kuta, Bali', image: 'harper-room-01.jpg', url: 'https://harperhotels.com/' },
    { name: 'Harper Malioboro', city: 'Yogyakarta', image: 'hero-exterior.png', url: 'https://malioboro.harperhotels.com/' },
    { name: 'Harper Cawang', city: 'Jakarta', image: 'hotel-cawang.png', url: 'https://harperhotels.com/' },
    { name: 'Harper Pasteur', city: 'Bandung', image: 'hotel-pasteur.png', url: 'https://harperhotels.com/' },
    { name: 'Harper Perintis', city: 'Makassar', image: 'hotel-perintis.png', url: 'https://harperhotels.com/' },
    { name: 'Harper Cikarang', city: 'Bekasi', image: 'hero-dining.png', url: 'https://harperhotels.com/' },
    { name: 'Reserva Real Harper', city: 'Dominican Republic', image: 'hero-room.png', url: 'https://harperhotels.com/' },
  ];
  const singleMonth = matchMedia('(max-width: 800px)');
  const state = { destination: '', checkin: '', checkout: '', rooms: 1, adults: 2, children: 0, roomGuests: [{ adults: 2, children: 0 }] };
  let active = '', anchor = null, opener = null, month = new Date(), frame = 0;
  const iso = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const today = () => iso(new Date());
  const parse = value => new Date(`${value}T12:00:00`);
  const dayNumber = value => { const [year,month,day]=value.split('-').map(Number); return Date.UTC(year,month-1,day)/86400000; };
  const nextDay = value => { const date = parse(value); date.setDate(date.getDate()+1); return iso(date); };
  const pretty = value => value ? parse(value).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : 'Select date';
  function updateLabels() {
    document.getElementById('destination-value').textContent = state.destination || 'Where feels like home?';
    document.getElementById('checkin-value').textContent = pretty(state.checkin);
    document.getElementById('checkout-value').textContent = pretty(state.checkout);
    document.getElementById('guests-value').textContent = `${state.rooms} ${state.rooms===1?'room':'rooms'} · ${state.adults+state.children} guests`;
    document.getElementById('hero-destination-value').textContent = state.destination || 'Choose a hotel or city';
    document.getElementById('hero-checkin-value').textContent = pretty(state.checkin);
    document.getElementById('hero-checkout-value').textContent = pretty(state.checkout);
    document.getElementById('hero-guests-value').textContent = `${state.adults+state.children} guests · ${state.rooms} ${state.rooms===1?'room':'rooms'}`;
  }
  function closeField(focus = false) {
    popup.hidden = true;
    fields.forEach(button => button.setAttribute('aria-expanded','false'));
    heroBooking.querySelectorAll('[data-hero-field]').forEach(button => button.setAttribute('aria-expanded','false'));
    if (focus) anchor?.focus({preventScroll:true});
    active = ''; anchor = null;
    if (popupMode === 'sheet' && sheet.open) sheet.close();
  }
  function positionPopup() {
    if (popupMode !== 'hero' || popup.hidden || !anchor) return;
    const formBounds = heroBooking.getBoundingClientRect();
    const anchorBounds = anchor.getBoundingClientRect();
    const viewportInset = matchMedia('(max-width:700px)').matches ? 10 : 18;
    const preferred = active === 'destination' ? 408 : active === 'guests' ? 408 : 760;
    const width = Math.min(preferred, innerWidth - viewportInset * 2, formBounds.width);
    let left = anchorBounds.left - formBounds.left;
    if (active === 'guests') left = anchorBounds.right - formBounds.left - width;
    if (active === 'checkin' || active === 'checkout') left = (formBounds.width - width) / 2;
    left = Math.max(0, Math.min(formBounds.width - width, left));
    popup.style.setProperty('--hero-popover-left', `${left}px`);
    popup.style.setProperty('--hero-popover-width', `${width}px`);
  }
  function placeForm() {
    frame = 0;
    const scrolled = window.scrollY > 8;
    nav.classList.toggle('is-compact', scrolled);
    const navBounds = nav.getBoundingClientRect(), navStyle = getComputedStyle(nav);
    const height = navBounds.height;
    document.documentElement.style.setProperty('--booking-inset-start',`${navBounds.left + parseFloat(navStyle.paddingLeft)}px`);
    document.documentElement.style.setProperty('--booking-inset-end',`${innerWidth - navBounds.right + parseFloat(navStyle.paddingRight)}px`);
    nav.classList.toggle('is-over-hero', !scrolled && Boolean(hero && hero.getBoundingClientRect().bottom > height));
    document.documentElement.style.setProperty('--top-nav-height',`${height}px`);
    heroBooking.style.setProperty('--mobile-booking-top',`${heroBooking.offsetTop}px`);
    updateSheetTitle();
    const wasHidden = heroBooking.classList.contains('is-hidden');
    const hideBooking = scrolled && !matchMedia('(max-width: 700px)').matches;
    heroBooking.classList.toggle('is-hidden', hideBooking);
    heroBooking.toggleAttribute('inert', hideBooking);
    heroBooking.setAttribute('aria-hidden', String(hideBooking));
    document.documentElement.style.setProperty('--booking-offset','0px');
    positionPopup();
    if (wasHidden !== hideBooking) window.dispatchEvent(new Event('harper:booking-position'));
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(placeForm); }
  function openBooking(event, field = 'destination') {
    event?.preventDefault?.(); opener = event?.currentTarget || document.activeElement;
    if (opener?.closest('.pill-nav__panel')) opener=nav.querySelector('.pill-nav__toggle')||opener;
    if (popupMode === 'hero' && !heroPopup.hidden) closeField();
    popup = sheetPopup; popupMode = 'sheet';
    if (!sheet.open) sheet.showModal();
    openField(field);
  }
  function openHeroField(event, field) {
    event?.preventDefault?.();
    opener = event?.currentTarget || document.activeElement;
    const nextAnchor = heroBooking.querySelector(`[data-hero-field="${field}"]`);
    if (popupMode === 'hero' && active === field && !heroPopup.hidden) return closeField(true);
    if (sheet.open) sheet.close();
    sheetPopup.hidden = true;
    popup = heroPopup; popupMode = 'hero'; anchor = nextAnchor;
    openField(field, nextAnchor);
  }
  function updateSheetTitle() {
    const titles={destination:'Choose your destination',checkin:'Select your dates',checkout:'Select your dates',guests:'Rooms & guests'};
    document.getElementById('booking-title').textContent=matchMedia('(max-width:700px)').matches?(titles[active]||'Find your Harper stay'):'Find your Harper stay';
  }
  function openField(name, requestedAnchor = null) {
    active = name; updateSheetTitle();
    anchor = requestedAnchor || (popupMode === 'hero'
      ? heroBooking.querySelector(`[data-hero-field="${name}"]`)
      : fields.find(button => button.dataset.field === name));
    fields.forEach(button => button.setAttribute('aria-expanded',String(popupMode==='sheet' && button===anchor)));
    heroBooking.querySelectorAll('[data-hero-field]').forEach(button => button.setAttribute('aria-expanded',String(popupMode==='hero' && button===anchor)));
    popup.classList.toggle('is-calendar',name==='checkin'||name==='checkout');
    popup.classList.toggle('is-destination',name==='destination');
    popup.hidden = false; popup.setAttribute('aria-label',anchor.querySelector('small,span')?.textContent || name);
    if (name==='destination') renderDestination();
    else if (name==='guests') renderGuests();
    else { month = parse(state[name] || (name==='checkout' && state.checkin ? nextDay(state.checkin) : today())); month.setDate(1); renderCalendar(); }
    positionPopup();
    (popup.querySelector('[data-date][aria-pressed=true]:not(:disabled)') || popup.querySelector('[data-date]:not(:disabled)') || popup.querySelector('input,button:not(:disabled)'))?.focus({preventScroll:true});
    if (popupMode === 'sheet') popup.scrollIntoView({block:'nearest',behavior:'instant'});
  }
  function renderDestination() {
    popup.innerHTML = '<div class="destination-search-header"><h3>Where would you like to stay?</h3><label for="destination-search">Find a hotel or city</label><input id="destination-search" type="search" autocomplete="off" placeholder="Try Jakarta or Harper Malioboro"></div><div class="destination-options" aria-label="Hotels and cities"></div>';
    const input = popup.querySelector('input'), list = popup.querySelector('.destination-options');
    const choices = [...new Set(hotels.map(hotel=>hotel.city)),...hotels.map(hotel=>hotel.name)];
    const draw = () => {
      list.replaceChildren(); list.scrollTop=0;
      const matches = choices.filter(value=>value.toLowerCase().includes(input.value.toLowerCase().trim()));
      for (const value of matches) {
        const button = document.createElement('button'); button.type='button'; button.textContent=value;
        button.addEventListener('click',()=>{ state.destination=value; updateLabels(); closeField(true); }); list.append(button);
      }
      if (!matches.length) list.textContent='No matching destination. Try a different hotel or city.';
      positionPopup();
    };
    input.addEventListener('input',draw); input.addEventListener('keydown',event=>{ if(event.key==='ArrowDown'){event.preventDefault();list.querySelector('button')?.focus();} }); draw();
  }
  function renderCalendar() {
    const minimum = active==='checkout' && state.checkin ? nextDay(state.checkin) : today();
    const monthCount = popupMode === 'hero' ? 2 : (singleMonth.matches ? 1 : 2);
    const dateTitle = value => value ? parse(value).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : 'DD MM YYYY';
    popup.innerHTML = '<div class="calendar-summary"><strong></strong><span></span></div><div class="calendar-months"></div><div class="calendar-footer"><span class="calendar-range-hint"></span><button type="button" class="calendar-apply">Apply dates</button></div>';
    const months = popup.querySelector('.calendar-months');
    for (let index=0; index<monthCount; index++) {
      const current = new Date(month.getFullYear(),month.getMonth()+index,1);
      const panel = document.createElement('section');panel.className='calendar-month';
      panel.setAttribute('aria-label',current.toLocaleDateString('en-GB',{month:'long',year:'numeric'}));
      const header = document.createElement('div');header.className='calendar-header';
      const heading = document.createElement('h3');heading.textContent=panel.getAttribute('aria-label');header.append(heading);
      for (const direction of [-1,1]) {
        if ((direction===-1 && index!==0) || (direction===1 && index!==monthCount-1)) continue;
        const button=document.createElement('button');button.type='button';button.dataset.month=String(direction);
        button.setAttribute('aria-label',direction<0?'Previous month':'Next month');
        button.innerHTML=`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${direction<0?'m15 5-7 7 7 7':'m9 5 7 7-7 7'}"/></svg>`;
        const target=new Date(month.getFullYear(),month.getMonth()+direction,1);
        button.disabled=direction<0 && iso(new Date(target.getFullYear(),target.getMonth()+1,0))<minimum;
        button.addEventListener('click',()=>{month=target;renderCalendar();popup.querySelector(`[data-month="${direction}"]`)?.focus({preventScroll:true});});
        header.append(button);
      }
      panel.append(header);
      const grid=document.createElement('div');grid.className='calendar-grid';
      ['SU','MO','TU','WE','TH','FR','SA'].forEach(day=>{const label=document.createElement('span');label.textContent=day;label.setAttribute('aria-hidden','true');grid.append(label);});
      const first=new Date(current.getFullYear(),current.getMonth(),1-current.getDay());
      const cells=Math.ceil((current.getDay()+new Date(current.getFullYear(),current.getMonth()+1,0).getDate())/7)*7;
      for(let cell=0;cell<cells;cell++) {
        const date=new Date(first.getFullYear(),first.getMonth(),first.getDate()+cell), value=iso(date);
        const button=document.createElement('button');button.type='button';button.dataset.date=value;
        button.classList.toggle('is-outside',date.getMonth()!==current.getMonth());
        button.classList.toggle('is-sunday',date.getDay()===0);
        button.classList.toggle('is-today',value===today());
        button.classList.toggle('is-range-edge',value===state.checkin||value===state.checkout);
        button.classList.toggle('is-between',Boolean(state.checkin&&state.checkout&&value>state.checkin&&value<state.checkout));
        button.disabled=value<minimum;button.tabIndex=-1;
        button.setAttribute('aria-label',date.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}));
        button.setAttribute('aria-pressed',String(value===state.checkin||value===state.checkout));
        if(value===today())button.setAttribute('aria-current','date');
        button.innerHTML=`<span>${date.getDate()}</span>${value===today()?'<small>TODAY</small>':''}`;
        button.addEventListener('click',()=>{
          const chosen=active;state[chosen]=value;
          if(chosen==='checkin'&&state.checkout<=value)state.checkout='';
          updateLabels();
          if(chosen==='checkin')openField('checkout');
          else {renderCalendar();popup.querySelector(`[data-date="${value}"]:not(.is-outside)`)?.focus({preventScroll:true});}
        });
        const preview=()=>{if(active==='checkout'&&state.checkin&&!button.disabled)paintRange(value);};
        button.addEventListener('mouseenter',preview);
        button.addEventListener('focus',preview);
        grid.append(button);
      }
      grid.addEventListener('focusin',event=>{if(event.target.dataset.date)popup.querySelectorAll('[data-date]').forEach(button=>{button.tabIndex=button===event.target?0:-1;});});
      grid.addEventListener('keydown',event=>{
        if(!event.target.dataset.date)return;
        const deltas={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};
        const date=parse(event.target.dataset.date);
        if(event.key in deltas)date.setDate(date.getDate()+deltas[event.key]);
        else if(event.key==='Home')date.setDate(date.getDate()-date.getDay());
        else if(event.key==='End')date.setDate(date.getDate()+6-date.getDay());
        else if(event.key==='PageUp'||event.key==='PageDown'){
          const day=date.getDate();date.setDate(1);date.setMonth(date.getMonth()+(event.key==='PageDown'?1:-1));date.setDate(Math.min(day,new Date(date.getFullYear(),date.getMonth()+1,0).getDate()));
        } else return;
        event.preventDefault();const value=iso(date);if(value<minimum)return;
        const find=()=>popup.querySelector(`[data-date="${value}"]:not(.is-outside):not(:disabled)`)||popup.querySelector(`[data-date="${value}"]:not(:disabled)`);
        if(!find()){month=new Date(date.getFullYear(),date.getMonth(),1);renderCalendar();}
        find()?.focus({preventScroll:true});
      });
      panel.append(grid);months.append(panel);
    }
    function paintRange(previewEnd='') {
      const end=previewEnd||state.checkout;
      popup.querySelectorAll('[data-date]').forEach(button=>{
        const value=button.dataset.date;
        button.classList.toggle('is-range-start',value===state.checkin);
        button.classList.toggle('is-range-end',Boolean(end&&value===end));
        button.classList.toggle('is-range-edge',value===state.checkin||Boolean(end&&value===end));
        button.classList.toggle('is-between',Boolean(state.checkin&&end&&value>state.checkin&&value<end));
        button.classList.toggle('is-range-preview',Boolean(previewEnd&&previewEnd!==state.checkout&&value>state.checkin&&value<=end));
      });
      const count=state.checkin&&end?dayNumber(end)-dayNumber(state.checkin):0;
      popup.querySelector('.calendar-summary strong').textContent=matchMedia('(max-width:700px)').matches
        ? (state.checkin?`${dateTitle(state.checkin)} – ${end?dateTitle(end):'Select check-out'}`:'Select check-in and check-out')
        : `${dateTitle(state.checkin)} – ${dateTitle(end)}`;
      popup.querySelector('.calendar-summary span').textContent=count>0?`${count} ${count===1?'night':'nights'}`:'1 night minimum';
    }
    paintRange();
    months.addEventListener('mouseleave',()=>paintRange());
    popup.querySelector('.calendar-range-hint').textContent=active==='checkin'?'Select your check-in date':state.checkout?'Your stay is highlighted above':'Select your check-out date';
    const apply=popup.querySelector('.calendar-apply');
    apply.disabled=!(state.checkin&&state.checkout&&state.checkout>state.checkin);
    apply.addEventListener('click',()=>closeField(true));
    const firstTab=popup.querySelector(`[data-date="${state[active]||minimum}"]:not(.is-outside):not(:disabled)`)||popup.querySelector('[data-date]:not(:disabled)');
    if(firstTab)firstTab.tabIndex=0;
  }
  singleMonth.addEventListener('change',()=>{
    if(popup.hidden || !['checkin','checkout'].includes(active))return;
    const value=popup.contains(document.activeElement)?document.activeElement.dataset.date:null;
    if(value)month=new Date(parse(value).getFullYear(),parse(value).getMonth(),1);
    renderCalendar();if(value)popup.querySelector(`[data-date="${value}"]:not(.is-outside):not(:disabled)`)?.focus({preventScroll:true});
  });
  function renderGuests() {
    popup.innerHTML='<div class="guest-rooms-total"><strong>Room(s)</strong></div><div class="guest-room-list"></div>';
    const syncGuests=()=>{
      state.rooms=state.roomGuests.length;
      state.adults=state.roomGuests.reduce((total,room)=>total+room.adults,0);
      state.children=state.roomGuests.reduce((total,room)=>total+room.children,0);
      updateLabels();
    };
    const stepper=(label,value,min,max,change)=>{
      const control=document.createElement('div');control.className='guest-stepper';
      control.innerHTML=`<output aria-live="polite" aria-label="${label}">${value}</output><button type="button" aria-label="Fewer ${label}">−</button><button type="button" aria-label="More ${label}">+</button>`;
      const buttons=control.querySelectorAll('button');
      buttons[0].disabled=value<=min;buttons[1].disabled=value>=max;
      buttons.forEach((button,index)=>button.addEventListener('click',()=>change(value+(index?1:-1),button.getAttribute('aria-label'))));
      return control;
    };
    const rebuild=focusLabel=>{
      const scrollPosition=popup.scrollTop;
      renderGuests();
      popup.scrollTop=scrollPosition;
      if(focusLabel){
        const buttons=[...popup.querySelectorAll('button')];
        (buttons.find(button=>button.getAttribute('aria-label')===focusLabel&&!button.disabled)||buttons.find(button=>!button.disabled))?.focus({preventScroll:true});
      }
    };
    popup.querySelector('.guest-rooms-total').append(stepper('rooms',state.rooms,1,8,(value,label)=>{
      while(state.roomGuests.length<value)state.roomGuests.push({adults:2,children:0});
      state.roomGuests.length=value;syncGuests();rebuild(label);
    }));
    const list=popup.querySelector('.guest-room-list');
    state.roomGuests.forEach((room,index)=>{
      const card=document.createElement('section');card.className='guest-room';card.setAttribute('aria-label',`Room ${index+1}`);
      const title=document.createElement('h3');title.textContent=`Room(s) ${index+1}`;card.append(title);
      const counters=document.createElement('div');counters.className='guest-room-counters';
      [['adults','Adult(s)',1,16],['children','Child(ren)',0,8]].forEach(([key,title,min,max])=>{
        const row=document.createElement('div');row.className='guest-room-counter';
        const text=document.createElement('span');text.textContent=title;row.append(text);
        row.append(stepper(`${key} in room ${index+1}`,room[key],min,max,(value,label)=>{room[key]=value;syncGuests();rebuild(label);}));
        counters.append(row);
      });
      card.append(counters);list.append(card);
    });
  }
  fields.forEach(button=>button.addEventListener('click',()=>active===button.dataset.field?closeField(true):openField(button.dataset.field)));
  let sidebarScrollFrame=0;
  function showDestinationFromSidebar() {
    cancelAnimationFrame(sidebarScrollFrame);
    const start=scrollY;
    const target=Math.max(0,heroBooking.getBoundingClientRect().top+scrollY-nav.getBoundingClientRect().height-16);
    const began=performance.now(), duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:280;
    const animate=now=>{
      const progress=duration?Math.min(1,(now-began)/duration):1;
      const ease=progress*progress*(3-2*progress);
      scrollTo({top:start+(target-start)*ease,behavior:'instant'});
      if(progress<1)sidebarScrollFrame=requestAnimationFrame(animate);
      else {sidebarScrollFrame=0;openBooking({currentTarget:heroBooking.querySelector('[data-hero-field=destination]')},'destination');}
    };
    sidebarScrollFrame=requestAnimationFrame(animate);
  }
  addEventListener('harper:book-from-sidebar',showDestinationFromSidebar);
  const floatingBook=document.getElementById('mobile-book-now');
  floatingBook.addEventListener('click',showDestinationFromSidebar);
  // Keep the sticky action between the hero and footer, then restore it on scroll-up.
  const footer=document.getElementById('footer');
  let heroBookingVisible=true, footerVisible=false;
  const syncFloatingBook=()=>{floatingBook.hidden=heroBookingVisible||footerVisible;};
  new IntersectionObserver(entries=>{heroBookingVisible=entries[0].isIntersecting;syncFloatingBook();},{threshold:0}).observe(heroBooking);
  if(footer)new IntersectionObserver(entries=>{footerVisible=entries[0].isIntersecting;syncFloatingBook();},{threshold:0}).observe(footer);
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-booking-open]');
    if(!button)return;
    if (button.classList.contains('nav-book') && matchMedia('(max-width: 700px)').matches) {
      event.preventDefault();
      showDestinationFromSidebar();
      return;
    }
    openBooking({preventDefault:()=>event.preventDefault(),currentTarget:button});
  });
  document.querySelectorAll('[data-hero-field]').forEach(button=>button.addEventListener('click',event=>openHeroField(event,button.dataset.heroField)));
  document.getElementById('hero-booking-submit').addEventListener('click',event=>{
    opener=event.currentTarget;
    form.requestSubmit();
  });
  // Dismiss the whole dialog, never an empty booking shell. Counters save immediately.
  document.addEventListener('pointerdown',event=>{
    if (popupMode === 'hero' && !heroPopup.hidden && !heroBooking.contains(event.target)) {
      closeField();
      return;
    }
    if(!sheet.open)return;
    if(popup.contains(event.target)||fields.some(button=>button.contains(event.target))||event.target.closest('.booking-close,.booking-search'))return;
    if(sheet.contains(event.target)&&event.target!==sheet)sheet.close();
  });
  // Require both ends of a gesture on the backdrop, so dragging a date never dismisses it.
  [sheet,results].forEach(dialog=>{
    let backdropDown=false;
    dialog.addEventListener('pointerdown',event=>{const r=dialog.getBoundingClientRect();backdropDown=event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;});
    dialog.addEventListener('click',event=>{if(!backdropDown)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();backdropDown=false;});
  });
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if(popupMode==='hero' && !heroPopup.hidden){event.preventDefault();event.stopPropagation();closeField(true);return;}
    if(sheet.open){event.preventDefault();event.stopPropagation();sheet.close();}
  },true);
  sheet.addEventListener('close',()=>{
    if (popupMode === 'sheet') closeField();
    opener?.focus({preventScroll:true});
  });
  form.querySelector('.booking-close').addEventListener('click',()=>sheet.close());
  results.querySelector('.booking-close').addEventListener('click',()=>results.close());
  form.addEventListener('submit',event=>{
    event.preventDefault();const error=document.getElementById('booking-error');let message='',field='';
    if(!state.destination){message='Choose a hotel or city.';field='destination';}
    else if(!state.checkin || state.checkin<today()){message='Choose a check-in date today or later.';field='checkin';}
    else if(!state.checkout || state.checkout<=state.checkin){message='Check-out must be after check-in.';field='checkout';}
    else if(state.adults<state.rooms){message='Please include at least one adult per room.';field='guests';}
    error.textContent=message;
    if(message){
      if(opener?.closest('.hero-booking')) openHeroField({currentTarget:heroBooking.querySelector(`[data-hero-field="${field}"]`),preventDefault(){}},field);
      else openField(field);
      return;
    }
    closeField();if(sheet.open)sheet.close();
    const matching=hotels.filter(hotel=>hotel.city===state.destination || hotel.name===state.destination);
    document.getElementById('booking-summary').textContent=`${state.destination} · ${pretty(state.checkin)} – ${pretty(state.checkout)} · ${state.rooms} room(s), ${state.adults} adult(s), ${state.children} child(ren)`;
    const list=document.getElementById('booking-matches');list.replaceChildren();
    matching.forEach(hotel=>{const article=document.createElement('article');article.className='booking-match';article.innerHTML=`<img src="./assets/${hotel.image}" alt="${hotel.name}"><div><h3>${hotel.name}</h3><p>${hotel.city}</p><a href="${hotel.url}" target="_blank" rel="noopener noreferrer">Continue to official booking</a></div>`;list.append(article);});
    results.showModal();
  });
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
  new ResizeObserver(schedule).observe(nav);new ResizeObserver(schedule).observe(form);new ResizeObserver(schedule).observe(heroBooking);
  updateLabels();document.fonts?.ready.then(schedule);schedule();
})();
