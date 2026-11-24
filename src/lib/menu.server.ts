import { getCollection, getDb } from "./db";
import { Category, CRUST_OPTIONS, MENU } from "@/data/catalog";
import {
  buildInitialCrustSeed,
  buildInitialMenuSeed,
  CatalogCrustOption,
  CatalogMenuItem,
  LegacyMenuOverride,
  PublicCatalogResponse,
  resolveMenuImage,
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

export async function getEffectiveServerMenuPrices(): Promise<
  Record<string, { name: string; price: number; category: string; available: boolean }>
> {
  const { items } = await getFullCatalogFromDb();
  const result: Record<
    string,
    { name: string; price: number; category: string; available: boolean }
  > = {};

  for (const item of items) {
    result[item.id] = {
      name: item.name,
      price: item.price,
      category: item.category,
      available: item.available,
    };
  }
  return result;
}

export async function getEffectiveServerCrustPrices(): Promise<
  Record<string, { name: string; price: number; available: boolean }>
> {
  const { crusts } = await getFullCatalogFromDb();
  const result: Record<string, { name: string; price: number; available: boolean }> = {};

  for (const c of crusts) {
    result[c.id] = {
      name: c.name,
      price: c.price,
      available: c.available,
    };
  }
  return result;
}
