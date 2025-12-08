/**
 * Utility functions for date/time handling with Vietnam timezone (UTC+7)
 */

const VIETNAM_OFFSET_HOURS = 7;

/**
 * Convert UTC date string to Vietnam local time for display
 * @param utcDateString - ISO date string in UTC
 * @returns Formatted date string in Vietnam time
 */
export const utcToVietnamTime = (utcDateString: string): string => {
  if (!utcDateString) return '';

  const date = new Date(utcDateString);

  // Add 7 hours for Vietnam timezone
  const vietnamDate = new Date(date.getTime() + VIETNAM_OFFSET_HOURS * 60 * 60 * 1000);

  return vietnamDate.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

/**
 * Convert UTC date string to Vietnam local datetime-local input format
 * @param utcDateString - ISO date string in UTC
 * @returns Format: YYYY-MM-DDTHH:mm for datetime-local input
 */
export const utcToVietnamInput = (utcDateString: string): string => {
  if (!utcDateString) return '';

  const date = new Date(utcDateString);

  // Add 7 hours for Vietnam timezone
  const vietnamDate = new Date(date.getTime() + VIETNAM_OFFSET_HOURS * 60 * 60 * 1000);

  return vietnamDate.toISOString().slice(0, 16);
};

/**
 * Get current Vietnam time for datetime-local input
 * @returns Format: YYYY-MM-DDTHH:mm
 */
export const getCurrentVietnamTime = (): string => {
  const now = new Date();
  const vietnamNow = new Date(now.getTime() + VIETNAM_OFFSET_HOURS * 60 * 60 * 1000);
  return vietnamNow.toISOString().slice(0, 16);
};

/**
 * Get Vietnam time N minutes from now
 * @param minutes - Number of minutes to add
 * @returns Format: YYYY-MM-DDTHH:mm
 */
export const getVietnamTimeAfterMinutes = (minutes: number): string => {
  const now = new Date();
  const futureTime = new Date(now.getTime() + minutes * 60 * 1000);
  const vietnamTime = new Date(futureTime.getTime() + VIETNAM_OFFSET_HOURS * 60 * 60 * 1000);
  return vietnamTime.toISOString().slice(0, 16);
};

/**
 * Convert Vietnam local datetime-local input to UTC ISO string for database
 * @param vietnamDateTimeLocal - Format: YYYY-MM-DDTHH:mm
 * @returns ISO string in UTC
 */
export const vietnamInputToUTC = (vietnamDateTimeLocal: string): string => {
  if (!vietnamDateTimeLocal) return '';

  // Parse as local time (which user enters thinking it's Vietnam time)
  const localDate = new Date(vietnamDateTimeLocal);

  // Since the user entered Vietnam time, we need to subtract 7 hours to get UTC
  const utcDate = new Date(localDate.getTime() - VIETNAM_OFFSET_HOURS * 60 * 60 * 1000);

  return utcDate.toISOString();
};
