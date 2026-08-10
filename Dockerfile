# Usar a imagem oficial do Bun (alpine) para compatibilidade com o bun.lock do projeto
FROM oven/bun:1-alpine

# Instalar dependências essenciais
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copiar arquivos de pacotes para aproveitar cache do Bun
COPY package.json bun.lock* ./

# Instalar as dependências de forma rápida e segura
RUN bun install

# Copiar o restante do código da aplicação
COPY . .

# Expor a porta do TanStack Start
EXPOSE 8080

ENV PORT=8080
ENV HOST=0.0.0.0

# Iniciar o servidor usando Bun
CMD ["bun", "run", "dev"]
