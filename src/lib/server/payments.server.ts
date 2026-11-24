import { generateStaticPix } from "../pix";
import type { SystemSettings } from "../settings.server";

export interface PixPaymentDetails {
  type: "pix";
  qr_code: string | null;
  qr_code_base64: string | null;
  expires_at: string | null;
}

export interface PixPaymentCreationResult {
  paymentGateway: "static_pix" | "mercadopago";
  gatewayPaymentId: string | null;
  paymentDetails: PixPaymentDetails;
}

export async function createOnlinePixPayment(params: {
  orderId: string;
  total: number;
  customerName: string;
  customerPhone: string;
  settings: SystemSettings;
}): Promise<PixPaymentCreationResult> {
  const { orderId, total, customerName, customerPhone, settings } = params;
  const accessToken = settings.mercado_pago_access_token;
  const staticPixKey = process.env.STATIC_PIX_KEY;

  if (!accessToken && !staticPixKey) {
    console.error("MERCADO_PAGO_ACCESS_TOKEN is missing in environment/database settings.");
    throw new Error("Erro na configuração de pagamentos online. Entre em contato com a pizzaria.");
  }

  try {
    if (staticPixKey) {
      const name = process.env.STATIC_PIX_NAME || "Pizzaria Imperio";
      const city = process.env.STATIC_PIX_CITY || "Braganca Paulista";
      const pixPayload = generateStaticPix(staticPixKey, name, city, total, orderId.slice(0, 8));

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
        console.warn(
          "Static Pix QR image generation timed out, falling back to copy-paste code:",
          qrErr,
        );
      }

      return {
        paymentGateway: "static_pix",
        gatewayPaymentId: null,
        paymentDetails: {
          type: "pix",
          qr_code: pixPayload,
          qr_code_base64: qrCodeBase64,
          // Align displayed expiration with the 30-minute auto-cancel window
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        },
      };
    }

    const phoneClean = customerPhone.replace(/\D/g, "");
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
          first_name: customerName.split(" ")[0] || "Cliente",
          last_name: customerName.split(" ").slice(1).join(" ") || "Pizzaria",
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

    return {
      paymentGateway: "mercadopago",
      gatewayPaymentId: String(paymentData.id),
      paymentDetails: {
        type: "pix",
        qr_code: paymentData.point_of_interaction?.transaction_data?.qr_code ?? null,
        qr_code_base64: paymentData.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
        expires_at: paymentData.date_of_expiration ?? null,
      },
    };
  } catch (err) {
    console.error("Pix processing failed:", err);
    throw new Error(
      err instanceof Error
        ? err.message
        : "Não foi possível gerar a cobrança Pix. Tente novamente.",
    );
  }
}
