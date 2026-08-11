export function sanitizeVampireRow(row: any): any {
  const sanitized = { ...row };

  // Explicitly strip protected RBAC write capabilities
  delete sanitized.role;
  delete sanitized.clubId;
  delete sanitized.tenantId;

  // Additional formatting/cleansing can go here
  if (typeof sanitized.firstName === 'string') {
    sanitized.firstName = sanitized.firstName.trim();
  }
  if (typeof sanitized.lastName === 'string') {
    sanitized.lastName = sanitized.lastName.trim();
  }
  if (typeof sanitized.email === 'string') {
    sanitized.email = sanitized.email.toLowerCase().trim();
  }

  return sanitized;
}

export function validateVampireSchema(rows: any[]): boolean {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  return rows.every(row => row.firstName && row.lastName && row.email);
}
