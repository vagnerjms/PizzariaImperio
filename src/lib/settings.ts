import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./auth-middleware";
import { z } from "zod";

const updateSettingsSchema = z.object({
  evolution_api_url: z.string().trim().url(),
  evolution_api_key: z.string().trim(),
  n8n_webhook_url: z.string().trim().url(),
  mercado_pago_access_token: z.string().trim(),
  mercado_pago_public_key: z.string().trim(),
  whatsapp_instance_name: z.string().trim().min(1),
  google_maps_api_key: z.string().trim().optional(),
});

export const getAdminSettings = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    if (!context.roles?.includes("admin")) {
      throw new Error("Acesso restrito.");
    }
    const { getSystemSettings } = await import("./settings.server");
    return getSystemSettings();
  });

export const updateAdminSettings = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((raw: unknown) => updateSettingsSchema.parse(raw))
  .handler(async ({ data, context }) => {
    if (!context.roles?.includes("admin")) {
      throw new Error("Acesso restrito.");
    }
    const { saveSystemSettings } = await import("./settings.server");
    await saveSystemSettings(data);
    return { success: true };
  });
