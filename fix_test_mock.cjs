const fs = require('fs');
let code = fs.readFileSync('src/lib/services/__tests__/streakFreezeCallable.test.ts', 'utf8');

code = code.replace(/vi\.mock\('firebase\/firestore', \(\) => \(\{[\s\S]*?\}\)\);/m, `vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({ type: 'doc' })),
  onSnapshot: vi.fn(() => vi.fn()),
  query: vi.fn(() => ({ type: 'query' })),
  collection: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  updateDoc: vi.fn().mockResolvedValue(undefined),
}));`);

code = code.replace(/vi\.mocked\(onSnapshot\)\.mockImplementation\(\(ref, onNext\) => \{[\s\S]*?return vi\.fn\(\);\n    \}\);/g, `
    vi.mocked(onSnapshot).mockImplementation((ref, onNext) => {
      if (ref && ref.type === 'doc') {
        onNext({
          exists: () => true,
          data: () => ({ streak_days: 5, streakStatus: 'active', gracePeriodEndsUtc: new Date(Date.now() - 86400000).toISOString() }),
        });
      } else {
         onNext({
            empty: false,
            docs: [{ id: 'alert1', data: () => ({ kind: 'streak_warning', uid: 'test-user-123' }) }]
         });
      }
      return vi.fn();
    });
`);

fs.writeFileSync('src/lib/services/__tests__/streakFreezeCallable.test.ts', code);
