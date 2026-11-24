import { Promotion } from "./promotions.types";
import { evaluateCartPromotions, GenericCartLine, MenuItemRef } from "./promotions-engine";

export interface EffectiveMenuPriceEntry {
  name: string;
  price: number;
  category: string;
  available: boolean;
}

export interface OrderPricingInputItem {
  pizza_id: string;
  flavor2_id?: string | null;
  crust_id?: string | null;
  pizza_name: string;
  quantity: number;
  unit_price: number;
  is_reward_item?: boolean;
}

export interface VerifiedOrderItem {
  pizza_id: string;
  flavor2_id?: string | null;
  crust_id?: string | null;
  base_pizza_name: string;
  pizza_name: string;
  quantity: number;
  unit_price: number;
  is_reward?: boolean;
}

export interface VerifiedOrderPricingResult {
  validatedItems: VerifiedOrderItem[];
  subtotal: number;
  verifiedDiscount: number;
  verifiedDeliveryFee: number;
  total: number;
  promotionId: string | null;
  promotionTitle: string | null;
}

const LEGACY_REWARD_SUFFIX_RE = /\((Brinde|Promoção)\)\s*$/;

function isClientClaimedRewardItem(item: OrderPricingInputItem): boolean {
  if (item.is_reward_item === true) return true;
  return (
    item.quantity === 1 &&
    !item.flavor2_id &&
    (!item.crust_id || item.crust_id === "nenhuma") &&
    LEGACY_REWARD_SUFFIX_RE.test(item.pizza_name)
  );
}

/**
 * Pure server-side order pricing & anti-tampering calculator (OWASP A04:2021).
 * Never trusts client-supplied unit prices, discounts, promotion_id, or delivery fees.
 */
export function calculateVerifiedOrderPricing(params: {
  items: OrderPricingInputItem[];
  deliveryMode: "delivery" | "pickup" | "dine_in";
  officialDeliveryFee: number;
  effectiveMenuPrices: Record<string, EffectiveMenuPriceEntry>;
  crustPrices: Record<string, { name: string; price: number }>;
  activePromotions: Promotion[];
  now?: Date;
}): VerifiedOrderPricingResult {
  const {
    items,
    deliveryMode,
    officialDeliveryFee,
    effectiveMenuPrices,
    crustPrices,
    activePromotions,
    now,
  } = params;

  const purchasedInputs = items.filter((item) => !isClientClaimedRewardItem(item));
  if (purchasedInputs.length === 0) {
    throw new Error("O pedido deve conter ao menos um item válido do cardápio.");
  }

  const validatedItems: VerifiedOrderItem[] = [];
  const promoCartLines: GenericCartLine[] = [];

  for (const item of purchasedInputs) {
    const catalogItem1 = effectiveMenuPrices[item.pizza_id];
    if (!catalogItem1) {
      throw new Error(`Item inválido no pedido: "${item.pizza_id}".`);
    }
    if (catalogItem1.available === false) {
      throw new Error(`O item "${catalogItem1.name}" está temporariamente esgotado.`);
    }

    let catalogItem2: EffectiveMenuPriceEntry | null = null;
    if (item.flavor2_id) {
      catalogItem2 = effectiveMenuPrices[item.flavor2_id] || null;
      if (!catalogItem2) {
        throw new Error(`Segundo sabor inválido no pedido: "${item.flavor2_id}".`);
      }
      if (catalogItem2.available === false) {
        throw new Error(`O sabor "${catalogItem2.name}" está temporariamente esgotado.`);
      }
    }

    let crustPrice = 0;
    const normalizedCrustId = item.crust_id || "nenhuma";
    if (normalizedCrustId !== "nenhuma") {
      const crustItem = crustPrices[normalizedCrustId];
      if (!crustItem) {
        throw new Error(`Borda inválida no pedido: "${normalizedCrustId}".`);
      }
      crustPrice = crustItem.price;
    }

    const basePrice = catalogItem2
      ? Math.max(catalogItem1.price, catalogItem2.price)
      : catalogItem1.price;
    const officialUnitPrice = Number((basePrice + crustPrice).toFixed(2));
    const quantity = Math.max(1, Math.floor(item.quantity));
    const basePizzaName = catalogItem2
      ? `1/2 ${catalogItem1.name} + 1/2 ${catalogItem2.name}`
      : catalogItem1.name;

    validatedItems.push({
      pizza_id: item.pizza_id,
      flavor2_id: item.flavor2_id || null,
      crust_id: normalizedCrustId,
      base_pizza_name: basePizzaName,
      pizza_name: item.pizza_name,
      quantity,
      unit_price: officialUnitPrice,
      is_reward: false,
    });

    const categories = catalogItem2
      ? Array.from(new Set([catalogItem1.category, catalogItem2.category]))
      : [catalogItem1.category];
    const flavorIds = catalogItem2 ? [item.pizza_id, item.flavor2_id!] : [item.pizza_id];

    promoCartLines.push({
      item: {
        id: item.pizza_id,
        name: basePizzaName,
        price: officialUnitPrice,
        category: catalogItem1.category,
        categories,
        flavorIds,
        available: true,
      },
      qty: quantity,
      subtotal: Number((officialUnitPrice * quantity).toFixed(2)),
    });
  }

  // Build effective menu map for reward lookups inside promotions engine
  const menuForPromo: Record<string, MenuItemRef> = {};
  for (const [id, entry] of Object.entries(effectiveMenuPrices)) {
    menuForPromo[id] = {
      id,
      name: entry.name,
      price: entry.price,
      category: entry.category,
      available: entry.available,
    };
  }

  const evaluatedPromo = evaluateCartPromotions(
    promoCartLines,
    menuForPromo,
    activePromotions,
    now
  );

  // Append server-authorized BUY_X_GET_Y reward item if triggered
  if (evaluatedPromo?.rewardItem) {
    const reward = evaluatedPromo.rewardItem;
    validatedItems.push({
      pizza_id: reward.pizza_id,
      flavor2_id: null,
      crust_id: "nenhuma",
      base_pizza_name: reward.pizza_name,
      pizza_name: `${reward.pizza_name} (${reward.is_gift ? "Brinde" : "Promoção"})`,
      quantity: 1,
      unit_price: Number(reward.unit_price.toFixed(2)),
      is_reward: true,
    });
  }

  const subtotal = Number(
    validatedItems.reduce((acc, i) => acc + i.unit_price * i.quantity, 0).toFixed(2)
  );

  const verifiedDiscount = evaluatedPromo
    ? Number(Math.min(subtotal, Math.max(0, evaluatedPromo.discountAmount)).toFixed(2))
    : 0;

  const verifiedDeliveryFee =
    deliveryMode === "pickup" || deliveryMode === "dine_in"
      ? 0
      : Number(Math.max(0, officialDeliveryFee).toFixed(2));

  const total = Number(
    Math.max(0, subtotal - verifiedDiscount + verifiedDeliveryFee).toFixed(2)
  );

  return {
    validatedItems,
    subtotal,
    verifiedDiscount,
    verifiedDeliveryFee,
    total,
    promotionId: evaluatedPromo ? evaluatedPromo.promotion._id : null,
    promotionTitle: evaluatedPromo ? evaluatedPromo.promotion.title : null,
  };
}
