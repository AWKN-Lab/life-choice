const fs = require('fs');
const path = require('path');
const nm = path.join(__dirname, 'node_modules');
const dirs = fs.readdirSync(nm).filter(n => !n.startsWith('.') && !n.startsWith('@'));
const scopedDirs = fs.readdirSync(nm).filter(n => n.startsWith('@')).flatMap(n => {
  try {
    return fs.readdirSync(path.join(nm, n)).map(s => n + '/' + s);
  } catch { return []; }
});
const allDirs = [...dirs, ...scopedDirs];

let missing = [];
for (const d of allDirs) {
  try {
    const pkgPath = path.join(nm, d, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.main) {
      const mainPath = path.resolve(nm + '/' + d, pkg.main);
      if (!fs.existsSync(mainPath)) {
        missing.push(d + ': main=' + pkg.main);
      }
    }
    if (pkg.exports) {
      const exportsKeys = Object.keys(pkg.exports);
      for (const k of exportsKeys.slice(0, 3)) {
        const v = pkg.exports[k];
        if (typeof v === 'string') {
          const expPath = path.resolve(nm + '/' + d, v);
          if (!fs.existsSync(expPath)) {
            missing.push(d + ': exports=' + k + ' -> ' + v);
            break;
          }
        }
      }
    }
  } catch {}
}

if (missing.length === 0) {
  console.log('All package main entries OK');
} else {
  missing.forEach(m => console.log(m));
}
