import { getDb } from "./db";

export interface NeighborhoodFee {
  id: string;
  name: string;
  fee: number;
}

export interface DeliverySettings {
  default_fee: number;
  neighborhoods: NeighborhoodFee[];
}

export const INITIAL_NEIGHBORHOODS: NeighborhoodFee[] = [
  { id: "1", name: "Centro", fee: 5.00 },
  { id: "2", name: "Vila Mariana", fee: 6.00 },
  { id: "3", name: "Pinheiros", fee: 7.00 },
  { id: "4", name: "Jardins", fee: 8.00 },
  { id: "5", name: "Itaim Bibi", fee: 8.00 },
  { id: "6", name: "Moema", fee: 7.00 },
  { id: "7", name: "Brooklin", fee: 8.00 },
  { id: "8", name: "Morumbi", fee: 10.00 },
  { id: "9", name: "Lapa", fee: 9.00 },
  { id: "10", name: "Santana", fee: 8.00 },
  { id: "11", name: "Saúde", fee: 6.00 },
  { id: "12", name: "Ipiranga", fee: 6.00 },
  { id: "13", name: "Butantã", fee: 9.00 },
  { id: "14", name: "Perdizes", fee: 7.00 },
];

export const INITIAL_DEFAULT_FEE = 7.00;

export function cleanString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

export async function getDeliverySettings(): Promise<DeliverySettings> {
  try {
    const db = await getDb();
    const col = db.collection("delivery_settings");
    const doc = await col.findOne({ _id: "global" });

    if (doc && doc.neighborhoods && Array.isArray(doc.neighborhoods)) {
      return {
        default_fee: typeof doc.default_fee === "number" ? doc.default_fee : INITIAL_DEFAULT_FEE,
        neighborhoods: doc.neighborhoods.map((n: any, idx: number) => ({
          id: n.id || `bairro-${idx}`,
          name: n.name,
          fee: Number(n.fee) || 0,
        })),
      };
    }

    // Se não existir, salva o padrão inicial
    await col.updateOne(
      { _id: "global" },
      { $set: { default_fee: INITIAL_DEFAULT_FEE, neighborhoods: INITIAL_NEIGHBORHOODS, updated_at: new Date() } },
      { upsert: true }
    );

    return {
      default_fee: INITIAL_DEFAULT_FEE,
      neighborhoods: INITIAL_NEIGHBORHOODS,
    };
  } catch (error) {
    console.error("Failed to load delivery settings from MongoDB:", error);
    return {
      default_fee: INITIAL_DEFAULT_FEE,
      neighborhoods: INITIAL_NEIGHBORHOODS,
    };
  }
}

export async function saveDeliverySettings(settings: { default_fee: number; neighborhoods: NeighborhoodFee[] }): Promise<void> {
  const db = await getDb();
  const col = db.collection("delivery_settings");
  
  await col.updateOne(
    { _id: "global" },
    {
      $set: {
        default_fee: Number(settings.default_fee) || INITIAL_DEFAULT_FEE,
        neighborhoods: settings.neighborhoods.map((n, idx) => ({
          id: n.id || `bairro-${Date.now()}-${idx}`,
          name: n.name.trim(),
          fee: Number(n.fee) || 0,
        })),
        updated_at: new Date(),
      },
    },
    { upsert: true }
  );
}

export async function calculateFeeForNeighborhood(neighborhood: string): Promise<number> {
  const config = await getDeliverySettings();
  if (!neighborhood) return config.default_fee;
  
  const cleanTarget = cleanString(neighborhood);

  // 1. Busca exata
  const exact = config.neighborhoods.find(n => cleanString(n.name) === cleanTarget);
  if (exact) return exact.fee;

  // 2. Busca parcial
  const partial = config.neighborhoods.find(n => {
    const cleanName = cleanString(n.name);
    return cleanTarget.includes(cleanName) || cleanName.includes(cleanTarget);
  });
  if (partial) return partial.fee;

  // 3. Fallback
  return config.default_fee;
}
