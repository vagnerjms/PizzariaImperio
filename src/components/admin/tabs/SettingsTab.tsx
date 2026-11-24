import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ShieldAlert,
  Loader2,
  MessageSquare,
  Coins,
  Terminal,
  Copy,
  CheckCircle,
  MapPin,
  Printer,
  Usb,
  LogOut,
  Clock,
  CreditCard,
  Phone,
} from "lucide-react";
import { getAdminSettings, updateAdminSettings } from "@/lib/settings";
import {
  DAY_LABELS_PT,
  DayOfWeekKey,
  DEFAULT_ENABLED_DELIVERY_MODES,
  DEFAULT_ENABLED_PAYMENT_METHODS,
  DEFAULT_OPENING_HOURS,
  EnabledDeliveryModes,
  EnabledPaymentMethods,
  OpeningHoursMap,
  StoreStatusOverride,
} from "@/lib/store-hours";
import { PrinterSettings } from "@/lib/thermal-printer";

export function SettingsTab({
  currentUser,
  printerConnected,
  printerSettings,
  onConnectPrinter,
  onDisconnectPrinter,
  onTestPrint,
  onUpdatePrinterSetting,
}: {
  currentUser: { email: string; roles: string[] };
  printerConnected: boolean;
  printerSettings: PrinterSettings;
  onConnectPrinter: () => void;
  onDisconnectPrinter: () => void;
  onTestPrint: () => void;
  onUpdatePrinterSetting: <K extends keyof PrinterSettings>(key: K, value: PrinterSettings[K]) => void;
}) {
  const fetchSettings = useServerFn(getAdminSettings);
  const saveSettings = useServerFn(updateAdminSettings);

  const [settingsForm, setSettingsForm] = useState<{
    evolution_api_url: string;
    evolution_api_key: string;
    n8n_webhook_url: string;
    mercado_pago_access_token: string;
    mercado_pago_public_key: string;
    whatsapp_instance_name: string;
    google_maps_api_key: string;
    store_phone: string;
    store_status_override: StoreStatusOverride;
    pause_reason: string;
    opening_hours: OpeningHoursMap;
    enabled_payment_methods: EnabledPaymentMethods;
    enabled_delivery_modes: EnabledDeliveryModes;
  }>({
    evolution_api_url: "",
    evolution_api_key: "",
    n8n_webhook_url: "",
    mercado_pago_access_token: "",
    mercado_pago_public_key: "",
    whatsapp_instance_name: "Disparo",
    google_maps_api_key: "",
    store_phone: "",
    store_status_override: "auto",
    pause_reason: "",
    opening_hours: { ...DEFAULT_OPENING_HOURS },
    enabled_payment_methods: { ...DEFAULT_ENABLED_PAYMENT_METHODS },
    enabled_delivery_modes: { ...DEFAULT_ENABLED_DELIVERY_MODES },
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);
  const [settingsErrorMsg, setSettingsErrorMsg] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const loadSettings = async () => {
    if (!currentUser?.roles?.includes("admin")) return;
    setSettingsLoading(true);
    setSettingsErrorMsg(null);
    try {
      const data = await fetchSettings();
      setSettingsForm({
        evolution_api_url: data.evolution_api_url || "",
        evolution_api_key: data.evolution_api_key || "",
        n8n_webhook_url: data.n8n_webhook_url || "",
        mercado_pago_access_token: data.mercado_pago_access_token || "",
        mercado_pago_public_key: data.mercado_pago_public_key || "",
        whatsapp_instance_name: data.whatsapp_instance_name || "Disparo",
        google_maps_api_key: data.google_maps_api_key || "",
        store_phone: data.store_phone || "",
        store_status_override: data.store_status_override || "auto",
        pause_reason: data.pause_reason || "",
        opening_hours: data.opening_hours || { ...DEFAULT_OPENING_HOURS },
        enabled_payment_methods:
          data.enabled_payment_methods || { ...DEFAULT_ENABLED_PAYMENT_METHODS },
        enabled_delivery_modes:
          data.enabled_delivery_modes || { ...DEFAULT_ENABLED_DELIVERY_MODES },
      });
    } catch (e) {
      setSettingsErrorMsg(e instanceof Error ? e.message : "Erro ao carregar configurações.");
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsSuccessMsg(null);
    setSettingsErrorMsg(null);
    try {
      await saveSettings({ data: settingsForm });
      setSettingsSuccessMsg("Configurações salvas com sucesso!");
      setTimeout(() => setSettingsSuccessMsg(null), 4000);
    } catch (err) {
      setSettingsErrorMsg(err instanceof Error ? err.message : "Erro ao salvar configurações.");
    } finally {
      setSettingsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <header className="flex items-center gap-4 border-b border-border/60 pb-4 mb-6">
          <div className="rounded-xl bg-gold/10 p-2.5 text-gold">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-serif text-lg leading-tight">Configurações do Sistema</h2>
            <p className="text-xs text-muted-foreground">Painel de gerenciamento de APIs (Salvo no banco de dados MongoDB)</p>
          </div>
        </header>

        {settingsLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-gold mb-3" />
            <p className="text-sm">Carregando configurações...</p>
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {settingsErrorMsg && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                {settingsErrorMsg}
              </div>
            )}
            {settingsSuccessMsg && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-xs text-green-500 font-semibold">
                {settingsSuccessMsg}
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-serif text-sm font-bold text-gold flex items-center gap-2 border-b border-border/40 pb-2">
                <MessageSquare className="h-4 w-4" /> Evolution API (WhatsApp)
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Evolution API URL
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsForm.evolution_api_url}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, evolution_api_url: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Instância do WhatsApp
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsForm.whatsapp_instance_name}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, whatsapp_instance_name: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Evolution API Key
                </label>
                <input
                  type="password"
                  required
                  value={settingsForm.evolution_api_key}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, evolution_api_key: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-serif text-sm font-bold text-gold flex items-center gap-2 border-b border-border/40 pb-2">
                <Coins className="h-4 w-4" /> Mercado Pago (Gateway de Pagamento)
              </h3>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Access Token Privado
                </label>
                <input
                  type="password"
                  required
                  value={settingsForm.mercado_pago_access_token}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, mercado_pago_access_token: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Public Key (Chave Pública)
                </label>
                <input
                  type="text"
                  required
                  value={settingsForm.mercado_pago_public_key}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, mercado_pago_public_key: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-serif text-sm font-bold text-gold flex items-center gap-2 border-b border-border/40 pb-2">
                <Terminal className="h-4 w-4" /> Automação & Webhooks
              </h3>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  n8n Webhook URL
                </label>
                <input
                  type="text"
                  required
                  value={settingsForm.n8n_webhook_url}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, n8n_webhook_url: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Mercado Pago Webhook Endpoint (URL para o Gateway)
                  </label>
                  {typeof window !== "undefined" && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/webhook`);
                        setCopiedWebhook(true);
                        setTimeout(() => setCopiedWebhook(false), 3000);
                      }}
                      className="text-xs text-gold hover:underline flex items-center gap-1 font-semibold"
                    >
                      {copiedWebhook ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 text-green-500" /> Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copiar URL Completa
                        </>
                      )}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  readOnly
                  value={typeof window !== "undefined" ? `${window.location.origin}/api/webhook` : "/api/webhook"}
                  className="mt-1.5 w-full rounded-xl border border-border bg-secondary/30 px-3.5 py-2.5 text-sm text-foreground font-mono focus:outline-none select-all"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Cole esta URL completa no seu painel de <strong>Webhooks / Notificações IPN</strong> do Mercado Pago Developers para receber avisos automáticos de Pix e Cartão.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-serif text-sm font-bold text-gold flex items-center gap-2 border-b border-border/40 pb-2">
                <MapPin className="h-4 w-4" /> Geocodificação & Endereços (Failover de Segurança)
              </h3>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Google Places / Maps API Key (Último Recurso)
                </label>
                <input
                  type="text"
                  value={settingsForm.google_maps_api_key}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, google_maps_api_key: e.target.value }))}
                  placeholder="AIzaSy..."
                  className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2.5 text-sm text-foreground font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  🛡️ <strong>Economia & Segurança:</strong> Esta chave da Google Maps API <strong>só é consumida como último recurso</strong> caso nenhuma das 4 APIs gratuitas (ViaCEP, Photon OSM, Nominatim e Catálogo do MongoDB) localize o endereço do cliente.
                </p>
              </div>
            </div>

            {/* Operação da Loja: Telefone, Status & Horários de Funcionamento */}
            <div className="space-y-4">
              <h3 className="font-serif text-sm font-bold text-gold flex items-center gap-2 border-b border-border/40 pb-2">
                <Clock className="h-4 w-4" /> Funcionamento, Horários & Telefone da Loja
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    WhatsApp Oficial da Loja (Site / Contato)
                  </label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                    <input
                      type="text"
                      value={settingsForm.store_phone}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({ ...prev, store_phone: e.target.value }))
                      }
                      placeholder="5511999999999"
                      className="w-full rounded-xl border border-border bg-secondary/20 pl-9 pr-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Controle de Abertura
                  </label>
                  <select
                    value={settingsForm.store_status_override}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        store_status_override: e.target.value as StoreStatusOverride,
                      }))
                    }
                    className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                  >
                    <option value="auto">Automático (seguir horários abaixo)</option>
                    <option value="force_open">Forçar Loja Aberta</option>
                    <option value="force_closed">Pausar / Fechar Recebimento de Pedidos</option>
                  </select>
                </div>
              </div>

              {settingsForm.store_status_override === "force_closed" && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Motivo da Pausa (exibido na vitrine)
                  </label>
                  <input
                    type="text"
                    maxLength={160}
                    value={settingsForm.pause_reason}
                    onChange={(e) =>
                      setSettingsForm((prev) => ({ ...prev, pause_reason: e.target.value }))
                    }
                    placeholder="Ex.: Alta demanda no forno — voltamos em 20 min!"
                    className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                </div>
              )}

              <div className="rounded-xl border border-border bg-secondary/15 p-3.5 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Horários por Dia da Semana (Horário de Brasília)
                </p>
                {(["1", "2", "3", "4", "5", "6", "0"] as DayOfWeekKey[]).map((dayKey) => {
                  const day = settingsForm.opening_hours[dayKey];
                  return (
                    <div
                      key={dayKey}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-card/60 px-3 py-2 text-xs"
                    >
                      <label className="flex items-center gap-2 font-semibold text-foreground min-w-[95px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={day.enabled}
                          onChange={(e) =>
                            setSettingsForm((prev) => ({
                              ...prev,
                              opening_hours: {
                                ...prev.opening_hours,
                                [dayKey]: { ...day, enabled: e.target.checked },
                              },
                            }))
                          }
                          className="accent-gold"
                        />
                        {DAY_LABELS_PT[dayKey]}
                      </label>

                      {day.enabled ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={day.open}
                            onChange={(e) =>
                              setSettingsForm((prev) => ({
                                ...prev,
                                opening_hours: {
                                  ...prev.opening_hours,
                                  [dayKey]: { ...day, open: e.target.value },
                                },
                              }))
                            }
                            className="rounded-lg border border-border bg-secondary/30 px-2 py-1 text-xs text-foreground"
                          />
                          <span className="text-muted-foreground">às</span>
                          <input
                            type="time"
                            value={day.close}
                            onChange={(e) =>
                              setSettingsForm((prev) => ({
                                ...prev,
                                opening_hours: {
                                  ...prev.opening_hours,
                                  [dayKey]: { ...day, close: e.target.value },
                                },
                              }))
                            }
                            className="rounded-lg border border-border bg-secondary/30 px-2 py-1 text-xs text-foreground"
                          />
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          Fechado
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modalidades & Meios de Pagamento */}
            <div className="space-y-4">
              <h3 className="font-serif text-sm font-bold text-gold flex items-center gap-2 border-b border-border/40 pb-2">
                <CreditCard className="h-4 w-4" /> Modalidades & Meios de Pagamento Ativos
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-secondary/15 p-3.5 space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Formas de Pagamento
                  </span>
                  {(
                    [
                      ["pix", "Pix Online"],
                      ["credito", "Cartão de Crédito (Maquininha)"],
                      ["debito", "Cartão de Débito (Maquininha)"],
                      ["dinheiro", "Dinheiro (com Troco)"],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center justify-between text-xs text-foreground cursor-pointer"
                    >
                      <span>{label}</span>
                      <input
                        type="checkbox"
                        checked={settingsForm.enabled_payment_methods[key]}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            enabled_payment_methods: {
                              ...prev.enabled_payment_methods,
                              [key]: e.target.checked,
                            },
                          }))
                        }
                        className="accent-gold h-4 w-4"
                      />
                    </label>
                  ))}
                </div>

                <div className="rounded-xl border border-border bg-secondary/15 p-3.5 space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Modalidades de Recebimento
                  </span>
                  {(
                    [
                      ["delivery", "Entrega (Delivery)"],
                      ["pickup", "Retirada no Balcão"],
                      ["dine_in", "Consumir no Local (Salão / Mesa)"],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center justify-between text-xs text-foreground cursor-pointer"
                    >
                      <span>{label}</span>
                      <input
                        type="checkbox"
                        checked={settingsForm.enabled_delivery_modes[key]}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            enabled_delivery_modes: {
                              ...prev.enabled_delivery_modes,
                              [key]: e.target.checked,
                            },
                          }))
                        }
                        className="accent-gold h-4 w-4"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <button
                type="submit"
                disabled={settingsSaving}
                className="rounded-full bg-gold px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
              >
                {settingsSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {settingsSaving ? "Salvando..." : "Salvar Configurações"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Impressora Térmica Local (Bematech MP-4200 / ESC-POS) */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-gold/10 p-2.5 text-gold">
              <Printer className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-serif text-lg leading-tight">Impressora Térmica de Comandas</h2>
              <p className="text-xs text-muted-foreground">Impressão direta ESC/POS via USB (Bematech MP-4200 TH, Epson, Elgin, etc.)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
                printerConnected
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${printerConnected ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
              {printerConnected ? "USB Conectada" : "Desconectada"}
            </span>
          </div>
        </header>

        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            {!printerConnected ? (
              <button
                type="button"
                onClick={onConnectPrinter}
                className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 active:scale-95"
              >
                <Usb className="h-4 w-4" /> Conectar Impressora USB (Bematech MP-4200)
              </button>
            ) : (
              <button
                type="button"
                onClick={onDisconnectPrinter}
                className="inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-destructive transition hover:bg-destructive/20 active:scale-95"
              >
                <LogOut className="h-4 w-4" /> Desconectar USB
              </button>
            )}

            <button
              type="button"
              onClick={onTestPrint}
              className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-gold transition hover:bg-gold hover:text-gold-foreground active:scale-95"
            >
              <Printer className="h-4 w-4" /> Imprimir Comanda de Teste
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border/40">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Largura da Bobina</label>
              <select
                value={printerSettings.paperWidth}
                onChange={(e) => onUpdatePrinterSetting("paperWidth", e.target.value as "80mm" | "58mm")}
                className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
              >
                <option value="80mm">80mm / 48 colunas (Padrão MP-4200 TH / TM-T20)</option>
                <option value="58mm">58mm / 32 colunas (Mini térmica)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Baud Rate (Velocidade Serial)</label>
              <select
                value={printerSettings.baudRate}
                onChange={(e) => onUpdatePrinterSetting("baudRate", Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
              >
                <option value={9600}>9600 bps (Padrão Bematech / Elgin)</option>
                <option value={115200}>115200 bps (Alta velocidade)</option>
                <option value={19200}>19200 bps</option>
                <option value={38400}>38400 bps</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-border/40">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={printerSettings.autoPrintOnAccept}
                onChange={(e) => onUpdatePrinterSetting("autoPrintOnAccept", e.target.checked)}
                className="h-4 w-4 rounded border-border text-gold focus:ring-gold"
              />
              <div>
                <span className="text-sm font-semibold text-foreground block">Imprimir comanda automaticamente ao aceitar pedido</span>
                <span className="text-xs text-muted-foreground">Dispara a comanda para a cozinha assim que o atendente clicar em "Iniciar preparo"</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={printerSettings.autoCut}
                onChange={(e) => onUpdatePrinterSetting("autoCut", e.target.checked)}
                className="h-4 w-4 rounded border-border text-gold focus:ring-gold"
              />
              <div>
                <span className="text-sm font-semibold text-foreground block">Acionar guilhotina (corte automático de papel)</span>
                <span className="text-xs text-muted-foreground">Envia o comando de corte automático ao final da comanda</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={printerSettings.beep}
                onChange={(e) => onUpdatePrinterSetting("beep", e.target.checked)}
                className="h-4 w-4 rounded border-border text-gold focus:ring-gold"
              />
              <div>
                <span className="text-sm font-semibold text-foreground block">Emitir alerta sonoro (Beep)</span>
                <span className="text-xs text-muted-foreground">A impressora emite um bip sonoro para alertar a cozinha</span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
