import { createServerFn } from "@tanstack/react-start";
import { requireAdmin, requireSupervisorOrAdmin } from "./auth-middleware";

const EVOLUTION_TIMEOUT_MS = 10000;

// 1. Obter Status da Conexão do WhatsApp
export const getWhatsAppStatus = createServerFn({ method: "GET" })
  .middleware([requireSupervisorOrAdmin])
  .handler(async () => {
    const { getSystemSettings } = await import("./settings.server");
    const settings = await getSystemSettings();
    const url = settings.evolution_api_url;
    const apiKey = settings.evolution_api_key;
    const instanceName = settings.whatsapp_instance_name;

    if (!url) {
      return {
        status: "error" as const,
        instanceName,
        error: "Evolution API URL não configurada.",
      };
    }

    try {
      const response = await fetch(`${url}/instance/connectionState/${instanceName}`, {
        method: "GET",
        headers: {
          apikey: apiKey,
        },
        signal: AbortSignal.timeout(EVOLUTION_TIMEOUT_MS),
      });

      if (response.status === 404) {
        console.log(`Instância '${instanceName}' não encontrada. Criando automaticamente...`);
        const createRes = await fetch(`${url}/instance/create`, {
          method: "POST",
          headers: {
            apikey: apiKey,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(EVOLUTION_TIMEOUT_MS),
          body: JSON.stringify({
            instanceName: instanceName,
            token: apiKey,
            qrcode: true,
          }),
        });

        if (!createRes.ok) {
          console.error(
            `Falha ao criar instância '${instanceName}' na Evolution API:`,
            await createRes.text()
          );
          return { status: "close" as const, instanceName, message: "Instância não criada" };
        }

        console.log(`Instância '${instanceName}' criada com sucesso!`);
        return {
          status: "close" as const,
          instanceName,
          message: "Instância criada. Aguardando conexão.",
        };
      }

      if (!response.ok) {
        throw new Error(`Falha ao obter status: ${response.statusText}`);
      }

      const data = await response.json();
      const state = data.instance?.state || "close";

      return {
        status: state === "open" ? ("open" as const) : ("close" as const),
        instanceName,
        details: data.instance,
      };
    } catch (error) {
      console.error("Erro em getWhatsAppStatus:", error);
      return {
        status: "error" as const,
        instanceName,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  });

// 2. Gerar/Obter QR Code para Conexão
export const getWhatsAppQRCode = createServerFn({ method: "GET" })
  .middleware([requireSupervisorOrAdmin])
  .handler(async () => {
    const { getSystemSettings } = await import("./settings.server");
    const settings = await getSystemSettings();
    const url = settings.evolution_api_url;
    const apiKey = settings.evolution_api_key;
    const instanceName = settings.whatsapp_instance_name;

    if (!url) {
      throw new Error("Evolution API URL não configurada nas Configurações.");
    }

    try {
      const response = await fetch(`${url}/instance/connect/${instanceName}`, {
        method: "GET",
        headers: {
          apikey: apiKey,
        },
        signal: AbortSignal.timeout(EVOLUTION_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`Erro ao conectar instância '${instanceName}':`, errText);
        throw new Error("Não foi possível gerar o QR Code.");
      }

      const data = await response.json();
      return {
        base64: data.base64 || null,
        code: data.code || null,
      };
    } catch (error) {
      console.error("Erro em getWhatsAppQRCode:", error);
      throw new Error(error instanceof Error ? error.message : "Erro ao gerar QR Code");
    }
  });

// 3. Desconectar WhatsApp (Logout - Apenas Admin)
export const disconnectWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { getSystemSettings } = await import("./settings.server");
    const settings = await getSystemSettings();
    const url = settings.evolution_api_url;
    const apiKey = settings.evolution_api_key;
    const instanceName = settings.whatsapp_instance_name;

    if (!url) {
      throw new Error("Evolution API URL não configurada.");
    }

    try {
      const response = await fetch(`${url}/instance/logout/${instanceName}`, {
        method: "DELETE",
        headers: {
          apikey: apiKey,
        },
        signal: AbortSignal.timeout(EVOLUTION_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`Erro ao deslogar instância '${instanceName}':`, errText);
        throw new Error("Não foi possível desconectar.");
      }

      return { success: true };
    } catch (error) {
      console.error("Erro em disconnectWhatsApp:", error);
      throw new Error(error instanceof Error ? error.message : "Erro ao desconectar");
    }
  });
