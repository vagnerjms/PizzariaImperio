import { History, Printer } from "lucide-react";
import { formatBRL } from "@/lib/formatters";
import type { CashShiftRow } from "@/lib/cash-domain";

export function ClosedShiftsAuditTable({
  history,
  onPrintShift,
}: {
  history: CashShiftRow[];
  onPrintShift: (shift: CashShiftRow) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold flex items-center gap-2">
          <History className="h-5 w-5 text-gold" /> Histórico de Caixas Fechados (Auditoria Admin)
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
                  diff === 0 ? "text-emerald-400" : diff > 0 ? "text-amber-300" : "text-red-400";
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
                        onClick={() => onPrintShift(shift)}
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
  );
}
