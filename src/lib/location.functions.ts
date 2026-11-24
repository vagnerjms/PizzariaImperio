import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cleanString } from "./formatters";

export interface LocationResult {
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  formattedAddress: string;
}

const COMMON_HEADERS = {
  Accept: "application/json",
  Referer: "https://imperio.embraganca.com.br/",
  "User-Agent": "PizzariaImperioApp/2.0 (contato@embraganca.com.br)",
};

const STOP_WORDS = new Set([
  "rua",
  "r",
  "av",
  "avenida",
  "alameda",
  "pca",
  "praca",
  "travessa",
  "estrada",
  "bairro",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
]);

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 dias
const MAX_CACHE_ENTRIES = 500;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQ = 30;
const MAX_RATE_LIMIT_IPS = 2000;

class LruTtlCache<T> {
  private map = new Map<string, { data: T; timestamp: number }>();
  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number,
  ) {}

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp >= this.ttlMs) {
      this.map.delete(key);
      return undefined;
    }
    // Refresh recency (LRU)
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.data;
  }

  set(key: string, data: T): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxEntries) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) this.map.delete(oldestKey);
    }
    this.map.set(key, { data, timestamp: Date.now() });
  }
}

const memoryCache = new LruTtlCache<LocationResult[]>(MAX_CACHE_ENTRIES, CACHE_TTL_MS);
const gpsMemoryCache = new LruTtlCache<LocationResult>(MAX_CACHE_ENTRIES, CACHE_TTL_MS);
const rateLimitBuckets = new Map<string, number[]>();

async function enforceLocationRateLimit(): Promise<void> {
  const { getRequest } = await import("@tanstack/react-start/server");
  const req = getRequest();
  const forwarded = req?.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0]?.trim() || req?.headers.get("x-real-ip")?.trim() || "unknown";

  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const recent = (rateLimitBuckets.get(ip) || []).filter((ts) => ts > cutoff);

  if (recent.length >= RATE_LIMIT_MAX_REQ) {
    throw new Error(
      "Muitas buscas de endereço em sequência. Aguarde alguns segundos e tente novamente.",
    );
  }

  recent.push(now);
  if (rateLimitBuckets.has(ip)) {
    rateLimitBuckets.delete(ip);
  } else if (rateLimitBuckets.size >= MAX_RATE_LIMIT_IPS) {
    const oldestIp = rateLimitBuckets.keys().next().value;
    if (oldestIp !== undefined) rateLimitBuckets.delete(oldestIp);
  }
  rateLimitBuckets.set(ip, recent);
}

function getSignificantWords(text: string): string[] {
  return cleanString(text)
    .split(" ")
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

function matchesSignificantQuery(streetName: string, queryWords: string[]): boolean {
  if (queryWords.length === 0) return true;
  const cleanStreet = cleanString(streetName);

  const firstSignificant = queryWords[0];
  if (firstSignificant && firstSignificant.length >= 3) {
    if (!cleanStreet.includes(firstSignificant)) {
      return false;
    }
  }

  const matchCount = queryWords.filter((w) => cleanStreet.includes(w)).length;
  return matchCount >= Math.ceil(queryWords.length / 2);
}

/**
 * 1. Geocodificação Reversa via GPS com Fallback Multicamadas e Cache
 * (Cache em Memória/MongoDB ➔ Nominatim OSM ➔ Photon Komoot ➔ Google Maps Reverse Geocoding)
 */
export const reverseGeocodeGPS = createServerFn({ method: "POST" })
  .validator((raw: unknown) =>
    z
      .object({
        lat: z.number(),
        lon: z.number(),
      })
      .parse(raw),
  )
  .handler(async ({ data }): Promise<LocationResult | null> => {
    await enforceLocationRateLimit();

    // Chave de cache por aproximação de ~50 metros (3 casas decimais)
    const latRounded = data.lat.toFixed(3);
    const lonRounded = data.lon.toFixed(3);
    const gpsCacheKey = `gps_${latRounded}_${lonRounded}`;

    // 1. Checa Cache em Memória (LRU)
    const memCached = gpsMemoryCache.get(gpsCacheKey);
    if (memCached) {
      return memCached;
    }

    // 2. Checa Cache no MongoDB
    try {
      const { getDb } = await import("./db");
      const db = await getDb();
      const cachedDoc = await db.collection("address_cache").findOne({ _id: gpsCacheKey as any });
      if (cachedDoc && cachedDoc.data) {
        gpsMemoryCache.set(gpsCacheKey, cachedDoc.data);
        return cachedDoc.data;
      }
    } catch (e) {
      console.warn("[GPS Cache Read Warning]:", e);
    }

    let result: LocationResult | null = null;

    // 3. Tentativa Primária Gratuita: Nominatim OpenStreetMap
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${data.lat}&lon=${data.lon}&format=json&addressdetails=1`;
      const res = await fetch(url, {
        headers: COMMON_HEADERS,
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.address) {
          const addr = json.address;
          const rua =
            addr.road || addr.street || addr.pedestrian || addr.footway || addr.suburb || "";
          const numero = addr.house_number || "";
          const bairro =
            addr.suburb ||
            addr.neighbourhood ||
            addr.residential ||
            addr.city_district ||
            addr.quarter ||
            "";
          const cidade =
            addr.city || addr.town || addr.municipality || addr.village || "Bragança Paulista";
          const uf = addr.state_code || (addr.state === "São Paulo" ? "SP" : addr.state) || "SP";
          const rawCep = (addr.postcode || "").replace(/\D/g, "");
          const formattedCep =
            rawCep.length === 8
              ? `${rawCep.slice(0, 5)}-${rawCep.slice(5, 8)}`
              : rawCep || "12900-000";

          if (rua || bairro) {
            result = {
              rua,
              numero,
              bairro,
              cidade,
              uf,
              cep: formattedCep,
              formattedAddress: json.display_name || `${rua}, ${bairro} - ${cidade}`,
            };
          }
        }
      }
    } catch (err) {
      console.warn("[reverseGeocodeGPS Nominatim Warning]:", err);
    }

    // 4. Fallback Secundário Gratuito: Photon Komoot Reverse
    if (!result) {
      try {
        const photonUrl = `https://photon.komoot.io/reverse?lat=${data.lat}&lon=${data.lon}`;
        const res = await fetch(photonUrl, {
          headers: COMMON_HEADERS,
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          const json = await res.json();
          const feature = json?.features?.[0];
          if (feature && feature.properties) {
            const props = feature.properties;
            const rua = props.street || props.name || "";
            const numero = props.housenumber || "";
            const bairro = props.district || props.locality || props.suburb || "";
            const cidade = props.city || "Bragança Paulista";
            const uf = props.state || "SP";
            const rawCep = (props.postcode || "").replace(/\D/g, "");
            const formattedCep =
              rawCep.length === 8 ? `${rawCep.slice(0, 5)}-${rawCep.slice(5, 8)}` : "12900-000";

            result = {
              rua,
              numero,
              bairro,
              cidade,
              uf,
              cep: formattedCep,
              formattedAddress: `${rua}, ${bairro} - ${cidade}`,
            };
          }
        }
      } catch (err) {
        console.warn("[reverseGeocodeGPS Photon Warning]:", err);
      }
    }

    // 5. FAILOVER FINAL: Google Maps Reverse Geocoding
    if (!result) {
      try {
        const { getSystemSettings } = await import("./settings.server");
        const settings = await getSystemSettings();
        const apiKey = settings.google_maps_api_key;
        if (apiKey) {
          console.log("[reverseGeocodeGPS] Acionando Google Maps Geocoding Failover...");
          const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${data.lat},${data.lon}&key=${apiKey}&language=pt-BR&region=br`;
          const res = await fetch(googleUrl, {
            headers: COMMON_HEADERS,
            signal: AbortSignal.timeout(3500),
          });
          if (res.ok) {
            const dataGoogle = await res.json();
            if (
              dataGoogle.status === "OK" &&
              Array.isArray(dataGoogle.results) &&
              dataGoogle.results.length > 0
            ) {
              const r = dataGoogle.results[0];
              let rua = "";
              let numero = "";
              let bairro = "";
              let cidade = "Bragança Paulista";
              let uf = "SP";
              let cep = "12900-000";

              for (const comp of r.address_components || []) {
                const types: string[] = comp.types || [];
                if (types.includes("route")) {
                  rua = comp.long_name;
                } else if (types.includes("street_number")) {
                  numero = comp.long_name;
                } else if (
                  types.includes("sublocality_level_1") ||
                  types.includes("sublocality") ||
                  types.includes("neighborhood")
                ) {
                  bairro = comp.long_name;
                } else if (types.includes("administrative_area_level_2")) {
                  cidade = comp.long_name;
                } else if (types.includes("administrative_area_level_1")) {
                  uf = comp.short_name || comp.long_name || "SP";
                } else if (types.includes("postal_code")) {
                  const raw = (comp.long_name || "").replace(/\D/g, "");
                  if (raw.length === 8) {
                    cep = `${raw.slice(0, 5)}-${raw.slice(5, 8)}`;
                  }
                }
              }

              result = {
                rua: rua || r.formatted_address.split(",")[0] || "",
                numero,
                bairro: bairro || "Centro",
                cidade,
                uf,
                cep,
                formattedAddress: r.formatted_address,
              };
            }
          }
        }
      } catch (err) {
        console.error("[reverseGeocodeGPS Google Maps Failover Error]:", err);
      }
    }

    // Grava no Cache em Memória e MongoDB se obteve resultado
    if (result) {
      gpsMemoryCache.set(gpsCacheKey, result);
      try {
        const { getDb } = await import("./db");
        const db = await getDb();
        await db
          .collection("address_cache")
          .updateOne(
            { _id: gpsCacheKey as any },
            { $set: { data: result, updated_at: new Date() } },
            { upsert: true },
          );
      } catch (e) {
        console.warn("[GPS Cache Save Warning]:", e);
      }
    }

    return result;
  });

/**
 * 2. Motor de Busca de Ruas com Cache Inteligente e Failover Protegido
 */
export const searchStreetAddress = createServerFn({ method: "POST" })
  .validator((raw: unknown) =>
    z
      .object({
        query: z.string().trim().min(3),
      })
      .parse(raw),
  )
  .handler(async ({ data }): Promise<LocationResult[]> => {
    await enforceLocationRateLimit();

    const cleanQuery = data.query.trim();
    const cacheKey = `search_${cleanString(cleanQuery)}`;

    // 1. Checa Cache em Memória RAM (LRU instantâneo < 1ms)
    const memCached = memoryCache.get(cacheKey);
    if (memCached && memCached.length > 0) {
      return memCached;
    }

    // 2. Checa Cache Persistente no MongoDB (instantâneo < 2ms)
    try {
      const { getDb } = await import("./db");
      const db = await getDb();
      const cachedDoc = await db.collection("address_cache").findOne({ _id: cacheKey as any });
      if (cachedDoc && Array.isArray(cachedDoc.results) && cachedDoc.results.length > 0) {
        memoryCache.set(cacheKey, cachedDoc.results);
        return cachedDoc.results;
      }
    } catch (e) {
      console.warn("[Address Cache Read Warning]:", e);
    }

    const queryWords = getSignificantWords(cleanQuery);
    const results: LocationResult[] = [];
    const seen = new Set<string>();

    const addResult = (item: LocationResult) => {
      const key = `${cleanString(item.rua)}-${cleanString(item.bairro)}`.toLowerCase();
      if (!seen.has(key) && (item.rua || item.bairro)) {
        seen.add(key);
        results.push(item);
      }
    };

    // =========================================================================
    // TIER 1: ViaCEP Oficial de Ruas de Bragança Paulista - SP
    // =========================================================================
    try {
      const viacepUrl = `https://viacep.com.br/ws/SP/Braganca%20Paulista/${encodeURIComponent(cleanQuery)}/json/`;
      const res = await fetch(viacepUrl, {
        headers: COMMON_HEADERS,
        signal: AbortSignal.timeout(2800),
      });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          for (const item of list.slice(0, 8)) {
            if (item.logradouro && matchesSignificantQuery(item.logradouro, queryWords)) {
              addResult({
                rua: item.logradouro,
                numero: "",
                bairro: item.bairro || "Centro",
                cidade: "Bragança Paulista",
                uf: "SP",
                cep: item.cep || "12900-000",
                formattedAddress: `${item.logradouro}, ${item.bairro} - Bragança Paulista, SP`,
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn("[ViaCEP Street Search Warning]:", err);
    }

    // =========================================================================
    // TIER 2: Photon Komoot OpenStreetMap (Fuzzy Search com Relevância)
    // =========================================================================
    try {
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery + " Bragança Paulista")}&lat=-22.952&lon=-46.542&limit=8`;
      const res = await fetch(photonUrl, {
        headers: COMMON_HEADERS,
        signal: AbortSignal.timeout(2800),
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.features)) {
          for (const feature of json.features) {
            const props = feature.properties || {};
            const rua = props.street || props.name || "";
            const bairro = props.district || props.locality || props.suburb || "Bragança Paulista";
            const cidade = props.city || "Bragança Paulista";

            if (
              rua &&
              matchesSignificantQuery(rua, queryWords) &&
              (cidade.toLowerCase().includes("bragan") || props.state?.includes("SP"))
            ) {
              const rawCep = (props.postcode || "").replace(/\D/g, "");
              const formattedCep =
                rawCep.length === 8 ? `${rawCep.slice(0, 5)}-${rawCep.slice(5, 8)}` : "12900-000";
              addResult({
                rua,
                numero: props.housenumber || "",
                bairro,
                cidade: "Bragança Paulista",
                uf: "SP",
                cep: formattedCep,
                formattedAddress: `${rua}, ${bairro} - Bragança Paulista, SP`,
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn("[Photon Street Search Warning]:", err);
    }

    // =========================================================================
    // TIER 3: Nominatim OpenStreetMap (Busca Estruturada)
    // =========================================================================
    if (results.length < 3) {
      try {
        const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery + ", Bragança Paulista, SP, Brasil")}&format=json&addressdetails=1&limit=8&countrycodes=br`;
        const res = await fetch(osmUrl, {
          headers: COMMON_HEADERS,
          signal: AbortSignal.timeout(3000),
        });

        if (res.ok) {
          const osmList = await res.json();
          if (Array.isArray(osmList)) {
            for (const item of osmList) {
              const addr = item.address || {};
              const rua = addr.road || addr.street || addr.pedestrian || item.name || "";
              const bairro =
                addr.suburb ||
                addr.neighbourhood ||
                addr.residential ||
                addr.city_district ||
                "Bragança Paulista";
              const rawCep = (addr.postcode || "").replace(/\D/g, "");
              const formattedCep =
                rawCep.length === 8 ? `${rawCep.slice(0, 5)}-${rawCep.slice(5, 8)}` : "12900-000";

              if (rua && matchesSignificantQuery(rua, queryWords)) {
                addResult({
                  rua,
                  numero: addr.house_number || "",
                  bairro,
                  cidade: "Bragança Paulista",
                  uf: "SP",
                  cep: formattedCep,
                  formattedAddress: item.display_name,
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn("[Nominatim Street Search Warning]:", err);
      }
    }

    // =========================================================================
    // TIER 4: Catálogo de 90+ Bairros de Bragança Paulista no MongoDB
    // =========================================================================
    if (results.length === 0) {
      try {
        const { getDeliverySettings } = await import("./delivery-config.server");
        const deliverySettings = await getDeliverySettings();
        const neighborhoods: Array<{ name: string; fee: number }> =
          deliverySettings.neighborhoods || [];

        const queryClean = cleanString(cleanQuery);
        const matchedNeighborhoods = neighborhoods.filter((n) => {
          const nClean = cleanString(n.name);
          return nClean.includes(queryClean) || queryClean.includes(nClean);
        });

        for (const n of matchedNeighborhoods.slice(0, 3)) {
          addResult({
            rua: `Bairro ${n.name}`,
            numero: "",
            bairro: n.name,
            cidade: "Bragança Paulista",
            uf: "SP",
            cep: "12900-000",
            formattedAddress: `Bairro ${n.name} - Bragança Paulista, SP (Taxa: R$ ${n.fee.toFixed(2).replace(".", ",")})`,
          });
        }
      } catch (err) {
        console.warn("[MongoDB Neighborhood Catalog Search Warning]:", err);
      }
    }

    // =========================================================================
    // TIER 5 (FAILOVER SEGURO): Google Places / Geocoding API
    // ⚠️ REGRA CRÍTICA: Executa SOMENTE se as camadas anteriores falharem E tamanho >= 4
    // =========================================================================
    if (results.length === 0 && cleanQuery.length >= 4) {
      try {
        const { getSystemSettings } = await import("./settings.server");
        const settings = await getSystemSettings();
        const apiKey = settings.google_maps_api_key;
        if (apiKey) {
          console.log(
            `[Google Maps Failover] Acionando Google Geocoding API para "${cleanQuery}"...`,
          );

          const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanQuery + ", Bragança Paulista, SP, Brasil")}&key=${apiKey}&language=pt-BR&region=br`;
          const res = await fetch(googleUrl, {
            headers: COMMON_HEADERS,
            signal: AbortSignal.timeout(3500),
          });

          if (res.ok) {
            const dataGoogle = await res.json();
            if (dataGoogle.status === "OK" && Array.isArray(dataGoogle.results)) {
              for (const r of dataGoogle.results.slice(0, 6)) {
                let rua = "";
                let numero = "";
                let bairro = "";
                let cidade = "Bragança Paulista";
                let uf = "SP";
                let cep = "12900-000";

                for (const comp of r.address_components || []) {
                  const types: string[] = comp.types || [];
                  if (types.includes("route")) {
                    rua = comp.long_name;
                  } else if (types.includes("street_number")) {
                    numero = comp.long_name;
                  } else if (
                    types.includes("sublocality_level_1") ||
                    types.includes("sublocality") ||
                    types.includes("neighborhood")
                  ) {
                    bairro = comp.long_name;
                  } else if (types.includes("administrative_area_level_2")) {
                    cidade = comp.long_name;
                  } else if (types.includes("administrative_area_level_1")) {
                    uf = comp.short_name || comp.long_name || "SP";
                  } else if (types.includes("postal_code")) {
                    const raw = (comp.long_name || "").replace(/\D/g, "");
                    if (raw.length === 8) {
                      cep = `${raw.slice(0, 5)}-${raw.slice(5, 8)}`;
                    }
                  }
                }

                if (rua || bairro) {
                  addResult({
                    rua: rua || r.formatted_address.split(",")[0] || "",
                    numero,
                    bairro: bairro || "Centro",
                    cidade,
                    uf,
                    cep,
                    formattedAddress: r.formatted_address,
                  });
                }
              }
            } else if (dataGoogle.status !== "OK") {
              console.warn(
                "[Google Maps API Status Warning]:",
                dataGoogle.status,
                dataGoogle.error_message,
              );
            }
          }
        }
      } catch (err) {
        console.error("[Google Maps Geocoding Failover Error]:", err);
      }
    }

    // 💾 Salva os resultados no Cache em Memória e no MongoDB para economia futura
    if (results.length > 0) {
      memoryCache.set(cacheKey, results);
      try {
        const { getDb } = await import("./db");
        const db = await getDb();
        await db
          .collection("address_cache")
          .updateOne(
            { _id: cacheKey as any },
            { $set: { results, query: cleanQuery, updated_at: new Date() } },
            { upsert: true },
          );
      } catch (e) {
        console.warn("[Address Cache Save Warning]:", e);
      }
    }

    return results;
  });
