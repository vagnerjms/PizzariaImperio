import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Mercado Pago webhook can send notification details in query or body
          const url = new URL(request.url);
          const topic = url.searchParams.get("topic") || url.searchParams.get("type");
          const resourceId = url.searchParams.get("id");

          let paymentId = resourceId;

          // If it's sent in the JSON body (standard newer webhook format)
          try {
            const body = await request.clone().json();
            console.log("Mercado Pago Webhook received body:", body);
            if (body.type === "payment" && body.data?.id) {
              paymentId = String(body.data.id);
            }
          } catch (e) {
            // Body was not JSON or empty, fallback to query parameters
            console.log("Webhook body empty or not JSON");
          }

          // If the topic is 'payment' or not specified but we have a paymentId
          if (paymentId && (!topic || topic === "payment")) {
            const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

            if (!accessToken) {
              console.error("MERCADO_PAGO_ACCESS_TOKEN is missing in webhook execution.");
              return new Response("Webhook configuration error", { status: 500 });
            }

            console.log(`Fetching payment ${paymentId} details from Mercado Pago API...`);
            
            const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
              headers: {
                "Authorization": `Bearer ${accessToken}`,
              },
            });

            if (!response.ok) {
              console.error(`Failed to fetch payment ${paymentId} from Mercado Pago:`, await response.text());
              return new Response("Failed to fetch payment details", { status: 400 });
            }

            const paymentData = await response.json();
            const orderId = paymentData.external_reference;
            const status = paymentData.status;

            console.log(`Payment ${paymentId} has status ${status} for order ${orderId}`);

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

              // Update the order in MongoDB
              const result = await ordersCol.updateOne(
                { _id: orderId },
                {
                  $set: {
                    payment_status: mappedStatus,
                    updated_at: new Date(),
                  },
                }
              );

              if (result.matchedCount === 0) {
                console.error(`Failed to update order ${orderId}: Order not found in MongoDB`);
                return new Response("Order not found", { status: 404 });
              }

              console.log(`Successfully updated order ${orderId} payment_status to ${mappedStatus}`);

              // Try to notify n8n of the payment success
              const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
              if (n8nWebhookUrl && mappedStatus === "paid") {
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
