export type PaymentBucket = "pix" | "dinheiro" | "credito" | "debito" | "outros";

export function roundMoney(value: number): number {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export function normalizePaymentBucket(paymentMethod: string): PaymentBucket {
  const norm = (paymentMethod || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (norm.includes("pix")) return "pix";
  if (norm.includes("dinheiro")) return "dinheiro";
  if (norm.includes("credito")) return "credito";
  if (norm.includes("debito")) return "debito";
  return "outros";
}
