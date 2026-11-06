import { getCollection } from "./db";
import { MENU, SERVER_MENU_PRICES } from "@/data/catalog";

export interface MenuOverrideDoc {
  _id: string; // pizza id
  price?: number;
  available?: boolean;
  badge?: string | null;
  updated_at: Date;
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

export async function getEffectiveServerMenuPrices(): Promise<
  Record<string, { name: string; price: number; category: string; available: boolean }>
> {
  const overrides = await getMenuOverridesFromDb();
  const result: Record<string, { name: string; price: number; category: string; available: boolean }> = {};

  for (const item of MENU) {
    const ov = overrides[item.id];
    result[item.id] = {
      name: item.name,
      price: typeof ov?.price === "number" && ov.price >= 0 ? ov.price : item.price,
      category: item.category,
      available: ov?.available !== undefined ? ov.available : true,
    };
  }
  return result;
}

