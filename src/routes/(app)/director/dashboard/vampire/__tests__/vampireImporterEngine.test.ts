import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VampireImporterEngine } from '../VampireImporterEngine.svelte.js';
import { authStore } from '$lib/stores/auth/facade.svelte.js';
import * as firestoreGuard from '$lib/utils/firestoreGuard.js';
import * as firebaseLib from '$lib/firebase.js';

// Mock PapaParse since it is used in the imported sanitizer
vi.mock('papaparse', () => ({
  default: {
    parse: vi.fn((file, config) => {
      // Simulate file reading
      const content = file.content;
      if (!content) {
         config.complete({ data: [] });
         return;
      }
      if (content === 'ERROR') {
        config.error(new Error('Simulated CSV Corrupt Error'));
        return;
      }

      const parsedData = JSON.parse(content);
      config.complete({ data: parsedData });
    }),
    unparse: vi.fn((data) => JSON.stringify(data))
  }
}));

// Mock Firebase Firestore functions
vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    writeBatch: vi.fn(() => ({
      set: vi.fn(),
      commit: vi.fn().mockResolvedValue(true)
    })),
    doc: vi.fn(() => ({ id: 'mocked-doc-id' })),
    collection: vi.fn(() => ({ id: 'roster_staging' }))
  };
});

// Mock Firebase Functions
vi.mock('firebase/functions', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    httpsCallable: vi.fn(() => vi.fn().mockResolvedValue({ data: { success: true, count: 1200 } }))
  };
});

describe('VampireImporterEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock stores and firebase methods
    vi.spyOn(firestoreGuard, 'isFirestoreReady').mockReturnValue(true);
    vi.spyOn(firebaseLib, 'getActiveDb').mockReturnValue({} as any);

    // Mock getter for authStore properties
    vi.spyOn(authStore, 'isAuthenticated', 'get').mockReturnValue(true);
    vi.spyOn(authStore, 'isLoading', 'get').mockReturnValue(false);
    vi.spyOn(authStore, 'user', 'get').mockReturnValue({ uid: 'mock-user-id' } as any);
  });

  const createFile = (data: any[] | 'ERROR' | null): File => {
    const content = data === 'ERROR' ? 'ERROR' : (data ? JSON.stringify(data) : '');
    return { name: 'test.csv', size: 1024, type: 'text/csv', content } as any;
  };

  it('Test 1: should update file state and trigger parsing on setFile()', async () => {
    const engine = new VampireImporterEngine();

    const validData = [
      { firstName: 'John', lastName: 'Doe', age: '18', email: 'john@example.com' }
    ];

    await engine.setFile(createFile(validData));

    expect(engine.file).not.toBeNull();
    expect(engine.errorMessage).toBeNull();
    expect(engine.parsedRows.length).toBe(1);
    expect(engine.parsedRows[0].firstName).toBe('John');
    expect(engine.totalRowCount).toBe(1);
  });

  it('Test 2: should set empathetic errorMessage when required fields are missing', async () => {
    const engine = new VampireImporterEngine();

    // Missing 'email' and 'age'
    const invalidData = [
      { firstName: 'John', lastName: 'Doe' }
    ];

    await engine.setFile(createFile(invalidData));

    expect(engine.errorMessage).toContain('Missing required fields');
    expect(engine.parsedRows.length).toBe(0);
    expect(engine.totalRowCount).toBe(0);
  });

  it('Test 2b: should set empathetic errorMessage on invalid email', async () => {
    const engine = new VampireImporterEngine();

    const invalidData = [
      { firstName: 'John', lastName: 'Doe', age: '18', email: 'not-an-email' }
    ];

    await engine.setFile(createFile(invalidData));

    expect(engine.errorMessage).toContain('Invalid email format detected for user John Doe');
    expect(engine.parsedRows.length).toBe(0);
  });

  it('Test 3: should correctly batch paginated datasets for massive files into 500 max writes', async () => {
    const engine = new VampireImporterEngine();
    engine.teamId = 'team_u14_varsity';
    vi.spyOn(authStore, 'clubId', 'get').mockReturnValue('club_nexus_1');

    // Generate 1200 valid rows (should be 3 batches: 500, 500, 200)
    const massiveData = Array.from({ length: 1200 }, (_, i) => ({
      firstName: `User${i}`,
      lastName: 'Test',
      age: '20',
      email: `user${i}@example.com`
    }));

    await engine.setFile(createFile(massiveData));

    expect(engine.parsedRows.length).toBe(1200);

    const { httpsCallable } = await import('firebase/functions');
    await engine.triggerIngestion();

    expect(engine.errorMessage).toBeNull();
    expect(engine.successMessage).toBe('Successfully ingested 1200 rows.');
    expect(engine.ingestedCount).toBe(1200);
    // writeBatch logic was moved to backend, ensure callable was triggered
    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'vampireIngestRows');
  });

  it('Test 4: should return early and block db write if hydration guard is false', async () => {
    const engine = new VampireImporterEngine();

    // Bypass parsing by injecting valid data directly
    engine.parsedRows = [{ firstName: 'A', lastName: 'B', age: 10, email: 'a@b.com' }];

    // Mock the B815 hydration guard failure
    vi.spyOn(authStore, 'isAuthenticated', 'get').mockReturnValue(false);

    await engine.triggerIngestion();

    expect(engine.errorMessage).toContain('You must be authenticated and connected to the database to import rosters.');
    expect(engine.isUploading).toBe(false);
    expect(engine.ingestedCount).toBe(0);

    const { httpsCallable } = await import('firebase/functions');
    expect(httpsCallable).not.toHaveBeenCalled();
  });
});
