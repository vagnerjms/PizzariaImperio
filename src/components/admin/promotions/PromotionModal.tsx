import { useState, useEffect } from "react";
import { Sparkles, XCircle, Eye, Loader2 } from "lucide-react";
import { Promotion, PROMO_CATEGORIES } from "@/lib/promotions.types";
import { MENU as MENU_ITEMS } from "@/data/catalog";

export interface PromotionFormData {
  title: string;
  description: string;
  badge_text: string;
  type: "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "BUY_X_GET_Y";
  discount_value: number;
  trigger_type: "all" | "category" | "specific_items" | "min_total";
  trigger_category: string;
  trigger_item_ids: string[];
  trigger_min_qty: number;
  trigger_min_total: number;
  reward_item_id: string | null;
  reward_item_name: string | null;
  reward_discount_percent: number | null;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
}

export function PromotionModal({
  isOpen,
  onClose,
  initialPromo,
  onSave,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialPromo: Promotion | null;
  onSave: (data: PromotionFormData) => Promise<void>;
  loading: boolean;
}) {
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
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPromo) {
      setPromoTitle(initialPromo.title);
      setPromoDescription(initialPromo.description);
      setPromoBadgeText(initialPromo.badge_text || "OFERTA RELÂMPAGO");
      setPromoType(initialPromo.type);
      setPromoDiscountValue(initialPromo.discount_value || 10);
      setPromoTriggerType(initialPromo.trigger_type || "all");
      setPromoTriggerCategory(initialPromo.trigger_category || "todas");
      setPromoTriggerItemIds(initialPromo.trigger_item_ids || []);
      setPromoTriggerMinQty(initialPromo.trigger_min_qty || 1);
      setPromoTriggerMinTotal(initialPromo.trigger_min_total || 0);
      setPromoRewardItemId(initialPromo.reward_item_id || "coca-2l");
      setPromoRewardDiscountPercent(
        initialPromo.reward_discount_percent !== undefined ? initialPromo.reward_discount_percent : 100
      );
      setPromoActive(initialPromo.active);
      setPromoStartDate(initialPromo.start_date || "");
      setPromoEndDate(initialPromo.end_date || "");
    } else {
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
    }
    setFormError(null);
  }, [initialPromo, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoTitle.trim() || !promoDescription.trim()) {
      setFormError("Preencha o título e a descrição da promoção.");
      return;
    }

    const rewardItem = MENU_ITEMS.find((i) => i.id === promoRewardItemId);

    const payload: PromotionFormData = {
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
      reward_item_name: promoType === "BUY_X_GET_Y" ? rewardItem?.name || null : null,
      reward_discount_percent: promoType === "BUY_X_GET_Y" ? Number(promoRewardDiscountPercent) : null,
      active: promoActive,
      start_date: promoStartDate || null,
      end_date: promoEndDate || null,
    };

    try {
      await onSave(payload);
    } catch (err: any) {
      setFormError(err?.message || "Erro ao salvar promoção.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-2xl my-8">
        <header className="flex items-center justify-between border-b border-border/60 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gold/10 p-2 text-gold">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg leading-tight">
                {initialPromo ? "Editar Promoção" : "Nova Promoção ou Combo"}
              </h3>
              <p className="text-xs text-muted-foreground">Configure as regras de ativação e visualize em tempo real</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </header>

        {formError && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
                2. Tipo de Benefício
              </h4>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Mecânica da Promoção
                </label>
                <select
                  value={promoType}
                  onChange={(e: any) => setPromoType(e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/20 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                >
                  <option value="PERCENTAGE_DISCOUNT">Porcentagem de Desconto (%)</option>
                  <option value="FIXED_DISCOUNT">Desconto em Dinheiro (R$ OFF)</option>
                  <option value="BUY_X_GET_Y">Compre X Ganhe Y (Brinde ou Desconto em Item)</option>
                </select>
              </div>

              {promoType === "PERCENTAGE_DISCOUNT" && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Porcentagem de Desconto (%)
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={promoDiscountValue}
                      onChange={(e) => setPromoDiscountValue(Number(e.target.value))}
                      className="w-28 rounded-xl border border-border bg-secondary/20 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                    />
                    <span className="text-sm font-bold text-gold">% de desconto</span>
                  </div>
                </div>
              )}

              {promoType === "FIXED_DISCOUNT" && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Valor do Desconto (R$)
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-sm font-bold text-muted-foreground">R$</span>
                    <input
                      type="number"
                      min={1}
                      step="0.5"
                      value={promoDiscountValue}
                      onChange={(e) => setPromoDiscountValue(Number(e.target.value))}
                      className="w-32 rounded-xl border border-border bg-secondary/20 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                    />
                    <span className="text-sm font-bold text-gold">OFF no total</span>
                  </div>
                </div>
              )}

              {promoType === "BUY_X_GET_Y" && (
                <div className="space-y-3 rounded-xl border border-gold/30 bg-gold/5 p-3.5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gold">
                      Item Ganho / Brinde (Y)
                    </label>
                    <select
                      value={promoRewardItemId}
                      onChange={(e) => setPromoRewardItemId(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                    >
                      {MENU_ITEMS.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.category}) - R$ {item.price.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gold">
                      Desconto no Item Ganho
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <select
                        value={promoRewardDiscountPercent}
                        onChange={(e) => setPromoRewardDiscountPercent(Number(e.target.value))}
                        className="rounded-xl border border-border bg-secondary/30 px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                      >
                        <option value={100}>100% OFF (Totalmente Grátis)</option>
                        <option value={50}>50% OFF (Metade do Preço)</option>
                        <option value={20}>20% OFF</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Coluna 2: Gatilhos, Condições e Validade */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5 border-b border-border/40 pb-1">
                3. Regras de Ativação (Gatilhos)
              </h4>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Condição de Aplicação
                </label>
                <select
                  value={promoTriggerType}
                  onChange={(e: any) => setPromoTriggerType(e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/20 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                >
                  <option value="all">Qualquer pedido (sem restrição de itens)</option>
                  <option value="category">Por Categoria de Produtos</option>
                  <option value="specific_items">Pizzas / Produtos Específicos</option>
                  <option value="min_total">Valor Mínimo do Carrinho (R$)</option>
                </select>
              </div>

              {promoTriggerType === "category" && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Categoria Exigida
                  </label>
                  <select
                    value={promoTriggerCategory}
                    onChange={(e) => setPromoTriggerCategory(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Selecione as Pizzas que ativam a promoção:
                  </label>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-xl border border-border bg-secondary/20 p-2.5">
                    {MENU_ITEMS.map((item) => {
                      const checked = promoTriggerItemIds.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:bg-secondary/40 p-1 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPromoTriggerItemIds([...promoTriggerItemIds, item.id]);
                              } else {
                                setPromoTriggerItemIds(promoTriggerItemIds.filter((id) => id !== item.id));
                              }
                            }}
                            className="rounded border-border text-gold focus:ring-gold"
                          />
                          <span>{item.name}</span>
                          <span className="text-[10px] text-muted-foreground">({item.category})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Qtd Mínima Itens
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={promoTriggerMinQty}
                    onChange={(e) => setPromoTriggerMinQty(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total Mínimo (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="5"
                    value={promoTriggerMinTotal}
                    onChange={(e) => setPromoTriggerMinTotal(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                </div>
              </div>

              <h4 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5 border-b border-border/40 pb-1 pt-2">
                4. Período e Ativação
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Data Início (opcional)
                  </label>
                  <input
                    type="date"
                    value={promoStartDate}
                    onChange={(e) => setPromoStartDate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Data Término (opcional)
                  </label>
                  <input
                    type="date"
                    value={promoEndDate}
                    onChange={(e) => setPromoEndDate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="promoActiveModal"
                  checked={promoActive}
                  onChange={(e) => setPromoActive(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-gold focus:ring-gold"
                />
                <label htmlFor="promoActiveModal" className="text-xs font-semibold text-foreground cursor-pointer">
                  Promoção Ativa e Visível no Cardápio
                </label>
              </div>

              {/* Preview da Promoção */}
              <div className="pt-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
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
              onClick={onClose}
              className="rounded-full border border-border px-5 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-gold px-6 py-2 text-xs font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Salvando..." : initialPromo ? "Salvar Alterações" : "Criar Promoção"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

