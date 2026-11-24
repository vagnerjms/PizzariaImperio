import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { listOrders, updateOrderStatus, confirmOrderPayment } from "@/lib/orders.functions";
import { listCouriers } from "@/lib/couriers.functions";
import { CourierRow } from "@/lib/couriers-domain";
import { getPublicStoreConfig, toggleStorePause } from "@/lib/settings";
import { PublicStoreConfig } from "@/lib/store-hours";
import { printOrderThermal } from "@/lib/thermal-printer";
import { queryKeys } from "@/lib/query-keys";
import { useThermalPrinter } from "@/hooks/useThermalPrinter";
import { OrderRow } from "@/types/orders";
import { AdminHeader, AdminViewMode } from "@/components/admin/AdminHeader";
import { OrdersTab } from "@/components/admin/tabs/OrdersTab";
import { playNewOrderChime } from "@/lib/sound";

// Code-split all non-default Admin tabs so atendentes/supervisores don't download restricted chunks
const CashTab = lazy(() =>
  import("@/components/admin/tabs/CashTab").then((m) => ({ default: m.CashTab }))
);
const CouriersTab = lazy(() =>
  import("@/components/admin/tabs/CouriersTab").then((m) => ({ default: m.CouriersTab }))
);
const MenuTab = lazy(() =>
  import("@/components/admin/tabs/MenuTab").then((m) => ({ default: m.MenuTab }))
);
const WhatsAppTab = lazy(() =>
  import("@/components/admin/tabs/WhatsAppTab").then((m) => ({ default: m.WhatsAppTab }))
);
const FinancialTab = lazy(() =>
  import("@/components/admin/tabs/FinancialTab").then((m) => ({ default: m.FinancialTab }))
);
const DeliveryTab = lazy(() =>
  import("@/components/admin/tabs/DeliveryTab").then((m) => ({ default: m.DeliveryTab }))
);
const PromotionsTab = lazy(() =>
  import("@/components/admin/tabs/PromotionsTab").then((m) => ({ default: m.PromotionsTab }))
);
const UsersTab = lazy(() =>
  import("@/components/admin/tabs/UsersTab").then((m) => ({ default: m.UsersTab }))
);
const SettingsTab = lazy(() =>
  import("@/components/admin/tabs/SettingsTab").then((m) => ({ default: m.SettingsTab }))
);

const VALID_TABS: ReadonlySet<AdminViewMode> = new Set([
  "pedidos",
  "caixa",
  "entregadores",
  "cardapio",
  "indicadores",
  "usuarios",
  "taxas",
  "promocoes",
  "whatsapp",
  "configuracoes",
]);

function AdminTabFallback() {
  return (
    <div className="flex items-center justify-center py-20 text-muted-foreground gap-2 text-sm">
      <Loader2 className="h-5 w-5 animate-spin text-gold" />
      Carregando módulo...
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/admin")({
  validateSearch: (search: Record<string, unknown>): { tab?: AdminViewMode } => {
    const raw = typeof search.tab === "string" ? (search.tab as AdminViewMode) : undefined;
    return raw && VALID_TABS.has(raw) ? { tab: raw } : {};
  },
  head: () => ({
    meta: [
      { title: "Painel de Pedidos — Pizzaria Império" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = Route.useRouteContext() as { user: { email: string; roles: string[] } };
  const { tab } = Route.useSearch();
  const isAdmin = Boolean(user?.roles?.includes("admin"));
  const isSupervisorOrAdmin = Boolean(
    user?.roles?.some((r) => ["admin", "supervisor"].includes(r))
  );
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchOrders = useServerFn(listOrders);
  const fetchCouriers = useServerFn(listCouriers);
  const updateStatus = useServerFn(updateOrderStatus);
  const confirmPaymentFn = useServerFn(confirmOrderPayment);
  const fetchStoreConfig = useServerFn(getPublicStoreConfig);
  const toggleStorePauseFn = useServerFn(toggleStorePause);

  const [filter, setFilter] = useState<
    "ativos" | "todos" | "pix_pendente" | OrderRow["status"]
  >("ativos");

  const viewMode: AdminViewMode = useMemo(() => {
    const requested = tab || "pedidos";
    if (requested === "pedidos") return "pedidos";
    if (["usuarios", "promocoes", "configuracoes"].includes(requested)) {
      return isAdmin ? requested : "pedidos";
    }
    return isSupervisorOrAdmin ? requested : "pedidos";
  }, [tab, isAdmin, isSupervisorOrAdmin]);

  const setViewMode = (nextTab: AdminViewMode) => {
    navigate({
      to: "/admin",
      search: nextTab === "pedidos" ? {} : { tab: nextTab },
      replace: false,
    });
  };
  const [togglingStore, setTogglingStore] = useState(false);

  // Alerta sonoro KDS
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("imperio_kds_sound") !== "false";
    }
    return true;
  });
  const knownOrderIdsRef = useRef<Set<string> | null>(null);

  const { data: storeConfig } = useQuery<PublicStoreConfig>({
    queryKey: queryKeys.admin.storeConfig(),
    queryFn: async () => fetchStoreConfig(),
    refetchInterval: 30000,
  });

  const { data: couriers = [] } = useQuery<CourierRow[]>({
    queryKey: queryKeys.admin.couriers(),
    queryFn: async () => fetchCouriers(),
    refetchInterval: 30000,
  });

  // Consulta reativa dos pedidos com TanStack Query (cache e polling inteligente)
  const {
    data: orders = [],
    isLoading: loading,
    error: queryError,
    refetch: refetchOrders,
  } = useQuery<OrderRow[]>({
    queryKey: queryKeys.admin.orders(),
    queryFn: async () => {
      const data = await fetchOrders();
      return (data || []) as OrderRow[];
    },
    refetchInterval: 10000,
  });

  const error = queryError instanceof Error ? queryError.message : null;

  const handleToggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("imperio_kds_sound", String(next));
      }
      if (next) playNewOrderChime();
      return next;
    });
  };

  // Configuração da Impressora Térmica Serial / USB (encapsulada em hook dedicado)
  const {
    printerConnected,
    printerSettings,
    printerMsg,
    showPrinterMessage,
    handleConnectPrinter,
    handleDisconnectPrinter,
    handleTestPrint,
    handlePrintOrder,
    updatePrinterSetting: handleUpdatePrinterSetting,
  } = useThermalPrinter();

  // Detecção reativa de novos pedidos para tocar chime sonoro
  useEffect(() => {
    if (!orders || orders.length === 0) return;
    const readyOrders = orders.filter(
      (o) => o.payment_method !== "Pix" || o.payment_status === "paid"
    );
    if (knownOrderIdsRef.current === null) {
      knownOrderIdsRef.current = new Set(readyOrders.map((o) => o.id));
    } else {
      const hasBrandNewReady = readyOrders.some(
        (o) => !knownOrderIdsRef.current!.has(o.id) && o.status === "novo"
      );
      if (hasBrandNewReady && soundEnabled) {
        playNewOrderChime();
      }
      knownOrderIdsRef.current = new Set(readyOrders.map((o) => o.id));
    }
  }, [orders, soundEnabled]);

  const filtered = useMemo(() => {
    const visible = orders.filter((o) => {
      if (o.payment_method === "Pix") {
        return o.payment_status === "paid";
      }
      return true;
    });

    if (filter === "todos") return orders;
    if (filter === "pix_pendente") {
      return orders.filter(
        (o) =>
          o.payment_method === "Pix" &&
          o.payment_status === "pending" &&
          o.status !== "cancelado"
      );
    }
    if (filter === "ativos") {
      return visible.filter((o) => o.status !== "entregue" && o.status !== "cancelado");
    }
    return visible.filter((o) => o.status === filter);
  }, [orders, filter]);

  const counts = useMemo(() => {
    const visible = orders.filter((o) => {
      if (o.payment_method === "Pix") {
        return o.payment_status === "paid";
      }
      return true;
    });

    const c: Record<string, number> = {
      ativos: 0,
      pix_pendente: 0,
      todos: orders.length,
    };
    for (const o of visible) {
      c[o.status] = (c[o.status] ?? 0) + 1;
      if (o.status !== "entregue" && o.status !== "cancelado") {
        c.ativos++;
      }
    }
    for (const o of orders) {
      if (
        o.payment_method === "Pix" &&
        o.payment_status === "pending" &&
        o.status !== "cancelado"
      ) {
        c.pix_pendente++;
      }
    }
    return c;
  }, [orders]);

  const handleStatus = async (
    id: string,
    status: OrderRow["status"],
    courierId?: string | null
  ) => {
    const targetOrder = orders.find((o) => o.id === id);
    const chosenCourier = courierId ? couriers.find((c) => c.id === courierId) : null;

    await queryClient.cancelQueries({ queryKey: queryKeys.admin.orders() });
    const previousOrders = queryClient.getQueryData<OrderRow[]>(queryKeys.admin.orders());

    // Atualização otimista no cache do TanStack Query
    queryClient.setQueryData<OrderRow[]>(queryKeys.admin.orders(), (prev = []) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              status,
              ...(courierId !== undefined
                ? {
                    courier_id: courierId,
                    courier_name: chosenCourier?.name ?? null,
                  }
                : {}),
            }
          : o
      )
    );

    // Auto-print thermal receipt when accepting order ("preparando")
    if (status === "preparando" && printerSettings.autoPrintOnAccept && targetOrder) {
      printOrderThermal(targetOrder as any, printerSettings).catch((err) => {
        console.error("Auto-print error:", err);
      });
    }

    try {
      await updateStatus({
        data: {
          id,
          status,
          ...(courierId !== undefined ? { courier_id: courierId } : {}),
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.cashDashboard() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.financialReportAll() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.courierSettlementsAll() }),
      ]);
    } catch (err) {
      if (previousOrders) {
        queryClient.setQueryData(queryKeys.admin.orders(), previousOrders);
      }
      showPrinterMessage(
        err instanceof Error ? err.message : "Erro ao atualizar status do pedido.",
        true,
        5000
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders() });
    }
  };

  const handleConfirmPayment = async (id: string) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.admin.orders() });
    const previousOrders = queryClient.getQueryData<OrderRow[]>(queryKeys.admin.orders());

    queryClient.setQueryData<OrderRow[]>(queryKeys.admin.orders(), (prev = []) =>
      prev.map((o) => (o.id === id ? { ...o, payment_status: "paid" } : o))
    );
    try {
      await confirmPaymentFn({ data: { id } });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.cashDashboard() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.financialReportAll() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.courierSettlementsAll() }),
      ]);
      showPrinterMessage(`Pagamento Pix do pedido #${id.slice(0, 6)} confirmado!`, false, 4000);
    } catch (err) {
      if (previousOrders) {
        queryClient.setQueryData(queryKeys.admin.orders(), previousOrders);
      }
      showPrinterMessage(
        err instanceof Error ? err.message : "Erro ao confirmar pagamento.",
        true,
        5000
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders() });
    }
  };

  const handleToggleStorePause = async () => {
    if (togglingStore) return;
    const currentlyOpen = storeConfig?.status?.isOpen ?? true;
    let nextOverride: "auto" | "force_open" | "force_closed";
    let pauseReason = "";

    if (currentlyOpen) {
      const reason = window.prompt(
        "Pausar recebimento de pedidos? Opcionalmente informe o motivo exibido aos clientes:",
        storeConfig?.pause_reason || "Forno em alta demanda — voltamos em breve!"
      );
      if (reason === null) return; // cancelled
      nextOverride = "force_closed";
      pauseReason = reason.trim();
    } else {
      // If currently closed by schedule, force open; if force_closed, restore auto (or force_open if outside hours)
      nextOverride =
        storeConfig?.store_status_override === "force_closed" ? "auto" : "force_open";
    }

    setTogglingStore(true);
    try {
      const updated = await toggleStorePauseFn({
        data: {
          store_status_override: nextOverride,
          pause_reason: pauseReason,
        },
      });
      queryClient.setQueryData(["admin", "store-config"], updated);
      showPrinterMessage(
        updated.status.isOpen
          ? "Loja aberta para novos pedidos!"
          : `Recebimento pausado: ${updated.status.reason}`,
        false,
        5000
      );
    } catch (e) {
      showPrinterMessage(
        e instanceof Error ? e.message : "Erro ao atualizar status da loja.",
        true,
        5000
      );
    } finally {
      setTogglingStore(false);
    }
  };

  const onLogout = async () => {
    document.cookie =
      "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    localStorage.removeItem("auth_token");
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminHeader
        user={user}
        viewMode={viewMode}
        setViewMode={setViewMode}
        filter={filter}
        setFilter={setFilter}
        counts={counts}
        printerConnected={printerConnected}
        soundEnabled={soundEnabled}
        storeOpen={storeConfig?.status?.isOpen ?? true}
        storeOverrideMode={storeConfig?.store_status_override ?? "auto"}
        togglingStore={togglingStore}
        onToggleStorePause={handleToggleStorePause}
        onToggleSound={handleToggleSound}
        onConnectPrinter={handleConnectPrinter}
        onDisconnectPrinter={handleDisconnectPrinter}
        onRefreshOrders={() => {
          void refetchOrders();
        }}
        onLogout={onLogout}
      />

      {printerMsg && (
        <div className="mx-auto max-w-7xl px-6 pt-3">
          <div
            className={`rounded-xl px-4 py-2 text-xs font-semibold ${
              printerMsg.isError
                ? "bg-destructive/15 text-destructive border border-destructive/30"
                : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
            }`}
          >
            {printerMsg.text}
          </div>
        </div>
      )}

      {error && (
        <div className="mx-auto max-w-7xl px-6 pt-3">
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
            {error}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-6 py-6">
        {viewMode === "pedidos" && (
          <OrdersTab
            orders={filtered}
            loading={loading}
            couriers={couriers}
            onStatus={handleStatus}
            onConfirmPayment={handleConfirmPayment}
            onPrint={handlePrintOrder}
          />
        )}

        <Suspense fallback={<AdminTabFallback />}>
          {viewMode === "caixa" && isSupervisorOrAdmin && (
            <CashTab isAdmin={isAdmin} printerSettings={printerSettings} />
          )}

          {viewMode === "entregadores" && isSupervisorOrAdmin && (
            <CouriersTab orders={orders} isAdmin={isAdmin} />
          )}

          {viewMode === "cardapio" && isSupervisorOrAdmin && <MenuTab isAdmin={isAdmin} />}

          {viewMode === "indicadores" && isSupervisorOrAdmin && (
            <FinancialTab orders={orders} isAdmin={isAdmin} />
          )}

          {viewMode === "usuarios" && isAdmin && <UsersTab currentUser={user} />}

          {viewMode === "taxas" && isSupervisorOrAdmin && <DeliveryTab user={user} />}

          {viewMode === "promocoes" && isAdmin && <PromotionsTab />}

          {viewMode === "whatsapp" && isSupervisorOrAdmin && <WhatsAppTab isAdmin={isAdmin} />}

          {viewMode === "configuracoes" && isAdmin && (
            <SettingsTab
              currentUser={user}
              printerConnected={printerConnected}
              printerSettings={printerSettings}
              onConnectPrinter={handleConnectPrinter}
              onDisconnectPrinter={handleDisconnectPrinter}
              onTestPrint={handleTestPrint}
              onUpdatePrinterSetting={handleUpdatePrinterSetting}
            />
          )}
        </Suspense>
      </main>
    </div>
  );
}
