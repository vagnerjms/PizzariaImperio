import { OrderRow } from "@/types/orders";
import { normalizePaymentBucket, roundMoney } from "./money";

export type CourierPayoutMode = "delivery_fee" | "fixed";

export interface CourierRow {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  payout_mode: CourierPayoutMode;
  fixed_fee: number;
  fee_share_percent: number;
  created_at: string;
  updated_at: string;
}

export interface CourierSettlementEntry {
  courierId: string;
  courierName: string;
  deliveriesCount: number;
  inTransitCount: number;
  deliveredCount: number;
  totalDeliveryFeesCollected: number;
  payoutDue: number;
  cashToReturn: number;
  cashOrdersCount: number;
  totalChangeCarried: number;
  avgDeliveryMinutes: number | null;
}

export type CourierOrderSample = Pick<
  OrderRow,
  | "delivery_mode"
  | "status"
  | "payment_method"
  | "payment_status"
  | "total"
  | "troco"
  | "delivery_fee"
  | "courier_id"
  | "courier_name"
  | "courier_payout"
  | "created_at"
  | "dispatched_at"
  | "delivered_at"
>;

export const UNASSIGNED_COURIER_ID = "__unassigned__";
export const UNASSIGNED_COURIER_NAME = "Sem motoboy / Entrega própria";

export function calculateOrderCourierPayout(
  deliveryFee: number,
  courier?: Pick<CourierRow, "payout_mode" | "fixed_fee" | "fee_share_percent"> | null,
): number {
  const safeFee = Math.max(0, Number(deliveryFee || 0));
  if (!courier) return roundMoney(safeFee);

  if (courier.payout_mode === "fixed") {
    return roundMoney(Math.max(0, Number(courier.fixed_fee || 0)));
  }

  const share = Math.min(100, Math.max(0, Number(courier.fee_share_percent ?? 100)));
  return roundMoney(safeFee * (share / 100));
}

export function calculateCourierSettlements(
  orders: CourierOrderSample[],
  couriers: Pick<CourierRow, "id" | "name" | "payout_mode" | "fixed_fee" | "fee_share_percent">[],
): CourierSettlementEntry[] {
  const courierMap = new Map(couriers.map((c) => [c.id, c]));

  const buckets = new Map<
    string,
    {
      courierId: string;
      courierName: string;
      deliveriesCount: number;
      inTransitCount: number;
      deliveredCount: number;
      totalDeliveryFeesCollected: number;
      payoutDue: number;
      cashToReturn: number;
      cashOrdersCount: number;
      totalChangeCarried: number;
      deliveryMinutesSum: number;
      deliveryMinutesCount: number;
    }
  >();

  for (const order of orders) {
    // Only delivery orders that have left the kitchen (saiu) or were delivered (entregue)
    const mode = order.delivery_mode || "delivery";
    if (mode !== "delivery") continue;
    if (order.status !== "saiu" && order.status !== "entregue") continue;

    // Ignore unpaid Pix just in case
    if (normalizePaymentBucket(order.payment_method) === "pix" && order.payment_status !== "paid") {
      continue;
    }

    const courierId = order.courier_id || UNASSIGNED_COURIER_ID;
    const matchedCourier = order.courier_id ? courierMap.get(order.courier_id) : undefined;
    const courierName = order.courier_name || matchedCourier?.name || UNASSIGNED_COURIER_NAME;

    let entry = buckets.get(courierId);
    if (!entry) {
      entry = {
        courierId,
        courierName,
        deliveriesCount: 0,
        inTransitCount: 0,
        deliveredCount: 0,
        totalDeliveryFeesCollected: 0,
        payoutDue: 0,
        cashToReturn: 0,
        cashOrdersCount: 0,
        totalChangeCarried: 0,
        deliveryMinutesSum: 0,
        deliveryMinutesCount: 0,
      };
      buckets.set(courierId, entry);
    }

    entry.deliveriesCount++;
    if (order.status === "saiu") entry.inTransitCount++;
    if (order.status === "entregue") entry.deliveredCount++;

    const fee = Math.max(0, Number(order.delivery_fee || 0));
    entry.totalDeliveryFeesCollected += fee;

    if (courierId !== UNASSIGNED_COURIER_ID) {
      const payout =
        typeof order.courier_payout === "number" && Number.isFinite(order.courier_payout)
          ? Math.max(0, order.courier_payout)
          : calculateOrderCourierPayout(fee, matchedCourier);
      entry.payoutDue += payout;
    }

    if (normalizePaymentBucket(order.payment_method) === "dinheiro") {
      const orderTotal = Math.max(0, Number(order.total || 0));
      entry.cashToReturn += orderTotal;
      entry.cashOrdersCount++;
      const trocoPara = Number(order.troco || 0);
      if (trocoPara > orderTotal) {
        entry.totalChangeCarried += trocoPara - orderTotal;
      }
    }

    if (order.delivered_at) {
      const startIso = order.dispatched_at || order.created_at;
      const startMs = new Date(startIso).getTime();
      const endMs = new Date(order.delivered_at).getTime();
      if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs) {
        entry.deliveryMinutesSum += (endMs - startMs) / 60000;
        entry.deliveryMinutesCount++;
      }
    }
  }

  return Array.from(buckets.values())
    .map((b) => ({
      courierId: b.courierId,
      courierName: b.courierName,
      deliveriesCount: b.deliveriesCount,
      inTransitCount: b.inTransitCount,
      deliveredCount: b.deliveredCount,
      totalDeliveryFeesCollected: roundMoney(b.totalDeliveryFeesCollected),
      payoutDue: roundMoney(b.payoutDue),
      cashToReturn: roundMoney(b.cashToReturn),
      cashOrdersCount: b.cashOrdersCount,
      totalChangeCarried: roundMoney(b.totalChangeCarried),
      avgDeliveryMinutes:
        b.deliveryMinutesCount > 0
          ? Math.round(b.deliveryMinutesSum / b.deliveryMinutesCount)
          : null,
    }))
    .sort((a, b) => {
      if (a.courierId === UNASSIGNED_COURIER_ID) return 1;
      if (b.courierId === UNASSIGNED_COURIER_ID) return -1;
      return b.deliveriesCount - a.deliveriesCount || a.courierName.localeCompare(b.courierName);
    });
}
