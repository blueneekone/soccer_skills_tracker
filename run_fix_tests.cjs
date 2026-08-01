const fs = require('fs');
let content = fs.readFileSync('src/routes/(app)/admin/overview/__tests__/adminOverview.layout.test.ts', 'utf8');
content = `import '@testing-library/jest-dom';\n` + content;
fs.writeFileSync('src/routes/(app)/admin/overview/__tests__/adminOverview.layout.test.ts', content);
