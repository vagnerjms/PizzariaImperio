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
}
