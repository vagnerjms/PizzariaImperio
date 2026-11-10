import { useState } from "react";
import { Clock, CreditCard, Banknote, QrCode, ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { DeliveryAddressForm } from "@/hooks/useDeliveryAddress";

export function CheckoutPaymentStep({
  form,
  errors,
  total,
  submitError,
  onChangeDelivery,
  onChangeField,
}: {
  form: DeliveryAddressForm;
  errors: Record<string, string>;
  total: number;
  submitError: string | null;
  onChangeDelivery: () => void;
  onChangeField: (k: keyof DeliveryAddressForm) => (v: string) => void;
}) {
  const [onDeliveryExpanded, setOnDeliveryExpanded] = useState(
    form.payment === "Cartão de crédito" ||
      form.payment === "Cartão de débito" ||
      form.payment === "Dinheiro" ||
      true
  );

  const deliverySummary =
    form.deliveryMode === "pickup"
      ? "Retirada no balcão (Buscar o pedido)"
      : form.deliveryMode === "dine_in"
      ? "Consumir no local (Salão)"
      : `${form.rua}, ${form.numero} — ${form.bairro}`;

  const timeEstimate =
    form.deliveryMode === "pickup" || form.deliveryMode === "dine_in"
      ? "Entre 20 - 35 minutos"
      : "Entre 30 - 50 minutos";

  return (
    <div className="space-y-5">
      {/* Card de Previsão e Resumo de Entrega */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm divide-y divide-border/60">
        <div className="flex items-center justify-between gap-2 px-4 py-3 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 text-gold flex-none" />
            <span className="truncate font-medium text-foreground">{deliverySummary}</span>
          </div>
          <button
            type="button"
            onClick={onChangeDelivery}
            className="flex-none font-bold text-gold hover:underline"
          >
            Trocar
          </button>
        </div>

        <div className="flex items-center gap-2.5 px-4 py-3 text-xs text-muted-foreground">
          <Clock className="h-4 w-4 text-gold flex-none" />
          <span>
            Previsão: <strong className="text-foreground">{timeEstimate}</strong>
          </span>
        </div>
      </div>

      {/* Card principal: Escolha como pagar */}
      <div className="overflow-hidden rounded-2xl border border-gold/40 bg-card shadow-xl">
        <div className="bg-gradient-to-r from-gold via-amber-400 to-gold px-4 py-3 text-sm font-bold text-black shadow-xs tracking-wide">
          Escolha como pagar
        </div>

        <div className="divide-y divide-border/60">
          {/* Cabeçalho Pagar Agora */}
          <div className="flex items-center justify-between bg-secondary/35 px-4 py-3">
            <div>
              <div className="text-sm font-bold text-foreground">Pagar agora</div>
              <div className="text-[11px] text-muted-foreground">
                Pague com agilidade e segurança
              </div>
            </div>
            <span className="rounded-md bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white">
              Mais rápido
            </span>
          </div>

          {/* Opção Pix Online */}
          <button
            type="button"
            onClick={() => onChangeField("payment")("Pix")}
            className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-secondary/20"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-teal-500/15 text-teal-400">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">Pix</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Pague agora • Liberação imediata
                </div>
              </div>
            </div>

            <div
              className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 transition ${
                form.payment === "Pix"
                  ? "border-gold bg-gold"
                  : "border-muted-foreground/50"
              }`}
            >
              {form.payment === "Pix" && (
                <div className="h-2.5 w-2.5 rounded-full bg-gold-foreground" />
              )}
            </div>
          </button>

          {/* Cabeçalho Pagar na Entrega / Retirada */}
          <button
            type="button"
            onClick={() => setOnDeliveryExpanded((v) => !v)}
            className="flex w-full items-center justify-between bg-secondary/35 px-4 py-3 text-left transition hover:bg-secondary/50"
          >
            <div>
              <div className="text-sm font-bold text-foreground">
                {form.deliveryMode === "pickup"
                  ? "Pagar na retirada"
                  : form.deliveryMode === "dine_in"
                  ? "Pagar no local"
                  : "Pagar na entrega"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Cartão (maquininha) ou Dinheiro
              </div>
            </div>
            {onDeliveryExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {onDeliveryExpanded && (
            <div className="divide-y divide-border/50">
              {/* Cartão de Crédito */}
              <button
                type="button"
                onClick={() => onChangeField("payment")("Cartão de crédito")}
                className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-secondary/20"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">Cartão de crédito</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Aceitamos as principais bandeiras
                    </div>
                  </div>
                </div>

                <div
                  className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 transition ${
                    form.payment === "Cartão de crédito"
                      ? "border-gold bg-gold"
                      : "border-muted-foreground/50"
                  }`}
                >
                  {form.payment === "Cartão de crédito" && (
                    <div className="h-2.5 w-2.5 rounded-full bg-gold-foreground" />
                  )}
                </div>
              </button>

              {/* Cartão de Débito */}
              <button
                type="button"
                onClick={() => onChangeField("payment")("Cartão de débito")}
                className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-secondary/20"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">Cartão de débito</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Pagamento na maquininha
                    </div>
                  </div>
                </div>

                <div
                  className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 transition ${
                    form.payment === "Cartão de débito"
                      ? "border-gold bg-gold"
                      : "border-muted-foreground/50"
                  }`}
                >
                  {form.payment === "Cartão de débito" && (
                    <div className="h-2.5 w-2.5 rounded-full bg-gold-foreground" />
                  )}
                </div>
              </button>

              {/* Dinheiro */}
              <div className="p-4">
                <button
                  type="button"
                  onClick={() => onChangeField("payment")("Dinheiro")}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                      <Banknote className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground">Dinheiro</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Informe se precisar de troco
                      </div>
                    </div>
                  </div>

                  <div
                    className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 transition ${
                      form.payment === "Dinheiro"
                        ? "border-gold bg-gold"
                        : "border-muted-foreground/50"
                    }`}
                  >
                    {form.payment === "Dinheiro" && (
                      <div className="h-2.5 w-2.5 rounded-full bg-gold-foreground" />
                    )}
                  </div>
                </button>

                {form.payment === "Dinheiro" && (
                  <div className="mt-3 rounded-xl border border-border/80 bg-secondary/30 p-3">
                    <label className="block text-xs font-semibold text-muted-foreground">
                      Precisa de troco para quanto? (deixe em branco se não precisar)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.troco}
                      onChange={(e) => onChangeField("troco")(e.target.value)}
                      placeholder={`Ex.: ${Math.ceil(total / 10) * 10 + 10}`}
                      maxLength={10}
                      className={`mt-1.5 w-full rounded-xl border bg-card px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-gold/50 ${
                        errors.troco ? "border-destructive" : "border-border"
                      }`}
                    />
                    {errors.troco && <p className="mt-1 text-xs text-destructive">{errors.troco}</p>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {errors.payment && (
        <p className="text-xs font-semibold text-destructive">{errors.payment}</p>
      )}

      {/* Observações gerais */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Observações Gerais do Pedido (opcional)
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => onChangeField("notes")(e.target.value)}
          placeholder="Ex.: Tocar o interfone 42, deixar na portaria..."
          rows={2}
          maxLength={300}
          className="mt-1.5 w-full resize-none rounded-xl border border-border bg-secondary/30 p-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-gold/50"
        />
      </div>

      {submitError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {submitError}
        </div>
      )}
    </div>
  );
}

