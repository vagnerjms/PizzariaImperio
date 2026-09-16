import logo from "@/assets/logo.png";

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/50 py-10 text-center text-xs text-muted-foreground">
      <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Logo" className="h-6 w-6 object-contain" />
          <span className="font-serif font-bold text-sm text-foreground">Pizzaria Império</span>
          <span>© 2008 - {new Date().getFullYear()}</span>
        </div>
        <p>Desenvolvido com excelência gastronômica e alta tecnologia.</p>
      </div>
    </footer>
  );
}
