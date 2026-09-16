import { Flame, Clock, Truck } from "lucide-react";
import heroForno from "@/assets/hero-forno.jpg";

export function Hero() {
  return (
    <section id="top" className="relative isolate overflow-hidden">
      <img
        src={heroForno}
        alt="Forno a lenha"
        className="absolute inset-0 -z-10 h-full w-full object-cover opacity-20"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/40 via-background/80 to-background" />

      <div className="mx-auto max-w-7xl px-6 py-24 md:py-36">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-secondary/80 px-4 py-1.5 text-xs font-semibold tracking-wider text-gold">
            <Flame className="h-3.5 w-3.5 fill-gold" />
            FORNO A LENHA TRADICIONAL
          </div>

          <h1 className="mt-6 font-serif text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl leading-tight">
            A verdadeira arte da pizza{" "}
            <span className="italic text-gradient-gold">em sua mesa</span>
          </h1>

          <p className="mt-4 sm:mt-6 text-sm sm:text-lg leading-relaxed text-muted-foreground">
            Massa de fermentação lenta de 48 horas, molho artesanal de tomates selecionados e ingredientes da mais alta qualidade. Assadas no calor perfeito do forno a lenha.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#cardapio"
              className="inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-gold-foreground shadow-gold-glow transition hover:brightness-110 active:scale-95"
            >
              Fazer Pedido Agora
            </a>
            <a
              href="#promocoes"
              className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-secondary/60 px-7 py-3.5 text-sm font-semibold tracking-wider transition hover:border-gold hover:text-gold"
            >
              Ver Promoções
            </a>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-4 sm:gap-6 border-t border-border/60 pt-8">
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-gold">
                <Clock className="h-4 w-4" />
                <span className="font-serif text-base sm:text-xl font-bold">40-50m</span>
              </div>
              <div className="mt-1 text-[11px] sm:text-xs text-muted-foreground">Entrega rápida</div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-gold">
                <Truck className="h-4 w-4" />
                <span className="font-serif text-base sm:text-xl font-bold">Quentinha</span>
              </div>
              <div className="mt-1 text-[11px] sm:text-xs text-muted-foreground">Térmica</div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-gold">
                <Flame className="h-4 w-4 fill-gold" />
                <span className="font-serif text-base sm:text-xl font-bold">400°C</span>
              </div>
              <div className="mt-1 text-[11px] sm:text-xs text-muted-foreground">Forno lenha</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
