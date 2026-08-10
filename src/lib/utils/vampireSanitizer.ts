import Papa from 'papaparse';

export interface VampireRow {
  firstName: string;
  lastName: string;
  age: number | string;
  email: string;
  [key: string]: any;
}

export interface SanitizationResult {
  success: boolean;
  rows: VampireRow[];
  error: string | null;
}

export async function parseAndSanitizeCSV(file: File): Promise<SanitizationResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Record<string, any>[];

        if (data.length === 0) {
          return resolve({ success: false, rows: [], error: 'The uploaded file is empty. Please check your CSV and try again.' });
        }

        const validRows: VampireRow[] = [];

        for (const row of data) {
          // Identify keys robustly (case-insensitive if needed, or mapping)
          const keys = Object.keys(row);
          const getField = (possibleNames: string[]) => {
            const match = keys.find(k => possibleNames.includes(k.toLowerCase().trim()));
            return match ? row[match] : undefined;
          };

          const firstName = getField(['firstname', 'first name', 'first']);
          const lastName = getField(['lastname', 'last name', 'last']);
          const age = getField(['age']);
          const email = getField(['email', 'email address']);

          if (!firstName || !lastName || !age || !email) {
            return resolve({
              success: false,
              rows: [],
              error: `Missing required fields (First Name, Last Name, Age, Email). Please ensure your CSV headers are correct. Found missing data in a row: ${JSON.stringify(row)}`
            });
          }

          if (typeof email !== 'string' || !email.includes('@')) {
            return resolve({
               success: false,
               rows: [],
               error: `Invalid email format detected for user ${firstName} ${lastName}. Please ensure all emails are valid.`
            });
          }

          validRows.push({
            ...row,
            firstName: String(firstName).trim(),
            lastName: String(lastName).trim(),
            age: Number(age) || String(age).trim(),
            email: String(email).trim().toLowerCase(),
          });
        }

        resolve({ success: true, rows: validRows, error: null });
      },
      error: (error) => {
        resolve({
          success: false,
          rows: [],
          error: `Failed to read the file: ${error.message}. Please check if the CSV is corrupted.`
        });
      }
    });
  });
}
