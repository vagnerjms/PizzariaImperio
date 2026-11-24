import { MongoClient, Db, Collection, Document } from "mongodb";

let client: MongoClient | null = null;
let dbPromise: Promise<Db> | null = null;
let indexesPromise: Promise<void> | null = null;

function getClient(): MongoClient {
  if (!client) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("Missing MONGODB_URI environment variable.");
    }
    client = new MongoClient(uri, {
      maxPoolSize: 25,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  }
  return client;
}

/**
 * Single authoritative MongoDB index bootstrap with an in-flight promise lock
 * so concurrent cold-start calls never stampede index creation.
 */
export function ensureIndexes(db: Db): Promise<void> {
  if (indexesPromise) return indexesPromise;

  indexesPromise = (async () => {
    try {
      const orders = db.collection("orders");
      const users = db.collection("users");
      const promotions = db.collection("promotions");
      const addressCache = db.collection("address_cache");
      const cashShifts = db.collection("cash_shifts");
      const couriers = db.collection("couriers");
      const menuItems = db.collection("menu_items");
      const crustOptions = db.collection("crust_options");

      await Promise.all([
        orders.createIndex({ created_at: -1 }),
        orders.createIndex({ status: 1, created_at: -1 }),
        orders.createIndex({ payment_status: 1, created_at: 1 }),
        orders.createIndex({ gateway_payment_id: 1 }),
        orders.createIndex({ customer_phone: 1 }),
        orders.createIndex({ courier_id: 1, created_at: -1 }),
        users.createIndex({ email: 1 }, { unique: true }),
        promotions.createIndex({ active: 1, created_at: -1 }),
        promotions.createIndex(
          { coupon_code: 1 },
          {
            name: "uniq_promotions_coupon_code",
            unique: true,
            partialFilterExpression: { coupon_code: { $type: "string", $gt: "" } },
          },
        ),
        addressCache.createIndex({ updated_at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }),
        cashShifts.createIndex({ status: 1, opened_at: -1 }),
        cashShifts.createIndex(
          { status: 1 },
          {
            name: "uniq_open_cash_shift",
            unique: true,
            partialFilterExpression: { status: "open" },
          },
        ),
        couriers.createIndex({ active: 1, name: 1 }),
        menuItems.createIndex({ sort_order: 1, name: 1 }),
        menuItems.createIndex({ category: 1, sort_order: 1 }),
        crustOptions.createIndex({ sort_order: 1 }),
      ]);

      console.log("MongoDB indexes verified and created successfully.");
    } catch (err) {
      indexesPromise = null;
      console.error("Error creating MongoDB indexes:", err);
    }
  })();

  return indexesPromise;
}

export async function getDb(): Promise<Db> {
  if (!dbPromise) {
    const c = getClient();
    dbPromise = c
      .connect()
      .then((cl) => cl.db())
      .catch((err) => {
        dbPromise = null;
        throw err;
      });
  }

  const db = await dbPromise;
  await ensureIndexes(db);
  return db;
}

export async function getCollection<T extends Document = any>(
  name: string,
): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}

export async function getOrdersCollection() {
  return getCollection("orders");
}

export async function getUsersCollection() {
  return getCollection("users");
}

export { client };
