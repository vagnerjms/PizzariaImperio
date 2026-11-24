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
