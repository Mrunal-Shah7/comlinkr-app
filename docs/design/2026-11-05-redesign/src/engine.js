/* Comlinkr design prototypes: shared engine (router, pager, sheets, motion helpers).
   Each variation supplies V (shell, tab bar hook, motion spec) and registers screens in S. */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const S = {};            // screen registry: id -> {group, title, kind, tab, render(p), mount(el,p)}
const ORDER = [];        // index order
function screen(id, def) { if (!S[id]) ORDER.push(id); S[id] = Object.assign({ kind: 'push', group: 'Other' }, def); }
/* push / back choreography per design: slide (A), rise (B), zoom (C) */
const MODES = {
  slide: { inEl: [{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], prev: [{ transform: 'translateX(0)', filter: 'brightness(1)' }, { transform: 'translateX(-24%)', filter: 'brightness(.82)' }], ms: 380 },
  rise: { inEl: [{ transform: 'translateY(40px)', opacity: 0 }, { transform: 'none', opacity: 1 }], prev: [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-12px)', opacity: 0.35 }], ms: 440 },
  zoom: { inEl: [{ transform: 'scale(.88)', opacity: 0, borderRadius: '44px' }, { transform: 'scale(1)', opacity: 1, borderRadius: '0px' }], prev: [{ transform: 'scale(1)', filter: 'brightness(1)' }, { transform: 'scale(.94)', filter: 'brightness(.6)' }], ms: 420 },
};
const mode = () => MODES[(window.V && V.push) || 'slide'];
const RM = () => document.documentElement.classList.contains('rm');
const EASE = 'cubic-bezier(.22,1,.36,1)';        // ~ withSpring(damping 26, stiffness 260)
const EASE_SHEET = 'cubic-bezier(.32,1.18,.52,1)'; // ~ withSpring(damping 18, stiffness 200), slight overshoot
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const P = (o) => esc(JSON.stringify(o || {}));
const money = (n) => '$' + Number(n).toLocaleString('en-US');

let vp, stack = [], tabIndex = 0, sheetOpen = null, busy = false;
const visited = {};

function anim(el, frames, ms, easing = EASE) {
  if (!el) return Promise.resolve();
  if (RM()) ms = Math.min(ms, 140);
  const a = el.animate(frames, { duration: ms, easing, fill: 'both' });
  return a.finished.then(() => { try { if (el.isConnected) a.commitStyles(); } catch (e) {} a.cancel(); }).catch(() => {});
}
function makeScreen(id, p) {
  const d = document.createElement('section');
  d.className = 'scr scr-' + id;
  d.dataset.id = id;
  d.innerHTML = S[id].render(p || {});
  return d;
}
function afterMount(el, id, p) {
  S[id].mount && S[id].mount(el, p || {});
  wire(el);
  reveal(el);
}
/* staggered entrance for .rv children (skeleton -> content, new screens) */
function reveal(root) {
  const items = $$('.rv', root).filter((e) => !e.dataset.rvd);
  items.forEach((e, i) => {
    e.dataset.rvd = 1;
    e.style.setProperty('--i', Math.min(i, 12));
    e.classList.add('rv-in');
  });
}
/* collapsing large titles: sets --c (0..1) on the closest .scr or .pane */
function wire(root) {
  $$('[data-collapse-host]', root).forEach((sc) => {
    const host = sc.closest('.pane') || sc.closest('.scr');
    const on = () => host.style.setProperty('--c', Math.min(1, Math.max(0, sc.scrollTop / 64)).toFixed(3));
    sc.addEventListener('scroll', on, { passive: true }); on();
  });
  $$('.seg', root).forEach(segSync);
  $$('.otp', root).forEach(otpMount);
}

/* ---------- navigation ---------- */
function topS() { return stack[stack.length - 1]; }
function setRoot(id, p, how = 'fade') {
  const el = makeScreen(id, p);
  const old = stack.slice();
  vp.appendChild(el);
  stack = [{ id, p, el }];
  afterMount(el, id, p);
  const a = how === 'up'
    ? anim(el, [{ transform: 'translateY(6%)', opacity: 0 }, { transform: 'none', opacity: 1 }], 420)
    : anim(el, [{ opacity: 0, transform: 'scale(.985)' }, { opacity: 1, transform: 'none' }], 360);
  a.then(() => old.forEach((s) => s.el.remove()));
  closeSheet(true);
  onNav();
}
function ensureShell() { if (!stack.length || stack[0].id !== 'shell') setRoot('shell', {}); }
function nav(id, p = {}, src) {
  const def = S[id];
  if (!def) return toast('Not in this prototype');
  if (busy) return;
  if (def.kind === 'root') return setRoot(id, p, 'up');
  if (def.kind === 'tab') {
    ensureShell();
    closeSheet(true);
    while (stack.length > 1) { const s = stack.pop(); s.el.remove(); }
    stack[0].el.getAnimations().forEach((a) => a.cancel()); stack[0].el.style.transform = ''; stack[0].el.style.filter = '';
    setTab(V.tabs.findIndex((t) => t.id === def.tab), true);
    return onNav();
  }
  if (def.kind === 'sheet') {
    if (!stack.length) ensureShell();
    return openSheet(id, p);
  }
  if (!stack.length) ensureShell();
  closeSheet(true);
  push(id, p, src);
}
function push(id, p, src) {
  const prev = topS();
  const el = makeScreen(id, p);
  vp.appendChild(el);
  const entry = { id, p, el, src: null };
  stack.push(entry);
  afterMount(el, id, p);
  busy = true;
  const hero = $('[data-hero]', el);
  const srcImg = src && $('[data-flip-img]', src);
  if (srcImg && hero && !RM()) {
    entry.src = src;
    flip(srcImg, hero, el).then(() => (busy = false));
    if (prev) anim(prev.el, [{ filter: 'brightness(1)' }, { filter: 'brightness(.7)' }], 420);
  } else {
    const m = mode();
    anim(el, m.inEl, m.ms, V.push === 'zoom' ? EASE_SHEET : EASE).then(() => (busy = false));
    if (prev) anim(prev.el, m.prev, m.ms);
  }
  onNav();
}
function back() {
  if (sheetOpen) return closeSheet();
  if (stack.length <= 1 || busy) return;
  const cur = stack.pop(), prev = topS();
  busy = true;
  const hero = $('[data-hero]', cur.el);
  if (cur.src && document.body.contains(cur.src) && hero && !RM() && $('.scroller', cur.el)?.scrollTop < 40) {
    flipBack(hero, $('[data-flip-img]', cur.src), cur.el).then(() => { cur.el.remove(); busy = false; });
    anim(prev.el, [{ filter: 'brightness(.7)' }, { filter: 'brightness(1)' }], 380);
  } else {
    const m = mode();
    anim(cur.el, [...m.inEl].reverse(), m.ms - 80).then(() => { cur.el.remove(); busy = false; });
    anim(prev.el, [...m.prev].reverse(), m.ms - 80);
  }
  setTimeout(onNav, 10);
}
/* shared-element expand: card photo grows into the detail hero */
function rel(r) { const b = vp.getBoundingClientRect(); return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height }; }
function ghost(img, r, radius) {
  img = img.tagName === 'IMG' ? img : img.querySelector('img');
  const g = document.createElement('div');
  g.className = 'flipghost';
  g.style.cssText = `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;border-radius:${radius};background-image:url("${img.currentSrc || img.src}")`;
  vp.appendChild(g); return g;
}
function flip(fromImg, hero, el) {
  const a = rel(fromImg.getBoundingClientRect()), b = rel(hero.getBoundingClientRect());
  const g = ghost(fromImg, a, getComputedStyle(fromImg).borderRadius);
  hero.style.visibility = 'hidden';
  anim(el, [{ opacity: 0 }, { opacity: 1 }], 300, 'linear');
  return anim(g, [
    { transform: 'translate(0,0) scale(1,1)', transformOrigin: '0 0', borderRadius: getComputedStyle(fromImg).borderRadius },
    { transform: `translate(${b.x - a.x}px,${b.y - a.y}px) scale(${b.w / a.w},${b.h / a.h})`, transformOrigin: '0 0', borderRadius: '0px' },
  ], 460).then(() => { hero.style.visibility = ''; g.remove(); });
}
function flipBack(hero, toImg, el) {
  const a = rel(hero.getBoundingClientRect()), b = rel(toImg.getBoundingClientRect());
  const g = ghost(toImg, a, '0px');
  hero.style.visibility = 'hidden';
  anim(el, [{ opacity: 1 }, { opacity: 0 }], 260, 'linear');
  return anim(g, [
    { transform: 'translate(0,0) scale(1,1)', transformOrigin: '0 0' },
    { transform: `translate(${b.x - a.x}px,${b.y - a.y}px) scale(${b.w / a.w},${b.h / a.h})`, transformOrigin: '0 0', borderRadius: getComputedStyle(toImg).borderRadius },
  ], 400).then(() => g.remove());
}
/* edge swipe back (Telegram / iOS): drag from the left edge */
function edgeSwipe() {
  let st = null;
  vp.addEventListener('pointerdown', (e) => {
    const b = vp.getBoundingClientRect();
    if (e.clientX - b.left > 24 || stack.length < 2 || sheetOpen || busy) return;
    st = { x: e.clientX, cur: topS().el, prev: stack[stack.length - 2].el, w: b.width, dx: 0, slide: !V.push || V.push === 'slide', pt: stack[stack.length - 2].el.style.transform, pf: stack[stack.length - 2].el.style.filter, po: stack[stack.length - 2].el.style.opacity };
  });
  vp.addEventListener('pointermove', (e) => {
    if (!st) return;
    st.dx = Math.max(0, e.clientX - st.x);
    const p = st.dx / st.w;
    st.cur.getAnimations().forEach((a) => a.cancel()); st.prev.getAnimations().forEach((a) => a.cancel());
    st.cur.style.transform = `translateX(${st.dx}px)`;
    if (st.slide) { st.prev.style.transform = `translateX(${-24 + 24 * p}%)`; st.prev.style.filter = `brightness(${0.82 + 0.18 * p})`; } else { st.prev.style.opacity = Math.min(1, +(st.po || 1) + p); }
  });
  const end = () => {
    if (!st) return;
    const { cur, prev, dx, w, slide, pt, pf, po } = st; st = null;
    if (dx > w * 0.33) {
      const s = stack.pop();
      anim(cur, [{ transform: `translateX(${dx}px)` }, { transform: 'translateX(100%)' }], 220).then(() => s.el.remove());
      anim(prev, [{ transform: prev.style.transform || 'none', filter: prev.style.filter || 'none', opacity: prev.style.opacity || 1 }, { transform: 'none', filter: 'brightness(1)', opacity: 1 }], 220).then(() => { prev.style.transform = ''; prev.style.filter = ''; prev.style.opacity = ''; });
      onNav();
    } else {
      anim(cur, [{ transform: `translateX(${dx}px)` }, { transform: 'translateX(0)' }], 240);
      if (slide) anim(prev, [{ transform: prev.style.transform }, { transform: 'translateX(-24%)' }], 240); else { prev.style.transform = pt; prev.style.filter = pf; prev.style.opacity = po; }
    }
  };
  vp.addEventListener('pointerup', end); vp.addEventListener('pointercancel', end);
}

/* ---------- tab pager: panes follow the finger (like SwipeTabs today) ---------- */
function shellMount(el) {
  const track = $('.track', el);
  let st = null;
  track.addEventListener('pointerdown', (e) => {
    if (e.target.closest('[data-hscroll],input,textarea,button.nodrag,.otp') || e.button) return;
    st = { x: e.clientX, y: e.clientY, lock: null, w: vp.clientWidth, dx: 0, t: performance.now() };
  });
  window.addEventListener('pointermove', (e) => {
    if (!st) return;
    const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (!st.lock && Math.hypot(dx, dy) > 8) st.lock = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
    if (st.lock !== 'x') return;
    let off = -tabIndex * st.w + dx;
    const min = -(V.tabs.length - 1) * st.w;
    if (off > 0) off = off * 0.3; if (off < min) off = min + (off - min) * 0.3;
    st.dx = dx;
    track.style.transition = 'none';
    track.style.transform = `translateX(${off}px)`;
    V.onTab && V.onTab(-off / st.w, el);
  });
  const up = () => {
    if (!st) return;
    const { dx, w, lock, t } = st; st = null;
    if (lock !== 'x') return;
    const v = dx / (performance.now() - t);
    let i = tabIndex;
    if (dx < -w * 0.28 || v < -0.45) i++; else if (dx > w * 0.28 || v > 0.45) i--;
    setTab(Math.max(0, Math.min(V.tabs.length - 1, i)), true);
  };
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  window.addEventListener('resize', () => setTab(tabIndex, false));
  setTab(tabIndex, false);
}
function setTab(i, animate) {
  const sh = stack[0] && stack[0].id === 'shell' && stack[0].el;
  if (!sh || i < 0) return;
  const changed = i !== tabIndex;
  tabIndex = i;
  const track = $('.track', sh), w = vp.clientWidth;
  track.style.transition = animate && !RM() ? `transform 420ms ${EASE}` : 'none';
  track.style.transform = `translateX(${-i * w}px)`;
  $$('.pane', sh).forEach((p, k) => p.setAttribute('aria-hidden', k !== i));
  V.onTab && V.onTab(i, sh, true);
  loadPane(i);
  onNav();
}
function loadPane(i) {
  const sh = stack[0].el, pane = $$('.pane', sh)[i], tab = V.tabs[i].id;
  if (visited[tab] && pane.dataset.ready) return;
  visited[tab] = 1;
  pane.innerHTML = V.skeleton(tab);
  setTimeout(() => {
    pane.innerHTML = S[tab].render({});
    pane.dataset.ready = 1;
    afterMount(pane, tab, {});
  }, RM() ? 60 : 700);
}

/* ---------- sheets ---------- */
function openSheet(idOrHtml, p, opts = {}) {
  closeSheet(true);
  const isId = S[idOrHtml];
  const bd = document.createElement('div'); bd.className = 'backdrop';
  const sh = document.createElement('div'); sh.className = 'sheet' + (opts.full || (isId && S[idOrHtml].full) ? ' full' : '');
  sh.innerHTML = `<div class="grab"></div>` + (isId ? S[idOrHtml].render(p || {}) : idOrHtml);
  vp.append(bd, sh);
  sheetOpen = { bd, sh, id: isId ? idOrHtml : null };
  if (isId) afterMount(sh, idOrHtml, p); else { wire(sh); reveal(sh); }
  anim(bd, [{ opacity: 0 }, { opacity: 1 }], 260, 'linear');
  const sin = V.sheetIn && V.sheetIn(isId ? idOrHtml : null);
  if (sin) { sh.style.transformOrigin = '50% 100%'; anim(sh, sin, 520, EASE_SHEET); } else anim(sh, [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], 480, EASE_SHEET);
  bd.onclick = () => closeSheet();
  let st = null;
  sh.addEventListener('pointerdown', (e) => { if (e.target.closest('.grab,.sheet-head')) st = { y: e.clientY, dy: 0 }; });
  sh.addEventListener('pointermove', (e) => { if (!st) return; st.dy = Math.max(0, e.clientY - st.y); sh.getAnimations().forEach((a) => a.cancel()); sh.style.transform = `translateY(${st.dy}px)`; });
  sh.addEventListener('pointerup', () => { if (!st) return; const dy = st.dy; st = null; if (dy > 110) closeSheet(false, dy); else anim(sh, [{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }], 300, EASE_SHEET); });
  onNav();
}
function closeSheet(instant, from = 0) {
  if (!sheetOpen) return;
  const { bd, sh } = sheetOpen; sheetOpen = null;
  V.onSheetClose && V.onSheetClose();
  if (instant) { bd.remove(); sh.remove(); return; }
  anim(bd, [{ opacity: 1 }, { opacity: 0 }], 240, 'linear').then(() => bd.remove());
  anim(sh, [{ transform: `translateY(${from}px)` }, { transform: 'translateY(105%)' }], 280).then(() => sh.remove());
  setTimeout(onNav, 10);
}

/* ---------- feedback ---------- */
function toast(msg, kind = '') {
  $$('.toast', vp).forEach((t) => t.remove());
  const t = document.createElement('div'); t.className = 'toast ' + kind; t.innerHTML = msg;
  vp.appendChild(t);
  anim(t, [{ transform: 'translate(-50%,-140%)', opacity: 0 }, { transform: 'translate(-50%,0)', opacity: 1 }], 420, EASE_SHEET);
  setTimeout(() => anim(t, [{ transform: 'translate(-50%,0)', opacity: 1 }, { transform: 'translate(-50%,-140%)', opacity: 0 }], 260).then(() => t.remove()), 2000);
}
function burst(el) {
  if (RM()) return;
  const r = rel(el.getBoundingClientRect());
  for (let k = 0; k < 8; k++) {
    const d = document.createElement('i'); d.className = 'spark';
    d.style.left = r.x + r.w / 2 + 'px'; d.style.top = r.y + r.h / 2 + 'px';
    vp.appendChild(d);
    const a = (k / 8) * Math.PI * 2, R = 18 + Math.random() * 8;
    d.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * R}px), calc(-50% + ${Math.sin(a) * R}px)) scale(.2)`, opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.2,.8,.3,1)' }).finished.then(() => d.remove());
  }
}
function shake(el) { anim(el, [0, -8, 7, -5, 3, 0].map((x) => ({ transform: `translateX(${x}px)` })), 420, 'ease-out'); }

/* ---------- segmented controls & panels ---------- */
function segSync(seg) {
  const on = $('.on', seg) || $('button', seg), ind = $('.seg-ind', seg);
  if (!ind || !on) return;
  requestAnimationFrame(() => { ind.style.width = on.offsetWidth + 'px'; ind.style.transform = `translateX(${on.offsetLeft}px)`; });
}
function segPick(btn) {
  const seg = btn.closest('.seg'), btns = $$('button', seg), from = btns.findIndex((b) => b.classList.contains('on')), to = btns.indexOf(btn);
  if (from === to) return;
  btns.forEach((b) => b.classList.toggle('on', b === btn));
  segSync(seg);
  const root = seg.closest('[data-segroot]') || seg.parentElement;
  const name = btn.dataset.show;
  if (!name) return;
  const panels = $$(':scope [data-panel]', root).filter((p) => p.closest('[data-segroot]') === root);
  const dir = to > from ? 1 : -1;
  panels.forEach((p) => {
    const show = p.dataset.panel === name;
    if (show) { p.hidden = false; anim(p, [{ opacity: 0, transform: `translateX(${dir * 28}px)` }, { opacity: 1, transform: 'none' }], 340); reveal(p); }
    else p.hidden = true;
  });
}

/* ---------- OTP: auto-advance, pop per digit, shake on wrong code, success sweep ---------- */
function otpMount(box) {
  const ins = $$('input', box), msg = box.parentElement.querySelector('.otp-msg');
  const check = () => {
    const code = ins.map((i) => i.value).join('');
    if (code.length < ins.length) return;
    ins.forEach((i) => i.blur());
    if (code === '000000') {
      box.classList.add('bad'); shake(box);
      if (msg) { msg.textContent = 'That code is not right. Try again or resend.'; msg.classList.add('err'); }
      setTimeout(() => { box.classList.remove('bad'); ins.forEach((i) => { i.value = ''; i.parentElement.classList.remove('filled'); }); ins[0].focus(); }, 900);
    } else {
      ins.forEach((i, k) => setTimeout(() => i.parentElement.classList.add('ok'), k * 55));
      if (msg) { msg.textContent = 'Verified'; msg.classList.remove('err'); msg.classList.add('okm'); }
      setTimeout(() => nav(box.dataset.next || 'onboarding'), 900);
    }
  };
  ins.forEach((inp, k) => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/\D/g, '').slice(-1);
      const cell = inp.parentElement;
      cell.classList.toggle('filled', !!inp.value);
      if (inp.value) { anim(cell, [{ transform: 'scale(.86)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], 260); ins[k + 1] ? ins[k + 1].focus() : check(); }
    });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !inp.value && ins[k - 1]) { ins[k - 1].focus(); ins[k - 1].value = ''; ins[k - 1].parentElement.classList.remove('filled'); } });
    inp.addEventListener('paste', (e) => {
      const t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, ins.length); if (!t) return;
      e.preventDefault(); [...t].forEach((c, j) => { ins[j].value = c; ins[j].parentElement.classList.add('filled'); }); check();
    });
  });
  setTimeout(() => ins[0] && ins[0].focus({ preventScroll: true }), 450);
}

/* ---------- global delegated interactions ---------- */
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-go],[data-back],[data-sheet],[data-toast],[data-like],[data-save],.seg button,[data-tab],.chip[data-toggle],[data-step],[data-collapse],.chipinput .x,[data-close],[data-act]');
  if (!t || !vp.contains(t) && !t.closest('#chrome')) return;
  if (t.matches('.seg button')) return segPick(t);
  if (t.dataset.close !== undefined) { closeSheet(); if (t.dataset.toast) toast(t.dataset.toast); return; }
  if (t.dataset.back !== undefined) return back();
  if (t.dataset.tab !== undefined) { if (stack.length > 1) nav(V.tabs[+t.dataset.tab].id); else setTab(+t.dataset.tab, true); return; }
  if (t.dataset.like !== undefined) {
    const on = t.classList.toggle('on');
    anim(t, [{ transform: 'scale(1)' }, { transform: 'scale(1.32)' }, { transform: 'scale(1)' }], 380, EASE_SHEET);
    if (on) burst(t);
    const c = t.querySelector('b'); if (c) c.textContent = +c.textContent + (on ? 1 : -1);
    return;
  }
  if (t.dataset.save !== undefined) {
    const on = t.classList.toggle('on');
    anim(t, [{ transform: 'scale(1)' }, { transform: 'scale(.8)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], 380);
    return toast(on ? 'Saved to your list' : 'Removed from saved');
  }
  if (t.matches('.chip[data-toggle]')) {
    const g = t.closest('[data-single]');
    if (g) $$('.chip', g).forEach((c) => c !== t && c.classList.remove('on'));
    t.classList.toggle('on');
    return anim(t, [{ transform: 'scale(.92)' }, { transform: 'scale(1)' }], 220, EASE_SHEET);
  }
  if (t.dataset.step !== undefined) {
    const st = t.closest('.stepper'), out = $('output', st), v = Math.max(+st.dataset.min || 0, +out.textContent + +t.dataset.step);
    if (v === +out.textContent) return shake(st);
    const up = +t.dataset.step > 0; out.textContent = v;
    return anim(out, [{ transform: `translateY(${up ? 60 : -60}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }], 240);
  }
  if (t.dataset.collapse !== undefined) {
    const c = t.nextElementSibling, open = !c.classList.contains('open');
    t.classList.toggle('open', open);
    c.classList.toggle('open', open);
    if (open) { c.style.height = 'auto'; const h = c.offsetHeight; anim(c, [{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], 380).then(() => (c.style.height = 'auto')); reveal(c); }
    else anim(c, [{ height: c.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], 300).then(() => (c.style.height = '0px'));
    return;
  }
  if (t.matches('.chipinput .x')) { const c = t.parentElement; return anim(c, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.5)', opacity: 0 }], 180).then(() => c.remove()); }
  if (t.dataset.act) return V.act && V.act(t.dataset.act, t, e);
  if (t.dataset.sheet) { e.preventDefault(); return nav(t.dataset.sheet, t.dataset.p ? JSON.parse(t.dataset.p) : {}); }
  if (t.dataset.go) { e.preventDefault(); return nav(t.dataset.go, t.dataset.p ? JSON.parse(t.dataset.p) : {}, t.closest('[data-flip]')); }
  if (t.dataset.toast) return toast(t.dataset.toast);
});
/* chip input: type, then space / comma / enter makes a chip */
document.addEventListener('keydown', (e) => {
  const i = e.target.closest('.chipinput input'); if (!i) return;
  if ([' ', ',', 'Enter'].includes(e.key) && i.value.trim()) {
    e.preventDefault();
    const c = document.createElement('span'); c.className = 'tagchip'; c.innerHTML = `${esc(i.value.trim().replace(/^#/, ''))}<button class="x" aria-label="Remove">×</button>`;
    i.before(c); i.value = '';
    anim(c, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: .7 }, { transform: 'scale(1)' }], 280);
  } else if (e.key === 'Backspace' && !i.value && i.previousElementSibling) i.previousElementSibling.remove();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') back(); });

/* ---------- chrome: index, notes, toggles ---------- */
function onNav() {
  const t = sheetOpen && sheetOpen.id ? sheetOpen.id : topS() && (topS().id === 'shell' ? V.tabs[tabIndex].id : topS().id);
  if (!t) return;
  $$('#index a').forEach((a) => a.classList.toggle('cur', a.dataset.id === t));
  const sel = $('#mindex'); if (sel) sel.value = t;
  const n = NOTES[t] || [], m = (V.motion && (V.motion[t] || V.motion.default)) || [];
  $('#notes').innerHTML = `<h3>${esc(S[t] ? S[t].title : t)}</h3>` +
    (n.length ? `<h4>What changes from today</h4><ul>${n.map((x) => `<li>${x}</li>`).join('')}</ul>` : '') +
    (m.length ? `<h4>Motion on this screen</h4><ul class="mo">${m.map((x) => `<li>${x}</li>`).join('')}</ul>` : '');
}
function buildIndex() {
  const groups = {};
  ORDER.filter((id) => !S[id].hidden).forEach((id) => (groups[S[id].group] = groups[S[id].group] || []).push(id));
  $('#index').innerHTML = Object.entries(groups).map(([g, ids]) => `<div class="ig"><h5>${g}</h5>${ids.map((id) => `<a href="#" data-id="${id}">${S[id].title}</a>`).join('')}</div>`).join('');
  $('#mindex').innerHTML = Object.entries(groups).map(([g, ids]) => `<optgroup label="${g}">${ids.map((id) => `<option value="${id}">${S[id].title}</option>`).join('')}</optgroup>`).join('');
  $('#index').addEventListener('click', (e) => { const a = e.target.closest('a'); if (!a) return; e.preventDefault(); jump(a.dataset.id); });
  $('#mindex').addEventListener('change', (e) => jump(e.target.value));
}
function jump(id) {
  busy = false;
  if (S[id].group !== 'Sign in' && S[id].kind !== 'root' && (!stack.length || stack[0].id !== 'shell')) ensureShell();
  if (S[id].group === 'Sign in' && S[id].kind !== 'root' && (!stack.length || stack[0].id !== 'login')) setRoot('login', {});
  nav(id);
}
function initChrome() {
  const root = document.documentElement;
  try { const th = localStorage.getItem('cl-theme'); if (th) root.dataset.theme = th; } catch (e) {}
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) root.classList.add('rm');
  $$('[data-theme-toggle]').forEach((b) => b.onclick = () => {
    const dark = (root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('cl-theme', root.dataset.theme); } catch (e) {}
  });
  $$('[data-rm-toggle]').forEach((b) => b.onclick = () => { root.classList.toggle('rm'); b.classList.toggle('on', RM()); toast(RM() ? 'Reduced motion on' : 'Full motion on'); });
}
function clock() { const d = new Date(); $('#sbtime').textContent = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); }
window.addEventListener('DOMContentLoaded', () => {
  vp = $('#vp');
  initChrome(); buildIndex(); edgeSwipe(); clock(); setInterval(clock, 30000);
  screen('shell', { title: 'App', kind: 'root', hidden: true, render: () => V.renderShell(), mount: (el) => shellMount(el) });
  const start = location.hash.slice(1);
  if (start && S[start]) { nav(start); } else nav(V.start || 'login');
});
