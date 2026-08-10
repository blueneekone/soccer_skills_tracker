const fs = require('fs');
const path = require('path');
const glob = (dir) => {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules')) {
      results = results.concat(glob(file));
    } else if (file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
};
const dirs = ['functions-commerce', 'functions-compliance', 'functions-platform', 'functions-integrations', 'functions-core', 'functions-rl', 'functions'];
const files = dirs.flatMap(d => {
  try {
    return glob(d);
  } catch (e) {
    return [];
  }
});
let changed = 0;
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('const db = admin.firestore();')) {
    const proxyStr = "const db = new Proxy({}, { get: (t, p) => { const fs = admin.firestore(); const v = fs[p]; return typeof v === 'function' ? v.bind(fs) : v; } });";
    content = content.replace(/const db = admin\.firestore\(\);/g, proxyStr);
    fs.writeFileSync(f, content, 'utf8');
    changed++;
    console.log('Fixed', f);
  }
});
console.log('Changed', changed, 'files');
