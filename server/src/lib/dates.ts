import { addDays } from 'date-fns';

export function toUTCMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

export function parseDateParam(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function getWeekStart(weekStartDay: number, from: Date = new Date()): Date {
  const base = toUTCMidnight(from);
  const dow = base.getUTCDay();
  const daysBack = (dow - weekStartDay + 7) % 7;
  return new Date(base.getTime() - daysBack * 86400000);
}

export function getWeekEnd(weekStartDay: number, from: Date = new Date()): Date {
  return addDays(getWeekStart(weekStartDay, from), 6);
}

export function endOfDayUTC(date: Date = new Date()): Date {
  const d = toUTCMidnight(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

export function todayUTC(): Date {
  return toUTCMidnight(new Date());
}

export function weekEndDay(weekStartDay: number): number {
  return (weekStartDay + 6) % 7;
}
