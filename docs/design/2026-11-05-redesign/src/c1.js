/* ===== C · Night Market — part 1: shell with a central +, helpers, sign-in, onboarding, bento tabs ===== */
const V = {
  start: 'login', push: 'zoom',
  tabs: [
    { id: 'explore', label: 'Explore', icon: 'compass' },
    { id: 'listings', label: 'Homes', icon: 'home' },
    { id: 'food', label: 'Food', icon: 'food' },
    { id: 'community', label: 'People', icon: 'users' },
  ],
  renderShell() {
    const b = (t, i) => `<button class="nodrag" data-tab="${i}">${I(t.icon, 23)}<span>${t.label}</span></button>`;
    return `<div class="shell" style="height:100%;position:relative">
      <div class="track" style="height:100%">${this.tabs.map((t) => `<div class="pane" data-pane="${t.id}"></div>`).join('')}</div>
      <nav class="tabbar"><i class="tabpill"></i>${b(this.tabs[0], 0)}${b(this.tabs[1], 1)}<button class="plus nodrag" data-act="fab" aria-label="Post something">${I('plus', 26)}</button>${b(this.tabs[2], 2)}${b(this.tabs[3], 3)}</nav></div>`;
  },
  onTab(p, sh, settled) {
    const bar = $('.tabbar', sh); if (!bar) return;
    const btns = $$('button[data-tab]', bar), pill = $('.tabpill', bar);
    const i = Math.max(0, Math.min(btns.length - 1, Math.floor(p))), j = Math.min(btns.length - 1, i + 1), f = Math.max(0, Math.min(1, p - i));
    const cx = (b) => b.offsetLeft + b.offsetWidth / 2, a = cx(btns[i]), b = cx(btns[j]);
    const x = a + (b - a) * f, w = 22 + Math.sin(Math.PI * f) * Math.abs(b - a) * 0.7;
    pill.style.transition = settled && !RM() ? 'transform .5s cubic-bezier(.34,1.56,.64,1), width .5s cubic-bezier(.34,1.56,.64,1)' : 'none';
    pill.style.width = w + 'px'; pill.style.transform = `translateX(${x - w / 2}px)`;
    btns.forEach((bt, k) => bt.classList.toggle('on', k === Math.round(p)));
  },
  sheetIn: (id) => id === 'compose' ? [{ transform: 'translateY(30%) scale(.25)', opacity: 0, borderRadius: '40px' }, { transform: 'none', opacity: 1, borderRadius: '30px 30px 0 0' }] : null,
  onSheetClose() { $$('.tabbar .plus').forEach((p) => p.classList.remove('open')); },
  skeleton() {
    const t = (h, span = 1) => `<div class="sk" style="height:${h}px;border-radius:24px;grid-column:span ${span}"></div>`;
    return `<div style="padding:100px 16px 0"><div class="sk" style="height:34px;width:50%;border-radius:12px;margin-bottom:16px"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${t(150, 2)}${t(250)}${t(120)}${t(120)}${t(90, 2)}</div></div>`;
  },
  motion: {
    default: ['Push: the new screen zooms from 0.88 with a 44 px corner radius to full size (withSpring({ damping: 18, stiffness: 190 }), a little overshoot); the screen behind scales to 0.94 and dims to 60%.', 'Back: the reverse, 340 ms. Edge swipe works too.', 'Press: scale 0.96 with a spring.'],
    tabs: ['Tabs: the pane follows the finger. The mint indicator under the icons is "liquid": it stretches between two tabs while you drag (width = 22 + sin(π·progress) × gap × 0.7) and snaps back with a springy overshoot.', 'Bento tiles pop in one after another (scale 0.96 → 1, opacity, 45 ms apart).', 'The greeting tile has a slow floating glow (6 s loop; off with reduce motion).'],
    detail: ['The tile photo grows into the header (shared element, 460 ms).', 'Glass bar fades in behind the buttons as you scroll (blur 0 → 24 px).', 'Like: the heart bounces and throws 8 small sparks.'],
    sheet: ['Sheets rise with withSpring({ damping: 18, stiffness: 200 }).', 'The + sheet grows out of the + button: scale 0.25 → 1 from the bottom centre, while the + turns into an ×.'],
    otp: ['Boxes glow in the accent colour as they fill; each digit pops (0.86 → 1.08 → 1).', 'Wrong code: shake and red. Right code: boxes flip to mint one by one, then onboarding zooms in.'],
    compose: ['One question per screen: the next question slides in from the right (28 px + fade, 340 ms) and the gradient progress bar grows.', 'Choice cards fill mint when picked; Next becomes active with a small bounce.', 'Publish: confetti in the theme colours (24 pieces, 1.2 s) and a tick.'],
  },
  act(a, t) { ACT[a] && ACT[a](t); },
};
['explore', 'listings', 'food', 'community'].forEach((k) => (V.motion[k] = V.motion.tabs));
['listing-detail', 'restaurant-detail', 'event-detail', 'room-detail'].forEach((k) => (V.motion[k] = V.motion.detail));
['compose', 'menu', 'event-register', 'review', 'ask', 'apply'].forEach((k) => (V.motion[k] = V.motion.sheet));
['compose-listing', 'compose-room', 'compose-restaurant', 'compose-event', 'compose-story', 'compose-quest', 'compose-news', 'compose-review'].forEach((k) => (V.motion[k] = V.motion.compose));
V.motion.onboarding = ['Each step slides in with a fade; the progress dots are mint.', 'Tiles fill mint and pop on select.'];
V.motion['story-viewer'] = ['Bars fill over 5 s; tap to move; photos cross-fade with a slow zoom.'];
V.motion.chat = ['Sent bubbles pop from their corner with the accent gradient.'];
V.motion['roommate-detail'] = ['The mint ring sweeps to the match score over 900 ms while the number counts up.'];

/* ---------- helpers ---------- */
const BACK = `<button class="ib" data-back aria-label="Back">${I('back')}</button>`;
const ib = (icon, attrs = '', dot = false) => `<button class="ib nodrag" ${attrs}>${I(icon)}${dot ? '<i class="dot"></i>' : ''}</button>`;
function bar(title, right = '', o = {}) { return `<header class="bar ${o.solid ? 'solid' : ''}">${o.noback ? '' : BACK}<div class="bt">${title}</div><div class="ba">${right}</div></header>`; }
function page(title, body, o = {}) {
  return bar(o.barTitle || title, o.right || '', o) + `<div class="scroller" data-collapse-host>${o.noLt ? '' : `<div class="lt"><h1>${title}</h1>${o.sub ? `<p>${o.sub}</p>` : ''}</div>`}${body}<div style="height:40px"></div></div>${o.stick || ''}`;
}
function tabTop(t) {
  return `<header class="bar"><button class="ib nodrag" data-sheet="menu" aria-label="You"><span class="avring">${PERSON(D.me.name, 260, 30)}</span></button><div class="bt">${t}</div>
    <div class="ba">${ib('search', 'data-toast="Search everything nearby"')}${ib('bell', 'data-go="notifications" aria-label="Notifications"', true)}${ib('msg', 'data-go="messages" aria-label="Messages"', true)}</div></header>`;
}
const cityLine = `<button class="citybtn nodrag" data-sheet="city">${I('pin', 15)}${D.city}${I('down', 14)}</button>`;
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
  return `<a href="#" class="card feat rv press" data-flip ${go('listing-detail', { id: l.id })}>${photo(l.img, '', 800, 560, 'data-flip-img')}
    <div class="ov" style="left:18px;top:18px">${l.fresh ? '<span class="tag dark">✦ New</span>' : ''}</div><button class="save sv nodrag" data-save style="position:absolute;right:16px;top:16px;background:var(--glass);color:var(--text);backdrop-filter:blur(12px)">${I('bookmark', 19)}</button>
    <div class="bd"><div style="display:flex;align-items:baseline;justify-content:space-between"><h3 style="margin:0;font-size:18px">${l.title}</h3></div>
    <div class="meta" style="margin-top:6px"><span class="price" style="font-size:19px;color:var(--text)">${money(l.price)}<small>/mo</small></span><span>${l.area}</span><span>${facts(l).slice(0, 2).join(' · ')}</span></div></div></a>`;
}
const tcard = (l, to = 'listing-detail') => `<a href="#" class="tcard rv press" data-flip ${go(to, { id: l.id })}><span style="position:relative;display:block">${photo(l.img, '', 400, 400, 'data-flip-img')}<span class="pc">${money(l.price)}</span></span><h3 class="ell">${l.title}</h3><div class="meta small"><span>${l.area}</span></div></a>`;
function rowCard(l) {
  return `<a href="#" class="row rv press" data-flip ${go('listing-detail', { id: l.id })}>${photo(l.img, '', 300, 260, 'data-flip-img')}<div class="tx"><div class="price" style="font-size:17px">${money(l.price)}<small> /mo</small></div><h3 class="ell">${l.title}</h3><div class="meta small"><span>${l.area}</span><span>· ${facts(l).slice(0, 2).join(' · ')}</span></div></div><button class="save nodrag" data-save>${I('bookmark', 19)}</button></a>`;
}
function qCard(q) {
  return `<a href="#" class="qbubble rv press" ${go('question-detail', { id: q.id })}><div class="meta small">${PERSON(q.by, q.hue, 24)}<span><b style="color:var(--text)">${q.by.split(' ')[0]}</b> · ${q.time}</span><span class="tag" style="margin-left:auto">${q.cat}</span></div><p>${q.q}</p>
    <div class="acts" style="margin:0 -6px"><button class="vote nodrag" data-act="upvote">${I('up', 16)}<b>${q.votes}</b></button><button>${I('msg', 18)}${q.answers.length || 'Answer first'}</button><button class="nodrag" style="margin-left:auto" data-sheet="more">${I('more')}</button></div></a>`;
}

/* ---------- sign in ---------- */
screen('login', { group: 'Sign in', title: 'Sign in', kind: 'root', render: () => `<div class="scroller"><div class="auth">
  <div class="logo rv"><i style="background:linear-gradient(135deg,var(--accent),var(--pink));border-radius:14px">✦</i>comlinkr</div>
  <h1 class="rv" style="font-size:40px;line-height:1;letter-spacing:-.035em">New city.<br><span style="background:linear-gradient(90deg,var(--accent-text),var(--mint));-webkit-background-clip:text;background-clip:text;color:transparent">Your people.</span></h1>
  <p class="muted rv" style="margin:0 0 22px">Homes, food and friends, around the corner.</p>
  <div class="rv" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><button class="btn ghost" data-toast="Google sign-in needs a development build">${I('google', 20)} Google</button><button class="btn ghost" data-toast="Apple sign-in on iPhone">${I('apple', 20)} Apple</button></div>
  <div class="or rv">or with email</div>
  <div class="rv">${field('Email or username', inp('you@example.com', '', 'mail'))}${field('Password', `<div class="input">${I('lock', 19)}<input type="password" placeholder="Your password"></div>`)}</div>
  <div class="rv" style="text-align:right;margin:-4px 0 16px"><button class="link small" data-go="forgot">Forgot it?</button></div>
  <button class="btn pri block rv" data-act="signin">Let’s go</button>
  <p class="muted rv" style="text-align:center;margin-top:auto;padding-top:22px">New? <button class="link" data-go="signup">Create an account</button> · <button class="link" data-go="explore">Peek inside</button></p></div></div>` });
screen('signup', { group: 'Sign in', title: 'Create account', render: () => page('Hi there 👋', `<div class="pad">
  <button class="btn ghost block rv" data-toast="Google sign-in needs a development build">${I('google', 20)} Sign up with Google</button><div class="or rv">or</div>
  <div class="rv">${field('Your name', inp('First and last name', '', 'user'))}${field('Email', inp('you@example.com', '', 'mail', 'email'))}${field('Username', inp('e.g. jordanlee', '', 'user'), `${I('check')} Available`)}${field('Password', `<div class="input">${I('lock', 19)}<input type="password" placeholder="At least 8 characters"></div>`, '8+ characters · a number · a capital')}</div>
  <label class="rv" style="display:flex;gap:10px;align-items:flex-start;margin:4px 0 18px;font-size:14px;color:var(--text2)"><span class="sw on" data-act="sw" style="transform:scale(.8);transform-origin:0 0"></span> I agree to the <button class="link" data-go="legal">Terms</button> and <button class="link" data-go="legal">Privacy</button>.</label>
  <button class="btn pri block rv" data-go="otp">Send my code</button></div>`, { sub: 'Make an account in a minute.' }) });
const otpBoxes = (next) => `<div class="otp" data-next="${next}">${[0, 1, 2, 3, 4, 5].map(() => '<label><input inputmode="numeric" autocomplete="one-time-code" maxlength="1" aria-label="Digit"></label>').join('')}</div><div class="otp-msg">Any code works here except 000000.</div>`;
screen('otp', { group: 'Sign in', title: 'Verify email (OTP)', render: () => page('Enter the code', `<div class="pad"><div class="rv" style="margin:18px 0 6px">${otpBoxes('onboarding')}</div>
  <p class="rv muted small" style="text-align:center;margin-top:22px">Nothing yet? <button class="link" data-act="resend">Resend in <span class="cd">0:30</span></button></p></div>`, { sub: 'Sent to jordan@example.com' }),
  mount: (el) => { let s = 30; const c = $('.cd', el); const t = setInterval(() => { if (!document.body.contains(el)) return clearInterval(t); s = Math.max(0, s - 1); c.textContent = '0:' + String(s).padStart(2, '0'); }, 1000); } });
screen('forgot', { group: 'Sign in', title: 'Forgot password', render: () => page('Reset it', `<div class="pad" data-segroot>
  <div data-panel="a">${field('Email', inp('you@example.com', 'jordan@example.com', 'mail'))}<button class="btn pri block" data-act="fpnext">Send a code</button></div>
  <div data-panel="b" hidden>${otpBoxes('login')}<div style="height:18px"></div>${field('New password', `<div class="input">${I('lock', 19)}<input type="password" placeholder="At least 8 characters"></div>`)}</div></div>`, { sub: 'Code, then a new password. Same screen.' }) });

/* ---------- onboarding ---------- */
const CULT = [['Korean', '🇰🇷'], ['Mexican', '🇲🇽'], ['Indian', '🇮🇳'], ['Chinese', '🇨🇳'], ['Filipino', '🇵🇭'], ['Italian', '🇮🇹'], ['Nigerian', '🇳🇬'], ['Brazilian', '🇧🇷']];
const INTS = ['Food & dining', 'Nightlife', 'Outdoors', 'Fitness', 'Jobs & careers', 'Music', 'Art', 'Volunteering', 'Shopping', 'Faith', 'Sports', 'Tech'];
screen('onboarding', { group: 'Sign in', title: 'Onboarding (5 steps)', kind: 'root', render: () => `<header class="bar solid" style="background:transparent;border:0"><button class="ib" data-act="obback" aria-label="Back">${I('back')}</button><div class="dots" style="margin:0 auto">${[0, 1, 2, 3, 4].map((i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div><button class="link" data-act="obskip" style="padding:0 12px;visibility:hidden">Skip</button></header>
  <div style="position:relative;flex:1" data-obi="0">
   <div class="obstep" data-ob="0"><h1 class="qbig">Where do you live now?</h1><p class="muted" style="margin:0 0 18px">We guessed from your phone.</p><div class="bt-tile hello rv" style="min-height:110px"><i class="glow"></i><small>YOUR CITY</small><div class="tt" style="font-size:24px">Los Angeles</div><small>California · United States</small></div><div style="height:14px"></div>${field('Neighbourhood (optional)', inp('e.g. Echo Park', '', 'home'))}</div>
   <div class="obstep" data-ob="1" hidden><h1 class="qbig">Where are you from?</h1><p class="muted" style="margin:0 0 18px">Pick any. We’ll find your people.</p><div class="tiles">${CULT.map(([n, f]) => `<button class="tile" data-act="tile"><span style="font-size:24px">${f}</span><b>${n}</b></button>`).join('')}</div></div>
   <div class="obstep" data-ob="2" hidden><h1 class="qbig">What are you into?</h1><p class="muted" style="margin:0 0 18px">Three or more.</p><div class="cflow">${INTS.map((n) => `<button class="chip" data-toggle>${n}</button>`).join('')}</div></div>
   <div class="obstep" data-ob="3" hidden><h1 class="qbig">Join a crew</h1><p class="muted" style="margin:0 0 18px">Optional.</p>${['Korean in LA · 1.2k', 'Indian in LA · 3.4k', 'New grads LA · 860', 'Dog owners Echo Park · 410'].map((c) => `<div class="gl" style="background:var(--surface);border-radius:20px;margin-bottom:8px"><span class="gi">${I('users')}</span><span class="gt">${c}</span><button class="btn sm sec" data-act="join">Join</button></div>`).join('')}</div>
   <div class="obstep" data-ob="4" hidden><div style="text-align:center;padding-top:50px"><div class="ck" style="width:90px;height:90px;border-radius:30px;margin:0 auto 18px;display:grid;place-items:center;background:var(--mint);color:#06130D">${I('check', 44)}</div><h1 class="qbig">You’re in, Jordan ✦</h1><p class="muted">24 homes, 12 places to eat and 5 questions are waiting.</p><label class="agree" style="display:flex;gap:10px;align-items:center;justify-content:center;margin-top:22px;font-size:14px">${sw(false)} <span>I agree to the <button class="link" data-go="legal">Terms</button> and <button class="link" data-go="legal">Privacy Policy</button></span></label></div></div>
  </div><div style="padding:12px 22px 34px"><button class="btn pri block" data-act="obnext"><span>Continue</span></button></div>` });

/* ---------- the four tabs: bento ---------- */
screen('explore', { group: 'Explore', title: 'Explore (bento)', kind: 'tab', tab: 'explore', render: () => { const e = D.events[0], q = D.questions[3];
  return `${tabTop('Explore')}<div class="scroller" data-collapse-host data-segroot><div class="lt"><h1>Explore</h1></div>
  <div class="bento">
    <div class="bt-tile hello wide rv"><i class="glow"></i><small>WED 5 NOV · 12:19 · 21°</small><div class="tt" style="font-size:26px;margin:6px 0 10px">Good afternoon,<br>Jordan</div><div style="margin-top:auto">${cityLine}</div></div>
    <a href="#" class="bt-tile img tall rv press" data-flip ${go('event-detail', { id: e.id })}>${photo(e.img, '', 400, 600, 'data-flip-img')}<small>NEXT UP · ${e.day} ${e.time.split('–')[0]}</small><div class="tt">${e.title}</div><small>${e.going} going</small></a>
    <button class="bt-tile mint rv press" data-tab="1"><small>NEW HOMES THIS WEEK</small><b class="big">24</b></button>
    <a href="#" class="bt-tile rv press" ${go('question-detail', { id: q.id })}><small>🔥 HOT QUESTION</small><div class="tt" style="font-size:15px">${q.q}</div></a>
    <div class="bt-tile wide rv" style="min-height:0"><small>STORIES NEARBY</small><div class="hs" data-hscroll style="gap:12px;margin-top:10px"><button data-go="compose-story" style="text-align:center"><span style="width:56px;height:56px;border-radius:50%;display:grid;place-items:center;border:2px dashed var(--line2)">${I('plus')}</span><small>You</small></button>${D.stories.map((s, i) => `<button ${go('story-viewer', { i })} style="text-align:center"><span class="avring">${PERSON(s.by, s.hue, 51)}</span><small style="display:block;margin-top:3px">${s.by.split(' ')[0]}</small></button>`).join('')}</div></div>
    <div class="bt-tile rv"><small>QUEST · TACO TRAIL</small><b class="big" style="font-size:30px">2<span style="font-size:18px;color:var(--text3)">/5</span></b><div class="bar2" style="margin-top:8px"><i style="width:40%"></i></div></div>
    <button class="bt-tile rv press" data-show-tab="polls" data-act="gopolls"><small>POLL · TRANSIT</small><div class="tt" style="font-size:15px">Car, or Metro and bike?</div><small style="margin-top:auto">212 voted</small></button>
  </div>
  ${seg([['news', 'News'], ['events', 'Events'], ['stories', 'Stories'], ['quests', 'Quests'], ['polls', 'Polls']], 'scroll')}
  <div data-panel="news">${chips(['For you', 'Local', 'Neighbours', 'National'])}${D.news.map((n, i) => i === 0 ? `<a href="#" class="card feat rv press" style="margin:0 16px 12px" data-toast="Opens the article">${photo(n.img, '', 800, 560)}<div class="bd"><div class="meta small"><span class="tag">${n.scope}</span><span>${n.src} · ${n.time}</span></div><h3 style="font-size:18px;margin:8px 0 4px">${n.title}</h3><div class="acts" style="margin:0 -10px -6px"><button class="nodrag" data-like>${I('heart', 19)}<b>48</b></button><button class="nodrag" data-save style="margin-left:auto">${I('bookmark', 19)}</button></div></div></a>` : `<a href="#" class="row rv press" data-toast="Opens the article">${photo(n.img, '', 300, 260)}<div class="tx"><div class="meta small"><span>${n.src} · ${n.time}</span></div><h3 style="margin-top:3px">${n.title}</h3></div></a>`).join('')}
    ${h2('Neighbours say', 'Post', 'data-go="compose-news"')}${D.posts.map((p) => `<a href="#" class="qbubble rv press" ${go('post-detail', { id: p.id })}><div class="meta small">${PERSON(p.by, p.hue, 24)}<b style="color:var(--text)">${p.by}</b><span>· ${p.time}</span></div><p>${p.title}</p><div class="muted small">${p.body}</div><div class="acts" style="margin:8px -6px 0"><button class="nodrag" data-like>${I('heart', 18)}<b>${p.likes}</b></button><button>${I('msg', 18)}${p.comments}</button></div></a>`).join('')}</div>
  <div data-panel="events" hidden><div class="datestrip" data-hscroll>${['FRI 7', 'SAT 8', 'SUN 9', 'MON 10', 'SAT 15'].map((d, i) => `<button class="${i ? '' : 'on'}" data-act="day"><small>${d.split(' ')[0]}</small><b>${d.split(' ')[1]}</b></button>`).join('')}</div><div class="tgrid">${D.events.map((x) => `<a href="#" class="tcard rv press" data-flip ${go('event-detail', { id: x.id })}><span style="position:relative;display:block">${photo(x.img, '', 400, 400, 'data-flip-img')}<span class="pc">${x.day} ${x.date.split(' ')[1]}</span></span><h3>${x.title}</h3><div class="meta small"><span>${x.going} going · ${x.price}</span></div></a>`).join('')}</div>
    <div class="pad rv" style="margin-top:14px"><button class="btn sec block" data-go="compose-event">${I('plus', 19)} Host an event</button></div></div>
  <div data-panel="stories" hidden><div class="storygrid"><button class="stile add rv" data-go="compose-story"><div>${I('camera', 30)}<div style="font-weight:700;margin-top:6px">Add a story</div></div></button>${D.stories.map((s, i) => `<button class="stile rv press" ${go('story-viewer', { i })}>${photo(s.img, '', 400, 600)}${PERSON(s.by, s.hue, 30)}<span class="t">${s.title}</span></button>`).join('')}</div></div>
  <div data-panel="quests" hidden><div class="bento">${D.quests.map((q, i) => `<div class="bt-tile ${i ? '' : 'wide img'} rv" ${i ? '' : 'style="min-height:170px"'}>${i ? '' : photo(q.img, '', 800, 400)}<small>${q.kind.toUpperCase()} · ${q.left}</small><div class="tt">${q.title}</div><small style="margin:4px 0 10px">${I('trophy', 13)} ${q.reward} · ${q.joined} in</small><button class="btn sm ${q.progress ? 'ghost' : 'pri'}" style="margin-top:auto;align-self:flex-start" data-act="join">${q.progress ? 'Continue' : 'Join'}</button></div>`).join('')}</div><div class="pad"><button class="btn sec block rv" data-go="compose-quest">${I('plus', 19)} Start a quest</button></div></div>
  <div data-panel="polls" hidden><div class="card qcard rv" data-poll="0" style="margin:0 16px;padding:16px"><div class="meta small"><span class="tag">${D.poll[0].tag}</span><span>Question 1 of 3</span></div><p style="font-family:var(--font-display);font-size:20px;font-weight:700;margin:10px 0 14px">${D.poll[0].q}</p>
    <button class="pollopt" data-act="vote"><i></i><span>${D.poll[0].a}</span><b>64%</b></button><button class="pollopt" data-act="vote"><i></i><span>${D.poll[0].b}</span><b>36%</b></button>
    <div class="meta small" style="justify-content:space-between;margin-top:6px"><span>212 voted</span><button class="link" data-act="nextpoll">Next →</button></div></div></div>
  </div>`; } });
screen('listings', { group: 'Listings', title: 'Homes, rooms, roommates', kind: 'tab', tab: 'listings', render: () => `${tabTop('Homes')}<div class="scroller" data-collapse-host data-segroot><div class="lt"><h1>Homes</h1><p>${cityLine}</p></div>
  ${seg([['homes', 'Places'], ['rooms', 'Rooms'], ['mates', 'Roommates']])}
  <div data-panel="homes"><div style="display:flex;align-items:center;padding-right:16px">${chips(['All', 'Apartment', 'House', 'Studio'])}<button class="ib nodrag" style="margin:-12px 0 0 auto;flex:none" data-sheet="filters">${I('sliders')}</button></div>
    ${featCard(D.listings[0])}<div class="tgrid" style="margin-top:4px">${D.listings.slice(1).map((l) => tcard(l)).join('')}</div>
    <button class="bt-tile wide rv press" style="margin:16px;min-height:0;flex-direction:row;align-items:center;gap:12px;width:calc(100% - 32px)" data-sheet="safety"><span class="gi" style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--mint-soft);color:var(--mint)">${I('shield')}</span><span><b>Rent safely</b><small style="display:block">6 quick checks before you pay</small></span></button></div>
  <div data-panel="rooms" hidden><div class="tgrid">${D.rooms.map((r) => `<a href="#" class="tcard rv press" data-flip ${go('room-detail', { id: r.id })}><span style="position:relative;display:block">${photo(r.img, '', 400, 400, 'data-flip-img')}<span class="pc">${money(r.price)}</span></span><h3>${r.title}</h3><div class="meta small"><span>${r.spots} free · ${r.mates} mates</span></div></a>`).join('')}</div>
    <div class="pad rv" style="margin-top:14px"><button class="btn sec block" data-go="compose-room">${I('key', 19)} Rent out a room</button></div></div>
  <div data-panel="mates" hidden>${D.mates.map((m) => `<a href="#" class="card rv press" style="display:flex;gap:14px;align-items:center;margin:0 16px 10px;padding:14px" ${go('roommate-detail', { id: m.id })}><span class="avring">${PERSON(m.name, m.hue, 54)}</span><div style="flex:1;min-width:0"><b style="font-family:var(--font-display);font-size:17px">${m.name}, ${m.age}</b><div class="meta small"><span>${m.job} · ${m.budget}</span></div><div class="cflow" style="gap:4px;margin-top:6px">${m.common.slice(0, 2).map((c) => `<span class="tag ok">${c}</span>`).join('')}</div></div><b style="font-family:var(--font-display);font-size:26px;color:var(--mint)">${m.match}%</b></a>`).join('')}</div>
  </div>` });
screen('food', { group: 'Food', title: 'Food (bento)', kind: 'tab', tab: 'food', render: () => { const f = D.food[4];
  return `${tabTop('Food')}<div class="scroller" data-collapse-host><div class="lt"><h1>Food</h1><p>${cityLine}</p></div>
  <div class="pad rv" style="margin-bottom:12px">${inp('Tacos, ramen, dosa…', '', 'search')}</div>
  <div class="bento"><a href="#" class="bt-tile img wide rv press" style="min-height:190px" data-flip ${go('restaurant-detail', { id: f.id })}>${photo(f.img, '', 800, 500, 'data-flip-img')}<small>PICK OF THE WEEK · ${f.area.toUpperCase()}</small><div class="tt" style="font-size:22px">${f.name}</div><small>★ ${f.rating} · ${f.cuisine} · ${f.price}</small></a>
    <button class="bt-tile mint rv press" data-toast="Showing places open now"><small>OPEN NOW</small><b class="big">9</b></button><button class="bt-tile rv press" data-toast="Showing places under $15"><small>UNDER $15</small><b class="big">5</b></button></div>
  ${chips(['All', 'Mexican', 'Indian', 'Japanese', 'Korean', 'Italian'])}<div class="tgrid">${D.food.slice(0, 4).map((x) => `<a href="#" class="tcard rv press" data-flip ${go('restaurant-detail', { id: x.id })}><span style="position:relative;display:block">${photo(x.img, '', 400, 400, 'data-flip-img')}<span class="pc">★ ${x.rating}</span></span><h3>${x.name}</h3><div class="meta small"><span>${x.cuisine} · ${x.price}</span></div></a>`).join('')}</div></div>`; } });
screen('community', { group: 'Community', title: 'People (Q&A)', kind: 'tab', tab: 'community', render: () => `${tabTop('People')}<div class="scroller" data-collapse-host><div class="lt"><h1>Ask people</h1><p>Locals answer, usually within the hour.</p></div>
  <button class="askbox rv nodrag" data-sheet="ask"><span class="avring">${PERSON(D.me.name, 260, 28)}</span><span style="flex:1;text-align:left">Ask anything about LA…</span><span class="btn sm pri">Ask</span></button>
  ${chips(['All', 'Housing', 'Food', 'Transit', 'Events', 'Jobs', 'Paperwork'])}${D.questions.map(qCard).join('')}</div>` });
