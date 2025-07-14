export interface Birthday {
  name: string;
  month: number;
  day: number;
  slackUserId?: string;
}

export interface BirthdayData {
  birthdays: Birthday[];
}

export interface UpcomingBirthday extends Birthday {
  daysUntil: number;
  monthName: string;
  displayDate: string;
}

export interface BirthdayCache {
  blocks: any[];
  lastUpdated: number;
}