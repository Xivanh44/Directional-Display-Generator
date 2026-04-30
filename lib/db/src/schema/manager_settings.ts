import { pgTable, integer, text, real, timestamp } from "drizzle-orm/pg-core";

export const managerSettingsTable = pgTable("manager_settings", {
  id: integer("id").primaryKey().default(1),
  font: text("font").notNull().default("Arial"),
  arrowScale: real("arrow_scale").notNull().default(1.0),
  customArrowChar: text("custom_arrow_char"),
  customArrowDataUrl: text("custom_arrow_data_url"),
  customBannerDataUrl: text("custom_banner_data_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ManagerSettings = typeof managerSettingsTable.$inferSelect;
