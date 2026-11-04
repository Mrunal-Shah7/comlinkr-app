/* ===== C · Night Market — part 3: one-question-at-a-time composer, confetti, small extras ===== */
NOTES['compose-listing'] = ['One question per screen, 7 screens, each answered in seconds; photos come first.', 'City, state, country and currency come from your profile; type and counts have defaults.', 'Optional facts are offered as "+" chips on the last screen, not asked one by one.', 'The draft is kept if you close it.'];
const QS = [
  ['Show it off', 'Add photos. The first one is the cover.', () => `<div class="slots">${Array.from({ length: 6 }, (_, i) => `<button class="slot ${i ? '' : 'cover'}" data-act="slot">${I(i ? 'plus' : 'camera', i ? 22 : 32)}</button>`).join('')}</div><div class="hintx" style="margin-top:10px">${I('sparkles')} Five or more photos get twice the messages.</div>`],
  ['What kind of place?', 'Pick one.', () => `<div data-single>${[['building', 'Apartment', 'In a building'], ['home', 'House', 'The whole house'], ['bed', 'Studio', 'One open room'], ['key', 'Room', 'A room in a shared home']].map(([i, t, s], k) => `<button class="choice ${k ? '' : 'on'}" data-act="choice"><span class="gi">${I(i)}</span><span>${t}<div class="small muted" style="font-weight:500">${s}</div></span></button>`).join('')}</div>`],
  ['Rent per month?', 'In US dollars, from your profile.', () => `<label class="bignum"><span style="color:var(--text3)">$</span><input inputmode="numeric" placeholder="1,800"></label><div class="cflow" style="margin-top:14px"><span class="chip" data-act="rentfill" data-v="1,650">Similar homes: $1,650</span></div>`],
  ['How big is it?', 'Tap + or −.', () => `<div style="display:grid;gap:10px">${stepper('Bedrooms', 1)}${stepper('Bathrooms', 1, 1)}</div>`],
  ['Where is it?', 'Only the area is shown until you share the address.', () => `${field('Street address', inp('e.g. 1455 Sunset Blvd', '', 'pin'))}<div class="prefill">${I('check')}<div style="flex:1"><b>Los Angeles</b>, California, US<div class="small muted">From your profile</div></div></div>`],
  ['Say a few words', 'What is it like to live there?', () => `${field('', `<div class="input"><textarea class="desc" placeholder="Bright, quiet, close to the park…"></textarea></div>`)}<button class="btn ghost sm" data-act="autofill">${I('sparkles', 16)} Write a starter for me</button>`],
  ['Looks great ✦', 'Add more now, or later.', () => `<div class="summary rv"><div class="ph sumph" style="height:150px"></div><div style="padding:14px"><b style="font-family:var(--font-display);font-size:18px">Sunny 1-bed near the park</b><div class="meta small" style="margin-top:4px"><span class="sumprice">$1,800 /mo</span><span>· Apartment · 1 bed · 1 bath</span><span>· Los Angeles</span></div></div></div>
    <div class="small muted" style="margin:16px 2px 8px">Optional extras</div><div class="cflow">${['Deposit', 'Available from', 'Lease', 'Furnished', 'Pets', 'Parking', 'Laundry', 'Size', 'Year built', 'Heating', 'Cooling', 'Utilities'].map((t) => `<button class="chip" data-toggle>+ ${t}</button>`).join('')}</div>`],
];
screen('compose-listing', { group: 'Post', title: 'List a whole place', render: () => `<header class="bar solid" style="background:transparent;border:0"><button class="ib" data-act="qback" aria-label="Back">${I('back')}</button><div class="progress" style="flex:1;margin:0 8px"><i style="width:${100 / QS.length}%"></i></div><button class="link small" style="padding:0 10px" data-act="draft">Save</button></header>
  <div class="qflow" data-qi="0">${QS.map(([q, s, body], i) => `<div class="qstep" data-q="${i}" ${i ? 'hidden' : ''}><div class="small muted" style="font-weight:700">${i + 1} of ${QS.length}</div><h1 class="qbig">${q}</h1><p class="muted" style="margin:0 0 20px">${s}</p>${body()}</div>`).join('')}</div>
  <div style="padding:12px 22px 34px;display:flex;gap:10px"><button class="btn pri block" data-act="qnext"><span>Next</span></button></div>` });
const qShow = (s, n, d) => {
  const box = $('.qflow', s), i = +box.dataset.qi, a = $(`[data-q="${i}"]`, s), b = $(`[data-q="${n}"]`, s);
  anim(a, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-d * 28}px)` }], 200).then(() => (a.hidden = true));
  b.hidden = false; wire(b); reveal(b); anim(b, [{ opacity: 0, transform: `translateX(${d * 28}px)` }, { opacity: 1, transform: 'none' }], 340);
  box.dataset.qi = n; $('.progress i', s).style.width = ((n + 1) / QS.length) * 100 + '%';
  const lb = $('[data-act=qnext] span', s), t = n === QS.length - 1 ? 'Publish' : 'Next';
  if (lb.textContent !== t) { lb.textContent = t; anim(lb, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], 260); }
  if (n === QS.length - 1) { const cover = $('.slot.cover .ph img', s), ph = $('.sumph', s); if (cover) ph.innerHTML = `<img src="${cover.src}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`; const r = $('.bignum input', s).value; if (r) $('.sumprice', s).textContent = '$' + r + ' /mo'; }
};
ACT.qnext = (t) => { const s = scr(t), i = +$('.qflow', s).dataset.qi;
  if (i === 0 && !$('.slot .ph', s)) { shake($('.slots', s)); return toast('Add at least one photo'); }
  if (i === QS.length - 1) return ACT.publish(t);
  qShow(s, i + 1, 1); };
ACT.qback = (t) => { const s = scr(t), i = +$('.qflow', s).dataset.qi; if (i === 0) return back(); qShow(s, i - 1, -1); };
ACT.choice = (t) => { $$('.choice', t.parentElement).forEach((c) => c.classList.toggle('on', c === t)); anim(t, [{ transform: 'scale(.96)' }, { transform: 'scale(1)' }], 300, EASE_SHEET); };
ACT.rentfill = (t) => { const i = $('.bignum input', scr(t)); i.value = t.dataset.v; anim(i, [{ transform: 'translateY(30%)', opacity: 0 }, { transform: 'none', opacity: 1 }], 280); };
ACT.gopolls = (t) => { const b = $$('.seg button', scr(t) || document).find((x) => x.dataset.show === 'polls'); if (b) { segPick(b); b.scrollIntoView({ behavior: 'smooth', block: 'center' }); } };
ACT.fab = (t) => { if (t.classList.contains('plus')) t.classList.add('open'); nav('compose'); };
function confetti() {
  if (RM()) return;
  const cs = getComputedStyle(document.documentElement), fb = ['#7C5CFF', '#3DDC97', '#F0457E', '#FFD166'];
  const cols = fb.map((f, k) => cs.getPropertyValue('--confetti' + (k + 1)).trim() || f);
  for (let k = 0; k < 26; k++) {
    const d = document.createElement('i'); d.className = 'confetti'; d.style.background = cols[k % 4];
    d.style.left = 50 + (Math.random() * 30 - 15) + '%'; d.style.top = '55%'; vp.appendChild(d);
    const x = (Math.random() - 0.5) * 360, y = -220 - Math.random() * 260, r = Math.random() * 720;
    d.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${x}px,${y}px) rotate(${r}deg)`, opacity: 1, offset: 0.55 }, { transform: `translate(${x * 1.2}px,${y + 420}px) rotate(${r * 1.6}deg)`, opacity: 0 }], { duration: 1300 + Math.random() * 400, easing: 'cubic-bezier(.2,.7,.3,1)' }).finished.then(() => d.remove());
  }
}
const _publish = ACT.publish;
ACT.publish = (t) => {
  const s = scr(t);
  if ($('.qflow', s)) { confetti(); return success('Live in Los Angeles', 'People can find your place now.', () => nav('listings')); }
  const first = $('.slots .slot', s); if (!(first && !first.querySelector('.ph'))) confetti();
  _publish(t);
};
