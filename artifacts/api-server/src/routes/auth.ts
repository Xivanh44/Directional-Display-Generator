import { Router } from "express";
import bcryptjs from "bcryptjs";
import { db, pool, hotelUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_BAPI = "https://api.clerk.com";

async function clerkBapi(path: string, body: object): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(`${CLERK_BAPI}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function ensureClerkUser(username: string, role: string): Promise<string> {
  const email = `${username}@hotel-signage.internal`;
  const internalPassword = `internal-${Date.now()}-${Math.random().toString(36)}`;

  const { ok, data } = await clerkBapi("/v1/users", {
    username,
    email_address: [email],
    password: internalPassword,
    public_metadata: { role },
    skip_password_checks: true,
  });

  if (!ok) {
    // If username already taken in this Clerk instance, look it up instead
    const listRes = await fetch(
      `${CLERK_BAPI}/v1/users?username=${encodeURIComponent(username)}&limit=1`,
      { headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` } }
    );
    const listData = (await listRes.json()) as { data?: { id: string }[] };
    const existing = listData?.data?.[0];
    if (existing?.id) return existing.id;
    throw new Error(`Failed to create Clerk user: ${JSON.stringify(data)}`);
  }

  return data.id as string;
}

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

    let clerkUserId = user.clerkUserId;

    // Try to create sign-in token for the stored Clerk user ID
    let tokenResult = await clerkBapi("/v1/sign_in_tokens", {
      user_id: clerkUserId,
      expires_in_seconds: 120,
    });

    // If user not found in this Clerk instance (dev→prod migration), create it
    if (!tokenResult.ok) {
      const errCodes: string[] = (tokenResult.data?.errors ?? []).map((e: any) => e.code as string);
      const isNotFound = errCodes.some((c) => c.includes("not_found"));
      if (isNotFound) {
        req.log.info({ username }, "Clerk user not found — creating in current instance");
        clerkUserId = await ensureClerkUser(user.username, user.role);

        // Update the DB with the new Clerk user ID (PK update via raw SQL)
        await pool.query(
          "UPDATE hotel_users SET clerk_user_id = $1 WHERE username = $2",
          [clerkUserId, user.username]
        );

        tokenResult = await clerkBapi("/v1/sign_in_tokens", {
          user_id: clerkUserId,
          expires_in_seconds: 120,
        });
      }
    }

    if (!tokenResult.ok) {
      req.log.error({ err: JSON.stringify(tokenResult.data) }, "Failed to create Clerk sign-in token");
      return res.status(500).json({ error: "Erreur d'authentification" });
    }

    res.json({
      token: tokenResult.data.token as string,
      clerkEmail: `${user.username}@hotel-signage.internal`,
    });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
