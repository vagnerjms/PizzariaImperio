import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";
import { requireAuth } from "./auth-middleware";
import { getOrdersCollection } from "./db";

const itemSchema = z.object({
  pizza_id: z.string().min(1).max(60),
  pizza_name: z.string().min(1).max(120),
  quantity: z.number().int().min(1).max(50),
  unit_price: z.number().min(0).max(5000),
});

const createOrderSchema = z.object({
  customer_name: z.string().trim().min(2).max(120),
  customer_phone: z.string().trim().min(8).max(30),
  customer_address: z.string().trim().min(5).max(400),
  payment_method: z.enum(["Pix", "Dinheiro", "Cartão de crédito", "Cartão de débito"]),
  troco: z.number().min(0).max(10000).nullable().optional(),
  notes: z.string().max(500).optional().nullable(),
  items: z.array(itemSchema).min(1).max(50),
  delivery_fee: z.number().min(0).max(500).optional().nullable(),
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
    "6304"
  ].join("");

  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    const byte = payload.charCodeAt(i);
    crc ^= (byte << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  const crcString = crc.toString(16).toUpperCase().padStart(4, "0");
  return payload + crcString;
}

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => createOrderSchema.parse(raw))
  .handler(async ({ data }) => {
    const ordersCol = await getOrdersCollection();
    const orderId = crypto.randomUUID();
    const subtotal = data.items.reduce((acc, i) => acc + (Math.max(0, i.unit_price) * Math.max(1, i.quantity)), 0);
    const verifiedDeliveryFee = Math.max(0, data.delivery_fee || 0);
    const total = Number((subtotal + verifiedDeliveryFee).toFixed(2));

    const isOnlinePix = data.payment_method === "Pix";
    const isOnlineCard = data.payment_method === "Cartão de crédito";
    const isOnlinePayment = isOnlinePix || isOnlineCard;

    let paymentDetails: any = null;
    let gatewayPaymentId: string | null = null;
    let paymentStatus: "pending" | "paid" | "failed" | "refunded" | "on_delivery" = isOnlinePayment ? "pending" : "on_delivery";

    // Insert order document
    const newOrder = {
      _id: orderId,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_address: data.customer_address,
      payment_method: data.payment_method,
      troco: data.troco ?? null,
      notes: data.notes ?? null,
      total,
      delivery_fee: data.delivery_fee || 0,
      status: "novo" as const,
      payment_status: paymentStatus,
      payment_gateway: null as string | null,
      gateway_payment_id: null as string | null,
      payment_details: null as any,
      created_at: new Date(),
      updated_at: new Date(),
      items: data.items.map((i) => ({
        pizza_id: i.pizza_id,
        pizza_name: i.pizza_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
    };

    await ordersCol.insertOne(newOrder);

    if (isOnlinePayment) {
      const { getSystemSettings } = await import("./settings.server");
      const settings = await getSystemSettings();
      const accessToken = settings.mercado_pago_access_token;
      if (!accessToken) {
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

            // Fetch QR code image from public API and convert to base64
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
                "Authorization": `Bearer ${accessToken}`,
                "X-Idempotency-Key": orderId,
              },
              body: JSON.stringify({
                transaction_amount: Number(total.toFixed(2)),
                description: `Pedido ${orderId.slice(0, 8)} - Pizzaria Império`,
                payment_method_id: "pix",
                payer: {
                  email: "cliente@pizzariaimperio011.com",
                  first_name: data.customer_name.split(" ")[0] || "Cliente",
                  last_name: data.customer_name.split(" ").slice(1).join(" ") || "Pizzaria",
                  phone: {
                    area_code: phoneArea,
                    number: phoneNumber,
                  }
                }
              })
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
          const { getWebRequest } = await import("@tanstack/react-start/server");
          const req = getWebRequest();
          const host = req?.headers.get("host") || "localhost:3000";
          const protocol = req?.headers.get("x-forwarded-proto") || "http";
          const baseUrl = `${protocol}://${host}`;

          const response = await fetch("https://api.mercadopago.com/v1/preferences", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              items: [
                {
                  id: orderId,
                  title: `Pedido ${orderId.slice(0, 8)} - Pizzaria Império`,
                  quantity: 1,
                  unit_price: Number(total.toFixed(2)),
                  currency_id: "BRL"
                }
              ],
              back_urls: {
                success: `${baseUrl}/?payment_result=success&order_id=${orderId}`,
                failure: `${baseUrl}/?payment_result=failure&order_id=${orderId}`,
                pending: `${baseUrl}/?payment_result=pending&order_id=${orderId}`,
              },
              auto_return: "approved",
              external_reference: orderId,
            })
          });

          if (!response.ok) {
            const errBody = await response.text();
            console.error("Mercado Pago Preference creation failed:", errBody);
            throw new Error("Erro ao criar preferência de checkout no Mercado Pago.");
          }

          const prefData = await response.json();
          gatewayPaymentId = String(prefData.id);
          paymentDetails = {
            type: "card",
            preference_id: prefData.id,
            init_point: prefData.init_point,
            sandbox_init_point: prefData.sandbox_init_point,
          };
        } catch (err) {
          console.error("Card preference creation failed:", err);
          throw new Error(err instanceof Error ? err.message : "Não foi possível iniciar o checkout de cartão. Tente novamente.");
        }
      }

      await ordersCol.updateOne(
        { _id: orderId },
        {
          $set: {
            payment_status: paymentStatus,
            payment_gateway: "mercado_pago",
            gateway_payment_id: gatewayPaymentId,
            payment_details: paymentDetails,
            updated_at: new Date(),
          },
        }
      );
    }

    // Try to notify n8n of the new order
    const { getSystemSettings } = await import("./settings.server");
    const settings = await getSystemSettings();
    const n8nWebhookUrl = settings.n8n_webhook_url;
    if (n8nWebhookUrl) {
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
            payment_method: data.payment_method,
            troco: data.troco ?? null,
            notes: data.notes ?? null,
            total,
            payment_status: paymentStatus,
            payment_details: paymentDetails,
            items: data.items,
          }
        }),
      }).catch((err) => console.error("Failed to notify n8n webhook:", err));
    }

    return {
      id: orderId,
      total,
      payment_status: paymentStatus,
      payment_details: paymentDetails,
    };
  });

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    if (!context.roles?.some(r => ["admin", "supervisor", "atendente"].includes(r))) {
      throw new Error("Acesso restrito.");
    }

    const ordersCol = await getOrdersCollection();
    const orders = await ordersCol
      .find({})
      .sort({ created_at: -1 })
      .limit(200)
      .toArray();

    return orders.map((o) => ({
      id: o._id,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      customer_address: o.customer_address,
      payment_method: o.payment_method,
      troco: o.troco,
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
  .inputValidator((raw: unknown) => updateStatusSchema.parse(raw))
  .handler(async ({ data, context }) => {
    if (!context.roles?.some(r => ["admin", "supervisor", "atendente"].includes(r))) {
      throw new Error("Acesso restrito.");
    }

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

    // Try to notify n8n of the status change
    const { getSystemSettings } = await import("./settings.server");
    const settings = await getSystemSettings();
    const n8nWebhookUrl = settings.n8n_webhook_url;
    if (n8nWebhookUrl) {
      fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "order.status_updated",
          order: {
            id: data.id,
            customer_name: orderBefore?.customer_name,
            customer_phone: orderBefore?.customer_phone,
            status: data.status,
            previous_status: orderBefore?.status,
            total: orderBefore?.total,
          }
        }),
      }).catch((err) => console.error("Failed to notify n8n webhook on status update:", err));
    }

    return { ok: true };
  });

// A lightweight status checking helper function for clients
export const getOrderStatus = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.string().parse(raw))
  .handler(async ({ data: orderId }) => {
    const ordersCol = await getOrdersCollection();
    const order = await ordersCol.findOne({ _id: orderId });
    if (!order) return null;
    return {
      id: order._id,
      total: order.total,
      payment_status: order.payment_status,
      payment_details: order.payment_details,
    };
  });
