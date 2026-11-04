/* ===== B · Paper — part 3: the one-page composer with "+ add" chips (overrides A's checklist) ===== */
NOTES['compose-listing'] = ['One page instead of 4 steps; photos are the strip at the top (today they are step 4 of 4).', 'City, state, country and currency come from your profile.', 'Fourteen optional facts are dashed "+" chips; only the ones you tap become fields.', 'Save to drafts sits next to Publish.'];
const OPT = {
  deposit: ['Deposit', () => field('Deposit', `<div class="input"><span class="pre">$</span><input placeholder="e.g. 1,800"></div>`)],
  avail: ['Available from', () => field('Available from', `<div class="input">${I('cal', 19)}<input type="date" value="2026-12-01"></div>`)],
  lease: ['Lease', () => `<div class="field"><span>Lease</span><div class="cflow" data-single>${['Month-to-month', '6 months', '12 months'].map((t) => `<button class="chip" data-toggle>${t}</button>`).join('')}</div></div>`],
  furnished: ['Furnished', () => `<label class="field" style="display:flex;justify-content:space-between;align-items:center"><span style="margin:0">Furnished</span>${sw(true)}</label>`],
  pets: ['Pets', () => `<div class="field"><span>Pets</span><div class="cflow">${['Cats OK', 'Dogs OK', 'No pets'].map((t) => `<button class="chip" data-toggle>${t}</button>`).join('')}</div></div>`],
  amen: ['Amenities', () => `<div class="field"><span>Amenities</span><div class="cflow">${['Parking', 'In-unit laundry', 'Dishwasher', 'A/C', 'Balcony', 'Gym', 'Elevator'].map((t) => `<button class="chip" data-toggle>${t}</button>`).join('')}</div></div>`],
  size: ['Size', () => field('Size (sq ft)', inp('e.g. 760'))],
  floor: ['Floor', () => field('Floor', inp('e.g. 3rd'))],
  year: ['Year built', () => field('Year built', inp('e.g. 1962'))],
  heat: ['Heating & cooling', () => `<div class="grid2">${field('Heating', inp('e.g. Central'))}${field('Cooling', inp('e.g. Wall A/C'))}</div>`],
  util: ['Utilities', () => field('Utilities', inp('e.g. Water included'))],
  parking: ['Parking', () => field('Parking', inp('e.g. 1 garage spot'))],
};
const addChips = (keys) => `<div class="addchips">${keys.map((k) => `<button class="addchip" data-act="addf" data-f="${k}"><b>+</b>${OPT[k][0]}</button>`).join('')}</div><div class="addfs"></div>`;
const strip = (n = 5) => `<div class="slots strip" data-hscroll>${Array.from({ length: n }, (_, i) => `<button class="slot ${i ? '' : 'cover'}" data-act="slot">${I(i ? 'plus' : 'camera', i ? 22 : 28)}${i ? '' : '<span style="position:absolute;bottom:10px;font-size:12px;font-weight:600">Cover photo</span>'}</button>`).join('')}</div>`;
const pubBar = (label = 'Publish') => `<div class="stick"><button class="btn ghost" data-act="draft">Save to drafts</button><button class="btn pri" style="flex:1" data-act="publish">${label}</button></div>`;
const whereLine = `<div class="prefill">${I('check')}<div style="flex:1"><b>Los Angeles</b>, California, US · prices in US$<div class="small muted">From your profile</div></div><button class="small" style="text-decoration:underline" data-sheet="city">Change</button></div>`;
screen('compose-listing', { group: 'Post', title: 'List a whole place', render: () => page('List a <em>place</em>', `${strip()}<div class="hintx" style="padding:4px 18px 10px">${I('sparkles')} Five or more photos get twice the messages.</div>
  <div class="secn rv"><h3>The basics</h3>${field('Title', inp('e.g. Sunny 1-bed near the park'))}<div class="field"><span>Type</span><div class="cflow" data-single>${['Apartment', 'House', 'Studio', 'Room'].map((t, i) => `<button class="chip ${i ? '' : 'on'}" data-toggle>${t}</button>`).join('')}</div></div>
    ${field('Rent a month', `<div class="input"><span class="pre">$</span><input inputmode="numeric" placeholder="e.g. 1,800"></div>`)}<div class="grid2">${stepper('Beds', 1)}${stepper('Baths', 1, 1)}</div></div>
  <div class="secn rv"><h3>Where</h3>${field('Street address', inp('Only the area is shown publicly', '', 'pin'))}${whereLine}</div>
  <div class="secn rv"><h3>In a few words</h3>${field('Description', `<div class="input"><textarea class="desc" placeholder="What is it like to live there?"></textarea></div>`)}<button class="btn ghost sm" data-act="autofill">${I('sparkles', 16)} Write a starter for me</button></div>
  <div class="secn rv"><h3>Add more, if you like</h3><p class="small muted" style="margin:-4px 0 12px">All optional. Tap one to add it.</p>${addChips(['deposit', 'avail', 'lease', 'furnished', 'pets', 'amen', 'parking', 'size', 'floor', 'year', 'heat', 'util'])}</div>`,
  { sub: 'One page. Only what matters is asked.', stick: pubBar() }) });
screen('compose-room', { group: 'Post', title: 'Rent out a room', render: () => page('Rent out a <em>room</em>', `${strip(3)}<div style="height:8px"></div>
  <div class="secn rv"><h3>The room</h3>${field('Title', inp('e.g. Sunny room in a 3-bed house'))}${field('Rent a month', `<div class="input"><span class="pre">$</span><input inputmode="numeric" placeholder="e.g. 1,050"><span class="small muted">USD</span></div>`, 'Currency follows your country')}</div>
  <div class="secn rv"><h3>The home</h3><div style="display:grid;gap:8px">${stepper('Bedrooms', 3, 1)}${stepper('Bathrooms', 2, 1)}${stepper('People living there', 2)}${stepper('Rooms free', 1, 1)}</div></div>
  <div class="secn rv"><h3>Where</h3>${field('Street address', inp('Only the area is shown', '', 'pin'))}${whereLine}</div>
  <div class="secn rv"><h3>House rules</h3><div class="cflow" style="margin-bottom:12px">${['No smoking', 'Pets OK', 'Quiet after 11', 'Guests sometimes'].map((t) => `<button class="chip" data-toggle>${t}</button>`).join('')}</div>${field('Others', `<div class="input chipinput"><input placeholder="Type, then space"></div>`)}</div>`,
  { sub: 'A room in a home you share.', stick: pubBar() }) });
ACT.addf = (t) => {
  const box = $('.addfs', t.closest('.secn')), k = t.dataset.f;
  const d = document.createElement('div'); d.className = 'addf'; d.innerHTML = OPT[k][1]();
  box.appendChild(d); wire(d);
  const h = d.offsetHeight;
  anim(d, [{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], 300).then(() => (d.style.height = ''));
  anim(t, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.6)', opacity: 0 }], 200).then(() => t.remove());
  const i = $('input', d); if (i) setTimeout(() => i.focus({ preventScroll: true }), 320);
};
