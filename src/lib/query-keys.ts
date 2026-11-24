/**
 * Centralized React Query key factory ensuring consistent caching and invalidation
 * across both Storefront and Admin panels.
 */
export const queryKeys = {
  public: {
    catalog: () => ["public", "catalog"] as const,
    promotions: () => ["public", "promotions"] as const,
    storeConfig: () => ["public", "store-config"] as const,
    deliveryConfig: () => ["public", "delivery-config"] as const,
    activeOrderStatus: (orderId: string | null) =>
      ["public", "active-order-status", orderId] as const,
  },
  admin: {
    orders: () => ["admin", "orders"] as const,
    couriers: () => ["admin", "couriers"] as const,
    courierSettlementsAll: () => ["admin", "courier-settlements"] as const,
    courierSettlements: (period: string) => ["admin", "courier-settlements", period] as const,
    cashDashboard: () => ["admin", "cash-dashboard"] as const,
    financialReportAll: () => ["admin", "financial-report"] as const,
    financialReport: (period: string) => ["admin", "financial-report", period] as const,
    storeConfig: () => ["admin", "store-config"] as const,
    whatsappStatus: () => ["admin", "whatsapp-status"] as const,
    menuCatalog: () => ["admin", "menu-catalog"] as const,
    settings: () => ["admin", "settings"] as const,
    users: () => ["admin", "users"] as const,
    delivery: () => ["admin", "delivery"] as const,
    promotions: () => ["admin", "promotions"] as const,
  },
};
