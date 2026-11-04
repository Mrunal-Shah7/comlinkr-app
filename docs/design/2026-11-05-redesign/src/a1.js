/* ===== A · Clarity — part 1: shell, helpers, sign-in, onboarding, the four tabs ===== */
const SPRING = 'withSpring({ damping: 26, stiffness: 260 })';
const V = {
  start: 'login',
  tabs: [
    { id: 'explore', label: 'Explore', icon: 'compass', fab: 'Post' },
    { id: 'listings', label: 'Listings', icon: 'home', fab: 'List a place' },
    { id: 'food', label: 'Food', icon: 'food', fab: 'Add a place' },
    { id: 'community', label: 'Community', icon: 'users', fab: 'Ask' },
  ],
  renderShell() {
    return `<div class="shell" style="height:100%">
      <div class="track">${this.tabs.map((t) => `<div class="pane" data-pane="${t.id}"></div>`).join('')}</div>
      <button class="fab nodrag" data-act="fab" aria-label="Create">${I('plus', 20)}<span>Post</span></button>
      <nav class="tabbar"><i class="tabpill"></i>${this.tabs.map((t, i) => `<button class="nodrag" data-tab="${i}">${I(t.icon, 24)}<span>${t.label}</span></button>`).join('')}</nav></div>`;
  },
  onTab(p, sh, settled) {
    const bar = $('.tabbar', sh); if (!bar) return;
    const btns = $$('button', bar), w = btns[0].offsetWidth, pill = $('.tabpill', bar);
    pill.style.width = w - 24 + 'px';
    pill.style.transition = settled && !RM() ? `transform 420ms ${EASE}` : 'none';
    pill.style.transform = `translateX(${btns[0].offsetLeft - 8 + p * w + 12}px)`;
    const i = Math.round(p); btns.forEach((b, k) => b.classList.toggle('on', k === i));
    const fab = $('.fab span', sh), t = this.tabs[i];
    if (fab && fab.textContent !== t.fab) { fab.textContent = t.fab; anim(fab, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], 260); }
  },
  skeleton() {
    const r = (h, w = '100%', m = 10) => `<div class="sk" style="height:${h}px;width:${w};margin-bottom:${m}px"></div>`;
    return `<div class="skel">${r(34, '55%', 8)}${r(16, '40%', 20)}${r(36, '100%', 16)}${r(200, '100%', 16)}${[1, 2, 3].map(() => `<div style="display:flex;gap:12px;margin-bottom:14px"><div class="sk" style="width:104px;height:88px;flex:none"></div><div style="flex:1">${r(18, '40%', 8)}${r(14, '90%', 8)}${r(14, '60%')}</div></div>`).join('')}</div>`;
  },
  motion: {
    default: [`Push: translateX 100% → 0, ${SPRING} (≈380 ms). The screen below slides to −24% and dims to 82%.`, 'Back: an edge swipe follows the finger; let go past a third (or flick) to finish.', 'Press: scale 0.97, withTiming 180 ms.'],
    tabs: ['Tabs: the pane follows the finger (SwipeTabs today); release snaps with withSpring({ damping: 24, stiffness: 240 }). The tab pill moves with the drag.', 'Large title collapses into the bar over the first 64 px of scroll: interpolate(scrollY, [0, 64], [1, 0]).', 'First load: skeleton for 0.7 s, then rows rise 14 px → 0, 45 ms apart (FadeInDown.springify().delay(i × 45)).', 'The FAB label cross-fades per tab (FadeIn 260 ms).'],
    detail: ['The card photo grows into the header (shared element, 460 ms, corner radius → 0); the page fades in under it.', 'Back while the header is in view: the photo shrinks back into its card.', 'Save: scale 1 → 0.8 → 1.15 → 1, then a toast drops from the top with withSpring({ damping: 18 }).'],
    sheet: ['Sheet: translateY 100% → 0, withSpring({ damping: 18, stiffness: 200 }), a slight overshoot.', 'Drag the handle down past 110 px to close; otherwise it springs back.'],
    otp: ['Each digit: scale 0.86 → 1.08 → 1 (withSequence, 260 ms); the next box takes focus.', 'Wrong code (000000): the row shakes (0, −8, 7, −5, 3, 0 px over 420 ms), turns red and clears.', 'Right code: boxes turn green one by one, 55 ms apart; then onboarding slides up.'],
    compose: ['Photo slot fills with a spring (scale 0.6 → 1).', 'A checklist row opens by measuring its height (withTiming 380 ms); its number turns into a green tick when complete; the progress bar grows.', 'Publish: the tick draws itself (strokeDashoffset 30 → 0, 500 ms).'],
  },
  act(a, t) { ACT[a] && ACT[a](t); },
};
['explore', 'listings', 'food', 'community'].forEach((k) => (V.motion[k] = V.motion.tabs));
['listing-detail', 'restaurant-detail', 'event-detail', 'room-detail'].forEach((k) => (V.motion[k] = V.motion.detail));
['compose', 'menu', 'event-register', 'review', 'ask', 'apply'].forEach((k) => (V.motion[k] = V.motion.sheet));
['compose-listing', 'compose-room', 'compose-restaurant', 'compose-event', 'compose-story', 'compose-quest', 'compose-news', 'compose-review'].forEach((k) => (V.motion[k] = V.motion.compose));
V.motion.otp = V.motion.otp;
V.motion.onboarding = ['Step change: the next step slides in 28 px from the right with a fade (340 ms); the dot stretches into a pill (width 6 → 22, withTiming 350 ms).', 'Chips and tiles: scale 0.92 → 1 spring on select.', 'Primary button label cross-fades between "Continue" and "Let’s explore".'];
V.motion['story-viewer'] = ['Bars fill linearly over 5 s per story; tap right or left to jump; the photo cross-fades.', 'Swipe down closes: translateY follows the finger, scale to 0.9, then dismiss.'];
V.motion.chat = ['A sent message pops from its own corner: scale 0.6 → 1, transform-origin bottom right, withSpring({ damping: 16 }).', 'The pinned listing card collapses as you scroll up.'];
V.motion['event-ticket'] = ['The ticket unfolds from the top: rotateX −80° → 0, withSpring({ damping: 14, stiffness: 120 }).'];
V.motion.landlord = ['Approve or decline: the card slides out (translateX ±110%, 300 ms) and the list closes the gap (Layout.springify()).'];
V.motion['roommate-detail'] = ['Match ring sweeps from 0 to the score over 900 ms (withTiming, Easing.out(cubic)); the number counts up with it.', ...V.motion.default.slice(0, 1)];

/* ---------- helpers ---------- */
const BACK = `<button class="ib" data-back aria-label="Back">${I('back')}</button>`;
const ib = (icon, attrs = '', dot = false) => `<button class="ib nodrag" ${attrs}>${I(icon)}${dot ? '<i class="dot"></i>' : ''}</button>`;
function bar(title, right = '', o = {}) { return `<header class="bar ${o.solid ? 'solid' : ''}">${o.noback ? '' : BACK}<div class="bt">${title}</div><div class="ba">${right}</div></header>`; }
function page(title, body, o = {}) {
  return bar(o.barTitle || title, o.right || '', o) +
    `<div class="scroller" data-collapse-host>${o.noLt ? '' : `<div class="lt"><h1>${title}</h1>${o.sub ? `<p>${o.sub}</p>` : ''}</div>`}${body}<div style="height:40px"></div></div>${o.stick || ''}`;
}
function tabTop(t) {
  return `<header class="bar"><button class="ib nodrag" data-sheet="menu" aria-label="You">${PERSON(D.me.name, 210, 32)}</button><div class="bt">${t}</div>
    <div class="ba">${ib('search', 'data-toast="Search across the city opens here"')}${ib('bell', 'data-go="notifications" aria-label="Notifications"', true)}${ib('msg', 'data-go="messages" aria-label="Messages"', true)}</div></header>`;
}
const cityLine = `<button class="citybtn nodrag" data-sheet="city">${I('pin', 15)}${D.city}${I('down', 14)}</button><span>· ${D.cityTime}</span>`;
const seg = (items, cls = '') => `<div class="seg ${cls}" ${cls.includes('scroll') ? 'data-hscroll' : ''}><i class="seg-ind"></i>${items.map((x, i) => `<button class="${i ? '' : 'on'}" data-show="${x[0]}">${x[1]}</button>`).join('')}</div>`;
const chips = (arr, single = true, on = 0) => `<div class="chips" data-hscroll ${single ? 'data-single' : ''}>${arr.map((c, i) => `<button class="chip ${i === on ? 'on' : ''}" data-toggle>${c}</button>`).join('')}</div>`;
const h2 = (t, link = '', attrs = '') => `<div class="h2 rv"><h2>${t}</h2>${link ? `<button ${attrs}>${link}</button>` : ''}</div>`;
const facts = (l) => [l.beds ? `${l.beds} bed` : l.type === 'Studio' ? 'Studio' : '', l.baths ? `${l.baths} bath` : '', l.sqft ? `${l.sqft} sq ft` : ''].filter(Boolean);
const field = (label, inner, hint = '') => `<label class="field"><span>${label}</span>${inner}${hint ? `<div class="hintx">${hint}</div>` : ''}</label>`;
const inp = (ph, val = '', icon = '', type = 'text') => `<div class="input">${icon ? I(icon, 19) : ''}<input type="${type}" placeholder="${ph}" value="${val}"></div>`;
const stepper = (label, v, min = 0) => `<div class="stepper" data-min="${min}"><span>${label}</span><div class="sc"><button data-step="-1" aria-label="Less">−</button><output>${v}</output><button data-step="1" aria-label="More">+</button></div></div>`;
const sw = (on) => `<span class="sw ${on ? 'on' : ''}" data-act="sw"></span>`;
const L = (id) => D.listings.find((x) => x.id === id) || D.listings[0];
const go = (id, p) => `data-go="${id}" data-p="${P(p)}"`;

function featCard(l) {
  return `<a href="#" class="card feat rv press" data-flip ${go('listing-detail', { id: l.id })}>${photo(l.img, '', 800, 500, 'data-flip-img')}
    <div class="ov">${l.fresh ? '<span class="tag dark">New</span>' : ''}<span class="tag dark">${l.type}</span></div>
    <button class="save sv nodrag" data-save aria-label="Save">${I('bookmark', 19)}</button>
    <div class="bd"><div class="price">${money(l.price)}<small> /month</small></div><h3>${l.title}</h3>
    <div class="meta"><span>${I('pin')}${l.area}</span>${facts(l).map((f) => `<span>${f}</span>`).join('')}${l.verified ? `<span class="vf">${I('check')}</span>` : ''}</div></div></a>`;
}
function rowCard(l) {
  return `<a href="#" class="row rv press" data-flip ${go('listing-detail', { id: l.id })}>${photo(l.img, '', 300, 260, 'data-flip-img')}
    <div class="tx"><div class="price" style="font-size:17px">${money(l.price)}<small> /mo</small></div><h3 class="ell">${l.title}</h3>
    <div class="meta"><span>${l.area}</span>${facts(l).slice(0, 2).map((f) => `<span>· ${f}</span>`).join('')}</div>
    <div class="meta small" style="margin-top:3px"><span>${I('cal')}${l.avail === 'Now' ? 'Available now' : 'From ' + l.avail}</span></div></div>
    <button class="save nodrag" data-save aria-label="Save">${I('bookmark', 19)}</button></a>`;
}

/* ---------- sign in ---------- */
screen('login', { group: 'Sign in', title: 'Sign in', kind: 'root', render: () => `<div class="scroller"><div class="auth">
  <div class="logo rv"><i>C</i>comlinkr</div>
  <h1 class="rv">Find your place<br>and your people.</h1><p class="muted rv" style="margin:0 0 22px">Homes, food and neighbours in your new city.</p>
  <div class="rv" style="display:grid;gap:10px"><button class="btn ghost block" data-toast="Google sign-in needs a development build">${I('google', 20)} Continue with Google</button>
  <button class="btn ghost block" data-toast="Apple sign-in on iPhone">${I('apple', 20)} Continue with Apple</button></div>
  <div class="or rv">or</div>
  <div class="rv">${field('Email or username', inp('you@example.com', '', 'mail'))}${field('Password', `<div class="input">${I('lock', 19)}<input type="password" placeholder="Your password"><button class="nodrag" data-toast="Shown">${I('eye', 19)}</button></div>`)}</div>
  <div class="rv" style="text-align:right;margin:-4px 0 18px"><button class="link" data-go="forgot">Forgot password?</button></div>
  <button class="btn pri block rv" data-act="signin">Sign in</button>
  <p class="muted rv" style="text-align:center;margin-top:auto;padding-top:24px">New here? <button class="link" data-go="signup">Create an account</button></p>
  <p class="rv" style="text-align:center"><button class="link small" data-go="explore">Browse as a guest</button></p></div></div>` });
screen('signup', { group: 'Sign in', title: 'Create account', render: () => page('Create account', `<div class="pad">
  <div class="rv" style="display:grid;gap:10px;margin-bottom:6px"><button class="btn ghost block" data-toast="Google sign-in needs a development build">${I('google', 20)} Sign up with Google</button></div>
  <div class="or rv">or with email</div>
  <div class="rv">${field('Your name', inp('First and last name', '', 'user'))}${field('Email', inp('you@example.com', '', 'mail', 'email'))}${field('Username', inp('e.g. jordanlee', '', 'user'), `${I('check')} Available`)}
  ${field('Password', `<div class="input">${I('lock', 19)}<input type="password" placeholder="At least 8 characters"></div>`, '8+ characters · a number · a capital')}</div>
  <label class="rv" style="display:flex;gap:10px;align-items:flex-start;margin:4px 0 18px;font-size:14px;color:var(--text2)"><span class="sw on" data-act="sw" style="transform:scale(.8);transform-origin:0 0"></span> I agree to the <button class="link" data-go="legal">Terms</button> and <button class="link" data-go="legal">Privacy Policy</button>.</label>
  <button class="btn pri block rv" data-go="otp">Send me a code</button></div>`, { sub: 'Takes a minute. We email you a 6-digit code.' }) });
const otpBoxes = (next) => `<div class="otp" data-next="${next}">${[0, 1, 2, 3, 4, 5].map(() => '<label><input inputmode="numeric" autocomplete="one-time-code" maxlength="1" aria-label="Digit"></label>').join('')}</div><div class="otp-msg">Any code works here except 000000.</div>`;
screen('otp', { group: 'Sign in', title: 'Verify email (OTP)', render: () => page('Check your email', `<div class="pad"><div class="rv" style="margin:18px 0 6px">${otpBoxes('onboarding')}</div>
  <p class="rv muted small" style="text-align:center;margin-top:22px">Didn’t get it? <button class="link" data-act="resend">Resend in <span class="cd">0:30</span></button></p></div>`,
  { sub: 'We sent a code to jordan@example.com' }), mount: (el) => { let s = 30; const c = $('.cd', el); const t = setInterval(() => { if (!document.body.contains(el)) return clearInterval(t); s = Math.max(0, s - 1); c.textContent = '0:' + String(s).padStart(2, '0'); }, 1000); } });
screen('forgot', { group: 'Sign in', title: 'Forgot password', render: () => page('Reset password', `<div class="pad" data-segroot>
  <div data-panel="a">${field('Email', inp('you@example.com', 'jordan@example.com', 'mail'))}<button class="btn pri block" data-act="fpnext">Email me a code</button></div>
  <div data-panel="b" hidden>${otpBoxes('login')}<div style="height:18px"></div>${field('New password', `<div class="input">${I('lock', 19)}<input type="password" placeholder="At least 8 characters"></div>`)}</div></div>`, { sub: 'We will send a 6-digit code to your email.' }) });

/* ---------- onboarding: 5 steps (Agreement step removed) ---------- */
const CULT = [['Korean', '🇰🇷'], ['Mexican', '🇲🇽'], ['Indian', '🇮🇳'], ['Chinese', '🇨🇳'], ['Filipino', '🇵🇭'], ['Italian', '🇮🇹'], ['Nigerian', '🇳🇬'], ['Brazilian', '🇧🇷']];
const INTS = ['Food & dining', 'Nightlife', 'Outdoors', 'Fitness', 'Jobs & careers', 'Music', 'Art', 'Volunteering', 'Shopping', 'Faith', 'Sports', 'Tech'];
screen('onboarding', { group: 'Sign in', title: 'Onboarding (5 steps)', kind: 'root', render: () => `<header class="bar solid" style="background:transparent;border:0"><button class="ib" data-act="obback" aria-label="Back">${I('back')}</button><div class="dots" style="margin:0 auto">${[0, 1, 2, 3, 4].map((i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div><button class="link" data-act="obskip" style="padding:0 12px;visibility:hidden">Skip</button></header>
  <div style="position:relative;flex:1" data-obi="0">
   <div class="obstep" data-ob="0"><div class="lt" style="padding:8px 0 18px"><h1>Where are you living?</h1><p>We filled this in from your phone. Change it if it is wrong.</p></div>
     <div class="prefill rv">${I('pin')}<div><b>Los Angeles</b>, California, United States<div class="small muted">From your phone’s location</div></div></div><div style="height:14px"></div>
     ${field('Neighbourhood (optional)', inp('e.g. Echo Park', '', 'home'))}</div>
   <div class="obstep" data-ob="1" hidden><div class="lt" style="padding:8px 0 18px"><h1>Where are you from?</h1><p>Pick any. It helps us find your people.</p></div><div class="tiles">${CULT.map(([n, f]) => `<button class="tile" data-act="tile"><span style="font-size:24px">${f}</span><b>${n}</b></button>`).join('')}</div></div>
   <div class="obstep" data-ob="2" hidden><div class="lt" style="padding:8px 0 18px"><h1>What are you into?</h1><p>Choose three or more.</p></div><div class="cflow">${INTS.map((n) => `<button class="chip" data-toggle>${n}</button>`).join('')}</div></div>
   <div class="obstep" data-ob="3" hidden><div class="lt" style="padding:8px 0 18px"><h1>Join a community</h1><p>Optional. You can join later.</p></div>${['Korean in LA · 1.2k', 'Indian in LA · 3.4k', 'New grads LA · 860', 'Dog owners Echo Park · 410'].map((c) => `<div class="gl" style="background:var(--surface);border-radius:14px;margin-bottom:8px"><span class="gi">${I('users')}</span><span class="gt">${c}</span><button class="btn sm sec" data-act="join">Join</button></div>`).join('')}</div>
   <div class="obstep" data-ob="4" hidden><div style="text-align:center;padding-top:60px"><div class="success" style="position:static;background:none;backdrop-filter:none"><div><div class="ck">${I('check')}</div></div></div><h1 style="font-size:28px;margin:6px 0">You’re all set, Jordan</h1><p class="muted">Los Angeles is ready for you: 24 homes, 12 places to eat and 5 questions from neighbours this week.</p><label class="agree" style="display:flex;gap:10px;align-items:center;justify-content:center;margin-top:22px;font-size:14px">${sw(false)} <span>I agree to the <button class="link" data-go="legal">Terms</button> and <button class="link" data-go="legal">Privacy Policy</button></span></label></div></div>
  </div>
  <div style="padding:12px 24px 34px"><button class="btn pri block" data-act="obnext"><span>Continue</span></button></div>` });

/* ---------- the four tabs ---------- */
screen('explore', { group: 'Explore', title: 'Explore', kind: 'tab', tab: 'explore', render: () => `${tabTop('Explore')}<div class="scroller" data-collapse-host data-segroot>
  <div class="lt"><h1>Explore</h1><p>${cityLine}</p></div>
  ${seg([['news', 'News'], ['events', 'Events'], ['stories', 'Stories'], ['quests', 'Quests'], ['polls', 'Polls']], 'scroll')}
  <div data-panel="news">${chips(['All', 'Local', 'Neighbours', 'National'])}
    <a href="#" class="card feat rv press" data-toast="Opens the article in the reader">${photo('n1', '', 800, 500)}<div class="bd"><div class="meta small"><span class="tag">Local</span><span>${D.news[0].src} · ${D.news[0].time} ago</span></div><h3 style="font-size:18px;margin-top:8px">${D.news[0].title}</h3><div class="acts" style="margin:4px -10px -6px"><button data-like>${I('heart', 19)}<b>48</b></button><button>${I('msg', 19)}<b>6</b></button><button data-save style="margin-left:auto">${I('bookmark', 19)}</button></div></div></a>
    ${D.news.slice(1, 3).map((n) => `<a href="#" class="row rv press" data-toast="Opens the article">${`<div class="tx"><div class="meta small"><span>${n.src}</span><span>· ${n.time} ago</span></div><h3 style="margin-top:4px">${n.title}</h3><div class="meta small"><span>${I('clock')}${n.mins} min read</span></div></div>`}${photo(n.img, '', 300, 260)}</a>`).join('')}
    ${h2('From your neighbours', 'Post', 'data-go="compose-news"')}
    ${D.posts.map((p) => `<a href="#" class="card qcard rv press" ${go('post-detail', { id: p.id })}><div class="qh">${PERSON(p.by, p.hue, 34)}<div><b>${p.by}</b><div class="muted small">${p.time} ago · Echo Park</div></div><button class="ib nodrag" style="margin-left:auto" data-sheet="more">${I('more')}</button></div><p>${p.title}</p><div class="muted" style="margin:-2px 0 8px">${p.body}</div>${p.img ? photo(p.img, '', 600, 300, 'style="height:150px;border-radius:12px;margin-bottom:6px"') : ''}<div class="acts" style="margin:0 -10px"><button class="nodrag" data-like>${I('heart', 19)}<b>${p.likes}</b></button><button>${I('msg', 19)}${p.comments}</button><button class="nodrag" data-toast="Link copied">${I('share', 19)}</button></div></a>`).join('')}
    ${D.news.slice(3).map((n) => `<a href="#" class="row rv press" data-toast="Opens the article"><div class="tx"><div class="meta small"><span>${n.src}</span><span>· ${n.time} ago</span></div><h3 style="margin-top:4px">${n.title}</h3></div>${photo(n.img, '', 300, 260)}</a>`).join('')}
  </div>
  <div data-panel="events" hidden><div class="datestrip" data-hscroll>${['FRI 7', 'SAT 8', 'SUN 9', 'MON 10', 'TUE 11', 'WED 12', 'SAT 15'].map((d, i) => `<button class="${i ? '' : 'on'}" data-act="day"><small>${d.split(' ')[0]}</small><b>${d.split(' ')[1]}</b></button>`).join('')}</div>
    ${D.events.map((e, i) => i === 0 ? `<a href="#" class="card feat rv press" data-flip ${go('event-detail', { id: e.id })}>${photo(e.img, '', 800, 500, 'data-flip-img')}<div class="ov"><span class="tag dark">${e.cat}</span></div><div class="bd"><div class="meta small"><span style="color:var(--accent-text);font-weight:700">${e.day} ${e.date} · ${e.time}</span></div><h3 style="font-size:18px;margin:6px 0">${e.title}</h3><div class="meta"><span>${I('pin')}${e.venue}</span><span>${e.going} going</span><span>${e.price}</span></div></div></a>`
      : `<a href="#" class="row rv press" data-flip ${go('event-detail', { id: e.id })}><div class="datebox"><small>${e.day}</small><b>${e.date.split(' ')[1]}</b></div><div class="tx"><h3>${e.title}</h3><div class="meta small"><span>${e.time}</span><span>· ${e.venue}</span></div><div class="meta small"><span>${e.going} going · ${e.price}</span></div></div>${photo(e.img, '', 200, 200, 'data-flip-img style="width:64px;height:64px;border-radius:12px"')}</a>`).join('')}
    <div class="pad rv" style="margin-top:10px"><button class="btn sec block" data-go="compose-event">${I('plus', 19)} Host an event</button></div></div>
  <div data-panel="stories" hidden>${chips(['All', 'Food', 'Places', 'Housing', 'Outdoor'])}<div class="storygrid"><button class="stile add rv" data-go="compose-story"><div>${I('camera', 30)}<div style="font-weight:650;margin-top:6px">Add a story</div><div class="small muted">Photo or video</div></div></button>
    ${D.stories.map((s, i) => `<button class="stile rv press" ${go('story-viewer', { i })}>${photo(s.img, '', 400, 600)}${PERSON(s.by, s.hue, 30)}<span class="t">${s.title}<br><small style="opacity:.75;font-weight:500">${s.by.split(' ')[0]} · ${s.cat}</small></span></button>`).join('')}</div></div>
  <div data-panel="quests" hidden>${D.quests.map((q) => `<div class="card qcard rv"><div style="display:flex;gap:12px;align-items:center">${photo(q.img, '', 200, 200, 'style="width:56px;height:56px;border-radius:14px;flex:none"')}<div style="flex:1"><div class="meta small"><span class="tag">${q.kind}</span><span>${q.left}</span></div><b style="display:block;font-size:16px;margin-top:4px">${q.title}</b></div></div>
    ${q.progress ? `<div style="margin:12px 0 4px" class="small muted">${q.progress} of ${q.of} done</div><div class="bar2"><i style="width:${(q.progress / q.of) * 100}%"></i></div>` : ''}
    <div class="meta small" style="margin:12px 0 8px"><span>${I('trophy')}${q.reward}</span><span>${q.joined} joined</span><button class="btn sm ${q.progress ? 'ghost' : 'pri'}" style="margin-left:auto" data-act="join">${q.progress ? 'Continue' : 'Join'}</button></div></div>`).join('')}
    <div class="pad"><button class="btn sec block rv" data-go="compose-quest">${I('plus', 19)} Start a quest</button></div></div>
  <div data-panel="polls" hidden><div class="card qcard rv" data-poll="0"><div class="meta small"><span class="tag">${D.poll[0].tag}</span><span>Question 1 of 3</span></div><p>${D.poll[0].q}</p>
    <button class="pollopt" data-act="vote" data-v="a"><i></i><span>${D.poll[0].a}</span><b>64%</b></button><button class="pollopt" data-act="vote" data-v="b"><i></i><span>${D.poll[0].b}</span><b>36%</b></button>
    <div class="meta small" style="justify-content:space-between;margin:4px 0 6px"><span>212 neighbours voted</span><button class="link" data-act="nextpoll">Next ${I('right', 14)}</button></div></div>
    ${h2('Asked in Community', 'See all', 'data-tab="3"')}${D.questions.slice(0, 2).map(qCard).join('')}</div>
  </div>` });

function qCard(q) {
  return `<a href="#" class="card qcard rv press" ${go('question-detail', { id: q.id })}><div class="qh">${PERSON(q.by, q.hue, 30)}<span><b>${q.by}</b> <span class="muted">· ${q.time} ago</span></span><span class="tag" style="margin-left:auto">${q.cat}</span></div>
    <p>${q.q}</p><div class="acts" style="margin:0 -6px 2px"><button class="vote nodrag" data-act="upvote">${I('up', 16)}<b>${q.votes}</b></button>
    <button>${I('msg', 18)}${q.answers.length ? q.answers.length + ' answers' : 'Be the first to answer'}</button><button class="nodrag" style="margin-left:auto" data-sheet="more" aria-label="More">${I('more')}</button></div></a>`;
}
screen('listings', { group: 'Listings', title: 'Listings: homes, rooms, roommates', kind: 'tab', tab: 'listings', render: () => `${tabTop('Listings')}<div class="scroller" data-collapse-host data-segroot>
  <div class="lt"><h1>Listings</h1><p>${cityLine}</p></div>
  ${seg([['homes', 'Homes'], ['rooms', 'Rooms'], ['mates', 'Roommates']])}
  <div data-panel="homes"><div style="display:flex;align-items:center;padding-right:16px">${chips(['All', 'Apartment', 'House', 'Studio', 'Room'])}<button class="ib nodrag" style="margin:-12px 0 0 auto;flex:none" data-sheet="filters" aria-label="Filters">${I('sliders')}</button></div>
    <div class="meta small pad rv" style="margin-bottom:10px"><span>24 homes</span><span>· Newest first</span></div>
    ${featCard(D.listings[0])}${D.listings.slice(1).map(rowCard).join('')}
    <button class="gl rv" data-sheet="safety" style="margin:10px 0"><span class="gi">${I('shield')}</span><span class="gt"><b>Renting safely</b><div class="small muted">Six checks before you pay anything</div></span>${I('right', 18)}</button></div>
  <div data-panel="rooms" hidden><div class="meta small pad" style="margin-bottom:10px"><span>Rooms in shared homes</span></div>
    ${D.rooms.map((r) => `<a href="#" class="row rv press" data-flip ${go('room-detail', { id: r.id })}>${photo(r.img, '', 300, 260, 'data-flip-img')}<div class="tx"><div class="price" style="font-size:17px">${money(r.price)}<small> /mo</small></div><h3 class="ell">${r.title}</h3><div class="meta small"><span>${r.spots} of ${r.of} rooms free</span><span>· ${r.mates} housemates</span></div><div class="meta small"><span>${I('cal')}${r.avail === 'Now' ? 'Available now' : 'From ' + r.avail}</span></div></div></a>`).join('')}
    <div class="pad rv" style="margin-top:10px"><button class="btn sec block" data-go="compose-room">${I('key', 19)} Rent out a room in my home</button></div></div>
  <div data-panel="mates" hidden><div class="meta small pad" style="margin-bottom:10px"><span>Sorted by match</span><button class="link" style="margin-left:auto" data-go="profile">Your preferences</button></div>
    ${D.mates.map((m) => `<a href="#" class="row rv press" ${go('roommate-detail', { id: m.id })}>${PERSON(m.name, m.hue, 56)}<div class="tx"><h3>${m.name}, ${m.age}</h3><div class="meta small"><span>${m.job}</span><span>· ${m.budget}</span></div><div class="meta small"><span>Move-in ${m.movein}</span><span>· ${m.sleep}</span></div></div><span class="tag ok" style="font-size:13px">${m.match}%</span></a>`).join('')}</div>
  </div>` });
screen('food', { group: 'Food', title: 'Food', kind: 'tab', tab: 'food', render: () => `${tabTop('Food')}<div class="scroller" data-collapse-host>
  <div class="lt"><h1>Food</h1><p>${cityLine}</p></div>
  <div class="pad rv" style="margin-bottom:12px">${inp('Restaurants, dishes, cuisines', '', 'search')}</div>
  ${chips(['All', 'Open now', '$', '$$', 'Mexican', 'Indian', 'Japanese', 'Korean', 'Italian'])}
  ${h2('Loved nearby')}<div class="rail" data-hscroll>${D.food.slice(0, 3).map((f) => `<a href="#" class="card fcard rv press" data-flip ${go('restaurant-detail', { id: f.id })}>${photo(f.img, '', 600, 400, 'data-flip-img')}<div class="bd"><h3 style="margin:0 0 4px;font-size:15.5px">${f.name}</h3><div class="meta small"><span style="color:var(--text)">${I('star')}<b>${f.rating}</b></span><span>${f.cuisine}</span><span>${f.price}</span></div></div></a>`).join('')}</div>
  ${h2('All places', '12')}${D.food.map((f) => `<a href="#" class="row rv press" data-flip ${go('restaurant-detail', { id: f.id })}>${photo(f.img, '', 300, 260, 'data-flip-img')}<div class="tx"><h3>${f.name}</h3><div class="meta small"><span style="color:var(--text)">${I('star')}<b>${f.rating}</b> (${f.reviews})</span><span>· ${f.cuisine}</span><span>· ${f.price}</span></div>${f.open ? `<div class="meta small" style="margin-top:3px"><span style="color:var(--ok);font-weight:600">${f.open}</span></div>` : ''}<div class="small muted ell" style="margin-top:3px">Try: ${f.dishes.join(', ')}</div></div><button class="save nodrag" data-save>${I('bookmark', 19)}</button></a>`).join('')}
  </div>` });
screen('community', { group: 'Community', title: 'Community Q&A', kind: 'tab', tab: 'community', render: () => `${tabTop('Community')}<div class="scroller" data-collapse-host>
  <div class="lt"><h1>Community</h1><p>Questions from people around you</p></div>
  <button class="askbox rv nodrag" data-sheet="ask">${PERSON(D.me.name, 210, 30)}<span style="flex:1;text-align:left">What do you need help with?</span><span class="btn sm pri">Ask</span></button>
  ${chips(['All', 'Housing', 'Food', 'Transit', 'Events', 'Jobs', 'Paperwork'])}
  ${D.questions.map(qCard).join('')}</div>` });
