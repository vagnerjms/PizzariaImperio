import { MongoClient, Db, Collection, Document } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Missing MONGODB_URI environment variable.");
}

let client: MongoClient;
let dbPromise: Promise<Db>;

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClient?: MongoClient;
    _mongoDbPromise?: Promise<Db>;
  };

  if (!globalWithMongo._mongoClient) {
    globalWithMongo._mongoClient = new MongoClient(uri);
    globalWithMongo._mongoDbPromise = globalWithMongo._mongoClient.connect().then(client => client.db());
  }
  client = globalWithMongo._mongoClient;
  dbPromise = globalWithMongo._mongoDbPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri);
  dbPromise = client.connect().then(client => client.db());
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
