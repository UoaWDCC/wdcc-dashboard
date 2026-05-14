import { pgTable, text, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";
import { taskTeam, profileKind } from "./enums";

export const profile = pgTable(
  "profile",
  {
    email: text("email").primaryKey(),
    name: text("name").notNull(),
    team: taskTeam("team"),
    kind: profileKind("kind").notNull().default("personal"),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
  },
  (t) => [check("profile_email_lower", sql`${t.email} = lower(${t.email})`)]
);
