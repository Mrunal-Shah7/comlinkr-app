/* ---------- pages added after review (shared by A, B, C): my posts, all events, the 3-step badge flow ---------- */
const MYPOSTS = [
  { kind: 'News', title: 'Free tax help for newcomers at the library', time: '1w', likes: 23, comments: 4, img: 'p2' },
  { kind: 'Listing', title: 'Room in Echo Park', time: '2d', likes: 6, comments: 0, img: 'r1' },
  { kind: 'Question', title: 'Which neighbourhood is best for new grads?', time: '1w', likes: 12, comments: 1 },
  { kind: 'Story', title: 'First week in LA', time: '3d', likes: 31, comments: 2, img: 's3' },
];
screen('my-posts', { group: 'You', title: 'My posts', render: () => page('My posts', `${chips(['All', 'News', 'Listings', 'Questions', 'Stories', 'Events'])}<div class="mylist">
  ${MYPOSTS.map((m) => `<div class="row rv mp">${m.img ? photo(m.img, '', 200, 200, 'style="width:64px;height:64px;border-radius:12px"') : `<span class="gi" style="width:64px;height:64px;border-radius:12px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent-text);flex:none">${I('help')}</span>`}<div class="tx"><span class="tag">${m.kind}</span><h3 class="ell" style="margin-top:4px">${m.title}</h3><div class="meta small"><span>${I('heart')}${m.likes}</span><span>${I('msg')}${m.comments}</span><span>· ${m.time} ago</span></div></div><button class="ib nodrag" data-act="postmenu" aria-label="More">${I('more')}</button></div>`).join('')}</div>`,
  { sub: '4 posts · seen by 1.3k people this month', right: ib('plus', 'data-act="fab" aria-label="Post"') }) });
screen('events-all', { group: 'Explore', title: 'All events (upcoming, past)', render: () => page('Events', `<div data-segroot>${seg([['up', 'Upcoming'], ['going', 'Going · 2'], ['past', 'Past']])}
  <div data-panel="up">${D.events.map((e) => `<a href="#" class="row rv press" data-flip ${go('event-detail', { id: e.id })}><div class="datebox"><small>${e.day}</small><b>${e.date.split(' ')[1]}</b></div><div class="tx"><h3>${e.title}</h3><div class="meta small"><span>${e.time} · ${e.venue}</span></div><div class="meta small"><span>${e.going} going · ${e.price}</span></div></div>${photo(e.img, '', 200, 200, 'data-flip-img style="width:60px;height:60px;border-radius:12px"')}</a>`).join('')}</div>
  <div data-panel="going" hidden>${D.events.slice(0, 2).map((e) => `<a href="#" class="row rv press" ${go('event-ticket', { id: e.id })}><div class="datebox"><small>${e.day}</small><b>${e.date.split(' ')[1]}</b></div><div class="tx"><h3>${e.title}</h3><div class="meta small"><span>${I('ticket')}Your ticket</span></div></div>${I('right', 16)}</a>`).join('')}</div>
  <div data-panel="past" hidden><div class="row rv"><div class="datebox" style="opacity:.6"><small>SAT</small><b>1</b></div><div class="tx"><h3>Halloween block party</h3><div class="meta small"><span>You went · 88 people</span></div></div><button class="btn sm ghost" data-sheet="review" data-p="${P({ id: 'f1' })}">Rate</button></div></div></div>`,
  { sub: 'In Los Angeles', right: ib('plus', 'data-go="compose-event" aria-label="Host an event"') }) });
screen('badges', { group: 'You', title: 'Apply for a badge (3 steps)', render: () => page('Get a badge', `<div data-segroot class="badgeflow"><div class="progress rv"><i style="width:33%"></i></div><div class="meta small pad" style="margin:8px 0 14px"><span class="bstep">Step 1 of 3 · Choose</span></div>
  <div data-panel="b1" class="pad">${[['home', 'Verified property host', 'For people who rent out homes or rooms'], ['food', 'Verified restaurant owner', 'For owners and managers'], ['star', 'Local reviewer', 'For people who review places often'], ['building', 'Verified agency', 'For letting agencies']].map(([i, t, s], k) => `<button class="typecard rv press" data-act="pickbadge" ${k ? '' : 'style="box-shadow:inset 0 0 0 2px var(--accent)"'}><span class="gi">${I(i)}</span><span><b>${t}</b><small>${s}</small></span></button>`).join('')}
    <div class="small muted rv" style="margin:10px 2px 16px">You will need a photo ID and proof you own or manage the place.</div></div>
  <div data-panel="b2" class="pad" hidden><div class="slots" style="grid-template-columns:1fr 1fr">${['Photo ID', 'Proof of ownership'].map((t) => `<button class="slot" data-act="slot" style="aspect-ratio:4/3">${I('doc', 26)}<span style="position:absolute;bottom:10px;font-size:12.5px;font-weight:600">${t}</span></button>`).join('')}</div>
    <div class="hintx" style="margin:10px 2px 16px">${I('lock')} Only our review team sees these. They are deleted after the decision.</div>${field('Business or property name (optional)', inp('e.g. Sunset Lofts'))}</div>
  <div data-panel="b3" class="pad" hidden>${dl([['Badge', 'Verified property host'], ['Documents', '2 uploaded'], ['Name', D.me.name]])}<label style="display:flex;gap:10px;align-items:center;font-size:14px;margin-bottom:16px">${sw(true)} I confirm these documents are mine and true</label></div>
  <div class="pad"><button class="btn pri block rv" data-act="badgenext"><span>Continue</span></button></div></div>`, { sub: 'Badges show people they can trust you.' }) });
ACT.badgenext = (t) => {
  const r = t.closest('.badgeflow'), ps = ['b1', 'b2', 'b3'], cur = ps.findIndex((p) => !$(`[data-panel=${p}]`, r).hidden);
  if (cur === 1 && $$('.slot', r).some((s) => !s.querySelector('.ph'))) { shake($('.slots', r)); return toast('Add both documents'); }
  if (cur === 2) return success('Application sent', 'We usually decide within 2 working days.', () => nav('verification'));
  const a = $(`[data-panel=${ps[cur]}]`, r), b = $(`[data-panel=${ps[cur + 1]}]`, r);
  a.hidden = true; b.hidden = false; reveal(b); anim(b, [{ opacity: 0, transform: 'translateX(28px)' }, { opacity: 1, transform: 'none' }], 340);
  $('.progress i', r).style.width = ((cur + 2) / 3) * 100 + '%';
  $('.bstep', r).textContent = `Step ${cur + 2} of 3 · ${['Choose', 'Upload', 'Review and send'][cur + 1]}`;
  if (cur + 1 === 2) $('span', t).textContent = 'Send application';
};
let lastDeleted = null;
ACT.postmenu = (t) => {
  lastDeleted = t.closest('.mp');
  openSheet(`<div class="sb" style="padding-top:8px">${[['edit', 'Edit', 'noop'], ['share', 'Share', 'noop'], ['x', 'Delete', 'delpost']].map(([i, x, a]) => `<button class="gl ${a === 'delpost' ? 'danger' : ''}" data-act="${a}"><span class="gi">${I(i)}</span><span class="gt">${x}</span></button>`).join('')}</div>`);
};
ACT.delpost = () => {
  closeSheet();
  const row = lastDeleted; if (!row) return;
  anim(row, [{ transform: 'none', opacity: 1 }, { transform: 'translateX(-110%)', opacity: 0 }], 280).then(() => {
    row.hidden = true;
    toast('Post deleted');
    const bar = document.createElement('button'); bar.className = 'btn sec sm undo'; bar.textContent = 'Undo'; bar.dataset.act = 'undo';
    bar.style.cssText = 'position:absolute;z-index:75;left:50%;bottom:40px;transform:translateX(-50%)';
    vp.appendChild(bar); setTimeout(() => bar.isConnected && bar.remove(), 3000);
  });
};
ACT.undo = (t) => { t.remove(); const row = lastDeleted; if (!row) return; row.hidden = false; anim(row, [{ transform: 'translateX(-110%)', opacity: 0 }, { transform: 'none', opacity: 1 }], 300); };
ACT.noop = () => closeSheet();
