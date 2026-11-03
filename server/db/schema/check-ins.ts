import "server-only";

import {
  pgTable,
  text,
  timestamp,
  boolean,
  smallint,
  primaryKey,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";
import { profile } from "./profile";
import { checkInFlag } from "./enums";
import { CHECK_IN_MONTHS } from "@/lib/check-ins/types";

const firstMonth = Math.min(...CHECK_IN_MONTHS);
const lastMonth = Math.max(...CHECK_IN_MONTHS);

export const checkIn = pgTable(
  "check_in",
  {
    profileEmail: text("profile_email")
      .notNull()
      .references(() => profile.email, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    year: smallint("year").notNull(),
    month: smallint("month").notNull(),
    checked: boolean("checked").notNull().default(false),
    flag: checkInFlag("flag"),
    note: text("note"),
    updatedBy: text("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.profileEmail, t.year, t.month] }),
    check(
      "check_in_month_range",
      sql`${t.month} between ${sql.raw(String(firstMonth))} and ${sql.raw(String(lastMonth))}`
    ),
  ]
);
