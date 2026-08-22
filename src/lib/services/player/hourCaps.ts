export interface HourCapCheckResult {
  exceedsCap: boolean;
  totalWeeklyHours: number;
  ageYears: number;
  warningMessage: string | null;
}

/**
 * Calculates total weekly training hours and checks against player's chronological age.
 * Flashes a warning if total weekly hours exceed chronological age.
 */
export function checkTrainingHourCaps(
  weeklySessions: { hours: number }[],
  dobString: string
): HourCapCheckResult {
  const ageYears = calculateAge(dobString);
  const totalWeeklyHours = weeklySessions.reduce((acc, s) => acc + (s.hours || 0), 0);
  const exceedsCap = totalWeeklyHours > ageYears;

  let warningMessage: string | null = null;
  if (exceedsCap) {
    warningMessage = `OVERTRAINING WARNING: Weekly training volume (${totalWeeklyHours} hrs) exceeds recommended cap based on your chronological age (${ageYears} yrs).`;
  }

  return {
    exceedsCap,
    totalWeeklyHours,
    ageYears,
    warningMessage
  };
}

function calculateAge(dobString: string): number {
  if (!dobString) return 18;
  const birthDate = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age > 0 ? age : 0;
}
