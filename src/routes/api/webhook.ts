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
            const { getSystemSettings } = await import("@/lib/settings.server");
            const settings = await getSystemSettings();
            const accessToken = settings.mercado_pago_access_token;

            if (!accessToken) {
              console.error("MERCADO_PAGO_ACCESS_TOKEN is missing in webhook execution.");
              return new Response("Webhook configuration error", { status: 500 });
            }

            console.log(`Verifying payment ${paymentId} with Mercado Pago API...`);
            
            const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
              headers: {
                "Authorization": `Bearer ${accessToken}`,
              },
            });

            if (!response.ok) {
              console.error(`Failed to verify payment ${paymentId} with Mercado Pago:`, await response.text());
              return new Response("Failed to fetch payment details", { status: 400 });
            }

            const paymentData = await response.json();
            const orderId = paymentData.external_reference;
            const status = paymentData.status;

            console.log(`Payment ${paymentId} verified with status '${status}' for order ${orderId}`);

            if (orderId) {
              const { getOrdersCollection } = await import("@/lib/db");
              const ordersCol = await getOrdersCollection();

              // Map Mercado Pago status to public.payment_status
              let mappedStatus: "pending" | "paid" | "failed" | "refunded" | "on_delivery" = "pending";
              if (status === "approved") {
                mappedStatus = "paid";
              } else if (status === "rejected" || status === "cancelled") {
                mappedStatus = "failed";
              } else if (status === "refunded") {
                mappedStatus = "refunded";
              }

              // Check existing order state to ensure strict idempotency on notification events
              const existingOrder = await ordersCol.findOne({ _id: orderId });
              const wasAlreadyPaid = existingOrder?.payment_status === "paid";

              // Update the order in MongoDB
              const result = await ordersCol.updateOne(
                { _id: orderId },
                {
                  $set: {
                    payment_status: mappedStatus,
                    gateway_payment_id: String(paymentId),
                    updated_at: new Date(),
                  },
                }
              );

              if (result.matchedCount === 0) {
                console.error(`Failed to update order ${orderId}: Order not found in MongoDB`);
                return new Response("Order not found", { status: 404 });
              }

              console.log(`Order ${orderId} updated to payment_status: ${mappedStatus}`);

              // Notify n8n ONLY upon fresh transition to paid (prevents duplicate spam on retries)
              const n8nWebhookUrl = settings.n8n_webhook_url;
              if (n8nWebhookUrl && mappedStatus === "paid" && !wasAlreadyPaid) {
                const orderDoc = await ordersCol.findOne({ _id: orderId });
                if (orderDoc) {
                  fetch(n8nWebhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      event: "order.paid",
                      order: {
                        id: orderId,
                        customer_name: orderDoc.customer_name,
                        customer_phone: orderDoc.customer_phone,
                        customer_address: orderDoc.customer_address,
                        total: orderDoc.total,
                        payment_method: orderDoc.payment_method,
                      }
                    }),
                  }).catch((err) => console.error("Failed to notify n8n webhook on payment approved:", err));
                }
              }
            }
          }

          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("Webhook processing error:", err);
          return new Response(err instanceof Error ? err.message : "Internal Server Error", { status: 500 });
        }
      },
    },
  },
});
