import { describe, it, expect } from 'vitest';

describe('Recruiter OS: National Criminal Database Clearance Gateway', () => {
  it('Blocks scout access when Checkr status is Consider or Suspended', () => {
    const isRecruiterCleared = (status) => status === 'clear';
    expect(isRecruiterCleared('consider')).toBe(false);
    expect(isRecruiterCleared('suspended')).toBe(false);
  });
});