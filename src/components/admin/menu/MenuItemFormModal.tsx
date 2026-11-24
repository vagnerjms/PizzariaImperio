import { X } from "lucide-react";
import { CATEGORIES, Category, MENU_IMAGES } from "@/data/catalog";
import { CatalogMenuItem } from "@/lib/menu-domain";

export const MENU_IMAGE_PRESETS = [
  { key: "calabresa", label: "Calabresa / Salgada", src: MENU_IMAGES.calabresa },
  { key: "mussarela", label: "Margherita / Mussarela", src: MENU_IMAGES.mussarela },
  { key: "queijos", label: "Quatro Queijos", src: MENU_IMAGES.queijos },
  { key: "pepperoni", label: "Pepperoni", src: MENU_IMAGES.pepperoni },
  { key: "portuguesa", label: "Portuguesa / Presunto", src: MENU_IMAGES.portuguesa },
  { key: "frango", label: "Frango c/ Catupiry", src: MENU_IMAGES.frango },
  { key: "vegetariana", label: "Vegetariana / Brócolis", src: MENU_IMAGES.vegetariana },
  { key: "chocolate", label: "Chocolate / Doce", src: MENU_IMAGES.chocolate },
  { key: "romeu", label: "Romeu e Julieta", src: MENU_IMAGES.romeu },
  { key: "coca", label: "Refrigerante Cola", src: MENU_IMAGES.coca },
  { key: "guarana", label: "Guaraná", src: MENU_IMAGES.guarana },
  { key: "agua", label: "Água / Bebida", src: MENU_IMAGES.agua },
];

const EDITABLE_CATEGORIES = CATEGORIES.filter((c) => c.id !== "todas");

export interface MenuItemFormState {
  name: string;
  category: Category;
  ingredients: string;
  price: string;
  badge: string;
  image: string;
  available: boolean;
}

export function MenuItemFormModal({
  editingItem,
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  editingItem: CatalogMenuItem | null;
  form: MenuItemFormState;
  saving: boolean;
  onChange: (updater: (prev: MenuItemFormState) => MenuItemFormState) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 my-8"
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h3 className="font-serif text-lg font-bold">
            {editingItem ? `Editar "${editingItem.name}"` : "Novo Item do Cardápio"}
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Nome *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => onChange((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex.: Pepperoni Trufada"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Categoria *</label>
            <select
              value={form.category}
              onChange={(e) => onChange((f) => ({ ...f, category: e.target.value as Category }))}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
            >
              {EDITABLE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Preço (R$) *</label>
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
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Selo (opcional)</label>
            <input
              type="text"
              maxLength={40}
              value={form.badge}
              onChange={(e) => onChange((f) => ({ ...f, badge: e.target.value }))}
              placeholder="Ex.: Mais pedida, Chef"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground">
            Ingredientes / Descrição
          </label>
          <textarea
            rows={2}
            value={form.ingredients}
            onChange={(e) => onChange((f) => ({ ...f, ingredients: e.target.value }))}
            placeholder="Ex.: Molho de tomate pelati, mussarela, pepperoni artesanal e orégano"
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">
            Imagem (escolha um modelo ou cole uma URL)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {MENU_IMAGE_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => onChange((f) => ({ ...f, image: preset.src }))}
                className={`rounded-lg border px-2 py-1 text-[11px] transition ${
                  form.image === preset.src
                    ? "border-gold bg-gold/15 text-gold font-bold"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={form.image}
            onChange={(e) => onChange((f) => ({ ...f, image: e.target.value }))}
            placeholder="https://... ou caminho da imagem"
            className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs focus:border-gold focus:outline-none"
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
            {saving ? "Salvando..." : editingItem ? "Salvar Alterações" : "Criar Item"}
          </button>
        </div>
      </form>
    </div>
  );
}
