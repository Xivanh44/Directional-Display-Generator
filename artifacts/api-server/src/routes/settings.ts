import { Router, type IRouter } from "express";
import { db, managerSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/settings", async (req, res) => {
  try {
    const rows = await db.select().from(managerSettingsTable).where(eq(managerSettingsTable.id, 1));
    if (rows.length === 0) {
      res.json({ font: "Arial", arrowScale: 1, customArrowChar: null, customArrowDataUrl: null, customBannerDataUrl: null });
    } else {
      const { id: _id, updatedAt: _u, ...settings } = rows[0];
      res.json(settings);
    }
  } catch (err) {
    req.log.error(err, "Failed to fetch settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/settings", async (req, res) => {
  const { font, arrowScale, customArrowChar, customArrowDataUrl, customBannerDataUrl } = req.body as {
    font?: string;
    arrowScale?: number;
    customArrowChar?: string | null;
    customArrowDataUrl?: string | null;
    customBannerDataUrl?: string | null;
  };

  try {
    await db
      .insert(managerSettingsTable)
      .values({
        id: 1,
        font: font ?? "Arial",
        arrowScale: arrowScale ?? 1,
        customArrowChar: customArrowChar ?? null,
        customArrowDataUrl: customArrowDataUrl ?? null,
        customBannerDataUrl: customBannerDataUrl ?? null,
      })
      .onConflictDoUpdate({
        target: managerSettingsTable.id,
        set: {
          font: font ?? "Arial",
          arrowScale: arrowScale ?? 1,
          customArrowChar: customArrowChar ?? null,
          customArrowDataUrl: customArrowDataUrl ?? null,
          customBannerDataUrl: customBannerDataUrl ?? null,
          updatedAt: new Date(),
        },
      });
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Failed to save settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
