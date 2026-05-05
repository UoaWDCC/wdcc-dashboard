import { addAllowedDomain, addAllowedEmail } from "@/lib/allowlist";

async function main() {
  const emails = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const domains = (process.env.ALLOWED_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  for (const e of emails) await addAllowedEmail(e, { note: "seed" });
  for (const d of domains) await addAllowedDomain(d, { note: "seed" });

  console.log(`seeded ${emails.length} emails, ${domains.length} domains`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
