const fs = require('fs');

const paths = [
  'functions/sportsConfigOps.js',
  'functions/coOpOps.js',
  'functions/bountyOps.js',
  'functions/src/seeders/sportsSeeder.js',
  'functions/src/seeders/drillsSeeder.js'
];

const badBlockRegex = / {4}\/\/ Lazy loaded inside callable scope to bypass compilation timeout\r?\n {4}const admin = await import\('firebase-admin'\);\r?\n {4}if \(!admin\.apps\.length\) \{\r?\n {8}admin\.initializeApp\(\);\r?\n {4}\}\r?\n {4}const db = admin\.firestore\(\);\r?\n {4}\/\/ Lazy loaded inside callable scope to bypass compilation timeout\r?\n {4}const admin = await import\('firebase-admin'\);\r?\n {4}if \(!admin\.apps\.length\) \{\r?\n {8}admin\.initializeApp\(\);\r?\n {4}\}/g;

for (const p of paths) {
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    if (badBlockRegex.test(content)) {
      content = content.replace(badBlockRegex, '    const firestore = db();');
      fs.writeFileSync(p, content);
      console.log('Fixed', p);
    } else {
      console.log('Not found in', p);
    }
  } else {
    console.log('Missing', p);
  }
}
