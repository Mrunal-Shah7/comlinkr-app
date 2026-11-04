/* Shared demo content: Los Angeles, shaped like the local seed (fictional people, picsum photos). */
const IMG = (seed, w = 800, h = 600) => `https://picsum.photos/seed/cl-${seed}/${w}/${h}`;
const D = {
  city: 'Los Angeles', cityShort: 'LA', cityTime: '12:19',
  me: { name: 'Jordan Lee', first: 'Jordan', handle: 'jordanlee', initials: 'JL', since: 'Oct 2026', area: 'Echo Park',
    vibes: ['Fitness & health', 'Nightlife', 'Foodie', 'Outdoor'], interests: ['Food & dining', 'Jobs & careers', 'Shopping'],
    communities: ['Korean', 'Italian', 'Buddhist'], budget: '$900–1,300', movein: 'Dec 1', sleep: 'Night owl' },
  listings: [
    { id: 'l1', title: 'Sunny 1-bed near Lincoln Blvd', type: 'Apartment', price: 1234, beds: 1, baths: 1, sqft: 769, area: 'Santa Monica', addr: '491 Lincoln Blvd', avail: 'Dec 2', owner: 'Ava Nguyen', img: 'l1', n: 3, lease: 'Month-to-month', furnished: false, pets: 'Cats OK', amen: ['In-unit laundry', 'Parking', 'Balcony'], verified: true, fresh: true },
    { id: 'l2', title: 'Bright studio off Melrose', type: 'Studio', price: 1714, beds: 0, baths: 1, sqft: 480, area: 'Fairfax', addr: '474 Melrose Ave', avail: 'Now', owner: 'Noah Johnson', img: 'l2', n: 3, lease: '12 months', furnished: true, amen: ['Gym', 'Rooftop'], verified: false },
    { id: 'l3', title: 'Craftsman house with garden', type: 'House', price: 3950, beds: 3, baths: 2, sqft: 1620, area: 'Silver Lake', addr: '2140 Hyperion Ave', avail: 'Jan 4', owner: 'Liam Chen', img: 'l3', n: 5, lease: '12 months', furnished: false, pets: 'Dogs OK', amen: ['Garden', 'Parking', 'Washer'], verified: true },
    { id: 'l4', title: '2-bed with balcony, quiet street', type: 'Apartment', price: 2650, beds: 2, baths: 2, sqft: 980, area: 'Culver City', addr: '3820 Main St', avail: 'Dec 15', owner: 'Sofia Ramirez', img: 'l4', n: 4, lease: '12 months', furnished: false, amen: ['Balcony', 'Dishwasher', 'Parking'], verified: false },
    { id: 'l5', title: 'Top-floor 1-bed, city views', type: 'Apartment', price: 2100, beds: 1, baths: 1, sqft: 650, area: 'Echo Park', addr: '1455 Sunset Blvd', avail: 'Now', owner: 'Aarav Mehta', img: 'l5', n: 3, lease: '6 months', furnished: true, amen: ['Elevator', 'Air conditioning'], verified: true },
  ],
  rooms: [
    { id: 'r1', title: 'Room in a 3-bed house, Echo Park', price: 1050, spots: 1, of: 3, mates: 2, area: 'Echo Park', img: 'r1', rules: ['Quiet after 11', 'No smoking'], avail: 'Dec 1' },
    { id: 'r2', title: 'Private room, shared loft', price: 1290, spots: 1, of: 2, mates: 1, area: 'Arts District', img: 'r2', rules: ['Pets OK'], avail: 'Now' },
    { id: 'r3', title: 'Two rooms in a family home', price: 940, spots: 2, of: 4, mates: 2, area: 'Koreatown', img: 'r3', rules: ['Guests sometimes'], avail: 'Jan 1' },
  ],
  mates: [
    { id: 'm1', name: 'Liam Chen', age: 26, job: 'UX designer', match: 86, budget: '$900–1,200', movein: 'Nov 29', sleep: 'Night owl', tags: ['Clean', 'No pets', 'Hybrid'], hue: 200, common: ['Foodie', 'Night owl', 'Korean'] },
    { id: 'm2', name: 'Sofia Ramirez', age: 24, job: 'Nurse', match: 74, budget: '$800–1,100', movein: 'Jan 4', sleep: 'Early bird', tags: ['Tidy', 'Cat owner'], hue: 340, common: ['Outdoor'] },
    { id: 'm3', name: 'Aarav Mehta', age: 28, job: 'Data analyst', match: 68, budget: '$1,000–1,400', movein: 'Now', sleep: 'Flexible', tags: ['Vegetarian', 'Gym'], hue: 30, common: ['Fitness & health'] },
    { id: 'm4', name: 'Noah Johnson', age: 31, job: 'Chef', match: 61, budget: '$1,100–1,500', movein: 'Dec 15', sleep: 'Night owl', tags: ['Cooks a lot', 'Social'], hue: 150, common: ['Foodie', 'Nightlife'] },
  ],
  food: [
    { id: 'f1', name: 'Sunset Mexican Bistro', cuisine: 'Mexican', rating: 4.7, reviews: 87, price: '$$', area: 'Echo Park', open: 'Open · until 10 PM', img: 'f1', dishes: ['Al pastor tacos', 'Elote', 'Churros'], services: ['Dine-in', 'Takeout'] },
    { id: 'f2', name: 'Udupi Palace', cuisine: 'South Indian', rating: 4.6, reviews: 142, price: '$', area: 'Artesia', open: 'Open · until 9:30 PM', img: 'f2', dishes: ['Masala dosa', 'Idli sambar', 'Filter coffee'], services: ['Dine-in', 'Delivery'] },
    { id: 'f3', name: 'Sakura Ramen House', cuisine: 'Japanese', rating: 4.5, reviews: 210, price: '$$', area: 'Little Tokyo', img: 'f3', dishes: ['Tonkotsu', 'Gyoza'], services: ['Dine-in'] },
    { id: 'f4', name: 'Bella Napoli', cuisine: 'Italian', rating: 4.4, reviews: 64, price: '$$$', area: 'Silver Lake', open: 'Opens 5 PM', img: 'f4', dishes: ['Margherita', 'Cacio e pepe'], services: ['Dine-in', 'Reservations'] },
    { id: 'f5', name: 'Seoul Garden BBQ', cuisine: 'Korean', rating: 4.8, reviews: 301, price: '$$$', area: 'Koreatown', open: 'Open · until 1 AM', img: 'f5', dishes: ['Galbi', 'Kimchi stew'], services: ['Dine-in', 'Groups'] },
  ],
  news: [
    { id: 'n1', title: 'Metro runs late-night B Line trains on weekends from December', src: 'Transit desk', time: '2h', scope: 'Local', img: 'n1', mins: 3 },
    { id: 'n2', title: 'New protected bike lanes open along Venice Blvd', src: 'City news', time: '4h', scope: 'Local', img: 'n2', mins: 2 },
    { id: 'n3', title: 'Renter assistance applications reopen next week', src: 'City Hall', time: '6h', scope: 'Local', img: 'n3', mins: 4 },
    { id: 'n4', title: 'Silver Lake farmers market returns with 40 stalls', src: 'Neighbourhood', time: '1d', scope: 'Local', img: 'n4', mins: 2 },
    { id: 'n5', title: 'California expands transit pass for students', src: 'State news', time: '1d', scope: 'National', img: 'n5', mins: 3 },
  ],
  posts: [
    { id: 'p1', by: 'Sofia Ramirez', hue: 340, title: 'Street closure on Melrose this weekend', body: 'Melrose is closed between Fairfax and La Brea Saturday 8 AM to 6 PM for the street fair. Buses detour via Beverly.', time: '6d', likes: 11, comments: 1 },
    { id: 'p2', by: 'Aarav Mehta', hue: 30, title: 'Free tax help for newcomers at the library', body: 'Echo Park branch, Tuesdays 4–7 PM, no appointment needed.', time: '1w', likes: 23, comments: 4, img: 'p2' },
  ],
  events: [
    { id: 'e1', title: 'Rooftop sunset social', cat: 'Social', day: 'FRI', date: 'Nov 7', time: '6–9 PM', venue: 'The Rooftop, DTLA', price: 'Free', going: 42, cap: 60, host: 'Newcomers LA', img: 'e1' },
    { id: 'e2', title: 'Griffith hike and coffee', cat: 'Outdoor', day: 'SAT', date: 'Nov 8', time: '8 AM', venue: 'Griffith Observatory lot', price: 'Free', going: 18, host: 'Liam Chen', img: 'e2' },
    { id: 'e3', title: "Newcomers' brunch", cat: 'Food', day: 'SUN', date: 'Nov 9', time: '11 AM', venue: 'Echo Park Lake', price: '$15', going: 27, cap: 30, host: 'Ava Nguyen', img: 'e3' },
    { id: 'e4', title: 'Diwali night market', cat: 'Culture', day: 'SAT', date: 'Nov 15', time: '5–11 PM', venue: 'Artesia', price: 'Free', going: 156, host: 'Little India Assn', img: 'e4' },
  ],
  stories: [
    { id: 's1', by: 'Ava Nguyen', hue: 280, title: 'Sunset at Santa Monica pier', img: 's1', cat: 'Places' },
    { id: 's2', by: 'Liam Chen', hue: 200, title: 'Best tacos so far', img: 's2', cat: 'Food' },
    { id: 's3', by: 'Sofia Ramirez', hue: 340, title: 'Moving day done', img: 's3', cat: 'Housing' },
    { id: 's4', by: 'Noah Johnson', hue: 150, title: 'Farmers market haul', img: 's4', cat: 'Food' },
    { id: 's5', by: 'Aarav Mehta', hue: 30, title: 'Hollywood sign hike', img: 's5', cat: 'Outdoor' },
  ],
  quests: [
    { id: 'q1', title: 'Golden hour shot', kind: 'Photo', left: '3 days left', joined: 24, reward: 'Featured on Explore', img: 'q1' },
    { id: 'q2', title: 'Taco trail: 5 taquerias', kind: 'Visit', left: '2 weeks left', joined: 61, reward: 'Foodie badge', img: 'q2', progress: 2, of: 5 },
    { id: 'q3', title: 'Say hi to a neighbour', kind: 'Social', left: '5 days left', joined: 12, reward: 'Connector badge', img: 'q3' },
  ],
  poll: [
    { tag: 'Housing', q: 'Tiny studio in the city centre, or a big house an hour away?', a: 'Tiny studio, city centre', b: 'Big house, an hour out', pa: 64 },
    { tag: 'Food', q: 'Taco truck at midnight, or brunch at 11?', a: 'Midnight taco truck', b: 'Brunch at 11', pa: 58 },
    { tag: 'Transit', q: 'Car in LA, or Metro and bike?', a: 'I need a car', b: 'Metro and bike', pa: 71 },
  ],
  questions: [
    { id: 'c1', by: 'Liam Chen', hue: 200, cat: 'Events', q: 'Any good weekend events for newcomers?', time: '6d', votes: 10, answers: [
      { by: 'Ava Nguyen', hue: 280, text: 'The rooftop social on Friday is very welcoming, most people there are new to LA.', votes: 6, best: true },
      { by: 'Noah Johnson', hue: 150, text: 'Smorgasburg on Sundays in the Arts District, go early.', votes: 3 }] },
    { id: 'c2', by: 'Sofia Ramirez', hue: 340, cat: 'Transit', q: 'Is the Metro safe late at night?', time: '6d', votes: 7, answers: [
      { by: 'Aarav Mehta', hue: 30, text: 'The B and D lines are fine until about 11; sit near the operator car.', votes: 4 }] },
    { id: 'c3', by: 'Aarav Mehta', hue: 30, cat: 'Food', q: 'Where can I find authentic South Indian food?', time: '1w', votes: 5, answers: [] },
    { id: 'c4', by: 'Ava Nguyen', hue: 280, cat: 'Housing', q: 'Which neighbourhood is best for new grads?', time: '1w', votes: 12, answers: [
      { by: 'Liam Chen', hue: 200, text: 'Koreatown: central, cheaper, great food, on the Purple line.', votes: 9, best: true }] },
    { id: 'c5', by: 'Noah Johnson', hue: 150, cat: 'Housing', q: 'Tips for setting up utilities?', time: '1w', votes: 15, answers: [] },
  ],
  chats: [
    { id: 'ch1', with: 'Ava Nguyen', hue: 280, about: 'Sunny 1-bed near Lincoln Blvd', last: 'Sure, Saturday at 11 works for a viewing.', time: '10:42', unread: 2, kind: 'Listings' },
    { id: 'ch2', with: "Newcomers' brunch", hue: 45, group: true, last: 'Liam: I will bring the frisbee', time: '09:15', unread: 0, kind: 'Events' },
    { id: 'ch3', with: 'Liam Chen', hue: 200, last: 'Want to see the Silver Lake place together?', time: 'Mon', unread: 0, kind: 'Roommates' },
    { id: 'ch4', with: 'Noah Johnson', hue: 150, about: 'Bright studio off Melrose', last: 'You: Is parking included?', time: 'Sun', unread: 0, kind: 'Listings' },
  ],
  notifs: [
    { icon: 'heart', text: '<b>Ava Nguyen</b> liked your answer about Koreatown', time: '5m', unread: true },
    { icon: 'msg', text: '<b>Noah Johnson</b> replied about the studio off Melrose', time: '1h', unread: true },
    { icon: 'cal', text: '<b>Rooftop sunset social</b> starts Friday at 6 PM', time: '3h' },
    { icon: 'users', text: '<b>Liam Chen</b> wants to connect as a roommate · 86% match', time: '1d' },
    { icon: 'check', text: 'Your listing <b>Room in Echo Park</b> is live', time: '2d' },
  ],
};
const PERSON = (name, hue, size = 40, cls = '') => {
  const ini = name.split(' ').map((w) => w[0]).slice(0, 2).join('');
  return `<span class="av ${cls}" style="--h:${hue ?? 210};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.38)}px">${ini}</span>`;
};
const photo = (seed, cls = '', w = 800, h = 600, extra = '') =>
  `<span class="ph ${cls}" ${extra}><img loading="lazy" alt="" src="${IMG(seed, w, h)}" onerror="this.style.opacity=0"></span>`;
