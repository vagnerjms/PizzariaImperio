export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Ops! Algo deu errado — Pizzaria Império</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #141210; color: #f5f0e6; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; border-radius: 1rem; border: 1px solid rgba(212, 175, 55, 0.25); background: #1d1a16; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; color: #e6c25b; }
      p { color: #b8b0a4; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.55rem 1.15rem; border-radius: 9999px; font: inherit; font-weight: 600; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #d4af37; color: #141210; }
      .secondary { background: transparent; color: #f5f0e6; border-color: rgba(255, 255, 255, 0.2); }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Não foi possível carregar esta página</h1>
      <p>Ocorreu um erro temporário em nossos servidores. Tente atualizar a página ou voltar ao cardápio.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Tentar novamente</button>
        <a class="secondary" href="/">Voltar ao início</a>
      </div>
    </div>
  </body>
</html>`;
}

export function prefersJsonError(request: Request): boolean {
  try {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return true;
  } catch {
    // URL inválida: usa negociação via cabeçalho Accept
  }
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("application/json") && !accept.includes("text/html");
}

export function buildCatastrophicErrorResponse(request: Request): Response {
  if (prefersJsonError(request)) {
    return new Response(
      JSON.stringify({
        error: "Erro interno no servidor. Tente novamente em instantes.",
      }),
      {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8" },
      },
    );
  }

  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
