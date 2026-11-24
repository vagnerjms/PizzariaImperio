export interface CepLookupResult {
  rua: string;
  bairro: string;
  cidadeUf: string;
}

/**
 * Resolves a Brazilian 8-digit CEP with cascading multi-provider fallback:
 * ViaCEP -> BrasilAPI -> AwesomeAPI.
 */
export async function lookupAddressByCep(cleanCEP: string): Promise<CepLookupResult | null> {
  if (!/^\d{8}$/.test(cleanCEP)) return null;

  // 1. Primary: ViaCEP
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && !data.erro) {
        return {
          rua: data.logradouro || "",
          bairro: data.bairro || "",
          cidadeUf: data.localidade
            ? `${data.localidade} - ${data.uf || "SP"}`
            : "Bragança Paulista - SP",
        };
      }
    }
  } catch (err) {
    console.warn("ViaCEP fallback acionado:", err);
  }

  // 2. Fallback 1: BrasilAPI
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCEP}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && (data.street || data.neighborhood)) {
        return {
          rua: data.street || "",
          bairro: data.neighborhood || "",
          cidadeUf: data.city
            ? `${data.city} - ${data.state || "SP"}`
            : "Bragança Paulista - SP",
        };
      }
    }
  } catch (err) {
    console.warn("BrasilAPI fallback acionado:", err);
  }

  // 3. Fallback 2: AwesomeAPI
  try {
    const res = await fetch(`https://cep.awesomeapi.com.br/json/${cleanCEP}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && !data.status) {
        return {
          rua: data.address || "",
          bairro: data.district || "",
          cidadeUf: data.city
            ? `${data.city} - ${data.state || "SP"}`
            : "Bragança Paulista - SP",
        };
      }
    }
  } catch (err) {
    console.warn("AwesomeAPI CEP fallback falhou:", err);
  }

  return null;
}
