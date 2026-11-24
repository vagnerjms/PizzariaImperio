import { Category, CrustOption, Pizza } from "@/data/catalog";

export interface CatalogMenuItem extends Pizza {
  available: boolean;
  sort_order: number;
}

export interface CatalogCrustOption extends CrustOption {
  available: boolean;
  sort_order: number;
}

export interface PublicCatalogResponse {
  items: CatalogMenuItem[];
  crusts: CatalogCrustOption[];
}

export interface LegacyMenuOverride {
  price?: number;
  available?: boolean;
  badge?: string | null;
}

export function slugifyCatalogId(name: string): string {
  const base = (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || `item-${Date.now()}`;
}

/**
 * Pure migration helper: merges static catalog.ts items with any legacy
 * `menu_overrides` documents so zero price edits, badges, or out-of-stock flags are lost.
 */
export function buildInitialMenuSeed(
  staticMenu: Pizza[],
  legacyOverrides: Record<string, LegacyMenuOverride> = {},
): CatalogMenuItem[] {
  return staticMenu.map((item, idx) => {
    const ov = legacyOverrides[item.id];
    const price =
      typeof ov?.price === "number" && Number.isFinite(ov.price) && ov.price >= 0
        ? Number(ov.price.toFixed(2))
        : item.price;
    const available = ov?.available !== undefined ? ov.available : item.available !== false;
    const badge =
      ov?.badge !== undefined ? (ov.badge ? ov.badge : undefined) : item.badge || undefined;

    return {
      id: item.id,
      name: item.name,
      desc: item.desc || item.ingredients || item.name,
      ingredients: item.ingredients || item.desc || "",
      price,
      image: item.image,
      badge,
      category: item.category as Category,
      available,
      sort_order: idx,
    };
  });
}

export function buildInitialCrustSeed(staticCrusts: CrustOption[]): CatalogCrustOption[] {
  return staticCrusts.map((crust, idx) => ({
    id: crust.id,
    name: crust.name,
    price: Number(Math.max(0, crust.price).toFixed(2)),
    available: true,
    sort_order: idx,
  }));
}
