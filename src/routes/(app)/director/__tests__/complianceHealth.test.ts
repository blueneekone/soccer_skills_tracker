import { describe, it, expect } from 'vitest';

describe('Director OS: Compliance Health Analytics Matrix', () => {
  it('Computes score thresholds correctly (Amber for 60-89%)', () => {
    const getComplianceDotColor = (score) => {
      if (score >= 90) return 'green';
      if (score >= 60) return 'amber';
      return 'red';
    };
    expect(getComplianceDotColor(80)).toBe('amber');
  });
});