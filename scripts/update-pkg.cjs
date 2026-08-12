const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const monolithPkgPath = path.join(root, 'functions', 'package.json');
const monolithPkg = JSON.parse(fs.readFileSync(monolithPkgPath, 'utf8'));

const targetVersionFunctions = monolithPkg.dependencies['firebase-functions'];
const targetVersionAdmin = monolithPkg.dependencies['firebase-admin'];

console.log(`Target firebase-functions: ${targetVersionFunctions}`);
console.log(`Target firebase-admin: ${targetVersionAdmin}`);

const dirs = fs.readdirSync(root).filter(d => d.startsWith('functions-') && fs.statSync(path.join(root, d)).isDirectory());

for (const dir of dirs) {
  const pkgPath = path.join(root, dir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    let changed = false;
    
    if (pkg.dependencies && pkg.dependencies['firebase-functions']) {
      pkg.dependencies['firebase-functions'] = targetVersionFunctions;
      changed = true;
    }
    if (pkg.dependencies && pkg.dependencies['firebase-admin']) {
      pkg.dependencies['firebase-admin'] = targetVersionAdmin;
      changed = true;
    }
    
    if (changed) {
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      console.log(`Updated ${dir}/package.json`);
    }
  }
}
