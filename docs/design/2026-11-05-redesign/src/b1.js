/* ===== B · Paper — part 1: shell, helpers, sign-in, onboarding, the four tabs ===== */
const V = {
  start: 'login', push: 'rise',
  tabs: [
    { id: 'explore', label: 'Today', icon: 'compass' },
    { id: 'listings', label: 'Homes', icon: 'home' },
    { id: 'food', label: 'Food', icon: 'food' },
    { id: 'community', label: 'Ask', icon: 'users' },
  ],
  renderShell() {
    return `<div class="shell" style="height:100%;position:relative">
      <div class="track" style="height:100%">${this.tabs.map((t) => `<div class="pane" data-pane="${t.id}"></div>`).join('')}</div>
      <nav class="tabbar"><i class="tabpill"></i>${this.tabs.map((t, i) => `<button class="nodrag" data-tab="${i}">${I(t.icon, 21)}<span>${t.label}</span></button>`).join('')}</nav>
      <button class="fab nodrag" data-act="fab" aria-label="Post">${I('plus', 26)}<span></span></button></div>`;
  },
  onTab(p, sh, settled) {
    const bar = $('.tabbar', sh); if (!bar) return;
    const btns = $$('button', bar), w = btns[0].offsetWidth, pill = $('.tabpill', bar);
    pill.style.width = w + 'px';
    pill.style.transition = settled && !RM() ? `transform 460ms ${EASE}` : 'none';
    pill.style.transform = `translateX(${p * w}px)`;
    const i = Math.round(p); btns.forEach((b, k) => b.classList.toggle('on', k === i));
  },
  skeleton() {
    const r = (h, w = '100%', m = 10) => `<div class="sk" style="height:${h}px;width:${w};margin-bottom:${m}px;border-radius:4px"></div>`;
    return `<div class="skel" style="padding-top:96px">${r(12, '50%', 14)}${r(46, '70%', 18)}${r(2, '100%', 18)}${r(240, '100%', 14)}${r(28, '90%', 8)}${r(28, '60%', 20)}${[1, 2].map(() => `${r(1, '100%', 14)}<div style="display:flex;gap:14px;margin-bottom:14px"><div style="flex:1">${r(18, '95%', 8)}${r(18, '70%')}</div><div class="sk" style="width:96px;height:96px;border-radius:4px"></div></div>`).join('')}</div>`;
  },
  motion: {
    default: ['Push: the new page rises 40 px → 0 and fades in (withTiming 440 ms, Easing.out(cubic)); the page behind lifts 12 px and fades to 35%. Calm, like turning to the next page.', 'Back: the reverse, 360 ms. Edge swipe still works.', 'Press: opacity 0.7 and scale 0.98, 160 ms.'],
    tabs: ['Tabs: the pane follows the finger; the lime pill in the ink capsule slides with the drag and settles with withTiming 460 ms.', 'First load: a paper-coloured skeleton, then headline, rule and stories rise in one after another (FadeInDown, 45 ms apart).', 'The underline under the section tabs slides and resizes to the chosen word (withTiming 380 ms).', 'Large serif title fades as you scroll; the bar keeps a small serif title and a 2 px ink rule.'],
    detail: ['The photo slides up into place with the page (no shared element: the paper style prefers a quiet page turn).', 'Facts and paragraphs rise in, 45 ms apart.', 'Save: the bookmark fills with ink and bounces once.'],
    sheet: ['Sheets rise with withSpring({ damping: 22, stiffness: 220 }); paper colour, a hairline at the top.'],
    otp: ['Digits sit on underlines. Each digit drops in: scale 0.86 → 1.08 → 1 (260 ms).', 'Wrong code: the row shakes and the underlines turn tomato, then clear.', 'Right code: underlines turn green one by one, then onboarding rises in.'],
    compose: ['One page. Optional facts are dashed "+ Deposit" chips: tap one and it unfolds into a field in place (height and opacity, 300 ms), and the chip leaves the list.', 'Photos are a strip at the top; each new photo springs in from 0.6.', 'Publish: a lime tick draws itself.'],
  },
  act(a, t) { ACT[a] && ACT[a](t); },
};
['explore', 'listings', 'food', 'community'].forEach((k) => (V.motion[k] = V.motion.tabs));
['listing-detail', 'restaurant-detail', 'event-detail', 'room-detail'].forEach((k) => (V.motion[k] = V.motion.detail));
['compose', 'menu', 'event-register', 'review', 'ask', 'apply'].forEach((k) => (V.motion[k] = V.motion.sheet));
['compose-listing', 'compose-room', 'compose-restaurant', 'compose-event', 'compose-story', 'compose-quest', 'compose-news', 'compose-review'].forEach((k) => (V.motion[k] = V.motion.compose));
V.motion.onboarding = ['Each step rises from 28 px to place with a fade; the question is a big serif line.', 'Chosen tiles fill lime with an ink border (scale 0.94 → 1).'];
V.motion['story-viewer'] = ['Bars fill over 5 s; tap the sides to move; the photo cross-fades and settles from 1.04 scale.'];
V.motion.chat = ['Sent messages pop from their corner (scale 0.6 → 1, withSpring({ damping: 16 })).'];
V.motion['roommate-detail'] = ['The match ring sweeps to the score over 900 ms; the serif number counts up with it.'];

/* ---------- helpers (same names as A, paper markup) ---------- */
const BACK = `<button class="ib" data-back aria-label="Back">${I('back')}</button>`;
const ib = (icon, attrs = '', dot = false) => `<button class="ib nodrag" ${attrs}>${I(icon)}${dot ? '<i class="dot"></i>' : ''}</button>`;
function bar(title, right = '', o = {}) { return `<header class="bar ${o.solid ? 'solid' : ''}">${o.noback ? '' : BACK}<div class="bt">${title}</div><div class="ba">${right}</div></header>`; }
function page(title, body, o = {}) {
  return bar(o.barTitle || title, o.right || '', o) +
    `<div class="scroller" data-collapse-host>${o.noLt ? '' : `<div class="lt"><h1>${title}</h1>${o.sub ? `<p>${o.sub}</p>` : ''}</div><div class="rule rv" style="margin-bottom:16px"></div>`}${body}<div style="height:40px"></div></div>${o.stick || ''}`;
}
const today = 'Wed 5 Nov';
function tabTop(t) {
  return `<header class="bar"><button class="ib nodrag" data-sheet="menu" aria-label="You">${PERSON(D.me.name, 25, 32)}</button><div class="bt">${t}</div>
    <div class="ba">${ib('search', 'data-toast="Search the city"')}${ib('bell', 'data-go="notifications" aria-label="Notifications"', true)}${ib('msg', 'data-go="messages" aria-label="Messages"', true)}</div></header>`;
}
const cityLine = `<button class="citybtn nodrag" data-sheet="city">${D.city} ▾</button><span>· ${today} · ${D.cityTime}</span>`;
const dateline = `<div class="dateline rv">${cityLine}</div>`;
const seg = (items, cls = '') => `<div class="seg ${cls}" data-hscroll><i class="seg-ind"></i>${items.map((x, i) => `<button class="${i ? '' : 'on'}" data-show="${x[0]}">${x[1]}</button>`).join('')}</div>`;
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
  return `<a href="#" class="card feat rv press" ${go('listing-detail', { id: l.id })}>${photo(l.img, '', 800, 600, 'data-flip-img')}
    <button class="save sv nodrag" data-save aria-label="Save" style="position:absolute;right:10px;top:10px">${I('bookmark', 19)}</button>
    <div class="bd"><div class="kicker">${l.type} · ${l.area}${l.fresh ? ' · New' : ''}</div><h3>${l.title}</h3>
    <div class="meta"><span class="price" style="font-size:20px;color:var(--text)">${money(l.price)}<small style="font-family:var(--font-body)"> a month</small></span>${facts(l).map((f) => `<span>· ${f}</span>`).join('')}</div></div></a>`;
}
function rowCard(l) {
  return `<a href="#" class="row rv press" ${go('listing-detail', { id: l.id })}><div class="tx"><div class="kicker">${l.type} · ${l.area}</div><h3>${l.title}</h3>
    <div class="meta small"><b style="color:var(--text);font-size:15px">${money(l.price)}</b><span>· ${facts(l).slice(0, 2).join(' · ')}</span></div>
    <div class="meta small" style="margin-top:2px"><span>${l.avail === 'Now' ? 'Available now' : 'From ' + l.avail}</span>${l.verified ? '<span>· verified host</span>' : ''}</div></div>${photo(l.img, '', 300, 300, 'data-flip-img')}</a>`;
}
function qCard(q) {
  return `<a href="#" class="card qcard rv press" ${go('question-detail', { id: q.id })}><div class="kicker" style="margin-bottom:6px">${q.cat}</div><p style="margin:0 0 8px">${q.q}</p>
    <div class="byline">${PERSON(q.by, q.hue, 22)}<span>${q.by} · ${q.time} ago</span></div>
    <div class="acts" style="margin:8px -6px 0"><button class="vote nodrag" data-act="upvote">${I('up', 16)}<b>${q.votes}</b></button><button>${q.answers.length ? q.answers.length + ' answers' : 'No answers yet — be first'}</button><button class="nodrag" style="margin-left:auto" data-sheet="more" aria-label="More">${I('more')}</button></div></a>`;
}

/* ---------- sign in ---------- */
screen('login', { group: 'Sign in', title: 'Sign in', kind: 'root', render: () => `<div class="scroller"><div class="auth" style="padding-top:70px">
  <div class="dateline rv" style="padding:0">The Comlinkr · ${D.city} edition</div><div class="rule rv" style="margin:8px 0 0"></div>
  <h1 class="rv" style="font-size:46px;font-weight:600;line-height:.98;margin:22px 0 10px">Your new city,<br><em style="font-weight:400">already</em> <mark>neighbourly</mark>.</h1><p class="muted rv" style="margin:0 0 22px">Homes, food and people around you.</p>
  <div class="rv" style="display:grid;gap:10px"><button class="btn ghost block" data-toast="Google sign-in needs a development build">${I('google', 20)} Continue with Google</button><button class="btn ghost block" data-toast="Apple sign-in on iPhone">${I('apple', 20)} Continue with Apple</button></div>
  <div class="or rv">or</div>
  <div class="rv">${field('Email or username', inp('you@example.com', '', 'mail'))}${field('Password', `<div class="input">${I('lock', 19)}<input type="password" placeholder="Your password"></div>`)}</div>
  <div class="rv" style="display:flex;justify-content:space-between;align-items:center;margin:2px 0 18px"><button class="link small" data-go="forgot" style="color:var(--text);text-decoration:underline">Forgot password?</button></div>
  <button class="btn pri block rv" data-act="signin">Sign in</button>
  <p class="rv" style="text-align:center;margin-top:auto;padding-top:22px">New here? <button data-go="signup" style="text-decoration:underline;font-weight:600">Create an account</button> · <button data-go="explore" style="text-decoration:underline">Look around</button></p></div></div>` });
screen('signup', { group: 'Sign in', title: 'Create account', render: () => page('Join <em>in</em>', `<div class="pad" style="padding:0 18px">
  <button class="btn ghost block rv" data-toast="Google sign-in needs a development build">${I('google', 20)} Sign up with Google</button><div class="or rv">or with email</div>
  <div class="rv">${field('Your name', inp('First and last name', '', 'user'))}${field('Email', inp('you@example.com', '', 'mail', 'email'))}${field('Username', inp('e.g. jordanlee', '', 'user'), `${I('check')} Available`)}${field('Password', `<div class="input">${I('lock', 19)}<input type="password" placeholder="At least 8 characters"></div>`, '8+ characters · a number · a capital')}</div>
  <label class="rv" style="display:flex;gap:10px;align-items:flex-start;margin:4px 0 18px;font-size:14px;color:var(--text2)"><span class="sw on" data-act="sw" style="transform:scale(.8);transform-origin:0 0"></span> I agree to the <button data-go="legal" style="text-decoration:underline">Terms</button> and <button data-go="legal" style="text-decoration:underline">Privacy Policy</button>.</label>
  <button class="btn pri block rv" data-go="otp">Email me a code</button></div>`, { sub: 'One minute. Then a 6-digit code by email.' }) });
const otpBoxes = (next) => `<div class="otp" data-next="${next}">${[0, 1, 2, 3, 4, 5].map(() => '<label><input inputmode="numeric" autocomplete="one-time-code" maxlength="1" aria-label="Digit"></label>').join('')}</div><div class="otp-msg">Any code works here except 000000.</div>`;
screen('otp', { group: 'Sign in', title: 'Verify email (OTP)', render: () => page('Check your <em>inbox</em>', `<div style="padding:10px 18px 0"><div class="rv">${otpBoxes('onboarding')}</div>
  <p class="rv muted small" style="text-align:center;margin-top:22px">No email? <button style="text-decoration:underline" data-act="resend">Send again in <span class="cd">0:30</span></button></p></div>`, { sub: 'Sent to jordan@example.com' }),
  mount: (el) => { let s = 30; const c = $('.cd', el); const t = setInterval(() => { if (!document.body.contains(el)) return clearInterval(t); s = Math.max(0, s - 1); c.textContent = '0:' + String(s).padStart(2, '0'); }, 1000); } });
screen('forgot', { group: 'Sign in', title: 'Forgot password', render: () => page('New <em>password</em>', `<div style="padding:0 18px" data-segroot>
  <div data-panel="a">${field('Email', inp('you@example.com', 'jordan@example.com', 'mail'))}<button class="btn pri block" data-act="fpnext">Email me a code</button></div>
  <div data-panel="b" hidden>${otpBoxes('login')}<div style="height:18px"></div>${field('New password', `<div class="input">${I('lock', 19)}<input type="password" placeholder="At least 8 characters"></div>`)}</div></div>`, { sub: 'A code, then a new password, on one page.' }) });

/* ---------- onboarding (5 steps) ---------- */
const CULT = [['Korean', '🇰🇷'], ['Mexican', '🇲🇽'], ['Indian', '🇮🇳'], ['Chinese', '🇨🇳'], ['Filipino', '🇵🇭'], ['Italian', '🇮🇹'], ['Nigerian', '🇳🇬'], ['Brazilian', '🇧🇷']];
const INTS = ['Food & dining', 'Nightlife', 'Outdoors', 'Fitness', 'Jobs & careers', 'Music', 'Art', 'Volunteering', 'Shopping', 'Faith', 'Sports', 'Tech'];
const obQ = (n, q, s) => `<div style="padding:4px 0 18px"><div class="kicker">Question ${n} of 4</div><h1 class="serif" style="font-size:36px;line-height:1.02;font-weight:600;margin:8px 0 6px">${q}</h1><p class="muted" style="margin:0">${s}</p></div>`;
screen('onboarding', { group: 'Sign in', title: 'Onboarding (5 steps)', kind: 'root', render: () => `<header class="bar solid" style="background:transparent;border:0"><button class="ib" data-act="obback" aria-label="Back">${I('back')}</button><div class="dots" style="margin:0 auto">${[0, 1, 2, 3, 4].map((i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div><button data-act="obskip" style="padding:0 14px;text-decoration:underline;visibility:hidden">Skip</button></header>
  <div style="position:relative;flex:1" data-obi="0">
   <div class="obstep" data-ob="0">${obQ(1, 'Where are you <em style="font-weight:400">living</em>?', 'Filled in from your phone.')}<div class="prefill rv">${I('pin')}<div><b>Los Angeles</b>, California, United States<div class="small muted">From your phone’s location</div></div></div><div style="height:14px"></div>${field('Neighbourhood (optional)', inp('e.g. Echo Park', '', 'home'))}</div>
   <div class="obstep" data-ob="1" hidden>${obQ(2, 'Where are you <em style="font-weight:400">from</em>?', 'Pick any; it helps us find your people.')}<div class="tiles">${CULT.map(([n, f]) => `<button class="tile" data-act="tile"><span style="font-size:24px">${f}</span><b>${n}</b></button>`).join('')}</div></div>
   <div class="obstep" data-ob="2" hidden>${obQ(3, 'What are you <em style="font-weight:400">into</em>?', 'Three or more.')}<div class="cflow">${INTS.map((n) => `<button class="chip" data-toggle>${n}</button>`).join('')}</div></div>
   <div class="obstep" data-ob="3" hidden>${obQ(4, 'Join a <em style="font-weight:400">circle</em>', 'Optional; you can join later.')}${['Korean in LA · 1.2k', 'Indian in LA · 3.4k', 'New grads LA · 860', 'Dog owners Echo Park · 410'].map((c) => `<div class="gl" style="border-bottom:1px solid var(--line2)"><span class="gt" style="font-family:var(--font-display);font-size:17px">${c}</span><button class="btn sm ghost" data-act="join">Join</button></div>`).join('')}</div>
   <div class="obstep" data-ob="4" hidden><div style="padding-top:40px"><div class="kicker">Welcome</div><h1 class="serif" style="font-size:44px;line-height:1;margin:10px 0">Los Angeles,<br><em style="font-weight:400">meet Jordan.</em></h1><div class="rule" style="margin:16px 0"></div><p class="muted">This week: 24 homes, 12 places to eat and 5 questions from neighbours.</p><label class="agree" style="display:flex;gap:10px;align-items:center;margin-top:22px;font-size:14px">${sw(false)} <span>I agree to the <button class="link" data-go="legal">Terms</button> and <button class="link" data-go="legal">Privacy Policy</button></span></label></div></div>
  </div><div style="padding:12px 24px 34px"><button class="btn pri block" data-act="obnext"><span>Continue</span></button></div>` });

/* ---------- the four tabs ---------- */
screen('explore', { group: 'Explore', title: 'Explore (front page)', kind: 'tab', tab: 'explore', render: () => { const n = D.news;
  return `${tabTop('Today')}<div class="scroller" data-collapse-host data-segroot>${dateline}<div class="lt"><h1>Today in <em>LA</em></h1></div>
  ${seg([['news', 'Front page'], ['events', 'Events'], ['stories', 'Stories'], ['quests', 'Quests'], ['polls', 'Polls']])}
  <div data-panel="news"><a href="#" class="lead rv press" style="display:block" data-toast="Opens the article">${photo(n[0].img, '', 800, 600)}<div class="kicker" style="margin-top:12px">${n[0].scope} · ${n[0].src}</div><h2>${n[0].title}</h2><div class="byline">${n[0].time} ago · ${n[0].mins} min read <span style="margin-left:auto" class="acts"><button class="nodrag" data-like>${I('heart', 18)}<b>48</b></button><button class="nodrag" data-save>${I('bookmark', 18)}</button></span></div></a>
    ${h2('Also today')}<div class="nlist">${n.slice(1).map((x, i) => `<a href="#" class="rv press" data-toast="Opens the article"><span class="num">${i + 1}</span><div style="flex:1"><div class="kicker" style="color:var(--text3)">${x.src} · ${x.time}</div><h3>${x.title}</h3></div>${photo(x.img, '', 200, 200, 'style="width:64px;height:64px;border-radius:4px;flex:none"')}</a>`).join('')}</div>
    ${h2('Letters from neighbours', 'Write one', 'data-go="compose-news"')}${D.posts.map((p) => `<a href="#" class="letter rv press" style="display:block" ${go('post-detail', { id: p.id })}><q>${p.title}</q><div class="muted small" style="margin-bottom:8px">${p.body}</div><div class="byline">${PERSON(p.by, p.hue, 22)}${p.by} · ${p.time} ago<span class="acts" style="margin-left:auto"><button class="nodrag" data-like>${I('heart', 17)}<b>${p.likes}</b></button></span></div></a>`).join('')}</div>
  <div data-panel="events" hidden><div class="datestrip" data-hscroll>${['FRI 7', 'SAT 8', 'SUN 9', 'MON 10', 'TUE 11', 'SAT 15'].map((d, i) => `<button class="${i ? '' : 'on'}" data-act="day"><small>${d.split(' ')[0]}</small><b>${d.split(' ')[1]}</b></button>`).join('')}</div>
    ${D.events.map((e) => `<a href="#" class="row rv press" ${go('event-detail', { id: e.id })}><div class="datebox"><small>${e.day}</small><b>${e.date.split(' ')[1]}</b></div><div class="tx"><div class="kicker">${e.cat} · ${e.price}</div><h3>${e.title}</h3><div class="meta small"><span>${e.time} · ${e.venue}</span></div><div class="meta small"><span>${e.going} going</span></div></div></a>`).join('')}
    <div style="padding:16px 18px"><button class="btn sec block rv" data-go="compose-event">Host an event</button></div></div>
  <div data-panel="stories" hidden><div class="storygrid"><button class="stile add rv" data-go="compose-story"><div>${I('camera', 30)}<div class="serif" style="font-size:18px;margin-top:6px">Add yours</div></div></button>${D.stories.map((s, i) => `<button class="stile rv press" ${go('story-viewer', { i })}>${photo(s.img, '', 400, 600)}${PERSON(s.by, s.hue, 28)}<span class="t serif" style="font-size:17px">${s.title}</span></button>`).join('')}</div></div>
  <div data-panel="quests" hidden>${D.quests.map((q, i) => `<div class="row rv"><span class="num">${i + 1}</span><div class="tx"><div class="kicker">${q.kind} · ${q.left}</div><h3>${q.title}</h3><div class="meta small"><span>${q.reward} · ${q.joined} joined</span></div>${q.progress ? `<div class="bar2" style="margin-top:8px"><i style="width:${(q.progress / q.of) * 100}%"></i></div>` : ''}</div><button class="btn sm ${q.progress ? 'ghost' : 'sec'}" data-act="join">${q.progress ? 'Go on' : 'Join'}</button></div>`).join('')}
    <div style="padding:16px 18px"><button class="btn ghost block rv" data-go="compose-quest">Start a quest</button></div></div>
  <div data-panel="polls" hidden><div class="qcard rv" data-poll="0" style="border:0"><div class="meta small"><span class="tag">${D.poll[0].tag}</span><span>Question 1 of 3</span></div><p style="margin:10px 0 14px">${D.poll[0].q}</p>
    <button class="pollopt" data-act="vote"><i></i><span>${D.poll[0].a}</span><b>64%</b></button><button class="pollopt" data-act="vote"><i></i><span>${D.poll[0].b}</span><b>36%</b></button>
    <div class="meta small" style="justify-content:space-between;margin-top:6px"><span>212 neighbours voted</span><button style="text-decoration:underline" data-act="nextpoll">Next question</button></div></div></div>
  </div>`; } });
screen('listings', { group: 'Listings', title: 'Homes, rooms, roommates', kind: 'tab', tab: 'listings', render: () => `${tabTop('Homes')}<div class="scroller" data-collapse-host data-segroot>${dateline}<div class="lt"><h1>Find a <em>home</em></h1></div>
  ${seg([['homes', 'Whole places'], ['rooms', 'Rooms'], ['mates', 'Roommates']])}
  <div data-panel="homes"><div style="display:flex;align-items:center;padding-right:18px">${chips(['All', 'Apartment', 'House', 'Studio'])}<button class="ib nodrag" style="margin:-12px 0 0 auto;flex:none" data-sheet="filters">${I('sliders')}</button></div>
    ${featCard(D.listings[0])}${D.listings.slice(1).map(rowCard).join('')}
    <div class="letter rv" style="border-left-color:var(--ok)" data-sheet="safety"><b>Renting safely.</b> <span class="muted">Six checks before you pay anything. <u>Read</u></span></div></div>
  <div data-panel="rooms" hidden>${D.rooms.map((r) => `<a href="#" class="row rv press" ${go('room-detail', { id: r.id })}><div class="tx"><div class="kicker">${r.spots} of ${r.of} rooms free · ${r.area}</div><h3>${r.title}</h3><div class="meta small"><b style="color:var(--text)">${money(r.price)}</b><span>· ${r.mates} housemates · ${r.avail === 'Now' ? 'now' : r.avail}</span></div></div>${photo(r.img, '', 300, 300, 'data-flip-img')}</a>`).join('')}
    <div style="padding:16px 18px"><button class="btn sec block rv" data-go="compose-room">Rent out a room in my home</button></div></div>
  <div data-panel="mates" hidden>${D.mates.map((m) => `<a href="#" class="row rv press" ${go('roommate-detail', { id: m.id })}><span class="bigrate" style="width:64px">${m.match}<small style="font-size:16px">%</small></span><div class="tx"><h3>${m.name}, ${m.age}</h3><div class="meta small"><span>${m.job} · ${m.budget}</span></div><div class="meta small"><span>Move-in ${m.movein} · ${m.sleep}</span></div></div>${PERSON(m.name, m.hue, 44)}</a>`).join('')}</div>
  </div>` });
screen('food', { group: 'Food', title: 'Food (the guide)', kind: 'tab', tab: 'food', render: () => `${tabTop('Food')}<div class="scroller" data-collapse-host>${dateline}<div class="lt"><h1>The <em>guide</em></h1><p>Where neighbours actually eat.</p></div>
  <div style="padding:0 18px 12px" class="rv">${inp('Restaurant, dish or cuisine', '', 'search')}</div>${chips(['All', 'Open now', '$', '$$', 'Mexican', 'Indian', 'Japanese', 'Korean'])}
  ${(() => { const f = D.food[4]; return `<a href="#" class="card feat rv press" ${go('restaurant-detail', { id: f.id })}>${photo(f.img, '', 800, 600, 'data-flip-img')}<div class="bd"><div class="kicker">Pick of the week · ${f.area}</div><h3>${f.name}</h3><div class="meta"><span><mark><b>${f.rating}</b></mark> (${f.reviews})</span><span>· ${f.cuisine} · ${f.price}</span>${f.open ? `<span style="color:var(--ok)">· ${f.open}</span>` : ''}</div></div></a>`; })()}
  ${h2('The list')}<div class="nlist">${D.food.slice(0, 4).map((f, i) => `<a href="#" class="rv press" ${go('restaurant-detail', { id: f.id })}><span class="num">${i + 1}</span><div style="flex:1"><h3>${f.name}</h3><div class="meta small"><span><b style="color:var(--text)">${f.rating}</b> (${f.reviews}) · ${f.cuisine} · ${f.price}</span></div><div class="small muted" style="margin-top:2px"><i>Order:</i> ${f.dishes.slice(0, 2).join(', ')}</div></div>${photo(f.img, '', 200, 200, 'data-flip-img style="width:72px;height:72px;border-radius:4px;flex:none"')}</a>`).join('')}</div></div>` });
screen('community', { group: 'Community', title: 'Ask the neighbourhood', kind: 'tab', tab: 'community', render: () => `${tabTop('Ask')}<div class="scroller" data-collapse-host>${dateline}<div class="lt"><h1>Ask the <em>neighbourhood</em></h1></div>
  <button class="askbox rv nodrag" data-sheet="ask"><span style="flex:1;text-align:left;font-family:var(--font-display);font-size:17px;font-style:italic">What would you like to know?</span><span class="btn sm pri">Ask</span></button>
  ${chips(['All', 'Housing', 'Food', 'Transit', 'Events', 'Jobs', 'Paperwork'])}${D.questions.map(qCard).join('')}</div>` });
