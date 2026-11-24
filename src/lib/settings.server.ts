import { getDb } from "./db";
import {
  DEFAULT_ENABLED_DELIVERY_MODES,
  DEFAULT_ENABLED_PAYMENT_METHODS,
  DEFAULT_OPENING_HOURS,
  EnabledDeliveryModes,
  EnabledPaymentMethods,
  evaluateStoreOpenStatus,
  normalizeOpeningHours,
  OpeningHoursMap,
  PublicStoreConfig,
  StoreStatusOverride,
} from "./store-hours";

export interface SystemSettings {
  evolution_api_url: string;
  evolution_api_key: string;
  n8n_webhook_url: string;
  mercado_pago_access_token: string;
  mercado_pago_public_key: string;
  whatsapp_instance_name: string;
  google_maps_api_key: string;
  // Store operational settings (Pacote 1)
  store_phone: string;
  store_status_override: StoreStatusOverride;
  pause_reason: string;
  opening_hours: OpeningHoursMap;
  enabled_payment_methods: EnabledPaymentMethods;
  enabled_delivery_modes: EnabledDeliveryModes;
  // Marketing & Tracking Pixels (Pacote 3)
  meta_pixel_id: string;
  ga4_measurement_id: string;
}

interface SettingsDoc extends Partial<SystemSettings> {
  _id: string;
  updated_at?: Date;
}

export const SECRET_MASK_SENTINEL = "••••••••••••";

const SECRET_FIELDS = [
  "evolution_api_key",
  "mercado_pago_access_token",
  "google_maps_api_key",
] as const;

export interface MaskedAdminSettings extends SystemSettings {
  configured_secrets: {
    evolution_api_key: boolean;
    mercado_pago_access_token: boolean;
    google_maps_api_key: boolean;
  };
}

export function maskSettingsForAdminClient(settings: SystemSettings): MaskedAdminSettings {
  return {
    ...settings,
    evolution_api_key: settings.evolution_api_key ? SECRET_MASK_SENTINEL : "",
    mercado_pago_access_token: settings.mercado_pago_access_token ? SECRET_MASK_SENTINEL : "",
    google_maps_api_key: settings.google_maps_api_key ? SECRET_MASK_SENTINEL : "",
    configured_secrets: {
      evolution_api_key: Boolean(settings.evolution_api_key),
      mercado_pago_access_token: Boolean(settings.mercado_pago_access_token),
      google_maps_api_key: Boolean(settings.google_maps_api_key),
    },
  };
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
    store_phone: process.env.STORE_WHATSAPP_PHONE || "",
    store_status_override: "auto",
    pause_reason: "",
    opening_hours: { ...DEFAULT_OPENING_HOURS },
    enabled_payment_methods: { ...DEFAULT_ENABLED_PAYMENT_METHODS },
    enabled_delivery_modes: { ...DEFAULT_ENABLED_DELIVERY_MODES },
    meta_pixel_id: process.env.META_PIXEL_ID || "",
    ga4_measurement_id: process.env.GA4_MEASUREMENT_ID || "",
  };

  try {
    const db = await getDb();
    const settingsCol = db.collection<SettingsDoc>("settings");
    const settings = await settingsCol.findOne({ _id: "global" });

    const pickStr = (dbVal: string | undefined, envVal: string) =>
      dbVal !== undefined ? dbVal : envVal;

    return {
      evolution_api_url: pickStr(settings?.evolution_api_url, envDefaults.evolution_api_url),
      evolution_api_key: pickStr(settings?.evolution_api_key, envDefaults.evolution_api_key),
      n8n_webhook_url: pickStr(settings?.n8n_webhook_url, envDefaults.n8n_webhook_url),
      mercado_pago_access_token: pickStr(
        settings?.mercado_pago_access_token,
        envDefaults.mercado_pago_access_token,
      ),
      mercado_pago_public_key: pickStr(
        settings?.mercado_pago_public_key,
        envDefaults.mercado_pago_public_key,
      ),
      whatsapp_instance_name:
        settings?.whatsapp_instance_name || envDefaults.whatsapp_instance_name,
      google_maps_api_key: pickStr(settings?.google_maps_api_key, envDefaults.google_maps_api_key),
      store_phone: pickStr(settings?.store_phone, envDefaults.store_phone),
      store_status_override:
        settings?.store_status_override === "force_open" ||
        settings?.store_status_override === "force_closed"
          ? settings.store_status_override
          : "auto",
      pause_reason: settings?.pause_reason || "",
      opening_hours: normalizeOpeningHours(settings?.opening_hours),
      enabled_payment_methods: {
        ...DEFAULT_ENABLED_PAYMENT_METHODS,
        ...(settings?.enabled_payment_methods || {}),
      },
      enabled_delivery_modes: {
        ...DEFAULT_ENABLED_DELIVERY_MODES,
        ...(settings?.enabled_delivery_modes || {}),
      },
      meta_pixel_id: pickStr(settings?.meta_pixel_id, envDefaults.meta_pixel_id),
      ga4_measurement_id: pickStr(settings?.ga4_measurement_id, envDefaults.ga4_measurement_id),
    };
  } catch (error) {
    console.error("Failed to load settings from DB, using environment variables:", error);
    return envDefaults;
  }
}

export function getPublicStoreConfigFromSettings(settings: SystemSettings): PublicStoreConfig {
  const operational = {
    store_phone: settings.store_phone || "",
    store_status_override: settings.store_status_override || "auto",
    pause_reason: settings.pause_reason || "",
    opening_hours: normalizeOpeningHours(settings.opening_hours),
    enabled_payment_methods: {
      ...DEFAULT_ENABLED_PAYMENT_METHODS,
      ...(settings.enabled_payment_methods || {}),
    },
    enabled_delivery_modes: {
      ...DEFAULT_ENABLED_DELIVERY_MODES,
      ...(settings.enabled_delivery_modes || {}),
    },
    meta_pixel_id: settings.meta_pixel_id || "",
    ga4_measurement_id: settings.ga4_measurement_id || "",
  };

  return {
    ...operational,
    status: evaluateStoreOpenStatus(operational),
  };
}

export async function saveSystemSettings(settings: Partial<SystemSettings>): Promise<void> {
  const db = await getDb();
  const settingsCol = db.collection<SettingsDoc>("settings");

  const secretSet = new Set<string>(SECRET_FIELDS);
  const cleanSettings: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(settings)) {
    if (val === undefined || val === null) continue;
    const trimmed = typeof val === "string" ? val.trim() : val;
    // Never overwrite a persisted secret with the UI mask sentinel
    if (secretSet.has(key) && trimmed === SECRET_MASK_SENTINEL) {
      continue;
    }
    cleanSettings[key] = trimmed;
  }

  await settingsCol.updateOne(
    { _id: "global" },
    { $set: { ...cleanSettings, updated_at: new Date() } },
    { upsert: true },
  );
}
