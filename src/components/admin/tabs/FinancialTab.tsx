import { Coins, TrendingUp, CheckCircle, XCircle, BarChart3 } from "lucide-react";
import { formatBRL } from "@/data/catalog";
import { OrderRow } from "./OrdersTab";

export function FinancialTab({ orders }: { orders: OrderRow[] }) {
  const revenue = orders.filter(o => o.status !== "cancelado").reduce((sum, o) => sum + o.total, 0);
  const activeCount = orders.filter(o => o.status !== "entregue" && o.status !== "cancelado").length;
  const completedCount = orders.filter(o => o.status === "entregue").length;
  const canceledCount = orders.filter(o => o.status === "cancelado").length;
  const ticketMedio = (completedCount + activeCount) > 0 ? revenue / (completedCount + activeCount) : 0;

  const pizzaSales: Record<string, number> = {};
  orders.forEach(o => {
    if (o.status !== "cancelado") {
      o.order_items?.forEach(i => {
        pizzaSales[i.pizza_name] = (pizzaSales[i.pizza_name] || 0) + i.quantity;
      });
    }
  });
  const sortedSales = Object.entries(pizzaSales).sort((a, b) => b[1] - a[1]);

  const paymentCounts: Record<string, number> = {};
  orders.forEach(o => {
    if (o.status !== "cancelado") {
      paymentCounts[o.payment_method] = (paymentCounts[o.payment_method] || 0) + 1;
    }
  });

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Faturamento (Vendas Ativas)</span>
            <Coins className="h-5 w-5 text-gold" />
          </div>
          <div className="mt-2 font-serif text-2xl text-gold font-bold">{formatBRL(revenue)}</div>
          <div className="mt-1 text-xs text-muted-foreground">Excluindo cancelados</div>
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
          <div className="mt-1 text-xs text-muted-foreground">Taxa: {orders.length > 0 ? ((canceledCount / orders.length) * 100).toFixed(0) : 0}%</div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-serif text-base font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gold" /> Ranking de Vendas (Pizzas)
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
                const activeTotal = orders.filter(o => o.status !== "cancelado").length;
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
