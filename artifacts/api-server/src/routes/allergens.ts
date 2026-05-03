import { Router, type IRouter } from "express";
import { db, allergenItemsTable } from "@workspace/db";
import { eq, ilike } from "drizzle-orm";

const router: IRouter = Router();

router.get("/allergens", async (req, res) => {
  try {
    const q = req.query.q as string | undefined;
    let rows;
    if (q && q.trim().length > 0) {
      rows = await db
        .select()
        .from(allergenItemsTable)
        .where(ilike(allergenItemsTable.name, `%${q.trim()}%`))
        .orderBy(allergenItemsTable.name)
        .limit(50);
    } else {
      rows = await db
        .select()
        .from(allergenItemsTable)
        .orderBy(allergenItemsTable.name);
    }
    res.json(rows);
  } catch (err) {
    req.log.error(err, "Failed to list allergen items");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/allergens", async (req, res) => {
  try {
    const body = req.body as {
      name: string;
      lait: boolean;
      cereales: boolean;
      fruits_coque: boolean;
      poisson: boolean;
      mollusques: boolean;
      crustaces: boolean;
      celeri: boolean;
      oeufs: boolean;
      moutarde: boolean;
      sesame: boolean;
      soja: boolean;
      sulfites: boolean;
      lupin: boolean;
      arachide: boolean;
    };

    if (!body.name || typeof body.name !== "string") {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const [row] = await db
      .insert(allergenItemsTable)
      .values({
        name: body.name,
        lait: body.lait ?? false,
        cereales: body.cereales ?? false,
        fruits_coque: body.fruits_coque ?? false,
        poisson: body.poisson ?? false,
        mollusques: body.mollusques ?? false,
        crustaces: body.crustaces ?? false,
        celeri: body.celeri ?? false,
        oeufs: body.oeufs ?? false,
        moutarde: body.moutarde ?? false,
        sesame: body.sesame ?? false,
        soja: body.soja ?? false,
        sulfites: body.sulfites ?? false,
        lupin: body.lupin ?? false,
        arachide: body.arachide ?? false,
      })
      .returning();

    res.status(201).json(row);
  } catch (err) {
    req.log.error(err, "Failed to create allergen item");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/allergens/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const body = req.body as {
      name?: string;
      lait?: boolean;
      cereales?: boolean;
      fruits_coque?: boolean;
      poisson?: boolean;
      mollusques?: boolean;
      crustaces?: boolean;
      celeri?: boolean;
      oeufs?: boolean;
      moutarde?: boolean;
      sesame?: boolean;
      soja?: boolean;
      sulfites?: boolean;
      lupin?: boolean;
      arachide?: boolean;
    };

    const [row] = await db
      .update(allergenItemsTable)
      .set({
        name: body.name,
        lait: body.lait,
        cereales: body.cereales,
        fruits_coque: body.fruits_coque,
        poisson: body.poisson,
        mollusques: body.mollusques,
        crustaces: body.crustaces,
        celeri: body.celeri,
        oeufs: body.oeufs,
        moutarde: body.moutarde,
        sesame: body.sesame,
        soja: body.soja,
        sulfites: body.sulfites,
        lupin: body.lupin,
        arachide: body.arachide,
      })
      .where(eq(allergenItemsTable.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json(row);
  } catch (err) {
    req.log.error(err, "Failed to update allergen item");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/allergens/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    await db.delete(allergenItemsTable).where(eq(allergenItemsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Failed to delete allergen item");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
