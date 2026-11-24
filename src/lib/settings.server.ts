import { getDb } from "./db";

export interface SystemSettings {
  evolution_api_url: string;
  evolution_api_key: string;
  n8n_webhook_url: string;
  mercado_pago_access_token: string;
  mercado_pago_public_key: string;
  whatsapp_instance_name: string;
  google_maps_api_key: string;
}

interface SettingsDoc extends Partial<SystemSettings> {
  _id: string;
  updated_at?: Date;
}

export async function getSystemSettings(): Promise<SystemSettings> {
  const envDefaults: SystemSettings = {
    evolution_api_url: process.env.EVOLUTION_API_URL || "",
    evolution_api_key: process.env.EVOLUTION_API_KEY || "",
    n8n_webhook_url: process.env.N8N_WEBHOOK_URL || "",
    mercado_pago_access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
    mercado_pago_public_key: process.env.VITE_MERCADO_PAGO_PUBLIC_KEY || "",
    whatsapp_instance_name: process.env.WHATSAPP_INSTANCE_NAME || "Disparo",
    google_maps_api_key: process.env.GOOGLE_MAPS_API_KEY || "",
  };

  try {
    const db = await getDb();
    const settingsCol = db.collection<SettingsDoc>("settings");
    const settings = await settingsCol.findOne({ _id: "global" });

    return {
      evolution_api_url: settings?.evolution_api_url || envDefaults.evolution_api_url,
      evolution_api_key: settings?.evolution_api_key || envDefaults.evolution_api_key,
      n8n_webhook_url: settings?.n8n_webhook_url || envDefaults.n8n_webhook_url,
      mercado_pago_access_token:
        settings?.mercado_pago_access_token || envDefaults.mercado_pago_access_token,
      mercado_pago_public_key:
        settings?.mercado_pago_public_key || envDefaults.mercado_pago_public_key,
      whatsapp_instance_name:
        settings?.whatsapp_instance_name || envDefaults.whatsapp_instance_name,
      google_maps_api_key: settings?.google_maps_api_key || envDefaults.google_maps_api_key,
    };
  } catch (error) {
    console.error("Failed to load settings from DB, using environment variables:", error);
    return envDefaults;
  }
}

export async function saveSystemSettings(settings: Partial<SystemSettings>): Promise<void> {
  const db = await getDb();
  const settingsCol = db.collection<SettingsDoc>("settings");

  const cleanSettings: Partial<SettingsDoc> = {};
  for (const [key, val] of Object.entries(settings)) {
    if (val !== undefined && val !== null) {
      (cleanSettings as Record<string, string>)[key] =
        typeof val === "string" ? val.trim() : String(val);
    }
  }

  await settingsCol.updateOne(
    { _id: "global" },
    { $set: { ...cleanSettings, updated_at: new Date() } },
    { upsert: true }
  );
}
