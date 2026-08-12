import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listOrders, updateOrderStatus } from "@/lib/orders.functions";
import { 
  LogOut, 
  RefreshCw, 
  Phone, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Flame,
  MessageSquare,
  Loader2,
  CheckCircle,
  QrCode,
  AlertTriangle
} from "lucide-react";
import { getWhatsAppStatus, getWhatsAppQRCode, disconnectWhatsApp } from "@/lib/whatsapp.functions";

type OrderRow = Awaited<ReturnType<typeof listOrders>>[number];

const STATUS_META: Record<
  OrderRow["status"],
  { label: string; className: string; next?: OrderRow["status"]; nextLabel?: string }
> = {
  novo: {
    label: "Novo",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    next: "preparando",
    nextLabel: "Iniciar preparo",
  },
  preparando: {
    label: "Preparando",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    next: "saiu",
    nextLabel: "Saiu para entrega",
  },
  saiu: {
    label: "Saiu para entrega",
    className: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    next: "entregue",
    nextLabel: "Marcar entregue",
  },
  entregue: {
    label: "Entregue",
    className: "bg-green-500/15 text-green-400 border-green-500/30",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
};

const PAYMENT_STATUS_META: Record<
  OrderRow["payment_status"],
  { label: string; className: string }
> = {
  pending: {
    label: "Pendente",
    className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  paid: {
    label: "Pago",
    className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  failed: {
    label: "Falhou",
    className: "bg-red-500/10 text-red-500 border-red-500/20",
  },
  refunded: {
    label: "Reembolsado",
    className: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  },
  on_delivery: {
    label: "Na Entrega",
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
};

const formatBRL = (v: number | string) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel de Pedidos — Pizzaria Império" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const fetchOrders = useServerFn(listOrders);
  const updateStatus = useServerFn(updateOrderStatus);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ativos" | "todos" | OrderRow["status"]>("ativos");
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"pedidos" | "whatsapp">("pedidos");
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
      } else {
        setWhatsappStatus("close");
      }
    } catch (e) {
      setWhatsappStatus("error");
      setWhatsappError(e instanceof Error ? e.message : "Falha ao obter status do WhatsApp.");
    }
  };

  useEffect(() => {
    checkWhatsApp();
  }, []);

  useEffect(() => {
    if (viewMode !== "whatsapp" || whatsappStatus === "open") return;
    
    const interval = setInterval(() => {
      checkWhatsApp();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [viewMode, whatsappStatus]);

  const handleGenerateQR = async () => {
    setWhatsappLoading(true);
    setWhatsappError(null);
    try {
      const res = await fetchWhatsappQRCode();
      if (res.base64) {
        setQrCode(res.base64);
      } else {
        throw new Error("Evolution API não retornou o QR Code.");
      }
    } catch (e) {
      setWhatsappError(e instanceof Error ? e.message : "Erro ao gerar QR Code.");
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Tem certeza que deseja desconectar o WhatsApp?")) return;
    setWhatsappLoading(true);
    setWhatsappError(null);
    try {
      await logoutWhatsapp();
      setWhatsappStatus("close");
      setQrCode(null);
    } catch (e) {
      setWhatsappError(e instanceof Error ? e.message : "Erro ao desconectar.");
    } finally {
      setWhatsappLoading(false);
    }
  };

  const load = async () => {
    try {
      const data = await fetchOrders();
      setOrders(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar pedidos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      load();
    }, 10000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const filtered = useMemo(() => {
    if (filter === "todos") return orders;
    if (filter === "ativos") {
      return orders.filter((o) => o.status !== "entregue" && o.status !== "cancelado");
    }
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ativos: 0, todos: orders.length };
    for (const o of orders) {
      c[o.status] = (c[o.status] ?? 0) + 1;
      if (o.status !== "entregue" && o.status !== "cancelado") c.ativos++;
    }
    return c;
  }, [orders]);

  const handleStatus = async (id: string, status: OrderRow["status"]) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      await updateStatus({ data: { id, status } });
    } catch {
      load();
    }
  };

  const onLogout = async () => {
    document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    localStorage.removeItem("auth_token");
    navigate({ to: "/auth" });
  };

  const tabs: Array<{ id: typeof filter; label: string }> = [
    { id: "ativos", label: `Ativos (${counts.ativos ?? 0})` },
    { id: "novo", label: `Novos (${counts.novo ?? 0})` },
    { id: "preparando", label: `Preparando (${counts.preparando ?? 0})` },
    { id: "saiu", label: `Saiu (${counts.saiu ?? 0})` },
    { id: "entregue", label: `Entregues (${counts.entregue ?? 0})` },
    { id: "cancelado", label: `Cancelados (${counts.cancelado ?? 0})` },
    { id: "todos", label: `Todos (${counts.todos})` },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Flame className="h-5 w-5 text-gold" />
              <div>
                <h1 className="font-serif text-lg leading-tight">Painel Administrativo</h1>
                <p className="text-xs text-muted-foreground">Pizzaria Império</p>
              </div>
            </div>
            
            <nav className="flex items-center gap-1 bg-secondary/40 p-1 rounded-full border border-border">
              <button
                type="button"
                onClick={() => setViewMode("pedidos")}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition ${
                  viewMode === "pedidos"
                    ? "bg-gold text-gold-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Pedidos
              </button>
              <button
                type="button"
                onClick={() => setViewMode("whatsapp")}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition ${
                  viewMode === "whatsapp"
                    ? "bg-gold text-gold-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                WhatsApp
              </button>
            </nav>
          </div>
          
          <div className="flex items-center gap-2">
            {viewMode === "pedidos" && (
              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Atualizar
              </button>
            )}
            <Link
              to="/"
              className="hidden rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground sm:inline-block"
            >
              Ver site
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition hover:brightness-125"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </div>
        
        {viewMode === "pedidos" && (
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-6 pb-3">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilter(t.id)}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  filter === t.id
                    ? "border-gold bg-gold/15 text-gold"
                    : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {viewMode === "pedidos" ? (
          loading ? (
            <p className="text-sm text-muted-foreground">Carregando pedidos…</p>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center">
              <p className="font-serif text-lg">Nenhum pedido por aqui.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Quando um cliente fizer um pedido, ele aparece aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((o) => (
                <OrderCard key={o.id} order={o} onStatus={handleStatus} />
              ))}
            </div>
          )
        ) : (
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
        )}
      </main>
    </div>
  );
}

function OrderCard({
  order,
  onStatus,
}: {
  order: OrderRow;
  onStatus: (id: string, status: OrderRow["status"]) => void;
}) {
  const meta = STATUS_META[order.status];
  const created = new Date(order.created_at);
  const timeStr = created.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dateStr = created.toLocaleDateString("pt-BR");
  const phoneDigits = order.customer_phone.replace(/\D/g, "");

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="font-serif text-lg leading-tight">{order.customer_name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" /> {dateStr} · {timeStr}
          </div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}>
          {meta.label}
        </span>
      </header>

      <div className="mt-3 space-y-1.5 text-sm">
        <a
          href={`tel:${phoneDigits}`}
          className="flex items-center gap-2 text-muted-foreground transition hover:text-gold"
        >
          <Phone className="h-3.5 w-3.5" /> {order.customer_phone}
        </a>
        <div className="flex items-start gap-2 text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 flex-none" />
          <span className="whitespace-pre-wrap">{order.customer_address}</span>
        </div>
      </div>

      <ul className="mt-4 space-y-1 border-t border-border/60 pt-3 text-sm">
        {order.order_items?.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-2">
            <span>
              <span className="font-semibold text-gold">{i.quantity}×</span> {i.pizza_name}
            </span>
            <span className="text-xs text-muted-foreground">{formatBRL(i.subtotal)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 space-y-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        <div className="flex justify-between items-center">
          <span>Pagamento</span>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-foreground">
              {order.payment_method}
              {order.troco != null && ` (troco p/ ${formatBRL(order.troco)})`}
            </span>
            {(() => {
              const status = order.payment_status || "on_delivery";
              const meta = PAYMENT_STATUS_META[status] || PAYMENT_STATUS_META.on_delivery;
              return (
                <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none ${meta.className}`}>
                  {meta.label}
                </span>
              );
            })()}
          </div>
        </div>
        {order.notes && (
          <div>
            <span className="font-semibold text-foreground">Obs.:</span> {order.notes}
          </div>
        )}
        <div className="flex justify-between pt-1 text-sm">
          <span>Total</span>
          <span className="font-serif text-lg text-gold">{formatBRL(order.total)}</span>
        </div>
      </div>

      {(meta.next || order.status !== "cancelado") && (
        <div className="mt-4 flex flex-wrap gap-2">
          {meta.next && meta.nextLabel && (
            <button
              type="button"
              onClick={() => onStatus(order.id, meta.next!)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gold px-3 py-2 text-xs font-bold uppercase tracking-wider text-gold-foreground transition hover:brightness-110"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> {meta.nextLabel}
            </button>
          )}
          {order.status !== "entregue" && order.status !== "cancelado" && (
            <button
              type="button"
              onClick={() => onStatus(order.id, "cancelado")}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-destructive hover:text-destructive"
            >
              <XCircle className="h-3.5 w-3.5" /> Cancelar
            </button>
          )}
        </div>
      )}
    </article>
  );
}
