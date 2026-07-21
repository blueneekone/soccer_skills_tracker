const fs = require('fs');
let code = fs.readFileSync('src/lib/services/__tests__/streakFreezeCallable.test.ts', 'utf8');

// The freezeBtn is captured before it was clicked, but we need to await UI changes.
code = code.replace(/expect\(freezeBtn\.textContent\)\.toContain\('Activating'\);/g, `
    await waitFor(() => {
      expect(freezeBtn.textContent).toContain('Activating');
    });`);

fs.writeFileSync('src/lib/services/__tests__/streakFreezeCallable.test.ts', code);
