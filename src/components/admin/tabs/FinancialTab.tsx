import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
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
  Loader2,
} from "lucide-react";
import { formatBRL } from "@/lib/formatters";
import { queryKeys } from "@/lib/query-keys";
import { OrderRow } from "@/types/orders";
import {
  exportFinancialOrdersCsv,
  FinancialReportPeriod,
  getFinancialReport,
} from "@/lib/orders.functions";

export function FinancialTab({
  isAdmin = true,
}: {
  orders?: OrderRow[];
  isAdmin?: boolean;
}) {
  // Supervisors are locked to today's operational view (no consolidated historical revenue)
  const [adminPeriod, setAdminPeriod] = useState<FinancialReportPeriod>("today");
  const [exportingCsv, setExportingCsv] = useState(false);
  const period: FinancialReportPeriod = isAdmin ? adminPeriod : "today";

  const fetchReport = useServerFn(getFinancialReport);
  const fetchCsv = useServerFn(exportFinancialOrdersCsv);

  const { data: report, isLoading } = useQuery({
    queryKey: queryKeys.admin.financialReport(period),
    queryFn: async () => fetchReport({ data: { period } }),
    refetchInterval: 30000,
  });

  const totalOrdersCount = report?.totalOrdersCount ?? 0;
  const confirmedCount = report?.confirmedCount ?? 0;
  const completedCount = report?.completedCount ?? 0;
  const activeCount = report?.activeCount ?? 0;
  const canceledCount = report?.canceledCount ?? 0;
  const revenue = report?.revenue ?? 0;
  const totalDiscounts = report?.totalDiscounts ?? 0;
  const totalDeliveryFees = report?.totalDeliveryFees ?? 0;
  const ticketMedio = report?.ticketMedio ?? 0;
  const avgPrepMin = report?.avgPrepMin ?? null;
  const prepSampleCount = report?.prepSampleCount ?? 0;
  const avgDeliveryMin = report?.avgDeliveryMin ?? null;
  const deliverySampleCount = report?.deliverySampleCount ?? 0;
  const topItems = report?.topItems ?? [];
  const paymentBreakdown = report?.paymentBreakdown ?? [];

  const handleExportCsv = async () => {
    if (!isAdmin || exportingCsv) return;
    setExportingCsv(true);
    try {
      const csv = await fetchCsv({ data: { period } });
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-pizzaria-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao exportar CSV:", err);
    } finally {
      setExportingCsv(false);
    }
  };

  const periodButtons: Array<{ id: FinancialReportPeriod; label: string }> = [
    { id: "today", label: "Hoje" },
    { id: "7d", label: "7 dias" },
    { id: "30d", label: "30 dias" },
    { id: "all", label: "Todos" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-bold text-foreground flex items-center gap-2">
            {isAdmin ? "Indicadores Gerenciais & Financeiro" : "Relatório Operacional do Turno (Hoje)"}
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gold" />}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isAdmin
              ? `Visão consolidada do período selecionado (${totalOrdersCount} pedidos).`
              : `Acompanhamento operacional do expediente de hoje (${totalOrdersCount} pedidos). Dados financeiros consolidados são restritos ao Administrador.`}
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
              disabled={exportingCsv}
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground transition hover:border-gold/50 hover:text-gold disabled:opacity-50"
            >
              {exportingCsv ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}{" "}
              Exportar CSV
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
              {confirmedCount} pedidos confirmados
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
              Taxa: {totalOrdersCount > 0 ? ((canceledCount / totalOrdersCount) * 100).toFixed(0) : 0}%
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
              {confirmedCount}
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
              Base: {prepSampleCount} pedidos despachados
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
              Do pedido até entrega ({deliverySampleCount} un.)
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
              Taxa: {totalOrdersCount > 0 ? ((canceledCount / totalOrdersCount) * 100).toFixed(0) : 0}%
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
                  Medido em {prepSampleCount} pedido(s) com etapa registrada
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
                  Medido em {deliverySampleCount} pedido(s) concluído(s)
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
          {topItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma pizza vendida neste período.</p>
          ) : (
            <div className="space-y-3.5">
              {topItems.map(({ name, qty }, idx) => (
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
          {paymentBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
          ) : (
            <div className="space-y-4">
              {paymentBreakdown.map(({ method, count, amount }) => {
                const pct = confirmedCount > 0 ? (count / confirmedCount) * 100 : 0;
                return (
                  <div key={method} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{method}</span>
                      <span className="font-semibold text-muted-foreground">
                        {count} ({pct.toFixed(0)}%)
                        {isAdmin ? ` · ${formatBRL(amount)}` : ""}
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
