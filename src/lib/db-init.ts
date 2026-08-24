import { getDb } from "./db";
import { hashPassword } from "./hash";

export async function initializeDatabase() {
  try {
    console.log("[DB Init] Initializing MongoDB database...");
    const db = await getDb();

    // 1. Create high-performance compound indexes for peak delivery traffic
    const usersCol = db.collection("users");
    await usersCol.createIndex({ email: 1 }, { unique: true });
    
    const ordersCol = db.collection("orders");
    await ordersCol.createIndex({ created_at: -1 });
    await ordersCol.createIndex({ status: 1, created_at: -1 });
    await ordersCol.createIndex({ payment_status: 1 });
    await ordersCol.createIndex({ gateway_payment_id: 1 });
    await ordersCol.createIndex({ customer_phone: 1 });

    const deliveryCol = db.collection("delivery_settings");
    await deliveryCol.createIndex({ _id: 1 });

    const settingsCol = db.collection("settings");
    await settingsCol.createIndex({ _id: 1 });

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

    const supervisorEmail = "supervisor@pizzaria.com";
    const supervisorPassword = "supervisor123";
    const supervisorExists = await usersCol.findOne({ email: supervisorEmail });
    if (!supervisorExists) {
      console.log(`[DB Init] Supervisor user not found. Creating default supervisor: ${supervisorEmail}`);
      const hashedPassword = hashPassword(supervisorPassword);
      await usersCol.insertOne({
        email: supervisorEmail,
        password_hash: hashedPassword,
        roles: ["supervisor"],
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log("[DB Init] Default supervisor user created successfully.");
    }

    const atendenteEmail = "atendente@pizzaria.com";
    const atendentePassword = "atendente123";
    const atendenteExists = await usersCol.findOne({ email: atendenteEmail });
    if (!atendenteExists) {
      console.log(`[DB Init] Atendente user not found. Creating default atendente: ${atendenteEmail}`);
      const hashedPassword = hashPassword(atendentePassword);
      await usersCol.insertOne({
        email: atendenteEmail,
        password_hash: hashedPassword,
        roles: ["atendente"],
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log("[DB Init] Default atendente user created successfully.");
    }

    console.log("[DB Init] Database initialization complete.");
  } catch (error) {
    console.error("[DB Init] Database initialization failed:", error);
  }
}
