import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFirstElement(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function safePath(value: string | undefined) {
  // mirrors better auth trusted origin relative path rule
  const safe = /^\/(?!\/|\\|%2f|%5c)[\w\-.\+/@]*(?:\?[\w\-.\+/=&%@]*)?$/i;
  if (!value) return undefined;
  if (!safe.test(value)) return undefined;
  return value;
}
