import { useState } from "react";
import {
  User,
  Home,
  Store,
  UtensilsCrossed,
  Loader2,
  Navigation,
  Search,
  Sparkles,
  MapPin,
  Pencil,
} from "lucide-react";
import { DeliveryAddressForm, DeliveryMode } from "@/hooks/useDeliveryAddress";
import { LocationResult } from "@/lib/location.functions";
import { formatBRL } from "@/data/catalog";

export function CheckoutDeliveryStep({
  form,
  errors,
  cepLoading,
  locatingGPS,
  streetSearching,
  streetSuggestions,
  bairroSuggestions,
  locationMsg,
  onChangeIdentity,
  onDeliveryModeChange,
  onCEPChange,
  onGPSLocation,
  onRuaInputChange,
  onSelectSuggestion,
  onBairroInputChange,
  onSelectBairro,
  onChangeField,
}: {
  form: DeliveryAddressForm;
  errors: Record<string, string>;
  cepLoading: boolean;
  locatingGPS: boolean;
  streetSearching: boolean;
  streetSuggestions: LocationResult[];
  bairroSuggestions: Array<{ name: string; fee: number }>;
  locationMsg: string | null;
  onChangeIdentity: () => void;
  onDeliveryModeChange: (mode: DeliveryMode) => void;
  onCEPChange: (val: string) => void;
  onGPSLocation: () => void;
  onRuaInputChange: (val: string) => void;
  onSelectSuggestion: (loc: LocationResult) => void;
  onBairroInputChange: (val: string) => void;
  onSelectBairro: (n: { name: string; fee: number }) => void;
  onChangeField: (k: keyof DeliveryAddressForm) => (v: string) => void;
}) {
  const hasCompleteAddress = Boolean(form.rua.trim() && form.numero.trim() && form.bairro.trim());
  const [editingAddress, setEditingAddress] = useState(!hasCompleteAddress);

  const handleSelectDelivery = () => {
    onDeliveryModeChange("delivery");
    if (!hasCompleteAddress) {
      setEditingAddress(true);
    }
  };

  return (
    <div className="space-y-5">
      {/* Card: Será entregue para */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border/60 bg-secondary/30 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
          Será entregue para
        </div>
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <User className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">{form.name || "Cliente"}</div>
              <div className="text-xs text-muted-foreground">{form.phone}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onChangeIdentity}
            className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-gold transition hover:bg-gold/10"
          >
            Trocar
          </button>
        </div>
      </div>

      {/* Card principal: Escolha onde receber */}
      <div className="overflow-hidden rounded-2xl border border-gold/40 bg-card shadow-xl">
        <div className="bg-gradient-to-r from-gold via-amber-400 to-gold px-4 py-3 text-sm font-bold text-black shadow-xs tracking-wide">
          Escolha onde receber
        </div>

        <div className="divide-y divide-border/60">
          {/* Opção 1: Entregar no endereço / Cadastrar novo endereço */}
          <div className="p-4">
            <button
              type="button"
              onClick={handleSelectDelivery}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gold/15 text-gold">
                  <Home className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">
                    {hasCompleteAddress && !editingAddress
                      ? "Entregar no meu endereço"
                      : "Cadastrar novo endereço"}
                  </div>
                  {hasCompleteAddress && !editingAddress ? (
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {form.rua}, {form.numero} — {form.bairro}
                      {form.deliveryFee !== null && (
                        <span className="ml-1.5 font-semibold text-gold">
                          • Taxa: {form.deliveryFee === 0 ? "Grátis" : formatBRL(form.deliveryFee)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-0.5 text-xs text-muted-foreground">30 - 50 min</div>
                  )}
                </div>
              </div>

              <div
                className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 transition ${
                  form.deliveryMode === "delivery"
                    ? "border-gold bg-gold"
                    : "border-muted-foreground/50"
                }`}
              >
                {form.deliveryMode === "delivery" && (
                  <div className="h-2.5 w-2.5 rounded-full bg-gold-foreground" />
                )}
              </div>
            </button>

            {/* Resumo do endereço salvo com botão Editar */}
            {form.deliveryMode === "delivery" && hasCompleteAddress && !editingAddress && (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-gold/30 bg-gold/5 px-3.5 py-2.5 text-xs">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 flex-none text-gold" />
                  <div>
                    <span className="font-semibold text-foreground">
                      {form.rua}, {form.numero}
                    </span>{" "}
                    • {form.bairro}
                    {form.complemento ? ` (${form.complemento})` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingAddress(true)}
                  className="ml-2 inline-flex items-center gap-1 font-bold text-gold hover:underline"
                >
                  <Pencil className="h-3 w-3" /> Editar
                </button>
              </div>
            )}

            {/* Formulário de Endereço Expansível */}
            {form.deliveryMode === "delivery" && (editingAddress || !hasCompleteAddress) && (
              <div className="mt-4 space-y-3.5 rounded-2xl border border-border/80 bg-secondary/25 p-3.5 animate-in fade-in duration-150">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={onGPSLocation}
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
                        <span>Usar localização GPS</span>
                      </>
                    )}
                  </button>
                  <span className="text-[11px] text-muted-foreground">ou informe CEP / Rua</span>
                </div>

                {locationMsg && (
                  <p className="text-xs text-gold flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> {locationMsg}
                  </p>
                )}

                <div className="relative">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    CEP (opcional se digitar a rua)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.cep}
                    onChange={(e) => onCEPChange(e.target.value)}
                    placeholder="12900-000"
                    maxLength={9}
                    className={`mt-1 w-full rounded-xl border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-gold/50 ${
                      errors.cep ? "border-destructive" : "border-border"
                    }`}
                  />
                  {cepLoading && (
                    <div className="absolute right-3 top-8 text-gold animate-spin">
                      <Loader2 className="h-4 w-4" />
                    </div>
                  )}
                  {errors.cep && <p className="mt-1 text-xs text-destructive">{errors.cep}</p>}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 relative">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Rua / Logradouro
                    </label>
                    <div className="relative mt-1">
                      <input
                        type="text"
                        value={form.rua}
                        onChange={(e) => onRuaInputChange(e.target.value)}
                        placeholder="Ex.: Av. dos Imigrantes"
                        maxLength={100}
                        className={`w-full rounded-xl border bg-card pl-3.5 pr-8 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-gold/50 ${
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
                      <ul className="absolute left-0 top-full z-40 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-gold/40 bg-card shadow-2xl divide-y divide-border/60">
                        {streetSuggestions.map((loc, i) => (
                          <li key={i}>
                            <button
                              type="button"
                              onClick={() => onSelectSuggestion(loc)}
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
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Número
                    </label>
                    <input
                      type="text"
                      value={form.numero}
                      onChange={(e) => onChangeField("numero")(e.target.value)}
                      placeholder="123"
                      maxLength={10}
                      className={`mt-1 w-full rounded-xl border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-gold/50 ${
                        errors.numero ? "border-destructive" : "border-border"
                      }`}
                    />
                    {errors.numero && <p className="mt-1 text-xs text-destructive">{errors.numero}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Bairro
                    </label>
                    <input
                      type="text"
                      value={form.bairro}
                      onChange={(e) => onBairroInputChange(e.target.value)}
                      placeholder="Ex.: Lavapés, Centro..."
                      maxLength={50}
                      className={`mt-1 w-full rounded-xl border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-gold/50 ${
                        errors.bairro ? "border-destructive" : "border-border"
                      }`}
                    />
                    {errors.bairro && <p className="mt-1 text-xs text-destructive">{errors.bairro}</p>}

                    {bairroSuggestions.length > 0 && (
                      <ul className="absolute left-0 top-full z-40 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gold/40 bg-card shadow-2xl divide-y divide-border/60">
                        {bairroSuggestions.map((n, i) => (
                          <li key={i}>
                            <button
                              type="button"
                              onClick={() => onSelectBairro(n)}
                              className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs transition hover:bg-gold/15 hover:text-gold"
                            >
                              <span className="font-semibold text-foreground">{n.name}</span>
                              <span className="text-[11px] text-gold font-bold">
                                Taxa: R$ {n.fee.toFixed(2).replace(".", ",")}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Complemento (opcional)
                    </label>
                    <input
                      type="text"
                      value={form.complemento}
                      onChange={(e) => onChangeField("complemento")(e.target.value)}
                      placeholder="Apto, Bloco, Casa..."
                      maxLength={80}
                      className="mt-1 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-gold/50"
                    />
                  </div>
                </div>

                {hasCompleteAddress && (
                  <button
                    type="button"
                    onClick={() => setEditingAddress(false)}
                    className="w-full rounded-xl border border-gold/40 bg-gold/15 py-2 text-xs font-bold text-gold transition hover:bg-gold hover:text-gold-foreground"
                  >
                    Confirmar este endereço
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Opção 2: Buscar o pedido (Retirada no balcão) */}
          <button
            type="button"
            onClick={() => onDeliveryModeChange("pickup")}
            className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-secondary/20"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gold/15 text-gold">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">Buscar o pedido</div>
                <div className="mt-0.5 text-xs font-bold text-emerald-400">Grátis • Retirada no balcão</div>
              </div>
            </div>

            <div
              className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 transition ${
                form.deliveryMode === "pickup"
                  ? "border-gold bg-gold"
                  : "border-muted-foreground/50"
              }`}
            >
              {form.deliveryMode === "pickup" && (
                <div className="h-2.5 w-2.5 rounded-full bg-gold-foreground" />
              )}
            </div>
          </button>

          {/* Opção 3: Consumir no local */}
          <button
            type="button"
            onClick={() => onDeliveryModeChange("dine_in")}
            className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-secondary/20"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gold/15 text-gold">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">Consumir no local</div>
                <div className="mt-0.5 text-xs font-bold text-emerald-400">Grátis • Salão Pizzaria Império</div>
              </div>
            </div>

            <div
              className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 transition ${
                form.deliveryMode === "dine_in"
                  ? "border-gold bg-gold"
                  : "border-muted-foreground/50"
              }`}
            >
              {form.deliveryMode === "dine_in" && (
                <div className="h-2.5 w-2.5 rounded-full bg-gold-foreground" />
              )}
            </div>
          </button>
        </div>
      </div>

      {errors.deliveryMode && (
        <p className="text-xs font-semibold text-destructive">{errors.deliveryMode}</p>
      )}
    </div>
  );
}

