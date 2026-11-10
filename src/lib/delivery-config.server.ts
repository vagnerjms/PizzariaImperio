import { getDb } from "./db";
import { BRAGANCA_PAULISTA_NEIGHBORHOODS } from "@/data/neighborhoods";
import { cleanString } from "./formatters";

export { BRAGANCA_PAULISTA_NEIGHBORHOODS, cleanString };

export interface NeighborhoodFee {
  id: string;
  name: string;
  fee: number;
}

export interface DeliverySettings {
  default_fee: number;
  neighborhoods: NeighborhoodFee[];
}

export const INITIAL_DEFAULT_FEE = 7.00;

export function getBragancaNeighborhoodsList(defaultFee = 5.00): NeighborhoodFee[] {
  return BRAGANCA_PAULISTA_NEIGHBORHOODS.map((name, index) => ({
    id: `bp-${index + 1}`,
    name,
    fee: defaultFee,
  }));
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

    const defaultList = getBragancaNeighborhoodsList(5.00);

    // Se não existir, salva a lista oficial de Bragança Paulista
    await col.updateOne(
      { _id: "global" },
      { $set: { default_fee: INITIAL_DEFAULT_FEE, neighborhoods: defaultList, updated_at: new Date() } },
      { upsert: true }
    );

    return {
      default_fee: INITIAL_DEFAULT_FEE,
      neighborhoods: defaultList,
    };
  } catch (error) {
    console.error("Failed to load delivery settings from MongoDB:", error);
    return {
      default_fee: INITIAL_DEFAULT_FEE,
      neighborhoods: getBragancaNeighborhoodsList(5.00),
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
