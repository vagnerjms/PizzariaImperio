export type PromotionType = "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "BUY_X_GET_Y";

export type TriggerType = "all" | "category" | "specific_items" | "min_total";

export interface Promotion {
  _id: string;
  title: string;
  description: string;
  badge_text?: string;
  type: PromotionType;

  // Direct discount values
  discount_value?: number; // % (e.g. 10) or R$ (e.g. 15.00)

  // Triggers
  trigger_type: TriggerType;
  trigger_category?: string; // "tradicionais", "especiais", "doces", "bebidas"
  trigger_item_ids?: string[];
  trigger_min_qty?: number;
  trigger_min_total?: number;

  // Rewards (for BUY_X_GET_Y)
  reward_item_id?: string;
  reward_item_name?: string;
  reward_discount_percent?: number; // 100% = Free, 50% = Half-price

  // Coupon, schedule & usage caps (Pacote 3)
  coupon_code?: string | null;
  days_of_week?: number[] | null; // 0=Dom .. 6=Sab
  max_uses?: number | null;
  current_uses?: number;

  // Status and validity
  active: boolean;
  start_date?: string | null;
  end_date?: string | null;

  created_at: string | Date;
  updated_at: string | Date;
}

export interface AppliedPromotionResult {
  promotion: Promotion;
  discountAmount: number;
  benefitValue?: number;
  rewardItem?: {
    pizza_id: string;
    pizza_name: string;
    unit_price: number;
    original_price: number;
    quantity: number;
    is_gift: boolean;
  };
  reason: string;
  appliedViaCoupon?: boolean;
}

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  message: string;
  result: AppliedPromotionResult | null;
}

export function normalizeCouponCode(code?: string | null): string {
  return (code || "").trim().toUpperCase().replace(/\s+/g, "");
}

export const PROMO_WEEKDAYS = [
  { day: 0, short: "Dom", label: "Domingo" },
  { day: 1, short: "Seg", label: "Segunda" },
  { day: 2, short: "Ter", label: "Terça" },
  { day: 3, short: "Qua", label: "Quarta" },
  { day: 4, short: "Qui", label: "Quinta" },
  { day: 5, short: "Sex", label: "Sexta" },
  { day: 6, short: "Sáb", label: "Sábado" },
] as const;

export const PROMO_CATEGORIES = [
  { id: "todas", label: "Qualquer Pizza / Produto" },
  { id: "salgadas", label: "Pizzas Salgadas (Tradicionais e Especiais)" },
  { id: "tradicionais", label: "Pizzas Tradicionais" },
  { id: "especiais", label: "Pizzas Especiais" },
  { id: "doces", label: "Pizzas Doces" },
  { id: "doces-especiais", label: "Pizzas Doces Especiais" },
  { id: "brotos", label: "Brotos" },
  { id: "bebidas", label: "Bebidas" },
  { id: "adicionais", label: "Adicionais" },
] as const;
