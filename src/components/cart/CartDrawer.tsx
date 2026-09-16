import { useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  Gift,
  Sparkles,
  Loader2,
  Navigation,
  Search,
  ChevronRight,
} from "lucide-react";
import { CartItem, formatBRL } from "@/data/catalog";
import { AppliedPromotionResult } from "@/lib/promotions.types";
import { createOrder, getOrderStatus } from "@/lib/orders.functions";
import { useDeliveryAddress } from "@/hooks/useDeliveryAddress";
import { OrderStatusView } from "./OrderStatusView";

export function CartDrawer({
  open,
  onClose,
  onOpen,
  cart,
  appliedPromotion,
  onInc,
  onDec,
  onRemove,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
  cart: CartItem[];
  appliedPromotion: AppliedPromotionResult | null;
  onInc: (itemId: string) => void;
  onDec: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onClear: () => void;
}) {
  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any>(null);

  const submitOrder = useServerFn(createOrder);
  const checkStatus = useServerFn(getOrderStatus);

  const {
    form,
    errors,
    cepLoading,
    locatingGPS,
    streetSearching,
    streetSuggestions,
    bairroSuggestions,
    locationMsg,
    handleCEPChange,
    handleGPSLocation,
    handleRuaInputChange,
    handleSelectSuggestion,
    handleBairroInputChange,
    handleSelectBairro,
    setField,
    validate,
    resetForm,
    sanitize,
  } = useDeliveryAddress();

  const [loadingOrder, setLoadingOrder] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return !!(params.get("order_id") || params.get("order"));
    }
    return false;
  });

  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (hasMountedRef.current) return;
    hasMountedRef.current = true;

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlOrderId = params.get("order_id") || params.get("order");
      
      if (urlOrderId) {
        setLoadingOrder(true);
        checkStatus({ data: urlOrderId })
          .then((order) => {
            if (order) {
              setSuccess(order);
              onOpen();
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          })
          .catch((err) => console.error("Erro ao carregar pedido do URL:", err))
          .finally(() => setLoadingOrder(false));
        return;
      }
    }

    try {
      const savedOrder = localStorage.getItem("active_order");
      if (savedOrder) {
        const parsed = JSON.parse(savedOrder);
        setSuccess(parsed);
        onOpen();
      }
    } catch {
      localStorage.removeItem("active_order");
    }
  }, [checkStatus, onOpen]);

  const handleDismissOrder = () => {
    try {
      localStorage.removeItem("active_order");
    } catch {}
    setSuccess(null);
    setStep("cart");
    resetForm();
    onClose();
  };

  useEffect(() => {
    if (success) {
      localStorage.setItem("active_order", JSON.stringify(success));
    } else {
      localStorage.removeItem("active_order");
    }
  }, [success]);

  // Polling em tempo real para sincronizar o status do pedido (Pix/Cartão e etapas na cozinha)
  useEffect(() => {
    if (!success?.id) return;
    if (
      success.payment_status === "failed" ||
      success.status === "entregue" ||
      success.status === "cancelado"
    ) {
      return;
    }

    const interval = setInterval(() => {
      checkStatus({ data: success.id })
        .then((updated) => {
          if (updated) {
            setSuccess((prev: any) => ({ ...prev, ...updated }));
          }
        })
        .catch((err) => console.error("Erro ao verificar status do pedido:", err));
    }, 4000);

    return () => clearInterval(interval);
  }, [success?.id, success?.payment_status, success?.status, checkStatus]);

  const subtotal = cart.reduce((acc, item) => acc + item.totalPrice, 0);
  const discount = appliedPromotion?.discountAmount || 0;
  const deliveryFee = form.deliveryFee || 0;
  const total = Math.max(0, subtotal - discount) + deliveryFee;

  const buildAndSend = async () => {
    if (!validate(total) || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const fullAddress = `${form.rua.trim()}, ${form.numero.trim()} - ${form.bairro.trim()}, ${form.cidadeUf.trim()}${form.complemento.trim() ? " (" + form.complemento.trim() + ")" : ""}`;
      
      const orderItems = cart.map((i) => {
        let fullName = i.isHalf
          ? `1/2 ${i.flavor1.name} + 1/2 ${i.flavor2?.name}`
          : i.flavor1.name;

        if (i.crust && i.crust.id !== "nenhuma") {
          fullName += ` (${i.crust.name})`;
        }

        if (i.isHalf) {
          const notesArr: string[] = [];
          if (i.flavor1.notes) notesArr.push(`1/2 ${i.flavor1.name}: ${i.flavor1.notes}`);
          if (i.flavor2?.notes) notesArr.push(`1/2 ${i.flavor2.name}: ${i.flavor2.notes}`);
          if (notesArr.length > 0) {
            fullName += ` [${notesArr.join(" | ")}]`;
          }
        } else if (i.flavor1.notes) {
          fullName += ` [Obs: ${i.flavor1.notes}]`;
        }

        return {
          pizza_id: i.pizzaId,
          pizza_name: fullName,
          quantity: i.quantity,
          unit_price: i.unitPrice,
        };
      });

      if (appliedPromotion?.rewardItem) {
        orderItems.push({
          pizza_id: appliedPromotion.rewardItem.pizza_id,
          pizza_name: `${appliedPromotion.rewardItem.pizza_name} (${appliedPromotion.rewardItem.is_gift ? "Brinde" : "Promoção"})`,
          quantity: 1,
          unit_price: appliedPromotion.rewardItem.unit_price,
        });
      }

      const res = await submitOrder({
        data: {
          customer_name: sanitize(form.name, 80),
          customer_phone: sanitize(form.phone, 20),
          customer_address: sanitize(fullAddress, 400),
          payment_method: form.payment as "Pix" | "Dinheiro" | "Cartão de crédito" | "Cartão de débito",
          troco:
            form.payment === "Dinheiro" && form.troco
              ? Number(form.troco.replace(",", "."))
              : null,
          notes: sanitize(form.notes, 300) || null,
          items: orderItems,
          delivery_fee: form.deliveryFee || 0,
          discount: appliedPromotion?.discountAmount || 0,
          promotion_id: appliedPromotion?.promotion._id || null,
          promotion_title: appliedPromotion?.promotion.title || null,
        },
      });
      setSuccess(res);
      onClear();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao enviar pedido.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingOrder) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <Loader2 className="h-10 w-10 text-gold animate-spin" />
          <h3 className="font-serif text-lg text-foreground mt-2">Carregando seu pedido...</h3>
          <p className="text-xs text-muted-foreground max-w-[250px]">
            Buscando informações atualizadas da sua compra.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-[60] transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
      />

      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-background shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border p-6">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-gold" />
            <h2 className="font-serif text-xl font-bold">
              {success ? "Status do Pedido" : step === "cart" ? "Seu Carrinho" : "Finalizar Pedido"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {success ? (
            <OrderStatusView order={success} onDismiss={handleDismissOrder} />
          ) : cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/30 bg-secondary/60 text-gold">
                <ShoppingBag className="h-7 w-7" />
              </div>
              <p className="mt-4 font-serif text-lg">Seu carrinho está vazio</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Escolha suas pizzas favoritas no cardápio.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-gold-foreground"
              >
                Ver cardápio
              </button>
            </div>
          ) : step === "cart" ? (
            <div className="space-y-4">
              {appliedPromotion && (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-emerald-400 shadow-sm">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                    <Sparkles className="h-3.5 w-3.5 fill-emerald-400" />
                    Promoção Ativa: {appliedPromotion.promotion.title}
                  </div>
                  <p className="mt-1 font-medium text-emerald-300">
                    {appliedPromotion.reason}
                  </p>
                </div>
              )}

              <ul className="space-y-4">
                {cart.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3.5 shadow-sm"
                  >
                    <div className="flex gap-3">
                      <img
                        src={item.flavor1.image}
                        alt={item.name}
                        width={72}
                        height={72}
                        className="h-18 w-18 flex-none rounded-xl object-cover border border-border/50"
                      />
                      <div className="flex flex-1 flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-serif text-base leading-tight text-foreground font-bold flex items-center gap-1.5">
                              {item.name}
                            </div>
                            {item.isHalf && (
                              <span className="inline-block mt-0.5 rounded-full bg-gold/15 border border-gold/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
                                🍕🍕 Meio a Meio
                              </span>
                            )}
                            {item.crust && item.crust.id !== "nenhuma" && (
                              <div className="mt-1 text-[11px] text-gold font-medium">
                                🧀 {item.crust.name} (+{formatBRL(item.crust.price)})
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemove(item.id)}
                            aria-label={`Remover ${item.name}`}
                            className="rounded-full p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Observações segmentadas */}
                        {item.isHalf ? (
                          <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground/90 border-l-2 border-gold/40 pl-2">
                            <div><strong>1/2 {item.flavor1.name}:</strong> {item.flavor1.notes || "Padrão"}</div>
                            <div><strong>1/2 {item.flavor2?.name}:</strong> {item.flavor2?.notes || "Padrão"}</div>
                          </div>
                        ) : item.flavor1.notes ? (
                          <div className="mt-1 text-[11px] text-muted-foreground border-l-2 border-gold/40 pl-2">
                            <strong>Obs:</strong> {item.flavor1.notes}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <div className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60">
                        <button
                          type="button"
                          onClick={() => onDec(item.id)}
                          aria-label="Diminuir quantidade"
                          className="rounded-full p-1.5 text-foreground transition hover:bg-gold/20"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-6 text-center text-sm font-semibold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => onInc(item.id)}
                          aria-label="Aumentar quantidade"
                          className="rounded-full p-1.5 text-foreground transition hover:bg-gold/20"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gold">{formatBRL(item.totalPrice)}</div>
                        {item.quantity > 1 && (
                          <div className="text-[10px] text-muted-foreground">{formatBRL(item.unitPrice)} cada</div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}

                {appliedPromotion?.rewardItem && (
                  <li className="flex gap-4 rounded-2xl border border-gold/40 bg-gold/10 p-3 shadow-gold-glow">
                    <div className="flex h-16 w-16 flex-none items-center justify-center rounded-xl bg-gold/20 text-gold">
                      <Gift className="h-7 w-7" />
                    </div>
                    <div className="flex flex-1 flex-col justify-center">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 font-serif text-base font-bold text-foreground">
                            {appliedPromotion.rewardItem.pizza_name}
                            <span className="rounded-full bg-gold px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-gold-foreground">
                              {appliedPromotion.rewardItem.is_gift ? "GRÁTIS" : "PROMO"}
                            </span>
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            1x Brinde da promoção
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs line-through text-muted-foreground">
                          {formatBRL(appliedPromotion.rewardItem.original_price)}
                        </span>
                        <span className="text-sm font-bold text-green-400">
                          {appliedPromotion.rewardItem.unit_price === 0 ? "R$ 0,00" : formatBRL(appliedPromotion.rewardItem.unit_price)}
                        </span>
                      </div>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setStep("cart")}
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground transition hover:text-gold"
              >
                ← Voltar ao carrinho
              </button>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome completo</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setField("name")(e.target.value)}
                  placeholder="Ex.: João da Silva"
                  maxLength={80}
                  className={`mt-1.5 w-full rounded-xl border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50 ${errors.name ? "border-destructive" : "border-border"}`}
                />
                {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Telefone (WhatsApp)</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField("phone")(e.target.value)}
                  placeholder="(11) 99999-9999"
                  maxLength={20}
                  className={`mt-1.5 w-full rounded-xl border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50 ${errors.phone ? "border-destructive" : "border-border"}`}
                />
                {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">CEP</label>
                  <input
                    type="text"
                    value={form.cep}
                    onChange={(e) => handleCEPChange(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                    className={`mt-1.5 w-full rounded-xl border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50 ${errors.cep ? "border-destructive" : "border-border"}`}
                  />
                  {cepLoading && (
                    <div className="absolute right-3 top-9 text-gold animate-spin">
                      <Loader2 className="h-4 w-4" />
                    </div>
                  )}
                  {errors.cep && <p className="mt-1 text-xs text-destructive">{errors.cep}</p>}
                </div>

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleGPSLocation}
                    disabled={locatingGPS}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold transition hover:bg-gold/20 active:scale-95 disabled:opacity-50"
                  >
                    {locatingGPS ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Detectando GPS...</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="h-3.5 w-3.5" />
                        <span>Usar minha localização (GPS)</span>
                      </>
                    )}
                  </button>
                  <span className="text-[11px] text-muted-foreground/70">ou digite a rua abaixo</span>
                </div>

                {locationMsg && (
                  <p className="text-xs text-gold flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> {locationMsg}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 relative">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Rua / Logradouro
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type="text"
                      value={form.rua}
                      onChange={(e) => handleRuaInputChange(e.target.value)}
                      placeholder="Ex.: Av. dos Imigrantes"
                      maxLength={100}
                      className={`w-full rounded-xl border bg-secondary/40 pl-3.5 pr-8 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50 ${
                        errors.rua ? "border-destructive" : "border-border"
                      }`}
                    />
                    {streetSearching ? (
                      <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-gold animate-spin" />
                    ) : (
                      <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
                    )}
                  </div>
                  {errors.rua && <p className="mt-1 text-xs text-destructive">{errors.rua}</p>}

                  {streetSuggestions.length > 0 && (
                    <ul className="absolute left-0 top-full z-40 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-gold/40 bg-card shadow-2xl divide-y divide-border/60">
                      {streetSuggestions.map((loc, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            onClick={() => handleSelectSuggestion(loc)}
                            className="flex w-full flex-col gap-0.5 px-3.5 py-2.5 text-left text-xs transition hover:bg-gold/15 hover:text-gold"
                          >
                            <span className="font-semibold text-foreground">{loc.rua}</span>
                            <span className="text-[11px] text-muted-foreground">
                              Bairro: <strong className="text-gold">{loc.bairro || "Bragança Paulista"}</strong> • CEP: {loc.cep}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Número</label>
                  <input
                    type="text"
                    value={form.numero}
                    onChange={(e) => setField("numero")(e.target.value)}
                    placeholder="123"
                    maxLength={10}
                    className={`mt-1.5 w-full rounded-xl border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50 ${errors.numero ? "border-destructive" : "border-border"}`}
                  />
                  {errors.numero && <p className="mt-1 text-xs text-destructive">{errors.numero}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={form.bairro}
                    onChange={(e) => handleBairroInputChange(e.target.value)}
                    placeholder="Ex.: Lavapés, Centro..."
                    maxLength={50}
                    className={`mt-1.5 w-full rounded-xl border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50 ${
                      errors.bairro ? "border-destructive" : "border-border"
                    }`}
                  />
                  {errors.bairro && <p className="mt-1 text-xs text-destructive">{errors.bairro}</p>}

                  {bairroSuggestions.length > 0 && (
                    <ul className="absolute left-0 top-full z-40 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-gold/40 bg-card shadow-2xl divide-y divide-border/60">
                      {bairroSuggestions.map((n, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            onClick={() => handleSelectBairro(n)}
                            className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs transition hover:bg-gold/15 hover:text-gold"
                          >
                            <span className="font-semibold text-foreground">{n.name}</span>
                            <span className="text-[11px] text-gold font-bold">
                              Taxa: R$ {n.fee.toFixed(2).replace('.', ',')}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cidade / Estado</label>
                  <input
                    type="text"
                    value={form.cidadeUf}
                    onChange={(e) => setField("cidadeUf")(e.target.value)}
                    placeholder="Ex.: São Paulo - SP"
                    maxLength={50}
                    className={`mt-1.5 w-full rounded-xl border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50 ${errors.cidadeUf ? "border-destructive" : "border-border"}`}
                  />
                  {errors.cidadeUf && <p className="mt-1 text-xs text-destructive">{errors.cidadeUf}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Complemento / Referência (opcional)</label>
                <input
                  type="text"
                  value={form.complemento}
                  onChange={(e) => setField("complemento")(e.target.value)}
                  placeholder="Ex.: Apto 42, Bloco B"
                  maxLength={80}
                  className="mt-1.5 w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Forma de Pagamento
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {(["Pix", "Dinheiro", "Cartão de crédito", "Cartão de débito"] as const).map(
                    (m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setField("payment")(m);
                        }}
                        className={`rounded-xl border p-3 text-xs font-semibold transition ${
                          form.payment === m
                            ? "border-gold bg-gold text-gold-foreground shadow-gold-glow"
                            : "border-border bg-secondary/40 text-muted-foreground hover:border-gold/40 hover:text-foreground"
                        }`}
                      >
                        {m}
                      </button>
                    ),
                  )}
                </div>
                {errors.payment && (
                  <p className="mt-1 text-xs text-destructive">{errors.payment}</p>
                )}
              </div>

              {form.payment === "Dinheiro" && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Precisa de troco para quanto?</label>
                  <input
                    type="text"
                    value={form.troco}
                    onChange={(e) => setField("troco")(e.target.value)}
                    placeholder={`Ex.: ${Math.ceil(total + 10)}`}
                    maxLength={10}
                    className={`mt-1.5 w-full rounded-xl border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50 ${errors.troco ? "border-destructive" : "border-border"}`}
                  />
                  {errors.troco && <p className="mt-1 text-xs text-destructive">{errors.troco}</p>}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Observações Gerais do Pedido (opcional)
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setField("notes")(e.target.value)}
                  placeholder="Ex.: Tocar o interfone 42, deixar na portaria..."
                  rows={2}
                  maxLength={300}
                  className="mt-1.5 w-full resize-none rounded-xl border border-border bg-secondary/40 p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              </div>

              {submitError && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                  {submitError}
                </div>
              )}
            </div>
          )}
        </div>

        {cart.length > 0 && !success && (
          <div className="border-t border-border bg-secondary/40 p-6 space-y-4">
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Subtotal dos itens</span>
                <span className="font-semibold text-foreground">{formatBRL(subtotal)}</span>
              </div>
              
              {appliedPromotion && discount > 0 && (
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>Desconto ({appliedPromotion.promotion.title})</span>
                  <span>-{formatBRL(discount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Taxa de entrega</span>
                <span className="font-semibold text-foreground">
                  {form.deliveryFee !== null ? formatBRL(form.deliveryFee) : "A calcular"}
                </span>
              </div>

              <div className="flex justify-between text-base font-bold text-gold pt-2 border-t border-border/60">
                <span>Total</span>
                <span className="font-serif text-lg">{formatBRL(total)}</span>
              </div>

              {form.bairro && form.deliveryFee !== null && (
                <p className="text-[10px] text-emerald-400 pt-0.5">
                  Taxa de entrega calculada para o bairro: <strong>{form.bairro}</strong>
                </p>
              )}
            </div>

            {step === "cart" ? (
              <button
                type="button"
                onClick={() => setStep("checkout")}
                className="w-full rounded-full bg-gold py-3 text-sm font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
              >
                Confirmar Pedido <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={buildAndSend}
                disabled={submitting}
                className="w-full rounded-full bg-gold py-3 text-sm font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Enviando Pedido..." : "Finalizar e Enviar"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
