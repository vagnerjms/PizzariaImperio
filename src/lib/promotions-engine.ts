import { Promotion, AppliedPromotionResult } from "./promotions.types";

export interface MenuItemRef {
  id: string;
  name: string;
  price: number;
  category: string;
}

export function evaluateCartPromotions(
  cart: Record<string, number>,
  menuById: Record<string, MenuItemRef>,
  promotions: Promotion[]
): AppliedPromotionResult | null {
  if (!promotions || promotions.length === 0) return null;

  // Active promotions only
  const activePromos = promotions.filter((p) => p.active);
  if (activePromos.length === 0) return null;

  // Calculate cart line items
  const cartLines = Object.entries(cart)
    .map(([id, qty]) => {
      const item = menuById[id];
      if (!item || qty <= 0) return null;
      return { item, qty, subtotal: item.price * qty };
    })
    .filter((l): l is { item: MenuItemRef; qty: number; subtotal: number } => l !== null);

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
    } else if (promo.trigger_type === "specific_items" && promo.trigger_item_ids && promo.trigger_item_ids.length > 0) {
      const ids = promo.trigger_item_ids;
      const matchingLines = cartLines.filter((l) => ids.includes(l.item.id));
      const itemsQty = matchingLines.reduce((sum, l) => sum + l.qty, 0);
      const itemsSubtotal = matchingLines.reduce((sum, l) => sum + l.subtotal, 0);
      const requiredQty = promo.trigger_min_qty || 1;

      if (itemsQty >= requiredQty) {
        isTriggered = true;
        triggerCount = itemsQty;
        triggerSubtotal = itemsSubtotal;
      }
    }

    if (!isTriggered) continue;

    // Calculate reward/discount based on promo type
    if (promo.type === "PERCENTAGE_DISCOUNT") {
      const pct = Math.min(100, Math.max(1, promo.discount_value || 10));
      const discount = Number(((cartSubtotal * pct) / 100).toFixed(2));
      validResults.push({
        promotion: promo,
        discountAmount: discount,
        reason: `${pct}% de desconto aplicado no total do pedido`,
      });
    } else if (promo.type === "FIXED_DISCOUNT") {
      const fixedVal = Math.min(cartSubtotal, Math.max(1, promo.discount_value || 10));
      validResults.push({
        promotion: promo,
        discountAmount: fixedVal,
        reason: `Desconto fixo de R$ ${fixedVal.toFixed(2).replace('.', ',')} aplicado`,
      });
    } else if (promo.type === "BUY_X_GET_Y" && promo.reward_item_id) {
      const rewardItem = menuById[promo.reward_item_id];
      if (rewardItem) {
        const discPercent = promo.reward_discount_percent !== undefined ? promo.reward_discount_percent : 100;
        const discountVal = Number(((rewardItem.price * discPercent) / 100).toFixed(2));
        const finalUnitPrice = Math.max(0, rewardItem.price - discountVal);

        validResults.push({
          promotion: promo,
          discountAmount: discountVal,
          rewardItem: {
            pizza_id: rewardItem.id,
            pizza_name: rewardItem.name,
            unit_price: finalUnitPrice,
            original_price: rewardItem.price,
            quantity: 1,
            is_gift: discPercent === 100,
          },
          reason: discPercent === 100 
            ? `Você ganhou 1x ${rewardItem.name} de brinde!`
            : `Você ganhou ${discPercent}% de desconto em 1x ${rewardItem.name}!`,
        });
      }
    }
  }

  if (validResults.length === 0) return null;

  // Pick promotion with the highest discount/value for customer benefit
  validResults.sort((a, b) => b.discountAmount - a.discountAmount);
  return validResults[0];
}
