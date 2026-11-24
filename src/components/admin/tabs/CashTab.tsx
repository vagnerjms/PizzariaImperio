import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Lock,
  Unlock,
  Printer,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  History,
  Banknote,
  QrCode,
  CreditCard,
} from "lucide-react";
import { formatBRL } from "@/data/catalog";
import {
  getCashDashboard,
  openCashShift,
  addCashMovement,
  closeCashShift,
  CashDashboardResponse,
} from "@/lib/cash.functions";
import { calculateCashClosingDifference, CashShiftRow, CashShiftSummary } from "@/lib/cash-domain";
import { PrintableCashShift, printCashShiftThermal, PrinterSettings } from "@/lib/thermal-printer";

function toPrintableShift(
  shift: CashShiftRow,
  summary?: CashShiftSummary | null,
): PrintableCashShift {
  const byPayment = shift.summary_by_payment ||
    summary?.byPayment || {
      pix: 0,
      dinheiro: 0,
      credito: 0,
      debito: 0,
      outros: 0,
    };

  return {
    id: shift.id,
    opened_by: shift.opened_by,
    opened_at: shift.opened_at,
    closed_by: shift.closed_by,
    closed_at: shift.closed_at,
    opening_balance: shift.opening_balance,
    expected_cash: shift.expected_cash ?? summary?.expectedCash ?? 0,
    counted_cash: shift.counted_cash,
    cash_difference: shift.cash_difference,
    gross_sales: shift.gross_sales ?? summary?.grossSales ?? 0,
    total_orders: shift.total_orders ?? summary?.totalOrders ?? 0,
    by_payment: byPayment,
    movements: shift.movements.map((m) => ({
      type: m.type,
      amount: m.amount,
      reason: m.reason,
    })),
    closing_notes: shift.closing_notes,
  };
}

export function CashTab({
  isAdmin,
  printerSettings,
}: {
  isAdmin: boolean;
  printerSettings: PrinterSettings;
}) {
  const queryClient = useQueryClient();
  const fetchDashboard = useServerFn(getCashDashboard);
  const openShiftFn = useServerFn(openCashShift);
  const addMovementFn = useServerFn(addCashMovement);
  const closeShiftFn = useServerFn(closeCashShift);

  const { data, isLoading, refetch } = useQuery<CashDashboardResponse>({
    queryKey: ["admin", "cash-dashboard"],
    queryFn: async () => fetchDashboard(),
    refetchInterval: 15000,
  });

  // Open shift form
  const [openingBalance, setOpeningBalance] = useState("100");
  // Movement form
  const [movementType, setMovementType] = useState<"sangria" | "suprimento">("sangria");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("");
  // Close shift form
  const [countedCash, setCountedCash] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  // UI states
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const [lastClosedReceipt, setLastClosedReceipt] = useState<PrintableCashShift | null>(null);

  const showMsg = (text: string, isError = false) => {
    setFeedback({ text, isError });
    setTimeout(() => setFeedback(null), 6000);
  };

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(openingBalance.replace(",", "."));
    if (!Number.isFinite(val) || val < 0) {
      showMsg("Informe um valor válido para o fundo de troco.", true);
      return;
    }

    setSubmitting(true);
    try {
      await openShiftFn({ data: { opening_balance: val } });
      setLastClosedReceipt(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "cash-dashboard"] });
      showMsg(`Caixa aberto com fundo de troco de ${formatBRL(val)}!`);
    } catch (err) {
      showMsg(err instanceof Error ? err.message : "Erro ao abrir caixa.", true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(movementAmount.replace(",", "."));
    if (!Number.isFinite(val) || val <= 0) {
      showMsg("Informe um valor maior que zero.", true);
      return;
    }
    if (movementReason.trim().length < 2) {
      showMsg("Informe o motivo da movimentação.", true);
      return;
    }

    setSubmitting(true);
    try {
      await addMovementFn({
        data: {
          type: movementType,
          amount: val,
          reason: movementReason.trim(),
        },
      });
      setMovementAmount("");
      setMovementReason("");
      await queryClient.invalidateQueries({ queryKey: ["admin", "cash-dashboard"] });
      showMsg(
        movementType === "sangria"
          ? `Sangria de ${formatBRL(val)} registrada.`
          : `Suprimento de ${formatBRL(val)} registrado.`,
      );
    } catch (err) {
      showMsg(err instanceof Error ? err.message : "Erro ao lançar movimentação.", true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(countedCash.replace(",", "."));
    if (!Number.isFinite(val) || val < 0) {
      showMsg("Informe o valor contado em dinheiro na gaveta.", true);
      return;
    }

    if (
      !window.confirm(`Confirmar fechamento do turno com ${formatBRL(val)} contados na gaveta?`)
    ) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await closeShiftFn({
        data: {
          counted_cash: val,
          closing_notes: closingNotes.trim() || undefined,
        },
      });
      const printable = toPrintableShift(res.shift, res.summary);
      setLastClosedReceipt(printable);
      setCountedCash("");
      setClosingNotes("");
      await queryClient.invalidateQueries({ queryKey: ["admin", "cash-dashboard"] });
      showMsg("Turno fechado com sucesso! Recibo pronto para impressão.");
      printCashShiftThermal(printable, printerSettings).catch(console.error);
    } catch (err) {
      showMsg(err instanceof Error ? err.message : "Erro ao fechar caixa.", true);
    } finally {
      setSubmitting(false);
    }
  };

  const activeShift = data?.activeShift ?? null;
  const activeSummary = data?.activeSummary ?? null;
  const history = data?.history ?? [];

  const parsedCounted = Number(countedCash.replace(",", "."));
  const previewDiff =
    activeSummary && countedCash.trim() !== "" && Number.isFinite(parsedCounted)
      ? calculateCashClosingDifference(activeSummary.expectedCash, parsedCounted)
      : null;

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando controle de caixa...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-gold" /> Controle de Caixa (PDV)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Abertura de turno, sangrias, suprimentos e conferência de fechamento da gaveta.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar Caixa
        </button>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-xs font-semibold ${
            feedback.isError
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {lastClosedReceipt && !activeShift && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-2.5 text-sm text-emerald-300">
            <CheckCircle2 className="h-5 w-5 flex-none" />
            <span>
              Turno <strong>#{lastClosedReceipt.id.slice(0, 8).toUpperCase()}</strong> fechado —
              Esperado: <strong>{formatBRL(lastClosedReceipt.expected_cash)}</strong> · Contado:{" "}
              <strong>{formatBRL(lastClosedReceipt.counted_cash ?? 0)}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => void printCashShiftThermal(lastClosedReceipt, printerSettings)}
            className="inline-flex items-center gap-1.5 rounded-full bg-gold px-3.5 py-1.5 text-xs font-bold text-gold-foreground hover:brightness-110 transition"
          >
            <Printer className="h-3.5 w-3.5" /> Reimprimir Fechamento
          </button>
        </div>
      )}

      {/* TURNO FECHADO: FORMULÁRIO DE ABERTURA */}
      {!activeShift ? (
        <form
          onSubmit={handleOpenShift}
          className="rounded-2xl border border-border bg-card p-6 max-w-xl space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
              <Unlock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold">Abrir Caixa do Turno</h3>
              <p className="text-xs text-muted-foreground">
                Nenhum caixa aberto no momento. Informe o fundo de troco inicial da gaveta.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Fundo de Troco Inicial (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-semibold focus:border-gold focus:outline-none"
              placeholder="100.00"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-gold-foreground hover:brightness-110 transition disabled:opacity-50"
          >
            <Unlock className="h-4 w-4" />
            {submitting ? "Abrindo..." : "Abrir Turno Agora"}
          </button>
        </form>
      ) : (
        /* TURNO ABERTO: DASHBOARD + MOVIMENTAÇÕES + FECHAMENTO */
        <div className="space-y-6">
          {/* Status Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                  ● CAIXA ABERTO
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  #{activeShift.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Aberto por <strong className="text-foreground">{activeShift.opened_by}</strong> em{" "}
                <strong className="text-foreground">
                  {new Date(activeShift.opened_at).toLocaleString("pt-BR")}
                </strong>
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Esperado na Gaveta (Dinheiro)
                </p>
                <p className="font-serif text-2xl font-bold text-gold">
                  {formatBRL(activeSummary?.expectedCash ?? activeShift.opening_balance)}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  void printCashShiftThermal(
                    toPrintableShift(activeShift, activeSummary),
                    printerSettings,
                  )
                }
                title="Imprimir parcial do caixa"
                className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-2 text-xs font-semibold text-gold hover:bg-gold hover:text-gold-foreground transition"
              >
                <Printer className="h-3.5 w-3.5" /> Parcial
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          {activeSummary && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Fundo Inicial
                </p>
                <p className="mt-1 font-serif text-xl font-bold">
                  {formatBRL(activeShift.opening_balance)}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Banknote className="h-3.5 w-3.5 text-emerald-400" /> Dinheiro
                </p>
                <p className="mt-1 font-serif text-xl font-bold text-emerald-400">
                  {formatBRL(activeSummary.byPayment.dinheiro)}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <QrCode className="h-3.5 w-3.5 text-sky-400" /> Pix (Pago)
                </p>
                <p className="mt-1 font-serif text-xl font-bold text-sky-400">
                  {formatBRL(activeSummary.byPayment.pix)}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5 text-purple-400" /> Cartões
                </p>
                <p className="mt-1 font-serif text-xl font-bold text-purple-400">
                  {formatBRL(activeSummary.byPayment.credito + activeSummary.byPayment.debito)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Créd: {formatBRL(activeSummary.byPayment.credito)} · Déb:{" "}
                  {formatBRL(activeSummary.byPayment.debito)}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Vendas do Turno ({activeSummary.totalOrders} ped.)
                </p>
                <p className="mt-1 font-serif text-xl font-bold text-gold">
                  {formatBRL(activeSummary.grossSales)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Supr: +{formatBRL(activeSummary.totalSuprimentos)} · Sang: -
                  {formatBRL(activeSummary.totalSangrias)}
                </p>
              </div>
            </div>
          )}

          {/* Grid: Movimentações (Sangria/Suprimento) + Fechamento */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Sangria & Suprimento */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <h3 className="font-serif text-lg font-bold">Sangrias & Suprimentos</h3>

              <form onSubmit={handleAddMovement} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementType("sangria")}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition ${
                      movementType === "sangria"
                        ? "border-red-500/50 bg-red-500/15 text-red-400"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ArrowDownCircle className="h-4 w-4" /> Sangria (Retirada)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType("suprimento")}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition ${
                      movementType === "suprimento"
                        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ArrowUpCircle className="h-4 w-4" /> Suprimento (Reforço)
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Valor (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={movementAmount}
                      onChange={(e) => setMovementAmount(e.target.value)}
                      placeholder="50.00"
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Motivo obrigatório
                    </label>
                    <input
                      type="text"
                      required
                      value={movementReason}
                      onChange={(e) => setMovementReason(e.target.value)}
                      placeholder={
                        movementType === "sangria"
                          ? "Ex.: Pagamento motoboy / Compra de gás"
                          : "Ex.: Reforço de moedas para troco"
                      }
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-xs font-bold text-foreground hover:bg-gold hover:text-gold-foreground transition disabled:opacity-50"
                >
                  Registrar {movementType === "sangria" ? "Sangria" : "Suprimento"}
                </button>
              </form>

              <div className="border-t border-border/60 pt-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  Lançamentos neste turno ({activeShift.movements.length})
                </p>
                {activeShift.movements.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Nenhuma sangria ou suprimento registrado ainda.
                  </p>
                ) : (
                  <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {activeShift.movements.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-xs"
                      >
                        <div>
                          <span
                            className={`font-bold ${
                              m.type === "sangria" ? "text-red-400" : "text-emerald-400"
                            }`}
                          >
                            {m.type === "sangria" ? "[-] Sangria" : "[+] Suprimento"}
                          </span>{" "}
                          <span className="text-foreground">{m.reason}</span>
                          <p className="text-[10px] text-muted-foreground">
                            {m.created_by} ·{" "}
                            {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <span
                          className={`font-bold whitespace-nowrap ${
                            m.type === "sangria" ? "text-red-400" : "text-emerald-400"
                          }`}
                        >
                          {m.type === "sangria" ? "-" : "+"}
                          {formatBRL(m.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Fechamento de Caixa */}
            <form
              onSubmit={handleCloseShift}
              className="rounded-2xl border border-gold/30 bg-card p-5 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-gold" />
                  <h3 className="font-serif text-lg font-bold">Fechar Caixa do Turno</h3>
                </div>

                <div className="rounded-xl border border-border/70 bg-background/60 p-3.5 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fundo de Troco</span>
                    <span>{formatBRL(activeShift.opening_balance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">(+) Vendas em Dinheiro</span>
                    <span className="text-emerald-400">
                      +{formatBRL(activeSummary?.byPayment.dinheiro ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">(+) Suprimentos</span>
                    <span className="text-emerald-400">
                      +{formatBRL(activeSummary?.totalSuprimentos ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">(-) Sangrias</span>
                    <span className="text-red-400">
                      -{formatBRL(activeSummary?.totalSangrias ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border/60 pt-1.5 font-bold text-sm">
                    <span>Esperado na Gaveta</span>
                    <span className="text-gold">{formatBRL(activeSummary?.expectedCash ?? 0)}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Dinheiro Contado Fisicamente na Gaveta (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    placeholder="Conte as notas/moedas e digite o total"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold focus:border-gold focus:outline-none"
                  />
                </div>

                {previewDiff !== null && (
                  <div
                    className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-bold ${
                      previewDiff === 0
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                        : previewDiff > 0
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                          : "border-red-500/40 bg-red-500/10 text-red-400"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {previewDiff === 0 ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                      {previewDiff === 0
                        ? "Caixa Batido!"
                        : previewDiff > 0
                          ? "Sobra de Caixa"
                          : "Falta de Caixa"}
                    </span>
                    <span>
                      {previewDiff >= 0 ? "+" : "-"}
                      {formatBRL(Math.abs(previewDiff))}
                    </span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Observações do Fechamento (opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    placeholder="Ex.: Diferença referente a troco de pedido #1234"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:border-gold focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-xs font-bold uppercase tracking-wider text-gold-foreground hover:brightness-110 transition disabled:opacity-50"
              >
                <Lock className="h-4 w-4" />
                {submitting ? "Fechando..." : "Fechar Turno e Imprimir Recibo"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* HISTÓRICO CONSOLIDADO DE TURNOS FECHADOS (SOMENTE ADMIN) */}
      {isAdmin && (
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold flex items-center gap-2">
              <History className="h-5 w-5 text-gold" /> Histórico de Caixas Fechados (Auditoria
              Admin)
            </h3>
            <span className="text-xs text-muted-foreground">Últimos {history.length} turnos</span>
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum turno fechado registrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground uppercase text-[10px]">
                    <th className="py-2 pr-3">Turno / Datas</th>
                    <th className="py-2 pr-3">Operadores</th>
                    <th className="py-2 pr-3 text-right">Vendas</th>
                    <th className="py-2 pr-3 text-right">Esperado</th>
                    <th className="py-2 pr-3 text-right">Contado</th>
                    <th className="py-2 pr-3 text-right">Diferença</th>
                    <th className="py-2 text-right">Recibo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {history.map((shift) => {
                    const diff = shift.cash_difference ?? 0;
                    const diffClass =
                      diff === 0
                        ? "text-emerald-400"
                        : diff > 0
                          ? "text-amber-300"
                          : "text-red-400";
                    return (
                      <tr key={shift.id} className="hover:bg-secondary/20">
                        <td className="py-2.5 pr-3">
                          <div className="font-mono font-bold text-foreground">
                            #{shift.id.slice(0, 8).toUpperCase()}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(shift.opened_at).toLocaleString("pt-BR")} →{" "}
                            {shift.closed_at
                              ? new Date(shift.closed_at).toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 text-muted-foreground">
                          <div>Abre: {shift.opened_by}</div>
                          <div>Fecha: {shift.closed_by || "-"}</div>
                        </td>
                        <td className="py-2.5 pr-3 text-right font-semibold">
                          {formatBRL(shift.gross_sales ?? 0)}
                          <div className="text-[10px] text-muted-foreground">
                            {shift.total_orders ?? 0} ped.
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 text-right">
                          {formatBRL(shift.expected_cash ?? 0)}
                        </td>
                        <td className="py-2.5 pr-3 text-right font-semibold">
                          {formatBRL(shift.counted_cash ?? 0)}
                        </td>
                        <td className={`py-2.5 pr-3 text-right font-bold ${diffClass}`}>
                          {diff === 0
                            ? "Batido"
                            : `${diff > 0 ? "+" : "-"}${formatBRL(Math.abs(diff))}`}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              void printCashShiftThermal(toPrintableShift(shift), printerSettings)
                            }
                            className="inline-flex items-center gap-1 rounded-full border border-gold/40 px-2.5 py-1 text-[11px] font-semibold text-gold hover:bg-gold hover:text-gold-foreground transition"
                          >
                            <Printer className="h-3 w-3" /> Imprimir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
