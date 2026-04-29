import { Router } from "express";
import bcryptjs from "bcryptjs";
import { db, hotelUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_BAPI = "https://api.clerk.com";

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    return res.status(400).json({ error: "Identifiant et mot de passe requis" });
  }

  try {
    const [user] = await db
      .select()
      .from(hotelUsersTable)
      .where(eq(hotelUsersTable.username, username.trim().toLowerCase()))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: "Identifiant ou mot de passe incorrect" });
    }

    const valid = await bcryptjs.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Identifiant ou mot de passe incorrect" });
    }

    const tokenRes = await fetch(`${CLERK_BAPI}/v1/sign_in_tokens`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: user.clerkUserId, expires_in_seconds: 120 }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      req.log.error({ err }, "Failed to create Clerk sign-in token");
      return res.status(500).json({ error: "Erreur d'authentification" });
    }

    const tokenData = (await tokenRes.json()) as { token: string };

    res.json({ token: tokenData.token });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
