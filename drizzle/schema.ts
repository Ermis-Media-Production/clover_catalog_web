import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  bigint,
  primaryKey,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Clover Catalog Tables ────────────────────────────────────────────────────

export const cloverCategories = mysqlTable("clover_categories", {
  id: int("id").autoincrement().primaryKey(),
  cloverId: varchar("cloverId", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  sortOrder: int("sortOrder").default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const cloverTags = mysqlTable("clover_tags", {
  id: int("id").autoincrement().primaryKey(),
  cloverId: varchar("cloverId", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  showInReporting: boolean("showInReporting").default(false),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const cloverModifierGroups = mysqlTable("clover_modifier_groups", {
  id: int("id").autoincrement().primaryKey(),
  cloverId: varchar("cloverId", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  minRequired: int("minRequired").default(0),
  maxAllowed: int("maxAllowed").default(0),
  showByDefault: boolean("showByDefault").default(false),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const cloverModifiers = mysqlTable("clover_modifiers", {
  id: int("id").autoincrement().primaryKey(),
  cloverId: varchar("cloverId", { length: 64 }).notNull().unique(),
  modifierGroupId: varchar("modifierGroupId", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  /** Price in cents */
  price: bigint("price", { mode: "number" }).default(0),
  available: boolean("available").default(true),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const cloverItems = mysqlTable("clover_items", {
  id: int("id").autoincrement().primaryKey(),
  cloverId: varchar("cloverId", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  /** Price in cents */
  price: bigint("price", { mode: "number" }).default(0),
  /** Cost in cents */
  cost: bigint("cost", { mode: "number" }).default(0),
  description: text("description"),
  sku: varchar("sku", { length: 128 }),
  hidden: boolean("hidden").default(false),
  available: boolean("available").default(true),
  stockCount: int("stockCount"),
  imageUrl: text("imageUrl"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Join Tables ──────────────────────────────────────────────────────────────

export const cloverItemCategories = mysqlTable(
  "clover_item_categories",
  {
    itemCloverId: varchar("itemCloverId", { length: 64 }).notNull(),
    categoryCloverId: varchar("categoryCloverId", { length: 64 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.itemCloverId, t.categoryCloverId] })]
);

export const cloverItemTags = mysqlTable(
  "clover_item_tags",
  {
    itemCloverId: varchar("itemCloverId", { length: 64 }).notNull(),
    tagCloverId: varchar("tagCloverId", { length: 64 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.itemCloverId, t.tagCloverId] })]
);

export const cloverItemModifierGroups = mysqlTable(
  "clover_item_modifier_groups",
  {
    itemCloverId: varchar("itemCloverId", { length: 64 }).notNull(),
    modifierGroupCloverId: varchar("modifierGroupCloverId", { length: 64 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.itemCloverId, t.modifierGroupCloverId] })]
);

// ─── App Settings (system-level key-value store for scheduled job UIDs etc.) ──
export const appSettings = mysqlTable("app_settings", {
  key: varchar("key", { length: 128 }).primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;

// ─── Sync Logs ────────────────────────────────────────────────────────────────

export const syncLogs = mysqlTable("sync_logs", {
  id: int("id").autoincrement().primaryKey(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  finishedAt: timestamp("finishedAt"),
  status: mysqlEnum("status", ["running", "success", "error"]).default("running").notNull(),
  itemsSynced: int("itemsSynced").default(0),
  categoriesSynced: int("categoriesSynced").default(0),
  tagsSynced: int("tagsSynced").default(0),
  modifiersSynced: int("modifiersSynced").default(0),
  errorMessage: text("errorMessage"),
});

export type SyncLog = typeof syncLogs.$inferSelect;

// ─── Orders & Checkout ────────────────────────────────────────────────────────────────

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  /** Unique reference shown to the customer */
  reference: varchar("reference", { length: 32 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "paid", "failed", "refunded"]).default("pending").notNull(),
  /** Total amount in cents */
  totalCents: bigint("totalCents", { mode: "number" }).notNull(),
  /** Customer info */
  customerFirstName: varchar("customerFirstName", { length: 128 }).notNull(),
  customerLastName: varchar("customerLastName", { length: 128 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 32 }),
  /** Authorize.net transaction ID returned on success */
  authnetTransactionId: varchar("authnetTransactionId", { length: 64 }),
  authnetAuthCode: varchar("authnetAuthCode", { length: 16 }),
  /** Raw error message if payment failed */
  paymentError: text("paymentError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  /** Clover item ID for reference */
  itemCloverId: varchar("itemCloverId", { length: 64 }).notNull(),
  itemName: varchar("itemName", { length: 255 }).notNull(),
  /** Unit price at time of purchase in cents */
  unitPriceCents: bigint("unitPriceCents", { mode: "number" }).notNull(),
  quantity: int("quantity").notNull().default(1),
  /** Selected modifiers stored as JSON string */
  modifiersJson: text("modifiersJson"),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;
