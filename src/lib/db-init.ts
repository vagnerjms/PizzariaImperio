import { ensureIndexes, getDb } from "./db";
import { hashPassword } from "./hash";
import type { Collection } from "mongodb";

async function ensureSeedUser(
  usersCol: Collection,
  opts: {
    label: string;
    role: "admin" | "supervisor" | "atendente";
    email: string;
    envPassword: string | undefined;
    devFallbackPassword: string;
  }
) {
  const existing = await usersCol.findOne({ email: opts.email });
  if (existing) return;

  const isProd = process.env.NODE_ENV === "production";
  const allowWeakDefaults = process.env.ALLOW_DEFAULT_SEED_PASSWORDS === "true";
  const password = opts.envPassword?.trim() || (!isProd || allowWeakDefaults ? opts.devFallbackPassword : "");

  if (!password) {
    console.warn(
      `[DB Init] Skipping default ${opts.label} seed (${opts.email}) in production because its password env var is not configured.`
    );
    return;
  }

  console.log(`[DB Init] ${opts.label} user not found. Creating user: ${opts.email}`);
  const hashedPassword = await hashPassword(password);
  try {
    await usersCol.insertOne({
      email: opts.email,
      password_hash: hashedPassword,
      roles: [opts.role],
      created_at: new Date(),
      updated_at: new Date(),
    });
    console.log(`[DB Init] Default ${opts.label} user created successfully.`);
  } catch (err: any) {
    // Ignore duplicate key error if another worker seeded concurrently
    if (err?.code !== 11000) throw err;
  }
}

export async function initializeDatabase() {
  try {
    console.log("[DB Init] Initializing MongoDB database...");
    const db = await getDb();
    await ensureIndexes(db);

    const { ensureCatalogSeeded } = await import("./menu.server");
    await ensureCatalogSeeded();

    const usersCol = db.collection("users");
    await ensureSeedUser(usersCol, {
      label: "Admin",
      role: "admin",
      email: (process.env.ADMIN_EMAIL || "admin@pizzaria.com").trim().toLowerCase(),
      envPassword: process.env.ADMIN_PASSWORD,
      devFallbackPassword: "admin123",
    });

    await ensureSeedUser(usersCol, {
      label: "Supervisor",
      role: "supervisor",
      email: (process.env.SUPERVISOR_EMAIL || "supervisor@pizzaria.com").trim().toLowerCase(),
      envPassword: process.env.SUPERVISOR_PASSWORD,
      devFallbackPassword: "supervisor123",
    });

    await ensureSeedUser(usersCol, {
      label: "Atendente",
      role: "atendente",
      email: (process.env.ATENDENTE_EMAIL || "atendente@pizzaria.com").trim().toLowerCase(),
      envPassword: process.env.ATENDENTE_PASSWORD,
      devFallbackPassword: "atendente123",
    });

    console.log("[DB Init] Database initialization complete.");
  } catch (error) {
    console.error("[DB Init] Database initialization failed:", error);
  }
}
