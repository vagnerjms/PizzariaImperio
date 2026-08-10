import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { loginFn, getCurrentUserFn } from "@/lib/auth.functions";
import { Flame } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Painel — Pizzaria Império" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const login = useServerFn(loginFn);
  const getCurrentUser = useServerFn(getCurrentUserFn);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) navigate({ to: "/admin" });
    });
  }, [navigate, getCurrentUser]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      const res = await login({ data: { email: cleanEmail, password: cleanPassword } });
      setLoading(false);
      
      // Save token in cookie (for SSR/headers) and localStorage (for client-side SPA)
      document.cookie = `auth_token=${res.token}; path=/; max-age=604800; SameSite=Lax`;
      localStorage.setItem("auth_token", res.token);
      
      navigate({ to: "/admin" });
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || "E-mail ou senha inválidos.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-gold transition">
          <Flame className="h-4 w-4 text-gold" />
          Pizzaria Império
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl">
          <h1 className="font-serif text-2xl">Entrar no painel</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acesso restrito à pizzaria.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                E-mail
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={(e) => setEmail(e.target.value.trim().toLowerCase())}
                className="mt-1.5 w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Senha
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gold px-6 py-3 text-sm font-bold uppercase tracking-wider text-gold-foreground transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
