/**
 * Tipagens canônicas de pedidos (Orders) e status para todo o sistema.
 */

export type OrderStatus = "novo" | "preparando" | "saiu" | "entregue" | "cancelado";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "on_delivery";

export type DeliveryMode = "delivery" | "pickup" | "dine_in";

export interface OrderItemRow {
  id: string;
  pizza_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface OrderRow {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  delivery_mode?: DeliveryMode;
  payment_method: string;
  troco?: number | null;
  subtotal: number;
  discount: number;
  promotion_id?: string | null;
  promotion_title?: string | null;
  total: number;
  delivery_fee?: number | null;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  payment_status: PaymentStatus;
  payment_gateway?: string | null;
  gateway_payment_id?: string | null;
  payment_details?: Record<string, unknown> | null;
  order_items: OrderItemRow[];
  notes?: string | null;
}
