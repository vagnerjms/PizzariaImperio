import { createServerFn } from "@tanstack/react-start";
import { requireAdmin, requireSupervisorOrAdmin } from "./auth-middleware";
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
export const getPublicDeliveryConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { getDeliverySettings } = await import("./delivery-config.server");
  return getDeliverySettings();
});

// 2. Obter configurações completas para o painel Admin/Supervisor
export const getAdminDeliverySettings = createServerFn({ method: "GET" })
  .middleware([requireSupervisorOrAdmin])
  .handler(async () => {
    const { getDeliverySettings } = await import("./delivery-config.server");
    return getDeliverySettings();
  });

// 4. Salvar novas taxas de entrega no MongoDB (Apenas Admin)
export const updateAdminDeliverySettings = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((raw: unknown) => updateDeliverySettingsSchema.parse(raw))
  .handler(async ({ data }) => {
    const { saveDeliverySettings } = await import("./delivery-config.server");
    await saveDeliverySettings(data as any);
    return { success: true };
  });

// 5. Carregar e aplicar todos os bairros oficiais de Bragança Paulista (Apenas Admin)
export const resetToBragancaNeighborhoods = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { getBragancaNeighborhoodsList, saveDeliverySettings } =
      await import("./delivery-config.server");
    const list = getBragancaNeighborhoodsList(5.0);
    await saveDeliverySettings({ default_fee: 7.0, neighborhoods: list });
    return { default_fee: 7.0, neighborhoods: list };
  });
