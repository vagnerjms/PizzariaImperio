import { getDb } from "./db";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./auth-middleware";
import { z } from "zod";

export interface SystemSettings {
  evolution_api_url: string;
  evolution_api_key: string;
  n8n_webhook_url: string;
  mercado_pago_access_token: string;
  mercado_pago_public_key: string;
  whatsapp_instance_name: string;
}

export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const db = await getDb();
    const settingsCol = db.collection("settings");
    const settings = await settingsCol.findOne({ _id: "global" });
    
    return {
      evolution_api_url: settings?.evolution_api_url || process.env.EVOLUTION_API_URL || "http://179.197.231.106:8085",
      evolution_api_key: settings?.evolution_api_key || process.env.EVOLUTION_API_KEY || "pizzaria_evolution_secret_key_2026",
      n8n_webhook_url: settings?.n8n_webhook_url || process.env.N8N_WEBHOOK_URL || "http://179.197.231.106:5678/webhook/webhook-pizzaria",
      mercado_pago_access_token: settings?.mercado_pago_access_token || process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
      mercado_pago_public_key: settings?.mercado_pago_public_key || process.env.VITE_MERCADO_PAGO_PUBLIC_KEY || "",
      whatsapp_instance_name: settings?.whatsapp_instance_name || "Disparo",
    };
  } catch (error) {
    console.error("Failed to load settings from DB, using environment variables:", error);
    return {
      evolution_api_url: process.env.EVOLUTION_API_URL || "http://179.197.231.106:8085",
      evolution_api_key: process.env.EVOLUTION_API_KEY || "pizzaria_evolution_secret_key_2026",
      n8n_webhook_url: process.env.N8N_WEBHOOK_URL || "http://179.197.231.106:5678/webhook/webhook-pizzaria",
      mercado_pago_access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
      mercado_pago_public_key: process.env.VITE_MERCADO_PAGO_PUBLIC_KEY || "",
      whatsapp_instance_name: "Disparo",
    };
  }
}

export async function saveSystemSettings(settings: Partial<SystemSettings>): Promise<void> {
  const db = await getDb();
  const settingsCol = db.collection("settings");
  
  const cleanSettings: Record<string, any> = {};
  for (const [key, val] of Object.entries(settings)) {
    if (val !== undefined && val !== null) {
      cleanSettings[key] = typeof val === "string" ? val.trim() : val;
    }
  }

  await settingsCol.updateOne(
    { _id: "global" },
    { $set: { ...cleanSettings, updated_at: new Date() } },
    { upsert: true }
  );
}

// Zod schemas for server functions
const updateSettingsSchema = z.object({
  evolution_api_url: z.string().trim().url(),
  evolution_api_key: z.string().trim(),
  n8n_webhook_url: z.string().trim().url(),
  mercado_pago_access_token: z.string().trim(),
  mercado_pago_public_key: z.string().trim(),
  whatsapp_instance_name: z.string().trim().min(1),
});

export const getAdminSettings = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    if (!context.roles?.includes("admin")) {
      throw new Error("Acesso restrito.");
    }
    return getSystemSettings();
  });

export const updateAdminSettings = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((raw: unknown) => updateSettingsSchema.parse(raw))
  .handler(async ({ data, context }) => {
    if (!context.roles?.includes("admin")) {
      throw new Error("Acesso restrito.");
    }
    await saveSystemSettings(data);
    return { success: true };
  });
