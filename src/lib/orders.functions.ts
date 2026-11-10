import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "./auth-middleware";

const itemSchema = z.object({
  pizza_id: z.string().min(1).max(60),
  flavor2_id: z.string().max(60).nullable().optional(),
  crust_id: z.string().max(40).nullable().optional(),
  pizza_name: z.string().min(1).max(160),
  quantity: z.number().int().min(1).max(50),
  unit_price: z.number().min(0).max(5000),
});

const createOrderSchema = z.object({
  customer_name: z.string().trim().min(2).max(120),
  customer_phone: z.string().trim().min(8).max(30),
  customer_address: z.string().trim().min(5).max(400),
  delivery_mode: z.enum(["delivery", "pickup", "dine_in"]).optional(),
  neighborhood: z.string().max(100).nullable().optional(),
  payment_method: z.enum(["Pix", "Dinheiro", "Cartão de crédito", "Cartão de débito"]),
  troco: z.number().min(0).max(10000).nullable().optional(),
  notes: z.string().max(500).optional().nullable(),
  items: z.array(itemSchema).min(1).max(50),
  delivery_fee: z.number().min(0).max(500).optional().nullable(),
  discount: z.number().min(0).max(5000).optional().nullable(),
  promotion_id: z.string().optional().nullable(),
  promotion_title: z.string().optional().nullable(),
});

function generateStaticPix(key: string, name: string, city: string, amount: number, txid = "PIZZARIA"): string {
  const cleanKey = key.trim();
  const cleanName = name.slice(0, 25).trim();
  const cleanCity = city.slice(0, 15).trim();

  const formatField = (id: string, value: string) => {
    const len = String(value.length).padStart(2, "0");
    return `${id}${len}${value}`;
  };

  const merchantAccountInfo =
    formatField("00", "br.gov.bcb.pix") +
    formatField("01", cleanKey);

  const payload = [
    formatField("00", "01"),
    formatField("26", merchantAccountInfo),
    formatField("52", "0000"),
    formatField("53", "986"),
    formatField("54", amount.toFixed(2)),
    formatField("58", "BR"),
    formatField("59", cleanName),
    formatField("60", cleanCity),
    formatField("62", formatField("05", txid)),
    "6304",
  ].join("");

  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    const byte = payload.charCodeAt(i);
    crc ^= byte << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  const crcString = crc.toString(16).toUpperCase().padStart(4, "0");
  return payload + crcString;
}

export const createOrder = createServerFn({ method: "POST" })
  .validator((raw: unknown) => createOrderSchema.parse(raw))
  .handler(async ({ data }) => {
    const { getOrdersCollection } = await import("./db");
    const { randomUUID } = await import("node:crypto");
    const { SERVER_CRUST_PRICES } = await import("./menu-prices");
    const { getEffectiveServerMenuPrices } = await import("./menu.server");
    const { calculateFeeForNeighborhood } = await import("./delivery-config.server");
    const { listPublicPromotionsFromDb } = await import("./promotions.server");

    const ordersCol = await getOrdersCollection();
    const orderId = randomUUID();

    const effectiveMenuPrices = await getEffectiveServerMenuPrices();
    const activePromotions = await listPublicPromotionsFromDb();
    const matchedPromo = data.promotion_id
      ? activePromotions.find((p) => p._id === data.promotion_id)
      : null;

    // 🔒 Server-Side Price Recalculation & Anti-Tampering (OWASP A04:2021)
    let rewardGiftUsed = false;
    const validatedItems = data.items.map((i) => {
      let finalUnitPrice = Math.max(0, i.unit_price);
      const catalogItem1 = effectiveMenuPrices[i.pizza_id];
      const catalogItem2 = i.flavor2_id ? effectiveMenuPrices[i.flavor2_id] : null;
      const crustItem = i.crust_id ? SERVER_CRUST_PRICES[i.crust_id] : null;

      if (catalogItem1 && catalogItem1.available === false) {
        throw new Error(`O item "${catalogItem1.name}" está temporariamente esgotado.`);
      }
      if (catalogItem2 && catalogItem2.available === false) {
        throw new Error(`O sabor "${catalogItem2.name}" está temporariamente esgotado.`);
      }

      if (catalogItem1) {
        const basePrice = catalogItem2
          ? Math.max(catalogItem1.price, catalogItem2.price)
          : catalogItem1.price;
        const crustPrice = crustItem ? crustItem.price : 0;
        const officialPrice = basePrice + crustPrice;

        const isAllowedPromoReward =
          !rewardGiftUsed &&
          matchedPromo &&
          matchedPromo.reward_item_id === i.pizza_id &&
          i.quantity === 1 &&
          matchedPromo.type === "BUY_X_GET_Y";

        if (isAllowedPromoReward) {
          rewardGiftUsed = true;
          const rewardDiscPct =
            matchedPromo.reward_discount_percent !== undefined
              ? matchedPromo.reward_discount_percent
              : 100;
          const expectedRewardPrice = Number(
            Math.max(0, officialPrice * (1 - rewardDiscPct / 100)).toFixed(2)
          );
          finalUnitPrice = Math.max(expectedRewardPrice, i.unit_price);
        } else {
          finalUnitPrice = Math.max(officialPrice, finalUnitPrice);
        }
      }

      return {
        pizza_id: i.pizza_id,
        pizza_name: i.pizza_name,
        quantity: Math.max(1, i.quantity),
        unit_price: Number(finalUnitPrice.toFixed(2)),
      };
    });

    const subtotal = validatedItems.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);

    // Server-side delivery fee verification
    const deliveryMode = data.delivery_mode || "delivery";
    let verifiedDeliveryFee = 0;
    if (deliveryMode === "pickup" || deliveryMode === "dine_in") {
      verifiedDeliveryFee = 0;
    } else if (data.neighborhood) {
      const officialFee = await calculateFeeForNeighborhood(data.neighborhood);
      verifiedDeliveryFee = Math.max(officialFee, data.delivery_fee || 0);
    } else {
      verifiedDeliveryFee = Math.max(0, data.delivery_fee || 0);
    }

    // Server-side discount verification
    let verifiedDiscount = Math.max(0, data.discount || 0);
    if (matchedPromo) {
      if (matchedPromo.type === "PERCENTAGE_DISCOUNT" && matchedPromo.discount_value) {
        const maxAllowed = Number(((subtotal * matchedPromo.discount_value) / 100).toFixed(2));
        verifiedDiscount = Math.min(verifiedDiscount, maxAllowed);
      } else if (matchedPromo.type === "FIXED_DISCOUNT" && matchedPromo.discount_value) {
        verifiedDiscount = Math.min(verifiedDiscount, matchedPromo.discount_value);
      } else if (matchedPromo.type === "BUY_X_GET_Y") {
        verifiedDiscount = 0;
      }
    } else if (!data.promotion_id) {
      verifiedDiscount = 0;
    }
    verifiedDiscount = Math.min(subtotal, verifiedDiscount);

    const total = Number(Math.max(0, subtotal - verifiedDiscount + verifiedDeliveryFee).toFixed(2));

    const isOnlinePix = data.payment_method === "Pix";
    const isOnlineCard = false;
    const isOnlinePayment = isOnlinePix;

    let paymentDetails: any = null;
    let gatewayPaymentId: string | null = null;
    const paymentStatus: "pending" | "paid" | "failed" | "refunded" | "on_delivery" = isOnlinePayment
      ? "pending"
      : "on_delivery";

    // Insert order document
    const newOrder = {
      _id: orderId,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_address: data.customer_address,
      delivery_mode: deliveryMode,
      payment_method: data.payment_method,
      troco: data.troco ?? null,
      notes: data.notes ?? null,
      subtotal,
      discount: verifiedDiscount,
      promotion_id: matchedPromo ? matchedPromo._id : data.promotion_id ?? null,
      promotion_title: matchedPromo ? matchedPromo.title : data.promotion_title ?? null,
      total,
      delivery_fee: verifiedDeliveryFee,
      status: "novo" as const,
      payment_status: paymentStatus,
      payment_gateway: null as string | null,
      gateway_payment_id: null as string | null,
      payment_details: null as any,
      created_at: new Date(),
      updated_at: new Date(),
      items: validatedItems,
    };

    await ordersCol.insertOne(newOrder);

    if (isOnlinePayment) {
      const { getSystemSettings } = await import("./settings.server");
      const settings = await getSystemSettings();
      const accessToken = settings.mercado_pago_access_token;
      if (!accessToken && !process.env.STATIC_PIX_KEY) {
        console.error("MERCADO_PAGO_ACCESS_TOKEN is missing in environment/database settings.");
        throw new Error("Erro na configuração de pagamentos online. Entre em contato com a pizzaria.");
      }

      if (isOnlinePix) {
        try {
          const staticPixKey = process.env.STATIC_PIX_KEY;
          if (staticPixKey) {
            const name = process.env.STATIC_PIX_NAME || "Pizzaria Imperio";
            const city = process.env.STATIC_PIX_CITY || "Sao Paulo";
            const pixPayload = generateStaticPix(staticPixKey, name, city, total, orderId.slice(0, 8));

            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixPayload)}`;
            const qrResponse = await fetch(qrCodeUrl);
            const qrBuffer = await qrResponse.arrayBuffer();
            const qrCodeBase64 = Buffer.from(qrBuffer).toString("base64");

            paymentDetails = {
              type: "pix",
              qr_code: pixPayload,
              qr_code_base64: qrCodeBase64,
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            };
          } else {
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
          throw new Error(err instanceof Error ? err.message : "Não foi possível gerar a cobrança Pix. Tente novamente.");
        }
      } else if (isOnlineCard) {
        try {
          const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            signal: AbortSignal.timeout(6000),
            body: JSON.stringify({
              items: validatedItems.map((item) => ({
                id: item.pizza_id,
                title: item.pizza_name,
                unit_price: Number(item.unit_price.toFixed(2)),
                quantity: item.quantity,
                currency_id: "BRL",
              })),
              shipments:
                verifiedDeliveryFee > 0
                  ? {
                      cost: Number(verifiedDeliveryFee.toFixed(2)),
                      mode: "not_specified",
                    }
                  : undefined,
              external_reference: orderId,
              back_urls: {
                success: `${process.env.APP_URL || "https://imperio.embraganca.com.br"}?order_id=${orderId}`,
                pending: `${process.env.APP_URL || "https://imperio.embraganca.com.br"}?order_id=${orderId}`,
                failure: `${process.env.APP_URL || "https://imperio.embraganca.com.br"}?order_id=${orderId}`,
              },
              auto_return: "approved",
              statement_descriptor: "PIZZARIA IMPERIO",
            }),
          });

          if (!response.ok) {
            const errBody = await response.text();
            console.error("Mercado Pago Preference creation failed:", errBody);
            throw new Error("Erro ao criar preferência de pagamento no Mercado Pago.");
          }

          const prefData = await response.json();
          paymentDetails = {
            type: "mercadopago_preference",
            preference_id: prefData.id,
            init_point: prefData.init_point,
          };
        } catch (err) {
          console.error("Card processing failed:", err);
          throw new Error(err instanceof Error ? err.message : "Não foi possível gerar o link de pagamento. Tente novamente.");
        }
      }

      await ordersCol.updateOne(
        { _id: orderId },
        {
          $set: {
            payment_gateway: "mercadopago",
            gateway_payment_id: gatewayPaymentId,
            payment_details: paymentDetails,
            updated_at: new Date(),
          },
        }
      );
    }

    // Trigger n8n webhook asynchronously if configured
    const { getSystemSettings } = await import("./settings.server");
    const settings = await getSystemSettings();
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
      delivery_fee: verifiedDeliveryFee,
      total,
      delivery_mode: deliveryMode,
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

    return orders.map((o: any) => ({
      id: o._id,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      customer_address: o.customer_address,
      delivery_mode: o.delivery_mode || "delivery",
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
      payment_status: o.payment_status,
      payment_gateway: o.payment_gateway,
      gateway_payment_id: o.gateway_payment_id,
      payment_details: o.payment_details,
      order_items: (o.items || []).map((item: any, idx: number) => ({
        id: item.id || `item-${idx}`,
        pizza_name: item.pizza_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price,
      })),
    }));
  });

const updateStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["novo", "preparando", "saiu", "entregue", "cancelado"]),
});

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((raw: unknown) => updateStatusSchema.parse(raw))
  .handler(async ({ data, context }) => {
    if (!context.roles?.some((r) => ["admin", "supervisor", "atendente"].includes(r))) {
      throw new Error("Acesso restrito.");
    }

    const { getOrdersCollection } = await import("./db");
    const ordersCol = await getOrdersCollection();
    const orderBefore = await ordersCol.findOne({ _id: data.id });

    const result = await ordersCol.updateOne(
      { _id: data.id },
      {
        $set: {
          status: data.status,
          updated_at: new Date(),
        },
      }
    );

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
  .validator((raw: unknown) => z.string().parse(raw))
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
