import { getCollection, getDb } from "./db";
import { Category, CRUST_OPTIONS, MENU } from "@/data/catalog";
import {
  buildInitialCrustSeed,
  buildInitialMenuSeed,
  CatalogCrustOption,
  CatalogMenuItem,
  LegacyMenuOverride,
  normalizeImageForStorage,
  PublicCatalogResponse,
  resolveMenuImage,
  slugifyCatalogId,
} from "./menu-domain";

export interface MenuOverrideDoc extends LegacyMenuOverride {
  _id: string; // pizza id
  updated_at: Date;
}

export interface MenuItemDoc {
  _id: string;
  name: string;
  desc: string;
  ingredients: string;
  price: number;
  image: string;
  badge?: string | null;
  category: Category;
  available: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface CrustOptionDoc {
  _id: string;
  name: string;
  price: number;
  available: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

let seedPromise: Promise<void> | null = null;

function serializeMenuItem(doc: MenuItemDoc): CatalogMenuItem {
  return {
    id: doc._id,
    name: doc.name,
    desc: doc.desc || doc.ingredients || doc.name,
    ingredients: doc.ingredients || doc.desc || "",
    price: Number(Number(doc.price || 0).toFixed(2)),
    image: resolveMenuImage(doc.image, doc._id),
    badge: doc.badge || undefined,
    category: doc.category,
    available: doc.available !== false,
    sort_order: typeof doc.sort_order === "number" ? doc.sort_order : 999,
  };
}

function serializeCrust(doc: CrustOptionDoc): CatalogCrustOption {
  return {
    id: doc._id,
    name: doc.name,
    price: Number(Number(doc.price || 0).toFixed(2)),
    available: doc.available !== false,
    sort_order: typeof doc.sort_order === "number" ? doc.sort_order : 99,
  };
}

export async function getMenuOverridesFromDb(): Promise<Record<string, MenuOverrideDoc>> {
  try {
    const col = await getCollection<MenuOverrideDoc>("menu_overrides");
    const docs = await col.find({}).toArray();
    const map: Record<string, MenuOverrideDoc> = {};
    for (const d of docs) {
      map[d._id] = d;
    }
    return map;
  } catch (err) {
    console.error("Failed to fetch menu overrides:", err);
    return {};
  }
}

/**
 * Idempotently migrates static catalog.ts + legacy menu_overrides into MongoDB
 * `menu_items` and `crust_options` collections on first run.
 */
export async function ensureCatalogSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      try {
        const db = await getDb();
        const menuCol = db.collection<MenuItemDoc>("menu_items");
        const crustCol = db.collection<CrustOptionDoc>("crust_options");
        const now = new Date();

        const [menuCount, crustCount] = await Promise.all([
          menuCol.estimatedDocumentCount(),
          crustCol.estimatedDocumentCount(),
        ]);

        if (menuCount === 0) {
          const legacyOverrides = await getMenuOverridesFromDb();
          const seedItems = buildInitialMenuSeed(MENU, legacyOverrides);
          if (seedItems.length > 0) {
            await menuCol.bulkWrite(
              seedItems.map((item) => ({
                updateOne: {
                  filter: { _id: item.id },
                  update: {
                    $setOnInsert: {
                      _id: item.id,
                      name: item.name,
                      desc: item.desc,
                      ingredients: item.ingredients,
                      price: item.price,
                      image: item.image,
                      badge: item.badge ?? null,
                      category: item.category,
                      available: item.available,
                      sort_order: item.sort_order,
                      created_at: now,
                      updated_at: now,
                    },
                  },
                  upsert: true,
                },
              })),
              { ordered: false },
            );
            console.log(`[Catalog Seed] Migrated ${seedItems.length} menu items into MongoDB.`);
          }
        }

        if (crustCount === 0) {
          const seedCrusts = buildInitialCrustSeed(CRUST_OPTIONS);
          if (seedCrusts.length > 0) {
            await crustCol.bulkWrite(
              seedCrusts.map((crust) => ({
                updateOne: {
                  filter: { _id: crust.id },
                  update: {
                    $setOnInsert: {
                      _id: crust.id,
                      name: crust.name,
                      price: crust.price,
                      available: crust.available,
                      sort_order: crust.sort_order,
                      created_at: now,
                      updated_at: now,
                    },
                  },
                  upsert: true,
                },
              })),
              { ordered: false },
            );
            console.log(`[Catalog Seed] Migrated ${seedCrusts.length} crust options into MongoDB.`);
          }
        }
      } catch (err) {
        seedPromise = null;
        console.error("Failed to seed catalog collections:", err);
      }
    })();
  }
  await seedPromise;
}

export async function getFullCatalogFromDb(): Promise<PublicCatalogResponse> {
  try {
    await ensureCatalogSeeded();
    const db = await getDb();
    const menuCol = db.collection<MenuItemDoc>("menu_items");
    const crustCol = db.collection<CrustOptionDoc>("crust_options");

    const [itemDocs, crustDocs] = await Promise.all([
      menuCol.find({}).sort({ sort_order: 1, name: 1 }).toArray(),
      crustCol.find({}).sort({ sort_order: 1, name: 1 }).toArray(),
    ]);

    const items =
      itemDocs.length > 0
        ? itemDocs.map(serializeMenuItem)
        : buildInitialMenuSeed(MENU).map((i) => ({ ...i, image: resolveMenuImage(i.image, i.id) }));
    const crusts =
      crustDocs.length > 0 ? crustDocs.map(serializeCrust) : buildInitialCrustSeed(CRUST_OPTIONS);

    return { items, crusts };
  } catch (err) {
    console.error("Failed to load full catalog from DB, falling back to static catalog:", err);
    return {
      items: buildInitialMenuSeed(MENU).map((i) => ({
        ...i,
        image: resolveMenuImage(i.image, i.id),
      })),
      crusts: buildInitialCrustSeed(CRUST_OPTIONS),
    };
  }
}

export async function getEffectiveServerCatalogPricing(): Promise<{
  menuPrices: Record<string, { name: string; price: number; category: string; available: boolean }>;
  crustPrices: Record<string, { name: string; price: number; available: boolean }>;
}> {
  const { items, crusts } = await getFullCatalogFromDb();
  const menuPrices: Record<
    string,
    { name: string; price: number; category: string; available: boolean }
  > = {};
  for (const item of items) {
    menuPrices[item.id] = {
      name: item.name,
      price: item.price,
      category: item.category,
      available: item.available,
    };
  }

  const crustPrices: Record<string, { name: string; price: number; available: boolean }> = {};
  for (const c of crusts) {
    crustPrices[c.id] = {
      name: c.name,
      price: c.price,
      available: c.available,
    };
  }

  return { menuPrices, crustPrices };
}

export async function getEffectiveServerMenuPrices(): Promise<
  Record<string, { name: string; price: number; category: string; available: boolean }>
> {
  const { menuPrices } = await getEffectiveServerCatalogPricing();
  return menuPrices;
}

export async function getEffectiveServerCrustPrices(): Promise<
  Record<string, { name: string; price: number; available: boolean }>
> {
  const { crustPrices } = await getEffectiveServerCatalogPricing();
  return crustPrices;
}

export async function upsertMenuItemInDb(input: {
  id?: string;
  name: string;
  category: Category;
  ingredients: string;
  desc?: string;
  price: number;
  badge?: string | null;
  image: string;
  available: boolean;
  sort_order?: number;
}): Promise<CatalogMenuItem> {
  await ensureCatalogSeeded();
  const db = await getDb();
  const col = db.collection<MenuItemDoc>("menu_items");

  const now = new Date();
  const cleanPrice = Number(input.price.toFixed(2));
  const cleanBadge = input.badge && input.badge.trim() ? input.badge.trim() : null;
  const cleanDesc = input.desc?.trim() || input.ingredients.trim() || input.name;

  if (input.id) {
    const existing = await col.findOne({ _id: input.id });
    if (!existing) throw new Error("Item do cardápio não encontrado.");

    const nextSort = input.sort_order !== undefined ? input.sort_order : existing.sort_order;
    const storedImage = normalizeImageForStorage(input.image || existing.image);

    await col.updateOne(
      { _id: input.id },
      {
        $set: {
          name: input.name,
          category: input.category,
          ingredients: input.ingredients,
          desc: cleanDesc,
          price: cleanPrice,
          badge: cleanBadge,
          image: storedImage,
          available: input.available,
          sort_order: nextSort,
          updated_at: now,
        },
      }
    );

    return {
      id: input.id,
      name: input.name,
      desc: cleanDesc,
      ingredients: input.ingredients,
      price: cleanPrice,
      image: resolveMenuImage(storedImage, input.id),
      badge: cleanBadge || undefined,
      category: input.category,
      available: input.available,
      sort_order: nextSort,
    };
  }

  let candidateId = slugifyCatalogId(input.name);
  const conflict = await col.findOne({ _id: candidateId });
  if (conflict) {
    candidateId = `${candidateId}-${crypto.randomUUID().slice(0, 4)}`;
  }

  const count = await col.estimatedDocumentCount();
  const sortOrder = input.sort_order !== undefined ? input.sort_order : count + 1;
  const storedImage = normalizeImageForStorage(input.image);

  await col.insertOne({
    _id: candidateId,
    name: input.name,
    desc: cleanDesc,
    ingredients: input.ingredients,
    price: cleanPrice,
    image: storedImage,
    badge: cleanBadge,
    category: input.category,
    available: input.available,
    sort_order: sortOrder,
    created_at: now,
    updated_at: now,
  });

  return {
    id: candidateId,
    name: input.name,
    desc: cleanDesc,
    ingredients: input.ingredients,
    price: cleanPrice,
    image: resolveMenuImage(storedImage, candidateId),
    badge: cleanBadge || undefined,
    category: input.category,
    available: input.available,
    sort_order: sortOrder,
  };
}

export async function deleteMenuItemFromDb(id: string): Promise<void> {
  await ensureCatalogSeeded();
  const db = await getDb();
  const res = await db.collection<MenuItemDoc>("menu_items").deleteOne({ _id: id });
  if (res.deletedCount === 0) throw new Error("Item não encontrado.");
}

export async function upsertMenuOverrideInDb(input: {
  id: string;
  isAdmin: boolean;
  price?: number;
  available?: boolean;
  badge?: string | null;
}): Promise<void> {
  await ensureCatalogSeeded();
  const db = await getDb();
  const col = db.collection<MenuItemDoc>("menu_items");

  const updateFields: Record<string, unknown> = {
    updated_at: new Date(),
  };
  if (input.isAdmin && input.price !== undefined) updateFields.price = Number(input.price.toFixed(2));
  if (input.available !== undefined) updateFields.available = input.available;
  if (input.isAdmin && input.badge !== undefined) updateFields.badge = input.badge;

  const res = await col.updateOne({ _id: input.id }, { $set: updateFields });
  if (res.matchedCount === 0) {
    throw new Error("Item do cardápio não encontrado.");
  }
}

export async function upsertCrustOptionInDb(input: {
  id?: string;
  name: string;
  price: number;
  available: boolean;
  sort_order?: number;
}): Promise<CatalogCrustOption> {
  await ensureCatalogSeeded();
  const db = await getDb();
  const col = db.collection<CrustOptionDoc>("crust_options");

  const now = new Date();
  const cleanPrice = input.id === "nenhuma" ? 0 : Number(input.price.toFixed(2));
  const cleanAvailable = input.id === "nenhuma" ? true : input.available;

  if (input.id) {
    const existing = await col.findOne({ _id: input.id });
    if (!existing) throw new Error("Borda não encontrada.");
    const nextSort = input.sort_order !== undefined ? input.sort_order : existing.sort_order;
    await col.updateOne(
      { _id: input.id },
      {
        $set: {
          name: input.name,
          price: cleanPrice,
          available: cleanAvailable,
          sort_order: nextSort,
          updated_at: now,
        },
      }
    );
    return {
      id: input.id,
      name: input.name,
      price: cleanPrice,
      available: cleanAvailable,
      sort_order: nextSort,
    };
  }

  let candidateId = slugifyCatalogId(input.name);
  const conflict = await col.findOne({ _id: candidateId });
  if (conflict) {
    candidateId = `${candidateId}-${crypto.randomUUID().slice(0, 4)}`;
  }
  const count = await col.estimatedDocumentCount();
  const sortOrder = input.sort_order !== undefined ? input.sort_order : count + 1;

  await col.insertOne({
    _id: candidateId,
    name: input.name,
    price: cleanPrice,
    available: cleanAvailable,
    sort_order: sortOrder,
    created_at: now,
    updated_at: now,
  });

  return {
    id: candidateId,
    name: input.name,
    price: cleanPrice,
    available: cleanAvailable,
    sort_order: sortOrder,
  };
}

export async function toggleCrustAvailabilityInDb(id: string, available: boolean): Promise<void> {
  if (id === "nenhuma" && !available) {
    throw new Error('A opção "Sem Borda Recheada" não pode ser desativada.');
  }
  await ensureCatalogSeeded();
  const db = await getDb();
  const res = await db
    .collection<CrustOptionDoc>("crust_options")
    .updateOne({ _id: id }, { $set: { available, updated_at: new Date() } });
  if (res.matchedCount === 0) throw new Error("Borda não encontrada.");
}

export async function deleteCrustOptionFromDb(id: string): Promise<void> {
  if (id === "nenhuma") {
    throw new Error('A opção padrão "Sem Borda Recheada" não pode ser excluída.');
  }
  await ensureCatalogSeeded();
  const db = await getDb();
  const res = await db.collection<CrustOptionDoc>("crust_options").deleteOne({ _id: id });
  if (res.deletedCount === 0) throw new Error("Borda não encontrada.");
}
