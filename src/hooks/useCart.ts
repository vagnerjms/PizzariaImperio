import { useState, useEffect, useMemo, useCallback } from "react";
import { CartItem, MENU_BY_ID } from "@/data/catalog";
import {
  Promotion,
  AppliedPromotionResult,
  normalizeCouponCode,
} from "@/lib/promotions.types";
import {
  evaluateCartPromotions,
  MenuItemRef,
  validateCouponForCart,
} from "@/lib/promotions-engine";
import { trackAddToCart } from "@/lib/analytics";

export interface CouponFeedbackState {
  status: "idle" | "applied" | "error";
  code: string;
  message: string;
}

export function useCart(
  promotions: Promotion[],
  menuById: Record<string, MenuItemRef> = MENU_BY_ID
) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("imperio_cart_v2");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.filter(
              (i) => i && typeof i === "object" && i.pizzaId && typeof i.totalPrice === "number"
            );
          }
        }
      } catch {}
    }
    return [];
  });

  const [cartOpen, setCartOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [couponCode, setCouponCode] = useState<string>("");
  const [couponError, setCouponError] = useState<string | null>(null);

  // Persiste carrinho no localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("imperio_cart_v2", JSON.stringify(cart));
      } catch {}
    }
  }, [cart]);

  const cartCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.quantity || 1), 0);
  }, [cart]);

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.totalPrice || 0), 0);
  }, [cart]);

  const genericCartLines = useMemo(() => {
    return cart.map((i) => {
      const cat1 = menuById[i.pizzaId]?.category || i.category;
      const cat2 = i.isHalf && i.flavor2?.id ? menuById[i.flavor2.id]?.category : undefined;
      const categories = cat2 ? Array.from(new Set([cat1, cat2])) : [cat1];
      const flavorIds =
        i.isHalf && i.flavor2?.id ? [i.pizzaId, i.flavor2.id] : [i.pizzaId];
      return {
        item: {
          id: i.pizzaId,
          name: i.name,
          price: i.unitPrice,
          category: cat1,
          categories,
          flavorIds,
        },
        qty: i.quantity,
        subtotal: i.totalPrice,
      };
    });
  }, [cart, menuById]);

  const couponValidation = useMemo(() => {
    if (!couponCode) return null;
    return validateCouponForCart(couponCode, genericCartLines, menuById, promotions);
  }, [couponCode, genericCartLines, menuById, promotions]);

  const appliedPromotion = useMemo<AppliedPromotionResult | null>(() => {
    return evaluateCartPromotions(
      genericCartLines,
      menuById,
      promotions,
      new Date(),
      couponCode || null
    );
  }, [genericCartLines, menuById, promotions, couponCode]);

  const couponFeedback = useMemo<CouponFeedbackState>(() => {
    if (couponCode) {
      if (couponValidation?.valid) {
        return {
          status: "applied",
          code: couponCode,
          message: couponValidation.message,
        };
      }
      return {
        status: "error",
        code: couponCode,
        message: couponValidation?.message || "Cupom não aplicável ao carrinho atual.",
      };
    }
    if (couponError) {
      return { status: "error", code: "", message: couponError };
    }
    return { status: "idle", code: "", message: "" };
  }, [couponCode, couponValidation, couponError]);

  const handleApplyCoupon = useCallback(
    (rawCode: string): boolean => {
      const normalized = normalizeCouponCode(rawCode);
      if (!normalized) {
        setCouponCode("");
        setCouponError("Digite um código de cupom.");
        return false;
      }
      const check = validateCouponForCart(normalized, genericCartLines, menuById, promotions);
      if (!check.valid) {
        setCouponCode("");
        setCouponError(check.message);
        return false;
      }
      setCouponError(null);
      setCouponCode(normalized);
      return true;
    },
    [genericCartLines, menuById, promotions]
  );

  const handleClearCoupon = useCallback(() => {
    setCouponCode("");
    setCouponError(null);
  }, []);

  const discount = appliedPromotion?.discountAmount || 0;
  const rewardCost = appliedPromotion?.rewardItem?.unit_price || 0;
  const total = Math.max(0, subtotal + rewardCost - discount);

  const handleAddCustomizedToCart = useCallback((item: CartItem) => {
    if (!item) return;
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (i) =>
          i.pizzaId === item.pizzaId &&
          i.isHalf === item.isHalf &&
          i.flavor1?.id === item.flavor1?.id &&
          (i.flavor1?.notes || "") === (item.flavor1?.notes || "") &&
          i.flavor2?.id === item.flavor2?.id &&
          (i.flavor2?.notes || "") === (item.flavor2?.notes || "") &&
          (i.crust?.id || "nenhuma") === (item.crust?.id || "nenhuma")
      );

      if (existingIdx >= 0) {
        const copy = [...prev];
        const updated = { ...copy[existingIdx] };
        updated.quantity = (updated.quantity || 1) + (item.quantity || 1);
        updated.totalPrice = updated.unitPrice * updated.quantity;
        copy[existingIdx] = updated;
        return copy;
      }
      return [...prev, item];
    });

    trackAddToCart({
      id: item.pizzaId,
      name: item.name,
      price: item.unitPrice,
      quantity: item.quantity || 1,
    });

    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 600);
  }, []);

  const handleIncCartItem = useCallback((itemId: string) => {
    setCart((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, quantity: i.quantity + 1, totalPrice: i.unitPrice * (i.quantity + 1) }
          : i
      )
    );
  }, []);

  const handleDecCartItem = useCallback((itemId: string) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.id === itemId) {
            const nextQty = i.quantity - 1;
            return nextQty > 0
              ? { ...i, quantity: nextQty, totalPrice: i.unitPrice * nextQty }
              : null;
          }
          return i;
        })
        .filter((i): i is CartItem => i !== null)
    );
  }, []);

  const handleRemoveCartItem = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  const handleClearCart = useCallback(() => {
    setCart([]);
    setCouponCode("");
    setCouponError(null);
  }, []);

  const handleOpenCart = useCallback(() => setCartOpen(true), []);
  const handleCloseCart = useCallback(() => setCartOpen(false), []);

  const activeValidCouponCode =
    couponCode && couponValidation?.valid ? couponCode : null;

  return {
    cart,
    cartCount,
    subtotal,
    discount,
    total,
    appliedPromotion,
    couponCode: activeValidCouponCode,
    couponFeedback,
    handleApplyCoupon,
    handleClearCoupon,
    cartOpen,
    justAdded,
    handleAddCustomizedToCart,
    handleIncCartItem,
    handleDecCartItem,
    handleRemoveCartItem,
    handleClearCart,
    handleOpenCart,
    handleCloseCart,
  };
}
