import { X } from "lucide-react";
import { CatalogCrustOption } from "@/lib/menu-domain";

export interface CrustFormState {
  name: string;
  price: string;
  available: boolean;
}

export function CrustFormModal({
  editingCrust,
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  editingCrust: CatalogCrustOption | null;
  form: CrustFormState;
  saving: boolean;
  onChange: (updater: (prev: CrustFormState) => CrustFormState) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h3 className="font-serif text-lg font-bold">
            {editingCrust ? "Editar Borda" : "Nova Borda Recheada"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground">Nome da Borda *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => onChange((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ex.: Borda Cream Cheese"
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground">
            Valor Adicional (R$) *
          </label>
          <input
            type="number"
            step="0.50"
            min="0"
            required
            value={form.price}
            onChange={(e) => onChange((f) => ({ ...f, price: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-bold text-gold focus:border-gold focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-gold px-5 py-2 text-xs font-bold uppercase tracking-wider text-gold-foreground hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Salvando..." : editingCrust ? "Salvar Borda" : "Criar Borda"}
          </button>
        </div>
      </form>
    </div>
  );
}
