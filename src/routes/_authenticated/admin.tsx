import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listOrders, updateOrderStatus } from "@/lib/orders.functions";
import { LogOut, RefreshCw, Phone, MapPin, Clock, CheckCircle2, XCircle, Flame } from "lucide-react";

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
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Flame className="h-5 w-5 text-gold" />
            <div>
              <h1 className="font-serif text-lg leading-tight">Painel de Pedidos</h1>
              <p className="text-xs text-muted-foreground">Pizzaria Império</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar
            </button>
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
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {loading ? (
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
