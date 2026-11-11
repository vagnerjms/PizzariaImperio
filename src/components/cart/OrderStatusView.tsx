import { useState } from "react";
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  ShoppingBag,
  X,
  Loader2,
  Sparkles,
  Bike,
  Flame,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import { formatBRL } from "@/data/catalog";

export function OrderStatusView({
  order,
  onDismiss,
  onBackToCart,
}: {
  order: any;
  onDismiss: () => void;
  onBackToCart?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyPix = () => {
    const pixCode = order?.payment_details?.qr_code;
    if (!pixCode) return;
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const deliveryMode: "delivery" | "pickup" | "dine_in" = order?.delivery_mode || "delivery";
  const isPickup = deliveryMode === "pickup";
  const isDineIn = deliveryMode === "dine_in";

  const isPix =
    order.payment_method === "Pix" ||
    order.payment_details?.type === "pix" ||
    !!order.payment_details?.qr_code;
  const isCardOnline =
    (order.payment_method === "Cartão de crédito" || order.payment_method === "Cartão") &&
    (order.payment_details?.type === "mercadopago_preference" || !!order.payment_details?.init_point);
  const isPaid = order.payment_status === "paid";
  const isFailed = order.payment_status === "failed" || order.status === "cancelado";
  const isPending = order.payment_status === "pending";
  const isOnDelivery =
    order.payment_status === "on_delivery" ||
    order.payment_method === "Dinheiro" ||
    order.payment_method === "Cartão de débito" ||
    order.payment_method === "Cartão de crédito";

  const step3Title = isPickup
    ? "Pronto para Retirada"
    : isDineIn
    ? "Pronto para Servir"
    : "Saiu para Entrega";

  const step3Desc =
    order.status === "entregue"
      ? isPickup
        ? "Pedido retirado no balcão!"
        : isDineIn
        ? "Servido na mesa!"
        : "Pedido entregue!"
      : order.status === "saiu"
      ? isPickup
        ? "Seu pedido está pronto no balcão!"
        : isDineIn
        ? "Sendo levado à sua mesa!"
        : "A caminho do seu endereço!"
      : isPickup
      ? "Avisaremos quando estiver pronto no balcão"
      : isDineIn
      ? "Avisaremos quando sair do forno"
      : "Aguardando motoboy";

  const Step3Icon = isPickup ? Store : isDineIn ? UtensilsCrossed : Bike;

  const renderProgressTimeline = (firstStepTitle: string, firstStepSub: string) => (
    <div className="rounded-2xl border border-border bg-secondary/20 p-4 space-y-3 text-left">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white flex-none">
          <Check className="h-4 w-4 stroke-[3]" />
        </div>
        <div className="text-xs">
          <p className="font-bold text-foreground">{firstStepTitle}</p>
          <p className="text-muted-foreground text-[11px]">{firstStepSub}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full flex-none ${
            order.status === "preparando" || order.status === "saiu" || order.status === "entregue"
              ? "bg-amber-500 text-white"
              : "bg-secondary text-muted-foreground border border-border"
          }`}
        >
          <Flame className="h-4 w-4" />
        </div>
        <div className="text-xs">
          <p className="font-bold text-foreground">No Forno a Lenha</p>
          <p className="text-muted-foreground text-[11px]">
            {order.status === "preparando"
              ? "Em preparação agora..."
              : order.status === "saiu" || order.status === "entregue"
              ? "Finalizado no forno"
              : "Aguardando entrada no forno"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full flex-none ${
            order.status === "saiu" || order.status === "entregue"
              ? "bg-purple-500 text-white"
              : "bg-secondary text-muted-foreground border border-border"
          }`}
        >
          <Step3Icon className="h-4 w-4" />
        </div>
        <div className="text-xs">
          <p className="font-bold text-foreground">{step3Title}</p>
          <p className="text-muted-foreground text-[11px]">{step3Desc}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      {/* CENÁRIO 1: PIX PENDENTE */}
      {isPix && isPending && !isFailed ? (
        <div className="w-full space-y-4">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-500 animate-pulse">
            <Clock className="h-7 w-7" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-500">
              Aguardando Pagamento
            </span>
            <h3 className="mt-2 font-serif text-2xl font-bold text-foreground">
              Pague com Pix para Iniciar
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Escaneie o QR Code abaixo no seu aplicativo do banco ou copie o código Pix para liberar seu pedido na cozinha.
            </p>
          </div>

          {order.payment_details?.qr_code_base64 ? (
            <div className="flex justify-center p-3 bg-white rounded-2xl w-48 h-48 mx-auto shadow-lg border border-border">
              <img
                src={`data:image/png;base64,${order.payment_details.qr_code_base64}`}
                alt="QR Code Pix"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-4 bg-secondary/30 rounded-2xl w-48 h-48 mx-auto border border-dashed border-border">
              <Loader2 className="h-8 w-8 text-gold animate-spin mb-2" />
              <span className="text-[11px] text-muted-foreground">Gerando QR Code Pix...</span>
            </div>
          )}

          {order.payment_details?.qr_code && (
            <button
              type="button"
              onClick={handleCopyPix}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold/50 bg-gold/15 py-3 text-xs font-bold uppercase tracking-wider text-gold transition hover:bg-gold hover:text-gold-foreground active:scale-95 shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Código Pix Copiado com Sucesso!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copiar Código Pix Copia e Cola
                </>
              )}
            </button>
          )}

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />
            <span>Aguardando confirmação do banco em tempo real...</span>
          </div>
        </div>
      ) : isCardOnline && isPending && !isFailed ? (
        /* CENÁRIO 2: CARTÃO ONLINE PENDENTE */
        <div className="w-full space-y-4">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-500">
            <Clock className="h-7 w-7" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-500">
              Pagamento Pendente
            </span>
            <h3 className="mt-2 font-serif text-2xl font-bold text-foreground">
              Conclua o Pagamento no Cartão
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Clique no botão abaixo para concluir o pagamento com segurança no Mercado Pago.
            </p>
          </div>

          {order.payment_details?.init_point && (
            <a
              href={order.payment_details.init_point}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 text-xs font-bold uppercase tracking-wider text-gold-foreground transition hover:brightness-110 shadow-gold-glow"
            >
              Pagar com Mercado Pago <ExternalLink className="h-4 w-4" />
            </a>
          )}

          <div className="rounded-xl bg-secondary/40 p-3 border border-border/50 text-xs text-muted-foreground">
            O pedido entrará automaticamente em preparação na cozinha assim que o pagamento for aprovado.
          </div>
        </div>
      ) : isPaid && !isFailed ? (
        /* CENÁRIO 3: PAGAMENTO CONFIRMADO */
        <div className="w-full space-y-4 animate-in zoom-in-95 duration-300">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-400 shadow-lg scale-110">
            <Check className="h-8 w-8 stroke-[2.5]" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              <Sparkles className="h-3 w-3 fill-emerald-400" /> Pagamento Aprovado
            </span>
            <h3 className="mt-2 font-serif text-2xl font-bold text-emerald-400">
              Pagamento Confirmado!
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Seu pedido foi liberado e o pizzaiolo já está preparando a sua pizza no forno a lenha! 🍕🔥
            </p>
          </div>

          {renderProgressTimeline("Pagamento Aprovado", "Transação processada com sucesso")}
        </div>
      ) : isFailed ? (
        /* CENÁRIO 4: FALHA OU CANCELADO */
        <div className="w-full space-y-4">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive">
            <X className="h-8 w-8" />
          </div>
          <h3 className="font-serif text-xl font-bold text-destructive">
            {order.status === "cancelado" ? "Pedido Cancelado" : "Falha no Pagamento"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {order.status === "cancelado"
              ? "Este pedido foi cancelado. Caso precise de ajuda, fale conosco pelo WhatsApp."
              : "Infelizmente o seu pagamento online não pôde ser processado. Por favor, tente refazer o pedido escolhendo outra forma de pagamento."}
          </p>
        </div>
      ) : (
        /* CENÁRIO 5: PAGAMENTO NA ENTREGA / RETIRADA / LOCAL */
        <div className="w-full space-y-4">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full border border-gold/30 bg-secondary/60 text-gold shadow-gold-glow">
            <ShoppingBag className="h-7 w-7" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 border border-gold/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
              {isPickup
                ? "Pagamento na Retirada"
                : isDineIn
                ? "Pagamento no Local"
                : "Pagamento na Entrega"}
            </span>
            <h3 className="mt-2 font-serif text-xl font-bold text-foreground">
              Pedido Recebido!
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Seu pedido foi enviado para a cozinha. O pagamento de{" "}
              <strong className="text-gold">{formatBRL(order.total || 0)}</strong> será realizado{" "}
              {isPickup
                ? "na retirada no balcão"
                : isDineIn
                ? "no local"
                : "diretamente na entrega"}{" "}
              ({order.payment_method}).
            </p>
          </div>

          {renderProgressTimeline("Pedido Recebido", "Enviado para a cozinha")}
        </div>
      )}

      {/* Resumo do Pedido */}
      <div className="mt-6 w-full space-y-2 pt-4 border-t border-border/50 text-xs text-muted-foreground">
        <div className="flex justify-between items-center">
          <span>Nº do pedido:</span>
          <span className="font-mono text-foreground font-bold">{order.id?.slice(0, 8)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Modalidade:</span>
          <span className="font-semibold text-foreground">
            {isPickup ? "Retirada no balcão" : isDineIn ? "Consumir no local" : "Entrega"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span>Forma de pagamento:</span>
          <span className="font-semibold text-foreground">{order.payment_method || "Online"}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Total:</span>
          <span className="text-gold font-bold font-serif text-base">
            {formatBRL(order.total || 0)}
          </span>
        </div>
      </div>

      {onBackToCart && (
        <button
          type="button"
          onClick={onBackToCart}
          className="mt-6 w-full rounded-full bg-gold px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-gold-foreground transition hover:brightness-110 shadow-gold-glow active:scale-95"
        >
          Voltar ao Carrinho
        </button>
      )}

      <button
        type="button"
        onClick={onDismiss}
        className={`${onBackToCart ? "mt-2" : "mt-6"} w-full rounded-full bg-secondary border border-border px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-foreground transition hover:bg-gold hover:text-gold-foreground active:scale-95`}
      >
        {isPaid || isOnDelivery ? "Fechar e Acompanhar" : "Fechar"}
      </button>
    </div>
  );
}
