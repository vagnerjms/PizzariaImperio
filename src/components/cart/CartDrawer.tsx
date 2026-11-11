import { useState } from "react";
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
import { useDeliveryAddress } from "@/hooks/useDeliveryAddress";
import { useActiveOrder } from "@/hooks/useActiveOrder";
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
  const [viewMode, setViewMode] = useState<"cart" | "order_status">("cart");

  const {
    activeOrder,
    loadingOrder,
    submitting,
    submitError,
    placeOrder,
    dismissOrder,
  } = useActiveOrder({ onOpenDrawer: onOpen });

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
  } = useDeliveryAddress();

  const handleDismissOrder = () => {
    dismissOrder();
    setViewMode("cart");
    setStep("cart");
    resetForm();
    onClose();
  };

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
    try {
      await placeOrder(cart, appliedPromotion, form, () => {
        onClear();
        setViewMode("order_status");
      });
    } catch {
      // Erro é capturado e exibido via submitError
    }
  };

  if (loadingOrder && open) {
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

  const headerTitle =
    viewMode === "order_status" && activeOrder
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
            {viewMode !== "order_status" && step !== "cart" ? (
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
            {activeOrder && (
              <button
                type="button"
                onClick={() => setViewMode(viewMode === "cart" ? "order_status" : "cart")}
                className="rounded-lg bg-gold/15 border border-gold/40 px-2.5 py-1 text-[11px] font-bold text-gold transition hover:bg-gold hover:text-gold-foreground"
              >
                {viewMode === "cart" ? "Ver Pedido Ativo" : "Ver Carrinho"}
              </button>
            )}
            {viewMode !== "order_status" && step !== "cart" && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs">
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
          {viewMode === "order_status" && activeOrder ? (
            <OrderStatusView
              order={activeOrder}
              onDismiss={handleDismissOrder}
              onBackToCart={cart.length > 0 ? () => setViewMode("cart") : undefined}
            />
          ) : cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              {activeOrder && (
                <div className="mb-6 w-full rounded-2xl border border-gold/40 bg-gold/10 p-4 text-center">
                  <p className="text-xs font-bold text-gold uppercase tracking-wider">
                    Pedido em Andamento
                  </p>
                  <p className="mt-1 text-xs text-foreground">
                    Você possui um pedido ativo: #{activeOrder.id?.slice(0, 8)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setViewMode("order_status")}
                    className="mt-3 rounded-full bg-gold px-4 py-1.5 text-xs font-bold text-gold-foreground transition hover:brightness-110 shadow-gold-glow"
                  >
                    Acompanhar Pedido
                  </button>
                </div>
              )}
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
            <>
              {activeOrder && (
                <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-foreground">Pedido ativo: #{activeOrder.id?.slice(0, 6)}</span>
                    <p className="text-[11px] text-muted-foreground">Status: <span className="capitalize text-gold font-semibold">{activeOrder.status}</span></p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewMode("order_status")}
                    className="rounded-lg bg-gold px-2.5 py-1 font-bold text-gold-foreground text-[11px] transition hover:brightness-110"
                  >
                    Acompanhar
                  </button>
                </div>
              )}
              <CartItemsStep
                cart={cart}
                appliedPromotion={appliedPromotion}
                onInc={onInc}
                onDec={onDec}
                onRemove={onRemove}
              />
            </>
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
        {cart.length > 0 && viewMode !== "order_status" && step !== "identity" && (
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
