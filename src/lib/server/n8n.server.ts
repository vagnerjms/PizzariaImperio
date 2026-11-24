export type N8nOrderEvent = "order.created" | "order.status_updated" | "order.paid";

const N8N_TIMEOUT_MS = 8000;

/**
 * Unified, timeout-protected n8n webhook dispatcher (fire-and-forget with structured logging).
 */
export function dispatchN8nEvent(
  webhookUrl: string | null | undefined,
  event: N8nOrderEvent,
  order: Record<string, unknown>,
): void {
  if (!webhookUrl) return;

  const orderId = String(order.id || "unknown");
  console.log(`[n8n] Dispatching ${event} -> ${webhookUrl} (Order: ${orderId})`);

  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(N8N_TIMEOUT_MS),
    body: JSON.stringify({ event, order }),
  })
    .then(async (res) => {
      if (!res.ok) {
        console.error(
          `[n8n Error] ${event} returned HTTP ${res.status} (Order: ${orderId}):`,
          await res.text(),
        );
      } else {
        console.log(`[n8n Success] ${event} delivered for order ${orderId}.`);
      }
    })
    .catch((err) => {
      console.error(`[n8n Error] Failed to dispatch ${event} for order ${orderId}:`, err);
    });
}
