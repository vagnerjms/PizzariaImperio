import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Mercado Pago webhook notification extraction
          const url = new URL(request.url);
          const topic = url.searchParams.get("topic") || url.searchParams.get("type");
          const resourceId = url.searchParams.get("id");

          let paymentId = resourceId;

          try {
            const body = await request.clone().json();
            console.log("Mercado Pago Webhook payload:", body);
            if (body.type === "payment" && body.data?.id) {
              paymentId = String(body.data.id);
            }
          } catch (e) {
            // Body was not JSON or empty, fallback to query parameters
          }

          // If the topic is 'payment' or not specified but we have a paymentId
          if (paymentId && (!topic || topic === "payment")) {
            if (!/^\d+$/.test(paymentId)) {
              console.warn(`Rejected invalid paymentId in webhook: "${paymentId}"`);
              return new Response("Invalid payment id", { status: 400 });
            }

            // Mercado Pago x-signature HMAC-SHA256 verification + timestamp replay window
            const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
            if (webhookSecret) {
              const xSignature = request.headers.get("x-signature") || "";
              const xRequestId = request.headers.get("x-request-id") || "";
              const parts = Object.fromEntries(
                xSignature.split(",").map((kv) => {
                  const [k, v] = kv.trim().split("=");
                  return [k, v];
                }),
              );
              const ts = parts.ts;
              const v1 = parts.v1;
              if (!ts || !v1) {
                return new Response("Missing webhook signature", { status: 401 });
              }
              // Reject stale/future timestamps outside a 15-minute replay window
              const tsNum = Number(ts);
              const tsMs = tsNum > 1e12 ? tsNum : tsNum * 1000;
              if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > 15 * 60 * 1000) {
                console.warn(`Rejected stale webhook timestamp for payment ${paymentId}: ${ts}`);
                return new Response("Stale webhook signature", { status: 401 });
              }
              const { createHmac, timingSafeEqual } = await import("node:crypto");
              const manifest = `id:${paymentId};request-id:${xRequestId};ts:${ts};`;
              const expected = createHmac("sha256", webhookSecret).update(manifest).digest("hex");
              const expectedBuf = Buffer.from(expected, "utf8");
              const receivedBuf = Buffer.from(v1, "utf8");
              if (
                expectedBuf.length !== receivedBuf.length ||
                !timingSafeEqual(expectedBuf, receivedBuf)
              ) {
                console.warn(`Invalid webhook signature for payment ${paymentId}`);
                return new Response("Invalid webhook signature", { status: 401 });
              }
            } else if (process.env.NODE_ENV === "production") {
              console.warn(
                "[Webhook Security Warning] MERCADO_PAGO_WEBHOOK_SECRET is not set in production; relying solely on Mercado Pago API verification.",
              );
            }

            const { getSystemSettings } = await import("@/lib/settings.server");
            const settings = await getSystemSettings();
            const accessToken = settings.mercado_pago_access_token;

            if (!accessToken) {
              console.error("MERCADO_PAGO_ACCESS_TOKEN is missing in webhook execution.");
              return new Response("Webhook configuration error", { status: 500 });
            }

            console.log(`Verifying payment ${paymentId} with Mercado Pago API...`);

            const response = await fetch(
              `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
                signal: AbortSignal.timeout(5000),
              },
            );

            if (!response.ok) {
              console.error(
                `Failed to verify payment ${paymentId} with Mercado Pago:`,
                await response.text(),
              );
              return new Response("Failed to fetch payment details", { status: 400 });
            }

            const paymentData = await response.json();
            const orderId = paymentData.external_reference;
            const status = paymentData.status;

            console.log(
              `Payment ${paymentId} verified with status '${status}' for order ${orderId}`,
            );

            if (orderId) {
              const { getOrdersCollection } = await import("@/lib/db");
              const ordersCol = await getOrdersCollection();

              // Map Mercado Pago status to public.payment_status
              let mappedStatus: "pending" | "paid" | "failed" | "refunded" | "on_delivery" =
                "pending";
              if (status === "approved") {
                mappedStatus = "paid";
              } else if (status === "rejected" || status === "cancelled") {
                mappedStatus = "failed";
              } else if (status === "refunded") {
                mappedStatus = "refunded";
              }

              // Atomic transition check: strict idempotency on `paid` and zero regression from `paid` -> `pending`/`failed`
              let paidOrderDoc: any = null;

              if (mappedStatus === "paid") {
                paidOrderDoc = await ordersCol.findOneAndUpdate(
                  { _id: orderId, payment_status: { $ne: "paid" } },
                  {
                    $set: {
                      payment_status: "paid",
                      gateway_payment_id: String(paymentId),
                      updated_at: new Date(),
                    },
                  },
                  { returnDocument: "after" },
                );

                if (!paidOrderDoc) {
                  const existingOrder = await ordersCol.findOne({ _id: orderId });
                  if (!existingOrder) {
                    console.error(`Failed to update order ${orderId}: Order not found in MongoDB`);
                    return new Response("Order not found", { status: 404 });
                  }
                  console.log(
                    `Order ${orderId} was already paid, skipping duplicate n8n notification.`,
                  );
                } else {
                  console.log(`Order ${orderId} successfully transitioned to payment_status: paid`);
                }
              } else if (mappedStatus === "refunded") {
                await ordersCol.updateOne(
                  { _id: orderId },
                  {
                    $set: {
                      payment_status: "refunded",
                      gateway_payment_id: String(paymentId),
                      updated_at: new Date(),
                    },
                  },
                );
                console.log(`Order ${orderId} updated to payment_status: refunded`);
              } else {
                // Never allow delayed pending/failed events to downgrade an already paid/refunded order
                const res = await ordersCol.updateOne(
                  { _id: orderId, payment_status: { $nin: ["paid", "refunded"] } },
                  {
                    $set: {
                      payment_status: mappedStatus,
                      gateway_payment_id: String(paymentId),
                      updated_at: new Date(),
                    },
                  },
                );
                if (res.matchedCount === 0) {
                  console.log(
                    `Skipped non-paid webhook (${mappedStatus}) for already-settled or missing order ${orderId}.`,
                  );
                } else {
                  console.log(`Order ${orderId} updated to payment_status: ${mappedStatus}`);
                }
              }

              // Notify n8n ONLY upon the exact atomic transition to paid
              if (settings.n8n_webhook_url && paidOrderDoc) {
                const { dispatchN8nEvent } = await import("@/lib/server/n8n.server");
                dispatchN8nEvent(settings.n8n_webhook_url, "order.paid", {
                  id: orderId,
                  customer_name: paidOrderDoc.customer_name,
                  customer_phone: paidOrderDoc.customer_phone,
                  customer_address: paidOrderDoc.customer_address,
                  delivery_mode: paidOrderDoc.delivery_mode || "delivery",
                  payment_method: paidOrderDoc.payment_method,
                  total: paidOrderDoc.total,
                  status: paidOrderDoc.status,
                  payment_status: "paid",
                  items: paidOrderDoc.items,
                });
              }
            }
          }

          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("Webhook processing error:", err);
          return new Response("Internal Server Error", { status: 500 });
        }
      },
    },
  },
});
