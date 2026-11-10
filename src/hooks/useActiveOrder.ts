import { useState, useEffect, useRef, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createOrder, getOrderStatus } from "@/lib/orders.functions";
import { CartItem } from "@/data/catalog";
import { AppliedPromotionResult } from "@/lib/promotions.types";
import { DeliveryAddressForm } from "./useDeliveryAddress";

const ACTIVE_ORDER_STORAGE_KEY = "active_order";

function sanitize(str: string, max: number): string {
  return str.replace(/[\u0000-\u001F\u007F]/g, "").slice(0, max).trim();
}

export function useActiveOrder({ onOpenDrawer }: { onOpenDrawer?: () => void } = {}) {
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [loadingOrder, setLoadingOrder] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return !!(params.get("order_id") || params.get("order"));
    }
    return false;
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submitOrderRpc = useServerFn(createOrder);
  const checkStatusRpc = useServerFn(getOrderStatus);

  const hasMountedRef = useRef(false);

  // 1. Carrega pedido inicial (da URL ou do localStorage)
  useEffect(() => {
    if (hasMountedRef.current) return;
    hasMountedRef.current = true;

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlOrderId = params.get("order_id") || params.get("order");

      if (urlOrderId) {
        setLoadingOrder(true);
        checkStatusRpc({ data: urlOrderId })
          .then((order) => {
            if (order) {
              setActiveOrder(order);
              onOpenDrawer?.();
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          })
          .catch((err) => console.error("Erro ao carregar pedido do URL:", err))
          .finally(() => setLoadingOrder(false));
        return;
      }
    }

    try {
      const saved = localStorage.getItem(ACTIVE_ORDER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setActiveOrder(parsed);
        onOpenDrawer?.();
      }
    } catch {
      localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
    }
  }, [checkStatusRpc, onOpenDrawer]);

  // 2. Sincroniza pedido com o localStorage
  useEffect(() => {
    if (activeOrder) {
      localStorage.setItem(ACTIVE_ORDER_STORAGE_KEY, JSON.stringify(activeOrder));
    } else {
      localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
    }
  }, [activeOrder]);

  // 3. Polling em tempo real para sincronizar status com a cozinha / KDS
  useEffect(() => {
    if (!activeOrder?.id) return;
    if (
      activeOrder.payment_status === "failed" ||
      activeOrder.status === "entregue" ||
      activeOrder.status === "cancelado"
    ) {
      return;
    }

    const interval = setInterval(() => {
      checkStatusRpc({ data: activeOrder.id })
        .then((updated) => {
          if (updated) {
            setActiveOrder((prev: any) => ({ ...prev, ...updated }));
          }
        })
        .catch((err) => console.error("Erro ao verificar status do pedido:", err));
    }, 4000);

    return () => clearInterval(interval);
  }, [activeOrder?.id, activeOrder?.payment_status, activeOrder?.status, checkStatusRpc]);

  // 4. Limpar pedido ativo
  const dismissOrder = useCallback(() => {
    try {
      localStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
    } catch {}
    setActiveOrder(null);
    setSubmitError(null);
  }, []);

  // 5. Enviar novo pedido
  const placeOrder = useCallback(
    async (
      cart: CartItem[],
      appliedPromotion: AppliedPromotionResult | null,
      form: DeliveryAddressForm,
      onSuccessCallback?: () => void
    ) => {
      setSubmitting(true);
      setSubmitError(null);
      try {
        const fullAddress =
          form.deliveryMode === "pickup"
            ? "Retirada no Balcão (Buscar o pedido)"
            : form.deliveryMode === "dine_in"
            ? "Consumir no Local (Salão Pizzaria Império)"
            : `${form.rua.trim()}, ${form.numero.trim()} - ${form.bairro.trim()}, ${form.cidadeUf.trim()}${
                form.complemento.trim() ? " (" + form.complemento.trim() + ")" : ""
              }`;

        const orderItems = cart.map((i) => {
          let fullName = i.isHalf
            ? `1/2 ${i.flavor1.name} + 1/2 ${i.flavor2?.name}`
            : i.flavor1.name;

          if (i.crust && i.crust.id !== "nenhuma") {
            fullName += ` (${i.crust.name})`;
          }

          if (i.isHalf) {
            const notesArr: string[] = [];
            if (i.flavor1.notes) notesArr.push(`1/2 ${i.flavor1.name}: ${i.flavor1.notes}`);
            if (i.flavor2?.notes) notesArr.push(`1/2 ${i.flavor2.name}: ${i.flavor2.notes}`);
            if (notesArr.length > 0) {
              fullName += ` [${notesArr.join(" | ")}]`;
            }
          } else if (i.flavor1.notes) {
            fullName += ` [Obs: ${i.flavor1.notes}]`;
          }

          return {
            pizza_id: i.pizzaId,
            flavor2_id: i.isHalf ? i.flavor2?.id || null : null,
            crust_id: i.crust?.id || "nenhuma",
            pizza_name: fullName,
            quantity: i.quantity,
            unit_price: i.unitPrice,
          };
        });

        if (appliedPromotion?.rewardItem) {
          orderItems.push({
            pizza_id: appliedPromotion.rewardItem.pizza_id,
            flavor2_id: null,
            crust_id: "nenhuma",
            pizza_name: `${appliedPromotion.rewardItem.pizza_name} (${
              appliedPromotion.rewardItem.is_gift ? "Brinde" : "Promoção"
            })`,
            quantity: 1,
            unit_price: appliedPromotion.rewardItem.unit_price,
          });
        }

        const res = await submitOrderRpc({
          data: {
            customer_name: sanitize(form.name, 80),
            customer_phone: sanitize(form.phone, 20),
            customer_address: sanitize(fullAddress, 400),
            delivery_mode: (form.deliveryMode || "delivery") as "delivery" | "pickup" | "dine_in",
            neighborhood: form.deliveryMode === "delivery" ? sanitize(form.bairro, 80) : null,
            payment_method: form.payment as
              | "Pix"
              | "Dinheiro"
              | "Cartão de crédito"
              | "Cartão de débito",
            troco:
              form.payment === "Dinheiro" && form.troco
                ? Number(form.troco.replace(",", "."))
                : null,
            notes: form.notes ? sanitize(form.notes, 500) : null,
            items: orderItems,
            delivery_fee:
              form.deliveryMode === "pickup" || form.deliveryMode === "dine_in"
                ? 0
                : form.deliveryFee || 0,
            discount: appliedPromotion?.discountAmount || 0,
            promotion_id: appliedPromotion?.promotion?._id || null,
            promotion_title: appliedPromotion?.promotion?.title || null,
          },
        });

        if (res && (res as any).success && (res as any).order) {
          setActiveOrder((res as any).order);
          onSuccessCallback?.();
          return (res as any).order;
        } else {
          throw new Error((res as any)?.message || "Não foi possível concluir seu pedido.");
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Erro ao processar pedido. Tente novamente ou peça pelo WhatsApp.";
        setSubmitError(msg);
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [submitOrderRpc]
  );

  return {
    activeOrder,
    loadingOrder,
    submitting,
    submitError,
    placeOrder,
    dismissOrder,
  };
}
