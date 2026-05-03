import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const allergenItemsTable = pgTable("allergen_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  lait: boolean("lait").notNull().default(false),
  cereales: boolean("cereales").notNull().default(false),
  fruits_coque: boolean("fruits_coque").notNull().default(false),
  poisson: boolean("poisson").notNull().default(false),
  mollusques: boolean("mollusques").notNull().default(false),
  crustaces: boolean("crustaces").notNull().default(false),
  celeri: boolean("celeri").notNull().default(false),
  oeufs: boolean("oeufs").notNull().default(false),
  moutarde: boolean("moutarde").notNull().default(false),
  sesame: boolean("sesame").notNull().default(false),
  soja: boolean("soja").notNull().default(false),
  sulfites: boolean("sulfites").notNull().default(false),
  lupin: boolean("lupin").notNull().default(false),
  arachide: boolean("arachide").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAllergenItemSchema = createInsertSchema(allergenItemsTable).omit({ id: true, createdAt: true });
export type InsertAllergenItem = z.infer<typeof insertAllergenItemSchema>;
export type AllergenItem = typeof allergenItemsTable.$inferSelect;
