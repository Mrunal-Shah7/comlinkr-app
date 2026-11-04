// Builds the self-contained design files: node docs/design/2026-11-05-redesign/src/build.js
const fs = require('fs');
const path = require('path');
const here = __dirname, out = path.join(here, '..');
const read = (f) => fs.readFileSync(path.join(here, f), 'utf8');
const variants = [
  { file: 'a-clarity.html', css: ['a.css'], js: ['a1.js','a2.js','a3.js','a4.js'], name: 'A · Clarity', title: 'Comlinkr A Clarity',
    tagline: 'Keeps the brand blue. Telegram-like: one accent, large titles that collapse, springy panes, compact cards, a checklist composer with photos first.',
    fonts: 'https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800&display=swap' },
  { file: 'b-paper.html', css: ['a.css', 'b.css'], js: ['b1.js', 'a2.js', 'a3.js', 'a4.js', 'b3.js'], name: 'B · Paper', title: 'Comlinkr B Paper',
    tagline: 'A local paper you live in: warm paper and ink, serif headlines, magazine cards, a one-page composer with "+ add" chips.',
    fonts: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Instrument+Sans:wght@400;500;600;700&display=swap' },
  { file: 'c-night-market.html', css: ['a.css', 'c.css'], js: ['c1.js', 'a2.js', 'a3.js', 'a4.js', 'c3.js'], name: 'C · Night Market', title: 'Comlinkr C Night Market',
    tagline: 'Dark, vivid and friendly: violet and mint, bento tiles, one + button for posting anything, a one-question-at-a-time composer.',
    fonts: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Manrope:wght@400;500;600;700&display=swap' },
  { file: 'd-night-market-gradient.html', css: ['a.css', 'c.css', 'd.css'], js: ['c1.js', 'a2.js', 'a3.js', 'a4.js', 'c3.js'], name: 'D · Night Market, brand gradient', title: 'Comlinkr D Gradient',
    tagline: 'Design C exactly, recoloured with the app’s blue-to-green gradient (#1A6BAE → #257A86 → #30855B) in place of violet, pink and mint.',
    fonts: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Manrope:wght@400;500;600;700&display=swap' },
];
const tpl = read('chrome.html');
for (const v of variants) {
  if (!v.js.every((f) => fs.existsSync(path.join(here, f)))) { console.log('skip', v.file); continue; }
  const others = variants.filter((o) => o !== v).map((o) => `<a href="${o.file}">${o.name}</a>`).join(' · ');
  const html = tpl
    .replace('{{TITLE}}', v.title).replace('{{FONTS}}', v.fonts).replace('{{NAME}}', v.name)
    .replace('{{TAGLINE}}', v.tagline).replace('{{OTHERS}}', others)
    .replace('{{CSS}}', () => read('base.css') + '\n' + v.css.map(read).join('\n'))
    .replace('{{JS}}', () => [read('icons.js'), read('data.js'), read('notes.js'), read('engine.js'), ...v.js.map(read)].join('\n'));
  fs.writeFileSync(path.join(out, v.file), html);
  console.log('wrote', v.file, Math.round(html.length / 1024) + ' KB');
}
