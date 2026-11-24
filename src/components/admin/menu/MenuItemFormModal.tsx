import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Link2, Loader2, Upload, X } from "lucide-react";
import { CATEGORIES, Category } from "@/data/catalog";
import { CatalogMenuItem } from "@/lib/menu-domain";
import { uploadMenuItemImage } from "@/lib/menu.functions";
import { compressImageFileToDataUrl } from "@/lib/image-upload";
import { MENU_IMAGE_PRESETS } from "./menu-presets";

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
  const uploadImageFn = useServerFn(uploadMenuItemImage);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(() => /^https?:\/\//i.test(form.image || ""));

  const isUploadedMedia = (form.image || "").startsWith("/api/media/");
  const isExternalUrl = /^https?:\/\//i.test(form.image || "");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      const res = await uploadImageFn({ data: { dataUrl } });
      onChange((f) => ({ ...f, image: res.url }));
      setShowUrlInput(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erro ao enviar imagem.");
    } finally {
      setUploading(false);
    }
  };

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

        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-semibold text-muted-foreground">Imagem do Produto</label>
            <button
              type="button"
              onClick={() => setShowUrlInput((v) => !v)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-gold transition"
            >
              <Link2 className="h-3 w-3" />
              {showUrlInput ? "Ocultar URL" : "Usar URL externa"}
            </button>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-2.5">
            <div className="relative h-16 w-20 flex-none overflow-hidden rounded-lg border border-border bg-secondary flex items-center justify-center">
              {form.image ? (
                <img
                  src={form.image}
                  alt={form.name || "Pré-visualização"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                disabled={uploading || saving}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/15 px-3.5 py-1.5 text-xs font-bold text-gold transition hover:bg-gold hover:text-gold-foreground disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando foto...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" /> Enviar foto do dispositivo
                  </>
                )}
              </button>
              <p className="text-[11px] text-muted-foreground">
                {isUploadedMedia
                  ? "Foto personalizada enviada e salva no servidor."
                  : "JPG, PNG ou WebP (otimizada automaticamente) ou escolha um modelo abaixo:"}
              </p>
            </div>
          </div>

          {uploadError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
              {uploadError}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {MENU_IMAGE_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => {
                  setUploadError(null);
                  onChange((f) => ({ ...f, image: preset.src }));
                }}
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

          {showUrlInput && (
            <input
              type="url"
              value={isExternalUrl ? form.image : ""}
              onChange={(e) => onChange((f) => ({ ...f, image: e.target.value }))}
              placeholder="https://exemplo.com/foto-da-pizza.jpg"
              className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs focus:border-gold focus:outline-none"
            />
          )}
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
            disabled={saving || uploading}
            className="rounded-full bg-gold px-5 py-2 text-xs font-bold uppercase tracking-wider text-gold-foreground hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Salvando..." : editingItem ? "Salvar Alterações" : "Criar Item"}
          </button>
        </div>
      </form>
    </div>
  );
}
