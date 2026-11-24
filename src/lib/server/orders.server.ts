import { getOrdersCollection } from "../db";
import { getSaoPauloTodayStartDate } from "../datetime";
import { roundMoney } from "../money";

export type FinancialReportPeriod = "today" | "7d" | "30d" | "all";

export interface FinancialReportResponse {
  period: FinancialReportPeriod;
  totalOrdersCount: number;
  confirmedCount: number;
  completedCount: number;
  activeCount: number;
  canceledCount: number;
  revenue: number;
  totalDiscounts: number;
  totalDeliveryFees: number;
  ticketMedio: number;
  avgPrepMin: number | null;
  prepSampleCount: number;
  avgDeliveryMin: number | null;
  deliverySampleCount: number;
  topItems: Array<{ name: string; qty: number }>;
  paymentBreakdown: Array<{ method: string; count: number; amount: number }>;
}

function toIsoOrNull(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "string") return val;
  return null;
}

function normalizeRankingName(rawName: string, basePizzaName?: string): string {
  if (basePizzaName && basePizzaName.trim()) return basePizzaName.trim();
  return String(rawName || "")
    .replace(/\s*\[[^\]]*\]/g, "")
    .replace(/\s*\((?:Borda [^)]+|Sem Borda[^)]*)\)/gi, "")
    .trim();
}

function buildPeriodMatchStage(period: FinancialReportPeriod): Record<string, unknown> {
  if (period === "today") {
    return { created_at: { $gte: getSaoPauloTodayStartDate() } };
  }
  if (period === "7d") {
    return { created_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
  }
  if (period === "30d") {
    return { created_at: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
  }
  return {};
}

export function serializeOrderRow(o: any) {
  return {
    id: o._id,
    customer_name: o.customer_name,
    customer_phone: o.customer_phone,
    customer_address: o.customer_address,
    delivery_mode: o.delivery_mode || "delivery",
    table_number: o.table_number || null,
    courier_id: o.courier_id || null,
    courier_name: o.courier_name || null,
    courier_payout: typeof o.courier_payout === "number" ? o.courier_payout : null,
    payment_method: o.payment_method,
    troco: o.troco,
    notes: o.notes || null,
    subtotal: o.subtotal || o.total,
    discount: o.discount || 0,
    promotion_id: o.promotion_id || null,
    promotion_title: o.promotion_title || null,
    total: o.total,
    delivery_fee: o.delivery_fee,
    status: o.status,
    created_at: toIsoOrNull(o.created_at) || new Date().toISOString(),
    updated_at: toIsoOrNull(o.updated_at) || new Date().toISOString(),
    preparing_at: toIsoOrNull(o.preparing_at),
    dispatched_at: toIsoOrNull(o.dispatched_at),
    delivered_at: toIsoOrNull(o.delivered_at),
    canceled_at: toIsoOrNull(o.canceled_at),
    cancel_reason: o.cancel_reason || null,
    payment_status: o.payment_status,
    payment_gateway: o.payment_gateway,
    gateway_payment_id: o.gateway_payment_id,
    payment_details: o.payment_details,
    order_items: (o.items || []).map((item: any, idx: number) => ({
      id: item.id || `item-${idx}`,
      pizza_id: item.pizza_id,
      flavor2_id: item.flavor2_id ?? null,
      crust_id: item.crust_id ?? null,
      base_pizza_name: item.base_pizza_name,
      pizza_name: item.pizza_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.quantity * item.unit_price,
      is_reward: item.is_reward ?? false,
    })),
  };
}

export async function cancelExpiredPixOrders(): Promise<void> {
  const ordersCol = await getOrdersCollection();
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  await ordersCol.updateMany(
    {
      payment_method: "Pix",
      payment_status: "pending",
      status: "novo",
      created_at: { $lt: thirtyMinutesAgo },
    },
    {
      $set: {
        status: "cancelado",
        payment_status: "failed",
        canceled_at: new Date(),
        cancel_reason: "Pix expirado automaticamente após 30 minutos",
        updated_at: new Date(),
      },
    },
  );
}

export async function findRecentOrdersForKds(limit = 200) {
  const ordersCol = await getOrdersCollection();
  const orders = await ordersCol.find({}).sort({ created_at: -1 }).limit(limit).toArray();
  return orders.map(serializeOrderRow);
}

export async function buildFinancialReportFromDb(
  period: FinancialReportPeriod,
  isAdmin: boolean,
): Promise<FinancialReportResponse> {
  const effectivePeriod: FinancialReportPeriod = isAdmin ? period : "today";
  const matchStage = buildPeriodMatchStage(effectivePeriod);
  const ordersCol = await getOrdersCollection();

  const docs = await ordersCol
    .find(matchStage)
    .project({
      status: 1,
      payment_method: 1,
      payment_status: 1,
      total: 1,
      discount: 1,
      delivery_fee: 1,
      created_at: 1,
      preparing_at: 1,
      dispatched_at: 1,
      delivered_at: 1,
      items: 1,
    })
    .toArray();

  let confirmedCount = 0;
  let completedCount = 0;
  let activeCount = 0;
  let canceledCount = 0;
  let revenue = 0;
  let totalDiscounts = 0;
  let totalDeliveryFees = 0;

  const prepDeltas: number[] = [];
  const deliveryDeltas: number[] = [];
  const itemSales: Record<string, number> = {};
  const paymentMap: Record<string, { count: number; amount: number }> = {};

  const toMs = (v: unknown): number | null => {
    if (!v) return null;
    const ms = v instanceof Date ? v.getTime() : new Date(String(v)).getTime();
    return Number.isFinite(ms) ? ms : null;
  };

  for (const o of docs as any[]) {
    if (o.status === "cancelado") {
      canceledCount += 1;
      continue;
    }
    if (o.payment_method === "Pix" && o.payment_status !== "paid") {
      continue;
    }

    confirmedCount += 1;
    if (o.status === "entregue") completedCount += 1;
    else activeCount += 1;

    const orderTotal = Number(o.total || 0);
    revenue += orderTotal;
    totalDiscounts += Number(o.discount || 0);
    totalDeliveryFees += Number(o.delivery_fee || 0);

    const createdMs = toMs(o.created_at);
    const startPrepMs = toMs(o.preparing_at) ?? createdMs;
    const dispatchedMs = toMs(o.dispatched_at);
    const deliveredMs = toMs(o.delivered_at);

    if (startPrepMs !== null && dispatchedMs !== null) {
      const d = dispatchedMs - startPrepMs;
      if (d > 0 && d < 6 * 3600 * 1000) prepDeltas.push(d);
    }
    if (createdMs !== null && deliveredMs !== null) {
      const d = deliveredMs - createdMs;
      if (d > 0 && d < 6 * 3600 * 1000) deliveryDeltas.push(d);
    }

    for (const item of o.items || []) {
      const key = normalizeRankingName(item.pizza_name, item.base_pizza_name);
      if (!key) continue;
      itemSales[key] = (itemSales[key] || 0) + Number(item.quantity || 0);
    }

    const method = String(o.payment_method || "Outros");
    const bucket = paymentMap[method] || { count: 0, amount: 0 };
    bucket.count += 1;
    bucket.amount += orderTotal;
    paymentMap[method] = bucket;
  }

  const avgMin = (arr: number[]): number | null =>
    arr.length === 0 ? null : Math.round(arr.reduce((sum, ms) => sum + ms / 60000, 0) / arr.length);

  const topItems = Object.entries(itemSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, qty]) => ({ name, qty }));

  const paymentBreakdown = Object.entries(paymentMap).map(([method, info]) => ({
    method,
    count: info.count,
    amount: isAdmin ? roundMoney(info.amount) : 0,
  }));

  return {
    period: effectivePeriod,
    totalOrdersCount: docs.length,
    confirmedCount,
    completedCount,
    activeCount,
    canceledCount,
    revenue: isAdmin ? roundMoney(revenue) : 0,
    totalDiscounts: isAdmin ? roundMoney(totalDiscounts) : 0,
    totalDeliveryFees: isAdmin ? roundMoney(totalDeliveryFees) : 0,
    ticketMedio: isAdmin && confirmedCount > 0 ? roundMoney(revenue / confirmedCount) : 0,
    avgPrepMin: avgMin(prepDeltas),
    prepSampleCount: prepDeltas.length,
    avgDeliveryMin: avgMin(deliveryDeltas),
    deliverySampleCount: deliveryDeltas.length,
    topItems,
    paymentBreakdown,
  };
}

export async function exportFinancialCsvFromDb(period: FinancialReportPeriod): Promise<string> {
  const matchStage = buildPeriodMatchStage(period);
  const ordersCol = await getOrdersCollection();
  const docs = await ordersCol
    .find(matchStage)
    .sort({ created_at: -1 })
    .project({
      _id: 1,
      created_at: 1,
      customer_name: 1,
      delivery_mode: 1,
      payment_method: 1,
      status: 1,
      subtotal: 1,
      discount: 1,
      delivery_fee: 1,
      total: 1,
    })
    .toArray();

  const header = [
    "ID",
    "Data",
    "Cliente",
    "Modalidade",
    "Pagamento",
    "Status",
    "Subtotal",
    "Desconto",
    "Taxa Entrega",
    "Total",
  ];
  const rows = (docs as any[]).map((o) => {
    const createdDate = o.created_at instanceof Date ? o.created_at : new Date(o.created_at);
    return [
      String(o._id).slice(0, 8),
      createdDate.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      `"${String(o.customer_name || "").replace(/"/g, '""')}"`,
      o.delivery_mode || "delivery",
      `"${String(o.payment_method || "")}"`,
      o.status,
      Number(o.subtotal || 0).toFixed(2),
      Number(o.discount || 0).toFixed(2),
      Number(o.delivery_fee || 0).toFixed(2),
      Number(o.total || 0).toFixed(2),
    ];
  });

  return [header.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
}
