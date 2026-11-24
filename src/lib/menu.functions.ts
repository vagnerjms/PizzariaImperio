import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, requireSupervisorOrAdmin } from "./auth-middleware";
import { CatalogCrustOption, CatalogMenuItem, PublicCatalogResponse } from "./menu-domain";

export interface PublicMenuOverride {
  id: string;
  price?: number;
  available: boolean;
  badge?: string | null;
}

const VALID_CATEGORIES = [
  "tradicionais",
  "especiais",
  "doces",
  "doces-especiais",
  "brotos",
  "bebidas",
  "adicionais",
] as const;

export const getPublicCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicCatalogResponse> => {
    const { getFullCatalogFromDb } = await import("./menu.server");
    return getFullCatalogFromDb();
  },
);

// Compatibility helper for legacy callers
export const getPublicMenuOverrides = createServerFn({ method: "GET" }).handler(async () => {
  const { getFullCatalogFromDb } = await import("./menu.server");
  const { items } = await getFullCatalogFromDb();
  const list: Record<string, PublicMenuOverride> = {};
  for (const item of items) {
    list[item.id] = {
      id: item.id,
      price: item.price,
      available: item.available,
      badge: item.badge ?? null,
    };
  }
  return list;
});

const saveMenuItemSchema = z.object({
  id: z.string().trim().max(80).optional(),
  name: z.string().trim().min(2, "Informe o nome do item.").max(100),
  category: z.enum(VALID_CATEGORIES),
  ingredients: z.string().trim().max(300).optional().default(""),
  desc: z.string().trim().max(300).optional(),
  price: z.number().min(0, "Preço inválido.").max(5000),
  badge: z.string().trim().max(40).nullable().optional(),
  image: z.string().trim().max(500).optional().default(""),
  available: z.boolean().optional().default(true),
  sort_order: z.number().int().min(0).max(10000).optional(),
});

export const saveMenuItem = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((raw: unknown) => saveMenuItemSchema.parse(raw))
  .handler(async ({ data }): Promise<CatalogMenuItem> => {
    const { upsertMenuItemInDb } = await import("./menu.server");
    return upsertMenuItemInDb(data);
  });

export const deleteMenuItem = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((raw: unknown) => z.object({ id: z.string().min(1) }).parse(raw))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { deleteMenuItemFromDb } = await import("./menu.server");
    await deleteMenuItemFromDb(data.id);
    return { ok: true };
  });

const updateMenuOverrideSchema = z.object({
  id: z.string().min(1).max(80),
  price: z.number().min(0).max(5000).optional(),
  available: z.boolean().optional(),
  badge: z.string().max(40).nullable().optional(),
});

export const saveMenuOverride = createServerFn({ method: "POST" })
  .middleware([requireSupervisorOrAdmin])
  .validator((raw: unknown) => updateMenuOverrideSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const isAdmin = Boolean(context.roles?.includes("admin"));

    // Supervisor can ONLY toggle stock availability (no price or badge changes)
    if (!isAdmin && (data.price !== undefined || data.badge !== undefined)) {
      throw new Error("Apenas Administradores podem alterar preços ou selos do cardápio.");
    }

    const { upsertMenuOverrideInDb } = await import("./menu.server");
    await upsertMenuOverrideInDb({ ...data, isAdmin });
    return { ok: true };
  });

// ---- CRUST OPTIONS CRUD + SUPERVISOR AVAILABILITY TOGGLE ----

const saveCrustSchema = z.object({
  id: z.string().trim().max(80).optional(),
  name: z.string().trim().min(2, "Informe o nome da borda.").max(80),
  price: z.number().min(0, "Preço inválido.").max(500),
  available: z.boolean().optional().default(true),
  sort_order: z.number().int().min(0).max(1000).optional(),
});

export const saveCrustOption = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((raw: unknown) => saveCrustSchema.parse(raw))
  .handler(async ({ data }): Promise<CatalogCrustOption> => {
    const { upsertCrustOptionInDb } = await import("./menu.server");
    return upsertCrustOptionInDb(data);
  });

export const toggleCrustAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupervisorOrAdmin])
  .validator((raw: unknown) =>
    z.object({ id: z.string().min(1), available: z.boolean() }).parse(raw),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { toggleCrustAvailabilityInDb } = await import("./menu.server");
    await toggleCrustAvailabilityInDb(data.id, data.available);
    return { ok: true };
  });

export const deleteCrustOption = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((raw: unknown) => z.object({ id: z.string().min(1) }).parse(raw))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { deleteCrustOptionFromDb } = await import("./menu.server");
    await deleteCrustOptionFromDb(data.id);
    return { ok: true };
  });
