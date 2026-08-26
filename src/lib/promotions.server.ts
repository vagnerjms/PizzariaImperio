import { getDb } from "./db";
import { Promotion } from "./promotions.types";
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

export async function listPublicPromotionsFromDb(): Promise<Promotion[]> {
  try {
    const col = await getPromotionsCollection();
    const all = await col.find({ active: true }).sort({ created_at: -1 }).toArray();

    const now = new Date();
    const todayYMD = new Intl.DateTimeFormat("fr-CA", { timeZone: "America/Sao_Paulo" }).format(now);

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
      return true;
    });

    console.log(`[Public Promotions] Active in DB: ${all.length}, Valid today (${todayYMD}): ${valid.length}`);

    return valid.map((p) => ({
      ...p,
      _id: String(p._id),
      created_at: formatDate(p.created_at),
      updated_at: formatDate(p.updated_at),
    }));
  } catch (err) {
    console.error("Error fetching public promotions:", err);
    return [];
  }
}

export async function listAdminPromotionsFromDb(): Promise<Promotion[]> {
  try {
    const col = await getPromotionsCollection();
    const all = await col.find({}).sort({ created_at: -1 }).toArray();
    return all.map((p) => ({
      ...p,
      _id: String(p._id),
      created_at: formatDate(p.created_at),
      updated_at: formatDate(p.updated_at),
    }));
  } catch (err) {
    console.error("Error fetching admin promotions:", err);
    return [];
  }
}

export async function createPromotionInDb(data: Omit<Promotion, "_id" | "created_at" | "updated_at">): Promise<Promotion> {
  const col = await getPromotionsCollection();
  const id = crypto.randomUUID();
  const doc: Promotion = {
    ...data,
    _id: id,
    created_at: new Date(),
    updated_at: new Date(),
  };
  await col.insertOne(doc as any);
  return {
    ...doc,
    created_at: (doc.created_at as Date).toISOString(),
    updated_at: (doc.updated_at as Date).toISOString(),
  };
}

export async function updatePromotionInDb(id: string, data: Partial<Promotion>): Promise<void> {
  const col = await getPromotionsCollection();
  const cleanData = { ...data };
  delete (cleanData as any)._id;
  delete (cleanData as any).created_at;

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
