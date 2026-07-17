const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const nm = path.join(__dirname, 'node_modules');
const tmpDir = process.env.TEMP || '/tmp';

// Scan packages with missing main entry
function scanMissingMain() {
  const results = [];
  const dirs = fs.readdirSync(nm).filter(n => !n.startsWith('.'));

  for (const d of dirs) {
    try {
      const pkgPath = path.join(nm, d, 'package.json');
      if (!fs.existsSync(pkgPath)) continue;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (!pkg.main) continue;

      let mainPath = path.resolve(nm + '/' + d, pkg.main);
      // Try with .js extension
      if (!fs.existsSync(mainPath) && !mainPath.endsWith('.js')) {
        mainPath += '.js';
      }
      if (!fs.existsSync(mainPath)) {
        results.push({ pkg: d, main: pkg.main, fullPath: mainPath });
      }
    } catch {}
  }

  // Scoped packages
  const scopedDirs = fs.readdirSync(nm).filter(n => n.startsWith('@'));
  for (const sd of scopedDirs) {
    try {
      const subDirs = fs.readdirSync(path.join(nm, sd));
      for (const d of subDirs) {
        try {
          const pkgPath = path.join(nm, sd, d, 'package.json');
          if (!fs.existsSync(pkgPath)) continue;
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          if (!pkg.main) continue;
          let mainPath = path.resolve(nm + '/' + sd + '/' + d, pkg.main);
          if (!fs.existsSync(mainPath) && !mainPath.endsWith('.js')) {
            mainPath += '.js';
          }
          if (!fs.existsSync(mainPath)) {
            results.push({ pkg: sd + '/' + d, main: pkg.main, fullPath: mainPath });
          }
        } catch {}
      }
    } catch {}
  }

  return results;
}

// Download tarball and extract missing files
async function fixFromTarball(pkgName, mainPath) {
  const nameParts = pkgName.split('/');
  let tarballUrl, extractDir;

  if (pkgName.startsWith('@')) {
    const pkg = nameParts[1];
    // Get version from package.json
    const pkgJson = JSON.parse(fs.readFileSync(path.join(nm, pkgName, 'package.json'), 'utf8'));
    const version = pkgJson.version;
    tarballUrl = `https://registry.npmmirror.com/${pkgName}/-/${pkg}-${version}.tgz`;
    extractDir = path.join(tmpDir, 'fix-' + pkg.replace('/', '-'));
  } else {
    const pkgJson = JSON.parse(fs.readFileSync(path.join(nm, pkgName, 'package.json'), 'utf8'));
    const version = pkgJson.version;
    tarballUrl = `https://registry.npmmirror.com/${pkgName}/-/${pkgName}-${version}.tgz`;
    extractDir = path.join(tmpDir, 'fix-' + pkgName);
  }

  try {
    // Download
    execSync(`curl -sL "${tarballUrl}" -o "${extractDir}.tgz"`, { stdio: 'ignore' });
    // Extract
    fs.mkdirSync(extractDir, { recursive: true });
    execSync(`tar -xzf "${extractDir}.tgz" -C "${extractDir}"`, { stdio: 'ignore' });

    // List files
    const listOutput = execSync(`tar -tzf "${extractDir}.tgz"`, { encoding: 'utf8' });
    const files = listOutput.trim().split('\n').filter(f => !f.endsWith('/'));

    // Find which file matches the missing main
    for (const f of files) {
      const fullFilePath = path.join(extractDir, f);
      const destPath = path.join(nm, pkgName, f.replace('package/', ''));

      if (!fs.existsSync(destPath)) {
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(fullFilePath, destPath);
        console.log(`  Fixed: ${pkgName} <- ${f}`);
      }
    }
  } catch (e) {
    console.log(`  Failed to fix ${pkgName}: ${e.message}`);
  }
}

async function main() {
  console.log('Scanning for missing package files...\n');
  const missing = scanMissingMain();
  console.log(`Found ${missing.length} packages with missing main files:\n`);

  for (const m of missing.slice(0, 20)) {
    console.log(`${m.pkg}: main=${m.main}`);
  }

  if (missing.length > 20) {
    console.log(`... and ${missing.length - 20} more\n`);
  }

  console.log('\nFixing from tarballs...\n');
  for (const m of missing) {
    await fixFromTarball(m.pkg, m.fullPath);
  }

  console.log('\nDone. Run: node -e "require(\'miniprogram-ci\')" to verify.');
}

main().catch(console.error);
