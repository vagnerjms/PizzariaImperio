import { MongoClient, Db, Collection, Document } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Missing MONGODB_URI environment variable.");
}

let client: MongoClient | null = null;
let dbPromise: Promise<Db> | null = null;

function getClient(): MongoClient {
  if (!client) {
    client = new MongoClient(uri, {
      maxPoolSize: 25,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  }
  return client;
}

let indexesInitialized = false;

async function ensureIndexes(db: Db) {
  if (indexesInitialized) return;
  try {
    const orders = db.collection("orders");
    await Promise.all([
      orders.createIndex({ created_at: -1 }),
      orders.createIndex({ status: 1 }),
      orders.createIndex({ payment_status: 1 }),
      orders.createIndex({ gateway_payment_id: 1 }),
    ]);

    const users = db.collection("users");
    await users.createIndex({ email: 1 }, { unique: true });

    indexesInitialized = true;
    console.log("MongoDB indexes verified and created successfully.");
  } catch (err) {
    console.error("Error creating MongoDB indexes:", err);
  }
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
  if (!indexesInitialized) {
    ensureIndexes(db).catch(console.error);
  }
  return db;
}

export async function getCollection<T extends Document = any>(name: string): Promise<Collection<T>> {
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
