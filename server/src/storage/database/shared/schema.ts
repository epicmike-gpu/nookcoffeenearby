import { pgTable, serial, timestamp, varchar, text, real, integer, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    device_id: varchar("device_id", { length: 64 }).notNull().unique(),
    nickname: varchar("nickname", { length: 64 }).notNull().default('咖啡爱好者'),
    avatar_url: text("avatar_url"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("users_device_id_idx").on(table.device_id),
  ]
);

export const wishlists = pgTable(
  "wishlists",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    shop_name: varchar("shop_name", { length: 128 }).notNull(),
    shop_address: text("shop_address").notNull(),
    shop_phone: varchar("shop_phone", { length: 32 }),
    shop_rating: real("shop_rating"),
    shop_latitude: real("shop_latitude").notNull(),
    shop_longitude: real("shop_longitude").notNull(),
    shop_poi_id: varchar("shop_poi_id", { length: 64 }),
    shop_photos: text("shop_photos").default('[]'),
    note: text("note"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("wishlists_user_id_idx").on(table.user_id),
    index("wishlists_created_at_idx").on(table.created_at),
  ]
);

export const checkins = pgTable(
  "checkins",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    shop_name: varchar("shop_name", { length: 128 }).notNull(),
    shop_address: text("shop_address").notNull(),
    shop_phone: varchar("shop_phone", { length: 32 }),
    shop_rating: real("shop_rating"),
    shop_latitude: real("shop_latitude").notNull(),
    shop_longitude: real("shop_longitude").notNull(),
    shop_poi_id: varchar("shop_poi_id", { length: 64 }),
    shop_photos: text("shop_photos").default('[]'),
    note: text("note"),
    photo_url: text("photo_url"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("checkins_user_id_idx").on(table.user_id),
    index("checkins_created_at_idx").on(table.created_at),
  ]
);
