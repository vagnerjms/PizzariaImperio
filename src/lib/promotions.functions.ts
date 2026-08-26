import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./auth-middleware";
import { z } from "zod";
import {
  listPublicPromotionsFromDb,
  listAdminPromotionsFromDb,
  createPromotionInDb,
  updatePromotionInDb,
  togglePromotionInDb,
  deletePromotionInDb,
} from "./promotions.server";

const createPromoSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(2).max(500),
  badge_text: z.string().trim().max(40).optional(),
  type: z.enum(["PERCENTAGE_DISCOUNT", "FIXED_DISCOUNT", "BUY_X_GET_Y"]),
  discount_value: z.number().min(0).max(10000).optional().nullable(),
  trigger_type: z.enum(["all", "category", "specific_items", "min_total"]),
  trigger_category: z.string().optional().nullable(),
  trigger_item_ids: z.array(z.string()).optional().nullable(),
  trigger_min_qty: z.number().min(1).max(100).optional().nullable(),
  trigger_min_total: z.number().min(0).max(10000).optional().nullable(),
  reward_item_id: z.string().optional().nullable(),
  reward_item_name: z.string().optional().nullable(),
  reward_discount_percent: z.number().min(0).max(100).optional().nullable(),
  active: z.boolean().default(true),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
});

// 1. Consulta pública para cardápio e vitrine
export const getPublicPromotions = createServerFn({ method: "GET" })
  .handler(async () => {
    return listPublicPromotionsFromDb();
  });

// 2. Consulta administrativa
export const getAdminPromotions = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    if (!context.roles?.some((r) => ["admin", "supervisor"].includes(r))) {
      throw new Error("Acesso restrito.");
    }
    return listAdminPromotionsFromDb();
  });

// 3. Criação de promoção
export const createPromotionFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((raw: unknown) => createPromoSchema.parse(raw))
  .handler(async ({ data, context }) => {
    if (!context.roles?.some((r) => ["admin", "supervisor"].includes(r))) {
      throw new Error("Acesso restrito.");
    }
    const created = await createPromotionInDb(data as any);
    return { success: true, promotion: created };
  });

// 4. Edição de promoção
export const updatePromotionFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      id: z.string(),
      data: createPromoSchema.partial(),
    }).parse(raw)
  )
  .handler(async ({ data, context }) => {
    if (!context.roles?.some((r) => ["admin", "supervisor"].includes(r))) {
      throw new Error("Acesso restrito.");
    }
    await updatePromotionInDb(data.id, data.data as any);
    return { success: true };
  });

// 5. Alternar status ativo/inativo
export const togglePromotionFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      id: z.string(),
      active: z.boolean(),
    }).parse(raw)
  )
  .handler(async ({ data, context }) => {
    if (!context.roles?.some((r) => ["admin", "supervisor"].includes(r))) {
      throw new Error("Acesso restrito.");
    }
    await togglePromotionInDb(data.id, data.active);
    return { success: true };
  });

// 6. Deletar promoção
export const deletePromotionFn = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string() }).parse(raw))
  .handler(async ({ data, context }) => {
    if (!context.roles?.some((r) => ["admin", "supervisor"].includes(r))) {
      throw new Error("Acesso restrito.");
    }
    await deletePromotionInDb(data.id);
    return { success: true };
  });
