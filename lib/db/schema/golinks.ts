import {
  pgTable,
  text,
  integer,
  date,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const goLink = pgTable("go_link", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  label: text("label").notNull(),
  link: text("link").notNull(),
  hoverHint: text("hover_hint"),
  iconUrl: text("icon_url"),
  isPermanent: boolean("is_permanent").notNull().default(false),
  hidden: boolean("hidden").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  team: text("team"),
  eventDate: date("event_date"),
  createdBy: text("created_by").references(() => user.id, {
    onDelete: "set null",
  }),
  updatedBy: text("updated_by").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const goRedirect = pgTable("go_redirect", {
  key: text("key").primaryKey(),
  destinationUrl: text("destination_url").notNull(),
  hidden: boolean("hidden").notNull().default(false),
  createdBy: text("created_by").references(() => user.id, {
    onDelete: "set null",
  }),
  updatedBy: text("updated_by").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
