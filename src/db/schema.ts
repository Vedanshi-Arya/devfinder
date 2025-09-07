import {
  mysqlTable,
  varchar,
  text,
  primaryKey,
  int,
  datetime,
  char,
} from "drizzle-orm/mysql-core";
import type { AdapterAccount } from "@auth/core/adapters";
import { sql } from "drizzle-orm";

export const users = mysqlTable("user", {
  id: varchar("id", { length: 191 }).notNull().primaryKey(),
  name: varchar("name", { length: 191 }),
  email: varchar("email", { length: 191 }).notNull(),
  emailVerified: datetime("emailVerified"),
  image: text("image"),
});

export const accounts = mysqlTable(
  "account",
  {
    userId: varchar("userId", { length: 191 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 191 })
      .$type<AdapterAccount["type"]>()
      .notNull(),
    provider: varchar("provider", { length: 191 }).notNull(),
    providerAccountId: varchar("providerAccountId", { length: 191 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: int("expires_at"),
    token_type: varchar("token_type", { length: 191 }),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 191 }),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = mysqlTable("session", {
  sessionToken: varchar("sessionToken", { length: 191 }).notNull().primaryKey(),
  userId: varchar("userId", { length: 191 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: datetime("expires").notNull(),
});

export const verificationTokens = mysqlTable(
  "verificationToken",
  {
    identifier: varchar("identifier", { length: 191 }).notNull(),
    token: varchar("token", { length: 191 }).notNull(),
    expires: datetime("expires").notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

export const room = mysqlTable("room", {
  id: char("id", { length: 36 })
    .default(sql`(UUID())`)
    .notNull()
    .primaryKey(),
  userId: varchar("userId", { length: 191 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 191 }).notNull(),
  description: text("description"),
  tags: text("tags").notNull(),
  githubRepo: text("githubRepo"),
});

export type Room = typeof room.$inferSelect;
