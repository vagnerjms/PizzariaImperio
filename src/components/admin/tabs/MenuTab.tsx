import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, Save, RotateCcw, CheckCircle2, Ban, Loader2 } from "lucide-react";
import { MENU, CATEGORIES, formatBRL, Pizza } from "@/data/catalog";
import {
  getPublicMenuOverrides,
  saveMenuOverride,
  resetMenuOverride,
  PublicMenuOverride,
} from "@/lib/menu.functions";

export function MenuTab() {
  const fetchOverrides = useServerFn(getPublicMenuOverrides);
  const saveOverride = useServerFn(saveMenuOverride);
  const resetOverride = useServerFn(resetMenuOverride);

  const [overrides, setOverrides] = useState<Record<string, PublicMenuOverride>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("todas");
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchOverrides();
      setOverrides(data || {});
    } catch (e) {
      console.error("Erro ao carregar cardápio:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const showToast = (text: string, isError?: boolean) => {
    setFeedback({ text, isError });
    setTimeout(() => setFeedback(null), 3500);
  };

  const mergedItems = useMemo(() => {
    return MENU.map((item) => {
      const ov = overrides[item.id];
      const effectivePrice =
        typeof ov?.price === "number" && ov.price >= 0 ? ov.price : item.price;
      const available = ov?.available !== undefined ? ov.available : true;
      return {
        ...item,
        defaultPrice: item.price,
        price: effectivePrice,
        available,
        hasOverride: Boolean(ov),
      };
    });
  }, [overrides]);

  const filtered = useMemo(() => {
    return mergedItems.filter((item) => {
      if (category !== "todas" && item.category !== category) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.ingredients.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [mergedItems, category, search]);

  const stats = useMemo(() => {
    const total = mergedItems.length;
    const paused = mergedItems.filter((i) => !i.available).length;
    const customized = mergedItems.filter((i) => i.hasOverride).length;
    return { total, active: total - paused, paused, customized };
  }, [mergedItems]);

  const handleToggleAvailable = async (item: Pizza & { available: boolean; price: number }) => {
    setSavingId(item.id);
    const nextAvailable = !item.available;
    try {
      await saveOverride({
        data: {
          id: item.id,
          available: nextAvailable,
          price: item.price,
        },
      });
      setOverrides((prev) => ({
        ...prev,
        [item.id]: {
          id: item.id,
          price: item.price,
          available: nextAvailable,
        },
      }));
      showToast(
        nextAvailable
          ? `"${item.name}" ativado no cardápio.`
          : `"${item.name}" marcado como esgotado.`
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao atualizar item.", true);
    } finally {
      setSavingId(null);
    }
  };

  const handleSavePrice = async (item: Pizza & { available: boolean; price: number }) => {
    const rawDraft = priceDrafts[item.id];
    if (rawDraft === undefined) return;
    const parsed = Number(rawDraft.replace(",", "."));
    if (isNaN(parsed) || parsed < 0) {
      showToast("Informe um preço válido.", true);
      return;
    }

    setSavingId(item.id);
    try {
      await saveOverride({
        data: {
          id: item.id,
          price: parsed,
          available: item.available,
        },
      });
      setOverrides((prev) => ({
        ...prev,
        [item.id]: {
          id: item.id,
          price: parsed,
          available: item.available,
        },
      }));
      setPriceDrafts((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
      showToast(`Preço de "${item.name}" atualizado para ${formatBRL(parsed)}!`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao salvar preço.", true);
    } finally {
      setSavingId(null);
    }
  };

  const handleReset = async (item: Pizza & { defaultPrice: number }) => {
    setSavingId(item.id);
    try {
      await resetOverride({ data: { id: item.id } });
      setOverrides((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
      setPriceDrafts((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
      showToast(`"${item.name}" restaurado para o padrão (${formatBRL(item.defaultPrice)}).`);
    } catch (e) {
      showToast("Erro ao restaurar item.", true);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground">
            Gerenciamento de Cardápio
          </h2>
          <p className="text-sm text-muted-foreground">
            Altere preços em tempo real ou pause sabores e bebidas temporariamente esgotados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-bold text-emerald-400">
            Ativos: {stats.active}
          </span>
          <span className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-bold text-red-400">
            Esgotados: {stats.paused}
          </span>
          <span className="rounded-xl border border-gold/30 bg-gold/10 px-3 py-1.5 font-bold text-gold">
            Preços editados: {stats.customized}
          </span>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
            feedback.isError
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Barra de busca e filtro de categorias */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pizza, bebida ou ingrediente..."
            className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                category === c.id
                  ? "bg-gold text-gold-foreground shadow-gold-glow"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-gold" /> Carregando itens do cardápio...
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => {
            const draftVal =
              priceDrafts[item.id] !== undefined
                ? priceDrafts[item.id]
                : item.price.toFixed(2).replace(".", ",");
            const isSaving = savingId === item.id;

            return (
              <div
                key={item.id}
                className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
                  item.available
                    ? "border-border bg-card"
                    : "border-red-500/30 bg-red-950/10 opacity-75"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-base font-bold text-foreground">
                        {item.name}
                      </span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {item.category}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {item.ingredients}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleToggleAvailable(item)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                      item.available
                        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                        : "border-red-500/40 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    }`}
                  >
                    {item.available ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" /> Disponível
                      </>
                    ) : (
                      <>
                        <Ban className="h-3 w-3" /> Esgotado
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={draftVal}
                      onChange={(e) =>
                        setPriceDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      className="w-24 rounded-lg border border-border bg-secondary/40 px-2.5 py-1.5 text-sm font-bold text-gold focus:outline-none focus:ring-2 focus:ring-gold/50"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    {priceDrafts[item.id] !== undefined && (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleSavePrice(item)}
                        className="inline-flex items-center gap-1 rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-gold-foreground transition hover:brightness-110"
                      >
                        <Save className="h-3.5 w-3.5" /> Salvar
                      </button>
                    )}

                    {item.hasOverride && (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleReset(item)}
                        title={`Restaurar padrão (${formatBRL(item.defaultPrice)})`}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition hover:border-gold/40 hover:text-foreground"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

