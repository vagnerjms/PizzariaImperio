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
    const now = new Date();
    const all = await col.find({ active: true }).sort({ created_at: -1 }).toArray();

    // Filter active valid date ranges in memory
    return all.filter((p) => {
      if (p.start_date) {
        const start = new Date(p.start_date);
        if (now < start) return false;
      }
      if (p.end_date) {
        const end = new Date(p.end_date);
        if (now > end) return false;
      }
      return true;
    }).map((p) => ({
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
