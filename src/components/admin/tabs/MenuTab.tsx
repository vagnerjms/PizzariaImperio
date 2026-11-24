import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Search,
  Save,
  CheckCircle2,
  Ban,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  Pizza as PizzaIcon,
  CircleDot,
} from "lucide-react";
import { CATEGORIES, Category, formatBRL, MENU_IMAGES } from "@/data/catalog";
import {
  getPublicCatalog,
  saveMenuItem,
  deleteMenuItem,
  saveMenuOverride,
  saveCrustOption,
  toggleCrustAvailability,
  deleteCrustOption,
} from "@/lib/menu.functions";
import { CatalogCrustOption, CatalogMenuItem } from "@/lib/menu-domain";

const IMAGE_PRESETS = [
  { key: "calabresa", label: "Calabresa / Salgada", src: MENU_IMAGES.calabresa },
  { key: "mussarela", label: "Margherita / Mussarela", src: MENU_IMAGES.mussarela },
  { key: "queijos", label: "Quatro Queijos", src: MENU_IMAGES.queijos },
  { key: "pepperoni", label: "Pepperoni", src: MENU_IMAGES.pepperoni },
  { key: "portuguesa", label: "Portuguesa / Presunto", src: MENU_IMAGES.portuguesa },
  { key: "frango", label: "Frango c/ Catupiry", src: MENU_IMAGES.frango },
  { key: "vegetariana", label: "Vegetariana / Brócolis", src: MENU_IMAGES.vegetariana },
  { key: "chocolate", label: "Chocolate / Doce", src: MENU_IMAGES.chocolate },
  { key: "romeu", label: "Romeu e Julieta", src: MENU_IMAGES.romeu },
  { key: "coca", label: "Refrigerante Cola", src: MENU_IMAGES.coca },
  { key: "guarana", label: "Guaraná", src: MENU_IMAGES.guarana },
  { key: "agua", label: "Água / Bebida", src: MENU_IMAGES.agua },
];

const EDITABLE_CATEGORIES = CATEGORIES.filter((c) => c.id !== "todas");

export function MenuTab({ isAdmin = true }: { isAdmin?: boolean }) {
  const fetchCatalog = useServerFn(getPublicCatalog);
  const saveItemFn = useServerFn(saveMenuItem);
  const deleteItemFn = useServerFn(deleteMenuItem);
  const saveOverrideFn = useServerFn(saveMenuOverride);
  const saveCrustFn = useServerFn(saveCrustOption);
  const toggleCrustFn = useServerFn(toggleCrustAvailability);
  const deleteCrustFn = useServerFn(deleteCrustOption);

  const [subTab, setSubTab] = useState<"items" | "crusts">("items");
  const [items, setItems] = useState<CatalogMenuItem[]>([]);
  const [crusts, setCrusts] = useState<CatalogCrustOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("todas");
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [badgeDrafts, setBadgeDrafts] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  // Item CRUD modal state (Admin only)
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogMenuItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: "",
    category: "tradicionais" as Category,
    ingredients: "",
    price: "",
    badge: "",
    image: MENU_IMAGES.calabresa,
    available: true,
  });

  // Crust CRUD inline form (Admin only)
  const [editingCrust, setEditingCrust] = useState<CatalogCrustOption | null>(null);
  const [crustModalOpen, setCrustModalOpen] = useState(false);
  const [crustForm, setCrustForm] = useState({
    name: "",
    price: "7",
    available: true,
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchCatalog();
      setItems(data?.items || []);
      setCrusts(data?.crusts || []);
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
    setTimeout(() => setFeedback(null), 4000);
  };

  const filtered = useMemo(() => {
    return items.filter((item) => {
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
  }, [items, category, search]);

  const stats = useMemo(() => {
    const total = items.length;
    const paused = items.filter((i) => !i.available).length;
    const pausedCrusts = crusts.filter((c) => !c.available).length;
    return { total, active: total - paused, paused, pausedCrusts };
  }, [items, crusts]);

  const handleToggleAvailable = async (item: CatalogMenuItem) => {
    setSavingId(item.id);
    const nextAvailable = !item.available;
    try {
      await saveOverrideFn({
        data: {
          id: item.id,
          available: nextAvailable,
        },
      });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, available: nextAvailable } : i))
      );
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

  const handleQuickSaveItem = async (item: CatalogMenuItem) => {
    if (!isAdmin) return;
    const rawPriceDraft = priceDrafts[item.id];
    const parsedPrice =
      rawPriceDraft !== undefined ? Number(rawPriceDraft.replace(",", ".")) : item.price;
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      showToast("Informe um preço válido.", true);
      return;
    }

    const rawBadge =
      badgeDrafts[item.id] !== undefined ? badgeDrafts[item.id].trim() : item.badge || "";
    const nextBadge = rawBadge.length > 0 ? rawBadge.slice(0, 40) : null;

    setSavingId(item.id);
    try {
      await saveOverrideFn({
        data: {
          id: item.id,
          price: parsedPrice,
          available: item.available,
          badge: nextBadge,
        },
      });
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, price: parsedPrice, badge: nextBadge || undefined }
            : i
        )
      );
      setPriceDrafts((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
      setBadgeDrafts((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
      showToast(`"${item.name}" atualizado (${formatBRL(parsedPrice)})!`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao salvar item.", true);
    } finally {
      setSavingId(null);
    }
  };

  const openCreateItem = () => {
    setEditingItem(null);
    setItemForm({
      name: "",
      category: category !== "todas" ? (category as Category) : "tradicionais",
      ingredients: "",
      price: "48",
      badge: "",
      image: MENU_IMAGES.calabresa,
      available: true,
    });
    setItemModalOpen(true);
  };

  const openEditItem = (item: CatalogMenuItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      category: item.category,
      ingredients: item.ingredients,
      price: String(item.price),
      badge: item.badge || "",
      image: item.image || MENU_IMAGES.calabresa,
      available: item.available,
    });
    setItemModalOpen(true);
  };

  const handleSubmitItemModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const parsedPrice = Number(itemForm.price.replace(",", "."));
    if (!itemForm.name.trim() || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
      showToast("Preencha nome e preço válidos.", true);
      return;
    }

    setSavingId(editingItem?.id || "__new__");
    try {
      const saved = await saveItemFn({
        data: {
          id: editingItem?.id,
          name: itemForm.name.trim(),
          category: itemForm.category,
          ingredients: itemForm.ingredients.trim(),
          desc: itemForm.ingredients.trim() || itemForm.name.trim(),
          price: parsedPrice,
          badge: itemForm.badge.trim() || null,
          image: itemForm.image.trim() || MENU_IMAGES.calabresa,
          available: itemForm.available,
        },
      });
      setItems((prev) =>
        editingItem
          ? prev.map((i) => (i.id === saved.id ? saved : i))
          : [...prev, saved]
      );
      setItemModalOpen(false);
      showToast(
        editingItem
          ? `"${saved.name}" atualizado no cardápio!`
          : `"${saved.name}" adicionado ao cardápio!`
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao salvar item.", true);
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteItem = async (item: CatalogMenuItem) => {
    if (!isAdmin) return;
    if (!window.confirm(`Excluir "${item.name}" permanentemente do cardápio?`)) return;
    setSavingId(item.id);
    try {
      await deleteItemFn({ data: { id: item.id } });
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      showToast(`"${item.name}" removido do cardápio.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao excluir item.", true);
    } finally {
      setSavingId(null);
    }
  };

  // ---- CRUST HANDLERS ----
  const handleToggleCrust = async (crust: CatalogCrustOption) => {
    if (crust.id === "nenhuma") return;
    setSavingId(`crust:${crust.id}`);
    const next = !crust.available;
    try {
      await toggleCrustFn({ data: { id: crust.id, available: next } });
      setCrusts((prev) =>
        prev.map((c) => (c.id === crust.id ? { ...c, available: next } : c))
      );
      showToast(
        next ? `"${crust.name}" ativada.` : `"${crust.name}" marcada como esgotada.`
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao atualizar borda.", true);
    } finally {
      setSavingId(null);
    }
  };

  const openCreateCrust = () => {
    setEditingCrust(null);
    setCrustForm({ name: "", price: "7", available: true });
    setCrustModalOpen(true);
  };

  const openEditCrust = (c: CatalogCrustOption) => {
    setEditingCrust(c);
    setCrustForm({ name: c.name, price: String(c.price), available: c.available });
    setCrustModalOpen(true);
  };

  const handleSubmitCrust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const parsedPrice = Number(crustForm.price.replace(",", "."));
    if (!crustForm.name.trim() || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
      showToast("Informe nome e preço válidos para a borda.", true);
      return;
    }

    setSavingId(editingCrust ? `crust:${editingCrust.id}` : "__new_crust__");
    try {
      const saved = await saveCrustFn({
        data: {
          id: editingCrust?.id,
          name: crustForm.name.trim(),
          price: parsedPrice,
          available: crustForm.available,
        },
      });
      setCrusts((prev) =>
        editingCrust ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved]
      );
      setCrustModalOpen(false);
      showToast(editingCrust ? `Borda "${saved.name}" atualizada!` : `Borda "${saved.name}" criada!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao salvar borda.", true);
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteCrust = async (crust: CatalogCrustOption) => {
    if (!isAdmin || crust.id === "nenhuma") return;
    if (!window.confirm(`Excluir a borda "${crust.name}"?`)) return;
    setSavingId(`crust:${crust.id}`);
    try {
      await deleteCrustFn({ data: { id: crust.id } });
      setCrusts((prev) => prev.filter((c) => c.id !== crust.id));
      showToast(`Borda "${crust.name}" removida.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao excluir borda.", true);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground">
            {isAdmin ? "Gerenciamento de Cardápio & Bordas" : "Ajuste Rápido de Estoque"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Cadastre, edite preços, selos, bordas recheadas ou pause itens em tempo real direto no banco de dados."
              : "Modo Supervisor: pause ou reative sabores, bebidas e bordas recheadas que acabaram no expediente."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-bold text-emerald-400">
            Itens Ativos: {stats.active}
          </span>
          <span className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-bold text-red-400">
            Esgotados: {stats.paused + stats.pausedCrusts}
          </span>
        </div>
      </div>

      {/* Sub-navegação Itens vs. Bordas + Botão Novo (Admin) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setSubTab("items")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition ${
              subTab === "items"
                ? "bg-gold text-gold-foreground shadow-gold-glow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PizzaIcon className="h-3.5 w-3.5" /> Sabores & Produtos ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("crusts")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition ${
              subTab === "crusts"
                ? "bg-gold text-gold-foreground shadow-gold-glow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CircleDot className="h-3.5 w-3.5" /> Bordas Recheadas ({crusts.length})
          </button>
        </div>

        {isAdmin && subTab === "items" && (
          <button
            type="button"
            onClick={openCreateItem}
            className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Novo Item
          </button>
        )}

        {isAdmin && subTab === "crusts" && (
          <button
            type="button"
            onClick={openCreateCrust}
            className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Nova Borda
          </button>
        )}
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

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-gold" /> Carregando catálogo do banco...
        </div>
      ) : subTab === "items" ? (
        <>
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

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => {
              const draftVal =
                priceDrafts[item.id] !== undefined
                  ? priceDrafts[item.id]
                  : item.price.toFixed(2).replace(".", ",");
              const badgeDraftVal =
                badgeDrafts[item.id] !== undefined
                  ? badgeDrafts[item.id]
                  : item.badge || "";
              const hasPendingDraft =
                priceDrafts[item.id] !== undefined || badgeDrafts[item.id] !== undefined;
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
                    <div className="flex items-start gap-2.5 min-w-0">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-11 w-11 flex-none rounded-lg object-cover border border-border/60"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-serif text-base font-bold text-foreground">
                            {item.name}
                          </span>
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {item.category}
                          </span>
                          {item.badge && (
                            <span className="rounded-full bg-gold/15 border border-gold/30 px-2 py-0.5 text-[10px] font-bold text-gold">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {item.ingredients}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleToggleAvailable(item)}
                      className={`inline-flex flex-none items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
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

                  <div className="mt-4 space-y-2.5 border-t border-border/60 pt-3">
                    {isAdmin ? (
                      <>
                        <div className="flex items-center justify-between gap-2">
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

                          <div className="flex items-center gap-1">
                            {hasPendingDraft && (
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleQuickSaveItem(item)}
                                className="inline-flex items-center gap-1 rounded-lg bg-gold px-2.5 py-1.5 text-xs font-bold text-gold-foreground transition hover:brightness-110"
                              >
                                <Save className="h-3.5 w-3.5" /> Salvar
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditItem(item)}
                              title="Editar nome, ingredientes e foto"
                              className="rounded-lg border border-border p-1.5 text-muted-foreground transition hover:border-gold/50 hover:text-gold"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleDeleteItem(item)}
                              title="Excluir item do cardápio"
                              className="rounded-lg border border-border p-1.5 text-muted-foreground transition hover:border-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <input
                          type="text"
                          maxLength={40}
                          value={badgeDraftVal}
                          onChange={(e) =>
                            setBadgeDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          placeholder="Selo opcional (ex: Mais pedida, Novidade)"
                          className="w-full rounded-lg border border-border/70 bg-secondary/30 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-gold/40"
                        />
                      </>
                    ) : (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Preço atual</span>
                        <span className="font-serif text-sm font-bold text-gold">
                          {formatBRL(item.price)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* ABA DE BORDAS RECHEADAS */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {crusts.map((crust) => {
            const isDefault = crust.id === "nenhuma";
            const isSaving = savingId === `crust:${crust.id}`;
            return (
              <div
                key={crust.id}
                className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 ${
                  crust.available
                    ? "border-border bg-card"
                    : "border-red-500/30 bg-red-950/10 opacity-75"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-serif text-base font-bold text-foreground">
                      {crust.name}
                    </h3>
                    <p className="mt-0.5 text-sm font-bold text-gold">
                      {crust.price === 0 ? "Grátis (Padrão)" : `+${formatBRL(crust.price)}`}
                    </p>
                  </div>

                  {!isDefault && (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleToggleCrust(crust)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                        crust.available
                          ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                          : "border-red-500/40 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      }`}
                    >
                      {crust.available ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> Disponível
                        </>
                      ) : (
                        <>
                          <Ban className="h-3 w-3" /> Esgotada
                        </>
                      )}
                    </button>
                  )}
                </div>

                {isAdmin && !isDefault && (
                  <div className="flex items-center justify-end gap-1.5 border-t border-border/50 pt-2.5">
                    <button
                      type="button"
                      onClick={() => openEditCrust(crust)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:border-gold hover:text-gold transition"
                    >
                      <Pencil className="h-3 w-3" /> Editar
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleDeleteCrust(crust)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:border-destructive hover:text-destructive transition"
                    >
                      <Trash2 className="h-3 w-3" /> Excluir
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CRIAR / EDITAR ITEM (ADMIN) */}
      {isAdmin && itemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <form
            onSubmit={handleSubmitItemModal}
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 my-8"
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-serif text-lg font-bold">
                {editingItem ? `Editar "${editingItem.name}"` : "Novo Item do Cardápio"}
              </h3>
              <button
                type="button"
                onClick={() => setItemModalOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Nome *</label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex.: Pepperoni Trufada"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Categoria *</label>
                <select
                  value={itemForm.category}
                  onChange={(e) =>
                    setItemForm((f) => ({ ...f, category: e.target.value as Category }))
                  }
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
                >
                  {EDITABLE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Preço (R$) *</label>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  required
                  value={itemForm.price}
                  onChange={(e) => setItemForm((f) => ({ ...f, price: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-bold text-gold focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Selo (opcional)
                </label>
                <input
                  type="text"
                  maxLength={40}
                  value={itemForm.badge}
                  onChange={(e) => setItemForm((f) => ({ ...f, badge: e.target.value }))}
                  placeholder="Ex.: Mais pedida, Chef"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Ingredientes / Descrição
              </label>
              <textarea
                rows={2}
                value={itemForm.ingredients}
                onChange={(e) => setItemForm((f) => ({ ...f, ingredients: e.target.value }))}
                placeholder="Ex.: Molho de tomate pelati, mussarela, pepperoni artesanal e orégano"
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Imagem (escolha um modelo ou cole uma URL)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {IMAGE_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => setItemForm((f) => ({ ...f, image: preset.src }))}
                    className={`rounded-lg border px-2 py-1 text-[11px] transition ${
                      itemForm.image === preset.src
                        ? "border-gold bg-gold/15 text-gold font-bold"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={itemForm.image}
                onChange={(e) => setItemForm((f) => ({ ...f, image: e.target.value }))}
                placeholder="https://... ou caminho da imagem"
                className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs focus:border-gold focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setItemModalOpen(false)}
                className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingId !== null}
                className="rounded-full bg-gold px-5 py-2 text-xs font-bold uppercase tracking-wider text-gold-foreground hover:brightness-110 disabled:opacity-50"
              >
                {savingId ? "Salvando..." : editingItem ? "Salvar Alterações" : "Criar Item"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL CRIAR / EDITAR BORDA (ADMIN) */}
      {isAdmin && crustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSubmitCrust}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-serif text-lg font-bold">
                {editingCrust ? `Editar Borda` : "Nova Borda Recheada"}
              </h3>
              <button
                type="button"
                onClick={() => setCrustModalOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Nome da Borda *</label>
              <input
                type="text"
                required
                value={crustForm.name}
                onChange={(e) => setCrustForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex.: Borda Cream Cheese"
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Valor Adicional (R$) *
              </label>
              <input
                type="number"
                step="0.50"
                min="0"
                required
                value={crustForm.price}
                onChange={(e) => setCrustForm((f) => ({ ...f, price: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-bold text-gold focus:border-gold focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setCrustModalOpen(false)}
                className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingId !== null}
                className="rounded-full bg-gold px-5 py-2 text-xs font-bold uppercase tracking-wider text-gold-foreground hover:brightness-110 disabled:opacity-50"
              >
                {savingId ? "Salvando..." : editingCrust ? "Salvar Borda" : "Criar Borda"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
