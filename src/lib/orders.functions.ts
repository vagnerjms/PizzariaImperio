import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "./auth-middleware";
import { generateStaticPix } from "./pix";

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
});

export const createOrder = createServerFn({ method: "POST" })
  .validator((raw: unknown) => createOrderSchema.parse(raw))
  .handler(async ({ data }) => {
    const { getOrdersCollection } = await import("./db");
    const { randomUUID } = await import("node:crypto");
    const { SERVER_CRUST_PRICES } = await import("./menu-prices");
    const { getEffectiveServerMenuPrices } = await import("./menu.server");
    const { calculateFeeForNeighborhood } = await import("./delivery-config.server");
    const { listPublicPromotionsFromDb } = await import("./promotions.server");
    const { calculateVerifiedOrderPricing } = await import("./order-pricing");
    const { getSystemSettings } = await import("./settings.server");
    const {
      evaluateStoreOpenStatus,
      isDeliveryModeEnabled,
      isPaymentMethodEnabled,
    } = await import("./store-hours");

    const ordersCol = await getOrdersCollection();
    const orderId = randomUUID();
    const deliveryMode = data.delivery_mode || "delivery";

    const [effectiveMenuPrices, activePromotions, officialDeliveryFee, settings] =
      await Promise.all([
        getEffectiveServerMenuPrices(),
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
        `A forma de pagamento "${data.payment_method}" está temporariamente indisponível.`
      );
    }

    // 🔒 Strict Server-Side Recalculation & Anti-Tampering (OWASP A04:2021)
    const {
      validatedItems,
      subtotal,
      verifiedDiscount,
      verifiedDeliveryFee,
      total,
      promotionId,
      promotionTitle,
    } = calculateVerifiedOrderPricing({
      items: data.items,
      deliveryMode,
      officialDeliveryFee,
      effectiveMenuPrices,
      crustPrices: SERVER_CRUST_PRICES,
      activePromotions,
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
      const accessToken = settings.mercado_pago_access_token;
      const staticPixKey = process.env.STATIC_PIX_KEY;

      if (!accessToken && !staticPixKey) {
        console.error("MERCADO_PAGO_ACCESS_TOKEN is missing in environment/database settings.");
        throw new Error(
          "Erro na configuração de pagamentos online. Entre em contato com a pizzaria."
        );
      }

      try {
        if (staticPixKey) {
          paymentGateway = "static_pix";
          const name = process.env.STATIC_PIX_NAME || "Pizzaria Imperio";
          const city = process.env.STATIC_PIX_CITY || "Braganca Paulista";
          const pixPayload = generateStaticPix(
            staticPixKey,
            name,
            city,
            total,
            orderId.slice(0, 8)
          );

          let qrCodeBase64: string | null = null;
          try {
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixPayload)}`;
            const qrResponse = await fetch(qrCodeUrl, {
              signal: AbortSignal.timeout(5000),
            });
            if (qrResponse.ok) {
              const qrBuffer = await qrResponse.arrayBuffer();
              qrCodeBase64 = Buffer.from(qrBuffer).toString("base64");
            }
          } catch (qrErr) {
            console.warn("Static Pix QR image generation timed out, falling back to copy-paste code:", qrErr);
          }

          paymentDetails = {
            type: "pix",
            qr_code: pixPayload,
            qr_code_base64: qrCodeBase64,
            // Align displayed expiration with the 30-minute auto-cancel window in listOrders
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          };
        } else {
          paymentGateway = "mercadopago";
          const phoneClean = data.customer_phone.replace(/\D/g, "");
          const phoneArea = phoneClean.slice(0, 2) || "11";
          const phoneNumber = phoneClean.slice(2) || "999999999";

          const response = await fetch("https://api.mercadopago.com/v1/payments", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
              "X-Idempotency-Key": orderId,
            },
            signal: AbortSignal.timeout(6000),
            body: JSON.stringify({
              transaction_amount: Number(total.toFixed(2)),
              description: `Pedido ${orderId.slice(0, 8)} - Pizzaria Império`,
              payment_method_id: "pix",
              external_reference: orderId,
              payer: {
                email: "cliente@pizzariaimperio011.com",
                first_name: data.customer_name.split(" ")[0] || "Cliente",
                last_name: data.customer_name.split(" ").slice(1).join(" ") || "Pizzaria",
                phone: {
                  area_code: phoneArea,
                  number: phoneNumber,
                },
              },
            }),
          });

          if (!response.ok) {
            const errBody = await response.text();
            console.error("Mercado Pago Pix creation failed:", errBody);
            throw new Error("Erro ao gerar pagamento Pix no Mercado Pago.");
          }

          const paymentData = await response.json();
          gatewayPaymentId = String(paymentData.id);

          paymentDetails = {
            type: "pix",
            qr_code: paymentData.point_of_interaction?.transaction_data?.qr_code,
            qr_code_base64: paymentData.point_of_interaction?.transaction_data?.qr_code_base64,
            expires_at: paymentData.date_of_expiration,
          };
        }
      } catch (err) {
        console.error("Pix processing failed:", err);
        throw new Error(
          err instanceof Error
            ? err.message
            : "Não foi possível gerar a cobrança Pix. Tente novamente."
        );
      }
    }

    // Insert verified order document (including payment metadata when Pix succeeded)
    const now = new Date();
    const newOrder = {
      _id: orderId,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_address: data.customer_address,
      delivery_mode: deliveryMode,
      table_number: deliveryMode === "dine_in" ? data.table_number ?? null : null,
      payment_method: data.payment_method,
      troco: data.troco ?? null,
      notes: data.notes ?? null,
      subtotal,
      discount: verifiedDiscount,
      promotion_id: promotionId,
      promotion_title: promotionTitle,
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

    await ordersCol.insertOne(newOrder);

    // Trigger n8n webhook asynchronously if configured
    const n8nWebhookUrl = settings.n8n_webhook_url;

    if (n8nWebhookUrl) {
      console.log(`[Order Created] Dispatching webhook to n8n: ${n8nWebhookUrl} (Order: ${orderId})`);
      fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "order.created",
          order: {
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
          },
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            console.error(`[n8n Webhook Error] n8n returned HTTP ${res.status}:`, await res.text());
          } else {
            console.log(`[n8n Webhook Success] Event order.created delivered successfully for order ${orderId}.`);
          }
        })
        .catch((err) => console.error("Failed to notify n8n webhook on order creation:", err));
    }

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
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    if (!context.roles?.some((r) => ["admin", "supervisor", "atendente"].includes(r))) {
      throw new Error("Acesso restrito.");
    }

    const { getOrdersCollection } = await import("./db");
    const ordersCol = await getOrdersCollection();

    // Auto-cancel abandoned Pix orders older than 30 minutes (non-blocking)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    ordersCol
      .updateMany(
        {
          payment_method: "Pix",
          payment_status: "pending",
          status: "novo",
          created_at: { $lt: thirtyMinutesAgo },
        },
        {
          $set: {
            status: "cancelado",
            payment_status: "failed",
            canceled_at: new Date(),
            cancel_reason: "Pix expirado automaticamente após 30 minutos",
            updated_at: new Date(),
          },
        }
      )
      .catch((err) => console.error("Error auto-canceling abandoned Pix orders:", err));

    const orders = await ordersCol
      .find({})
      .sort({ created_at: -1 })
      .limit(200)
      .toArray();

    const toIsoOrNull = (val: unknown): string | null => {
      if (!val) return null;
      if (val instanceof Date) return val.toISOString();
      if (typeof val === "string") return val;
      return null;
    };

    return orders.map((o: any) => ({
      id: o._id,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      customer_address: o.customer_address,
      delivery_mode: o.delivery_mode || "delivery",
      table_number: o.table_number || null,
      courier_id: o.courier_id || null,
      courier_name: o.courier_name || null,
      courier_payout: typeof o.courier_payout === "number" ? o.courier_payout : null,
      payment_method: o.payment_method,
      troco: o.troco,
      notes: o.notes || null,
      subtotal: o.subtotal || o.total,
      discount: o.discount || 0,
      promotion_id: o.promotion_id || null,
      promotion_title: o.promotion_title || null,
      total: o.total,
      delivery_fee: o.delivery_fee,
      status: o.status,
      created_at: o.created_at.toISOString(),
      updated_at: o.updated_at.toISOString(),
      preparing_at: toIsoOrNull(o.preparing_at),
      dispatched_at: toIsoOrNull(o.dispatched_at),
      delivered_at: toIsoOrNull(o.delivered_at),
      canceled_at: toIsoOrNull(o.canceled_at),
      cancel_reason: o.cancel_reason || null,
      payment_status: o.payment_status,
      payment_gateway: o.payment_gateway,
      gateway_payment_id: o.gateway_payment_id,
      payment_details: o.payment_details,
      order_items: (o.items || []).map((item: any, idx: number) => ({
        id: item.id || `item-${idx}`,
        pizza_id: item.pizza_id,
        flavor2_id: item.flavor2_id ?? null,
        crust_id: item.crust_id ?? null,
        base_pizza_name: item.base_pizza_name,
        pizza_name: item.pizza_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price,
        is_reward: item.is_reward ?? false,
      })),
    }));
  });

const updateStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["novo", "preparando", "saiu", "entregue", "cancelado"]),
  cancel_reason: z.string().trim().max(200).optional(),
  courier_id: z.string().trim().max(80).nullable().optional(),
});

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((raw: unknown) => updateStatusSchema.parse(raw))
  .handler(async ({ data, context }) => {
    if (!context.roles?.some((r) => ["admin", "supervisor", "atendente"].includes(r))) {
      throw new Error("Acesso restrito.");
    }

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
          }
        );
        resolvedCourierName = courier.name;
      }
    }

    const result = await ordersCol.updateOne({ _id: data.id }, { $set: updateDoc });

    if (result.matchedCount === 0) {
      throw new Error("Pedido não encontrado.");
    }

    // Notify n8n ONLY for essential delivery updates ("saiu" and "cancelado")
    const { getSystemSettings } = await import("./settings.server");
    const settings = await getSystemSettings();
    const n8nWebhookUrl = settings.n8n_webhook_url;
    const shouldNotify = ["saiu", "cancelado"].includes(data.status);

    if (n8nWebhookUrl && shouldNotify) {
      console.log(`[Order Status Updated] Dispatching webhook to n8n: ${n8nWebhookUrl} (Order: ${data.id}, Status: ${data.status})`);
      fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "order.status_updated",
          order: {
            id: data.id,
            customer_name: orderBefore?.customer_name,
            customer_phone: orderBefore?.customer_phone,
            customer_address: orderBefore?.customer_address,
            delivery_mode: orderBefore?.delivery_mode || "delivery",
            courier_name: resolvedCourierName || undefined,
            status: data.status,
            previous_status: orderBefore?.status,
            total: orderBefore?.total,
          },
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            console.error(`[n8n Status Update Error] n8n returned HTTP ${res.status}:`, await res.text());
          } else {
            console.log(`[n8n Status Update Success] Event order.status_updated (${data.status}) delivered successfully.`);
          }
        })
        .catch((err) => console.error("Failed to notify n8n webhook on status update:", err));
    }

    return { ok: true };
  });

export const confirmOrderPayment = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((raw: unknown) => z.object({ id: z.string() }).parse(raw))
  .handler(async ({ data, context }) => {
    if (!context.roles?.some((r) => ["admin", "supervisor", "atendente"].includes(r))) {
      throw new Error("Acesso restrito.");
    }

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
      { returnDocument: "after" }
    );

    if (!updatedOrder) {
      return { ok: true, alreadyPaid: true };
    }

    const { getSystemSettings } = await import("./settings.server");
    const settings = await getSystemSettings();
    const n8nWebhookUrl = settings.n8n_webhook_url;

    if (n8nWebhookUrl) {
      fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "order.paid",
          order: {
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
          },
        }),
      }).catch((err) => console.error("Failed to notify n8n on manual payment confirmation:", err));
    }

    return { ok: true };
  });

// A lightweight status checking helper function for clients
export const getOrderStatus = createServerFn({ method: "GET" })
  .validator((raw: unknown) => {
    if (typeof raw === "string") return raw;
    if (raw && typeof raw === "object") {
      if ("id" in raw && typeof (raw as any).id === "string") return (raw as any).id;
      if ("data" in raw && typeof (raw as any).data === "string") return (raw as any).data;
    }
    return String(raw || "");
  })
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
