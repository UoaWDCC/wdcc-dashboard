import { sql } from "drizzle-orm";
import type { db } from "@/lib/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Serialize concurrent writes against a profile email (profile delete vs
// task_assignee insert) to prevent orphan active tasks with zero assignees.
// Callers must sort emails deterministically before invoking to avoid deadlock.
export async function lockProfileEmails(
  tx: Tx,
  emails: string[]
): Promise<void> {
  if (!emails.length) return;
  const sorted = [...new Set(emails)].sort();
  for (const email of sorted) {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${"profile:" + email})::bigint)`
    );
  }
}
