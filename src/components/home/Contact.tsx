import { Phone } from "lucide-react";
import { formatOpeningHoursSummary, OpeningHoursMap } from "@/lib/store-hours";

export function Contact({
  storePhone,
  openingHours,
}: {
  storePhone?: string;
  openingHours?: OpeningHoursMap | null;
}) {
  const digits = (storePhone || "").replace(/\D/g, "");
  const whatsappUrl = digits ? `https://wa.me/${digits}` : null;
  const hoursSummary = formatOpeningHoursSummary(openingHours);

  return (
    <section id="contato" className="border-t border-border/50 bg-background py-20">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.3em] text-gold">
          <Phone className="h-3.5 w-3.5" /> ATENDIMENTO & DELIVERY
        </div>
        <h2 className="mt-4 font-serif text-3xl md:text-4xl font-bold">
          Peça pelo site ou pelo WhatsApp
        </h2>
        <p className="mt-2 text-muted-foreground max-w-xl mx-auto text-sm">
          Atendemos {hoursSummary} em toda a região de Bragança Paulista.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-7 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition hover:bg-emerald-500"
            >
              <Phone className="h-4 w-4" /> Chamar no WhatsApp
            </a>
          )}
          <a
            href="#cardapio"
            className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-secondary/60 px-7 py-3 text-sm font-semibold tracking-wider text-gold transition hover:bg-gold/10"
          >
            Fazer Pedido Online
          </a>
        </div>
      </div>
    </section>
  );
}
