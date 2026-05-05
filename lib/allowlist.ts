import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { allowedDomain, allowedEmail } from "@/lib/db/schema";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase().replace(/^@/, "");
}

export async function isAllowedEmail(email: string) {
  const normalized = normalizeEmail(email);
  const domain = normalized.split("@")[1];

  const emailHit = await db
    .select({ email: allowedEmail.email })
    .from(allowedEmail)
    .where(eq(allowedEmail.email, normalized))
    .limit(1);
  if (emailHit.length > 0) return true;

  if (!domain) return false;
  const domainHit = await db
    .select({ domain: allowedDomain.domain })
    .from(allowedDomain)
    .where(eq(allowedDomain.domain, domain))
    .limit(1);
  return domainHit.length > 0;
}

export async function listAllowedEmails() {
  return db.select().from(allowedEmail).orderBy(allowedEmail.email);
}

export async function listAllowedDomains() {
  return db.select().from(allowedDomain).orderBy(allowedDomain.domain);
}

export async function addAllowedEmail(
  email: string,
  opts: { note?: string; createdBy?: string } = {},
) {
  await db
    .insert(allowedEmail)
    .values({
      email: normalizeEmail(email),
      note: opts.note ?? null,
      createdBy: opts.createdBy ?? null,
    })
    .onConflictDoNothing();
}

export async function removeAllowedEmail(email: string) {
  await db.delete(allowedEmail).where(eq(allowedEmail.email, normalizeEmail(email)));
}

export async function addAllowedDomain(
  domain: string,
  opts: { note?: string; createdBy?: string } = {},
) {
  await db
    .insert(allowedDomain)
    .values({
      domain: normalizeDomain(domain),
      note: opts.note ?? null,
      createdBy: opts.createdBy ?? null,
    })
    .onConflictDoNothing();
}

export async function removeAllowedDomain(domain: string) {
  await db
    .delete(allowedDomain)
    .where(eq(allowedDomain.domain, normalizeDomain(domain)));
}
