import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "./auth-middleware";

export interface PublicMenuOverride {
  id: string;
  price?: number;
  available: boolean;
  badge?: string | null;
}

export const getPublicMenuOverrides = createServerFn({ method: "GET" }).handler(async () => {
  const { getMenuOverridesFromDb } = await import("./menu.server");
  const map = await getMenuOverridesFromDb();
  const list: Record<string, PublicMenuOverride> = {};
  for (const [id, doc] of Object.entries(map)) {
    list[id] = {
      id,
      price: doc.price,
      available: doc.available !== undefined ? doc.available : true,
      badge: doc.badge,
    };
  }
  return list;
});

const updateMenuOverrideSchema = z.object({
  id: z.string().min(1).max(80),
  price: z.number().min(0).max(5000).optional(),
  available: z.boolean().optional(),
  badge: z.string().max(40).nullable().optional(),
});

export const saveMenuOverride = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((raw: unknown) => updateMenuOverrideSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const isAdmin = Boolean(context.roles?.includes("admin"));
    const isSupervisor = Boolean(context.roles?.includes("supervisor"));

    if (!isAdmin && !isSupervisor) {
      throw new Error("Acesso restrito a supervisores e administradores.");
    }

    // Supervisor can ONLY toggle stock availability (no price or badge changes)
    if (!isAdmin && (data.price !== undefined || data.badge !== undefined)) {
      throw new Error("Apenas Administradores podem alterar preços ou selos do cardápio.");
    }

    const { getCollection } = await import("./db");
    const col = await getCollection("menu_overrides");

    const updateFields: Record<string, unknown> = {
      updated_at: new Date(),
    };
    if (isAdmin && data.price !== undefined) updateFields.price = Number(data.price.toFixed(2));
    if (data.available !== undefined) updateFields.available = data.available;
    if (isAdmin && data.badge !== undefined) updateFields.badge = data.badge;

    await col.updateOne(
      { _id: data.id as any },
      { $set: updateFields },
      { upsert: true }
    );

    return { ok: true };
  });

export const resetMenuOverride = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((raw: unknown) => z.object({ id: z.string() }).parse(raw))
  .handler(async ({ data, context }) => {
    if (!context.roles?.includes("admin")) {
      throw new Error("Acesso restrito a Administradores.");
    }

    const { getCollection } = await import("./db");
    const col = await getCollection("menu_overrides");
    await col.deleteOne({ _id: data.id as any });
    return { ok: true };
  });

