import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCodeAndName(
  code?: string | null,
  name?: string | null,
  options?: { separator?: string },
) {
  const separator = options?.separator ?? " ";
  const trimmedCode = code?.trim();
  const trimmedName = name?.trim();

  if (trimmedCode && trimmedName) {
    return `${trimmedCode}${separator}${trimmedName}`;
  }

  if (trimmedCode) return trimmedCode;
  if (trimmedName) return trimmedName;
  return "";
}
