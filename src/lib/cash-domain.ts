import { OrderRow } from "@/types/orders";

export type CashMovementType = "sangria" | "suprimento";

export interface CashMovement {
  id: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  created_by: string;
  created_at: string;
}

export interface PaymentBreakdown {
  pix: number;
  dinheiro: number;
  credito: number;
  debito: number;
  outros: number;
}

export interface CashShiftSummary {
  totalOrders: number;
  canceledOrders: number;
  grossSales: number;
  totalDiscounts: number;
  totalDeliveryFees: number;
  byPayment: PaymentBreakdown;
  totalSuprimentos: number;
  totalSangrias: number;
  expectedCash: number;
  expectedTotalInShift: number;
}

export interface CashShiftRow {
  id: string;
  status: "open" | "closed";
  opened_by: string;
  opened_at: string;
  opening_balance: number;
  movements: CashMovement[];
  closed_by: string | null;
  closed_at: string | null;
  expected_cash: number | null;
  counted_cash: number | null;
  cash_difference: number | null;
  summary_by_payment: PaymentBreakdown | null;
  gross_sales: number | null;
  total_orders: number | null;
  closing_notes: string | null;
}

export type CashOrderSample = Pick<
  OrderRow,
  "status" | "payment_method" | "payment_status" | "total" | "discount" | "delivery_fee"
>;

export function roundMoney(value: number): number {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export function normalizePaymentBucket(paymentMethod: string): keyof PaymentBreakdown {
  const norm = (paymentMethod || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (norm.includes("pix")) return "pix";
  if (norm.includes("dinheiro")) return "dinheiro";
  if (norm.includes("credito")) return "credito";
  if (norm.includes("debito")) return "debito";
  return "outros";
}

/**
 * Only non-canceled orders count toward cash/sales.
 * Pix orders only count once paid (never pending/failed/refunded).
 */
export function isOrderEligibleForCash(
  order: Pick<CashOrderSample, "status" | "payment_method" | "payment_status">,
): boolean {
  if (order.status === "cancelado") return false;
  if (normalizePaymentBucket(order.payment_method) === "pix") {
    return order.payment_status === "paid";
  }
  return order.payment_status !== "failed" && order.payment_status !== "refunded";
}

export function calculateCashShiftSummary(
  openingBalance: number,
  movements: Pick<CashMovement, "type" | "amount">[],
  orders: CashOrderSample[],
): CashShiftSummary {
  const byPayment: PaymentBreakdown = {
    pix: 0,
    dinheiro: 0,
    credito: 0,
    debito: 0,
    outros: 0,
  };

  let totalOrders = 0;
  let canceledOrders = 0;
  let grossSales = 0;
  let totalDiscounts = 0;
  let totalDeliveryFees = 0;

  for (const order of orders) {
    if (order.status === "cancelado") {
      canceledOrders++;
      continue;
    }
    if (!isOrderEligibleForCash(order)) continue;

    const total = Number(order.total || 0);
    const discount = Number(order.discount || 0);
    const deliveryFee = Number(order.delivery_fee || 0);
    const bucket = normalizePaymentBucket(order.payment_method);

    totalOrders++;
    grossSales += total;
    totalDiscounts += discount;
    totalDeliveryFees += deliveryFee;
    byPayment[bucket] += total;
  }

  let totalSuprimentos = 0;
  let totalSangrias = 0;
  for (const m of movements) {
    const amount = Math.max(0, Number(m.amount || 0));
    if (m.type === "suprimento") totalSuprimentos += amount;
    if (m.type === "sangria") totalSangrias += amount;
  }

  byPayment.pix = roundMoney(byPayment.pix);
  byPayment.dinheiro = roundMoney(byPayment.dinheiro);
  byPayment.credito = roundMoney(byPayment.credito);
  byPayment.debito = roundMoney(byPayment.debito);
  byPayment.outros = roundMoney(byPayment.outros);

  const safeOpening = roundMoney(Math.max(0, Number(openingBalance || 0)));
  const safeSuprimentos = roundMoney(totalSuprimentos);
  const safeSangrias = roundMoney(totalSangrias);
  const expectedCash = roundMoney(
    safeOpening + byPayment.dinheiro + safeSuprimentos - safeSangrias,
  );
  const safeGross = roundMoney(grossSales);

  return {
    totalOrders,
    canceledOrders,
    grossSales: safeGross,
    totalDiscounts: roundMoney(totalDiscounts),
    totalDeliveryFees: roundMoney(totalDeliveryFees),
    byPayment,
    totalSuprimentos: safeSuprimentos,
    totalSangrias: safeSangrias,
    expectedCash,
    expectedTotalInShift: roundMoney(safeOpening + safeGross + safeSuprimentos - safeSangrias),
  };
}

export function calculateCashClosingDifference(expectedCash: number, countedCash: number): number {
  return roundMoney(Number(countedCash || 0) - Number(expectedCash || 0));
}
