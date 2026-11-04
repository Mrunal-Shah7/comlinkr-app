const fs = require('fs');

const filePath = process.argv[2];
if (!filePath) {
  console.error("Please provide a file path");
  process.exit(1);
}

let code = fs.readFileSync(filePath, 'utf8');

// Ensure rs import exists
if (!code.includes('import { rs }') && !code.includes('import { rs,')) {
  // Try to find an existing import from src/utils/responsive
  if (code.includes('src/utils/responsive')) {
     code = code.replace(/import\s+{([^}]+)}\s+from\s+["'](\.\.\/)*src\/utils\/responsive["'];/, (match, p1, p2) => {
        if (!p1.includes('rs')) {
            return `import { rs, ${p1.trim()} } from "${p2}src/utils/responsive";`;
        }
        return match;
     });
  } else {
    // Just inject it after react-native import
    if (code.includes('import { StyleSheet')) {
      code = code.replace(
        /import\s+{([^}]*StyleSheet[^}]*)}\s+from\s+["']react-native["'];/,
        (match) => `${match}\nimport { rs } from "../src/utils/responsive";` // assuming typical path
      );
    } else {
      code = `import { rs } from "../src/utils/responsive";\n` + code;
    }
  }
}

const propsToScale = [
  'width', 'height', 'top', 'bottom', 'left', 'right',
  'margin', 'padding', 'borderRadius', 'fontSize', 'gap',
  'paddingHorizontal', 'paddingVertical', 'marginHorizontal', 'marginVertical',
  'marginLeft', 'marginRight', 'marginTop', 'marginBottom',
  'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
  'lineHeight', 'shadowRadius', 'borderTopLeftRadius', 'borderTopRightRadius', 
  'borderBottomLeftRadius', 'borderBottomRightRadius'
];

// Regex matches property: number. We need to be careful not to double wrap rs(rs(number))
// So we use a negative lookbehind if possible or just match strictly a number without rs(
const regex = new RegExp(`(${propsToScale.join('|')}):\\s*(-?\\d+\\.?\\d*)(?!\\s*\\))`, 'g');

code = code.replace(regex, (match, prop, val) => {
  if (val === '0') return match; // Don't scale 0
  
  // Quick check to see if it's already inside rs()
  // A bit hacky but we can check if the full match string has "rs(" right before it. 
  // However, regex guarantees it's `prop: number`. If it was `prop: rs(number)`, it wouldn't match.
  // Unless it's `lineHeight: 1.5`, we scale that too.
  return `${prop}: rs(${val})`;
});

// Write back
fs.writeFileSync(filePath, code);
console.log(`Scaled ${filePath}`);
