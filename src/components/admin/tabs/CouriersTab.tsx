import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bike,
  Plus,
  Pencil,
  Trash2,
  Banknote,
  Clock,
  CheckCircle2,
  Phone,
  Power,
} from "lucide-react";
import { formatBRL } from "@/lib/formatters";
import { queryKeys } from "@/lib/query-keys";
import { OrderRow } from "@/types/orders";
import {
  listCouriers,
  saveCourier,
  toggleCourierActive,
  deleteCourier,
  getCourierSettlementReport,
} from "@/lib/couriers.functions";
import {
  CourierPayoutMode,
  CourierRow,
  UNASSIGNED_COURIER_ID,
} from "@/lib/couriers-domain";
import { getCashDashboard } from "@/lib/cash.functions";

export function CouriersTab({ isAdmin }: { orders?: OrderRow[]; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const fetchCouriers = useServerFn(listCouriers);
  const saveCourierFn = useServerFn(saveCourier);
  const toggleCourierFn = useServerFn(toggleCourierActive);
  const deleteCourierFn = useServerFn(deleteCourier);
  const fetchCashDashboard = useServerFn(getCashDashboard);
  const fetchSettlementReport = useServerFn(getCourierSettlementReport);

  const { data: couriers = [], isLoading } = useQuery<CourierRow[]>({
    queryKey: queryKeys.admin.couriers(),
    queryFn: async () => fetchCouriers(),
  });

  const { data: cashData } = useQuery({
    queryKey: queryKeys.admin.cashDashboard(),
    queryFn: async () => fetchCashDashboard(),
  });

  const activeShift = cashData?.activeShift ?? null;

  // Null means "auto" (follow active shift when open, otherwise today)
  const [selectedPeriod, setSelectedPeriod] = useState<"shift" | "today" | "7d" | null>(null);
  const period: "shift" | "today" | "7d" =
    selectedPeriod !== null
      ? !isAdmin && selectedPeriod === "7d"
        ? "today"
        : selectedPeriod === "shift" && !activeShift
          ? "today"
          : selectedPeriod
      : activeShift
        ? "shift"
        : "today";

  const { data: settlementReport } = useQuery({
    queryKey: queryKeys.admin.courierSettlements(period),
    queryFn: async () => fetchSettlementReport({ data: { period } }),
    refetchInterval: 20000,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [payoutMode, setPayoutMode] = useState<CourierPayoutMode>("delivery_fee");
  const [feeSharePercent, setFeeSharePercent] = useState("100");
  const [fixedFee, setFixedFee] = useState("7");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  const showMsg = (text: string, isError = false) => {
    setFeedback({ text, isError });
    setTimeout(() => setFeedback(null), 5000);
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setPhone("");
    setPayoutMode("delivery_fee");
    setFeeSharePercent("100");
    setFixedFee("7");
    setShowForm(false);
  };

  const startEdit = (c: CourierRow) => {
    setEditingId(c.id);
    setName(c.name);
    setPhone(c.phone);
    setPayoutMode(c.payout_mode);
    setFeeSharePercent(String(c.fee_share_percent));
    setFixedFee(String(c.fixed_fee));
    setShowForm(true);
  };

  const invalidateCouriers = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.couriers() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.courierSettlementsAll() }),
    ]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      showMsg("Informe o nome do entregador.", true);
      return;
    }

    setSaving(true);
    try {
      await saveCourierFn({
        data: {
          id: editingId || undefined,
          name: name.trim(),
          phone: phone.trim(),
          active: true,
          payout_mode: payoutMode,
          fee_share_percent: Math.min(100, Math.max(0, Number(feeSharePercent) || 0)),
          fixed_fee: Math.max(0, Number(fixedFee.replace(",", ".")) || 0),
        },
      });
      await invalidateCouriers();
      showMsg(editingId ? "Entregador atualizado!" : "Entregador cadastrado!");
      resetForm();
    } catch (err) {
      showMsg(err instanceof Error ? err.message : "Erro ao salvar entregador.", true);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c: CourierRow) => {
    try {
      await toggleCourierFn({ data: { id: c.id, active: !c.active } });
      await invalidateCouriers();
      showMsg(
        !c.active ? `${c.name} ativado para o turno.` : `${c.name} marcado como fora do turno.`,
      );
    } catch (err) {
      showMsg(err instanceof Error ? err.message : "Erro ao alternar status.", true);
    }
  };

  const handleDelete = async (c: CourierRow) => {
    if (!window.confirm(`Remover entregador "${c.name}"? Pedidos antigos mantêm o histórico.`)) {
      return;
    }
    try {
      await deleteCourierFn({ data: { id: c.id } });
      await invalidateCouriers();
      showMsg(`Entregador "${c.name}" removido.`);
    } catch (err) {
      showMsg(err instanceof Error ? err.message : "Erro ao excluir entregador.", true);
    }
  };

  const settlements = settlementReport?.settlements ?? [];

  const totals = useMemo(() => {
    return settlements.reduce(
      (acc, s) => ({
        deliveries: acc.deliveries + s.deliveriesCount,
        payoutDue: acc.payoutDue + s.payoutDue,
        cashToReturn: acc.cashToReturn + s.cashToReturn,
      }),
      { deliveries: 0, payoutDue: 0, cashToReturn: 0 },
    );
  }, [settlements]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold flex items-center gap-2">
            <Bike className="h-6 w-6 text-gold" /> Logística de Entregadores & Acerto
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Controle de motoboys ativos no turno, repasse de taxas e prestação de contas em
            dinheiro.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeShift && (
            <button
              type="button"
              onClick={() => setSelectedPeriod("shift")}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                period === "shift"
                  ? "border-gold bg-gold/15 text-gold font-bold"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Turno Atual
            </button>
          )}
          <button
            type="button"
            onClick={() => setSelectedPeriod("today")}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              period === "today"
                ? "border-gold bg-gold/15 text-gold font-bold"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Hoje
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setSelectedPeriod("7d")}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                period === "7d"
                  ? "border-gold bg-gold/15 text-gold font-bold"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Últimos 7 dias
            </button>
          )}
        </div>
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

      {/* Resumo de Acerto */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Entregas Despachadas / Concluídas
          </p>
          <p className="mt-1 font-serif text-2xl font-bold">{totals.deliveries}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Total de Repasse aos Motoboys
          </p>
          <p className="mt-1 font-serif text-2xl font-bold text-gold">
            {formatBRL(totals.payoutDue)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Dinheiro a Prestar Contas ao Caixa
          </p>
          <p className="mt-1 font-serif text-2xl font-bold text-emerald-400">
            {formatBRL(totals.cashToReturn)}
          </p>
        </div>
      </div>

      {/* Tabela de Acerto por Entregador */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h3 className="font-serif text-lg font-bold">Acerto por Entregador</h3>

        {settlements.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4">
            Nenhuma entrega despachada (status &quot;Saiu&quot; ou &quot;Entregue&quot;) no período
            selecionado.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {settlements.map((s) => {
              const isUnassigned = s.courierId === UNASSIGNED_COURIER_ID;
              return (
                <div
                  key={s.courierId}
                  className={`rounded-xl border p-4 space-y-2.5 ${
                    isUnassigned
                      ? "border-border/60 bg-background/40"
                      : "border-border bg-background/70"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-serif text-base font-bold flex items-center gap-2">
                      <Bike className="h-4 w-4 text-gold" />
                      {s.courierName}
                    </div>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-bold">
                      {s.deliveriesCount} {s.deliveriesCount === 1 ? "entrega" : "entregas"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" /> {s.deliveredCount}{" "}
                      entregues
                    </span>
                    {s.inTransitCount > 0 && (
                      <span className="text-purple-400 font-semibold">
                        • {s.inTransitCount} em rota
                      </span>
                    )}
                    {s.avgDeliveryMinutes !== null && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gold" /> Média: {s.avgDeliveryMinutes} min
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-2.5 text-xs">
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">Repasse a Pagar</p>
                      <p className="font-bold text-gold text-sm">
                        {isUnassigned ? "—" : formatBRL(s.payoutDue)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Taxas cobradas: {formatBRL(s.totalDeliveryFeesCollected)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                        <Banknote className="h-3 w-3 text-emerald-400" /> Dinheiro c/ Motoboy
                      </p>
                      <p className="font-bold text-emerald-400 text-sm">
                        {formatBRL(s.cashToReturn)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {s.cashOrdersCount} ped. · Troco levado: {formatBRL(s.totalChangeCarried)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Equipe de Motoboys */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-serif text-lg font-bold">Equipe de Motoboys</h3>
            <p className="text-xs text-muted-foreground">
              {isAdmin
                ? "Cadastre entregadores e defina se o repasse é por % da taxa do bairro ou valor fixo."
                : "Ative ou desative quais motoboys estão trabalhando no turno de hoje."}
            </p>
          </div>
          {isAdmin && !showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-bold text-gold-foreground hover:brightness-110 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Novo Entregador
            </button>
          )}
        </div>

        {isAdmin && showForm && (
          <form
            onSubmit={handleSave}
            className="rounded-xl border border-gold/30 bg-background/70 p-4 space-y-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Nome do Entregador
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Carlos (Moto Preta)"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Regra de Repasse
                </label>
                <select
                  value={payoutMode}
                  onChange={(e) => setPayoutMode(e.target.value as CourierPayoutMode)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
                >
                  <option value="delivery_fee">% da Taxa de Entrega do Bairro</option>
                  <option value="fixed">Valor Fixo por Entrega (R$)</option>
                </select>
              </div>

              {payoutMode === "delivery_fee" ? (
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Percentual da Taxa (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={feeSharePercent}
                    onChange={(e) => setFeeSharePercent(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Valor Fixo por Entrega (R$)
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={fixedFee}
                    onChange={(e) => setFixedFee(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-gold px-4 py-2 text-xs font-bold text-gold-foreground hover:brightness-110 transition disabled:opacity-50"
              >
                {saving ? "Salvando..." : editingId ? "Salvar Alterações" : "Cadastrar"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando entregadores...</p>
        ) : couriers.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum entregador cadastrado ainda.{" "}
            {isAdmin && "Clique em 'Novo Entregador' para adicionar sua equipe."}
          </p>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {couriers.map((c) => (
              <div
                key={c.id}
                className={`rounded-xl border p-3.5 flex flex-col justify-between gap-3 ${
                  c.active
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-border/60 bg-background/40 opacity-75"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm">{c.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        c.active
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {c.active ? "No Turno" : "Inativo"}
                    </span>
                  </div>
                  {c.phone && (
                    <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {c.phone}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-gold">
                    {c.payout_mode === "fixed"
                      ? `Repasse fixo: ${formatBRL(c.fixed_fee)} / entrega`
                      : `Repasse: ${c.fee_share_percent}% da taxa do bairro`}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2">
                  <button
                    type="button"
                    onClick={() => void handleToggleActive(c)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                      c.active
                        ? "border-border text-muted-foreground hover:text-foreground"
                        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    }`}
                  >
                    <Power className="h-3 w-3" /> {c.active ? "Desativar" : "Ativar no Turno"}
                  </button>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        title="Editar entregador"
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(c)}
                        title="Excluir entregador"
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
