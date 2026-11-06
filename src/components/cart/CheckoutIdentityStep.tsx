import { useState } from "react";
import { User, Smartphone, ShieldCheck } from "lucide-react";
import { DeliveryAddressForm } from "@/hooks/useDeliveryAddress";

export function CheckoutIdentityStep({
  form,
  errors,
  initialShowConfirmModal = false,
  onChangeField,
  onValidate,
  onConfirmIdentity,
}: {
  form: DeliveryAddressForm;
  errors: Record<string, string>;
  initialShowConfirmModal?: boolean;
  onChangeField: (k: keyof DeliveryAddressForm) => (v: string) => void;
  onValidate: () => boolean;
  onConfirmIdentity: () => void;
}) {
  const [showConfirmModal, setShowConfirmModal] = useState(initialShowConfirmModal);

  const phoneDigits = form.phone.replace(/\D/g, "");
  const isReady = phoneDigits.length >= 10 && form.name.trim().length >= 2;

  const handleAdvanceClick = () => {
    if (onValidate()) {
      setShowConfirmModal(true);
    }
  };

  return (
    <div className="relative flex flex-col space-y-6 py-2">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-foreground mb-2">
            Seu número de WhatsApp é:
          </label>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => onChangeField("phone")(e.target.value)}
            placeholder="(11) 9 0000-0000"
            maxLength={16}
            className={`w-full rounded-xl border bg-secondary/40 px-4 py-3.5 text-base font-medium text-foreground placeholder:text-muted-foreground/50 transition focus:outline-none focus:ring-2 focus:ring-gold/60 ${
              errors.phone ? "border-destructive" : "border-gold/40"
            }`}
          />
          {errors.phone && <p className="mt-1.5 text-xs text-destructive">{errors.phone}</p>}
        </div>

        <div>
          <label className="block text-sm font-bold text-foreground mb-2">
            Seu nome e sobrenome:
          </label>
          <input
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={(e) => onChangeField("name")(e.target.value)}
            placeholder="Nome e sobrenome"
            maxLength={80}
            className={`w-full rounded-xl border bg-secondary/40 px-4 py-3.5 text-base font-medium text-foreground placeholder:text-muted-foreground/50 transition focus:outline-none focus:ring-2 focus:ring-gold/60 ${
              errors.name ? "border-destructive" : "border-border"
            }`}
          />
          {errors.name && <p className="mt-1.5 text-xs text-destructive">{errors.name}</p>}
        </div>

        <button
          type="button"
          onClick={handleAdvanceClick}
          className={`w-full rounded-xl py-4 text-sm font-bold tracking-wide transition active:scale-[0.99] ${
            isReady
              ? "bg-gold text-gold-foreground shadow-gold-glow hover:brightness-110"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          }`}
        >
          Avançar
        </button>

        <p className="px-4 text-center text-xs leading-relaxed text-muted-foreground">
          Para realizar seu pedido vamos precisar de suas informações, este é um ambiente protegido.
        </p>
      </div>

      {/* Modal de confirmação de dados (estilo Anota AI) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl font-bold text-foreground">
                Confirme seus dados
              </h3>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                <ShieldCheck className="h-3 w-3" /> Seguro
              </span>
            </div>

            <div className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-secondary/30">
              <div className="flex items-center gap-3.5 p-4">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gold/15 text-gold">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Eu sou</div>
                  <div className="text-base font-bold text-foreground">{form.name.trim()}</div>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-4">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gold/15 text-gold">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Meu telefone é</div>
                  <div className="text-base font-bold text-foreground">{form.phone.trim()}</div>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (onValidate()) {
                    setShowConfirmModal(false);
                    onConfirmIdentity();
                  }
                }}
                className="w-full rounded-xl bg-gold py-3.5 text-sm font-bold text-gold-foreground shadow-gold-glow transition hover:brightness-110 active:scale-95"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="w-full rounded-xl py-2.5 text-sm font-semibold text-gold transition hover:bg-secondary/50"
              >
                Editar informações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
