import {
  Promotion,
  AppliedPromotionResult,
  CouponValidationResult,
  normalizeCouponCode,
  PROMO_WEEKDAYS,
} from "./promotions.types";

export interface MenuItemRef {
  id: string;
  name: string;
  price: number;
  category: string;
  available?: boolean;
  categories?: string[];
  flavorIds?: string[];
}

export interface GenericCartLine {
  item: MenuItemRef;
  qty: number;
  subtotal: number;
}

export function getSaoPauloYMD(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

const WEEKDAY_EN_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function getSaoPauloDayOfWeek(date: Date = new Date()): number {
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
  }).format(date);
  return WEEKDAY_EN_MAP[short] ?? date.getDay();
}

export function isPromotionExhausted(promo: Promotion): boolean {
  if (typeof promo.max_uses !== "number" || promo.max_uses <= 0) return false;
  const used = typeof promo.current_uses === "number" ? promo.current_uses : 0;
  return used >= promo.max_uses;
}

export function getPromotionAvailabilityError(
  promo: Promotion,
  now: Date = new Date()
): string | null {
  if (!promo.active) return "Este cupom não está ativo no momento.";

  const todayYMD = getSaoPauloYMD(now);
  if (promo.start_date && promo.start_date.slice(0, 10) > todayYMD) {
    return "Este cupom ainda não entrou em vigência.";
  }
  if (promo.end_date && promo.end_date.slice(0, 10) < todayYMD) {
    return "Este cupom está expirado.";
  }

  if (Array.isArray(promo.days_of_week) && promo.days_of_week.length > 0) {
    const todayDow = getSaoPauloDayOfWeek(now);
    if (!promo.days_of_week.includes(todayDow)) {
      const allowedNames = promo.days_of_week
        .map((d) => PROMO_WEEKDAYS.find((w) => w.day === d)?.short)
        .filter(Boolean)
        .join(", ");
      return `Cupom válido apenas em: ${allowedNames}.`;
    }
  }

  if (isPromotionExhausted(promo)) {
    return "Este cupom atingiu o limite máximo de usos.";
  }

  return null;
}

function normalizeCartLines(
  cartOrLines: Record<string, number> | GenericCartLine[],
  menuById: Record<string, MenuItemRef>
): GenericCartLine[] {
  if (Array.isArray(cartOrLines)) {
    return cartOrLines.filter((l) => l.qty > 0 && l.subtotal > 0);
  }
  return Object.entries(cartOrLines)
    .map(([id, qty]) => {
      const item = menuById[id];
      if (!item || qty <= 0) return null;
      return { item, qty, subtotal: item.price * qty };
    })
    .filter((l): l is GenericCartLine => l !== null);
}

function evaluateSinglePromotion(
  promo: Promotion,
  cartLines: GenericCartLine[],
  menuById: Record<string, MenuItemRef>,
  cartSubtotal: number,
  totalCartQty: number,
  appliedViaCoupon: boolean
): { result: AppliedPromotionResult | null; unmetReason?: string } {
  let isTriggered = false;
  let triggerSubtotal = 0;
  let unmetReason: string | undefined;

  if (promo.trigger_type === "min_total" || promo.trigger_type === "all") {
    const minTotal = promo.trigger_min_total || 0;
    const minQty = promo.trigger_min_qty || 1;
    if (cartSubtotal >= minTotal && totalCartQty >= minQty) {
      isTriggered = true;
      triggerSubtotal = cartSubtotal;
    } else if (cartSubtotal < minTotal) {
      unmetReason = `Pedido mínimo de R$ ${minTotal.toFixed(2).replace(".", ",")} para usar este cupom.`;
    } else {
      unmetReason = `Adicione ao menos ${minQty} itens para usar este cupom.`;
    }
  } else if (promo.trigger_type === "category" && promo.trigger_category) {
    const cat = promo.trigger_category;
    const matchingLines = cartLines.filter((l) => {
      if (cat === "todas") return true;
      const itemCats =
        l.item.categories && l.item.categories.length > 0
          ? l.item.categories
          : [l.item.category];
      return itemCats.some(
        (c) =>
          c === cat ||
          (cat === "salgadas" && (c === "tradicionais" || c === "especiais"))
      );
    });
    const catQty = matchingLines.reduce((sum, l) => sum + l.qty, 0);
    const catSubtotal = matchingLines.reduce((sum, l) => sum + l.subtotal, 0);
    const requiredQty = promo.trigger_min_qty || 1;
    const requiredTotal = promo.trigger_min_total || 0;

    if (catQty >= requiredQty && catSubtotal >= requiredTotal) {
      isTriggered = true;
      triggerSubtotal = catSubtotal;
    } else {
      unmetReason = `Requer ao menos ${requiredQty} item(ns) da categoria "${cat}"${
        requiredTotal > 0 ? ` (mín. R$ ${requiredTotal.toFixed(2).replace(".", ",")})` : ""
      }.`;
    }
  } else if (promo.trigger_type === "specific_items" && Array.isArray(promo.trigger_item_ids)) {
    const allowedIds = new Set(promo.trigger_item_ids);
    const matchingLines = cartLines.filter((l) => {
      const ids =
        l.item.flavorIds && l.item.flavorIds.length > 0 ? l.item.flavorIds : [l.item.id];
      return ids.some((id) => allowedIds.has(id));
    });
    const specQty = matchingLines.reduce((sum, l) => sum + l.qty, 0);
    const specSubtotal = matchingLines.reduce((sum, l) => sum + l.subtotal, 0);
    const requiredQty = promo.trigger_min_qty || 1;
    const requiredTotal = promo.trigger_min_total || 0;

    if (specQty >= requiredQty && specSubtotal >= requiredTotal) {
      isTriggered = true;
      triggerSubtotal = specSubtotal;
    } else {
      unmetReason = "Este cupom se aplica apenas a itens específicos selecionados.";
    }
  }

  if (!isTriggered) return { result: null, unmetReason };

  let discountAmount = 0;
  let rewardItem: AppliedPromotionResult["rewardItem"] = undefined;
  let reason = "";

  if (promo.type === "PERCENTAGE_DISCOUNT") {
    const pct = Math.min(100, Math.max(0, promo.discount_value || 0)) / 100;
    discountAmount = triggerSubtotal * pct;
    reason = appliedViaCoupon
      ? `Cupom ${normalizeCouponCode(promo.coupon_code)} aplicado (${promo.discount_value}% OFF)!`
      : `${promo.discount_value}% de desconto aplicado!`;
  } else if (promo.type === "FIXED_DISCOUNT") {
    discountAmount = Math.min(cartSubtotal, Math.max(0, promo.discount_value || 0));
    reason = appliedViaCoupon
      ? `Cupom ${normalizeCouponCode(promo.coupon_code)} aplicado (R$ ${(promo.discount_value || 0).toFixed(2).replace(".", ",")} OFF)!`
      : `Desconto de R$ ${(promo.discount_value || 0).toFixed(2).replace(".", ",")} aplicado!`;
  } else if (promo.type === "BUY_X_GET_Y") {
    const rewardPizza = menuById[promo.reward_item_id || ""];
    if (rewardPizza && rewardPizza.available !== false) {
      const rewardDiscPct = Math.min(
        100,
        Math.max(
          0,
          promo.reward_discount_percent !== undefined ? promo.reward_discount_percent : 100
        )
      );
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
    } else {
      return {
        result: null,
        unmetReason: "O item brinde desta promoção está temporariamente esgotado.",
      };
    }
  }

  if (discountAmount > 0 || rewardItem) {
    return {
      result: {
        promotion: promo,
        discountAmount: Number(discountAmount.toFixed(2)),
        rewardItem,
        reason,
        appliedViaCoupon,
      },
    };
  }

  return { result: null, unmetReason: "Condições da promoção não atingidas." };
}

export function validateCouponForCart(
  rawCouponCode: string,
  cartOrLines: Record<string, number> | GenericCartLine[],
  menuById: Record<string, MenuItemRef>,
  promotions: Promotion[],
  now: Date = new Date()
): CouponValidationResult {
  const code = normalizeCouponCode(rawCouponCode);
  if (!code) {
    return { valid: false, code: "", message: "Digite um código de cupom.", result: null };
  }

  const matched = promotions.find((p) => normalizeCouponCode(p.coupon_code) === code);
  if (!matched) {
    return {
      valid: false,
      code,
      message: `Cupom "${code}" não encontrado ou expirado.`,
      result: null,
    };
  }

  const availabilityError = getPromotionAvailabilityError(matched, now);
  if (availabilityError) {
    return { valid: false, code, message: availabilityError, result: null };
  }

  const cartLines = normalizeCartLines(cartOrLines, menuById);
  const cartSubtotal = cartLines.reduce((acc, l) => acc + l.subtotal, 0);
  const totalCartQty = cartLines.reduce((acc, l) => acc + l.qty, 0);

  if (cartSubtotal <= 0 || totalCartQty <= 0) {
    return {
      valid: false,
      code,
      message: "Adicione itens ao carrinho antes de aplicar o cupom.",
      result: null,
    };
  }

  const { result, unmetReason } = evaluateSinglePromotion(
    matched,
    cartLines,
    menuById,
    cartSubtotal,
    totalCartQty,
    true
  );

  if (!result) {
    return {
      valid: false,
      code,
      message: unmetReason || "O carrinho ainda não atende às condições deste cupom.",
      result: null,
    };
  }

  return {
    valid: true,
    code,
    message: result.reason,
    result,
  };
}

export function evaluateCartPromotions(
  cartOrLines: Record<string, number> | GenericCartLine[],
  menuById: Record<string, MenuItemRef>,
  promotions: Promotion[],
  now: Date = new Date(),
  couponCode?: string | null
): AppliedPromotionResult | null {
  if (!promotions || promotions.length === 0) return null;

  const cartLines = normalizeCartLines(cartOrLines, menuById);
  const cartSubtotal = cartLines.reduce((acc, l) => acc + l.subtotal, 0);
  const totalCartQty = cartLines.reduce((acc, l) => acc + l.qty, 0);

  if (cartSubtotal <= 0 || totalCartQty <= 0) return null;

  // Non-stacking rule: if customer provided a valid qualifying coupon, apply it!
  const normalizedCode = normalizeCouponCode(couponCode);
  if (normalizedCode) {
    const couponEval = validateCouponForCart(
      normalizedCode,
      cartLines,
      menuById,
      promotions,
      now
    );
    if (couponEval.valid && couponEval.result) {
      return couponEval.result;
    }
  }

  // Otherwise evaluate automatic promotions (those without a coupon_code)
  const validResults: AppliedPromotionResult[] = [];
  for (const promo of promotions) {
    if (normalizeCouponCode(promo.coupon_code)) continue; // coupon-only promos require code
    if (getPromotionAvailabilityError(promo, now) !== null) continue;

    const { result } = evaluateSinglePromotion(
      promo,
      cartLines,
      menuById,
      cartSubtotal,
      totalCartQty,
      false
    );
    if (result) validResults.push(result);
  }

  if (validResults.length === 0) return null;

  // Prioritize automatic promotion offering the greatest financial benefit
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
