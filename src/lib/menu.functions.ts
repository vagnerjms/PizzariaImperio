import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "./auth-middleware";
import {
  CatalogCrustOption,
  CatalogMenuItem,
  PublicCatalogResponse,
  slugifyCatalogId,
} from "./menu-domain";

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
  .middleware([requireAuth])
  .validator((raw: unknown) => saveMenuItemSchema.parse(raw))
  .handler(async ({ data, context }): Promise<CatalogMenuItem> => {
    if (!context.roles?.includes("admin")) {
      throw new Error("Apenas Administradores podem criar ou editar itens do cardápio.");
    }

    const { ensureCatalogSeeded } = await import("./menu.server");
    await ensureCatalogSeeded();
    const { getDb } = await import("./db");
    const db = await getDb();
    const col = db.collection<{
      _id: string;
      name: string;
      desc: string;
      ingredients: string;
      price: number;
      image: string;
      badge: string | null;
      category: (typeof VALID_CATEGORIES)[number];
      available: boolean;
      sort_order: number;
      created_at: Date;
      updated_at: Date;
    }>("menu_items");

    const now = new Date();
    const cleanPrice = Number(data.price.toFixed(2));
    const cleanBadge = data.badge && data.badge.trim() ? data.badge.trim() : null;
    const cleanDesc = data.desc?.trim() || data.ingredients.trim() || data.name;

    if (data.id) {
      const existing = await col.findOne({ _id: data.id });
      if (!existing) throw new Error("Item do cardápio não encontrado.");

      const nextSort = data.sort_order !== undefined ? data.sort_order : existing.sort_order;
      const nextImage = data.image || existing.image;

      await col.updateOne(
        { _id: data.id },
        {
          $set: {
            name: data.name,
            category: data.category,
            ingredients: data.ingredients,
            desc: cleanDesc,
            price: cleanPrice,
            badge: cleanBadge,
            image: nextImage,
            available: data.available,
            sort_order: nextSort,
            updated_at: now,
          },
        },
      );

      return {
        id: data.id,
        name: data.name,
        desc: cleanDesc,
        ingredients: data.ingredients,
        price: cleanPrice,
        image: nextImage,
        badge: cleanBadge || undefined,
        category: data.category,
        available: data.available,
        sort_order: nextSort,
      };
    }

    // Generate unique slug ID for new item
    let candidateId = slugifyCatalogId(data.name);
    const conflict = await col.findOne({ _id: candidateId });
    if (conflict) {
      candidateId = `${candidateId}-${crypto.randomUUID().slice(0, 4)}`;
    }

    const count = await col.estimatedDocumentCount();
    const sortOrder = data.sort_order !== undefined ? data.sort_order : count + 1;

    await col.insertOne({
      _id: candidateId,
      name: data.name,
      desc: cleanDesc,
      ingredients: data.ingredients,
      price: cleanPrice,
      image: data.image || "",
      badge: cleanBadge,
      category: data.category,
      available: data.available,
      sort_order: sortOrder,
      created_at: now,
      updated_at: now,
    });

    return {
      id: candidateId,
      name: data.name,
      desc: cleanDesc,
      ingredients: data.ingredients,
      price: cleanPrice,
      image: data.image || "",
      badge: cleanBadge || undefined,
      category: data.category,
      available: data.available,
      sort_order: sortOrder,
    };
  });

export const deleteMenuItem = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((raw: unknown) => z.object({ id: z.string().min(1) }).parse(raw))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    if (!context.roles?.includes("admin")) {
      throw new Error("Apenas Administradores podem excluir itens do cardápio.");
    }
    const { ensureCatalogSeeded } = await import("./menu.server");
    await ensureCatalogSeeded();
    const { getDb } = await import("./db");
    const db = await getDb();
    const res = await db.collection<{ _id: string }>("menu_items").deleteOne({ _id: data.id });
    if (res.deletedCount === 0) throw new Error("Item não encontrado.");
    return { ok: true };
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

    const { ensureCatalogSeeded } = await import("./menu.server");
    await ensureCatalogSeeded();
    const { getDb } = await import("./db");
    const db = await getDb();
    const col = db.collection<{ _id: string }>("menu_items");

    const updateFields: Record<string, unknown> = {
      updated_at: new Date(),
    };
    if (isAdmin && data.price !== undefined) updateFields.price = Number(data.price.toFixed(2));
    if (data.available !== undefined) updateFields.available = data.available;
    if (isAdmin && data.badge !== undefined) updateFields.badge = data.badge;

    const res = await col.updateOne({ _id: data.id }, { $set: updateFields });
    if (res.matchedCount === 0) {
      throw new Error("Item do cardápio não encontrado.");
    }

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
  .middleware([requireAuth])
  .validator((raw: unknown) => saveCrustSchema.parse(raw))
  .handler(async ({ data, context }): Promise<CatalogCrustOption> => {
    if (!context.roles?.includes("admin")) {
      throw new Error("Apenas Administradores podem criar ou editar bordas.");
    }

    const { ensureCatalogSeeded } = await import("./menu.server");
    await ensureCatalogSeeded();
    const { getDb } = await import("./db");
    const db = await getDb();
    const col = db.collection<{
      _id: string;
      name: string;
      price: number;
      available: boolean;
      sort_order: number;
      created_at: Date;
      updated_at: Date;
    }>("crust_options");

    const now = new Date();
    const cleanPrice = data.id === "nenhuma" ? 0 : Number(data.price.toFixed(2));
    const cleanAvailable = data.id === "nenhuma" ? true : data.available;

    if (data.id) {
      const existing = await col.findOne({ _id: data.id });
      if (!existing) throw new Error("Borda não encontrada.");
      const nextSort = data.sort_order !== undefined ? data.sort_order : existing.sort_order;
      await col.updateOne(
        { _id: data.id },
        {
          $set: {
            name: data.name,
            price: cleanPrice,
            available: cleanAvailable,
            sort_order: nextSort,
            updated_at: now,
          },
        },
      );
      return {
        id: data.id,
        name: data.name,
        price: cleanPrice,
        available: cleanAvailable,
        sort_order: nextSort,
      };
    }

    let candidateId = slugifyCatalogId(data.name);
    const conflict = await col.findOne({ _id: candidateId });
    if (conflict) {
      candidateId = `${candidateId}-${crypto.randomUUID().slice(0, 4)}`;
    }
    const count = await col.estimatedDocumentCount();
    const sortOrder = data.sort_order !== undefined ? data.sort_order : count + 1;

    await col.insertOne({
      _id: candidateId,
      name: data.name,
      price: cleanPrice,
      available: cleanAvailable,
      sort_order: sortOrder,
      created_at: now,
      updated_at: now,
    });

    return {
      id: candidateId,
      name: data.name,
      price: cleanPrice,
      available: cleanAvailable,
      sort_order: sortOrder,
    };
  });

export const toggleCrustAvailability = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((raw: unknown) =>
    z.object({ id: z.string().min(1), available: z.boolean() }).parse(raw),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    if (!context.roles?.some((r) => ["admin", "supervisor"].includes(r))) {
      throw new Error("Acesso restrito a supervisores e administradores.");
    }
    if (data.id === "nenhuma" && !data.available) {
      throw new Error('A opção "Sem Borda Recheada" não pode ser desativada.');
    }

    const { ensureCatalogSeeded } = await import("./menu.server");
    await ensureCatalogSeeded();
    const { getDb } = await import("./db");
    const db = await getDb();
    const res = await db
      .collection<{ _id: string }>("crust_options")
      .updateOne({ _id: data.id }, { $set: { available: data.available, updated_at: new Date() } });
    if (res.matchedCount === 0) throw new Error("Borda não encontrada.");
    return { ok: true };
  });

export const deleteCrustOption = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((raw: unknown) => z.object({ id: z.string().min(1) }).parse(raw))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    if (!context.roles?.includes("admin")) {
      throw new Error("Apenas Administradores podem excluir bordas.");
    }
    if (data.id === "nenhuma") {
      throw new Error('A opção padrão "Sem Borda Recheada" não pode ser excluída.');
    }

    const { ensureCatalogSeeded } = await import("./menu.server");
    await ensureCatalogSeeded();
    const { getDb } = await import("./db");
    const db = await getDb();
    const res = await db.collection<{ _id: string }>("crust_options").deleteOne({ _id: data.id });
    if (res.deletedCount === 0) throw new Error("Borda não encontrada.");
    return { ok: true };
  });
