/**
 * Módulo de Busca Inteligente de Endereços com OpenStreetMap (Nominatim)
 * Permite geocodificação reversa via GPS e busca por nome da rua quando o cliente não sabe o CEP.
 */

export interface LocationResult {
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  formattedAddress: string;
}

const NOMINATIM_HEADERS = {
  "Accept": "application/json",
  "User-Agent": "PizzariaImperioDelivery/2.0 (contato@embraganca.com.br)",
};

/**
 * 1. Geocodificação Reversa via Coordenadas GPS (Lat / Lon)
 */
export async function getAddressFromCoordinates(lat: number, lon: number): Promise<LocationResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
    const res = await fetch(url, {
      headers: NOMINATIM_HEADERS,
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.address) return null;

    const addr = data.address;
    const rua = addr.road || addr.street || addr.pedestrian || addr.footway || addr.suburb || "";
    const numero = addr.house_number || "";
    const bairro = addr.suburb || addr.neighbourhood || addr.residential || addr.city_district || addr.quarter || "";
    const cidade = addr.city || addr.town || addr.municipality || addr.village || "Bragança Paulista";
    const uf = addr.state_code || (addr.state === "São Paulo" ? "SP" : addr.state) || "SP";
    const rawCep = (addr.postcode || "").replace(/\D/g, "");
    const formattedCep = rawCep.length === 8 ? `${rawCep.slice(0, 5)}-${rawCep.slice(5, 8)}` : rawCep;

    return {
      rua,
      numero,
      bairro,
      cidade,
      uf,
      cep: formattedCep,
      formattedAddress: data.display_name,
    };
  } catch (error) {
    console.error("[Nominatim GPS Error]:", error);
    return null;
  }
}

/**
 * 2. Busca de Endereço por Nome da Rua em Bragança Paulista - SP
 */
export async function searchAddressByStreet(query: string, city: string = "Bragança Paulista"): Promise<LocationResult[]> {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 3) return [];

  try {
    const fullQuery = `${cleanQuery}, ${city}, SP, Brasil`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullQuery)}&format=json&addressdetails=1&limit=6&countrycodes=br`;
    
    const res = await fetch(url, {
      headers: NOMINATIM_HEADERS,
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => {
      const addr = item.address || {};
      const rua = addr.road || addr.street || addr.pedestrian || addr.footway || item.name || "";
      const numero = addr.house_number || "";
      const bairro = addr.suburb || addr.neighbourhood || addr.residential || addr.city_district || addr.quarter || "";
      const cidadeFound = addr.city || addr.town || addr.municipality || city;
      const uf = addr.state_code || (addr.state === "São Paulo" ? "SP" : addr.state) || "SP";
      const rawCep = (addr.postcode || "").replace(/\D/g, "");
      const formattedCep = rawCep.length === 8 ? `${rawCep.slice(0, 5)}-${rawCep.slice(5, 8)}` : rawCep;

      return {
        rua,
        numero,
        bairro,
        cidade: cidadeFound,
        uf,
        cep: formattedCep,
        formattedAddress: item.display_name,
      };
    }).filter(loc => loc.rua.length > 0);
  } catch (error) {
    console.error("[Nominatim Street Search Error]:", error);
    return [];
  }
}
