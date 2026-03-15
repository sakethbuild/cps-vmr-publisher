import { INTERNAL_DATE_LOCALE } from "@/lib/constants";

const formatter = new Intl.DateTimeFormat(INTERNAL_DATE_LOCALE, {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function parseSessionDateInput(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}

export function formatDisplayDate(date: Date | string): string {
  const value = typeof date === "string" ? parseSessionDateInput(date) : date;
  return formatter.format(value);
}

export function formatDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}
