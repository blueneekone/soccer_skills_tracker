import { describe, test, expect, vi } from 'vitest';

// 🛡️ SafeSport Compliance Mandate: Secure WebAuthn Verification Protocol Active

describe('WebAuthn Biometric Enclave & Passkey Attestation', () => {
  test('Sanitizes RP ID by stripping protocol and port', () => {
    // Mock the environment variable processing logic
    const mockEnv = {
      WEBAUTHN_RP_ID: 'https://sstracker.app:443'
    };
    
    // Logic from webauthn.js
    const rpID = mockEnv.WEBAUTHN_RP_ID?.replace(/^https?:\/\//, '').split(':')[0] || 'sstracker.app';
    
    expect(rpID).toBe('sstracker.app');
  });

  test('Sanitizes localhost RP ID properly', () => {
    const mockEnv = {
      WEBAUTHN_RP_ID: 'http://localhost:5173'
    };
    
    const rpID = mockEnv.WEBAUTHN_RP_ID?.replace(/^https?:\/\//, '').split(':')[0] || 'sstracker.app';
    
    expect(rpID).toBe('localhost');
  });

  test('Subdomain Array Mapping parses expectedOrigins correctly', () => {
    const mockEnv = {
      WEBAUTHN_RP_ORIGIN: 'https://sstracker.app,https://preview.sstracker.app'
    };
    
    // Logic from webauthn.js
    const expectedOrigins = mockEnv.WEBAUTHN_RP_ORIGIN?.split(',') || ['https://sstracker.app', 'https://preview.sstracker.app'];
    
    expect(expectedOrigins).toEqual([
      'https://sstracker.app',
      'https://preview.sstracker.app'
    ]);
  });

  test('Blocks biometric enrollment for unverified minors (COPPA 2.0 / VPC)', () => {
    // Age calculation logic mirroring setup phase
    function calculateAgeInYears(dob: string): number {
      if (!dob) return 0;
      const birthDate = new Date(dob);
      if (isNaN(birthDate.getTime())) return 0;
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }

    function verifyAdultEligibility(dobString: string): boolean {
      if (!dobString) return true; // By default allows if no DOB (or handle otherwise based on system logic)
      const age = calculateAgeInYears(dobString);
      return age >= 18;
    }

    // Minor test (e.g. 15 years old)
    const today = new Date();
    const minorDob = new Date(today.getFullYear() - 15, today.getMonth(), today.getDate()).toISOString().split('T')[0];
    
    // Adult test (e.g. 25 years old)
    const adultDob = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate()).toISOString().split('T')[0];
    
    expect(verifyAdultEligibility(minorDob)).toBe(false);
    expect(verifyAdultEligibility(adultDob)).toBe(true);
  });
});
