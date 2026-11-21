import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function formatDate(d: Date | string | null | undefined, withTime = false): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
    timeZone: "Europe/Paris",
  }).format(new Date(d));
}

export function randomToken(bytes = 24): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Buffer.from(arr).toString("base64url");
}

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}
