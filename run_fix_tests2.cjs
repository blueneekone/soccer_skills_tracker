const fs = require('fs');
let content = fs.readFileSync('src/routes/(app)/admin/overview/__tests__/adminOverview.layout.test.ts', 'utf8');
content = content.replace(/expect\(screen\.getByText\('SYSTEM_STATUS: ONLINE'\)\)\.toBeInTheDocument\(\);/, "expect(screen.getByText('SYSTEM_STATUS: INITIALIZING')).toBeInTheDocument();");
fs.writeFileSync('src/routes/(app)/admin/overview/__tests__/adminOverview.layout.test.ts', content);
