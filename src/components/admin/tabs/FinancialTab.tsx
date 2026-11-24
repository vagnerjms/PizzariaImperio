import { useMemo, useState } from "react";
import { Coins, TrendingUp, CheckCircle, XCircle, BarChart3, Calendar } from "lucide-react";
import { formatBRL } from "@/data/catalog";
import { OrderRow } from "./OrdersTab";

type FinancialPeriod = "today" | "7d" | "30d" | "all";

function normalizeRankingItemName(rawName: string, basePizzaName?: string): string {
  if (basePizzaName && basePizzaName.trim()) return basePizzaName.trim();
  // Strip trailing [Obs: ...] notes and (Borda ...) crust suffixes for cleaner aggregation
  return rawName
    .replace(/\s*\[[^\]]*\]/g, "")
    .replace(/\s*\((?:Borda [^)]+|Sem Borda[^)]*)\)/gi, "")
    .trim();
}

export function FinancialTab({ orders }: { orders: OrderRow[] }) {
  const [period, setPeriod] = useState<FinancialPeriod>("all");

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

  // Exclui pedidos cancelados e pedidos Pix ainda não pagos (pendentes)
  const confirmedOrders = periodOrders.filter(
    (o) =>
      o.status !== "cancelado" &&
      (o.payment_method !== "Pix" || o.payment_status === "paid")
  );
  const revenue = confirmedOrders.reduce((sum, o) => sum + o.total, 0);
  const activeCount = confirmedOrders.filter((o) => o.status !== "entregue").length;
  const completedCount = confirmedOrders.filter((o) => o.status === "entregue").length;
  const canceledCount = periodOrders.filter((o) => o.status === "cancelado").length;
  const ticketMedio =
    completedCount + activeCount > 0 ? revenue / (completedCount + activeCount) : 0;

  const pizzaSales: Record<string, number> = {};
  confirmedOrders.forEach((o) => {
    o.order_items?.forEach((i) => {
      const key = normalizeRankingItemName(i.pizza_name, i.base_pizza_name);
      if (!key) return;
      pizzaSales[key] = (pizzaSales[key] || 0) + i.quantity;
    });
  });
  const sortedSales = Object.entries(pizzaSales).sort((a, b) => b[1] - a[1]);

  const paymentCounts: Record<string, number> = {};
  confirmedOrders.forEach((o) => {
    paymentCounts[o.payment_method] = (paymentCounts[o.payment_method] || 0) + 1;
  });

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
          <h2 className="font-serif text-xl font-bold text-foreground">Indicadores de Vendas</h2>
          <p className="text-xs text-muted-foreground">
            Baseado nos pedidos confirmados no período selecionado ({periodOrders.length} pedidos).
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-card p-1">
          <Calendar className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
          {periodButtons.map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setPeriod(btn.id)}
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Faturamento (Vendas Ativas)</span>
            <Coins className="h-5 w-5 text-gold" />
          </div>
          <div className="mt-2 font-serif text-2xl text-gold font-bold">{formatBRL(revenue)}</div>
          <div className="mt-1 text-xs text-muted-foreground">Excluindo cancelados e Pix pendentes</div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ticket Médio</span>
            <TrendingUp className="h-5 w-5 text-blue-400" />
          </div>
          <div className="mt-2 font-serif text-2xl text-foreground font-bold">{formatBRL(ticketMedio)}</div>
          <div className="mt-1 text-xs text-muted-foreground">Média por pedido</div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pedidos Concluídos</span>
            <CheckCircle className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="mt-2 font-serif text-2xl text-foreground font-bold">{completedCount}</div>
          <div className="mt-1 text-xs text-muted-foreground">{activeCount} em andamento</div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pedidos Cancelados</span>
            <XCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="mt-2 font-serif text-2xl text-foreground font-bold">{canceledCount}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Taxa: {periodOrders.length > 0 ? ((canceledCount / periodOrders.length) * 100).toFixed(0) : 0}%
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-serif text-base font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gold" /> Ranking de Vendas (Top 5)
          </h3>
          {sortedSales.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma pizza vendida ainda.</p>
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
              {Object.entries(paymentCounts).map(([method, count]) => {
                const activeTotal = confirmedOrders.length;
                const pct = activeTotal > 0 ? (count / activeTotal) * 100 : 0;
                return (
                  <div key={method} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{method}</span>
                      <span className="font-semibold text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
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
