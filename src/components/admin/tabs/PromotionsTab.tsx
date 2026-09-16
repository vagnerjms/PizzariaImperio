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
  Eye,
} from "lucide-react";
import {
  getAdminPromotions,
  createPromotionFn,
  updatePromotionFn,
  togglePromotionFn,
  deletePromotionFn,
} from "@/lib/promotions.functions";
import { Promotion } from "@/lib/promotions.types";
import { MENU_ITEMS, PROMO_CATEGORIES } from "@/lib/menu-list";

function formatPromoDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  } catch {
    return dateStr;
  }
}

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
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);

  const [promoTitle, setPromoTitle] = useState("");
  const [promoDescription, setPromoDescription] = useState("");
  const [promoBadgeText, setPromoBadgeText] = useState("OFERTA RELÂMPAGO");
  const [promoType, setPromoType] = useState<"PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "BUY_X_GET_Y">("PERCENTAGE_DISCOUNT");
  const [promoDiscountValue, setPromoDiscountValue] = useState<number>(10);
  const [promoTriggerType, setPromoTriggerType] = useState<"all" | "category" | "specific_items" | "min_total">("all");
  const [promoTriggerCategory, setPromoTriggerCategory] = useState("todas");
  const [promoTriggerItemIds, setPromoTriggerItemIds] = useState<string[]>([]);
  const [promoTriggerMinQty, setPromoTriggerMinQty] = useState<number>(1);
  const [promoTriggerMinTotal, setPromoTriggerMinTotal] = useState<number>(0);
  const [promoRewardItemId, setPromoRewardItemId] = useState("coca-2l");
  const [promoRewardDiscountPercent, setPromoRewardDiscountPercent] = useState<number>(100);
  const [promoActive, setPromoActive] = useState(true);
  const [promoStartDate, setPromoStartDate] = useState("");
  const [promoEndDate, setPromoEndDate] = useState("");

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
    setEditingPromoId(null);
    setPromoTitle("");
    setPromoDescription("");
    setPromoBadgeText("OFERTA RELÂMPAGO");
    setPromoType("PERCENTAGE_DISCOUNT");
    setPromoDiscountValue(10);
    setPromoTriggerType("all");
    setPromoTriggerCategory("todas");
    setPromoTriggerItemIds([]);
    setPromoTriggerMinQty(1);
    setPromoTriggerMinTotal(0);
    setPromoRewardItemId("coca-2l");
    setPromoRewardDiscountPercent(100);
    setPromoActive(true);
    setPromoStartDate("");
    setPromoEndDate("");
    setPromotionsErrorMsg(null);
    setShowPromoModal(true);
  };

  const handleOpenEditPromo = (p: Promotion) => {
    setEditingPromoId(p._id);
    setPromoTitle(p.title);
    setPromoDescription(p.description);
    setPromoBadgeText(p.badge_text || "OFERTA RELÂMPAGO");
    setPromoType(p.type);
    setPromoDiscountValue(p.discount_value || 10);
    setPromoTriggerType(p.trigger_type || "all");
    setPromoTriggerCategory(p.trigger_category || "todas");
    setPromoTriggerItemIds(p.trigger_item_ids || []);
    setPromoTriggerMinQty(p.trigger_min_qty || 1);
    setPromoTriggerMinTotal(p.trigger_min_total || 0);
    setPromoRewardItemId(p.reward_item_id || "coca-2l");
    setPromoRewardDiscountPercent(p.reward_discount_percent !== undefined ? p.reward_discount_percent : 100);
    setPromoActive(p.active);
    setPromoStartDate(p.start_date || "");
    setPromoEndDate(p.end_date || "");
    setPromotionsErrorMsg(null);
    setShowPromoModal(true);
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoTitle.trim() || !promoDescription.trim()) {
      setPromotionsErrorMsg("Preencha o título e a descrição da promoção.");
      return;
    }

    setPromotionsActionLoading(true);
    setPromotionsErrorMsg(null);
    setPromotionsSuccessMsg(null);

    const rewardItem = MENU_ITEMS.find((i) => i.id === promoRewardItemId);

    const payload = {
      title: promoTitle.trim(),
      description: promoDescription.trim(),
      badge_text: promoBadgeText.trim() || "OFERTA RELÂMPAGO",
      type: promoType,
      discount_value: Number(promoDiscountValue) || 0,
      trigger_type: promoTriggerType,
      trigger_category: promoTriggerCategory,
      trigger_item_ids: promoTriggerItemIds,
      trigger_min_qty: Number(promoTriggerMinQty) || 1,
      trigger_min_total: Number(promoTriggerMinTotal) || 0,
      reward_item_id: promoType === "BUY_X_GET_Y" ? promoRewardItemId : null,
      reward_item_name: promoType === "BUY_X_GET_Y" ? rewardItem?.name : null,
      reward_discount_percent: promoType === "BUY_X_GET_Y" ? Number(promoRewardDiscountPercent) : null,
      active: promoActive,
      start_date: promoStartDate || null,
      end_date: promoEndDate || null,
    };

    try {
      if (editingPromoId) {
        await updatePromo({ data: { id: editingPromoId, data: payload } });
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

      {/* Modal de Criação / Edição de Promoção */}
      {showPromoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-2xl my-8">
            <header className="flex items-center justify-between border-b border-border/60 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gold/10 p-2 text-gold">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg leading-tight">
                    {editingPromoId ? "Editar Promoção" : "Nova Promoção ou Combo"}
                  </h3>
                  <p className="text-xs text-muted-foreground">Configure as regras de ativação e visualize em tempo real</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPromoModal(false)}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </header>

            <form onSubmit={handleSavePromo} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Coluna 1: Informações e Mecânica */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5 border-b border-border/40 pb-1">
                    1. Informações Visuais
                  </h4>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Título da Promoção *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Combo Fim de Semana"
                      value={promoTitle}
                      onChange={(e) => setPromoTitle(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Descrição / Chamada *
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Ex: Compre 2 pizzas salgadas e ganhe 1 Coca-Cola 2L grátis!"
                      value={promoDescription}
                      onChange={(e) => setPromoDescription(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Tag / Badge de Destaque
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: OFERTA RELÂMPAGO, 10% OFF, COMBO"
                      value={promoBadgeText}
                      onChange={(e) => setPromoBadgeText(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                    />
                  </div>

                  <h4 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5 border-b border-border/40 pb-1 pt-2">
                    2. Mecânica & Desconto
                  </h4>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Tipo de Promoção *
                    </label>
                    <select
                      value={promoType}
                      onChange={(e) => setPromoType(e.target.value as any)}
                      className="mt-1.5 w-full rounded-xl border border-border bg-secondary/30 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                    >
                      <option value="PERCENTAGE_DISCOUNT">Desconto Percentual (%) no Total</option>
                      <option value="FIXED_DISCOUNT">Desconto em Valor Fixo (R$) no Total</option>
                      <option value="BUY_X_GET_Y">Compre X e Ganhe / Leve Y (Brinde)</option>
                    </select>
                  </div>

                  {promoType === "PERCENTAGE_DISCOUNT" && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Porcentagem de Desconto (%) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        required
                        value={promoDiscountValue}
                        onChange={(e) => setPromoDiscountValue(Number(e.target.value))}
                        className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                      />
                    </div>
                  )}

                  {promoType === "FIXED_DISCOUNT" && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Valor do Desconto (R$) *
                      </label>
                      <input
                        type="number"
                        step="0.50"
                        min="1"
                        required
                        value={promoDiscountValue}
                        onChange={(e) => setPromoDiscountValue(Number(e.target.value))}
                        className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                      />
                    </div>
                  )}

                  {promoType === "BUY_X_GET_Y" && (
                    <div className="space-y-3 rounded-xl border border-gold/30 bg-gold/5 p-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Produto de Brinde / Recompensa *
                        </label>
                        <select
                          value={promoRewardItemId}
                          onChange={(e) => setPromoRewardItemId(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                        >
                          {MENU_ITEMS.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.category}) - R$ {item.price.toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Desconto no Brinde (%)
                        </label>
                        <select
                          value={promoRewardDiscountPercent}
                          onChange={(e) => setPromoRewardDiscountPercent(Number(e.target.value))}
                          className="mt-1.5 w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                        >
                          <option value={100}>100% Grátis (Brinde Total)</option>
                          <option value={50}>50% de Desconto (Metade do Preço)</option>
                          <option value={30}>30% de Desconto</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Coluna 2: Gatilhos & Pré-visualização */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5 border-b border-border/40 pb-1">
                    3. Regras de Ativação (Gatilho)
                  </h4>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Aplicar Quando o Cliente Comprar:
                    </label>
                    <select
                      value={promoTriggerType}
                      onChange={(e) => setPromoTriggerType(e.target.value as any)}
                      className="mt-1.5 w-full rounded-xl border border-border bg-secondary/30 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                    >
                      <option value="all">Qualquer Produto do Cardápio</option>
                      <option value="category">Por Categoria (ex: Pizzas Salgadas)</option>
                      <option value="specific_items">Itens Específicos do Cardápio</option>
                      <option value="min_total">Apenas Valor Mínimo do Pedido</option>
                    </select>
                  </div>

                  {promoTriggerType === "category" && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Categoria Requerida:
                      </label>
                      <select
                        value={promoTriggerCategory}
                        onChange={(e) => setPromoTriggerCategory(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-border bg-secondary/30 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                      >
                        {PROMO_CATEGORIES.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {promoTriggerType === "specific_items" && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        Selecione os Produtos Participantes:
                      </label>
                      <div className="max-h-36 overflow-y-auto rounded-xl border border-border bg-secondary/20 p-2 space-y-1 divide-y divide-border/30 text-xs">
                        {MENU_ITEMS.map((item) => {
                          const isSelected = promoTriggerItemIds.includes(item.id);
                          return (
                            <label key={item.id} className="flex items-center gap-2 py-1 px-1.5 cursor-pointer hover:bg-secondary/40 rounded">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setPromoTriggerItemIds((prev) => [...prev, item.id]);
                                  } else {
                                    setPromoTriggerItemIds((prev) => prev.filter((id) => id !== item.id));
                                  }
                                }}
                                className="rounded border-border text-gold focus:ring-gold"
                              />
                              <span>
                                {item.name} <span className="text-muted-foreground">({item.category})</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Qtd. Mínima de Itens
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={promoTriggerMinQty}
                        onChange={(e) => setPromoTriggerMinQty(Number(e.target.value))}
                        className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Valor Mín. Pedido (R$)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="5"
                        value={promoTriggerMinTotal}
                        onChange={(e) => setPromoTriggerMinTotal(Number(e.target.value))}
                        className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Início (Opcional)
                      </label>
                      <input
                        type="date"
                        value={promoStartDate}
                        onChange={(e) => setPromoStartDate(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Término (Opcional)
                      </label>
                      <input
                        type="date"
                        value={promoEndDate}
                        onChange={(e) => setPromoEndDate(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 pt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={promoActive}
                      onChange={(e) => setPromoActive(e.target.checked)}
                      className="rounded border-border text-gold focus:ring-gold"
                    />
                    <span className="text-xs font-semibold text-foreground">Promoção Ativa Imediatamente</span>
                  </label>

                  {/* Live Preview Card */}
                  <div className="pt-3">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Eye className="h-3 w-3 text-gold" /> Pré-visualização no Site:
                    </span>
                    <div className="rounded-2xl border border-gold/40 bg-card/90 p-4 shadow-gold-glow">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-gold uppercase">
                        <Sparkles className="h-3 w-3 fill-gold" /> {promoBadgeText || "OFERTA RELÂMPAGO"}
                      </div>
                      <h5 className="mt-1.5 font-serif text-base font-bold text-foreground">
                        {promoTitle || "Título da Promoção"}
                      </h5>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {promoDescription || "Descrição da promoção..."}
                      </p>
                      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-xs font-semibold">
                        <span className="text-gold">
                          {promoType === "PERCENTAGE_DISCOUNT" && `${promoDiscountValue}% de Desconto`}
                          {promoType === "FIXED_DISCOUNT" && `R$ ${promoDiscountValue},00 OFF`}
                          {promoType === "BUY_X_GET_Y" &&
                            `Ganhe ${promoRewardDiscountPercent === 100 ? "Grátis" : `${promoRewardDiscountPercent}% OFF`} em 1x ${MENU_ITEMS.find((i) => i.id === promoRewardItemId)?.name || "Brinde"}`}
                        </span>
                        <span className="rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-bold text-gold-foreground">
                          Aproveitar
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPromoModal(false)}
                  className="rounded-full border border-border px-5 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={promotionsActionLoading}
                  className="rounded-full bg-gold px-6 py-2 text-xs font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
                >
                  {promotionsActionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {promotionsActionLoading ? "Salvando..." : editingPromoId ? "Salvar Alterações" : "Criar Promoção"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
