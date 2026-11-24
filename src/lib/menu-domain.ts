import { Category, CrustOption, MENU_BY_ID, MENU_IMAGES, Pizza } from "@/data/catalog";

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

type MenuImageKey = keyof typeof MENU_IMAGES;

const FILENAME_TO_KEY: Array<[string, MenuImageKey]> = [
  ["margherita", "mussarela"],
  ["pepperoni", "pepperoni"],
  ["quatro-queijos", "queijos"],
  ["calabresa", "calabresa"],
  ["portuguesa", "portuguesa"],
  ["frango-catupiry", "frango"],
  ["vegetariana", "vegetariana"],
  ["romeu-julieta", "romeu"],
  ["chocolate-morango", "chocolate"],
  ["coca-2l", "coca"],
  ["guarana-2l", "guarana"],
  ["agua", "agua"],
];

/**
 * Converts a resolved Vite asset path or local disk path into a stable logical preset key
 * for MongoDB persistence (while preserving external http(s) URLs untouched).
 */
export function normalizeImageForStorage(rawImage?: string | null): string {
  const val = (rawImage || "").trim();
  if (!val) return "calabresa";
  if (val in MENU_IMAGES) return val;
  if (/^https?:\/\//i.test(val) || val.startsWith("/api/media/")) return val;

  // Match against current build's resolved MENU_IMAGES values
  for (const [key, resolved] of Object.entries(MENU_IMAGES)) {
    if (resolved === val) return key;
  }

  // Match by filename stem (handles local disk paths or hashed /assets/...-HASH.jpg)
  const lower = val.toLowerCase();
  for (const [stem, key] of FILENAME_TO_KEY) {
    if (lower.includes(stem)) return key;
  }

  return val;
}

/**
 * Resolves a stored image value (logical key, external URL, or legacy/disk path)
 * into a browser-loadable URL for the current Vite build.
 */
export function resolveMenuImage(rawImage?: string | null, itemId?: string): string {
  const val = (rawImage || "").trim();
  if (/^https?:\/\//i.test(val) || val.startsWith("/api/media/")) return val;

  if (val && val in MENU_IMAGES) {
    return MENU_IMAGES[val as MenuImageKey];
  }

  if (val) {
    const lower = val.toLowerCase();
    for (const [stem, key] of FILENAME_TO_KEY) {
      if (lower.includes(stem)) return MENU_IMAGES[key];
    }
    // Allow valid app-relative public paths (never raw OS filesystem paths)
    if (val.startsWith("/") && !val.startsWith("/home/") && !val.startsWith("/app/")) {
      return val;
    }
  }

  if (itemId && MENU_BY_ID[itemId]?.image) {
    return MENU_BY_ID[itemId].image;
  }

  return MENU_IMAGES.calabresa;
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
      image: normalizeImageForStorage(item.image),
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
