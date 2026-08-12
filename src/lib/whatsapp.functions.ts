import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "./auth-middleware";

const getEvolutionConfig = () => {
  const url = process.env.EVOLUTION_API_URL || "http://179.197.231.106:8085";
  const apiKey = process.env.EVOLUTION_API_KEY || "pizzaria_evolution_secret_key_2026";
  return { url, apiKey };
};

// 1. Obter Status da Conexão do WhatsApp
export const getWhatsAppStatus = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    // Verificar se o usuário é administrador
    if (!context.roles?.includes("admin")) {
      throw new Error("Acesso restrito.");
    }

    const { url, apiKey } = getEvolutionConfig();

    try {
      const response = await fetch(`${url}/instance/connectionState/Disparo`, {
        method: "GET",
        headers: {
          "apikey": apiKey,
        },
      });

      if (response.status === 404) {
        // Se a instância "Disparo" não existe, cria ela automaticamente
        console.log("Instância 'Disparo' não encontrada. Criando automaticamente...");
        const createRes = await fetch(`${url}/instance/create`, {
          method: "POST",
          headers: {
            "apikey": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            instanceName: "Disparo",
            token: apiKey,
            qrcode: true,
          }),
        });

        if (!createRes.ok) {
          console.error("Falha ao criar instância 'Disparo' na Evolution API:", await createRes.text());
          return { status: "close", message: "Instância não criada" };
        }

        console.log("Instância 'Disparo' criada com sucesso!");
        return { status: "close", message: "Instância criada. Aguardando conexão." };
      }

      if (!response.ok) {
        throw new Error(`Falha ao obter status: ${response.statusText}`);
      }

      const data = await response.json();
      // O status costuma vir em data.instance.state ("open" = conectado, "close" = desconectado)
      const state = data.instance?.state || "close";
      
      return { 
        status: state === "open" ? "open" : "close", 
        details: data.instance 
      };
    } catch (error) {
      console.error("Erro em getWhatsAppStatus:", error);
      return { status: "error", error: error instanceof Error ? error.message : "Erro desconhecido" };
    }
  });

// 2. Gerar/Obter QR Code para Conexão
export const getWhatsAppQRCode = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    if (!context.roles?.includes("admin")) {
      throw new Error("Acesso restrito.");
    }

    const { url, apiKey } = getEvolutionConfig();

    try {
      const response = await fetch(`${url}/instance/connect/Disparo`, {
        method: "GET",
        headers: {
          "apikey": apiKey,
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Erro ao conectar instância 'Disparo':", errText);
        throw new Error("Não foi possível gerar o QR Code.");
      }

      const data = await response.json();
      // A Evolution API retorna o QR Code em data.base64 (data:image/png;base64,...)
      return { 
        base64: data.base64 || null, 
        code: data.code || null 
      };
    } catch (error) {
      console.error("Erro em getWhatsAppQRCode:", error);
      throw new Error(error instanceof Error ? error.message : "Erro ao gerar QR Code");
    }
  });

// 3. Desconectar WhatsApp (Logout)
export const disconnectWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    if (!context.roles?.includes("admin")) {
      throw new Error("Acesso restrito.");
    }

    const { url, apiKey } = getEvolutionConfig();

    try {
      const response = await fetch(`${url}/instance/logout/Disparo`, {
        method: "DELETE",
        headers: {
          "apikey": apiKey,
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Erro ao deslogar instância 'Disparo':", errText);
        throw new Error("Não foi possível desconectar.");
      }

      return { success: true };
    } catch (error) {
      console.error("Erro em disconnectWhatsApp:", error);
      throw new Error(error instanceof Error ? error.message : "Erro ao desconectar");
    }
  });
