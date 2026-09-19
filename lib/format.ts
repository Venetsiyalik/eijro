import { uz } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

const TZ = "Asia/Tashkent";

export function formatDateTime(date: Date): string {
  return formatInTimeZone(date, TZ, "d MMMM yyyy, HH:mm", { locale: uz });
}

export function formatDate(date: Date): string {
  return formatInTimeZone(date, TZ, "d MMMM yyyy", { locale: uz });
}
