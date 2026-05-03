-- Migration: create allergen_items table for cocktail allergen declarations
CREATE TABLE IF NOT EXISTS allergen_items (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  lait        BOOLEAN NOT NULL DEFAULT false,
  cereales    BOOLEAN NOT NULL DEFAULT false,
  fruits_coque BOOLEAN NOT NULL DEFAULT false,
  poisson     BOOLEAN NOT NULL DEFAULT false,
  mollusques  BOOLEAN NOT NULL DEFAULT false,
  crustaces   BOOLEAN NOT NULL DEFAULT false,
  celeri      BOOLEAN NOT NULL DEFAULT false,
  oeufs       BOOLEAN NOT NULL DEFAULT false,
  moutarde    BOOLEAN NOT NULL DEFAULT false,
  sesame      BOOLEAN NOT NULL DEFAULT false,
  soja        BOOLEAN NOT NULL DEFAULT false,
  sulfites    BOOLEAN NOT NULL DEFAULT false,
  lupin       BOOLEAN NOT NULL DEFAULT false,
  arachide    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
