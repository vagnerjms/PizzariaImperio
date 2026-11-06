import { useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ShoppingBag,
  X,
  Loader2,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
} from "lucide-react";
import { CartItem, formatBRL } from "@/data/catalog";
import { AppliedPromotionResult } from "@/lib/promotions.types";
import { createOrder, getOrderStatus } from "@/lib/orders.functions";
import { useDeliveryAddress } from "@/hooks/useDeliveryAddress";
import { OrderStatusView } from "./OrderStatusView";
import { CartItemsStep } from "./CartItemsStep";
import { CheckoutIdentityStep } from "./CheckoutIdentityStep";
import { CheckoutDeliveryStep } from "./CheckoutDeliveryStep";
import { CheckoutPaymentStep } from "./CheckoutPaymentStep";

type CheckoutStep = "cart" | "identity" | "delivery" | "payment";

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
  const [step, setStep] = useState<CheckoutStep>("cart");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any>(null);

  const submitOrder = useServerFn(createOrder);
  const checkStatus = useServerFn(getOrderStatus);

  const {
    form,
    errors,
    hasSavedIdentity,
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
    handleDeliveryModeChange,
    setField,
    validateIdentity,
    validateDelivery,
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

  // Polling em tempo real para sincronizar o status do pedido
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
  const deliveryFee =
    form.deliveryMode === "pickup" || form.deliveryMode === "dine_in"
      ? 0
      : form.deliveryFee || 0;
  const total = Math.max(0, subtotal - discount) + deliveryFee;

  const handleStartCheckout = () => {
    setStep("identity");
  };

  const handleBackStep = () => {
    if (step === "payment") setStep("delivery");
    else if (step === "delivery") setStep("identity");
    else if (step === "identity") setStep("cart");
  };

  const handleProceedFromDelivery = () => {
    if (validateDelivery()) {
      setStep("payment");
    }
  };

  const buildAndSend = async () => {
    if (!validate(total) || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const fullAddress =
        form.deliveryMode === "pickup"
          ? "Retirada no Balcão (Buscar o pedido)"
          : form.deliveryMode === "dine_in"
          ? "Consumir no Local (Salão Pizzaria Império)"
          : `${form.rua.trim()}, ${form.numero.trim()} - ${form.bairro.trim()}, ${form.cidadeUf.trim()}${
              form.complemento.trim() ? " (" + form.complemento.trim() + ")" : ""
            }`;

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
          flavor2_id: i.isHalf ? i.flavor2?.id || null : null,
          crust_id: i.crust?.id || "nenhuma",
          pizza_name: fullName,
          quantity: i.quantity,
          unit_price: i.unitPrice,
        };
      });

      if (appliedPromotion?.rewardItem) {
        orderItems.push({
          pizza_id: appliedPromotion.rewardItem.pizza_id,
          flavor2_id: null,
          crust_id: "nenhuma",
          pizza_name: `${appliedPromotion.rewardItem.pizza_name} (${
            appliedPromotion.rewardItem.is_gift ? "Brinde" : "Promoção"
          })`,
          quantity: 1,
          unit_price: appliedPromotion.rewardItem.unit_price,
        });
      }

      const res = await submitOrder({
        data: {
          customer_name: sanitize(form.name, 80),
          customer_phone: sanitize(form.phone, 20),
          customer_address: sanitize(fullAddress, 400),
          delivery_mode: (form.deliveryMode || "delivery") as "delivery" | "pickup" | "dine_in",
          neighborhood: form.deliveryMode === "delivery" ? sanitize(form.bairro, 80) : null,
          payment_method: form.payment as
            | "Pix"
            | "Dinheiro"
            | "Cartão de crédito"
            | "Cartão de débito",
          troco:
            form.payment === "Dinheiro" && form.troco
              ? Number(form.troco.replace(",", "."))
              : null,
          notes: sanitize(form.notes, 300) || null,
          items: orderItems,
          delivery_fee: deliveryFee,
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

  const headerTitle = success
    ? "Status do Pedido"
    : step === "cart"
    ? "Seu Carrinho"
    : step === "identity"
    ? "Identifique-se"
    : "Finalizar pedido";

  return (
    <div
      className={`fixed inset-0 z-[60] transition ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-background shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            {!success && step !== "cart" ? (
              <button
                type="button"
                onClick={handleBackStep}
                aria-label="Voltar"
                className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition hover:bg-secondary"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : (
              <ShoppingBag className="h-5 w-5 text-gold" />
            )}
            <h2 className="font-serif text-lg sm:text-xl font-bold text-foreground">
              {headerTitle}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {!success && step !== "cart" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs">
                <ShieldCheck className="h-3.5 w-3.5" /> Ambiente seguro
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
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
            <CartItemsStep
              cart={cart}
              appliedPromotion={appliedPromotion}
              onInc={onInc}
              onDec={onDec}
              onRemove={onRemove}
            />
          ) : step === "identity" ? (
            <CheckoutIdentityStep
              form={form}
              errors={errors}
              initialShowConfirmModal={hasSavedIdentity}
              onChangeField={setField}
              onValidate={validateIdentity}
              onConfirmIdentity={() => setStep("delivery")}
            />
          ) : step === "delivery" ? (
            <CheckoutDeliveryStep
              form={form}
              errors={errors}
              cepLoading={cepLoading}
              locatingGPS={locatingGPS}
              streetSearching={streetSearching}
              streetSuggestions={streetSuggestions}
              bairroSuggestions={bairroSuggestions}
              locationMsg={locationMsg}
              onChangeIdentity={() => setStep("identity")}
              onDeliveryModeChange={handleDeliveryModeChange}
              onCEPChange={handleCEPChange}
              onGPSLocation={handleGPSLocation}
              onRuaInputChange={handleRuaInputChange}
              onSelectSuggestion={handleSelectSuggestion}
              onBairroInputChange={handleBairroInputChange}
              onSelectBairro={handleSelectBairro}
              onChangeField={setField}
            />
          ) : (
            <CheckoutPaymentStep
              form={form}
              errors={errors}
              total={total}
              submitError={submitError}
              onChangeDelivery={() => setStep("delivery")}
              onChangeField={setField}
            />
          )}
        </div>

        {/* Bottom Sticky Bar (shown on cart, delivery, and payment steps) */}
        {cart.length > 0 && !success && step !== "identity" && (
          <div className="border-t border-border bg-secondary/40 p-5 space-y-3.5">
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-foreground">{formatBRL(subtotal)}</span>
              </div>

              {appliedPromotion && discount > 0 && (
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>Desconto ({appliedPromotion.promotion.title})</span>
                  <span>-{formatBRL(discount)}</span>
                </div>
              )}

              {(step === "delivery" || step === "payment") && (
                <div className="flex justify-between">
                  <span>Taxa de entrega</span>
                  <span className="font-semibold text-foreground">
                    {form.deliveryMode === "pickup" || form.deliveryMode === "dine_in"
                      ? "Grátis"
                      : form.deliveryFee !== null
                      ? formatBRL(form.deliveryFee)
                      : "A calcular"}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-base font-bold text-foreground pt-1.5 border-t border-border/60">
                <span>Total</span>
                <span className="font-serif text-lg text-gold">{formatBRL(total)}</span>
              </div>
            </div>

            {step === "cart" ? (
              <button
                type="button"
                onClick={handleStartCheckout}
                className="w-full rounded-xl bg-gold py-3.5 text-sm font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
              >
                Confirmar Pedido <ChevronRight className="h-4 w-4" />
              </button>
            ) : step === "delivery" ? (
              <button
                type="button"
                onClick={handleProceedFromDelivery}
                className={`w-full rounded-xl py-3.5 text-sm font-bold transition active:scale-95 flex items-center justify-center gap-2 ${
                  form.deliveryMode
                    ? "bg-gold text-gold-foreground shadow-gold-glow hover:brightness-110"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {form.deliveryMode
                  ? "Avançar para pagamento"
                  : "Escolha como receber o pedido"}
              </button>
            ) : (
              <button
                type="button"
                onClick={buildAndSend}
                disabled={submitting || !form.payment}
                className={`w-full rounded-xl py-3.5 text-sm font-bold transition active:scale-95 flex items-center justify-center gap-2 ${
                  form.payment
                    ? "bg-gold text-gold-foreground shadow-gold-glow hover:brightness-110 disabled:opacity-50"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                }`}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting
                  ? "Enviando Pedido..."
                  : form.payment
                  ? `Finalizar pedido • ${formatBRL(total)}`
                  : "Selecione a forma de pagamento"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
