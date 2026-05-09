import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Better Auth tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("session_user_id_idx").on(t.userId),
    index("session_expires_at_idx").on(t.expiresAt),
  ]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)]
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

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
