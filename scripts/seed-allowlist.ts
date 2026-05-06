import "dotenv/config";
import { assertCleanDomain, normalizeDomain, normalizeEmail } from "@/lib/allowlist";
import { db, pool } from "@/lib/db";
import { allowedDomain, allowedEmail } from "@/lib/db/schema";

async function main() {
  const emails = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const domains = (process.env.ALLOWED_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  for (const d of domains) assertCleanDomain(d);

  await db.transaction(async (tx) => {
    if (emails.length > 0) {
      await tx
        .insert(allowedEmail)
        .values(emails.map((e) => ({ email: normalizeEmail(e), note: "seed" })))
        .onConflictDoNothing();
    }
    if (domains.length > 0) {
      await tx
        .insert(allowedDomain)
        .values(domains.map((d) => ({ domain: normalizeDomain(d), note: "seed" })))
        .onConflictDoNothing();
    }
  });

  console.log(`seeded ${emails.length} emails, ${domains.length} domains`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
