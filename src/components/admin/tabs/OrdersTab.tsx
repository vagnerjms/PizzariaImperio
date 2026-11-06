import { Clock, Phone, MapPin, Printer, CheckCircle2, XCircle, QrCode, Timer } from "lucide-react";
import { formatBRL } from "@/data/catalog";

export type OrderRow = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  delivery_mode?: "delivery" | "pickup" | "dine_in";
  payment_method: string;
  troco?: number | null;
  subtotal: number;
  discount: number;
  promotion_id?: string | null;
  promotion_title?: string | null;
  total: number;
  delivery_fee?: number | null;
  status: "novo" | "preparando" | "saiu" | "entregue" | "cancelado";
  created_at: string;
  updated_at: string;
  payment_status: "pending" | "paid" | "failed" | "refunded" | "on_delivery";
  payment_gateway?: string | null;
  gateway_payment_id?: string | null;
  payment_details?: any;
  order_items: Array<{
    id: string;
    pizza_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  notes?: string | null;
};

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
    label: "Aguardando Pix",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  paid: {
    label: "Pago",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  failed: {
    label: "Falhou",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  refunded: {
    label: "Reembolsado",
    className: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  },
  on_delivery: {
    label: "Na Entrega",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
};

function getElapsedBadge(createdAtIso: string) {
  const diffMs = Math.max(0, Date.now() - new Date(createdAtIso).getTime());
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) {
    return { text: "Agora mesmo", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" };
  }
  if (mins < 20) {
    return { text: `há ${mins} min`, className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" };
  }
  if (mins < 40) {
    return { text: `há ${mins} min`, className: "border-amber-500/30 bg-amber-500/10 text-amber-400" };
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  const label = hours > 0 ? `há ${hours}h ${remMins}m` : `há ${mins} min`;
  return { text: label, className: "border-red-500/40 bg-red-500/15 text-red-400 animate-pulse" };
}

export function OrdersTab({
  orders,
  loading,
  onStatus,
  onConfirmPayment,
  onPrint,
}: {
  orders: OrderRow[];
  loading: boolean;
  onStatus: (id: string, status: OrderRow["status"]) => void;
  onConfirmPayment?: (id: string) => void;
  onPrint?: (order: OrderRow) => void;
}) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando pedidos…</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-16 text-center">
        <p className="font-serif text-lg">Nenhum pedido por aqui.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Quando um cliente fizer um pedido, ele aparece aqui automaticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {orders.map((o) => (
        <OrderCard
          key={o.id}
          order={o}
          onStatus={onStatus}
          onConfirmPayment={onConfirmPayment}
          onPrint={onPrint}
        />
      ))}
    </div>
  );
}

function OrderCard({
  order,
  onStatus,
  onConfirmPayment,
  onPrint,
}: {
  order: OrderRow;
  onStatus: (id: string, status: OrderRow["status"]) => void;
  onConfirmPayment?: (id: string) => void;
  onPrint?: (order: OrderRow) => void;
}) {
  const meta = STATUS_META[order.status];
  const created = new Date(order.created_at);
  const timeStr = created.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dateStr = created.toLocaleDateString("pt-BR");
  const phoneDigits = order.customer_phone.replace(/\D/g, "");
  const isActive = order.status !== "entregue" && order.status !== "cancelado";
  const elapsed = isActive ? getElapsedBadge(order.created_at) : null;
  const isPendingPix =
    order.payment_method === "Pix" &&
    order.payment_status === "pending" &&
    order.status !== "cancelado";

  return (
    <article
      className={`flex flex-col rounded-2xl border bg-card p-5 shadow-sm transition ${
        isPendingPix ? "border-amber-500/50" : "border-border"
      }`}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg leading-tight font-bold">
              {order.customer_name}
            </span>
            <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              #{order.id.slice(0, 6)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {dateStr} · {timeStr}
            </span>
            {elapsed && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${elapsed.className}`}
              >
                <Timer className="h-3 w-3" /> {elapsed.text}
              </span>
            )}
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
          <MapPin className="mt-0.5 h-3.5 w-3.5 flex-none text-gold" />
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
              const pMeta = PAYMENT_STATUS_META[status] || PAYMENT_STATUS_META.on_delivery;
              return (
                <span
                  className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none ${pMeta.className}`}
                >
                  {pMeta.label}
                </span>
              );
            })()}
          </div>
        </div>
        {order.notes && (
          <div className="rounded-lg border border-gold/30 bg-gold/5 px-2.5 py-1.5 text-foreground">
            <span className="font-bold text-gold">Obs.:</span> {order.notes}
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

      {(meta.next || order.status !== "cancelado" || onPrint || isPendingPix) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {isPendingPix && onConfirmPayment && (
            <button
              type="button"
              onClick={() => onConfirmPayment(order.id)}
              title="Aprovar manualmente o pagamento Pix deste pedido"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-600 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-emerald-500 active:scale-95"
            >
              <QrCode className="h-3.5 w-3.5" /> Confirmar Recebimento Pix
            </button>
          )}

          {onPrint && (
            <button
              type="button"
              onClick={() => onPrint(order)}
              title="Imprimir comanda térmica (Bematech MP-4200)"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-2 text-xs font-semibold text-gold transition hover:bg-gold hover:text-gold-foreground active:scale-95"
            >
              <Printer className="h-3.5 w-3.5" /> Imprimir
            </button>
          )}
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
