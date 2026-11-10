import { useState, useEffect, useCallback } from "react";
import { formatPhoneMask } from "@/lib/formatters";

export interface CustomerProfileData {
  name: string;
  phone: string;
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  complemento: string;
  cidadeUf: string;
}

export const CUSTOMER_STORAGE_KEY = "imperio_customer_profile_v1";

export function useCustomerProfile() {
  const [profile, setProfile] = useState<CustomerProfileData | null>(null);
  const [hasSavedIdentity, setHasSavedIdentity] = useState(false);
  const [hasSavedAddress, setHasSavedAddress] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(CUSTOMER_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && typeof saved === "object") {
        const validIdentity = Boolean(
          saved.name && saved.phone && String(saved.phone).replace(/\D/g, "").length >= 10
        );
        const validAddress = Boolean(saved.rua && saved.numero && saved.bairro);
        setHasSavedIdentity(validIdentity);
        setHasSavedAddress(validAddress);
        setProfile({
          name: saved.name || "",
          phone: saved.phone ? formatPhoneMask(saved.phone) : "",
          cep: saved.cep || "",
          rua: saved.rua || "",
          numero: saved.numero || "",
          bairro: saved.bairro || "",
          complemento: saved.complemento || "",
          cidadeUf: saved.cidadeUf || "Bragança Paulista - SP",
        });
      }
    } catch {
      // Silencia erros de parse do localStorage
    }
  }, []);

  const saveProfile = useCallback((data: Partial<CustomerProfileData>) => {
    if (typeof window === "undefined") return;
    try {
      const payload: CustomerProfileData = {
        name: (data.name || "").trim(),
        phone: (data.phone || "").trim(),
        cep: (data.cep || "").trim(),
        rua: (data.rua || "").trim(),
        numero: (data.numero || "").trim(),
        bairro: (data.bairro || "").trim(),
        complemento: (data.complemento || "").trim(),
        cidadeUf: (data.cidadeUf || "Bragança Paulista - SP").trim(),
      };
      localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(payload));
      setProfile(payload);
      setHasSavedIdentity(Boolean(payload.name && payload.phone.replace(/\D/g, "").length >= 10));
      setHasSavedAddress(Boolean(payload.rua && payload.numero && payload.bairro));
    } catch {
      // Silencia erros de storage
    }
  }, []);

  return {
    profile,
    hasSavedIdentity,
    hasSavedAddress,
    saveProfile,
  };
}

