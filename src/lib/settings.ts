import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./auth-middleware";
import { z } from "zod";

const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const openingDaySchema = z.object({
  enabled: z.boolean(),
  open: z.string().regex(hhmmRegex),
  close: z.string().regex(hhmmRegex),
});

const openingHoursSchema = z.object({
  "0": openingDaySchema,
  "1": openingDaySchema,
  "2": openingDaySchema,
  "3": openingDaySchema,
  "4": openingDaySchema,
  "5": openingDaySchema,
  "6": openingDaySchema,
});

const optionalUrlSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\/.+/.test(v), "Informe uma URL válida ou deixe em branco.");

const updateSettingsSchema = z.object({
  evolution_api_url: optionalUrlSchema.optional(),
  evolution_api_key: z.string().trim().optional(),
  n8n_webhook_url: optionalUrlSchema.optional(),
  mercado_pago_access_token: z.string().trim().optional(),
  mercado_pago_public_key: z.string().trim().optional(),
  whatsapp_instance_name: z.string().trim().min(1).optional(),
  google_maps_api_key: z.string().trim().optional(),
  store_phone: z.string().trim().max(30).optional(),
  store_status_override: z.enum(["auto", "force_open", "force_closed"]).optional(),
  pause_reason: z.string().trim().max(160).optional(),
  opening_hours: openingHoursSchema.optional(),
  enabled_payment_methods: z
    .object({
      pix: z.boolean(),
      dinheiro: z.boolean(),
      credito: z.boolean(),
      debito: z.boolean(),
    })
    .optional(),
  enabled_delivery_modes: z
    .object({
      delivery: z.boolean(),
      pickup: z.boolean(),
      dine_in: z.boolean(),
    })
    .optional(),
  meta_pixel_id: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{5,25}$/.test(v), "Meta Pixel ID deve conter apenas dígitos.")
    .optional(),
  ga4_measurement_id: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^G-[A-Z0-9]{4,20}$/i.test(v),
      "GA4 Measurement ID deve começar com G- (ex: G-XXXXXXXXXX)."
    )
    .optional(),
});

// Public store configuration (never exposes tokens or API keys)
export const getPublicStoreConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { getSystemSettings, getPublicStoreConfigFromSettings } = await import("./settings.server");
  const settings = await getSystemSettings();
  return getPublicStoreConfigFromSettings(settings);
});

export const getAdminSettings = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    if (!context.roles?.includes("admin")) {
      throw new Error("Acesso restrito a Administradores.");
    }
    const { getSystemSettings } = await import("./settings.server");
    return getSystemSettings();
  });

export const updateAdminSettings = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((raw: unknown) => updateSettingsSchema.parse(raw))
  .handler(async ({ data, context }) => {
    if (!context.roles?.includes("admin")) {
      throw new Error("Acesso restrito a Administradores.");
    }
    if (
      data.enabled_payment_methods &&
      !Object.values(data.enabled_payment_methods).some(Boolean)
    ) {
      throw new Error("Mantenha ao menos uma forma de pagamento ativa.");
    }
    if (
      data.enabled_delivery_modes &&
      !Object.values(data.enabled_delivery_modes).some(Boolean)
    ) {
      throw new Error("Mantenha ao menos uma modalidade de atendimento ativa.");
    }
    const { saveSystemSettings } = await import("./settings.server");
    await saveSystemSettings(data);
    return { success: true };
  });

const toggleStorePauseSchema = z.object({
  store_status_override: z.enum(["auto", "force_open", "force_closed"]),
  pause_reason: z.string().trim().max(160).optional(),
});

// Quick store pause/reopen toggle for Admin and Supervisor during shifts
export const toggleStorePause = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((raw: unknown) => toggleStorePauseSchema.parse(raw))
  .handler(async ({ data, context }) => {
    if (!context.roles?.some((r) => ["admin", "supervisor"].includes(r))) {
      throw new Error("Acesso restrito a Supervisores e Administradores.");
    }
    const { saveSystemSettings, getSystemSettings, getPublicStoreConfigFromSettings } = await import(
      "./settings.server"
    );
    await saveSystemSettings({
      store_status_override: data.store_status_override,
      pause_reason: data.pause_reason ?? "",
    });
    const updated = await getSystemSettings();
    return getPublicStoreConfigFromSettings(updated);
  });
