import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, requireStaff, requireSupervisorOrAdmin } from "./auth-middleware";
import type { FinancialReportPeriod, FinancialReportResponse } from "./server/orders.server";

export type { FinancialReportPeriod, FinancialReportResponse };

const itemSchema = z.object({
  pizza_id: z.string().min(1).max(60),
  flavor2_id: z.string().max(60).nullable().optional(),
  crust_id: z.string().max(40).nullable().optional(),
  pizza_name: z.string().min(1).max(160),
  quantity: z.number().int().min(1).max(50),
  unit_price: z.number().min(0).max(5000),
  is_reward_item: z.boolean().optional(),
});

const createOrderSchema = z.object({
  customer_name: z.string().trim().min(2).max(120),
  customer_phone: z.string().trim().min(8).max(30),
  customer_address: z.string().trim().min(5).max(400),
  delivery_mode: z.enum(["delivery", "pickup", "dine_in"]).optional(),
  neighborhood: z.string().max(100).nullable().optional(),
  table_number: z.string().trim().max(20).nullable().optional(),
  payment_method: z.enum(["Pix", "Dinheiro", "Cartão de crédito", "Cartão de débito"]),
  troco: z.number().min(0).max(10000).nullable().optional(),
  notes: z.string().max(500).optional().nullable(),
  items: z.array(itemSchema).min(1).max(50),
  delivery_fee: z.number().min(0).max(500).optional().nullable(),
  discount: z.number().min(0).max(5000).optional().nullable(),
  promotion_id: z.string().optional().nullable(),
  promotion_title: z.string().optional().nullable(),
  coupon_code: z.string().trim().max(32).optional().nullable(),
});

export const createOrder = createServerFn({ method: "POST" })
  .validator((raw: unknown) => createOrderSchema.parse(raw))
  .handler(async ({ data }) => {
    const { getOrdersCollection } = await import("./db");
    const { randomUUID } = await import("node:crypto");
    const { getEffectiveServerCatalogPricing } = await import("./menu.server");
    const { calculateFeeForNeighborhood } = await import("./delivery-config.server");
    const { listPublicPromotionsFromDb, consumePromotionUse, releasePromotionUse } =
      await import("./promotions.server");
    const { calculateVerifiedOrderPricing } = await import("./order-pricing");
    const { getSystemSettings } = await import("./settings.server");
    const { evaluateStoreOpenStatus, isDeliveryModeEnabled, isPaymentMethodEnabled } =
      await import("./store-hours");
    const { createOnlinePixPayment } = await import("./server/payments.server");
    const { dispatchN8nEvent } = await import("./server/n8n.server");

    const ordersCol = await getOrdersCollection();
    const orderId = randomUUID();
    const deliveryMode = data.delivery_mode || "delivery";

    const [catalogPricing, activePromotions, officialDeliveryFee, settings] = await Promise.all([
      getEffectiveServerCatalogPricing(),
      listPublicPromotionsFromDb(),
      deliveryMode === "delivery"
        ? calculateFeeForNeighborhood(data.neighborhood || "")
        : Promise.resolve(0),
      getSystemSettings(),
    ]);

    // Store operational checks (hours/pause, enabled delivery modes & payment methods)
    const storeStatus = evaluateStoreOpenStatus(settings);
    if (!storeStatus.isOpen) {
      throw new Error(storeStatus.reason);
    }
    if (!isDeliveryModeEnabled(deliveryMode, settings.enabled_delivery_modes)) {
      throw new Error("A modalidade de atendimento escolhida está temporariamente indisponível.");
    }
    if (!isPaymentMethodEnabled(data.payment_method, settings.enabled_payment_methods)) {
      throw new Error(
        `A forma de pagamento "${data.payment_method}" está temporariamente indisponível.`,
      );
    }

    // Strict Server-Side Recalculation & Anti-Tampering (OWASP A04:2021)
    const {
      validatedItems,
      subtotal,
      verifiedDiscount,
      verifiedDeliveryFee,
      total,
      promotionId,
      promotionTitle,
      appliedCouponCode,
    } = calculateVerifiedOrderPricing({
      items: data.items,
      deliveryMode,
      officialDeliveryFee,
      effectiveMenuPrices: catalogPricing.menuPrices,
      crustPrices: catalogPricing.crustPrices,
      activePromotions,
      couponCode: data.coupon_code,
    });

    const isOnlinePix = data.payment_method === "Pix";
    const paymentStatus: "pending" | "paid" | "failed" | "refunded" | "on_delivery" = isOnlinePix
      ? "pending"
      : "on_delivery";

    let paymentGateway: string | null = null;
    let gatewayPaymentId: string | null = null;
    let paymentDetails: {
      type: "pix";
      qr_code: string | null;
      qr_code_base64: string | null;
      expires_at: string | null;
    } | null = null;

    // Generate PIX payment BEFORE persisting the order to avoid orphaned pending orders on gateway failure
    if (isOnlinePix) {
      const pixResult = await createOnlinePixPayment({
        orderId,
        total,
        customerName: data.customer_name,
        customerPhone: data.customer_phone,
        settings,
      });
      paymentGateway = pixResult.paymentGateway;
      gatewayPaymentId = pixResult.gatewayPaymentId;
      paymentDetails = pixResult.paymentDetails;
    }

    let promotionReserved = false;
    if (promotionId) {
      const reserved = await consumePromotionUse(promotionId);
      if (!reserved) {
        throw new Error(
          appliedCouponCode
            ? `O cupom "${appliedCouponCode}" atingiu o limite máximo de usos.`
            : "A promoção aplicada atingiu o limite máximo de usos. Atualize o carrinho e tente novamente.",
        );
      }
      promotionReserved = true;
    }

    const now = new Date();
    const newOrder = {
      _id: orderId,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_address: data.customer_address,
      delivery_mode: deliveryMode,
      table_number: deliveryMode === "dine_in" ? (data.table_number ?? null) : null,
      payment_method: data.payment_method,
      troco: data.troco ?? null,
      notes: data.notes ?? null,
      subtotal,
      discount: verifiedDiscount,
      promotion_id: promotionId,
      promotion_title: promotionTitle,
      coupon_code: appliedCouponCode,
      promotion_released: false,
      total,
      delivery_fee: verifiedDeliveryFee,
      status: "novo" as const,
      payment_status: paymentStatus,
      payment_gateway: paymentGateway,
      gateway_payment_id: gatewayPaymentId,
      payment_details: paymentDetails,
      created_at: now,
      updated_at: now,
      preparing_at: null as Date | null,
      dispatched_at: null as Date | null,
      delivered_at: null as Date | null,
      canceled_at: null as Date | null,
      cancel_reason: null as string | null,
      items: validatedItems,
    };

    try {
      await ordersCol.insertOne(newOrder);
    } catch (insertErr) {
      if (promotionReserved && promotionId) {
        await releasePromotionUse(promotionId).catch((relErr) =>
          console.error("Failed to rollback reserved promotion use:", relErr),
        );
      }
      throw insertErr;
    }

    dispatchN8nEvent(settings.n8n_webhook_url, "order.created", {
      id: orderId,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_address: data.customer_address,
      delivery_mode: deliveryMode,
      table_number: newOrder.table_number,
      payment_method: data.payment_method,
      troco: data.troco,
      notes: data.notes,
      subtotal,
      discount: verifiedDiscount,
      delivery_fee: verifiedDeliveryFee,
      total,
      items: validatedItems,
      payment_status: paymentStatus,
      payment_details: paymentDetails,
    });

    return {
      id: orderId,
      subtotal,
      discount: verifiedDiscount,
      promotion_id: promotionId,
      promotion_title: promotionTitle,
      delivery_fee: verifiedDeliveryFee,
      total,
      delivery_mode: deliveryMode,
      table_number: newOrder.table_number,
      status: "novo" as const,
      payment_method: data.payment_method,
      payment_status: paymentStatus,
      payment_details: paymentDetails,
    };
  });

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireStaff])
  .handler(async () => {
    const { cancelExpiredPixOrders, findRecentOrdersForKds } =
      await import("./server/orders.server");

    // Non-blocking cleanup of Pix orders older than 30 minutes
    cancelExpiredPixOrders().catch((err) =>
      console.error("Error auto-canceling abandoned Pix orders:", err),
    );

    return findRecentOrdersForKds(200);
  });

const updateStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["novo", "preparando", "saiu", "entregue", "cancelado"]),
  cancel_reason: z.string().trim().max(200).optional(),
  courier_id: z.string().trim().max(80).nullable().optional(),
});

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .validator((raw: unknown) => updateStatusSchema.parse(raw))
  .handler(async ({ data }) => {
    const { getDb, getOrdersCollection } = await import("./db");
    const ordersCol = await getOrdersCollection();
    const orderBefore = await ordersCol.findOne({ _id: data.id });
    if (!orderBefore) {
      throw new Error("Pedido não encontrado.");
    }

    const now = new Date();
    const updateDoc: Record<string, unknown> = {
      status: data.status,
      updated_at: now,
    };

    if (data.status === "preparando" && !orderBefore?.preparing_at) {
      updateDoc.preparing_at = now;
    } else if (data.status === "saiu" && !orderBefore?.dispatched_at) {
      updateDoc.dispatched_at = now;
    } else if (data.status === "entregue" && !orderBefore?.delivered_at) {
      updateDoc.delivered_at = now;
    } else if (data.status === "cancelado" && !orderBefore?.canceled_at) {
      updateDoc.canceled_at = now;
      if (data.cancel_reason) updateDoc.cancel_reason = data.cancel_reason;
    }

    let resolvedCourierName: string | null | undefined = orderBefore.courier_name || null;
    if (data.courier_id !== undefined) {
      if (data.courier_id === null || data.courier_id === "") {
        updateDoc.courier_id = null;
        updateDoc.courier_name = null;
        updateDoc.courier_payout = null;
        resolvedCourierName = null;
      } else {
        const db = await getDb();
        const courier = await db
          .collection<{
            _id: string;
            name: string;
            payout_mode?: "delivery_fee" | "fixed";
            fixed_fee?: number;
            fee_share_percent?: number;
          }>("couriers")
          .findOne({ _id: data.courier_id });
        if (!courier) {
          throw new Error("Entregador selecionado não encontrado.");
        }
        const { calculateOrderCourierPayout } = await import("./couriers-domain");
        updateDoc.courier_id = courier._id;
        updateDoc.courier_name = courier.name;
        updateDoc.courier_payout = calculateOrderCourierPayout(
          Number(orderBefore.delivery_fee || 0),
          {
            payout_mode: courier.payout_mode === "fixed" ? "fixed" : "delivery_fee",
            fixed_fee: Number(courier.fixed_fee || 0),
            fee_share_percent:
              typeof courier.fee_share_percent === "number" ? courier.fee_share_percent : 100,
          },
        );
        resolvedCourierName = courier.name;
      }
    }

    const shouldReleasePromo =
      data.status === "cancelado" &&
      Boolean(orderBefore.promotion_id) &&
      !orderBefore.promotion_released;
    if (shouldReleasePromo) {
      updateDoc.promotion_released = true;
    }

    const result = await ordersCol.updateOne(
      shouldReleasePromo ? { _id: data.id, promotion_released: { $ne: true } } : { _id: data.id },
      { $set: updateDoc },
    );

    if (result.matchedCount === 0) {
      const stillExists = await ordersCol.findOne({ _id: data.id });
      if (!stillExists) {
        throw new Error("Pedido não encontrado.");
      }
      await ordersCol.updateOne(
        { _id: data.id },
        { $set: { ...updateDoc, promotion_released: true } },
      );
    } else if (shouldReleasePromo) {
      const { releasePromotionUse } = await import("./promotions.server");
      await releasePromotionUse(String(orderBefore.promotion_id)).catch((err) =>
        console.error("Failed to release promotion use on cancellation:", err),
      );
    }

    // Notify n8n ONLY for essential delivery updates ("saiu" and "cancelado")
    if (data.status === "saiu" || data.status === "cancelado") {
      const { getSystemSettings } = await import("./settings.server");
      const { dispatchN8nEvent } = await import("./server/n8n.server");
      const settings = await getSystemSettings();
      dispatchN8nEvent(settings.n8n_webhook_url, "order.status_updated", {
        id: data.id,
        customer_name: orderBefore?.customer_name,
        customer_phone: orderBefore?.customer_phone,
        customer_address: orderBefore?.customer_address,
        delivery_mode: orderBefore?.delivery_mode || "delivery",
        courier_name: resolvedCourierName || undefined,
        status: data.status,
        previous_status: orderBefore?.status,
        total: orderBefore?.total,
      });
    }

    return { ok: true };
  });

export const confirmOrderPayment = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .validator((raw: unknown) => z.object({ id: z.string().min(1) }).parse(raw))
  .handler(async ({ data }) => {
    const { getOrdersCollection } = await import("./db");
    const ordersCol = await getOrdersCollection();

    const updatedOrder = await ordersCol.findOneAndUpdate(
      { _id: data.id, payment_status: { $ne: "paid" } },
      {
        $set: {
          payment_status: "paid",
          updated_at: new Date(),
        },
      },
      { returnDocument: "after" },
    );

    if (!updatedOrder) {
      return { ok: true, alreadyPaid: true };
    }

    const { getSystemSettings } = await import("./settings.server");
    const { dispatchN8nEvent } = await import("./server/n8n.server");
    const settings = await getSystemSettings();
    dispatchN8nEvent(settings.n8n_webhook_url, "order.paid", {
      id: updatedOrder._id,
      customer_name: updatedOrder.customer_name,
      customer_phone: updatedOrder.customer_phone,
      customer_address: updatedOrder.customer_address,
      delivery_mode: updatedOrder.delivery_mode || "delivery",
      payment_method: updatedOrder.payment_method,
      total: updatedOrder.total,
      status: updatedOrder.status,
      payment_status: "paid",
      items: updatedOrder.items,
    });

    return { ok: true };
  });

const orderStatusQuerySchema = z.union([
  z.string().trim().min(1).max(80),
  z.object({ id: z.string().trim().min(1).max(80) }).transform((o) => o.id),
  z.object({ data: z.string().trim().min(1).max(80) }).transform((o) => o.data),
]);

// Lightweight public order status lookup for customer tracking
export const getOrderStatus = createServerFn({ method: "GET" })
  .validator((raw: unknown) => orderStatusQuerySchema.parse(raw))
  .handler(async ({ data: orderId }) => {
    const { getOrdersCollection } = await import("./db");
    const ordersCol = await getOrdersCollection();
    const order = await ordersCol.findOne({ _id: orderId });
    if (!order) return null;
    return {
      id: order._id,
      customer_name: order.customer_name,
      total: order.total,
      delivery_mode: order.delivery_mode || "delivery",
      payment_method: order.payment_method,
      status: order.status,
      payment_status: order.payment_status,
      payment_details: order.payment_details,
      created_at: order.created_at?.toISOString ? order.created_at.toISOString() : order.created_at,
    };
  });

const financialReportSchema = z.object({
  period: z.enum(["today", "7d", "30d", "all"]).default("today"),
});

export const getFinancialReport = createServerFn({ method: "GET" })
  .middleware([requireSupervisorOrAdmin])
  .validator((raw: unknown) => financialReportSchema.parse(raw ?? {}))
  .handler(async ({ data, context }): Promise<FinancialReportResponse> => {
    const isAdmin = Boolean(context.roles?.includes("admin"));
    const { buildFinancialReportFromDb } = await import("./server/orders.server");
    return buildFinancialReportFromDb(data.period, isAdmin);
  });

export const exportFinancialOrdersCsv = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((raw: unknown) => financialReportSchema.parse(raw ?? {}))
  .handler(async ({ data }): Promise<string> => {
    const { exportFinancialCsvFromDb } = await import("./server/orders.server");
    return exportFinancialCsvFromDb(data.period);
  });
