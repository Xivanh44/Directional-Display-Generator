import { Router } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import bcryptjs from "bcryptjs";
import { db, hotelUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function requireManager(req: any, res: any, next: any) {
  const auth = getAuth(req);
  if (!auth.userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }
  const clerk = await clerkClient(req);
  const user = await clerk.users.getUser(auth.userId);
  if ((user.publicMetadata as any)?.role !== "manager") {
    return res.status(403).json({ error: "Accès refusé — rôle manageur requis" });
  }
  next();
}

router.get("/admin/users", requireManager, async (req, res) => {
  try {
    const users = await db.select().from(hotelUsersTable);
    const result = users.map((u) => ({
      id: u.clerkUserId,
      username: u.username,
      role: u.role,
      createdAt: u.createdAt,
    }));
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list users");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/admin/users", requireManager, async (req, res) => {
  const { username, password, role } = req.body as {
    username?: string;
    password?: string;
    role?: string;
  };

  if (!username || !password) {
    return res.status(400).json({ error: "Identifiant et mot de passe requis" });
  }
  if (!["manager", "utilisateur"].includes(role ?? "")) {
    return res.status(400).json({ error: "Rôle invalide" });
  }
  if (username.length < 2 || username.length > 30) {
    return res.status(400).json({ error: "L'identifiant doit faire entre 2 et 30 caractères" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Le mot de passe doit faire au moins 8 caractères" });
  }

  const sanitizedUsername = username.trim().replace(/[^a-zA-Z0-9_.-]/g, "").toLowerCase();
  if (sanitizedUsername.length < 2) {
    return res.status(400).json({ error: "Identifiant invalide" });
  }

  try {
    const existing = await db
      .select()
      .from(hotelUsersTable)
      .where(eq(hotelUsersTable.username, sanitizedUsername))
      .limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: "Cet identifiant est déjà utilisé" });
    }

    const generatedEmail = `${sanitizedUsername}@hotel-signage.app`;
    const internalPassword = `internal-${Date.now()}-${Math.random().toString(36)}`;

    const clerk = await clerkClient(req);
    const clerkUser = await clerk.users.createUser({
      username: sanitizedUsername,
      emailAddress: [generatedEmail],
      password: internalPassword,
      publicMetadata: { role: role ?? "utilisateur" },
    });

    const passwordHash = await bcryptjs.hash(password, 12);

    await db.insert(hotelUsersTable).values({
      clerkUserId: clerkUser.id,
      username: sanitizedUsername,
      passwordHash,
      role: role ?? "utilisateur",
    });

    res.status(201).json({
      id: clerkUser.id,
      username: sanitizedUsername,
      role: role ?? "utilisateur",
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to create user");
    const clerkErrors = err?.errors ?? [];
    if (clerkErrors.length > 0) {
      const msg = clerkErrors[0].message as string;
      if (msg.toLowerCase().includes("taken") || msg.toLowerCase().includes("unique")) {
        return res.status(409).json({ error: "Cet identifiant est déjà utilisé" });
      }
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: "Erreur lors de la création du compte" });
  }
});

router.put("/admin/users/:id/password", requireManager, async (req, res) => {
  const { id } = req.params;
  const { password } = req.body as { password?: string };
  if (!password || password.length < 8) {
    return res.status(400).json({ error: "Le mot de passe doit faire au moins 8 caractères" });
  }
  try {
    const passwordHash = await bcryptjs.hash(password, 12);
    await db
      .update(hotelUsersTable)
      .set({ passwordHash })
      .where(eq(hotelUsersTable.clerkUserId, id));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to update password");
    res.status(500).json({ error: "Erreur lors de la mise à jour" });
  }
});

router.delete("/admin/users/:id", requireManager, async (req, res) => {
  const { id } = req.params;
  const auth = getAuth(req);
  if (id === auth.userId) {
    return res.status(400).json({ error: "Impossible de supprimer votre propre compte" });
  }
  try {
    const clerk = await clerkClient(req);
    await clerk.users.deleteUser(id);
    await db.delete(hotelUsersTable).where(eq(hotelUsersTable.clerkUserId, id));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete user");
    res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});

export default router;
