import { Star } from "lucide-react";
import pizzaiolo from "@/assets/pizzaiolo.jpg";

export function Story() {
  return (
    <section id="historia" className="border-t border-border/50 bg-secondary/20 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.3em] text-gold">
              <Star className="h-3 w-3 fill-gold" /> NOSSA HISTÓRIA{" "}
              <Star className="h-3 w-3 fill-gold" />
            </div>
            <h2 className="mt-4 font-serif text-4xl font-bold md:text-5xl">
              Mais de uma década de{" "}
              <span className="italic text-gradient-gold">paixão por pizza</span>
            </h2>
            <p className="mt-6 leading-relaxed text-muted-foreground">
              A Pizzaria Império nasceu do sonho de trazer para a mesa das famílias a autêntica pizza feita com carinho, paciência e os melhores ingredientes.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Nossa massa passa por um processo de fermentação de 48 horas, resultando em uma borda leve, crocante por fora e incrivelmente macia por dentro.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-6 border-t border-border/60 pt-6">
              <div>
                <div className="font-serif text-3xl font-bold text-gold">2008</div>
                <div className="mt-1 text-xs text-muted-foreground">Ano de Fundação</div>
              </div>
              <div>
                <div className="font-serif text-3xl font-bold text-gold">+70</div>
                <div className="mt-1 text-xs text-muted-foreground">Sabores no Cardápio</div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-border shadow-2xl">
            <img
              src={pizzaiolo}
              alt="Mestre Pizzaiolo"
              className="w-full h-[450px] object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
