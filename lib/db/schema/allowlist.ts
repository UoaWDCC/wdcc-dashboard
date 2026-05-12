import { pgTable, text, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";

export const allowedEmail = pgTable(
  "allowed_email",
  {
    email: text("email").primaryKey(),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
  },
  (t) => [check("allowed_email_lower", sql`${t.email} = lower(${t.email})`)]
);

export const allowedDomain = pgTable(
  "allowed_domain",
  {
    domain: text("domain").primaryKey(),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
  },
  (t) => [check("allowed_domain_lower", sql`${t.domain} = lower(${t.domain})`)]
);
