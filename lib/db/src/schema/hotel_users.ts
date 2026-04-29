import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const hotelUsersTable = pgTable("hotel_users", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("utilisateur"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHotelUserSchema = createInsertSchema(hotelUsersTable);
export type InsertHotelUser = z.infer<typeof insertHotelUserSchema>;
export type HotelUser = typeof hotelUsersTable.$inferSelect;
