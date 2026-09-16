import { useState } from "react";
import { Check, Clock, Copy, ExternalLink, ShoppingBag, X } from "lucide-react";
import { formatBRL } from "@/data/catalog";

export function OrderStatusView({
  order,
  onDismiss,
}: {
  order: any;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyPix = () => {
    if (!order?.payment_details?.qr_code) return;
    navigator.clipboard.writeText(order.payment_details.qr_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      {order.payment_method === "Pix" && order.payment_details?.type === "pix" ? (
        order.payment_status === "paid" ? (
          <div className="w-full space-y-4">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 scale-110 transition-transform duration-500">
              <Check className="h-8 w-8" />
            </div>
            <h3 className="font-serif text-2xl text-emerald-400">Pagamento Confirmado!</h3>
            <p className="text-sm text-muted-foreground">
              Seu Pix foi aprovado com sucesso. Nosso forno já está preparando sua pizza quentinha! 🍕
            </p>
          </div>
        ) : (
          <div className="w-full space-y-4">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full border border-gold/30 bg-secondary/60 text-gold">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-serif text-xl text-foreground">Pagamento Pix Pendente</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Pague pelo QR Code abaixo ou utilize a chave Copia e Cola para agilizar o preparo.
              </p>
            </div>

            {order.payment_details.qr_code_base64 && (
              <div className="flex justify-center p-3 bg-white rounded-2xl w-48 h-48 mx-auto shadow-md">
                <img
                  src={`data:image/png;base64,${order.payment_details.qr_code_base64}`}
                  alt="QR Code Pix"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleCopyPix}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold/40 bg-secondary/80 py-2.5 text-xs font-bold text-gold transition hover:bg-gold/20"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Código Pix Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copiar Código Pix Copia e Cola
                </>
              )}
            </button>

            <div className="rounded-xl bg-secondary/40 p-3 border border-border/50 text-left">
              <p className="text-xs text-muted-foreground text-center">
                Assim que o pagamento for detectado, o pedido entrará automaticamente em preparação.
              </p>
            </div>
          </div>
        )
      ) : order.payment_method === "Cartão de crédito" && order.payment_details?.type === "mercadopago_preference" ? (
        order.payment_status === "paid" ? (
          <div className="w-full space-y-4">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 scale-110 transition-transform duration-500">
              <Check className="h-8 w-8" />
            </div>
            <h3 className="font-serif text-2xl text-emerald-400">Pagamento Aprovado!</h3>
            <p className="text-sm text-muted-foreground">
              Seu pagamento via Cartão foi confirmado com sucesso. O pedido já está com o pizzaiolo! 🍕
            </p>
          </div>
        ) : (
          <div className="w-full space-y-4">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full border border-gold/30 bg-secondary/60 text-gold">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-serif text-xl text-foreground">Pagamento com Cartão</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Clique no botão abaixo para concluir o pagamento com segurança no Mercado Pago.
              </p>
            </div>

            <a
              href={order.payment_details.init_point}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-bold text-gold-foreground transition hover:brightness-110 shadow-lg"
            >
              Realizar Pagamento <ExternalLink className="h-4 w-4" />
            </a>

            <div className="rounded-xl bg-secondary/40 p-3 border border-border/50 text-left">
              <p className="text-xs text-muted-foreground text-center">
                O seu pedido começará a ser preparado assim que recebermos a confirmação do pagamento.
              </p>
            </div>
          </div>
        )
      ) : order.payment_status === "paid" ? (
        <div className="w-full space-y-4">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 scale-110 transition-transform duration-500">
            <Check className="h-8 w-8" />
          </div>
          <h3 className="font-serif text-2xl text-emerald-400">Pagamento Confirmado!</h3>
          <p className="text-sm text-muted-foreground">
            Seu pagamento foi recebido com sucesso. Nosso pizzaiolo já está preparando o seu pedido! 🍕
          </p>
        </div>
      ) : order.payment_status === "failed" ? (
        <div className="w-full space-y-4">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive">
            <X className="h-8 w-8" />
          </div>
          <h3 className="font-serif text-xl text-destructive">Falha no Pagamento</h3>
          <p className="text-sm text-muted-foreground">
            Infelizmente o seu pagamento não pôde ser processado. Por favor, tente refazer o pedido com outro método.
          </p>
        </div>
      ) : (
        <div className="w-full space-y-4">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full border border-gold/30 bg-secondary/60 text-gold">
            <ShoppingBag className="h-7 w-7" />
          </div>
          <h3 className="font-serif text-xl text-foreground">Pedido recebido!</h3>
          <p className="text-sm text-muted-foreground">
            Seu pedido foi enviado para a pizzaria. Em instantes entraremos em contato para confirmar a entrega.
          </p>
        </div>
      )}

      <div className="mt-6 w-full space-y-3 pt-4 border-t border-border/50 text-xs text-muted-foreground">
        <p>
          Nº do pedido: <span className="font-mono text-foreground font-semibold">{order.id?.slice(0, 8)}</span>
        </p>
        <p>
          Total: <span className="text-gold font-semibold font-serif text-sm">
            {formatBRL(order.total || 0)}
          </span>
        </p>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="mt-6 w-full rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-gold-foreground transition hover:brightness-110 active:scale-95"
      >
        Fechar
      </button>
    </div>
  );
}
