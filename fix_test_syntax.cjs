const fs = require('fs');
let code = fs.readFileSync('src/lib/services/__tests__/streakFreezeCallable.test.ts', 'utf8');

// The replacement was:
// authStore: {
//    user: { uid: 'test-user-123' },
//    isAuthenticated: true,
//  },},
// Let's fix the duplicated closing brace.
code = code.replace(/authStore: \{[\s\S]*?isAuthenticated: true,\n  \},\},/m, `authStore: {
    user: { uid: 'test-user-123' },
    isAuthenticated: true,
  },`);

fs.writeFileSync('src/lib/services/__tests__/streakFreezeCallable.test.ts', code);
