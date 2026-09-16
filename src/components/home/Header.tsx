import { ShoppingBag, Star } from "lucide-react";
import logo from "@/assets/logo.png";

export function Header({
  cartCount,
  pulse,
  onOpenCart,
}: {
  cartCount: number;
  pulse: boolean;
  onOpenCart: () => void;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary ring-1 ring-gold/30">
            <img src={logo} alt="Pizzaria Império" className="h-9 w-9 object-contain" width={36} height={36} />
          </div>
          <div className="leading-tight">
            <div className="font-serif text-lg font-bold tracking-wide">
              PIZZARIA IMPÉRIO
            </div>
            <div className="flex items-center gap-1 text-[10px] tracking-[0.3em] text-gold">
              <Star className="h-2.5 w-2.5 fill-gold" /> DELIVERY{" "}
              <Star className="h-2.5 w-2.5 fill-gold" />
            </div>
          </div>
        </a>

        <nav className="hidden items-center gap-10 text-sm font-medium tracking-wider md:flex">
          <a href="#cardapio" className="transition hover:text-gold">CARDÁPIO</a>
          <a href="#promocoes" className="transition hover:text-gold">PROMOÇÕES</a>
          <a href="#historia" className="transition hover:text-gold">NOSSA HISTÓRIA</a>
          <a href="#contato" className="transition hover:text-gold">CONTATO</a>
        </nav>

        <button
          type="button"
          onClick={onOpenCart}
          className={`inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-gold-foreground shadow-gold-glow transition hover:brightness-110 ${pulse ? "scale-105" : ""}`}
        >
          <ShoppingBag className="h-4 w-4" />
          CARRINHO
          {cartCount > 0 && (
            <span className="ml-1 rounded-full bg-gold-foreground/90 px-2 py-0.5 text-[11px] font-bold text-gold">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
