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

export async function getDb(): Promise<Db> {
  return dbPromise;
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
