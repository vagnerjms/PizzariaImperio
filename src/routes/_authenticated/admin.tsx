import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listOrders, updateOrderStatus } from "@/lib/orders.functions";
import { 
  LogOut, 
  RefreshCw, 
  Phone, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Flame,
  MessageSquare,
  Loader2,
  CheckCircle,
  QrCode,
  AlertTriangle,
  Terminal,
  TrendingUp,
  Coins,
  BarChart3,
  ShieldAlert,
  Bike,
  Plus,
  Trash2,
  Search,
  Users,
  KeyRound,
  ShieldCheck,
  UserPlus,
  Edit3,
  Copy,
  Tag,
  Percent,
  Gift,
  Sparkles,
  Eye,
  Calendar,
} from "lucide-react";
import { getWhatsAppStatus, getWhatsAppQRCode, disconnectWhatsApp } from "@/lib/whatsapp.functions";
import { getAdminSettings, updateAdminSettings } from "@/lib/settings";
import { getAdminDeliverySettings, updateAdminDeliverySettings, resetToBragancaNeighborhoods } from "@/lib/delivery.functions";
import { listUsers, createUser, updateUserRole, updateUserPassword, deleteUser } from "@/lib/users.functions";
import {
  getAdminPromotions,
  createPromotionFn,
  updatePromotionFn,
  togglePromotionFn,
  deletePromotionFn,
} from "@/lib/promotions.functions";
import { Promotion } from "@/lib/promotions.types";
import { MENU_ITEMS, PROMO_CATEGORIES } from "@/lib/menu-list";

type OrderRow = Awaited<ReturnType<typeof listOrders>>[number];

const STATUS_META: Record<
  OrderRow["status"],
  { label: string; className: string; next?: OrderRow["status"]; nextLabel?: string }
> = {
  novo: {
    label: "Novo",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    next: "preparando",
    nextLabel: "Iniciar preparo",
  },
  preparando: {
    label: "Preparando",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    next: "saiu",
    nextLabel: "Saiu para entrega",
  },
  saiu: {
    label: "Saiu para entrega",
    className: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    next: "entregue",
    nextLabel: "Marcar entregue",
  },
  entregue: {
    label: "Entregue",
    className: "bg-green-500/15 text-green-400 border-green-500/30",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
};

const PAYMENT_STATUS_META: Record<
  OrderRow["payment_status"],
  { label: string; className: string }
> = {
  pending: {
    label: "Pendente",
    className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  paid: {
    label: "Pago",
    className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  failed: {
    label: "Falhou",
    className: "bg-red-500/10 text-red-500 border-red-500/20",
  },
  refunded: {
    label: "Reembolsado",
    className: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  },
  on_delivery: {
    label: "Na Entrega",
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
};

const formatBRL = (v: number | string) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
  const fetchOrders = useServerFn(listOrders);
  const updateStatus = useServerFn(updateOrderStatus);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ativos" | "todos" | OrderRow["status"]>("ativos");
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"pedidos" | "whatsapp" | "indicadores" | "taxas" | "promocoes" | "usuarios" | "configuracoes">("pedidos");
  const [whatsappStatus, setWhatsappStatus] = useState<"open" | "close" | "checking" | "error">("checking");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);

  const fetchPromotionsFn = useServerFn(getAdminPromotions);
  const createPromoFn = useServerFn(createPromotionFn);
  const updatePromoFn = useServerFn(updatePromotionFn);
  const togglePromoFn = useServerFn(togglePromotionFn);
  const deletePromoFn = useServerFn(deletePromotionFn);

  const [promotionsList, setPromotionsList] = useState<Promotion[]>([]);
  const [promotionsLoading, setPromotionsLoading] = useState(false);
  const [promotionsActionLoading, setPromotionsActionLoading] = useState(false);
  const [promotionsSuccessMsg, setPromotionsSuccessMsg] = useState<string | null>(null);
  const [promotionsErrorMsg, setPromotionsErrorMsg] = useState<string | null>(null);

  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);

  const [promoTitle, setPromoTitle] = useState("");
  const [promoDescription, setPromoDescription] = useState("");
  const [promoBadgeText, setPromoBadgeText] = useState("OFERTA RELÂMPAGO");
  const [promoType, setPromoType] = useState<"PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "BUY_X_GET_Y">("PERCENTAGE_DISCOUNT");
  const [promoDiscountValue, setPromoDiscountValue] = useState<number>(10);
  const [promoTriggerType, setPromoTriggerType] = useState<"all" | "category" | "specific_items" | "min_total">("all");
  const [promoTriggerCategory, setPromoTriggerCategory] = useState("todas");
  const [promoTriggerItemIds, setPromoTriggerItemIds] = useState<string[]>([]);
  const [promoTriggerMinQty, setPromoTriggerMinQty] = useState<number>(1);
  const [promoTriggerMinTotal, setPromoTriggerMinTotal] = useState<number>(0);
  const [promoRewardItemId, setPromoRewardItemId] = useState("coca-2l");
  const [promoRewardDiscountPercent, setPromoRewardDiscountPercent] = useState<number>(100);
  const [promoActive, setPromoActive] = useState(true);
  const [promoStartDate, setPromoStartDate] = useState("");
  const [promoEndDate, setPromoEndDate] = useState("");

  const fetchUsersFn = useServerFn(listUsers);
  const createUserFn = useServerFn(createUser);
  const updateUserRoleFn = useServerFn(updateUserRole);
  const updateUserPasswordFn = useServerFn(updateUserPassword);
  const deleteUserFn = useServerFn(deleteUser);

  const [usersList, setUsersList] = useState<Array<{ id: string; email: string; roles: string[]; created_at: string | Date }>>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersActionLoading, setUsersActionLoading] = useState(false);
  const [usersSuccessMsg, setUsersSuccessMsg] = useState<string | null>(null);
  const [usersErrorMsg, setUsersErrorMsg] = useState<string | null>(null);

  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "supervisor" | "atendente">("atendente");

  const [passwordModalUser, setPasswordModalUser] = useState<{ id: string; email: string } | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState("");

  const loadUsers = async () => {
    if (!user?.roles?.includes("admin")) return;
    setUsersLoading(true);
    setUsersErrorMsg(null);
    try {
      const data = await fetchUsersFn();
      setUsersList(data);
    } catch (e) {
      setUsersErrorMsg(e instanceof Error ? e.message : "Erro ao carregar usuários.");
    } finally {
      setUsersLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsersActionLoading(true);
    setUsersErrorMsg(null);
    setUsersSuccessMsg(null);
    try {
      await createUserFn({
        data: {
          email: newUserEmail.trim(),
          password: newUserPassword.trim(),
          role: newUserRole,
        },
      });
      setUsersSuccessMsg(`Usuário ${newUserEmail} cadastrado com sucesso!`);
      setShowCreateUserModal(false);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("atendente");
      loadUsers();
      setTimeout(() => setUsersSuccessMsg(null), 4000);
    } catch (err) {
      setUsersErrorMsg(err instanceof Error ? err.message : "Erro ao cadastrar usuário.");
    } finally {
      setUsersActionLoading(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: "admin" | "supervisor" | "atendente") => {
    setUsersActionLoading(true);
    setUsersErrorMsg(null);
    setUsersSuccessMsg(null);
    try {
      await updateUserRoleFn({
        data: { userId, role: newRole },
      });
      setUsersSuccessMsg("Permissão atualizada com sucesso!");
      loadUsers();
      setTimeout(() => setUsersSuccessMsg(null), 4000);
    } catch (err) {
      setUsersErrorMsg(err instanceof Error ? err.message : "Erro ao alterar permissão.");
    } finally {
      setUsersActionLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;
    setUsersActionLoading(true);
    setUsersErrorMsg(null);
    setUsersSuccessMsg(null);
    try {
      await updateUserPasswordFn({
        data: {
          userId: passwordModalUser.id,
          newPassword: newPasswordValue.trim(),
        },
      });
      setUsersSuccessMsg(`Senha do usuário ${passwordModalUser.email} alterada com sucesso!`);
      setPasswordModalUser(null);
      setNewPasswordValue("");
      setTimeout(() => setUsersSuccessMsg(null), 4000);
    } catch (err) {
      setUsersErrorMsg(err instanceof Error ? err.message : "Erro ao alterar senha.");
    } finally {
      setUsersActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${email}?`)) return;
    setUsersActionLoading(true);
    setUsersErrorMsg(null);
    setUsersSuccessMsg(null);
    try {
      await deleteUserFn({
        data: { userId },
      });
      setUsersSuccessMsg(`Usuário ${email} excluído com sucesso!`);
      loadUsers();
      setTimeout(() => setUsersSuccessMsg(null), 4000);
    } catch (err) {
      setUsersErrorMsg(err instanceof Error ? err.message : "Erro ao excluir usuário.");
    } finally {
      setUsersActionLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "usuarios") {
      loadUsers();
    }
  }, [viewMode]);

  const loadPromotions = async () => {
    setPromotionsLoading(true);
    setPromotionsErrorMsg(null);
    try {
      const data = await fetchPromotionsFn();
      setPromotionsList(data);
    } catch (err: any) {
      setPromotionsErrorMsg(err?.message || "Erro ao carregar promoções.");
    } finally {
      setPromotionsLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "promocoes") {
      loadPromotions();
    }
  }, [viewMode]);

  const handleOpenCreatePromo = () => {
    setEditingPromoId(null);
    setPromoTitle("");
    setPromoDescription("");
    setPromoBadgeText("OFERTA RELÂMPAGO");
    setPromoType("PERCENTAGE_DISCOUNT");
    setPromoDiscountValue(10);
    setPromoTriggerType("all");
    setPromoTriggerCategory("todas");
    setPromoTriggerItemIds([]);
    setPromoTriggerMinQty(1);
    setPromoTriggerMinTotal(0);
    setPromoRewardItemId("coca-2l");
    setPromoRewardDiscountPercent(100);
    setPromoActive(true);
    setPromoStartDate("");
    setPromoEndDate("");
    setPromotionsErrorMsg(null);
    setShowPromoModal(true);
  };

  const handleOpenEditPromo = (p: Promotion) => {
    setEditingPromoId(p._id);
    setPromoTitle(p.title);
    setPromoDescription(p.description);
    setPromoBadgeText(p.badge_text || "OFERTA RELÂMPAGO");
    setPromoType(p.type);
    setPromoDiscountValue(p.discount_value || 10);
    setPromoTriggerType(p.trigger_type || "all");
    setPromoTriggerCategory(p.trigger_category || "todas");
    setPromoTriggerItemIds(p.trigger_item_ids || []);
    setPromoTriggerMinQty(p.trigger_min_qty || 1);
    setPromoTriggerMinTotal(p.trigger_min_total || 0);
    setPromoRewardItemId(p.reward_item_id || "coca-2l");
    setPromoRewardDiscountPercent(p.reward_discount_percent !== undefined ? p.reward_discount_percent : 100);
    setPromoActive(p.active);
    setPromoStartDate(p.start_date || "");
    setPromoEndDate(p.end_date || "");
    setPromotionsErrorMsg(null);
    setShowPromoModal(true);
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoTitle.trim() || !promoDescription.trim()) {
      setPromotionsErrorMsg("Preencha o título e a descrição da promoção.");
      return;
    }

    setPromotionsActionLoading(true);
    setPromotionsErrorMsg(null);
    setPromotionsSuccessMsg(null);

    const rewardItem = MENU_ITEMS.find((i) => i.id === promoRewardItemId);

    const payload = {
      title: promoTitle.trim(),
      description: promoDescription.trim(),
      badge_text: promoBadgeText.trim() || "OFERTA RELÂMPAGO",
      type: promoType,
      discount_value: Number(promoDiscountValue) || 0,
      trigger_type: promoTriggerType,
      trigger_category: promoTriggerCategory,
      trigger_item_ids: promoTriggerItemIds,
      trigger_min_qty: Number(promoTriggerMinQty) || 1,
      trigger_min_total: Number(promoTriggerMinTotal) || 0,
      reward_item_id: promoType === "BUY_X_GET_Y" ? promoRewardItemId : null,
      reward_item_name: promoType === "BUY_X_GET_Y" ? rewardItem?.name : null,
      reward_discount_percent: promoType === "BUY_X_GET_Y" ? Number(promoRewardDiscountPercent) : null,
      active: promoActive,
      start_date: promoStartDate || null,
      end_date: promoEndDate || null,
    };

    try {
      if (editingPromoId) {
        await updatePromoFn({ data: { id: editingPromoId, data: payload } });
        setPromotionsSuccessMsg("Promoção atualizada com sucesso!");
      } else {
        await createPromoFn({ data: payload });
        setPromotionsSuccessMsg("Nova promoção criada com sucesso!");
      }
      setShowPromoModal(false);
      await loadPromotions();
      setTimeout(() => setPromotionsSuccessMsg(null), 4000);
    } catch (err: any) {
      setPromotionsErrorMsg(err?.message || "Erro ao salvar promoção.");
    } finally {
      setPromotionsActionLoading(false);
    }
  };

  const handleTogglePromo = async (id: string, currentActive: boolean) => {
    try {
      await togglePromoFn({ data: { id, active: !currentActive } });
      setPromotionsList((prev) =>
        prev.map((p) => (p._id === id ? { ...p, active: !currentActive } : p))
      );
    } catch (err: any) {
      alert("Erro ao alternar status da promoção: " + err.message);
    }
  };

  const handleDeletePromo = async (id: string, title: string) => {
    if (!confirm(`Tem certeza que deseja excluir a promoção "${title}"?`)) return;
    try {
      await deletePromoFn({ data: { id } });
      setPromotionsList((prev) => prev.filter((p) => p._id !== id));
    } catch (err: any) {
      alert("Erro ao excluir promoção: " + err.message);
    }
  };

  const fetchSettings = useServerFn(getAdminSettings);
  const saveSettings = useServerFn(updateAdminSettings);

  const [settingsForm, setSettingsForm] = useState({
    evolution_api_url: "",
    evolution_api_key: "",
    n8n_webhook_url: "",
    mercado_pago_access_token: "",
    mercado_pago_public_key: "",
    whatsapp_instance_name: "",
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);
  const [settingsErrorMsg, setSettingsErrorMsg] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

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

  useEffect(() => {
    if (viewMode === "taxas") {
      loadDeliverySettings();
    }
  }, [viewMode]);

  const loadSettings = async () => {
    if (!user?.roles?.includes("admin")) return;
    setSettingsLoading(true);
    setSettingsErrorMsg(null);
    try {
      const data = await fetchSettings();
      setSettingsForm({
        evolution_api_url: data.evolution_api_url || "",
        evolution_api_key: data.evolution_api_key || "",
        n8n_webhook_url: data.n8n_webhook_url || "",
        mercado_pago_access_token: data.mercado_pago_access_token || "",
        mercado_pago_public_key: data.mercado_pago_public_key || "",
        whatsapp_instance_name: data.whatsapp_instance_name || "",
      });
    } catch (e) {
      setSettingsErrorMsg(e instanceof Error ? e.message : "Erro ao carregar configurações.");
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsSuccessMsg(null);
    setSettingsErrorMsg(null);
    try {
      await saveSettings({ data: settingsForm });
      setSettingsSuccessMsg("Configurações salvas com sucesso!");
      setTimeout(() => setSettingsSuccessMsg(null), 4000);
    } catch (err) {
      setSettingsErrorMsg(err instanceof Error ? err.message : "Erro ao salvar configurações.");
    } finally {
      setSettingsSaving(false);
    }
  };

  useEffect(() => {
    if (viewMode === "configuracoes") {
      loadSettings();
    }
  }, [viewMode]);

  const fetchWhatsappStatus = useServerFn(getWhatsAppStatus);
  const fetchWhatsappQRCode = useServerFn(getWhatsAppQRCode);
  const logoutWhatsapp = useServerFn(disconnectWhatsApp);

  const checkWhatsApp = async (showLoading = false) => {
    if (showLoading) setWhatsappStatus("checking");
    try {
      const res = await fetchWhatsappStatus();
      if (res.status === "open") {
        setWhatsappStatus("open");
        setQrCode(null);
      } else {
        setWhatsappStatus("close");
      }
    } catch (e) {
      setWhatsappStatus("error");
      setWhatsappError(e instanceof Error ? e.message : "Falha ao obter status do WhatsApp.");
    }
  };

  useEffect(() => {
    checkWhatsApp();
  }, []);

  useEffect(() => {
    if (viewMode !== "whatsapp" || whatsappStatus === "open") return;
    
    const interval = setInterval(() => {
      checkWhatsApp();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [viewMode, whatsappStatus]);

  const handleGenerateQR = async () => {
    setWhatsappLoading(true);
    setWhatsappError(null);
    try {
      const res = await fetchWhatsappQRCode();
      if (res.base64) {
        setQrCode(res.base64);
      } else {
        throw new Error("Evolution API não retornou o QR Code.");
      }
    } catch (e) {
      setWhatsappError(e instanceof Error ? e.message : "Erro ao gerar QR Code.");
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Tem certeza que deseja desconectar o WhatsApp?")) return;
    setWhatsappLoading(true);
    setWhatsappError(null);
    try {
      await logoutWhatsapp();
      setWhatsappStatus("close");
      setQrCode(null);
    } catch (e) {
      setWhatsappError(e instanceof Error ? e.message : "Erro ao desconectar.");
    } finally {
      setWhatsappLoading(false);
    }
  };

  const load = async () => {
    try {
      const data = await fetchOrders();
      setOrders(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar pedidos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      load();
    }, 10000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const filtered = useMemo(() => {
    const visible = orders.filter((o) => {
      const isOnline = o.payment_method === "Pix";
      if (isOnline) {
        return o.payment_status === "paid";
      }
      return true;
    });

    if (filter === "todos") return orders;
    if (filter === "ativos") {
      return visible.filter((o) => o.status !== "entregue" && o.status !== "cancelado");
    }
    return visible.filter((o) => o.status === filter);
  }, [orders, filter]);

  const counts = useMemo(() => {
    const visible = orders.filter((o) => {
      const isOnline = o.payment_method === "Pix";
      if (isOnline) {
        return o.payment_status === "paid";
      }
      return true;
    });

    const c: Record<string, number> = { ativos: 0, todos: orders.length };
    for (const o of visible) {
      c[o.status] = (c[o.status] ?? 0) + 1;
      if (o.status !== "entregue" && o.status !== "cancelado") c.ativos++;
    }
    return c;
  }, [orders]);

  const handleStatus = async (id: string, status: OrderRow["status"]) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      await updateStatus({ data: { id, status } });
    } catch {
      load();
    }
  };

  const onLogout = async () => {
    document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    localStorage.removeItem("auth_token");
    navigate({ to: "/auth" });
  };

  const tabs: Array<{ id: typeof filter; label: string }> = [
    { id: "ativos", label: `Ativos (${counts.ativos ?? 0})` },
    { id: "novo", label: `Novos (${counts.novo ?? 0})` },
    { id: "preparando", label: `Preparando (${counts.preparando ?? 0})` },
    { id: "saiu", label: `Saiu (${counts.saiu ?? 0})` },
    { id: "entregue", label: `Entregues (${counts.entregue ?? 0})` },
    { id: "cancelado", label: `Cancelados (${counts.cancelado ?? 0})` },
    { id: "todos", label: `Todos (${counts.todos})` },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
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
            
            {user?.roles?.some(r => ["admin", "supervisor"].includes(r)) && (
              <nav className="flex items-center gap-1 bg-secondary/40 p-1 rounded-full border border-border">
                <button
                  type="button"
                  onClick={() => setViewMode("pedidos")}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold transition ${
                    viewMode === "pedidos"
                      ? "bg-gold text-gold-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Pedidos
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("whatsapp")}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold transition ${
                    viewMode === "whatsapp"
                      ? "bg-gold text-gold-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("indicadores")}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold transition ${
                    viewMode === "indicadores"
                      ? "bg-gold text-gold-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Indicadores
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("taxas")}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold transition ${
                    viewMode === "taxas"
                      ? "bg-gold text-gold-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Taxas de Entrega
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("promocoes")}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold transition ${
                    viewMode === "promocoes"
                      ? "bg-gold text-gold-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Promoções
                </button>
                {user?.roles?.includes("admin") && (
                  <>
                    <button
                      type="button"
                      onClick={() => setViewMode("usuarios")}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition ${
                        viewMode === "usuarios"
                          ? "bg-gold text-gold-foreground shadow"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Usuários
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("configuracoes")}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition ${
                        viewMode === "configuracoes"
                          ? "bg-gold text-gold-foreground shadow"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Configurações
                    </button>
                  </>
                )}
              </nav>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {viewMode === "pedidos" && (
              <button
                type="button"
                onClick={load}
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
                    ? "border-gold bg-gold/15 text-gold"
                    : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {viewMode === "pedidos" && (
          loading ? (
            <p className="text-sm text-muted-foreground">Carregando pedidos…</p>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center">
              <p className="font-serif text-lg">Nenhum pedido por aqui.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Quando um cliente fizer um pedido, ele aparece aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((o) => (
                <OrderCard key={o.id} order={o} onStatus={handleStatus} />
              ))}
            </div>
          )
        )}

        {viewMode === "whatsapp" && (
          <div className="mx-auto max-w-lg">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <header className="flex items-center gap-4 border-b border-border/60 pb-4 mb-6">
                <div className="rounded-xl bg-gold/10 p-2.5 text-gold">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-serif text-lg leading-tight">Configurações do WhatsApp</h2>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    Instância: <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-foreground font-semibold">Disparo</span>
                  </p>
                </div>
              </header>

              {whatsappError && (
                <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                  {whatsappError}
                </div>
              )}

              {whatsappStatus === "checking" && (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-gold mb-3" />
                  <p className="text-sm">Verificando status de conexão...</p>
                </div>
              )}

              {whatsappStatus === "open" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-green-500">
                    <CheckCircle className="h-5 w-5 flex-none" />
                    <div>
                      <h3 className="text-sm font-semibold">WhatsApp Conectado!</h3>
                      <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-0.5">
                        O sistema está ativo e pronto para enviar mensagens automáticas.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-xl bg-secondary/30 p-4 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Nome da Instância</span>
                      <span className="font-semibold text-foreground">Disparo</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status do Servidor</span>
                      <span className="font-semibold text-green-500">Ativo / Conectado</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={whatsappLoading}
                    onClick={handleDisconnect}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-destructive/30 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                  >
                    {whatsappLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Desconectar WhatsApp"
                    )}
                  </button>
                </div>
              )}

              {whatsappStatus === "close" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-amber-500">
                    <AlertTriangle className="h-5 w-5 flex-none" />
                    <div>
                      <h3 className="text-sm font-semibold">WhatsApp Desconectado</h3>
                      <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                        Os envios automáticos de mensagens de pedidos estão suspensos.
                      </p>
                    </div>
                  </div>

                  {!qrCode ? (
                    <div className="space-y-4 text-center">
                      <p className="text-xs text-muted-foreground leading-relaxed px-4">
                        Para ativar os disparos, clique no botão abaixo para gerar o QR Code e escaneie com seu celular no WhatsApp.
                      </p>
                      <button
                        type="button"
                        disabled={whatsappLoading}
                        onClick={handleGenerateQR}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gold-foreground transition hover:brightness-110 disabled:opacity-50"
                      >
                        {whatsappLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <QrCode className="h-3.5 w-3.5" />
                            Gerar QR Code
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-5 text-center">
                      <div className="mx-auto rounded-2xl border border-border bg-white p-4 shadow-sm inline-block">
                        <img src={qrCode} alt="Escanear QR Code" className="mx-auto" style={{ maxWidth: '240px' }} />
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-foreground">Aguardando leitura do celular...</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed px-6">
                          Abra o WhatsApp no seu celular, acesse <strong>Aparelhos conectados</strong>, clique em <strong>Conectar um aparelho</strong> e aponte a câmera.
                        </p>
                      </div>

                      <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground animate-pulse">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />
                        Verificando conexão automaticamente...
                      </div>

                      <button
                        type="button"
                        disabled={whatsappLoading}
                        onClick={handleGenerateQR}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                      >
                        {whatsappLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="h-3 w-3" />
                            Gerar Novo QR Code
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {whatsappStatus === "error" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-destructive">
                    <XCircle className="h-5 w-5 flex-none" />
                    <div>
                      <h3 className="text-sm font-semibold">Falha na Comunicação</h3>
                      <p className="text-xs text-destructive/80 mt-0.5">
                        Não foi possível conectar-se ao servidor da Evolution API.
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed px-2 text-center">
                    Verifique se o container da <strong>Evolution API</strong> está rodando corretamente na VPS e se as credenciais no arquivo <code className="bg-secondary px-1 py-0.5 rounded font-semibold">.env</code> estão corretas.
                  </p>

                  <button
                    type="button"
                    onClick={() => checkWhatsApp(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition hover:text-foreground"
                  >
                    Tentar Novamente
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === "indicadores" && (() => {
          const revenue = orders.filter(o => o.status !== "cancelado").reduce((sum, o) => sum + o.total, 0);
          const activeCount = orders.filter(o => o.status !== "entregue" && o.status !== "cancelado").length;
          const completedCount = orders.filter(o => o.status === "entregue").length;
          const canceledCount = orders.filter(o => o.status === "cancelado").length;
          const ticketMedio = (completedCount + activeCount) > 0 ? revenue / (completedCount + activeCount) : 0;

          const pizzaSales: Record<string, number> = {};
          orders.forEach(o => {
            if (o.status !== "cancelado") {
              o.order_items?.forEach(i => {
                pizzaSales[i.pizza_name] = (pizzaSales[i.pizza_name] || 0) + i.quantity;
              });
            }
          });
          const sortedSales = Object.entries(pizzaSales).sort((a, b) => b[1] - a[1]);

          const paymentCounts: Record<string, number> = {};
          orders.forEach(o => {
            if (o.status !== "cancelado") {
              paymentCounts[o.payment_method] = (paymentCounts[o.payment_method] || 0) + 1;
            }
          });

          return (
            <div className="space-y-8">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Faturamento (Vendas Ativas)</span>
                    <Coins className="h-5 w-5 text-gold" />
                  </div>
                  <div className="mt-2 font-serif text-2xl text-gold font-bold">{formatBRL(revenue)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Excluindo cancelados</div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ticket Médio</span>
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="mt-2 font-serif text-2xl text-foreground font-bold">{formatBRL(ticketMedio)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Média por pedido</div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pedidos Concluídos</span>
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="mt-2 font-serif text-2xl text-foreground font-bold">{completedCount}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{activeCount} em andamento</div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pedidos Cancelados</span>
                    <XCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="mt-2 font-serif text-2xl text-foreground font-bold">{canceledCount}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Taxa: {orders.length > 0 ? ((canceledCount / orders.length) * 100).toFixed(0) : 0}%</div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h3 className="font-serif text-base font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-gold" /> Ranking de Vendas (Pizzas)
                  </h3>
                  {sortedSales.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma pizza vendida ainda.</p>
                  ) : (
                    <div className="space-y-3.5">
                      {sortedSales.slice(0, 5).map(([name, qty], idx) => (
                        <div key={name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">
                              {idx + 1}
                            </span>
                            <span>{name}</span>
                          </div>
                          <span className="font-semibold text-gold">{qty} un.</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h3 className="font-serif text-base font-semibold mb-4 flex items-center gap-2">
                    <Coins className="h-5 w-5 text-gold" /> Formas de Pagamento
                  </h3>
                  {Object.keys(paymentCounts).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(paymentCounts).map(([method, count]) => {
                        const activeTotal = orders.filter(o => o.status !== "cancelado").length;
                        const pct = activeTotal > 0 ? (count / activeTotal) * 100 : 0;
                        return (
                          <div key={method} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>{method}</span>
                              <span className="font-semibold text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-secondary">
                              <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {viewMode === "taxas" && (
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
                    Carregar Bairros de Bragança Paulista
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
                        placeholder="Nome do Bairro (ex: Vila Mariana)"
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

                    <div className="divide-y divide-border/60 rounded-xl border border-border bg-card overflow-hidden">
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
        {viewMode === "promocoes" && (
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-gold/10 p-2.5 text-gold">
                    <Tag className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-serif text-lg leading-tight">Gestão de Promoções e Campanhas</h2>
                    <p className="text-xs text-muted-foreground">Crie descontos em porcentagem, valores fixos e combos Compre & Ganhe com inserção automática no carrinho</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreatePromo}
                  className="rounded-full bg-gold px-4 py-2 text-xs font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Nova Promoção
                </button>
              </header>

              {promotionsErrorMsg && (
                <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive flex items-center justify-between">
                  <span>{promotionsErrorMsg}</span>
                  <button type="button" onClick={() => setPromotionsErrorMsg(null)} className="text-destructive font-bold">×</button>
                </div>
              )}

              {promotionsSuccessMsg && (
                <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-xs text-green-500 font-semibold flex items-center justify-between">
                  <span>{promotionsSuccessMsg}</span>
                  <button type="button" onClick={() => setPromotionsSuccessMsg(null)} className="text-green-500 font-bold">×</button>
                </div>
              )}

              {promotionsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-gold mb-3" />
                  <p className="text-sm">Carregando promoções...</p>
                </div>
              ) : promotionsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center px-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 text-gold mb-4">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <h3 className="font-serif text-lg font-bold">Nenhuma promoção cadastrada</h3>
                  <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                    Crie campanhas de desconto ou combos com brindes para atrair mais clientes e aumentar o ticket médio.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenCreatePromo}
                    className="mt-6 rounded-full bg-gold px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110"
                  >
                    + Criar Primeira Promoção
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {promotionsList.map((promo) => (
                    <article
                      key={promo._id}
                      className={`flex flex-col justify-between rounded-2xl border bg-secondary/10 p-5 transition ${
                        promo.active ? "border-gold/40 shadow-sm" : "border-border opacity-70"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
                            <Sparkles className="h-3 w-3 fill-gold" />
                            {promo.badge_text || "OFERTA"}
                          </span>
                          
                          <button
                            type="button"
                            onClick={() => handleTogglePromo(promo._id, promo.active)}
                            className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
                              promo.active
                                ? "bg-green-500/15 text-green-400 border border-green-500/30"
                                : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${promo.active ? "bg-green-400 animate-pulse" : "bg-muted-foreground"}`} />
                            {promo.active ? "Ativa" : "Inativa"}
                          </button>
                        </div>

                        <h3 className="mt-3 font-serif text-lg font-bold leading-tight text-foreground">{promo.title}</h3>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{promo.description}</p>

                        <div className="mt-4 space-y-2 rounded-xl bg-background/60 p-3 border border-border/40 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Mecânica:</span>
                            <span className="font-semibold text-foreground">
                              {promo.type === "PERCENTAGE_DISCOUNT" && `${promo.discount_value}% de Desconto`}
                              {promo.type === "FIXED_DISCOUNT" && `R$ ${promo.discount_value?.toFixed(2).replace('.', ',')} OFF`}
                              {promo.type === "BUY_X_GET_Y" && "Compre e Ganhe Brinde"}
                            </span>
                          </div>

                          {promo.type === "BUY_X_GET_Y" && (
                            <div className="flex justify-between items-center text-gold font-semibold">
                              <span>Recompensa:</span>
                              <span>
                                {promo.reward_discount_percent === 100 ? "1x Brinde Grátis" : `${promo.reward_discount_percent}% OFF em 1x`} ({promo.reward_item_name || "Brinde"})
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Gatilho:</span>
                            <span className="text-foreground">
                              {promo.trigger_type === "all" && "Qualquer produto"}
                              {promo.trigger_type === "category" && `Categoria: ${promo.trigger_category}`}
                              {promo.trigger_type === "specific_items" && `${promo.trigger_item_ids?.length || 0} produto(s) específico(s)`}
                              {promo.trigger_type === "min_total" && `Pedido acima de R$ ${promo.trigger_min_total?.toFixed(2)}`}
                              {promo.trigger_min_qty && promo.trigger_min_qty > 1 ? ` (Mín: ${promo.trigger_min_qty}x)` : ""}
                            </span>
                          </div>

                          {(promo.start_date || promo.end_date) && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                              <Calendar className="h-3 w-3 text-gold" />
                              <span>
                                {promo.start_date ? `De ${new Date(promo.start_date).toLocaleDateString("pt-BR")}` : ""}
                                {promo.end_date ? ` até ${new Date(promo.end_date).toLocaleDateString("pt-BR")}` : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPromo(promo)}
                          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-gold hover:text-gold"
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePromo(promo._id, promo.title)}
                          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de Criação / Edição de Promoção */}
        {showPromoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-2xl my-8">
              <header className="flex items-center justify-between border-b border-border/60 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gold/10 p-2 text-gold">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg leading-tight">
                      {editingPromoId ? "Editar Promoção" : "Nova Promoção ou Combo"}
                    </h3>
                    <p className="text-xs text-muted-foreground">Configure as regras de ativação e visualize em tempo real</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPromoModal(false)}
                  className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </header>

              <form onSubmit={handleSavePromo} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Coluna 1: Informações e Mecânica */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5 border-b border-border/40 pb-1">
                      1. Informações Visuais
                    </h4>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Título da Promoção *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Combo Fim de Semana"
                        value={promoTitle}
                        onChange={(e) => setPromoTitle(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Descrição / Chamada *
                      </label>
                      <textarea
                        required
                        rows={2}
                        placeholder="Ex: Compre 2 pizzas salgadas e ganhe 1 Coca-Cola 2L grátis!"
                        value={promoDescription}
                        onChange={(e) => setPromoDescription(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Tag / Badge de Destaque
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: OFERTA RELÂMPAGO, 10% OFF, COMBO"
                        value={promoBadgeText}
                        onChange={(e) => setPromoBadgeText(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                      />
                    </div>

                    <h4 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5 border-b border-border/40 pb-1 pt-2">
                      2. Mecânica & Desconto
                    </h4>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Tipo de Promoção *
                      </label>
                      <select
                        value={promoType}
                        onChange={(e) => setPromoType(e.target.value as any)}
                        className="mt-1.5 w-full rounded-xl border border-border bg-secondary/30 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                      >
                        <option value="PERCENTAGE_DISCOUNT">Desconto Percentual (%) no Total</option>
                        <option value="FIXED_DISCOUNT">Desconto em Valor Fixo (R$) no Total</option>
                        <option value="BUY_X_GET_Y">Compre X e Ganhe / Leve Y (Brinde)</option>
                      </select>
                    </div>

                    {promoType === "PERCENTAGE_DISCOUNT" && (
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Porcentagem de Desconto (%) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          required
                          value={promoDiscountValue}
                          onChange={(e) => setPromoDiscountValue(Number(e.target.value))}
                          className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                        />
                      </div>
                    )}

                    {promoType === "FIXED_DISCOUNT" && (
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Valor do Desconto (R$) *
                        </label>
                        <input
                          type="number"
                          step="0.50"
                          min="1"
                          required
                          value={promoDiscountValue}
                          onChange={(e) => setPromoDiscountValue(Number(e.target.value))}
                          className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                        />
                      </div>
                    )}

                    {promoType === "BUY_X_GET_Y" && (
                      <div className="space-y-3 rounded-xl border border-gold/30 bg-gold/5 p-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Produto de Brinde / Recompensa *
                          </label>
                          <select
                            value={promoRewardItemId}
                            onChange={(e) => setPromoRewardItemId(e.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                          >
                            {MENU_ITEMS.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.category}) - R$ {item.price.toFixed(2)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Desconto no Brinde (%)
                          </label>
                          <select
                            value={promoRewardDiscountPercent}
                            onChange={(e) => setPromoRewardDiscountPercent(Number(e.target.value))}
                            className="mt-1.5 w-full rounded-xl border border-border bg-secondary/50 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                          >
                            <option value={100}>100% Grátis (Brinde Total)</option>
                            <option value={50}>50% de Desconto (Metade do Preço)</option>
                            <option value={30}>30% de Desconto</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Coluna 2: Gatilhos & Pré-visualização */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5 border-b border-border/40 pb-1">
                      3. Regras de Ativação (Gatilho)
                    </h4>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Aplicar Quando o Cliente Comprar:
                      </label>
                      <select
                        value={promoTriggerType}
                        onChange={(e) => setPromoTriggerType(e.target.value as any)}
                        className="mt-1.5 w-full rounded-xl border border-border bg-secondary/30 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                      >
                        <option value="all">Qualquer Produto do Cardápio</option>
                        <option value="category">Por Categoria (ex: Pizzas Salgadas)</option>
                        <option value="specific_items">Itens Específicos do Cardápio</option>
                        <option value="min_total">Apenas Valor Mínimo do Pedido</option>
                      </select>
                    </div>

                    {promoTriggerType === "category" && (
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Categoria Requerida:
                        </label>
                        <select
                          value={promoTriggerCategory}
                          onChange={(e) => setPromoTriggerCategory(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-border bg-secondary/30 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                        >
                          {PROMO_CATEGORIES.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {promoTriggerType === "specific_items" && (
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          Selecione os Produtos Participantes:
                        </label>
                        <div className="max-h-36 overflow-y-auto rounded-xl border border-border bg-secondary/20 p-2 space-y-1 divide-y divide-border/30 text-xs">
                          {MENU_ITEMS.map((item) => {
                            const isSelected = promoTriggerItemIds.includes(item.id);
                            return (
                              <label key={item.id} className="flex items-center gap-2 py-1 px-1.5 cursor-pointer hover:bg-secondary/40 rounded">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setPromoTriggerItemIds(prev => [...prev, item.id]);
                                    } else {
                                      setPromoTriggerItemIds(prev => prev.filter(id => id !== item.id));
                                    }
                                  }}
                                  className="rounded border-border text-gold focus:ring-gold"
                                />
                                <span>{item.name} <span className="text-muted-foreground">({item.category})</span></span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Qtd. Mínima de Itens
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={promoTriggerMinQty}
                          onChange={(e) => setPromoTriggerMinQty(Number(e.target.value))}
                          className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Valor Mín. Pedido (R$)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="5"
                          value={promoTriggerMinTotal}
                          onChange={(e) => setPromoTriggerMinTotal(Number(e.target.value))}
                          className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Início (Opcional)
                        </label>
                        <input
                          type="date"
                          value={promoStartDate}
                          onChange={(e) => setPromoStartDate(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Término (Opcional)
                        </label>
                        <input
                          type="date"
                          value={promoEndDate}
                          onChange={(e) => setPromoEndDate(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 pt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={promoActive}
                        onChange={(e) => setPromoActive(e.target.checked)}
                        className="rounded border-border text-gold focus:ring-gold"
                      />
                      <span className="text-xs font-semibold text-foreground">Promoção Ativa Imediatamente</span>
                    </label>

                    {/* Live Preview Card */}
                    <div className="pt-3">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Eye className="h-3 w-3 text-gold" /> Pré-visualização no Site:
                      </span>
                      <div className="rounded-2xl border border-gold/40 bg-card/90 p-4 shadow-gold-glow">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-gold uppercase">
                          <Sparkles className="h-3 w-3 fill-gold" /> {promoBadgeText || "OFERTA RELÂMPAGO"}
                        </div>
                        <h5 className="mt-1.5 font-serif text-base font-bold text-foreground">
                          {promoTitle || "Título da Promoção"}
                        </h5>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {promoDescription || "Descrição da promoção..."}
                        </p>
                        <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-xs font-semibold">
                          <span className="text-gold">
                            {promoType === "PERCENTAGE_DISCOUNT" && `${promoDiscountValue}% de Desconto`}
                            {promoType === "FIXED_DISCOUNT" && `R$ ${promoDiscountValue},00 OFF`}
                            {promoType === "BUY_X_GET_Y" && `Ganhe ${promoRewardDiscountPercent === 100 ? "Grátis" : `${promoRewardDiscountPercent}% OFF`} em 1x ${MENU_ITEMS.find(i => i.id === promoRewardItemId)?.name || "Brinde"}`}
                          </span>
                          <span className="rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-bold text-gold-foreground">
                            Aproveitar
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPromoModal(false)}
                    className="rounded-full border border-border px-5 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={promotionsActionLoading}
                    className="rounded-full bg-gold px-6 py-2 text-xs font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
                  >
                    {promotionsActionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {promotionsActionLoading ? "Salvando..." : editingPromoId ? "Salvar Alterações" : "Criar Promoção"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {viewMode === "usuarios" && (
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <header className="flex items-center justify-between border-b border-border/60 pb-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-gold/10 p-2.5 text-gold">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-serif text-lg leading-tight">Gestão de Usuários e Permissões</h2>
                    <p className="text-xs text-muted-foreground">Cadastre novos operadores, configure cargos e redefina senhas</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(true)}
                  className="rounded-full bg-gold px-4 py-2 text-xs font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" /> Novo Usuário
                </button>
              </header>

              {usersLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-gold mb-3" />
                  <p className="text-sm">Carregando usuários...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {usersErrorMsg && (
                    <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                      {usersErrorMsg}
                    </div>
                  )}
                  {usersSuccessMsg && (
                    <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-xs text-green-500 font-semibold">
                      {usersSuccessMsg}
                    </div>
                  )}

                  {/* Modal / Card para Cadastrar Novo Usuário */}
                  {showCreateUserModal && (
                    <form onSubmit={handleCreateUser} className="rounded-2xl border border-gold/40 bg-gold/5 p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
                          <UserPlus className="h-4 w-4" /> Cadastrar Novo Usuário
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowCreateUserModal(false)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Cancelar
                        </button>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">E-mail</label>
                          <input
                            type="email"
                            required
                            placeholder="usuario@pizzaria.com"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Senha Inicial</label>
                          <input
                            type="password"
                            required
                            placeholder="Mínimo 6 caracteres"
                            value={newUserPassword}
                            onChange={(e) => setNewUserPassword(e.target.value)}
                            className="mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nível / Cargo</label>
                          <select
                            value={newUserRole}
                            onChange={(e) => setNewUserRole(e.target.value as any)}
                            className="mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                          >
                            <option value="atendente">Atendente (Apenas Pedidos)</option>
                            <option value="supervisor">Supervisor (WhatsApp + Taxas + Indicadores)</option>
                            <option value="admin">Administrador (Acesso Total)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowCreateUserModal(false)}
                          className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                        >
                          Fechar
                        </button>
                        <button
                          type="submit"
                          disabled={usersActionLoading || !newUserEmail.trim() || newUserPassword.length < 6}
                          className="rounded-full bg-gold px-5 py-2 text-xs font-bold uppercase tracking-wider text-gold-foreground shadow transition hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {usersActionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          Salvar Usuário
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Modal de Alteração de Senha */}
                  {passwordModalUser && (
                    <form onSubmit={handleChangePassword} className="rounded-2xl border border-blue-500/40 bg-blue-500/5 p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                          <KeyRound className="h-4 w-4" /> Alterar Senha de {passwordModalUser.email}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPasswordModalUser(null)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Cancelar
                        </button>
                      </div>

                      <div className="max-w-md">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nova Senha</label>
                        <input
                          type="password"
                          required
                          placeholder="Digite a nova senha (mínimo 6 caracteres)"
                          value={newPasswordValue}
                          onChange={(e) => setNewPasswordValue(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setPasswordModalUser(null)}
                          className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={usersActionLoading || newPasswordValue.length < 6}
                          className="rounded-full bg-blue-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow transition hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {usersActionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          Confirmar Nova Senha
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Tabela de Usuários Cadastrados */}
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-border/80 bg-secondary/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3">E-mail</th>
                            <th className="px-4 py-3">Cargo / Nível</th>
                            <th className="px-4 py-3">Data de Cadastro</th>
                            <th className="px-4 py-3 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {usersList.map((u) => {
                            const isSuperAdmin = u.email === "admin@pizzaria.com" || u.email === user?.email;
                            const role = u.roles?.includes("admin") ? "admin" : u.roles?.includes("supervisor") ? "supervisor" : "atendente";
                            return (
                              <tr key={u.id} className="hover:bg-secondary/10 transition">
                                <td className="px-4 py-3 font-medium text-foreground">
                                  {u.email}
                                  {u.email === user?.email && (
                                    <span className="ml-2 text-[10px] bg-gold/15 text-gold px-2 py-0.5 rounded-full font-bold">
                                      Você
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <select
                                    value={role}
                                    onChange={(e) => handleUpdateUserRole(u.id, e.target.value as any)}
                                    disabled={usersActionLoading}
                                    className={`rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-wider focus:outline-none ${
                                      role === "admin"
                                        ? "border-gold/50 bg-gold/10 text-gold"
                                        : role === "supervisor"
                                        ? "border-blue-400/50 bg-blue-400/10 text-blue-400"
                                        : "border-border bg-secondary text-muted-foreground"
                                    }`}
                                  >
                                    <option value="atendente">Atendente</option>
                                    <option value="supervisor">Supervisor</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                </td>
                                <td className="px-4 py-3 text-xs text-muted-foreground">
                                  {new Date(u.created_at).toLocaleDateString("pt-BR")}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPasswordModalUser({ id: u.id, email: u.email });
                                        setNewPasswordValue("");
                                      }}
                                      title="Alterar Senha"
                                      className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                                    >
                                      <KeyRound className="h-4 w-4" />
                                    </button>
                                    {!isSuperAdmin && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteUser(u.id, u.email)}
                                        title="Excluir Usuário"
                                        className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === "configuracoes" && (
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <header className="flex items-center gap-4 border-b border-border/60 pb-4 mb-6">
                <div className="rounded-xl bg-gold/10 p-2.5 text-gold">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-serif text-lg leading-tight">Configurações do Sistema</h2>
                  <p className="text-xs text-muted-foreground">Painel de gerenciamento de APIs (Salvo no banco de dados MongoDB)</p>
                </div>
              </header>

              {settingsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-gold mb-3" />
                  <p className="text-sm">Carregando configurações...</p>
                </div>
              ) : (
                <form onSubmit={handleSaveSettings} className="space-y-6">
                  {settingsErrorMsg && (
                    <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                      {settingsErrorMsg}
                    </div>
                  )}
                  {settingsSuccessMsg && (
                    <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-xs text-green-500 font-semibold">
                      {settingsSuccessMsg}
                    </div>
                  )}

                  <div className="space-y-4">
                    <h3 className="font-serif text-sm font-bold text-gold flex items-center gap-2 border-b border-border/40 pb-2">
                      <MessageSquare className="h-4 w-4" /> Evolution API (WhatsApp)
                    </h3>
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evolution API URL</label>
                        <input
                          type="text"
                          required
                          value={settingsForm.evolution_api_url}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, evolution_api_url: e.target.value }))}
                          className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Instância do WhatsApp</label>
                        <input
                          type="text"
                          required
                          value={settingsForm.whatsapp_instance_name}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, whatsapp_instance_name: e.target.value }))}
                          className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evolution API Key</label>
                      <input
                        type="password"
                        required
                        value={settingsForm.evolution_api_key}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, evolution_api_key: e.target.value }))}
                        className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-serif text-sm font-bold text-gold flex items-center gap-2 border-b border-border/40 pb-2">
                      <Coins className="h-4 w-4" /> Mercado Pago (Gateway de Pagamento)
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Access Token Privado</label>
                      <input
                        type="password"
                        required
                        value={settingsForm.mercado_pago_access_token}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, mercado_pago_access_token: e.target.value }))}
                        className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Public Key (Chave Pública)</label>
                      <input
                        type="text"
                        required
                        value={settingsForm.mercado_pago_public_key}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, mercado_pago_public_key: e.target.value }))}
                        className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-serif text-sm font-bold text-gold flex items-center gap-2 border-b border-border/40 pb-2">
                      <Terminal className="h-4 w-4" /> Automação & Webhooks
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">n8n Webhook URL</label>
                      <input
                        type="text"
                        required
                        value={settingsForm.n8n_webhook_url}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, n8n_webhook_url: e.target.value }))}
                        className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-gold/50"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Mercado Pago Webhook Endpoint (URL para o Gateway)
                        </label>
                        {typeof window !== "undefined" && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/api/webhook`);
                              setCopiedWebhook(true);
                              setTimeout(() => setCopiedWebhook(false), 3000);
                            }}
                            className="text-xs text-gold hover:underline flex items-center gap-1 font-semibold"
                          >
                            {copiedWebhook ? (
                              <>
                                <CheckCircle className="h-3.5 w-3.5 text-green-500" /> Copiado!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" /> Copiar URL Completa
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={typeof window !== "undefined" ? `${window.location.origin}/api/webhook` : "/api/webhook"}
                        className="mt-1.5 w-full rounded-xl border border-border bg-secondary/30 px-3.5 py-2.5 text-sm text-foreground font-mono focus:outline-none select-all"
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Cole esta URL completa no seu painel de <strong>Webhooks / Notificações IPN</strong> do Mercado Pago Developers para receber avisos automáticos de Pix e Cartão.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border flex justify-end">
                    <button
                      type="submit"
                      disabled={settingsSaving}
                      className="rounded-full bg-gold px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
                    >
                      {settingsSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                      {settingsSaving ? "Salvando..." : "Salvar Configurações"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function OrderCard({
  order,
  onStatus,
}: {
  order: OrderRow;
  onStatus: (id: string, status: OrderRow["status"]) => void;
}) {
  const meta = STATUS_META[order.status];
  const created = new Date(order.created_at);
  const timeStr = created.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dateStr = created.toLocaleDateString("pt-BR");
  const phoneDigits = order.customer_phone.replace(/\D/g, "");

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="font-serif text-lg leading-tight">{order.customer_name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" /> {dateStr} · {timeStr}
          </div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}>
          {meta.label}
        </span>
      </header>

      <div className="mt-3 space-y-1.5 text-sm">
        <a
          href={`tel:${phoneDigits}`}
          className="flex items-center gap-2 text-muted-foreground transition hover:text-gold"
        >
          <Phone className="h-3.5 w-3.5" /> {order.customer_phone}
        </a>
        <div className="flex items-start gap-2 text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 flex-none" />
          <span className="whitespace-pre-wrap">{order.customer_address}</span>
        </div>
      </div>

      <ul className="mt-4 space-y-1 border-t border-border/60 pt-3 text-sm">
        {order.order_items?.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-2">
            <span>
              <span className="font-semibold text-gold">{i.quantity}×</span> {i.pizza_name}
            </span>
            <span className="text-xs text-muted-foreground">{formatBRL(i.subtotal)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 space-y-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        <div className="flex justify-between items-center">
          <span>Pagamento</span>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-foreground">
              {order.payment_method}
              {order.troco != null && ` (troco p/ ${formatBRL(order.troco)})`}
            </span>
            {(() => {
              const status = order.payment_status || "on_delivery";
              const meta = PAYMENT_STATUS_META[status] || PAYMENT_STATUS_META.on_delivery;
              return (
                <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none ${meta.className}`}>
                  {meta.label}
                </span>
              );
            })()}
          </div>
        </div>
        {order.notes && (
          <div>
            <span className="font-semibold text-foreground">Obs.:</span> {order.notes}
          </div>
        )}
        {order.delivery_fee !== undefined && order.delivery_fee !== null && (
          <div className="flex justify-between text-muted-foreground pb-0.5">
            <span>Taxa de entrega</span>
            <span>{order.delivery_fee === 0 ? "Grátis" : formatBRL(order.delivery_fee)}</span>
          </div>
        )}
        {order.discount && order.discount > 0 ? (
          <div className="flex justify-between text-green-400 font-semibold pb-0.5">
            <span>Desconto ({order.promotion_title || "Promoção"})</span>
            <span>-{formatBRL(order.discount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between pt-1 border-t border-border/40 text-sm">
          <span>Total</span>
          <span className="font-serif text-lg text-gold">{formatBRL(order.total)}</span>
        </div>
      </div>

      {(meta.next || order.status !== "cancelado") && (
        <div className="mt-4 flex flex-wrap gap-2">
          {meta.next && meta.nextLabel && (
            <button
              type="button"
              onClick={() => onStatus(order.id, meta.next!)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gold px-3 py-2 text-xs font-bold uppercase tracking-wider text-gold-foreground transition hover:brightness-110"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> {meta.nextLabel}
            </button>
          )}
          {order.status !== "entregue" && order.status !== "cancelado" && (
            <button
              type="button"
              onClick={() => onStatus(order.id, "cancelado")}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-destructive hover:text-destructive"
            >
              <XCircle className="h-3.5 w-3.5" /> Cancelar
            </button>
          )}
        </div>
      )}
    </article>
  );
}
