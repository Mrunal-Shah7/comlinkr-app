import { type NewsArticle } from "./news";

// Category-specific placeholder images — loremflickr.com (keyword-relevant, always loads)
export const NEWS_CATEGORY_IMAGES: Record<string, string[]> = {
  local:         [0,1,2,3,4,5].map(n => `https://loremflickr.com/400/220/city?lock=${n}`),
  nation:        [0,1,2,3,4,5].map(n => `https://loremflickr.com/400/220/politics?lock=${n}`),
  world:         [0,1,2,3,4,5].map(n => `https://loremflickr.com/400/220/travel?lock=${n}`),
  business:      [0,1,2,3,4,5].map(n => `https://loremflickr.com/400/220/business?lock=${n}`),
  technology:    [0,1,2,3,4,5].map(n => `https://loremflickr.com/400/220/technology?lock=${n}`),
  health:        [0,1,2,3,4,5].map(n => `https://loremflickr.com/400/220/medical?lock=${n}`),
  sports:        [0,1,2,3,4,5].map(n => `https://loremflickr.com/400/220/sports?lock=${n}`),
  entertainment: [0,1,2,3,4,5].map(n => `https://loremflickr.com/400/220/concert?lock=${n}`),
  mycity:        [0,1,2,3,4,5].map(n => `https://loremflickr.com/400/220/city?lock=${n + 10}`),
  mycountry:     [0,1,2,3,4,5].map(n => `https://loremflickr.com/400/220/landscape?lock=${n}`),
  all:           [0,1,2,3,4,5].map(n => `https://loremflickr.com/400/220/news?lock=${n}`),
};


/** Stable hash from a string — avoids consecutive repetition of images */
export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Pick a LoremFlickr keyword from article title + category.
 * loremflickr.com returns real topic-relevant photos for each keyword.
 * The `lock` param (0-99) gives variety while keeping images consistent per article.
 */
export function newsImageUrl(title: string, category: string, lockSeed: number): string {
  const t = title.toLowerCase();
  let kw: string;
  if (/\b(basketball|nba|nfl|football|soccer|tennis|cricket|rugby|olympic|championship|league|match|athlete|tournament|stadium|score)\b/.test(t)) kw = "sports";
  else if (/\b(ai|artificial intelligence|robot|chatgpt|openai|apple|google|microsoft|tesla|chip|software|app|cyber|startup|algorithm|drone)\b/.test(t)) kw = "technology";
  else if (/\b(election|president|congress|vote|parliament|government|senate|minister|policy|democrat|republican|campaign|ballot)\b/.test(t)) kw = "politics";
  else if (/\b(bitcoin|crypto|stock|nasdaq|dow|inflation|federal reserve|bank|invest|economy|gdp|revenue|profit|wall street|trading)\b/.test(t)) kw = "finance";
  else if (/\b(vaccine|cancer|heart|hospital|doctor|medicine|disease|treatment|drug|mental health|fitness|wellness|surgery|healthcare|pandemic)\b/.test(t)) kw = "medical";
  else if (/\b(wildfire|flood|hurricane|storm|earthquake|tsunami|drought|climate|emissions|solar|wind energy|environment|pollution|disaster)\b/.test(t)) kw = "nature";
  else if (/\b(movie|film|oscar|grammy|celebrity|actor|actress|singer|concert|album|netflix|disney|award|streaming|music)\b/.test(t)) kw = "concert";
  else if (/\b(police|crime|arrest|shooting|murder|robbery|court|trial|verdict|prison|suspect|lawsuit|charged|investigation)\b/.test(t)) kw = "justice";
  else if (/\b(school|university|college|student|graduation|teacher|education|campus|scholarship|classroom|academic)\b/.test(t)) kw = "education";
  else if (/\b(restaurant|chef|cuisine|recipe|dining|meal|cook|kitchen|food|bakery|cafe)\b/.test(t)) kw = "food";
  else if (/\b(housing|mortgage|apartment|rent|property|real estate|home sale|construction|condo|building|landlord)\b/.test(t)) kw = "architecture";
  else if (/\b(train|subway|bus|airport|airline|flight|traffic|highway|transit|bridge|commute)\b/.test(t)) kw = "transportation";
  else if (/\b(war|military|soldier|army|nato|conflict|troops|attack|missile|weapons|defense)\b/.test(t)) kw = "military";
  else if (/\b(space|nasa|rocket|satellite|planet|mars|moon|astronaut|telescope|cosmos)\b/.test(t)) kw = "space";
  // Fallback to category
  else if (category === "local" || category === "mycity") kw = "city";
  else if (category === "nation" || category === "mycountry") kw = "landscape";
  else if (category === "world") kw = "travel";
  else if (category === "business") kw = "business";
  else if (category === "health") kw = "medical";
  else if (category === "technology") kw = "technology";
  else if (category === "sports") kw = "sports";
  else if (category === "entertainment") kw = "concert";
  else kw = "news";

  return `https://loremflickr.com/400/220/${kw}?lock=${lockSeed % 100}`;
}

/** Content keyword → topic-specific image pools (more relevant than generic category images) */
export const KEYWORD_IMAGES: Array<{ keywords: string[]; images: string[] }> = [
  {
    keywords: ["election","vote","ballot","president","congress","senate","parliament","politician","minister","policy","democrat","republican","political party"],
    images: [
      "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400&q=70",
      "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=400&q=70",
      "https://images.unsplash.com/photo-1569025690938-a00729c9e1f9?w=400&q=70",
      "https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=400&q=70",
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&q=70",
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=70",
    ],
  },
  {
    keywords: ["police","crime","arrest","shooting","murder","robbery","theft","investigation","court","trial","verdict","prison","jail","suspect","charged","lawsuit"],
    images: [
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=70",
      "https://images.unsplash.com/photo-1521502124943-6c15fe4fdb4c?w=400&q=70",
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&q=70",
      "https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=400&q=70",
      "https://images.unsplash.com/photo-1575431814097-c2a2b2c28c58?w=400&q=70",
    ],
  },
  {
    keywords: ["fire","wildfire","blaze","firefighter","burns","smoke","arson","inferno"],
    images: [
      "https://images.unsplash.com/photo-1604502396898-9e34c5ac2ad9?w=400&q=70",
      "https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?w=400&q=70",
      "https://images.unsplash.com/photo-1529923238-e75e7c0c7bb2?w=400&q=70",
      "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&q=70",
    ],
  },
  {
    keywords: ["flood","hurricane","storm","tornado","earthquake","tsunami","cyclone","disaster","emergency","evacuation","drought"],
    images: [
      "https://images.unsplash.com/photo-1527787337516-b1bb6c1ef67b?w=400&q=70",
      "https://images.unsplash.com/photo-1504870124905-0de9ccdb3e0d?w=400&q=70",
      "https://images.unsplash.com/photo-1551524559-8af4e6624178?w=400&q=70",
      "https://images.unsplash.com/photo-1476611338391-6f395a0ebc7b?w=400&q=70",
    ],
  },
  {
    keywords: ["school","university","college","student","graduation","teacher","education","campus","scholarship","academic","classroom"],
    images: [
      "https://images.unsplash.com/photo-1498243691581-b6927df9b35b?w=400&q=70",
      "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&q=70",
      "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400&q=70",
      "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=400&q=70",
      "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400&q=70",
    ],
  },
  {
    keywords: ["hospital","doctor","surgery","patient","vaccine","medicine","nurse","clinic","mental health","drug","cancer","treatment","pandemic"],
    images: [
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=70",
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&q=70",
      "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&q=70",
      "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=400&q=70",
      "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=400&q=70",
      "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400&q=70",
    ],
  },
  {
    keywords: ["traffic","highway","road","bridge","accident","crash","transit","subway","bus","train","airport","airline","flight","commute"],
    images: [
      "https://images.unsplash.com/photo-1494522855575-2c807dbc3a54?w=400&q=70",
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&q=70",
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&q=70",
      "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&q=70",
    ],
  },
  {
    keywords: ["stock market","wall street","nasdaq","dow","crypto","bitcoin","ethereum","inflation","recession","gdp","interest rate","federal reserve","bank","fund","investment"],
    images: [
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=70",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=70",
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=70",
      "https://images.unsplash.com/photo-1462206092226-f46025afe194?w=400&q=70",
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=70",
      "https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?w=400&q=70",
    ],
  },
  {
    keywords: ["artificial intelligence","machine learning","chatgpt","openai","robot","autonomous","neural","algorithm","data center","chip","semiconductor","processor","tech giant"],
    images: [
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=70",
      "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=400&q=70",
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&q=70",
      "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&q=70",
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=70",
      "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400&q=70",
    ],
  },
  {
    keywords: ["climate","carbon","emissions","global warming","renewable","solar","wind energy","fossil fuel","environment","pollution","plastic","recycling","green energy"],
    images: [
      "https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400&q=70",
      "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=400&q=70",
      "https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=400&q=70",
      "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400&q=70",
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=400&q=70",
    ],
  },
  {
    keywords: ["football","soccer","nfl","nba","basketball","baseball","tennis","golf","olympic","cricket","rugby","athlete","championship","tournament","league","world cup"],
    images: [
      "https://images.unsplash.com/photo-1461896836934-bd45ba788154?w=400&q=70",
      "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&q=70",
      "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400&q=70",
      "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&q=70",
      "https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=400&q=70",
      "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&q=70",
    ],
  },
  {
    keywords: ["movie","film","oscar","grammy","celebrity","actor","actress","singer","concert","album","streaming","netflix","hbo","disney","music award"],
    images: [
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=70",
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&q=70",
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=70",
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&q=70",
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=70",
      "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=400&q=70",
    ],
  },
  {
    keywords: ["restaurant","food","chef","cuisine","recipe","dining","meal","eat","cook","kitchen","bakery","coffee shop"],
    images: [
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=70",
      "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&q=70",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=70",
      "https://images.unsplash.com/photo-1482275548304-a58859dc31b7?w=400&q=70",
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=70",
    ],
  },
  {
    keywords: ["housing","real estate","mortgage","apartment","rent","property","home sale","house prices","construction","development","condo"],
    images: [
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=70",
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&q=70",
      "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=400&q=70",
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=70",
    ],
  },
];

/** City landmark images — used for local/mycity category articles */
export const CITY_LANDMARK_IMAGES: Record<string, string[]> = {
  "new york": [
    "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&q=70",
    "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400&q=70",
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=70",
    "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400&q=70",
  ],
  "los angeles": [
    "https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=400&q=70",
    "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=400&q=70",
    "https://images.unsplash.com/photo-1568386453619-84c3ff4b43c5?w=400&q=70",
  ],
  "chicago": [
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=70",
    "https://images.unsplash.com/photo-1494522855575-2c807dbc3a54?w=400&q=70",
    "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400&q=70",
  ],
  "london": [
    "https://images.unsplash.com/photo-1513635269975-59a10b8d2000?w=400&q=70",
    "https://images.unsplash.com/photo-1486325212991-8b5e6d0a8f5a?w=400&q=70",
    "https://images.unsplash.com/photo-1520986606909-a4f92de6a0ac?w=400&q=70",
  ],
  "paris": [
    "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&q=70",
    "https://images.unsplash.com/photo-1499856844503-3b7bf4c31065?w=400&q=70",
    "https://images.unsplash.com/photo-1471623432079-b009d30b6729?w=400&q=70",
  ],
  "toronto": [
    "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=400&q=70",
    "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=400&q=70",
  ],
  "sydney": [
    "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=400&q=70",
    "https://images.unsplash.com/photo-1559508551-44bff1de756b?w=400&q=70",
    "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=400&q=70",
  ],
  "dubai": [
    "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&q=70",
    "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=400&q=70",
  ],
  "tokyo": [
    "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&q=70",
    "https://images.unsplash.com/photo-1513569771920-c9e1d31714af?w=400&q=70",
  ],
  "singapore": [
    "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400&q=70",
    "https://images.unsplash.com/photo-1545569806-eccb8a5b97a9?w=400&q=70",
  ],
  "mumbai": [
    "https://images.unsplash.com/photo-1562979314-bee7453e911c?w=400&q=70",
    "https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?w=400&q=70",
  ],
  "delhi": [
    "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&q=70",
    "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&q=70",
  ],
  "berlin": [
    "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400&q=70",
    "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&q=70",
  ],
  "amsterdam": [
    "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400&q=70",
    "https://images.unsplash.com/photo-1576924542622-772281b13aa8?w=400&q=70",
  ],
  "nairobi": [
    "https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=400&q=70",
    "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=400&q=70",
  ],
  "lagos": [
    "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&q=70",
    "https://images.unsplash.com/photo-1593698054498-56ba27195487?w=400&q=70",
  ],
  "accra": [
    "https://images.unsplash.com/photo-1608023136037-626dad6b2e7b?w=400&q=70",
    "https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=400&q=70",
  ],
  "johannesburg": [
    "https://images.unsplash.com/photo-1577948000111-9c970dfe3743?w=400&q=70",
    "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=400&q=70",
  ],
  "cape town": [
    "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=400&q=70",
    "https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?w=400&q=70",
  ],
  "houston": [
    "https://images.unsplash.com/photo-1465301055284-72f355c7cf5a?w=400&q=70",
    "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&q=70",
  ],
  "miami": [
    "https://images.unsplash.com/photo-1506905489134-525e4a13c84a?w=400&q=70",
    "https://images.unsplash.com/photo-1514214246283-d8a5a0139769?w=400&q=70",
  ],
  "san francisco": [
    "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&q=70",
    "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=400&q=70",
  ],
  "seattle": [
    "https://images.unsplash.com/photo-1502175353174-a7a70e73b362?w=400&q=70",
    "https://images.unsplash.com/photo-1506905489134-525e4a13c84a?w=400&q=70",
  ],
  "melbourne": [
    "https://images.unsplash.com/photo-1545044846-351ba102b6d5?w=400&q=70",
    "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=400&q=70",
  ],
  "vancouver": [
    "https://images.unsplash.com/photo-1559511260-66a654ae982a?w=400&q=70",
    "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&q=70",
  ],
  "montreal": [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=70",
    "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=400&q=70",
  ],
  "bangalore": [
    "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=400&q=70",
    "https://images.unsplash.com/photo-1562979314-bee7453e911c?w=400&q=70",
  ],
  "osaka": [
    "https://images.unsplash.com/photo-1545569806-eccb8a5b97a9?w=400&q=70",
    "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&q=70",
  ],
  "seoul": [
    "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=400&q=70",
    "https://images.unsplash.com/photo-1527838832700-5059252407fa?w=400&q=70",
  ],
  "beijing": [
    "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=400&q=70",
    "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&q=70",
  ],
  "shanghai": [
    "https://images.unsplash.com/photo-1538428494232-9c0d8a3ab403?w=400&q=70",
    "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=400&q=70",
  ],
};

/** Country-specific images for national/mycountry news */
export const COUNTRY_NEWS_IMAGES: Record<string, string[]> = {
  "United States": [
    "https://images.unsplash.com/photo-1501466044931-62695aada8e9?w=400&q=70",
    "https://images.unsplash.com/photo-1569025690938-a00729c9e1f9?w=400&q=70",
    "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=400&q=70",
    "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=400&q=70",
    "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&q=70",
  ],
  "United Kingdom": [
    "https://images.unsplash.com/photo-1513635269975-59a10b8d2000?w=400&q=70",
    "https://images.unsplash.com/photo-1486325212991-8b5e6d0a8f5a?w=400&q=70",
    "https://images.unsplash.com/photo-1520986606909-a4f92de6a0ac?w=400&q=70",
    "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400&q=70",
  ],
  "Canada": [
    "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=400&q=70",
    "https://images.unsplash.com/photo-1559511260-66a654ae982a?w=400&q=70",
    "https://images.unsplash.com/photo-1560813962-ff3d8fcf59ba?w=400&q=70",
  ],
  "Australia": [
    "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=400&q=70",
    "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=400&q=70",
    "https://images.unsplash.com/photo-1545044846-351ba102b6d5?w=400&q=70",
  ],
  "India": [
    "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&q=70",
    "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&q=70",
    "https://images.unsplash.com/photo-1562979314-bee7453e911c?w=400&q=70",
    "https://images.unsplash.com/photo-1585130778434-48dc0d3f45e5?w=400&q=70",
  ],
  "Germany": [
    "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400&q=70",
    "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&q=70",
  ],
  "France": [
    "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&q=70",
    "https://images.unsplash.com/photo-1499856844503-3b7bf4c31065?w=400&q=70",
    "https://images.unsplash.com/photo-1471623432079-b009d30b6729?w=400&q=70",
  ],
  "Japan": [
    "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&q=70",
    "https://images.unsplash.com/photo-1513569771920-c9e1d31714af?w=400&q=70",
    "https://images.unsplash.com/photo-1545569806-eccb8a5b97a9?w=400&q=70",
  ],
  "Nigeria": [
    "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&q=70",
    "https://images.unsplash.com/photo-1593698054498-56ba27195487?w=400&q=70",
  ],
  "Kenya": [
    "https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=400&q=70",
    "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=400&q=70",
    "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=400&q=70",
  ],
  "Ghana": [
    "https://images.unsplash.com/photo-1608023136037-626dad6b2e7b?w=400&q=70",
    "https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=400&q=70",
  ],
  "South Africa": [
    "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=400&q=70",
    "https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?w=400&q=70",
    "https://images.unsplash.com/photo-1577948000111-9c970dfe3743?w=400&q=70",
  ],
  "Brazil": [
    "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400&q=70",
    "https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?w=400&q=70",
  ],
  "UAE": [
    "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&q=70",
    "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=400&q=70",
  ],
  "Singapore": [
    "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400&q=70",
    "https://images.unsplash.com/photo-1545569806-eccb8a5b97a9?w=400&q=70",
  ],
};

/** Placeholder image for a news card when RSS has no image (keyword / city / country aware). */
export function getArticleImage(article: NewsArticle, city: string, userCountry: string): string {
  const existing = article.image?.trim();
  if (existing) return existing;
  const titleLower = (article.title || "").toLowerCase();
  const cat = article.category || "all";
  const seed = hashStr(`${article.id}:${article.title}`);

  for (const row of KEYWORD_IMAGES) {
    if (row.keywords.some((kw) => titleLower.includes(kw))) {
      const imgs = row.images;
      return imgs[seed % imgs.length];
    }
  }

  const cityKey = city.trim().toLowerCase();
  const cityPool = CITY_LANDMARK_IMAGES[cityKey];
  if (cityPool?.length) return cityPool[seed % cityPool.length];

  const countryPool = COUNTRY_NEWS_IMAGES[userCountry];
  if ((cat === "nation" || cat === "mycountry") && countryPool?.length) {
    return countryPool[seed % countryPool.length];
  }

  const catKey = cat === "mycity" ? "mycity" : cat;
  const pool = NEWS_CATEGORY_IMAGES[catKey] ?? NEWS_CATEGORY_IMAGES.all;
  if (pool?.length) return pool[seed % pool.length];

  return newsImageUrl(article.title, cat, seed);
}
