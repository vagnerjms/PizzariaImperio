import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  MessageSquare,
  Loader2,
  CheckCircle,
  AlertTriangle,
  QrCode,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { getWhatsAppStatus, getWhatsAppQRCode, disconnectWhatsApp } from "@/lib/whatsapp.functions";

export function WhatsAppTab() {
  const [whatsappStatus, setWhatsappStatus] = useState<"open" | "close" | "checking" | "error">("checking");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);

  const fetchWhatsappStatus = useServerFn(getWhatsAppStatus);
  const fetchWhatsappQRCode = useServerFn(getWhatsAppQRCode);
  const logoutWhatsapp = useServerFn(disconnectWhatsApp);

  const checkWhatsApp = async (showLoading = false) => {
    if (showLoading) setWhatsappStatus("checking");
    try {
      const res = await fetchWhatsappStatus();
      if (res.status === "open") {
        setWhatsappStatus("open");
        setQrCode(null);
      } else if (res.status === "close") {
        setWhatsappStatus("close");
      } else {
        setWhatsappStatus("close");
      }
    } catch {
      setWhatsappStatus("error");
    }
  };

  useEffect(() => {
    checkWhatsApp();
    const interval = setInterval(() => {
      checkWhatsApp();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleGenerateQR = async () => {
    setWhatsappLoading(true);
    setWhatsappError(null);
    try {
      const res = await fetchWhatsappQRCode();
      const qr = res.base64 || (res as any).qrcode;
      if (qr) {
        setQrCode(qr);
        setWhatsappStatus("close");
      } else {
        setWhatsappError("Não foi possível obter o QR Code. Tente novamente.");
      }
    } catch (e) {
      setWhatsappError(e instanceof Error ? e.message : "Erro ao gerar QR Code");
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Deseja realmente desconectar o WhatsApp?")) return;
    setWhatsappLoading(true);
    setWhatsappError(null);
    try {
      await logoutWhatsapp();
      setWhatsappStatus("close");
      setQrCode(null);
    } catch (e) {
      setWhatsappError(e instanceof Error ? e.message : "Erro ao desconectar");
    } finally {
      setWhatsappLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <header className="flex items-center gap-4 border-b border-border/60 pb-4 mb-6">
          <div className="rounded-xl bg-gold/10 p-2.5 text-gold">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-serif text-lg leading-tight">Configurações do WhatsApp</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              Instância: <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-foreground font-semibold">Disparo</span>
            </p>
          </div>
        </header>

        {whatsappError && (
          <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
            {whatsappError}
          </div>
        )}

        {whatsappStatus === "checking" && (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-gold mb-3" />
            <p className="text-sm">Verificando status de conexão...</p>
          </div>
        )}

        {whatsappStatus === "open" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-green-500">
              <CheckCircle className="h-5 w-5 flex-none" />
              <div>
                <h3 className="text-sm font-semibold">WhatsApp Conectado!</h3>
                <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-0.5">
                  O sistema está ativo e pronto para enviar mensagens automáticas.
                </p>
              </div>
            </div>

            <div className="space-y-2 rounded-xl bg-secondary/30 p-4 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Nome da Instância</span>
                <span className="font-semibold text-foreground">Disparo</span>
              </div>
              <div className="flex justify-between">
                <span>Status do Servidor</span>
                <span className="font-semibold text-green-500">Ativo / Conectado</span>
              </div>
            </div>

            <button
              type="button"
              disabled={whatsappLoading}
              onClick={handleDisconnect}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-destructive/30 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
            >
              {whatsappLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Desconectar WhatsApp"
              )}
            </button>
          </div>
        )}

        {whatsappStatus === "close" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-amber-500">
              <AlertTriangle className="h-5 w-5 flex-none" />
              <div>
                <h3 className="text-sm font-semibold">WhatsApp Desconectado</h3>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                  Os envios automáticos de mensagens de pedidos estão suspensos.
                </p>
              </div>
            </div>

            {!qrCode ? (
              <div className="space-y-4 text-center">
                <p className="text-xs text-muted-foreground leading-relaxed px-4">
                  Para ativar os disparos, clique no botão abaixo para gerar o QR Code e escaneie com seu celular no WhatsApp.
                </p>
                <button
                  type="button"
                  disabled={whatsappLoading}
                  onClick={handleGenerateQR}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gold-foreground transition hover:brightness-110 disabled:opacity-50"
                >
                  {whatsappLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <QrCode className="h-3.5 w-3.5" />
                      Gerar QR Code
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-5 text-center">
                <div className="mx-auto rounded-2xl border border-border bg-white p-4 shadow-sm inline-block">
                  <img src={qrCode} alt="Escanear QR Code" className="mx-auto" style={{ maxWidth: '240px' }} />
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground">Aguardando leitura do celular...</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed px-6">
                    Abra o WhatsApp no seu celular, acesse <strong>Aparelhos conectados</strong>, clique em <strong>Conectar um aparelho</strong> e aponte a câmera.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground animate-pulse">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />
                  Verificando conexão automaticamente...
                </div>

                <button
                  type="button"
                  disabled={whatsappLoading}
                  onClick={handleGenerateQR}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                >
                  {whatsappLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3" />
                      Gerar Novo QR Code
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {whatsappStatus === "error" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-destructive">
              <XCircle className="h-5 w-5 flex-none" />
              <div>
                <h3 className="text-sm font-semibold">Falha na Comunicação</h3>
                <p className="text-xs text-destructive/80 mt-0.5">
                  Não foi possível conectar-se ao servidor da Evolution API.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed px-2 text-center">
              Verifique se o container da <strong>Evolution API</strong> está rodando corretamente na VPS e se as credenciais no arquivo <code className="bg-secondary px-1 py-0.5 rounded font-semibold">.env</code> estão corretas.
            </p>

            <button
              type="button"
              onClick={() => checkWhatsApp(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition hover:text-foreground"
            >
              Tentar Novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
