import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function relativeDue(iso: string | null): string {
  if (!iso) return "no SLA";
  const ms = new Date(iso).getTime() - Date.now();
  const hours = Math.round(ms / (1000 * 60 * 60));
  if (hours < 0) return `${Math.abs(hours)}h overdue`;
  if (hours < 24) return `due in ${hours}h`;
  return `due in ${Math.round(hours / 24)}d`;
}
