import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bike, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { getAdminDeliverySettings, updateAdminDeliverySettings, resetToBragancaNeighborhoods } from "@/lib/delivery.functions";

export function DeliveryTab({ user }: { user: { email: string; roles: string[] } }) {
  const fetchDeliverySettings = useServerFn(getAdminDeliverySettings);
  const saveDeliverySettingsFn = useServerFn(updateAdminDeliverySettings);
  const resetBragancaFn = useServerFn(resetToBragancaNeighborhoods);

  const [deliveryFeeSettings, setDeliveryFeeSettings] = useState<{
    default_fee: number;
    neighborhoods: Array<{ id: string; name: string; fee: number }>;
  }>({
    default_fee: 7.00,
    neighborhoods: [],
  });
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [deliverySuccessMsg, setDeliverySuccessMsg] = useState<string | null>(null);
  const [deliveryErrorMsg, setDeliveryErrorMsg] = useState<string | null>(null);

  const [newNeighborhoodName, setNewNeighborhoodName] = useState("");
  const [newNeighborhoodFee, setNewNeighborhoodFee] = useState("5.00");
  const [neighborhoodSearch, setNeighborhoodSearch] = useState("");

  const loadDeliverySettings = async () => {
    if (!user?.roles?.some(r => ["admin", "supervisor"].includes(r))) return;
    setDeliveryLoading(true);
    setDeliveryErrorMsg(null);
    try {
      const data = await fetchDeliverySettings();
      setDeliveryFeeSettings({
        default_fee: data.default_fee,
        neighborhoods: data.neighborhoods || [],
      });
    } catch (e) {
      setDeliveryErrorMsg(e instanceof Error ? e.message : "Erro ao carregar taxas de entrega.");
    } finally {
      setDeliveryLoading(false);
    }
  };

  useEffect(() => {
    loadDeliverySettings();
  }, []);

  const handleLoadBraganca = async () => {
    if (!confirm("Deseja carregar a lista com todos os bairros oficiais de Bragança Paulista?")) return;
    setDeliveryLoading(true);
    setDeliverySuccessMsg(null);
    setDeliveryErrorMsg(null);
    try {
      const data = await resetBragancaFn();
      setDeliveryFeeSettings({
        default_fee: data.default_fee,
        neighborhoods: data.neighborhoods || [],
      });
      setDeliverySuccessMsg("Todos os bairros de Bragança Paulista foram carregados!");
      setTimeout(() => setDeliverySuccessMsg(null), 5000);
    } catch (e) {
      setDeliveryErrorMsg(e instanceof Error ? e.message : "Erro ao carregar bairros.");
    } finally {
      setDeliveryLoading(false);
    }
  };

  const handleSaveDeliverySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeliverySaving(true);
    setDeliverySuccessMsg(null);
    setDeliveryErrorMsg(null);
    try {
      await saveDeliverySettingsFn({
        data: {
          default_fee: Number(deliveryFeeSettings.default_fee) || 7.00,
          neighborhoods: deliveryFeeSettings.neighborhoods.map(n => ({
            id: n.id,
            name: n.name.trim(),
            fee: Number(n.fee) || 0,
          })),
        },
      });
      setDeliverySuccessMsg("Taxas de entrega salvas com sucesso!");
      setTimeout(() => setDeliverySuccessMsg(null), 4000);
    } catch (err) {
      setDeliveryErrorMsg(err instanceof Error ? err.message : "Erro ao salvar taxas de entrega.");
    } finally {
      setDeliverySaving(false);
    }
  };

  const handleAddNeighborhood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNeighborhoodName.trim()) return;
    const feeNum = parseFloat(newNeighborhoodFee.replace(",", ".")) || 0;
    const newEntry = {
      id: `bairro-${Date.now()}`,
      name: newNeighborhoodName.trim(),
      fee: feeNum,
    };
    setDeliveryFeeSettings(prev => ({
      ...prev,
      neighborhoods: [newEntry, ...prev.neighborhoods],
    }));
    setNewNeighborhoodName("");
    setNewNeighborhoodFee("5.00");
  };

  const handleDeleteNeighborhood = (id: string) => {
    setDeliveryFeeSettings(prev => ({
      ...prev,
      neighborhoods: prev.neighborhoods.filter(n => n.id !== id),
    }));
  };

  const handleUpdateNeighborhoodFee = (id: string, feeStr: string) => {
    const feeNum = parseFloat(feeStr.replace(",", ".")) || 0;
    setDeliveryFeeSettings(prev => ({
      ...prev,
      neighborhoods: prev.neighborhoods.map(n => n.id === id ? { ...n, fee: feeNum } : n),
    }));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <header className="flex items-center justify-between border-b border-border/60 pb-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-gold/10 p-2.5 text-gold">
              <Bike className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-serif text-lg leading-tight">Taxas de Entrega por Bairro</h2>
              <p className="text-xs text-muted-foreground">Configure os valores cobrados automaticamente no Checkout via CEP</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleLoadBraganca}
              disabled={deliverySaving || deliveryLoading}
              className="rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gold transition hover:bg-gold hover:text-gold-foreground disabled:opacity-50"
            >
              Carregar Bairros de Bragança
            </button>
            <button
              type="button"
              onClick={handleSaveDeliverySettings}
              disabled={deliverySaving || deliveryLoading}
              className="rounded-full bg-gold px-5 py-2 text-xs font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
            >
              {deliverySaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {deliverySaving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </header>

        {deliveryLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-gold mb-3" />
            <p className="text-sm">Carregando taxas de entrega...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {deliveryErrorMsg && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                {deliveryErrorMsg}
              </div>
            )}
            {deliverySuccessMsg && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-xs text-green-500 font-semibold">
                {deliverySuccessMsg}
              </div>
            )}

            {/* Configuração de Taxa Padrão */}
            <div className="rounded-xl border border-border bg-secondary/20 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">Taxa Padrão Geral (Fallback)</span>
                  <p className="text-xs text-muted-foreground">Valor cobrado quando o cliente mora em um bairro que não está listado abaixo.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">R$</span>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={deliveryFeeSettings.default_fee}
                    onChange={(e) => setDeliveryFeeSettings(prev => ({ ...prev, default_fee: parseFloat(e.target.value) || 0 }))}
                    className="w-24 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                </div>
              </div>
            </div>

            {/* Adicionar Novo Bairro */}
            <form onSubmit={handleAddNeighborhood} className="rounded-xl border border-dashed border-border p-4 bg-secondary/10 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Cadastrar Novo Bairro
              </span>
              <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
                <input
                  type="text"
                  placeholder="Nome do Bairro (ex: Lavapés)"
                  value={newNeighborhoodName}
                  onChange={(e) => setNewNeighborhoodName(e.target.value)}
                  className="rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
                <div className="flex items-center gap-1.5 bg-card rounded-xl border border-border px-3 py-2">
                  <span className="text-xs font-semibold text-muted-foreground">R$</span>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    placeholder="5.00"
                    value={newNeighborhoodFee}
                    onChange={(e) => setNewNeighborhoodFee(e.target.value)}
                    className="w-full bg-transparent text-sm font-semibold text-foreground focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newNeighborhoodName.trim()}
                  className="rounded-xl bg-gold/15 border border-gold/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gold transition hover:bg-gold hover:text-gold-foreground disabled:opacity-40"
                >
                  Adicionar
                </button>
              </div>
            </form>

            {/* Busca e Lista de Bairros */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Bairros Cadastrados ({deliveryFeeSettings.neighborhoods.length})
                </span>
                <div className="relative w-48">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar bairro..."
                    value={neighborhoodSearch}
                    onChange={(e) => setNeighborhoodSearch(e.target.value)}
                    className="w-full rounded-full border border-border bg-secondary/30 pl-8 pr-3 py-1 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-gold/50"
                  />
                </div>
              </div>

              <div className="divide-y divide-border/60 rounded-xl border border-border bg-card overflow-hidden max-h-96 overflow-y-auto">
                {deliveryFeeSettings.neighborhoods
                  .filter(n => !neighborhoodSearch.trim() || n.name.toLowerCase().includes(neighborhoodSearch.toLowerCase().trim()))
                  .map((n) => (
                    <div key={n.id} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/15 transition">
                      <span className="text-sm font-medium text-foreground">{n.name}</span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-secondary/30 rounded-lg border border-border px-2.5 py-1">
                          <span className="text-xs font-bold text-muted-foreground">R$</span>
                          <input
                            type="number"
                            step="0.50"
                            min="0"
                            value={n.fee}
                            onChange={(e) => handleUpdateNeighborhoodFee(n.id, e.target.value)}
                            className="w-16 bg-transparent text-xs font-bold text-gold focus:outline-none text-right"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteNeighborhood(n.id)}
                          title="Remover Bairro"
                          className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
