import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Collection } from "mongodb";
import { requireSupervisorOrAdmin } from "./auth-middleware";
import {
  calculateCashClosingDifference,
  CashMovement,
  CashShiftRow,
  CashShiftSummary,
  PaymentBreakdown,
} from "./cash-domain";
import { normalizePaymentBucket, roundMoney } from "./money";

interface CashMovementDoc {
  id: string;
  type: "sangria" | "suprimento";
  amount: number;
  reason: string;
  created_by: string;
  created_at: Date;
}

interface CashShiftDoc {
  _id: string;
  status: "open" | "closed";
  opened_by: string;
  opened_at: Date;
  opening_balance: number;
  movements: CashMovementDoc[];
  closed_by?: string | null;
  closed_at?: Date | null;
  expected_cash?: number | null;
  counted_cash?: number | null;
  cash_difference?: number | null;
  summary_by_payment?: PaymentBreakdown | null;
  gross_sales?: number | null;
  total_orders?: number | null;
  closing_notes?: string | null;
}

export interface CashDashboardResponse {
  activeShift: CashShiftRow | null;
  activeSummary: CashShiftSummary | null;
  history: CashShiftRow[];
  isAdmin: boolean;
}

export interface CloseCashShiftResponse {
  shift: CashShiftRow;
  summary: CashShiftSummary;
}

function serializeShift(doc: CashShiftDoc): CashShiftRow {
  return {
    id: doc._id,
    status: doc.status,
    opened_by: doc.opened_by,
    opened_at: doc.opened_at instanceof Date ? doc.opened_at.toISOString() : String(doc.opened_at),
    opening_balance: roundMoney(doc.opening_balance),
    movements: (doc.movements || []).map(
      (m): CashMovement => ({
        id: m.id,
        type: m.type,
        amount: roundMoney(m.amount),
        reason: m.reason,
        created_by: m.created_by,
        created_at:
          m.created_at instanceof Date ? m.created_at.toISOString() : String(m.created_at),
      }),
    ),
    closed_by: doc.closed_by ?? null,
    closed_at: doc.closed_at
      ? doc.closed_at instanceof Date
        ? doc.closed_at.toISOString()
        : String(doc.closed_at)
      : null,
    expected_cash: typeof doc.expected_cash === "number" ? roundMoney(doc.expected_cash) : null,
    counted_cash: typeof doc.counted_cash === "number" ? roundMoney(doc.counted_cash) : null,
    cash_difference:
      typeof doc.cash_difference === "number" ? roundMoney(doc.cash_difference) : null,
    summary_by_payment: doc.summary_by_payment
      ? {
          pix: roundMoney(doc.summary_by_payment.pix),
          dinheiro: roundMoney(doc.summary_by_payment.dinheiro),
          credito: roundMoney(doc.summary_by_payment.credito),
          debito: roundMoney(doc.summary_by_payment.debito),
          outros: roundMoney(doc.summary_by_payment.outros),
        }
      : null,
    gross_sales: typeof doc.gross_sales === "number" ? roundMoney(doc.gross_sales) : null,
    total_orders: typeof doc.total_orders === "number" ? doc.total_orders : null,
    closing_notes: doc.closing_notes ?? null,
  };
}

async function aggregateShiftSummaryFromDb(
  ordersCol: Collection,
  openingBalance: number,
  movements: Array<{ type: "sangria" | "suprimento"; amount: number }>,
  openedAt: Date,
  closedAt?: Date
): Promise<CashShiftSummary> {
  const dateFilter: Record<string, Date> = { $gte: openedAt };
  if (closedAt) dateFilter.$lte = closedAt;

  const grouped = await ordersCol
    .aggregate<{
      _id: { status: string; payment_method: string; payment_status: string };
      count: number;
      total: number;
      discount: number;
      delivery_fee: number;
    }>([
      { $match: { created_at: dateFilter } },
      {
        $group: {
          _id: {
            status: { $ifNull: ["$status", "novo"] },
            payment_method: { $ifNull: ["$payment_method", ""] },
            payment_status: { $ifNull: ["$payment_status", "on_delivery"] },
          },
          count: { $sum: 1 },
          total: { $sum: { $ifNull: ["$total", 0] } },
          discount: { $sum: { $ifNull: ["$discount", 0] } },
          delivery_fee: { $sum: { $ifNull: ["$delivery_fee", 0] } },
        },
      },
    ])
    .toArray();

  const byPayment: PaymentBreakdown = {
    pix: 0,
    dinheiro: 0,
    credito: 0,
    debito: 0,
    outros: 0,
  };

  let grossSales = 0;
  let totalDiscounts = 0;
  let totalDeliveryFees = 0;
  let totalOrders = 0;
  let canceledOrders = 0;

  for (const row of grouped) {
    const status = row._id.status;
    const paymentMethod = String(row._id.payment_method || "");
    const paymentStatus = row._id.payment_status || "on_delivery";
    const count = Number(row.count || 0);

    if (status === "cancelado") {
      canceledOrders += count;
      continue;
    }

    const bucket = normalizePaymentBucket(paymentMethod);
    if (bucket === "pix" && paymentStatus !== "paid") {
      continue;
    }

    const amount = Number(row.total || 0);
    byPayment[bucket] = roundMoney(byPayment[bucket] + amount);
    grossSales = roundMoney(grossSales + amount);
    totalDiscounts = roundMoney(totalDiscounts + Number(row.discount || 0));
    totalDeliveryFees = roundMoney(totalDeliveryFees + Number(row.delivery_fee || 0));
    totalOrders += count;
  }

  let totalSuprimentos = 0;
  let totalSangrias = 0;
  for (const m of movements) {
    const val = roundMoney(Math.max(0, Number(m.amount) || 0));
    if (m.type === "suprimento") totalSuprimentos = roundMoney(totalSuprimentos + val);
    else if (m.type === "sangria") totalSangrias = roundMoney(totalSangrias + val);
  }

  const opening = roundMoney(Math.max(0, Number(openingBalance) || 0));
  const expectedCash = roundMoney(opening + byPayment.dinheiro + totalSuprimentos - totalSangrias);
  const expectedTotalInShift = roundMoney(opening + grossSales + totalSuprimentos - totalSangrias);

  return {
    totalOrders,
    canceledOrders,
    grossSales,
    totalDiscounts,
    totalDeliveryFees,
    byPayment,
    totalSuprimentos,
    totalSangrias,
    expectedCash,
    expectedTotalInShift,
  };
}

export const getCashDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupervisorOrAdmin])
  .handler(async ({ context }): Promise<CashDashboardResponse> => {
    const isAdmin = Boolean(context.roles?.includes("admin"));

    const { getDb } = await import("./db");
    const db = await getDb();
    const shiftsCol = db.collection<CashShiftDoc>("cash_shifts");
    const ordersCol = db.collection("orders");

    const openDoc = await shiftsCol.findOne({ status: "open" }, { sort: { opened_at: -1 } });

    let activeShift: CashShiftRow | null = null;
    let activeSummary: CashShiftSummary | null = null;

    if (openDoc) {
      activeShift = serializeShift(openDoc);
      activeSummary = await aggregateShiftSummaryFromDb(
        ordersCol,
        openDoc.opening_balance,
        activeShift.movements,
        openDoc.opened_at,
      );
    }

    let history: CashShiftRow[] = [];
    if (isAdmin) {
      const closedDocs = await shiftsCol
        .find({ status: "closed" })
        .sort({ closed_at: -1, opened_at: -1 })
        .limit(30)
        .toArray();
      history = closedDocs.map(serializeShift);
    }

    return {
      activeShift,
      activeSummary,
      history,
      isAdmin,
    };
  });

const openShiftSchema = z.object({
  opening_balance: z.number().min(0, "Fundo de troco não pode ser negativo.").max(100000),
});

export const openCashShift = createServerFn({ method: "POST" })
  .middleware([requireSupervisorOrAdmin])
  .validator((raw: unknown) => openShiftSchema.parse(raw))
  .handler(async ({ data, context }): Promise<CashShiftRow> => {
    const { getDb } = await import("./db");
    const db = await getDb();
    const shiftsCol = db.collection<CashShiftDoc>("cash_shifts");

    const existing = await shiftsCol.findOne({ status: "open" });
    if (existing) {
      throw new Error(
        `Já existe um caixa aberto por ${existing.opened_by}. Feche o turno atual antes de abrir outro.`,
      );
    }

    const now = new Date();
    const doc: CashShiftDoc = {
      _id: crypto.randomUUID(),
      status: "open",
      opened_by: context.email || "operador",
      opened_at: now,
      opening_balance: roundMoney(data.opening_balance),
      movements: [],
      closed_by: null,
      closed_at: null,
      expected_cash: null,
      counted_cash: null,
      cash_difference: null,
      summary_by_payment: null,
      gross_sales: null,
      total_orders: null,
      closing_notes: null,
    };

    try {
      await shiftsCol.insertOne(doc);
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new Error(
          "Já existe um caixa aberto por outro operador. Atualize a tela antes de abrir outro turno.",
        );
      }
      throw err;
    }
    return serializeShift(doc);
  });

const movementSchema = z.object({
  type: z.enum(["sangria", "suprimento"]),
  amount: z.number().positive("Informe um valor maior que zero.").max(100000),
  reason: z
    .string()
    .trim()
    .min(2, "Informe o motivo da movimentação.")
    .max(160, "Motivo muito longo."),
});

export const addCashMovement = createServerFn({ method: "POST" })
  .middleware([requireSupervisorOrAdmin])
  .validator((raw: unknown) => movementSchema.parse(raw))
  .handler(async ({ data, context }): Promise<CashShiftRow> => {
    const { getDb } = await import("./db");
    const db = await getDb();
    const shiftsCol = db.collection<CashShiftDoc>("cash_shifts");

    const movement: CashMovementDoc = {
      id: crypto.randomUUID(),
      type: data.type,
      amount: roundMoney(data.amount),
      reason: data.reason,
      created_by: context.email || "operador",
      created_at: new Date(),
    };

    const updated = await shiftsCol.findOneAndUpdate(
      { status: "open" },
      { $push: { movements: movement } },
      { sort: { opened_at: -1 }, returnDocument: "after" },
    );

    if (!updated) {
      throw new Error(
        "Nenhum caixa aberto no momento. Abra um turno antes de lançar movimentações.",
      );
    }

    return serializeShift(updated);
  });

const closeShiftSchema = z.object({
  counted_cash: z.number().min(0, "Valor contado não pode ser negativo.").max(1000000),
  closing_notes: z.string().trim().max(400).optional(),
});

export const closeCashShift = createServerFn({ method: "POST" })
  .middleware([requireSupervisorOrAdmin])
  .validator((raw: unknown) => closeShiftSchema.parse(raw))
  .handler(async ({ data, context }): Promise<CloseCashShiftResponse> => {

    const { getDb } = await import("./db");
    const db = await getDb();
    const shiftsCol = db.collection<CashShiftDoc>("cash_shifts");
    const ordersCol = db.collection("orders");

    // Optimistic retry loop (max 2 attempts) ensures concurrent sangria/suprimento is never dropped
    for (let attempt = 0; attempt < 2; attempt++) {
      const openDoc = await shiftsCol.findOne({ status: "open" }, { sort: { opened_at: -1 } });
      if (!openDoc) {
        throw new Error("Nenhum caixa aberto para fechar.");
      }

      const movements = openDoc.movements || [];
      const closedAt = new Date();
      const summary = await aggregateShiftSummaryFromDb(
        ordersCol,
        openDoc.opening_balance,
        movements,
        openDoc.opened_at,
        closedAt,
      );

      const countedCash = roundMoney(data.counted_cash);
      const difference = calculateCashClosingDifference(summary.expectedCash, countedCash);

      const updated = await shiftsCol.findOneAndUpdate(
        {
          _id: openDoc._id,
          status: "open",
          movements: { $size: movements.length },
        } as any,
        {
          $set: {
            status: "closed",
            closed_by: context.email || "operador",
            closed_at: closedAt,
            expected_cash: summary.expectedCash,
            counted_cash: countedCash,
            cash_difference: difference,
            summary_by_payment: summary.byPayment,
            gross_sales: summary.grossSales,
            total_orders: summary.totalOrders,
            closing_notes: data.closing_notes || null,
          },
        },
        { returnDocument: "after" },
      );

      if (updated) {
        return {
          shift: serializeShift(updated),
          summary,
        };
      }

      // Check if shift was already closed vs modified by a concurrent movement
      const stillOpen = await shiftsCol.findOne({ _id: openDoc._id, status: "open" });
      if (!stillOpen) {
        throw new Error("Este turno já foi fechado por outro operador.");
      }
    }

    throw new Error(
      "Houve uma movimentação simultânea no caixa durante o fechamento. Tente fechar novamente.",
    );
  });
