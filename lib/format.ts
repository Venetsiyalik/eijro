import { uz } from "date-fns/locale";
import { endOfDay, endOfWeek } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

const TZ = "Asia/Tashkent";

export function formatDateTime(date: Date): string {
  return formatInTimeZone(date, TZ, "d MMMM yyyy, HH:mm", { locale: uz });
}

export function formatDate(date: Date): string {
  return formatInTimeZone(date, TZ, "d MMMM yyyy", { locale: uz });
}

/** "Bugun" va "shu hafta" chegaralari Toshkent vaqti bo'yicha (hafta dushanbadan boshlanadi). */
export function getTashkentRanges(now: Date = new Date()): { endOfToday: Date; endOfWeek: Date } {
  const zoned = toZonedTime(now, TZ);
  return {
    endOfToday: fromZonedTime(endOfDay(zoned), TZ),
    endOfWeek: fromZonedTime(endOfWeek(zoned, { weekStartsOn: 1 }), TZ),
  };
}

/** <input type="datetime-local"> qiymatini (Toshkent devor vaqti) haqiqiy Date'ga aylantiradi — server zonasidan mustaqil. */
export function parseTashkentLocal(value: string): Date {
  return fromZonedTime(value, TZ);
}

/** Date -> <input type="datetime-local"> qiymati (Toshkent vaqti, daqiqagacha). */
export function toTashkentInputValue(date: Date): string {
  return formatInTimeZone(date, TZ, "yyyy-MM-dd'T'HH:mm");
}
