const fs = require('fs');

const FILE_PATH = 'e:/Comlinkr_Final_App/Comlinkr_Final_App/apps/mobile/app/(tabs)/feed/_feedScreen.styles.ts';
let code = fs.readFileSync(FILE_PATH, 'utf8');

if (!code.includes('import { rs }')) {
  code = code.replace(
    'import { StyleSheet } from "react-native";',
    'import { StyleSheet } from "react-native";\nimport { rs } from "../../../src/utils/responsive";'
  );
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

const regex = new RegExp(`(${propsToScale.join('|')}):\\s*(-?\\d+\\.?\\d*)`, 'g');

code = code.replace(regex, (match, prop, val) => {
  if (val === '0') return match; // Don't scale 0
  return `${prop}: rs(${val})`;
});

fs.writeFileSync(FILE_PATH, code);
console.log("Done");
