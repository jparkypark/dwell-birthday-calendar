import { Birthday, UpcomingBirthday } from '../types/birthday';
import { BUSINESS_RULES, DATE_CONSTANTS } from '../config';

/**
 * Month names for display formatting
 */
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Short month names for compact display
 */
const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Calculate upcoming birthdays within the specified number of days
 */
export function calculateUpcomingBirthdays(birthdays: Birthday[], days: number = BUSINESS_RULES.DEFAULT_UPCOMING_DAYS): UpcomingBirthday[] {
  const today = new Date();
  const upcoming: UpcomingBirthday[] = [];

  for (const birthday of birthdays) {
    const daysUntil = getDaysUntilBirthday(birthday.month, birthday.day, today);
    
    if (daysUntil <= days) {
      upcoming.push({
        ...birthday,
        daysUntil,
        monthName: getMonthName(birthday.month),
        displayDate: formatBirthdayDate(birthday.month, birthday.day)
      });
    }
  }

  // Sort by days until birthday, then by name
  upcoming.sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) {
      return a.daysUntil - b.daysUntil;
    }
    return a.name.localeCompare(b.name);
  });

  return upcoming;
}

/**
 * Calculate days until a birthday from a given date (defaults to today)
 */
export function getDaysUntilBirthday(month: number, day: number, fromDate: Date = new Date()): number {
  const today = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  
  // Create birthday date for this year
  let birthdayThisYear = new Date(today.getFullYear(), month - 1, day);
  
  // Handle February 29th on non-leap years
  if (month === DATE_CONSTANTS.FEBRUARY_MONTH && day === DATE_CONSTANTS.FEBRUARY_LEAP_DAY && !isLeapYear(today.getFullYear())) {
    birthdayThisYear = new Date(today.getFullYear(), 1, DATE_CONSTANTS.FEBRUARY_FALLBACK_DAY);
  }
  
  // If birthday has already passed this year, calculate for next year
  if (birthdayThisYear < today) {
    const nextYear = today.getFullYear() + 1;
    birthdayThisYear = new Date(nextYear, month - 1, day);
    
    // Handle February 29th on non-leap years for next year
    if (month === DATE_CONSTANTS.FEBRUARY_MONTH && day === DATE_CONSTANTS.FEBRUARY_LEAP_DAY && !isLeapYear(nextYear)) {
      birthdayThisYear = new Date(nextYear, 1, DATE_CONSTANTS.FEBRUARY_FALLBACK_DAY);
    }
  }
  
  // Calculate difference in milliseconds and convert to days
  const diffTime = birthdayThisYear.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / DATE_CONSTANTS.MILLISECONDS_PER_DAY);
  
  return diffDays;
}

/**
 * Format birthday date for display
 */
export function formatBirthdayDate(month: number, day: number, short: boolean = false): string {
  const monthNames = short ? SHORT_MONTH_NAMES : MONTH_NAMES;
  const monthName = monthNames[month - 1] || 'Unknown';
  
  return `${monthName} ${day}`;
}

/**
 * Get full month name from month number (1-12)
 */
export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] || 'Unknown';
}

/**
 * Get short month name from month number (1-12)
 */
export function getShortMonthName(month: number): string {
  return SHORT_MONTH_NAMES[month - 1] || 'Unknown';
}

/**
 * Check if a year is a leap year
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Get birthdays happening today
 */
export function getTodaysBirthdays(birthdays: Birthday[], date: Date = new Date()): UpcomingBirthday[] {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  return birthdays
    .filter(birthday => {
      // Handle February 29th birthdays on non-leap years
      if (birthday.month === DATE_CONSTANTS.FEBRUARY_MONTH && birthday.day === DATE_CONSTANTS.FEBRUARY_LEAP_DAY && !isLeapYear(date.getFullYear())) {
        return month === DATE_CONSTANTS.FEBRUARY_MONTH && day === DATE_CONSTANTS.FEBRUARY_FALLBACK_DAY;
      }
      return birthday.month === month && birthday.day === day;
    })
    .map(birthday => ({
      ...birthday,
      daysUntil: 0,
      monthName: getMonthName(birthday.month),
      displayDate: formatBirthdayDate(birthday.month, birthday.day)
    }));
}

/**
 * Get birthdays in a specific month
 */
export function getBirthdaysInMonth(birthdays: Birthday[], month: number): Birthday[] {
  return birthdays
    .filter(birthday => birthday.month === month)
    .sort((a, b) => a.day - b.day);
}

/**
 * Get the next N birthdays
 */
export function getNextBirthdays(birthdays: Birthday[], count: number): UpcomingBirthday[] {
  const upcoming = calculateUpcomingBirthdays(birthdays, BUSINESS_RULES.NEXT_YEAR_DAYS);
  return upcoming.slice(0, count);
}

/**
 * Format a relative date (e.g., "today", "tomorrow", "in 5 days")
 */
export function formatRelativeDate(daysUntil: number): string {
  if (daysUntil === 0) {
    return 'today';
  } else if (daysUntil === 1) {
    return 'tomorrow';
  } else if (daysUntil <= DATE_CONSTANTS.DAYS_PER_WEEK) {
    return `in ${daysUntil} days`;
  } else if (daysUntil <= DATE_CONSTANTS.WEEKS_FOR_RELATIVE_DISPLAY * DATE_CONSTANTS.DAYS_PER_WEEK) {
    return `in ${Math.ceil(daysUntil / DATE_CONSTANTS.DAYS_PER_WEEK)} week${daysUntil > DATE_CONSTANTS.DAYS_PER_WEEK ? 's' : ''}`;
  } else if (daysUntil <= DATE_CONSTANTS.DAYS_FOR_WEEKS_DISPLAY) {
    return `in ${Math.ceil(daysUntil / DATE_CONSTANTS.DAYS_PER_WEEK)} weeks`;
  } else {
    return `in ${Math.ceil(daysUntil / DATE_CONSTANTS.DAYS_PER_MONTH_APPROX)} months`;
  }
}

/**
 * Group birthdays by month for display
 */
export function groupBirthdaysByMonth(birthdays: Birthday[]): Record<number, Birthday[]> {
  const grouped: Record<number, Birthday[]> = {};
  
  for (const birthday of birthdays) {
    if (!grouped[birthday.month]) {
      grouped[birthday.month] = [];
    }
    grouped[birthday.month].push(birthday);
  }
  
  // Sort birthdays within each month by day
  for (const month in grouped) {
    grouped[month].sort((a, b) => a.day - b.day);
  }
  
  return grouped;
}

/**
 * Check if a birthday falls within a date range
 */
export function isBirthdayInRange(birthday: Birthday, startDate: Date, endDate: Date): boolean {
  const daysFromStart = getDaysUntilBirthday(birthday.month, birthday.day, startDate);
  const daysFromEnd = getDaysUntilBirthday(birthday.month, birthday.day, endDate);
  
  // If the birthday is closer to the start date than the end date,
  // it means the birthday falls within the range
  return daysFromStart <= daysFromEnd;
}

/**
 * Get birthday statistics
 */
export interface BirthdayStats {
  totalBirthdays: number;
  birthdaysThisMonth: number;
  birthdaysNextMonth: number;
  birthdaysNext30Days: number;
  mostCommonMonth: number;
  monthDistribution: Record<number, number>;
}

export function getBirthdayStats(birthdays: Birthday[], referenceDate: Date = new Date()): BirthdayStats {
  const currentMonth = referenceDate.getMonth() + 1;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  
  const monthDistribution: Record<number, number> = {};
  let birthdaysThisMonth = 0;
  let birthdaysNextMonth = 0;
  
  // Initialize month distribution
  for (let i = 1; i <= DATE_CONSTANTS.MONTHS_PER_YEAR; i++) {
    monthDistribution[i] = 0;
  }
  
  // Count birthdays
  for (const birthday of birthdays) {
    monthDistribution[birthday.month]++;
    
    if (birthday.month === currentMonth) {
      birthdaysThisMonth++;
    }
    
    if (birthday.month === nextMonth) {
      birthdaysNextMonth++;
    }
  }
  
  // Find most common month
  let mostCommonMonth = 1;
  let maxCount = 0;
  for (const month in monthDistribution) {
    if (monthDistribution[month] > maxCount) {
      maxCount = monthDistribution[month];
      mostCommonMonth = parseInt(month);
    }
  }
  
  const birthdaysNext30Days = calculateUpcomingBirthdays(birthdays, BUSINESS_RULES.BIRTHDAY_STATS_DAYS).length;
  
  return {
    totalBirthdays: birthdays.length,
    birthdaysThisMonth,
    birthdaysNextMonth,
    birthdaysNext30Days,
    mostCommonMonth,
    monthDistribution
  };
}