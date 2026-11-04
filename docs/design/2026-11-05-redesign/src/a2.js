/* ===== A · Clarity — part 2: detail screens and sheets ===== */
const sheetHead = (t, right = '') => `<div class="sheet-head"><h2>${t}</h2>${right || `<button class="ib" data-close aria-label="Close">${I('x')}</button>`}</div>`;
const heroBar = (extra = '') => `<div class="hb"><button class="ib float" data-back aria-label="Back">${I('back')}</button><span style="flex:1"></span>${extra}<button class="ib float nodrag" data-toast="Link copied" aria-label="Share">${I('share')}</button><button class="ib float nodrag" data-sheet="more" aria-label="More">${I('more')}</button></div>`;
const dl = (rows) => { const r = rows.filter((x) => x[1]); return r.length ? `<dl class="dl rv">${r.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''; };

/* ---------- Explore details ---------- */
screen('post-detail', { group: 'Explore', title: 'Neighbour post', render: (p) => { const x = D.posts.find((o) => o.id === p.id) || D.posts[0];
  return page('Post', `<div class="pad"><div class="qh rv" style="display:flex;gap:10px;align-items:center">${PERSON(x.by, x.hue, 42)}<div><b>${x.by}</b><div class="muted small">${x.time} ago · Echo Park</div></div><button class="btn sm sec" style="margin-left:auto" data-act="follow">Follow</button></div>
  <h2 class="rv" style="font-size:22px;margin:16px 0 8px;letter-spacing:-.02em">${x.title}</h2><p class="rv muted" style="margin:0 0 12px;line-height:1.55">${x.body}</p>${x.img ? photo(x.img, 'rv', 800, 500, 'style="height:200px;border-radius:16px;margin-bottom:10px"') : ''}
  <div class="acts rv" style="margin:0 -10px 10px"><button data-like>${I('heart', 20)}<b>${x.likes}</b></button><button>${I('msg', 20)}${x.comments}</button><button data-save style="margin-left:auto">${I('bookmark', 20)}</button></div></div>
  ${h2('Comments')}<div class="mrow rv">${PERSON('Liam Chen', 200, 36)}<div class="tx"><b>Liam Chen</b> <span class="muted small">5d</span><div>Thanks, the 10 bus detours too.</div></div></div>`,
  { noLt: true, barTitle: 'Post', solid: true, stick: `<div class="stick">${PERSON(D.me.name, 210, 32)}<div class="input" style="flex:1;min-height:42px"><input placeholder="Add a comment"></div><button class="ib" data-act="send" style="color:var(--accent)">${I('send')}</button></div>` }); } });
const E = (id) => D.events.find((e) => e.id === id) || D.events[0];
screen('event-detail', { group: 'Explore', title: 'Event', render: (p) => { const e = E(p.id);
  return `<div class="scroller" data-collapse-host><div class="hero">${photo(e.img, '', 900, 700, 'data-hero')}${heroBar(`<button class="ib float nodrag" data-save aria-label="Save">${I('bookmark')}</button>`)}</div>
  <div class="sheetlike"><div class="pad"><span class="tag rv">${e.cat}</span><h1 class="rv" style="font-size:26px;margin:10px 0 6px;letter-spacing:-.02em;line-height:1.15">${e.title}</h1><div class="muted rv">Hosted by <b style="color:var(--text)">${e.host}</b></div></div><div style="height:14px"></div>
  ${dl([['When', `${e.day} ${e.date} · ${e.time}`], ['Where', e.venue], ['Entry', e.price], ['Spots', e.cap ? `${e.cap - e.going} of ${e.cap} left` : '']])}
  <div class="map rv"><i class="pulse"></i><span class="mp">${I('pin')}</span></div>
  ${h2('About')}<p class="para rv">Meet other people new to LA, watch the sun go down over the city and leave with a few new numbers in your phone. Drinks at the bar; the first one is on us.</p>
  ${h2(`${e.going} going`)}<div class="pad rv" style="display:flex">${D.mates.map((m, i) => `<span style="margin-left:${i ? -10 : 0}px">${PERSON(m.name, m.hue, 36, '')}</span>`).join('')}<span class="muted small" style="align-self:center;margin-left:10px">Liam, Sofia and ${e.going - 2} more</span></div>
  <div class="pad rv" style="margin-top:16px;display:flex;gap:8px"><button class="btn ghost sm" data-go="chat" data-p="${P({ id: 'ch2' })}">${I('msg', 18)} Event chat</button><button class="btn ghost sm" data-go="check-in">${I('qr', 18)} Door check-in</button></div><div style="height:30px"></div></div></div>
  <div class="stick"><div><b style="font-size:17px">${e.price}</b><div class="small muted">${e.date} · ${e.time}</div></div><button class="btn pri" style="margin-left:auto;padding:0 28px" data-sheet="event-register" data-p="${P({ id: e.id })}">RSVP</button></div>`; } });
screen('event-register', { group: 'Explore', title: 'RSVP sheet', kind: 'sheet', render: (p) => { const e = E(p.id);
  return `${sheetHead('RSVP')}<div class="sb"><div class="row" style="padding:0 0 14px">${photo(e.img, '', 200, 200, 'style="width:56px;height:56px;border-radius:12px"')}<div class="tx"><b>${e.title}</b><div class="small muted">${e.day} ${e.date} · ${e.time}</div></div></div>
  ${stepper('Tickets', 1, 1)}<div style="height:14px"></div><div class="prefill">${I('check')}<div><b>${D.me.name}</b> · jordan@example.com<div class="small muted">From your profile</div></div></div>
  <div style="height:18px"></div><button class="btn pri block" data-act="rsvp" data-p="${P({ id: e.id })}">Confirm · ${e.price}</button></div>`; } });
screen('event-ticket', { group: 'Explore', title: 'Your ticket', render: (p) => { const e = E(p.id);
  return page('Your ticket', `<div class="ticket"><div style="padding:18px 20px"><span class="tag ok">${I('check', 13)} Confirmed</span><h2 style="margin:10px 0 4px;font-size:21px">${e.title}</h2><div class="muted">${e.day} ${e.date} · ${e.time}<br>${e.venue}</div><div class="meta" style="margin-top:12px"><span>${D.me.name}</span><span>· 1 ticket</span></div></div>
  <div class="tq"><div class="qr"></div><div class="small muted" style="margin-top:12px">Show this at the door</div></div></div>
  <div class="pad" style="display:grid;gap:8px;margin-top:10px"><button class="btn ghost block" data-toast="Added to your calendar">${I('cal', 19)} Add to calendar</button><button class="btn ghost block" data-go="chat" data-p="${P({ id: 'ch2' })}">${I('msg', 19)} Open the event chat</button></div>`, { noLt: true, solid: true }); },
  mount: (el) => anim($('.ticket', el), [{ transform: 'perspective(800px) rotateX(-80deg)', opacity: 0 }, { transform: 'perspective(800px) rotateX(0)', opacity: 1 }], 700, EASE_SHEET) });
screen('check-in', { group: 'Explore', title: 'Door check-in (host)', render: () => page('Door check-in', `<div class="scanbox rv"><i></i></div>
  <div class="stats rv"><div><b class="ci">18</b><small>Checked in</small></div><div><b>42</b><small>Registered</small></div><div><b class="cr">24</b><small>Remaining</small></div></div>
  <div class="pad rv"><button class="btn pri block" data-act="scan">${I('qr', 19)} Simulate a scan</button></div>${h2('Checked in')}<div class="cil">${D.mates.slice(0, 3).map((m) => `<div class="mrow rv">${PERSON(m.name, m.hue, 40)}<div class="tx"><b>${m.name}</b><div class="small muted">1 ticket · 6:0${m.age % 10} PM</div></div><span class="tag ok">${I('check', 13)}</span></div>`).join('')}</div>`, { sub: 'Rooftop sunset social · Fri Nov 7' }) });
screen('story-viewer', { group: 'Explore', title: 'Story viewer', render: (p) => `<div class="story" data-i="${p.i || 0}"></div>`, mount: (el, p) => storyPlay(el, p.i || 0) });
function storyPlay(el, i) {
  const box = $('.story', el), s = D.stories[i];
  if (!s) return back();
  box.innerHTML = `${photo(s.img, '', 600, 1000)}<div class="sbars">${D.stories.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'run' : ''}"><b></b></i>`).join('')}</div>
    <div class="who">${PERSON(s.by, s.hue, 34)}<span>${s.by}<br><small style="opacity:.7;font-weight:500">2h · ${s.cat}</small></span><button class="ib" style="margin-left:auto;color:#fff" data-back aria-label="Close">${I('x')}</button></div>
    <div class="tz" style="left:0" data-act="sprev"></div><div class="tz" style="right:0" data-act="snext"></div><div class="cap">${s.title}</div>`;
  anim($('.ph', box), [{ opacity: 0, transform: 'scale(1.04)' }, { opacity: 1, transform: 'none' }], 380);
  clearTimeout(box._t); box._t = setTimeout(() => document.body.contains(box) && storyPlay(el, i + 1), 5000);
  box.dataset.i = i;
}

/* ---------- Listings details ---------- */
screen('listing-detail', { group: 'Listings', title: 'Listing detail', render: (p) => { const l = L(p.id);
  return `<div class="scroller" data-collapse-host><div class="hero" data-go="gallery" data-p="${P({ id: l.id })}">${photo(l.img, '', 900, 700, 'data-hero')}${heroBar(`<button class="ib float nodrag" data-save aria-label="Save">${I('bookmark')}</button>`)}<span class="tag dark cnt">1 / ${l.n}</span></div>
  <div class="sheetlike"><div class="pad"><div class="rv" style="display:flex;gap:6px;margin-bottom:8px"><span class="tag">${l.type}</span>${l.avail === 'Now' ? '<span class="tag ok">Available now</span>' : `<span class="tag ok">From ${l.avail}</span>`}</div>
  <h1 class="rv" style="font-size:24px;margin:0 0 4px;letter-spacing:-.02em;line-height:1.2">${l.title}</h1><div class="meta rv"><span>${I('pin')}${l.addr}, ${l.area}</span></div></div><div style="height:16px"></div>
  <div class="facts rv">${[[l.beds, 'Beds'], [l.baths, 'Baths'], [l.sqft, 'Sq ft']].filter((f) => f[0]).map(([v, k]) => `<div><b>${v}</b><small>${k}</small></div>`).join('')}</div>
  ${h2('About this place')}<p class="para rv">Light-filled ${l.type.toLowerCase()} on a quiet stretch, a short walk to cafés, groceries and the bus. Utilities are separate; the owner lives nearby and answers quickly.</p>
  ${l.amen.length ? h2('What it has') + `<div class="pad cflow rv">${l.amen.map((a) => `<span class="chip">${I('check', 15)}${a}</span>`).join('')}</div><div style="height:6px"></div>` : ''}
  ${h2('Details')}${dl([['Lease', l.lease], ['Furnished', l.furnished ? 'Yes' : 'No'], ['Pets', l.pets], ['Available', l.avail === 'Now' ? 'Now' : l.avail]])}
  <div class="map rv"><i class="pulse"></i><span class="mp">${I('pin')}</span></div>
  ${h2('Listed by')}<div class="mrow rv">${PERSON(l.owner, 280, 48)}<div class="tx"><b>${l.owner}</b> ${l.verified ? `<span class="vf">${I('check')}</span>` : ''}<div class="small muted">Member since 2024 · replies in about an hour</div></div><button class="ib" data-go="public-profile">${I('right')}</button></div><div style="height:24px"></div></div></div>
  <div class="stick"><div><b class="price">${money(l.price)}</b><small class="muted"> /mo</small></div><button class="btn sec" style="margin-left:auto" data-go="chat" data-p="${P({ id: 'ch1' })}">Message</button><button class="btn pri" data-sheet="apply" data-p="${P({ id: l.id })}">Apply</button></div>`; } });
screen('gallery', { group: 'Listings', title: 'Photo gallery', render: (p) => { const l = L(p.id);
  return `<div style="position:absolute;inset:0;background:#000;color:#fff;display:flex;flex-direction:column"><div class="bar solid" style="background:transparent;border:0;color:#fff">${BACK.replace('class="ib"', 'class="ib" style="color:#fff"')}<div class="bt gcount">1 of ${l.n}</div></div>
  <div class="hs" data-hscroll style="flex:1;scroll-snap-type:x mandatory" data-act-scroll>${Array.from({ length: l.n }, (_, k) => `<div style="width:100%;display:grid;place-items:center">${photo(l.img + (k ? '-' + k : ''), '', 900, 700, 'style="width:390px;height:300px"')}</div>`).join('')}</div>
  <p style="text-align:center;opacity:.6;font-size:13px;padding-bottom:34px">Swipe for more · pinch to zoom</p></div>`; },
  mount: (el) => { const h = $('.hs', el); h.addEventListener('scroll', () => ($('.gcount', el).textContent = `${Math.round(h.scrollLeft / h.clientWidth) + 1} of ${h.children.length}`), { passive: true }); } });
screen('room-detail', { group: 'Listings', title: 'Room in a shared home', render: (p) => { const r = D.rooms.find((x) => x.id === p.id) || D.rooms[0];
  return `<div class="scroller" data-collapse-host><div class="hero">${photo(r.img, '', 900, 700, 'data-hero')}${heroBar()}</div><div class="sheetlike"><div class="pad"><span class="tag ok rv">${r.spots} of ${r.of} rooms free</span><h1 class="rv" style="font-size:24px;margin:10px 0 4px">${r.title}</h1><div class="meta rv"><span>${I('pin')}${r.area}</span><span>· ${r.avail === 'Now' ? 'Available now' : 'From ' + r.avail}</span></div></div>
  ${h2('Who lives there')}${D.mates.slice(0, r.mates).map((m) => `<div class="mrow rv">${PERSON(m.name, m.hue, 44)}<div class="tx"><b>${m.name}, ${m.age}</b><div class="small muted">${m.job} · ${m.sleep}</div></div></div>`).join('')}
  ${h2('House rules')}<div class="pad cflow rv">${r.rules.map((x) => `<span class="chip">${x}</span>`).join('')}</div><div style="height:30px"></div></div></div>
  <div class="stick"><div><b class="price">${money(r.price)}</b><small class="muted"> /mo</small></div><button class="btn pri" style="margin-left:auto" data-go="chat" data-p="${P({ id: 'ch3' })}">Message the house</button></div>`; } });
screen('roommate-detail', { group: 'Listings', title: 'Roommate profile', render: (p) => { const m = D.mates.find((x) => x.id === p.id) || D.mates[0];
  return page(m.name, `<div class="profhead">${PERSON(m.name, m.hue, 88)}<h1>${m.name}, ${m.age}</h1><div class="muted">${m.job} · looking in Los Angeles</div></div>
  <div class="card rv" style="margin:0 16px 16px;padding:16px;display:flex;gap:16px;align-items:center"><div class="ring" style="--p:0" data-to="${m.match}"><b>0%</b></div><div><b>Strong match</b><div class="small muted">You share ${m.common.length} things and a similar budget.</div></div></div>
  ${h2('What you have in common')}<div class="pad cflow rv">${m.common.map((c) => `<span class="chip on">${c}</span>`).join('')}</div>
  ${h2('Lifestyle')}<div class="pad cflow rv">${m.tags.map((c) => `<span class="chip">${c}</span>`).join('')}<span class="chip">${I('moon', 15)}${m.sleep}</span></div>
  ${h2('Looking for')}${dl([['Budget', m.budget + ' /mo'], ['Move-in', m.movein], ['Areas', 'Silver Lake, Echo Park']])}`,
  { noLt: true, solid: true, stick: `<div class="stick"><button class="btn ghost" data-go="chat" data-p="${P({ id: 'ch3' })}">Message</button><button class="btn pri" style="flex:1" data-act="connect">Connect</button></div>` }); },
  mount: (el) => { const r = $('.ring', el), to = +r.dataset.to; const t0 = performance.now(), d = RM() ? 1 : 900;
    const f = (t) => { const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3), v = Math.round(to * e); r.style.setProperty('--p', v); $('b', r).textContent = v + '%'; if (k < 1 && document.body.contains(r)) requestAnimationFrame(f); };
    setTimeout(() => requestAnimationFrame(f), 250); } });
screen('apply', { group: 'Listings', title: 'Apply for a home (sheet)', kind: 'sheet', full: true, render: (p) => { const l = L(p.id);
  return `${sheetHead('Apply')}<div class="progress"><i style="width:66%"></i></div><div class="sb" style="padding-top:14px"><div class="row" style="padding:0 0 12px">${photo(l.img, '', 200, 200, 'style="width:52px;height:52px;border-radius:12px"')}<div class="tx"><b class="ell" style="display:block">${l.title}</b><div class="small muted">${money(l.price)} /mo · ${l.area}</div></div></div>
  <div class="prefill" style="margin-bottom:14px">${I('check')}<div>Name, email, phone and city come from your profile.</div></div>
  ${field('Move-in date', inp('', 'Dec 1, 2026', 'cal'))}${field('Monthly income', `<div class="input"><span class="pre">$</span><input inputmode="numeric" placeholder="e.g. 5,200"></div>`, 'Only the owner sees this')}
  ${field('Job', inp('Job title and employer', 'Product designer, Figma', 'building'))}${stepper('People moving in', 1, 1)}<div style="height:14px"></div>
  ${field('A note to the owner (optional)', `<div class="input"><textarea placeholder="Say hi and when you could view it"></textarea></div>`)}
  <button class="btn pri block" data-act="submitapp">Send application</button><p class="small muted" style="text-align:center">You can withdraw it at any time.</p></div>`; } });
screen('agreement', { group: 'Listings', title: 'Offer and agreement', render: () => { const l = D.listings[0];
  return page('Your offer', `<div class="card rv" style="margin:0 16px 16px;padding:14px;display:flex;gap:12px;align-items:center">${photo(l.img, '', 200, 200, 'style="width:60px;height:60px;border-radius:12px"')}<div><b>${l.title}</b><div class="small muted">From ${l.owner} · offer valid 3 days</div></div></div>
  ${dl([['Rent', money(1234) + ' /mo'], ['Deposit', money(1234)], ['Start', 'Dec 2, 2026'], ['Length', '12 months'], ['Break clause', 'After 6 months']])}
  ${h2('Change a term')}<div class="pad rv cflow"><button class="chip" data-toggle>Start a week later</button><button class="chip" data-toggle>6-month lease</button><button class="chip" data-toggle>Ask about parking</button></div>
  ${h2('Sign')}<div class="pad rv"><canvas class="sign"></canvas><div class="hintx">${I('edit')} Sign with your finger · <button class="link" data-act="clearsig">Clear</button></div></div>
  <label class="pad rv" style="display:flex;gap:10px;align-items:center;margin-top:12px">${sw(false)} I have read the full agreement</label>`,
  { sub: 'Sunny 1-bed near Lincoln Blvd', stick: `<div class="stick"><button class="btn ghost" data-toast="We let the owner know">Decline</button><button class="btn pri" style="flex:1" data-act="sign">Sign and accept</button></div>` }); },
  mount: (el) => signPad($('canvas', el)) });
function signPad(c) {
  const ctx = c.getContext('2d'); let down = false;
  const fit = () => { c.width = c.offsetWidth * 2; c.height = c.offsetHeight * 2; ctx.scale(2, 2); ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.strokeStyle = getComputedStyle(c).color; };
  setTimeout(fit, 50);
  const pt = (e) => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  c.addEventListener('pointerdown', (e) => { down = true; c.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.moveTo(...pt(e)); e.stopPropagation(); });
  c.addEventListener('pointermove', (e) => { if (!down) return; ctx.lineTo(...pt(e)); ctx.stroke(); c.dataset.signed = 1; });
  c.addEventListener('pointerup', () => (down = false));
}
screen('my-listings', { group: 'Listings', title: 'My listings', render: () => page('My listings', `${seg([['live', 'Live · 2'], ['apps', 'Applications · 3'], ['off', 'Off market']])}
  <div data-segroot><div data-panel="live">${[D.listings[4], D.rooms[0]].map((l) => `<div class="row rv">${photo(l.img, '', 300, 260)}<div class="tx"><span class="tag ok">Live</span><h3 class="ell">${l.title}</h3><div class="meta small"><span>${money(l.price)} /mo</span><span>· 214 views</span><span>· 6 saves</span></div></div><button class="ib" data-sheet="listmenu">${I('more')}</button></div>`).join('')}</div></div>
  <div class="pad" style="margin-top:14px"><button class="btn sec block rv" data-go="landlord">${I('users', 19)} Review 3 applications</button></div>`, { right: ib('plus', 'data-go="compose-listing" aria-label="New listing"') }) });
screen('landlord', { group: 'Listings', title: 'Applications (landlord)', render: () => page('Applications', `<div class="apps">${D.mates.slice(0, 3).map((m, i) => `<div class="card qcard rv appc"><div class="qh">${PERSON(m.name, m.hue, 40)}<div><b>${m.name}</b><div class="small muted">for ${D.listings[4].title}</div></div><span class="tag" style="margin-left:auto">${i ? 'New' : 'Viewed'}</span></div>
  ${dl([['Move-in', m.movein], ['Income', '$' + (4 + i) + ',800 /mo'], ['Job', m.job]]).replace('class="dl rv"', 'class="dl" style="margin:12px 0;box-shadow:none;background:var(--surface2)"')}
  <div style="display:flex;gap:8px;margin-bottom:8px"><button class="btn ghost sm" style="flex:1" data-act="decide" data-v="no">Decline</button><button class="btn pri sm" style="flex:1" data-act="decide" data-v="yes">Approve</button></div></div>`).join('')}</div>`, { sub: '3 waiting · Top-floor 1-bed' }) });

/* ---------- Food details ---------- */
const F = (id) => D.food.find((f) => f.id === id) || D.food[0];
screen('restaurant-detail', { group: 'Food', title: 'Restaurant detail', render: (p) => { const f = F(p.id);
  return `<div class="scroller" data-collapse-host><div class="hero">${photo(f.img, '', 900, 700, 'data-hero')}${heroBar(`<button class="ib float nodrag" data-save aria-label="Save">${I('bookmark')}</button>`)}</div>
  <div class="sheetlike"><div class="pad"><h1 class="rv" style="font-size:26px;margin:0 0 6px;letter-spacing:-.02em">${f.name}</h1><div class="meta rv"><span style="color:var(--text)">${I('star')}<b>${f.rating}</b> (${f.reviews})</span><span>· ${f.cuisine}</span><span>· ${f.price}</span><span>· ${f.area}</span></div>${f.open ? `<div class="rv" style="color:var(--ok);font-weight:600;margin-top:6px">${f.open}</div>` : ''}</div>
  <div class="pad rv" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:16px 0 4px">${[['nav', 'Directions'], ['phone', 'Call'], ['share', 'Share']].map(([i, t]) => `<button class="btn sec" style="flex-direction:column;height:64px;gap:2px;font-size:13px" data-toast="${t}">${I(i, 20)}${t}</button>`).join('')}</div>
  ${h2('Popular here')}<div class="rail" data-hscroll>${f.dishes.map((d, k) => `<div class="card rv" style="width:150px">${photo(f.img + 'd' + k, '', 300, 220, 'style="height:96px"')}<div style="padding:8px 10px;font-weight:600;font-size:14px">${d}</div></div>`).join('')}</div>
  ${dl([['Services', f.services.join(' · ')], ['Price', f.price]])}
  ${h2('Reviews', 'Write one', `data-sheet="review" data-p="${P({ id: f.id })}"`)}${[['Liam Chen', 200, 5, 'The al pastor is the real thing. Go before 7 or wait a while.'], ['Sofia Ramirez', 340, 4, 'Lovely patio, friendly staff, a bit loud on Fridays.']].map(([n, h, s, t]) => `<div class="mrow rv" style="align-items:flex-start">${PERSON(n, h, 36)}<div class="tx"><b>${n}</b> <span style="color:#F5B300">${'★'.repeat(s)}</span><div class="muted" style="margin-top:2px">${t}</div></div></div>`).join('')}<div style="height:30px"></div></div></div>
  <div class="stick"><button class="btn ghost" data-sheet="review" data-p="${P({ id: f.id })}">${I('star', 19)} Rate</button><button class="btn pri" style="flex:1" data-toast="Opens maps">${I('nav', 19)} Get directions</button></div>`; } });
screen('review', { group: 'Food', title: 'Rate and review (sheet)', kind: 'sheet', render: (p) => { const f = F(p.id);
  return `${sheetHead('Rate ' + f.name)}<div class="sb"><div class="stars" style="margin:6px 0 4px">${[1, 2, 3, 4, 5].map((n) => `<button data-act="star" data-v="${n}" aria-label="${n} stars">${I('star', 40)}</button>`).join('')}</div><p class="small muted" style="text-align:center;margin:4px 0 16px" data-starlabel>Tap or drag across the stars</p>
  ${field('Tell people more (optional)', `<div class="input"><textarea placeholder="What should people order?"></textarea></div>`)}<button class="btn pri block" data-act="postreview" disabled>Post rating</button></div>`; },
  mount: (el) => { const s = $('.stars', el); s.addEventListener('pointermove', (e) => { if (!e.buttons) return; const b = document.elementFromPoint(e.clientX, e.clientY)?.closest('.stars button'); if (b) ACT.star(b, true); }); } });
screen('my-restaurants', { group: 'Food', title: 'My restaurants', render: () => page('My restaurants', `${[D.food[0]].map((f) => `<div class="card rv" style="margin:0 16px 16px">${photo(f.img, '', 800, 400, 'style="height:150px"')}<div style="padding:14px"><b style="font-size:17px">${f.name}</b><div class="meta" style="margin-top:4px"><span style="color:var(--text)">${I('star')}<b>${f.rating}</b> (${f.reviews})</span><span class="tag ok">Live</span><span class="tag">Owner badge pending</span></div>
  <div class="stats" style="margin:14px 0 0;box-shadow:none;background:var(--surface2)"><div><b>1.2k</b><small>Views</small></div><div><b>48</b><small>Saves</small></div><div><b>6</b><small>New reviews</small></div></div>
  <div style="display:flex;gap:8px;margin-top:12px"><button class="btn ghost sm" style="flex:1" data-go="compose-restaurant">${I('edit', 17)} Edit</button><button class="btn ghost sm" style="flex:1" data-act="pause">Pause</button></div></div></div>`).join('')}`, { right: ib('plus', 'data-go="compose-restaurant" aria-label="Add a restaurant"') }) });

/* ---------- Community details ---------- */
screen('question-detail', { group: 'Community', title: 'Question and answers', render: (p) => { const q = D.questions.find((x) => x.id === p.id) || D.questions[0];
  return page('Question', `<div class="pad"><div class="qh rv" style="display:flex;gap:10px;align-items:center">${PERSON(q.by, q.hue, 40)}<div><b>${q.by}</b><div class="small muted">${q.time} ago · ${q.cat}</div></div><button class="ib" style="margin-left:auto" data-sheet="more">${I('more')}</button></div>
  <h1 class="rv" style="font-size:23px;line-height:1.25;margin:14px 0 12px;letter-spacing:-.02em">${q.q}</h1><div class="acts rv" style="margin:0 -6px"><button class="vote" data-act="upvote">${I('up', 16)}<b>${q.votes}</b></button><button data-save>${I('bookmark', 19)} Follow</button><button data-toast="Link copied">${I('share', 19)}</button></div></div>
  ${h2(q.answers.length ? `${q.answers.length} answers` : 'No answers yet')}
  ${q.answers.length ? q.answers.map((a) => `<div class="card qcard rv">${a.best ? `<span class="tag ok" style="margin-bottom:8px">${I('check', 13)} Most helpful</span>` : ''}<div class="qh">${PERSON(a.by, a.hue, 30)}<b>${a.by}</b></div><div style="margin:8px 0 6px;line-height:1.5">${a.text}</div><div class="acts" style="margin:0 -6px"><button class="vote" data-act="upvote">${I('up', 16)}<b>${a.votes}</b></button><button>Reply</button></div></div>`).join('')
    : `<div class="empty rv">${I('msg')}<div>Know the answer? You would be the first to help.</div></div>`}<div class="answers"></div>`,
  { noLt: true, solid: true, barTitle: q.cat, stick: `<div class="stick">${PERSON(D.me.name, 210, 32)}<div class="input" style="flex:1;min-height:42px"><input placeholder="Write an answer"></div><button class="ib" data-act="answer" style="color:var(--accent)">${I('send')}</button></div>` }); } });
screen('ask', { group: 'Community', title: 'Ask a question (sheet)', kind: 'sheet', render: () => `${sheetHead('Ask your neighbours')}<div class="sb">
  ${field('Your question', `<div class="input"><textarea placeholder="e.g. Where can I get a Korean driving licence translated?" data-act-input="guess"></textarea></div>`)}
  <div class="small muted" style="margin:-4px 2px 8px">Topic <span data-guess>(we guess it from your words)</span></div><div class="cflow" data-single style="margin-bottom:16px">${['Housing', 'Food', 'Transit', 'Events', 'Jobs', 'Paperwork'].map((c) => `<button class="chip" data-toggle>${c}</button>`).join('')}</div>
  <button class="btn pri block" data-act="postq">Ask</button></div>`,
  mount: (el) => { const ta = $('textarea', el); ta.addEventListener('input', () => { const v = ta.value.toLowerCase(); const m = [['rent|room|apartment|lease|landlord', 'Housing'], ['food|eat|restaurant|taco|dosa', 'Food'], ['metro|bus|train|car|drive|licen', 'Transit'], ['job|work|visa|tax', 'Jobs'], ['ssn|id|paper|bank', 'Paperwork']].find(([r]) => new RegExp(r).test(v)); if (!m) return; const c = $$('.chip', el).find((b) => b.textContent === m[1]); if (c && !c.classList.contains('on')) { $$('.chip', el).forEach((b) => b.classList.remove('on')); c.classList.add('on'); anim(c, [{ transform: 'scale(.85)' }, { transform: 'scale(1)' }], 260, EASE_SHEET); $('[data-guess]', el).textContent = '— guessed, tap to change'; } }); } });

/* ---------- small sheets (not in the index) ---------- */
screen('city', { group: 'Other', title: 'Change city', kind: 'sheet', hidden: true, render: () => `${sheetHead('Your city')}<div class="sb"><div style="margin-bottom:12px">${inp('Search a city', '', 'search')}</div>${['Los Angeles, CA', 'San Francisco, CA', 'New York, NY', 'Toronto, ON', 'London, UK'].map((c, i) => `<button class="gl" data-close><span class="gi">${I('pin')}</span><span class="gt">${c}</span>${i ? '' : I('check', 20)}</button>`).join('')}</div>` });
screen('more', { group: 'Other', title: 'More', kind: 'sheet', hidden: true, render: () => `<div class="sb" style="padding-top:8px">${[['share', 'Share'], ['bookmark', 'Save'], ['eye', 'Hide posts like this'], ['flag', 'Report']].map(([i, t]) => `<button class="gl ${i === 'flag' ? 'danger' : ''}" data-close data-toast="${t === 'Report' ? 'Thanks, we will take a look' : t}"><span class="gi">${I(i)}</span><span class="gt">${t}</span></button>`).join('')}</div>` });
screen('listmenu', { group: 'Other', title: 'Listing menu', kind: 'sheet', hidden: true, render: () => `<div class="sb" style="padding-top:8px">${[['edit', 'Edit'], ['eye', 'Mark as rented'], ['share', 'Share'], ['x', 'Delete']].map(([i, t]) => `<button class="gl ${t === 'Delete' ? 'danger' : ''}" data-close data-toast="${t}"><span class="gi">${I(i)}</span><span class="gt">${t}</span></button>`).join('')}</div>` });
screen('filters', { group: 'Other', title: 'Filters', kind: 'sheet', hidden: true, render: () => `${sheetHead('Filters', '<button class="link" data-close>Reset</button>')}<div class="sb">
  ${field('Monthly rent', `<div class="grid2"><div class="input"><span class="pre">$</span><input value="800"></div><div class="input"><span class="pre">$</span><input value="3,000"></div></div>`)}
  <div class="grid2" style="margin-bottom:14px">${stepper('Beds', 1)}${stepper('Baths', 1)}</div>
  <div class="field"><span>Must have</span><div class="cflow">${['Furnished', 'Pets OK', 'Parking', 'Laundry', 'Available now'].map((c) => `<button class="chip" data-toggle>${c}</button>`).join('')}</div></div>
  <button class="btn pri block" data-close data-toast="Showing 9 homes">Show 9 homes</button></div>` });
screen('safety', { group: 'Other', title: 'Renting safely', kind: 'sheet', hidden: true, render: () => `${sheetHead('Renting safely')}<div class="sb">${['See the place, in person or on video, before paying anything.', 'Never wire money or pay in gift cards.', 'Check the owner’s badge and how long they have been here.', 'Read the lease; ask for anything unclear in writing.', 'Keep the conversation in Comlinkr messages.', 'Report anything that feels off; we act within a day.'].map((t, i) => `<div class="gl rv"><span class="gi">${i + 1}</span><span class="gt">${t}</span></div>`).join('')}</div>` });
