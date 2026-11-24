import { getDb } from "./db";
import { normalizeCouponCode, Promotion } from "./promotions.types";
import { getSaoPauloYMD, isPromotionExhausted } from "./promotions-engine";
import crypto from "node:crypto";

export async function getPromotionsCollection() {
  const db = await getDb();
  return db.collection<Promotion>("promotions");
}

function formatDate(d: any): string {
  if (!d) return new Date().toISOString();
  if (d instanceof Date) return d.toISOString();
  if (typeof d === "string") return d;
  try {
    return new Date(d).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function serializePromotion(p: Promotion): Promotion {
  return {
    ...p,
    _id: String(p._id),
    coupon_code: normalizeCouponCode(p.coupon_code) || null,
    days_of_week:
      Array.isArray(p.days_of_week) && p.days_of_week.length > 0 ? p.days_of_week : null,
    max_uses: typeof p.max_uses === "number" && p.max_uses > 0 ? p.max_uses : null,
    current_uses: typeof p.current_uses === "number" ? p.current_uses : 0,
    created_at: formatDate(p.created_at),
    updated_at: formatDate(p.updated_at),
  };
}

export async function listPublicPromotionsFromDb(): Promise<Promotion[]> {
  try {
    const col = await getPromotionsCollection();
    const all = await col.find({ active: true }).sort({ created_at: -1 }).toArray();

    const todayYMD = getSaoPauloYMD(new Date());

    const valid = all.filter((p) => {
      if (p.start_date) {
        const startYMD = p.start_date.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(startYMD) && startYMD > todayYMD) {
          return false;
        }
      }
      if (p.end_date) {
        const endYMD = p.end_date.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(endYMD) && endYMD < todayYMD) {
          return false;
        }
      }
      if (isPromotionExhausted(p)) {
        return false;
      }
      return true;
    });

    return valid.map(serializePromotion);
  } catch (err) {
    console.error("Error fetching public promotions:", err);
    return [];
  }
}

export async function listAdminPromotionsFromDb(): Promise<Promotion[]> {
  try {
    const col = await getPromotionsCollection();
    const all = await col.find({}).sort({ created_at: -1 }).toArray();
    return all.map(serializePromotion);
  } catch (err) {
    console.error("Error fetching admin promotions:", err);
    return [];
  }
}

async function assertUniqueCouponCode(code: string | null, excludeId?: string) {
  if (!code) return;
  const col = await getPromotionsCollection();
  const conflict = await col.findOne({
    coupon_code: code,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });
  if (conflict) {
    throw new Error(`Já existe uma promoção cadastrada com o cupom "${code}".`);
  }
}

export async function createPromotionInDb(
  data: Omit<Promotion, "_id" | "created_at" | "updated_at">
): Promise<Promotion> {
  const col = await getPromotionsCollection();
  const normalizedCode = normalizeCouponCode(data.coupon_code) || null;
  await assertUniqueCouponCode(normalizedCode);

  const id = crypto.randomUUID();
  const doc: Promotion = {
    ...data,
    coupon_code: normalizedCode,
    days_of_week:
      Array.isArray(data.days_of_week) && data.days_of_week.length > 0
        ? Array.from(new Set(data.days_of_week)).sort()
        : null,
    max_uses: typeof data.max_uses === "number" && data.max_uses > 0 ? data.max_uses : null,
    current_uses: 0,
    _id: id,
    created_at: new Date(),
    updated_at: new Date(),
  };
  await col.insertOne(doc as any);
  return serializePromotion(doc);
}

export async function updatePromotionInDb(id: string, data: Partial<Promotion>): Promise<void> {
  const col = await getPromotionsCollection();
  const cleanData: Record<string, unknown> = { ...data };
  delete cleanData._id;
  delete cleanData.created_at;
  delete cleanData.current_uses;

  if (data.coupon_code !== undefined) {
    const normalizedCode = normalizeCouponCode(data.coupon_code) || null;
    await assertUniqueCouponCode(normalizedCode, id);
    cleanData.coupon_code = normalizedCode;
  }

  if (data.days_of_week !== undefined) {
    cleanData.days_of_week =
      Array.isArray(data.days_of_week) && data.days_of_week.length > 0
        ? Array.from(new Set(data.days_of_week)).sort()
        : null;
  }

  if (data.max_uses !== undefined) {
    cleanData.max_uses =
      typeof data.max_uses === "number" && data.max_uses > 0 ? data.max_uses : null;
  }

  await col.updateOne(
    { _id: id },
    {
      $set: {
        ...cleanData,
        updated_at: new Date(),
      },
    }
  );
}

export async function togglePromotionInDb(id: string, active: boolean): Promise<void> {
  const col = await getPromotionsCollection();
  await col.updateOne(
    { _id: id },
    {
      $set: {
        active,
        updated_at: new Date(),
      },
    }
  );
}

export async function deletePromotionInDb(id: string): Promise<void> {
  const col = await getPromotionsCollection();
  await col.deleteOne({ _id: id });
}

/**
 * Atomically increments `current_uses` while enforcing `max_uses` under concurrency.
 * Returns true if usage was reserved, or false if the cap has already been reached.
 */
export async function consumePromotionUse(id: string): Promise<boolean> {
  const col = await getPromotionsCollection();
  const res = await col.findOneAndUpdate(
    {
      _id: id,
      active: true,
      $or: [
        { max_uses: null },
        { max_uses: { $exists: false } },
        { $expr: { $lt: [{ $ifNull: ["$current_uses", 0] }, "$max_uses"] } },
      ],
    } as any,
    {
      $inc: { current_uses: 1 },
      $set: { updated_at: new Date() },
    },
    { returnDocument: "after" }
  );
  return Boolean(res);
}
