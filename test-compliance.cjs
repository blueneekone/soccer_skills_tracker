const { execSync } = require('child_process');
const files = [
  'src/domains/shredOps',
  'coppa',
  'webauthn',
  'compliance',
  'verifyDocument',
  'src/domains/complianceOps',
  'src/domains/operativeOps'
];
for (const f of files) {
  console.log(`Testing ${f}...`);
  try {
    execSync(`node -e "require('./functions-compliance/bootstrapAdmin'); require('./functions-compliance/${f}')"`, { stdio: 'inherit', timeout: 3000 });
    console.log(`${f} is OK`);
  } catch (e) {
    console.log(`Error testing ${f}`);
  }
}
