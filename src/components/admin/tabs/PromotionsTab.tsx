import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Tag,
  Plus,
  Loader2,
  Sparkles,
  Calendar,
  Edit3,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  getAdminPromotions,
  createPromotionFn,
  updatePromotionFn,
  togglePromotionFn,
  deletePromotionFn,
} from "@/lib/promotions.functions";
import { Promotion } from "@/lib/promotions.types";
import { formatDateBR as formatPromoDate } from "@/lib/formatters";
import { PromotionModal, PromotionFormData } from "../promotions/PromotionModal";

export function PromotionsTab() {
  const fetchPromotions = useServerFn(getAdminPromotions);
  const createPromo = useServerFn(createPromotionFn);
  const updatePromo = useServerFn(updatePromotionFn);
  const togglePromo = useServerFn(togglePromotionFn);
  const deletePromo = useServerFn(deletePromotionFn);

  const [promotionsList, setPromotionsList] = useState<Promotion[]>([]);
  const [promotionsLoading, setPromotionsLoading] = useState(false);
  const [promotionsActionLoading, setPromotionsActionLoading] = useState(false);
  const [promotionsSuccessMsg, setPromotionsSuccessMsg] = useState<string | null>(null);
  const [promotionsErrorMsg, setPromotionsErrorMsg] = useState<string | null>(null);

  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

  const loadPromotions = async () => {
    setPromotionsLoading(true);
    setPromotionsErrorMsg(null);
    try {
      const data = await fetchPromotions();
      setPromotionsList(data);
    } catch (err: any) {
      setPromotionsErrorMsg(err?.message || "Erro ao carregar promoções.");
    } finally {
      setPromotionsLoading(false);
    }
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  const handleOpenCreatePromo = () => {
    setEditingPromo(null);
    setPromotionsErrorMsg(null);
    setShowPromoModal(true);
  };

  const handleOpenEditPromo = (p: Promotion) => {
    setEditingPromo(p);
    setPromotionsErrorMsg(null);
    setShowPromoModal(true);
  };

  const handleSavePromo = async (payload: PromotionFormData) => {
    setPromotionsActionLoading(true);
    setPromotionsErrorMsg(null);
    setPromotionsSuccessMsg(null);

    try {
      if (editingPromo?._id) {
        await updatePromo({ data: { id: editingPromo._id, data: payload } });
        setPromotionsSuccessMsg("Promoção atualizada com sucesso!");
      } else {
        await createPromo({ data: payload });
        setPromotionsSuccessMsg("Nova promoção criada com sucesso!");
      }
      setShowPromoModal(false);
      await loadPromotions();
      setTimeout(() => setPromotionsSuccessMsg(null), 4000);
    } catch (err: any) {
      setPromotionsErrorMsg(err?.message || "Erro ao salvar promoção.");
      throw err;
    } finally {
      setPromotionsActionLoading(false);
    }
  };

  const handleTogglePromo = async (id: string, currentActive: boolean) => {
    try {
      await togglePromo({ data: { id, active: !currentActive } });
      setPromotionsList((prev) =>
        prev.map((p) => (p._id === id ? { ...p, active: !currentActive } : p))
      );
    } catch (err: any) {
      alert("Erro ao alternar status da promoção: " + err.message);
    }
  };

  const handleDeletePromo = async (id: string, title: string) => {
    if (!confirm(`Tem certeza que deseja excluir a promoção "${title}"?`)) return;
    try {
      await deletePromo({ data: { id } });
      setPromotionsList((prev) => prev.filter((p) => p._id !== id));
    } catch (err: any) {
      alert("Erro ao excluir promoção: " + err.message);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-gold/10 p-2.5 text-gold">
              <Tag className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-serif text-lg leading-tight">Gestão de Promoções e Campanhas</h2>
              <p className="text-xs text-muted-foreground">
                Crie descontos em porcentagem, valores fixos e combos Compre & Ganhe com inserção automática no carrinho
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenCreatePromo}
            className="rounded-full bg-gold px-4 py-2 text-xs font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Nova Promoção
          </button>
        </header>

        {promotionsErrorMsg && (
          <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive flex items-center justify-between">
            <span>{promotionsErrorMsg}</span>
            <button type="button" onClick={() => setPromotionsErrorMsg(null)} className="text-destructive font-bold">
              ×
            </button>
          </div>
        )}

        {promotionsSuccessMsg && (
          <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-xs text-green-500 font-semibold flex items-center justify-between">
            <span>{promotionsSuccessMsg}</span>
            <button type="button" onClick={() => setPromotionsSuccessMsg(null)} className="text-green-500 font-bold">
              ×
            </button>
          </div>
        )}

        {promotionsLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-gold mb-3" />
            <p className="text-sm">Carregando promoções...</p>
          </div>
        ) : promotionsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 text-gold mb-4">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="font-serif text-lg font-bold">Nenhuma promoção cadastrada</h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Crie campanhas de desconto ou combos com brindes para atrair mais clientes e aumentar o ticket médio.
            </p>
            <button
              type="button"
              onClick={handleOpenCreatePromo}
              className="mt-6 rounded-full bg-gold px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110"
            >
              + Criar Primeira Promoção
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {promotionsList.map((promo) => (
              <article
                key={promo._id}
                className={`flex flex-col justify-between rounded-2xl border bg-secondary/10 p-5 transition ${
                  promo.active ? "border-gold/40 shadow-sm" : "border-border opacity-70"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
                      <Sparkles className="h-3 w-3 fill-gold" />
                      {promo.badge_text || "OFERTA"}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleTogglePromo(promo._id, promo.active)}
                      className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
                        promo.active
                          ? "bg-green-500/15 text-green-400 border border-green-500/30"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${promo.active ? "bg-green-400 animate-pulse" : "bg-muted-foreground"}`} />
                      {promo.active ? "Ativa" : "Inativa"}
                    </button>
                  </div>

                  <h3 className="mt-3 font-serif text-lg font-bold leading-tight text-foreground">{promo.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{promo.description}</p>

                  <div className="mt-4 space-y-2 rounded-xl bg-background/60 p-3 border border-border/40 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Mecânica:</span>
                      <span className="font-semibold text-foreground">
                        {promo.type === "PERCENTAGE_DISCOUNT" && `${promo.discount_value}% de Desconto`}
                        {promo.type === "FIXED_DISCOUNT" && `R$ ${promo.discount_value?.toFixed(2).replace(".", ",")} OFF`}
                        {promo.type === "BUY_X_GET_Y" && "Compre e Ganhe Brinde"}
                      </span>
                    </div>

                    {promo.type === "BUY_X_GET_Y" && (
                      <div className="flex justify-between items-center text-gold font-semibold">
                        <span>Recompensa:</span>
                        <span>
                          {promo.reward_discount_percent === 100 ? "1x Brinde Grátis" : `${promo.reward_discount_percent}% OFF em 1x`} (
                          {promo.reward_item_name || "Brinde"})
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Gatilho:</span>
                      <span className="text-foreground">
                        {promo.trigger_type === "all" && "Qualquer produto"}
                        {promo.trigger_type === "category" && `Categoria: ${promo.trigger_category}`}
                        {promo.trigger_type === "specific_items" && `${promo.trigger_item_ids?.length || 0} produto(s) específico(s)`}
                        {promo.trigger_type === "min_total" && `Pedido acima de R$ ${promo.trigger_min_total?.toFixed(2)}`}
                        {promo.trigger_min_qty && promo.trigger_min_qty > 1 ? ` (Mín: ${promo.trigger_min_qty}x)` : ""}
                      </span>
                    </div>

                    {(promo.start_date || promo.end_date) && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                        <Calendar className="h-3 w-3 text-gold" />
                        <span>
                          {promo.start_date ? `De ${formatPromoDate(promo.start_date)}` : ""}
                          {promo.end_date ? ` até ${formatPromoDate(promo.end_date)}` : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditPromo(promo)}
                    className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-gold hover:text-gold"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePromo(promo._id, promo.title)}
                    className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Modal Modular de Criação / Edição de Promoção */}
      <PromotionModal
        isOpen={showPromoModal}
        onClose={() => setShowPromoModal(false)}
        initialPromo={editingPromo}
        onSave={handleSavePromo}
        loading={promotionsActionLoading}
      />
    </div>
  );
}

  );
}
