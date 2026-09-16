import { useState, useEffect, useMemo, useCallback } from "react";
import { CartItem, MENU_BY_ID } from "@/data/catalog";
import { Promotion, AppliedPromotionResult } from "@/lib/promotions.types";
import { evaluateCartPromotions } from "@/lib/promotions-engine";

export function useCart(promotions: Promotion[]) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("imperio_cart_v2");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });

  const [cartOpen, setCartOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Persiste carrinho no localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("imperio_cart_v2", JSON.stringify(cart));
      } catch {}
    }
  }, [cart]);

  const cartCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.totalPrice, 0);
  }, [cart]);

  const genericCartLines = useMemo(() => {
    return cart.map((i) => ({
      item: {
        id: i.pizzaId,
        name: i.name,
        price: i.unitPrice,
        category: i.category,
      },
      qty: i.quantity,
      subtotal: i.totalPrice,
    }));
  }, [cart]);

  const appliedPromotion = useMemo<AppliedPromotionResult | null>(() => {
    return evaluateCartPromotions(genericCartLines, MENU_BY_ID as any, promotions);
  }, [genericCartLines, promotions]);

  const discount = appliedPromotion?.discountAmount || 0;
  const total = Math.max(0, subtotal - discount);

  const handleAddCustomizedToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (i) =>
          i.pizzaId === item.pizzaId &&
          i.isHalf === item.isHalf &&
          i.flavor1.id === item.flavor1.id &&
          (i.flavor1.notes || "") === (item.flavor1.notes || "") &&
          i.flavor2?.id === item.flavor2?.id &&
          (i.flavor2?.notes || "") === (item.flavor2?.notes || "") &&
          i.crust.id === item.crust.id
      );

      if (existingIdx >= 0) {
        const copy = [...prev];
        const updated = { ...copy[existingIdx] };
        updated.quantity += item.quantity;
        updated.totalPrice = updated.unitPrice * updated.quantity;
        copy[existingIdx] = updated;
        return copy;
      }
      return [...prev, item];
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

  const handleClearCart = useCallback(() => setCart([]), []);

  const handleOpenCart = useCallback(() => setCartOpen(true), []);
  const handleCloseCart = useCallback(() => setCartOpen(false), []);

  return {
    cart,
    cartCount,
    subtotal,
    discount,
    total,
    appliedPromotion,
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
