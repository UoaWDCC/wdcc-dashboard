import { z } from "zod";
import { Errors } from "./errors";

function raw(fd: FormData, key: string): string | null {
	const v = fd.get(key);
	return typeof v === "string" ? v : null;
}

export function parseString(fd: FormData, key: string): string | null {
	const v = raw(fd, key)?.trim();
	return v ? v : null;
}

export function parseRequiredString(fd: FormData, key: string): string {
	const v = parseString(fd, key);
	if (!v) throw Errors.validation(`Missing required field: ${key}`);
	return v;
}

const emailSchema = z.email();

export function parseEmail(fd: FormData, key: string): string {
	const parsed = emailSchema.safeParse(raw(fd, key) ?? "");
	if (!parsed.success) throw Errors.validation(`Invalid email: ${key}`);
	return parsed.data.toLowerCase();
}

export function parseEnum<T extends readonly string[]>(
	fd: FormData,
	key: string,
	values: T,
): T[number] | null {
	const v = parseString(fd, key);
	if (!v) return null;
	return (values as readonly string[]).includes(v) ? (v as T[number]) : null;
}

export function parseBool(fd: FormData, key: string): boolean {
	const v = raw(fd, key);
	return v === "on" || v === "true";
}

export function parseInteger(fd: FormData, key: string, fallback = 0): number {
	const v = raw(fd, key);
	if (v === null) return fallback;
	const n = parseInt(v, 10);
	return Number.isFinite(n) ? n : fallback;
}

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export function parseDate(fd: FormData, key: string): string | null {
	const v = parseString(fd, key);
	if (!v) return null;
	return dateSchema.safeParse(v).success ? v : null;
}
