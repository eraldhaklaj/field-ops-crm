import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export interface DueInfo {
  label: string;
  overdue: boolean;
}

export function dueInfo(iso: string | null): DueInfo {
  if (!iso) return { label: "No SLA", overdue: false };
  const hours = Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000);
  if (hours < 0) {
    const h = Math.abs(hours);
    return { label: h >= 24 ? `${Math.round(h / 24)}d overdue` : `${h}h overdue`, overdue: true };
  }
  if (hours < 24) return { label: `Due in ${hours}h`, overdue: false };
  return { label: `Due in ${Math.round(hours / 24)}d`, overdue: false };
}
