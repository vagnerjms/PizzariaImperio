import { Flame, LogOut, RefreshCw, Printer, Link as LinkIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

export type AdminViewMode =
  | "pedidos"
  | "whatsapp"
  | "indicadores"
  | "taxas"
  | "promocoes"
  | "usuarios"
  | "configuracoes";

export function AdminHeader({
  user,
  viewMode,
  setViewMode,
  filter,
  setFilter,
  counts,
  printerConnected,
  onConnectPrinter,
  onDisconnectPrinter,
  onRefreshOrders,
  onLogout,
}: {
  user: { email: string; roles: string[] };
  viewMode: AdminViewMode;
  setViewMode: (mode: AdminViewMode) => void;
  filter: string;
  setFilter: (f: any) => void;
  counts: Record<string, number>;
  printerConnected: boolean;
  onConnectPrinter: () => void;
  onDisconnectPrinter: () => void;
  onRefreshOrders: () => void;
  onLogout: () => void;
}) {
  const tabs = [
    { id: "ativos", label: `Ativos (${counts.ativos ?? 0})` },
    { id: "novo", label: `Novos (${counts.novo ?? 0})` },
    { id: "preparando", label: `Preparando (${counts.preparando ?? 0})` },
    { id: "saiu", label: `Saiu (${counts.saiu ?? 0})` },
    { id: "entregue", label: `Entregues (${counts.entregue ?? 0})` },
    { id: "cancelado", label: `Cancelados (${counts.cancelado ?? 0})` },
    { id: "todos", label: `Todos (${counts.todos ?? 0})` },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="mx-auto flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Flame className="h-5 w-5 text-gold" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-lg leading-tight">Painel Administrativo</h1>
                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold leading-none">
                  {user?.roles?.includes("admin") ? "Admin" : user?.roles?.includes("supervisor") ? "Supervisor" : "Atendente"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="hidden h-6 w-px bg-border/60 sm:block" />

          {/* Navegação de Abas do Sistema */}
          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            <button
              type="button"
              onClick={() => setViewMode("pedidos")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "pedidos"
                  ? "bg-gold text-gold-foreground font-bold shadow-gold-glow"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              🍕 Pedidos (KDS)
            </button>

            {user?.roles?.some(r => ["admin", "supervisor"].includes(r)) && (
              <button
                type="button"
                onClick={() => setViewMode("indicadores")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "indicadores"
                    ? "bg-gold text-gold-foreground font-bold shadow-gold-glow"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                📊 Indicadores & DRE
              </button>
            )}

            {user?.roles?.includes("admin") && (
              <button
                type="button"
                onClick={() => setViewMode("usuarios")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "usuarios"
                    ? "bg-gold text-gold-foreground font-bold shadow-gold-glow"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                👥 Usuários
              </button>
            )}

            {user?.roles?.some(r => ["admin", "supervisor"].includes(r)) && (
              <button
                type="button"
                onClick={() => setViewMode("taxas")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "taxas"
                    ? "bg-gold text-gold-foreground font-bold shadow-gold-glow"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                🛵 Taxas de Entrega
              </button>
            )}

            {user?.roles?.some(r => ["admin", "supervisor"].includes(r)) && (
              <button
                type="button"
                onClick={() => setViewMode("promocoes")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "promocoes"
                    ? "bg-gold text-gold-foreground font-bold shadow-gold-glow"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                🏷️ Promoções
              </button>
            )}

            {user?.roles?.includes("admin") && (
              <button
                type="button"
                onClick={() => setViewMode("whatsapp")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "whatsapp"
                    ? "bg-gold text-gold-foreground font-bold shadow-gold-glow"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                💬 WhatsApp
              </button>
            )}

            {user?.roles?.includes("admin") && (
              <button
                type="button"
                onClick={() => setViewMode("configuracoes")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === "configuracoes"
                    ? "bg-gold text-gold-foreground font-bold shadow-gold-glow"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                ⚙️ Configurações
              </button>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={printerConnected ? onDisconnectPrinter : onConnectPrinter}
            title={printerConnected ? "Impressora USB Conectada" : "Conectar impressora USB (Bematech MP-4200)"}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
              printerConnected
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground hover:border-gold/50"
            }`}
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{printerConnected ? "Impressora USB" : "Conectar USB"}</span>
          </button>

          {viewMode === "pedidos" && (
            <button
              type="button"
              onClick={onRefreshOrders}
              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar
            </button>
          )}

          <Link
            to="/"
            className="hidden rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground sm:inline-block"
          >
            Ver site
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition hover:brightness-125"
          >
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </div>

      {viewMode === "pedidos" && (
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-6 pb-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                filter === t.id
                  ? "border-gold bg-gold/15 text-gold font-bold"
                  : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
