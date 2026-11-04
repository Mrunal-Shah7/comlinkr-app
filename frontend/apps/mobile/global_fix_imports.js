const fs = require('fs');
const path = require('path');

function processDir(dir) {
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) {
      processDir(fp);
    } else if (fp.endsWith('.tsx') || fp.endsWith('.ts')) {
      let code = fs.readFileSync(fp, 'utf8');
      if (code.includes('from "../src/utils/responsive"')) {
        console.log(`Found in: ${fp}`);
        // Let's replace it with the correct relative path
        const expectedRel = path.relative(path.dirname(fp), path.resolve('e:/Comlinkr_Final_App/Comlinkr_Final_App/apps/mobile/src/utils/responsive')).replace(/\\/g, '/');
        const toReplace = 'from "../src/utils/responsive"';
        const replaceWith = `from "${expectedRel.startsWith('.') ? expectedRel : './' + expectedRel}"`;
        code = code.replace(/from\s+["']\.\.\/src\/utils\/responsive["']/g, replaceWith);
        fs.writeFileSync(fp, code);
      }
    }
  }
}

processDir('e:/Comlinkr_Final_App/Comlinkr_Final_App/apps/mobile/app');
console.log("Done checking all files in app");
