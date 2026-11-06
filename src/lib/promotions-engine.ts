import { Promotion, AppliedPromotionResult } from "./promotions.types";

export interface MenuItemRef {
  id: string;
  name: string;
  price: number;
  category: string;
}

export interface GenericCartLine {
  item: MenuItemRef;
  qty: number;
  subtotal: number;
}

export function evaluateCartPromotions(
  cartOrLines: Record<string, number> | GenericCartLine[],
  menuById: Record<string, MenuItemRef>,
  promotions: Promotion[]
): AppliedPromotionResult | null {
  if (!promotions || promotions.length === 0) return null;

  const now = new Date();
  // Active promotions within optional date range
  const activePromos = promotions.filter((p) => {
    if (!p.active) return false;
    if (p.start_date) {
      const start = new Date(`${p.start_date}T00:00:00`);
      if (!isNaN(start.getTime()) && now < start) return false;
    }
    if (p.end_date) {
      const end = new Date(`${p.end_date}T23:59:59`);
      if (!isNaN(end.getTime()) && now > end) return false;
    }
    return true;
  });
  if (activePromos.length === 0) return null;

  // Calculate cart line items
  let cartLines: GenericCartLine[] = [];
  if (Array.isArray(cartOrLines)) {
    cartLines = cartOrLines.filter((l) => l.qty > 0 && l.subtotal > 0);
  } else {
    cartLines = Object.entries(cartOrLines)
      .map(([id, qty]) => {
        const item = menuById[id];
        if (!item || qty <= 0) return null;
        return { item, qty, subtotal: item.price * qty };
      })
      .filter((l): l is GenericCartLine => l !== null);
  }

  const cartSubtotal = cartLines.reduce((acc, l) => acc + l.subtotal, 0);
  const totalCartQty = cartLines.reduce((acc, l) => acc + l.qty, 0);

  if (cartSubtotal <= 0 || totalCartQty <= 0) return null;

  const validResults: AppliedPromotionResult[] = [];

  for (const promo of activePromos) {
    let isTriggered = false;
    let triggerSubtotal = 0;

    if (promo.trigger_type === "min_total" || promo.trigger_type === "all") {
      const minTotal = promo.trigger_min_total || 0;
      const minQty = promo.trigger_min_qty || 1;
      if (cartSubtotal >= minTotal && totalCartQty >= minQty) {
        isTriggered = true;
        triggerSubtotal = cartSubtotal;
      }
    } else if (promo.trigger_type === "category" && promo.trigger_category) {
      const cat = promo.trigger_category;
      const matchingLines = cartLines.filter(
        (l) =>
          cat === "todas" ||
          l.item.category === cat ||
          (cat === "salgadas" &&
            (l.item.category === "tradicionais" || l.item.category === "especiais"))
      );
      const catQty = matchingLines.reduce((sum, l) => sum + l.qty, 0);
      const catSubtotal = matchingLines.reduce((sum, l) => sum + l.subtotal, 0);
      const requiredQty = promo.trigger_min_qty || 1;
      const requiredTotal = promo.trigger_min_total || 0;

      if (catQty >= requiredQty && catSubtotal >= requiredTotal) {
        isTriggered = true;
        triggerSubtotal = catSubtotal;
      }
    } else if (promo.trigger_type === "specific_items" && Array.isArray(promo.trigger_item_ids)) {
      const allowedIds = new Set(promo.trigger_item_ids);
      const matchingLines = cartLines.filter((l) => allowedIds.has(l.item.id));
      const specQty = matchingLines.reduce((sum, l) => sum + l.qty, 0);
      const specSubtotal = matchingLines.reduce((sum, l) => sum + l.subtotal, 0);
      const requiredQty = promo.trigger_min_qty || 1;
      const requiredTotal = promo.trigger_min_total || 0;

      if (specQty >= requiredQty && specSubtotal >= requiredTotal) {
        isTriggered = true;
        triggerSubtotal = specSubtotal;
      }
    }

    if (!isTriggered) continue;

    let discountAmount = 0;
    let rewardItem: AppliedPromotionResult["rewardItem"] = undefined;
    let reason = "";

    if (promo.type === "PERCENTAGE_DISCOUNT") {
      const pct = (promo.discount_value || 0) / 100;
      discountAmount = triggerSubtotal * pct;
      reason = `${promo.discount_value}% de desconto aplicado!`;
    } else if (promo.type === "FIXED_DISCOUNT") {
      discountAmount = Math.min(cartSubtotal, promo.discount_value || 0);
      reason = `Desconto de R$ ${(promo.discount_value || 0).toFixed(2).replace(".", ",")} aplicado!`;
    } else if (promo.type === "BUY_X_GET_Y") {
      const rewardPizza = menuById[promo.reward_item_id || ""];
      if (rewardPizza) {
        const rewardDiscPct =
          promo.reward_discount_percent !== undefined ? promo.reward_discount_percent : 100;
        const unitPrice = Number(
          Math.max(0, rewardPizza.price * (1 - rewardDiscPct / 100)).toFixed(2)
        );
        const isGift = unitPrice === 0;
        rewardItem = {
          pizza_id: rewardPizza.id,
          pizza_name: rewardPizza.name,
          original_price: rewardPizza.price,
          unit_price: unitPrice,
          quantity: 1,
          is_gift: isGift,
        };
        reason = isGift
          ? `Brinde adicionado: 1x ${rewardPizza.name}!`
          : `Item promocional: 1x ${rewardPizza.name} com ${rewardDiscPct}% OFF!`;
      }
    }

    if (discountAmount > 0 || rewardItem) {
      validResults.push({
        promotion: promo,
        discountAmount: Number(discountAmount.toFixed(2)),
        rewardItem,
        reason,
      });
    }
  }

  if (validResults.length === 0) return null;

  // Prioritize promotion that offers the greatest financial benefit to the customer
  validResults.sort((a, b) => {
    const valA =
      a.discountAmount +
      (a.rewardItem ? a.rewardItem.original_price - a.rewardItem.unit_price : 0);
    const valB =
      b.discountAmount +
      (b.rewardItem ? b.rewardItem.original_price - b.rewardItem.unit_price : 0);
    return valB - valA;
  });

  return validResults[0];
}
