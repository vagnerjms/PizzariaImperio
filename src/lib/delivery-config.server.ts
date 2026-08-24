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

export const BRAGANCA_PAULISTA_NEIGHBORHOODS: string[] = [
  "Centro",
  "Lavapés",
  "Jardim América",
  "Jardim Europa",
  "Jardim do Lago",
  "Jardim Águas Claras",
  "Cidade Planejada I",
  "Cidade Planejada II",
  "Henedina Cortez",
  "Matadouro",
  "Taboão",
  "Tanque do Moinho",
  "Penha",
  "Cruzeiro",
  "Santa Luzia",
  "Vila Municipal",
  "Vila Bianchi",
  "Vila Gato",
  "Vila Motta",
  "Vila Santa Libânia",
  "Vila Davi",
  "Vila Aparecida",
  "Altos de Bragança",
  "Euroville I",
  "Euroville II",
  "Residencial Euroville",
  "Residencial Campos do Conde",
  "Condomínio Santa Helena",
  "Residencial Colinas de São Francisco",
  "Condomínio Portal da Serra",
  "Jardim Primavera",
  "Jardim São Lourenço",
  "Jardim Santa Helena",
  "Jardim São José",
  "Jardim das Laranjeiras",
  "Jardim Comendador Cardoso",
  "Jardim da Fraternidade",
  "Jardim Novo Mundo",
  "Jardim Iguatemi",
  "Jardim Júlio de Mesquita",
  "Jardim Vista Alegre",
  "Jardim Morumbi",
  "Jardim Recreio",
  "Jardim Santa Rita de Cássia",
  "Jardim Sevilha",
  "Jardim Toró",
  "Parque das Faculdades",
  "Parque dos Estados",
  "Parque Brasil",
  "Planalto das Pimenteiras",
  "Cidade Universitária",
  "Quinta dos Vinhedos",
  "Recanto da Montanha",
  "Portal São Marcelo",
  "Conjunto Habitacional Saada Nader Abi Chedid",
  "Conjunto Habitacional Padre Aldo Bolini",
  "Conjunto Habitacional Nicola Cortez",
  "Conjunto Habitacional Bragança F",
  "Vila Nova Bragança",
  "Vila Olinda",
  "Vila Ramos",
  "Vila Salmorani",
  "Vila Santa Luzia",
  "Vila Virgínia",
  "Vila Belém",
  "Vila Garcia",
  "Água Comprida",
  "Arara dos Pereiras",
  "Araras dos Mori",
  "Atibaianos",
  "Bairro do Agudo",
  "Bairro do Menin",
  "Bairro do Uberaba",
  "Bairro Sete Barras",
  "Biriça do Campinho",
  "Boa Vista",
  "Boa Vista dos Silva",
  "Bom Retiro",
  "Bom Retiro dos Mourão",
  "Bosques da Pedra",
  "Campinho",
  "Campo Novo",
  "Chácara Alvorada",
  "Chácaras Fernão Dias",
  "Chácaras Luzia Vicente",
  "Chácaras São Bento",
  "Chácaras Silvano",
  "Condomínio Quinta da Baroneza",
  "Estância Santa Amélia",
  "Guaripocaba",
  "Morro Grande",
  "Ponte Alta",
  "Rio Abaixo",
  "Santa Bárbara",
  "Serrinha",
  "Toró",
  "Usina",
  "Vargem",
  "Vista Alegre"
];

export const INITIAL_DEFAULT_FEE = 7.00;

export function getBragancaNeighborhoodsList(defaultFee = 5.00): NeighborhoodFee[] {
  return BRAGANCA_PAULISTA_NEIGHBORHOODS.map((name, index) => ({
    id: `bp-${index + 1}`,
    name,
    fee: defaultFee,
  }));
}

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
