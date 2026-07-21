const fs = require('fs');
let code = fs.readFileSync('src/lib/services/__tests__/streakFreezeCallable.test.ts', 'utf8');

code = code.replace(/authStore: \{\n    user: \{ uid: 'test-user-123' \},\n    isAuthenticated: true,\n  \},\n  \},/g, `authStore: {
    user: { uid: 'test-user-123' },
    isAuthenticated: true,
  }`);

fs.writeFileSync('src/lib/services/__tests__/streakFreezeCallable.test.ts', code);
