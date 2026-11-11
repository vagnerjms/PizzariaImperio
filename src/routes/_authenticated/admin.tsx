import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listOrders, updateOrderStatus, confirmOrderPayment } from "@/lib/orders.functions";
import {
  connectSerialPrinter,
  disconnectSerialPrinter,
  isPrinterConnected,
  getStoredPrinterSettings,
  savePrinterSettings,
  printOrderThermal,
  printTestReceipt,
  PrinterSettings,
} from "@/lib/thermal-printer";
import { AdminHeader, AdminViewMode } from "@/components/admin/AdminHeader";
import { OrdersTab, OrderRow } from "@/components/admin/tabs/OrdersTab";
import { MenuTab } from "@/components/admin/tabs/MenuTab";
import { WhatsAppTab } from "@/components/admin/tabs/WhatsAppTab";
import { FinancialTab } from "@/components/admin/tabs/FinancialTab";
import { DeliveryTab } from "@/components/admin/tabs/DeliveryTab";
import { PromotionsTab } from "@/components/admin/tabs/PromotionsTab";
import { UsersTab } from "@/components/admin/tabs/UsersTab";
import { SettingsTab } from "@/components/admin/tabs/SettingsTab";
import { playNewOrderChime } from "@/lib/sound";

export const Route = createFileRoute("/_authenticated/admin")({
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchOrders = useServerFn(listOrders);
  const updateStatus = useServerFn(updateOrderStatus);
  const confirmPaymentFn = useServerFn(confirmOrderPayment);

  const [filter, setFilter] = useState<
    "ativos" | "todos" | "pix_pendente" | OrderRow["status"]
  >("ativos");

  const [viewMode, setViewMode] = useState<AdminViewMode>("pedidos");

  // Alerta sonoro KDS
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("imperio_kds_sound") !== "false";
    }
    return true;
  });
  const knownOrderIdsRef = useRef<Set<string> | null>(null);

  // Consulta reativa dos pedidos com TanStack Query (cache e polling inteligente)
  const {
    data: orders = [],
    isLoading: loading,
    error: queryError,
  } = useQuery<OrderRow[]>({
    queryKey: ["admin", "orders"],
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

  // Configuração da Impressora Térmica Serial / USB
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(getStoredPrinterSettings);
  const [printerMsg, setPrinterMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  useEffect(() => {
    setPrinterConnected(isPrinterConnected());
  }, []);

  const handleConnectPrinter = async () => {
    const res = await connectSerialPrinter(printerSettings.baudRate);
    setPrinterConnected(isPrinterConnected());
    setPrinterMsg({ text: res.message, isError: !res.success });
    setTimeout(() => setPrinterMsg(null), 5000);
  };

  const handleDisconnectPrinter = async () => {
    await disconnectSerialPrinter();
    setPrinterConnected(false);
    setPrinterMsg({ text: "Impressora desconectada." });
    setTimeout(() => setPrinterMsg(null), 4000);
  };

  const handleTestPrint = async () => {
    const res = await printTestReceipt(printerSettings);
    setPrinterMsg({ text: res.message });
    setTimeout(() => setPrinterMsg(null), 5000);
  };

  const handleUpdatePrinterSetting = <K extends keyof PrinterSettings>(
    key: K,
    value: PrinterSettings[K]
  ) => {
    const updated = savePrinterSettings({ [key]: value });
    setPrinterSettings(updated);
  };

  const handlePrintOrder = async (order: OrderRow) => {
    try {
      const res = await printOrderThermal(order as any, printerSettings);
      if (res.method === "serial") {
        setPrinterMsg({ text: `Comanda #${order.id.slice(0, 8)} impressa via USB!` });
        setTimeout(() => setPrinterMsg(null), 4000);
      }
    } catch (err) {
      console.error("Erro ao imprimir:", err);
    }
  };

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

  const handleStatus = async (id: string, status: OrderRow["status"]) => {
    const targetOrder = orders.find((o) => o.id === id);

    // Atualização otimista no cache do TanStack Query
    queryClient.setQueryData<OrderRow[]>(["admin", "orders"], (prev = []) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );

    // Auto-print thermal receipt when accepting order ("preparando")
    if (status === "preparando" && printerSettings.autoPrintOnAccept && targetOrder) {
      printOrderThermal(targetOrder as any, printerSettings).catch((err) => {
        console.error("Auto-print error:", err);
      });
    }

    try {
      await updateStatus({ data: { id, status } });
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    } catch {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    }
  };

  const handleConfirmPayment = async (id: string) => {
    queryClient.setQueryData<OrderRow[]>(["admin", "orders"], (prev = []) =>
      prev.map((o) => (o.id === id ? { ...o, payment_status: "paid" } : o))
    );
    try {
      await confirmPaymentFn({ data: { id } });
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      setPrinterMsg({ text: `Pagamento Pix do pedido #${id.slice(0, 6)} confirmado!` });
      setTimeout(() => setPrinterMsg(null), 4000);
    } catch {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
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
        onToggleSound={handleToggleSound}
        onConnectPrinter={handleConnectPrinter}
        onDisconnectPrinter={handleDisconnectPrinter}
        onRefreshOrders={load}
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
            onStatus={handleStatus}
            onConfirmPayment={handleConfirmPayment}
            onPrint={handlePrintOrder}
          />
        )}

        {viewMode === "cardapio" && <MenuTab />}

        {viewMode === "indicadores" && <FinancialTab orders={orders} />}

        {viewMode === "usuarios" && <UsersTab currentUser={user} />}

        {viewMode === "taxas" && <DeliveryTab user={user} />}

        {viewMode === "promocoes" && <PromotionsTab />}

        {viewMode === "whatsapp" && <WhatsAppTab />}

        {viewMode === "configuracoes" && (
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
      </main>
    </div>
  );
}
