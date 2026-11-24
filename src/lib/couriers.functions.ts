import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "./auth-middleware";
import { CourierPayoutMode, CourierRow } from "./couriers-domain";
import { roundMoney } from "./cash-domain";

export interface CourierDoc {
  _id: string;
  name: string;
  phone: string;
  active: boolean;
  payout_mode: CourierPayoutMode;
  fixed_fee: number;
  fee_share_percent: number;
  created_at: Date;
  updated_at: Date;
}

function serializeCourier(doc: CourierDoc): CourierRow {
  return {
    id: doc._id,
    name: doc.name,
    phone: doc.phone || "",
    active: doc.active !== false,
    payout_mode: doc.payout_mode === "fixed" ? "fixed" : "delivery_fee",
    fixed_fee: roundMoney(doc.fixed_fee ?? 0),
    fee_share_percent: typeof doc.fee_share_percent === "number" ? doc.fee_share_percent : 100,
    created_at:
      doc.created_at instanceof Date ? doc.created_at.toISOString() : String(doc.created_at),
    updated_at:
      doc.updated_at instanceof Date ? doc.updated_at.toISOString() : String(doc.updated_at),
  };
}

export const listCouriers = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<CourierRow[]> => {
    // Atendente also needs active couriers when dispatching orders in the KDS
    if (!context.roles?.some((r) => ["admin", "supervisor", "atendente"].includes(r))) {
      throw new Error("Acesso restrito.");
    }

    const { getDb } = await import("./db");
    const db = await getDb();
    const col = db.collection<CourierDoc>("couriers");

    const docs = await col.find({}).sort({ active: -1, name: 1 }).toArray();
    return docs.map(serializeCourier);
  });

const upsertCourierSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Informe o nome do entregador.").max(80),
  phone: z.string().trim().max(30).optional().default(""),
  active: z.boolean().optional().default(true),
  payout_mode: z.enum(["delivery_fee", "fixed"]).default("delivery_fee"),
  fixed_fee: z.number().min(0).max(500).default(0),
  fee_share_percent: z.number().min(0).max(100).default(100),
});

export const saveCourier = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((raw: unknown) => upsertCourierSchema.parse(raw))
  .handler(async ({ data, context }): Promise<CourierRow> => {
    if (!context.roles?.includes("admin")) {
      throw new Error("Apenas administradores podem cadastrar ou editar entregadores.");
    }

    const { getDb } = await import("./db");
    const db = await getDb();
    const col = db.collection<CourierDoc>("couriers");
    const now = new Date();

    if (data.id) {
      const updated = await col.findOneAndUpdate(
        { _id: data.id },
        {
          $set: {
            name: data.name,
            phone: data.phone,
            active: data.active,
            payout_mode: data.payout_mode,
            fixed_fee: roundMoney(data.fixed_fee),
            fee_share_percent: data.fee_share_percent,
            updated_at: now,
          },
        },
        { returnDocument: "after" },
      );
      if (!updated) throw new Error("Entregador não encontrado.");
      return serializeCourier(updated);
    }

    const doc: CourierDoc = {
      _id: crypto.randomUUID(),
      name: data.name,
      phone: data.phone,
      active: data.active,
      payout_mode: data.payout_mode,
      fixed_fee: roundMoney(data.fixed_fee),
      fee_share_percent: data.fee_share_percent,
      created_at: now,
      updated_at: now,
    };

    await col.insertOne(doc);
    return serializeCourier(doc);
  });

const toggleCourierSchema = z.object({
  id: z.string().min(1),
  active: z.boolean(),
});

export const toggleCourierActive = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((raw: unknown) => toggleCourierSchema.parse(raw))
  .handler(async ({ data, context }): Promise<CourierRow> => {
    if (!context.roles?.some((r) => ["admin", "supervisor"].includes(r))) {
      throw new Error("Acesso restrito a supervisores e administradores.");
    }

    const { getDb } = await import("./db");
    const db = await getDb();
    const col = db.collection<CourierDoc>("couriers");

    const updated = await col.findOneAndUpdate(
      { _id: data.id },
      { $set: { active: data.active, updated_at: new Date() } },
      { returnDocument: "after" },
    );

    if (!updated) throw new Error("Entregador não encontrado.");
    return serializeCourier(updated);
  });

export const deleteCourier = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((raw: unknown) => z.object({ id: z.string().min(1) }).parse(raw))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    if (!context.roles?.includes("admin")) {
      throw new Error("Apenas administradores podem excluir entregadores.");
    }

    const { getDb } = await import("./db");
    const db = await getDb();
    const col = db.collection<CourierDoc>("couriers");

    const res = await col.deleteOne({ _id: data.id });
    if (res.deletedCount === 0) throw new Error("Entregador não encontrado.");
    return { ok: true };
  });

function getSaoPauloTodayStartDate(): Date {
  const spDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${spDate}T00:00:00-03:00`);
}

const courierSettlementSchema = z.object({
  period: z.enum(["shift", "today", "7d"]).default("today"),
});

export const getCourierSettlementReport = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .validator((raw: unknown) => courierSettlementSchema.parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    const isAdmin = Boolean(context.roles?.includes("admin"));
    const isSupervisorOrAdmin = Boolean(
      context.roles?.some((r) => ["admin", "supervisor"].includes(r)),
    );
    if (!isSupervisorOrAdmin) {
      throw new Error("Acesso restrito a supervisores e administradores.");
    }

    const { getDb } = await import("./db");
    const { calculateCourierSettlements } = await import("./couriers-domain");
    const db = await getDb();

    const effectivePeriod = !isAdmin && data.period === "7d" ? "today" : data.period;

    const [couriersDocs, openShift] = await Promise.all([
      db.collection<CourierDoc>("couriers").find({}).sort({ active: -1, name: 1 }).toArray(),
      db.collection("cash_shifts").findOne({ status: "open" }, { sort: { opened_at: -1 } }),
    ]);

    let startDate = getSaoPauloTodayStartDate();
    if (effectivePeriod === "shift" && openShift?.opened_at) {
      startDate =
        openShift.opened_at instanceof Date
          ? openShift.opened_at
          : new Date(String(openShift.opened_at));
    } else if (effectivePeriod === "7d") {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    const deliveryOrders = await db
      .collection("orders")
      .find({
        created_at: { $gte: startDate },
        $or: [{ delivery_mode: "delivery" }, { delivery_mode: { $exists: false } }],
      })
      .project({
        _id: 1,
        status: 1,
        delivery_mode: 1,
        courier_id: 1,
        courier_name: 1,
        courier_payout: 1,
        delivery_fee: 1,
        payment_method: 1,
        payment_status: 1,
        total: 1,
        troco: 1,
        dispatched_at: 1,
        delivered_at: 1,
        created_at: 1,
      })
      .toArray();

    const couriers = couriersDocs.map(serializeCourier);
    const toIsoOrNull = (v: unknown): string | null =>
      v instanceof Date ? v.toISOString() : typeof v === "string" ? v : null;

    const orderSamples = deliveryOrders.map((o: any) => ({
      id: String(o._id),
      status: o.status,
      delivery_mode: o.delivery_mode || "delivery",
      courier_id: o.courier_id || null,
      courier_name: o.courier_name || null,
      courier_payout: typeof o.courier_payout === "number" ? o.courier_payout : null,
      delivery_fee: Number(o.delivery_fee || 0),
      payment_method: String(o.payment_method || ""),
      payment_status: o.payment_status || "on_delivery",
      total: Number(o.total || 0),
      troco: typeof o.troco === "number" ? o.troco : null,
      dispatched_at: toIsoOrNull(o.dispatched_at),
      delivered_at: toIsoOrNull(o.delivered_at),
      created_at: toIsoOrNull(o.created_at) || new Date().toISOString(),
    }));

    const settlements = calculateCourierSettlements(orderSamples, couriers);

    return {
      period: effectivePeriod,
      hasActiveShift: Boolean(openShift),
      settlements,
      couriers,
    };
  });
