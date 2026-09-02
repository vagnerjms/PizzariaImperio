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

  // Active promotions only
  const activePromos = promotions.filter((p) => p.active);
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
    let triggerCount = 0;
    let triggerSubtotal = 0;

    if (promo.trigger_type === "min_total" || promo.trigger_type === "all") {
      const minTotal = promo.trigger_min_total || 0;
      const minQty = promo.trigger_min_qty || 1;
      if (cartSubtotal >= minTotal && totalCartQty >= minQty) {
        isTriggered = true;
        triggerCount = totalCartQty;
        triggerSubtotal = cartSubtotal;
      }
    } else if (promo.trigger_type === "category" && promo.trigger_category) {
      const cat = promo.trigger_category;
      const matchingLines = cartLines.filter(
        (l) => cat === "todas" || l.item.category === cat || (cat === "salgadas" && (l.item.category === "tradicionais" || l.item.category === "especiais"))
      );
      const catQty = matchingLines.reduce((sum, l) => sum + l.qty, 0);
      const catSubtotal = matchingLines.reduce((sum, l) => sum + l.subtotal, 0);
      const requiredQty = promo.trigger_min_qty || 1;
      const requiredTotal = promo.trigger_min_total || 0;

      if (catQty >= requiredQty && catSubtotal >= requiredTotal) {
        isTriggered = true;
        triggerCount = catQty;
        triggerSubtotal = catSubtotal;
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
      reason = `Desconto de R$ ${(promo.discount_value || 0).toFixed(2).replace('.', ',')} aplicado!`;
    } else if (promo.type === "BUY_X_GET_Y") {
      const rewardPizza = menuById[promo.reward_item_id || ""];
      if (rewardPizza) {
        rewardItem = {
          pizza_id: rewardPizza.id,
          pizza_name: rewardPizza.name,
          original_price: rewardPizza.price,
          unit_price: 0,
          is_gift: true,
        };
        reason = `Brinde adicionado: 1x ${rewardPizza.name}!`;
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
    const valA = a.discountAmount + (a.rewardItem?.original_price || 0);
    const valB = b.discountAmount + (b.rewardItem?.original_price || 0);
    return valB - valA;
  });

  return validResults[0];
}
