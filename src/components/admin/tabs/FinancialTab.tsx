import { useMemo, useState } from "react";
import {
  Coins,
  TrendingUp,
  CheckCircle,
  XCircle,
  BarChart3,
  Calendar,
  Clock,
  Bike,
  Download,
} from "lucide-react";
import { formatBRL } from "@/data/catalog";
import { OrderRow } from "./OrdersTab";

type FinancialPeriod = "today" | "7d" | "30d" | "all";

function normalizeRankingItemName(rawName: string, basePizzaName?: string): string {
  if (basePizzaName && basePizzaName.trim()) return basePizzaName.trim();
  return rawName
    .replace(/\s*\[[^\]]*\]/g, "")
    .replace(/\s*\((?:Borda [^)]+|Sem Borda[^)]*)\)/gi, "")
    .trim();
}

function avgMinutes(deltasMs: number[]): number | null {
  if (deltasMs.length === 0) return null;
  const totalMin = deltasMs.reduce((acc, ms) => acc + ms / 60000, 0);
  return Math.round(totalMin / deltasMs.length);
}

export function FinancialTab({
  orders,
  isAdmin = true,
}: {
  orders: OrderRow[];
  isAdmin?: boolean;
}) {
  // Supervisors are locked to today's operational view (no consolidated historical revenue)
  const [adminPeriod, setAdminPeriod] = useState<FinancialPeriod>("today");
  const period: FinancialPeriod = isAdmin ? adminPeriod : "today";

  const periodOrders = useMemo(() => {
    if (period === "all") return orders;
    const now = new Date();
    let cutoff: Date;
    if (period === "today") {
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === "7d") {
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    return orders.filter((o) => {
      const created = new Date(o.created_at);
      return !isNaN(created.getTime()) && created >= cutoff;
    });
  }, [orders, period]);

  const confirmedOrders = periodOrders.filter(
    (o) =>
      o.status !== "cancelado" &&
      (o.payment_method !== "Pix" || o.payment_status === "paid")
  );
  const revenue = confirmedOrders.reduce((sum, o) => sum + o.total, 0);
  const totalDiscounts = confirmedOrders.reduce((sum, o) => sum + (o.discount || 0), 0);
  const totalDeliveryFees = confirmedOrders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0);
  const activeCount = confirmedOrders.filter((o) => o.status !== "entregue").length;
  const completedCount = confirmedOrders.filter((o) => o.status === "entregue").length;
  const canceledCount = periodOrders.filter((o) => o.status === "cancelado").length;
  const ticketMedio =
    confirmedOrders.length > 0 ? revenue / confirmedOrders.length : 0;

  // SLA metrics from real stage timestamps
  const prepDeltas: number[] = [];
  const deliveryDeltas: number[] = [];
  for (const o of confirmedOrders) {
    const startPrep = o.preparing_at ? new Date(o.preparing_at).getTime() : new Date(o.created_at).getTime();
    if (o.dispatched_at) {
      const d = new Date(o.dispatched_at).getTime() - startPrep;
      if (d > 0 && d < 6 * 3600 * 1000) prepDeltas.push(d);
    }
    if (o.delivered_at) {
      const d = new Date(o.delivered_at).getTime() - new Date(o.created_at).getTime();
      if (d > 0 && d < 6 * 3600 * 1000) deliveryDeltas.push(d);
    }
  }
  const avgPrepMin = avgMinutes(prepDeltas);
  const avgDeliveryMin = avgMinutes(deliveryDeltas);

  const pizzaSales: Record<string, number> = {};
  confirmedOrders.forEach((o) => {
    o.order_items?.forEach((i) => {
      const key = normalizeRankingItemName(i.pizza_name, i.base_pizza_name);
      if (!key) return;
      pizzaSales[key] = (pizzaSales[key] || 0) + i.quantity;
    });
  });
  const sortedSales = Object.entries(pizzaSales).sort((a, b) => b[1] - a[1]);

  const paymentCounts: Record<string, { count: number; amount: number }> = {};
  confirmedOrders.forEach((o) => {
    const entry = paymentCounts[o.payment_method] || { count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += o.total;
    paymentCounts[o.payment_method] = entry;
  });

  const handleExportCsv = () => {
    if (!isAdmin) return;
    const header = [
      "ID",
      "Data",
      "Cliente",
      "Modalidade",
      "Pagamento",
      "Status",
      "Subtotal",
      "Desconto",
      "Taxa Entrega",
      "Total",
    ];
    const rows = periodOrders.map((o) => [
      o.id.slice(0, 8),
      new Date(o.created_at).toLocaleString("pt-BR"),
      `"${(o.customer_name || "").replace(/"/g, '""')}"`,
      o.delivery_mode || "delivery",
      `"${o.payment_method}"`,
      o.status,
      (o.subtotal || 0).toFixed(2),
      (o.discount || 0).toFixed(2),
      (o.delivery_fee || 0).toFixed(2),
      (o.total || 0).toFixed(2),
    ]);
    const csv = [header.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-pizzaria-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const periodButtons: Array<{ id: FinancialPeriod; label: string }> = [
    { id: "today", label: "Hoje" },
    { id: "7d", label: "7 dias" },
    { id: "30d", label: "30 dias" },
    { id: "all", label: "Todos" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-bold text-foreground">
            {isAdmin ? "Indicadores Gerenciais & Financeiro" : "Relatório Operacional do Turno (Hoje)"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isAdmin
              ? `Visão consolidada do período selecionado (${periodOrders.length} pedidos).`
              : `Acompanhamento operacional do expediente de hoje (${periodOrders.length} pedidos). Dados financeiros consolidados são restritos ao Administrador.`}
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-card p-1">
              <Calendar className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
              {periodButtons.map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setAdminPeriod(btn.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    period === btn.id
                      ? "bg-gold text-gold-foreground shadow-gold-glow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground transition hover:border-gold/50 hover:text-gold"
            >
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </button>
          </div>
        )}
      </div>

      {/* Cards Principais */}
      {isAdmin ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Faturamento Confirmado
              </span>
              <Coins className="h-5 w-5 text-gold" />
            </div>
            <div className="mt-2 font-serif text-2xl text-gold font-bold">{formatBRL(revenue)}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Descontos: {formatBRL(totalDiscounts)} · Fretes: {formatBRL(totalDeliveryFees)}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ticket Médio
              </span>
              <TrendingUp className="h-5 w-5 text-blue-400" />
            </div>
            <div className="mt-2 font-serif text-2xl text-foreground font-bold">
              {formatBRL(ticketMedio)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {confirmedOrders.length} pedidos confirmados
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pedidos Concluídos
              </span>
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="mt-2 font-serif text-2xl text-foreground font-bold">
              {completedCount}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{activeCount} em andamento</div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pedidos Cancelados
              </span>
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="mt-2 font-serif text-2xl text-foreground font-bold">
              {canceledCount}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Taxa: {periodOrders.length > 0 ? ((canceledCount / periodOrders.length) * 100).toFixed(0) : 0}%
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pedidos Confirmados (Hoje)
              </span>
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="mt-2 font-serif text-2xl text-foreground font-bold">
              {confirmedOrders.length}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {completedCount} entregues · {activeCount} em andamento
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tempo Médio de Forno
              </span>
              <Clock className="h-5 w-5 text-gold" />
            </div>
            <div className="mt-2 font-serif text-2xl text-gold font-bold">
              {avgPrepMin !== null ? `${avgPrepMin} min` : "—"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Base: {prepDeltas.length} pedidos despachados
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tempo Médio Total
              </span>
              <Bike className="h-5 w-5 text-blue-400" />
            </div>
            <div className="mt-2 font-serif text-2xl text-foreground font-bold">
              {avgDeliveryMin !== null ? `${avgDeliveryMin} min` : "—"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Do pedido até entrega ({deliveryDeltas.length} un.)
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cancelados (Hoje)
              </span>
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="mt-2 font-serif text-2xl text-foreground font-bold">
              {canceledCount}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Taxa: {periodOrders.length > 0 ? ((canceledCount / periodOrders.length) * 100).toFixed(0) : 0}%
            </div>
          </div>
        </div>
      )}

      {/* Faixa SLA para Admin */}
      {isAdmin && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gold" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  SLA Médio de Preparo (Forno)
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Medido em {prepDeltas.length} pedido(s) com etapa registrada
                </p>
              </div>
            </div>
            <span className="font-serif text-xl font-bold text-gold">
              {avgPrepMin !== null ? `${avgPrepMin} min` : "—"}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4">
            <div className="flex items-center gap-3">
              <Bike className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  SLA Médio Total até Entrega
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Medido em {deliveryDeltas.length} pedido(s) concluído(s)
                </p>
              </div>
            </div>
            <span className="font-serif text-xl font-bold text-foreground">
              {avgDeliveryMin !== null ? `${avgDeliveryMin} min` : "—"}
            </span>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-serif text-base font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gold" /> Ranking de Vendas (Top 5)
          </h3>
          {sortedSales.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma pizza vendida neste período.</p>
          ) : (
            <div className="space-y-3.5">
              {sortedSales.slice(0, 5).map(([name, qty], idx) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">
                      {idx + 1}
                    </span>
                    <span>{name}</span>
                  </div>
                  <span className="font-semibold text-gold">{qty} un.</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-serif text-base font-semibold mb-4 flex items-center gap-2">
            <Coins className="h-5 w-5 text-gold" /> Formas de Pagamento
          </h3>
          {Object.keys(paymentCounts).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(paymentCounts).map(([method, info]) => {
                const activeTotal = confirmedOrders.length;
                const pct = activeTotal > 0 ? (info.count / activeTotal) * 100 : 0;
                return (
                  <div key={method} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{method}</span>
                      <span className="font-semibold text-muted-foreground">
                        {info.count} ({pct.toFixed(0)}%)
                        {isAdmin ? ` · ${formatBRL(info.amount)}` : ""}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
