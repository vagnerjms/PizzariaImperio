import { getDb } from "./db";
import { hashPassword } from "./hash";

export async function initializeDatabase() {
  try {
    console.log("[DB Init] Initializing MongoDB database...");
    const db = await getDb();

    // 1. Create indexes
    const usersCol = db.collection("users");
    await usersCol.createIndex({ email: 1 }, { unique: true });
    
    const ordersCol = db.collection("orders");
    await ordersCol.createIndex({ created_at: -1 });

    // 2. Ensure initial admin user exists
    const adminEmail = process.env.ADMIN_EMAIL || "admin@pizzaria.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    const adminExists = await usersCol.findOne({ email: adminEmail });
    if (!adminExists) {
      console.log(`[DB Init] Admin user not found. Creating default admin: ${adminEmail}`);
      const hashedPassword = hashPassword(adminPassword);
      await usersCol.insertOne({
        email: adminEmail,
        password_hash: hashedPassword,
        roles: ["admin"],
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log("[DB Init] Default admin user created successfully.");
    } else {
      console.log("[DB Init] Admin user already exists.");
    }

    console.log("[DB Init] Database initialization complete.");
  } catch (error) {
    console.error("[DB Init] Database initialization failed:", error);
  }
}
