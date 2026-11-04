const fs = require('fs');
const path = require('path');

const srcUtilsPath = path.resolve('e:/Comlinkr_Final_App/Comlinkr_Final_App/apps/mobile/src/utils/responsive');

function fixImportsInFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  const importRegex = /import\s+\{\s*rs(\s+,[^}]+)?\s*\}\s+from\s+["'](\.\.\/)*src\/utils\/responsive["'];/g;
  
  let modified = false;
  code = code.replace(importRegex, (match) => {
    // calculate correct relative path
    const fileDir = path.dirname(filePath);
    let relative = path.relative(fileDir, srcUtilsPath).replace(/\\/g, '/');
    if (!relative.startsWith('.')) {
      relative = './' + relative;
    }
    const newImport = match.replace(/["'](\.\.\/)*src\/utils\/responsive["']/, `"${relative}"`);
    if (newImport !== match) {
      modified = true;
    }
    return newImport;
  });

  if (modified) {
    fs.writeFileSync(filePath, code);
    console.log(`Fixed imports in ${filePath}`);
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      fixImportsInFile(fullPath);
    }
  }
}

// Process the whole app directory to catch any bad paths
processDirectory(path.resolve('e:/Comlinkr_Final_App/Comlinkr_Final_App/apps/mobile/app'));
