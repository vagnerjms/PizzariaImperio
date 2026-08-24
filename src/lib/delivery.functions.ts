import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./auth-middleware";
import { z } from "zod";

const neighborhoodSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1),
  fee: z.number().min(0),
});

const updateDeliverySettingsSchema = z.object({
  default_fee: z.number().min(0),
  neighborhoods: z.array(neighborhoodSchema),
});

// 1. Obter taxas e bairros para o cliente no Checkout (Público)
export const getPublicDeliveryConfig = createServerFn({ method: "GET" })
  .handler(async () => {
    const { getDeliverySettings } = await import("./delivery-config.server");
    return getDeliverySettings();
  });

// 2. Calcular taxa de entrega por nome de bairro no servidor
export const lookupDeliveryFee = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ neighborhood: z.string() }).parse(raw))
  .handler(async ({ data }) => {
    const { calculateFeeForNeighborhood } = await import("./delivery-config.server");
    const fee = await calculateFeeForNeighborhood(data.neighborhood);
    return { fee };
  });

// 3. Obter configurações completas para o painel Admin/Supervisor
export const getAdminDeliverySettings = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    if (!context.roles?.some(r => ["admin", "supervisor"].includes(r))) {
      throw new Error("Acesso restrito.");
    }
    const { getDeliverySettings } = await import("./delivery-config.server");
    return getDeliverySettings();
  });

// 4. Salvar novas taxas de entrega no MongoDB (Admin ou Supervisor)
export const updateAdminDeliverySettings = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((raw: unknown) => updateDeliverySettingsSchema.parse(raw))
  .handler(async ({ data, context }) => {
    if (!context.roles?.some(r => ["admin", "supervisor"].includes(r))) {
      throw new Error("Acesso restrito.");
    }
    const { saveDeliverySettings } = await import("./delivery-config.server");
    await saveDeliverySettings(data as any);
    return { success: true };
  });
