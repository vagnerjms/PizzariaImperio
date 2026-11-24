export const SAO_PAULO_TIMEZONE = "America/Sao_Paulo";

/**
 * Returns the YYYY-MM-DD calendar date in America/Sao_Paulo timezone.
 */
export function getSaoPauloYMD(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Returns the day of week (0 = Sunday ... 6 = Saturday) in America/Sao_Paulo timezone.
 */
export function getSaoPauloDayOfWeek(date: Date = new Date()): number {
  const shortWeekday = new Intl.DateTimeFormat("en-US", {
    timeZone: SAO_PAULO_TIMEZONE,
    weekday: "short",
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[shortWeekday] ?? date.getDay();
}

/**
 * Returns a Date representing 00:00:00 (America/Sao_Paulo, UTC-03:00) of the given date.
 */
export function getSaoPauloTodayStartDate(date: Date = new Date()): Date {
  const spDate = getSaoPauloYMD(date);
  return new Date(`${spDate}T00:00:00-03:00`);
}
