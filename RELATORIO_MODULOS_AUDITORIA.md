# Documento de Especificação de Módulos para Auditoria Técnica (Escopo de Auditoria de Software)

**Projeto:** Plataforma Digital de Vendas, Checkout Inteligente, KDS e Mensageria — Pizzaria Império  
**Versão Atual:** 2.3.0  
**Data do Relatório:** 02 de Setembro de 2026  
**Finalidade:** Guia Estruturado de Módulos, Arquitetura, Contratos de Dados e Critérios de Homologação para Auditoria de Terceiros

---

## 🎯 1. Objetivo da Auditoria

Este documento formaliza o **escopo técnico**, a **arquitetura de componentes** e os **critérios de validação** do sistema **Pizzaria Império** para que a equipe de auditoria possa avaliar:

1. **Segurança da Informação e Criptografia:** Validação de autenticação, RBAC, proteção de dados (LGPD) e integridade de senhas.
2. **Resiliência e Arquitetura de APIs:** Avaliação de Server Functions (TanStack Start), idempotência de webhooks e failover de geocodificação.
3. **Consistência de Negócio e Anti-Adulteração:** Validação de precificação (regra do maior valor para pizzas meio a meio), cupons e promoções.
4. **Desempenho sob Alta Concorrência:** Comportamento de cache, pooling de banco de dados e estabilidade em picos de vendas (fins de semana).
5. **Automação e Comunicação Externa:** Conformidade de mensageria WhatsApp via n8n e envio de comandas para impressoras térmicas via Web Serial API.

---

## 🏗️ 2. Visão Geral da Stack Tecnológica

```text
========================================================================================
                                 STACK TECNOLÓGICA OFICIAL
========================================================================================
• Camada Cliente (Frontend):      React 19 · TypeScript 5.8 · Tailwind CSS v4 · Radix UI
• Roteamento & SSR (Full-Stack):  TanStack Router v1 · TanStack Start (Server Functions)
• Runtime & Compilação:           Bun Runtime · Vite
• Persistência de Dados:          MongoDB 6.0 (Connection Pool: min 2 / max 25)
• Integrações de Pagamento:       Mercado Pago SDK REST (Pix EMV Banco Central & Cartões)
• Mensageria & Automação:         n8n Workflow Engine · Evolution API v2 (WhatsApp Web)
• Infraestrutura:                 Docker Multi-Container · Nginx Reverse Proxy com SSL
========================================================================================
```

---

## 📦 3. Detalhamento dos Módulos para Auditoria

---

### 🍕 MÓDULO 1: Cardápio Digital, Montagem Customizada & Carrinho Inteligente

- **Arquivos Principais:** `src/routes/index.tsx`, `src/data/catalog.ts`, `src/lib/promotions-engine.ts`, `src/lib/order-pricing.ts`
- **Descrição Funcional:**
  - Apresentação responsiva de 100+ itens (pizzas tradicionais, especiais, doces, brotos, bebidas e adicionais) com fotos, selos editáveis e filtros de categoria.
  - **Modal de Montagem de Pizzas:** Permite escolher entre _Pizza Inteira (1 Sabor)_ (`SinglePizzaModal`) ou _Meio a Meio (2 Sabores)_ (`HalfAndHalfModal`) com busca dinâmica e indicação transparente de diferença de preço.
  - **Seleção de Bordas Recheadas em Radio Cards:** Catupiry Original, Cheddar Cremoso, Chocolate e Doce de Leite.
  - **Observações Segmentadas por Metade:** Campos dedicados de observação por sabor para o pizzaiolo.
  - **Regra de Precificação Padrão de Mercado:** $\text{Preço Final} = \max(\text{Preço Sabor 1}, \text{Preço Sabor 2}) + \text{Preço Borda}$, recalculada estritamente no servidor em `src/lib/order-pricing.ts`.
  - **Persistência de Carrinho:** Armazenamento resiliente no `localStorage` do navegador (`imperio_cart_v2`).
- **Critérios para os Auditores Avaliarem:**
  - [ ] Sanitização contra XSS em campos de texto livre (observações e impressão).
  - [ ] Validação no backend de que o cliente não consegue enviar preços, descontos ou brindes adulterados.
  - [ ] Aplicação automática da melhor promoção única sem acúmulo indevido.

---

### 📍 MÓDULO 2: Motor de Geocodificação em 5 Camadas, Cache & Frete Dinâmico

- **Arquivos Principais:** `src/lib/location.functions.ts`, `src/lib/delivery-config.ts`, `src/lib/delivery-config.server.ts`, `src/lib/delivery.functions.ts`, `src/hooks/useDeliveryAddress.ts`
- **Descrição Funcional:**
  - **CEP no Cliente:** Consulta em cascata `ViaCEP → BrasilAPI → AwesomeAPI`.
  - **Resolução de Ruas e GPS em 5 Camadas no Servidor:**
    1. _Camada 0 (Cache Duplo Nível):_ Memória RAM (30 dias) + MongoDB `address_cache` com índice TTL de 30 dias.
    2. _Camada 1 (Oficial):_ ViaCEP Oficial de Ruas de Bragança Paulista - SP.
    3. _Camada 2 (Fuzzy Search):_ Photon Komoot OpenStreetMap com tolerância a erros ortográficos.
    4. _Camada 3 (Estruturada):_ Nominatim OpenStreetMap no servidor (sem bloqueio de CORS).
    5. _Camada 4 (Catálogo Local):_ Base de 99 Bairros Oficiais cadastrados no MongoDB (`delivery_settings` / `_id: "global"`).
    6. _Camada 5 (Failover de Segurança):_ Google Maps Geocoding API (chave configurada em `settings` ou `.env`), acionada **estritamente se as 4 anteriores retornarem zero resultados**.
  - **Sensor GPS Mobile:** Captura coordenadas do dispositivo e realiza geocodificação reversa no backend.
  - **Cálculo Automático de Frete:** Mapeia o bairro identificado e aplica a taxa cadastrada na tabela de entrega (suportando taxa padrão `R$ 0,00` e isenção em `pickup`/`dine_in`).
- **Critérios para os Auditores Avaliarem:**
  - [ ] Eficácia do cache (garantia de zero chamadas externas para endereços repetidos).
  - [ ] Isolamento da chave da API do Google Maps (não exposta no bundle cliente).
  - [ ] Resiliência com fallback automático caso provedores públicos de CEP fiquem fora do ar.

---

### 💳 MÓDULO 3: Liquidação Financeira, Pix Oficial e Webhook Idempotente

- **Arquivos Principais:** `src/lib/orders.functions.ts`, `src/lib/order-pricing.ts`, `src/lib/pix.ts`, `src/routes/api/webhook.ts`
- **Descrição Funcional:**
  - Geração de cobrança Pix (Mercado Pago dinâmico ou Pix EMV estático do Banco Central) antes da persistência do pedido, evitando pedidos órfãos em falhas de gateway.
  - Suporte a pagamento presencial na entrega/retirada/local (Dinheiro com cálculo de troco / Cartão de Crédito e Débito na maquininha).
  - **Idempotência Estrita no Webhook (`/api/webhook`):** Validação numérica do `paymentId`, suporte a verificação HMAC `x-signature` (`MERCADO_PAGO_WEBHOOK_SECRET`) e transição atômica (`updateOne({ _id: orderId, payment_status: { $ne: "paid" } })`).
- **Critérios para os Auditores Avaliarem:**
  - [ ] Proteção contra ataques de concorrência (_Race Conditions_) em notificações simultâneas de webhook.
  - [ ] Tratamento seguro de falhas de comunicação com a API do Mercado Pago (timeouts e prevenção de órfãos).
  - [ ] Verificação de integridade dos valores totais no momento da criação do pedido.

---

### 📲 MÓDULO 4: Automação de WhatsApp com Blindagem Anti-Bloqueio (Anti-Ban)

- **Arquivos Principais:** `PizzariaImperio.json` (n8n Workflow), `src/lib/orders.functions.ts`, `src/lib/whatsapp.functions.ts`
- **Descrição Funcional:**
  - Disparos automáticos de notificações para o WhatsApp do cliente nos eventos:
    1. `order.created`: Resumo detalhado do pedido (incluindo metades, bordas e `delivery_mode`) e Pix.
    2. `order.paid`: Confirmação de recebimento de pagamento com aviso de preparo.
    3. `order.status_updated`: Notificações nos status essenciais `saiu` e `cancelado` (incluindo `delivery_mode`).
  - **Políticas Anti-Ban Implementadas:**
    - _Simulação de Digitação Humana:_ Status "Digitando..." ativo por 2.800ms antes do envio.
    - _Sanitização E.164:_ Normalização de números de celular com remoção de duplicidade de DDI (`55...`).
    - _Supressão de Prévia de Links (`linkPreview: false`):_ Reduz análise heurística de spam pela Meta.
- **Critérios para os Auditores Avaliarem:**
  - [ ] Comportamento do fluxo n8n caso a Evolution API fique temporariamente indisponível.
  - [ ] Validação de que nenhuma mensagem de marketing não solicitada é enviada aos clientes.

---

### 🖨️ MÓDULO 5: KDS (Painel da Cozinha) & Spooler de Impressão Térmica ESC/POS

- **Arquivos Principais:** `src/routes/_authenticated/admin.tsx`, `src/components/admin/tabs/OrdersTab.tsx`, `src/lib/thermal-printer.ts`
- **Descrição Funcional:**
  - Painel operacional em tempo real (polling TanStack Query 10s + alerta sonoro Web Audio) para controle de status dos pedidos (`novo`, `preparando`, `saiu`, `entregue`, `cancelado`).
  - **Driver de Impressão Térmica ESC/POS:** Integração direta com portas seriais USB (Bematech MP-4200 TH, Epson, Elgin) através da **Web Serial API** (`navigator.serial`).
  - **Controles Configuráveis de Impressão:** Largura (80mm / 58mm), _baud rate_ (9600 a 115200), bip sonoro (_buzzer_), corte automático e auto-impressão ao aceitar pedidos.
  - **Fallback Seguro no Navegador:** Impressão via `iframe` com `escapeHtml` em todos os campos para mitigação de XSS.
- **Critérios para os Auditores Avaliarem:**
  - [ ] Fallback suave para `window.print` em navegadores que não suportam Web Serial.
  - [ ] Latência na atualização de novos pedidos no painel da cozinha.

---

### 🔐 MÓDULO 6: Autenticação, Criptografia e Matriz de Acessos (RBAC)

- **Arquivos Principais:** `src/lib/hash.ts`, `src/lib/jwt.ts`, `src/lib/auth.functions.ts`, `src/lib/auth-middleware.ts`, `src/lib/users.functions.ts`
- **Descrição Funcional:**
  - **Hash Criptográfico de Senhas:** Algoritmo **`scrypt`** com _salt_ exclusivo de 16 bytes e comparação em tempo constante (`timingSafeEqual`).
  - **Sessão JWT:** Assinatura HMAC-SHA256 (`JWT_SECRET` obrigatório em produção) com verificação estrita de papéis no middleware de servidor.
  - **Matriz de Permissões RBAC:**
    - `atendente`: Gestão e alteração de status de pedidos (KDS) e confirmação manual de Pix.
    - `supervisor`: Cardápio (`MenuTab`), Promoções (`PromotionsTab`), Indicadores de Vendas (`FinancialTab`), QR Code do WhatsApp (`WhatsAppTab`) e tabela de bairros (`DeliveryTab`).
    - `admin`: Gestão de usuários (`UsersTab`) e configurações de APIs/integrações (`SettingsTab`).
  - **Regras de Proteção do Sistema:** Bloqueio contra exclusão ou rebaixamento do último administrador ativo e contra auto-exclusão/auto-rebaixamento.
- **Critérios para os Auditores Avaliarem:**
  - [ ] Tentativas de elevação de privilégios de rotas autenticadas (`/admin`).
  - [ ] Resistência a ataques de força bruta no endpoint de login.
  - [ ] Validação de expiração e revogação de tokens de sessão.

---

### 💾 MÓDULO 7: Modelagem de Dados, Estratégia de Indexação & Concorrência

- **Arquivos Principais:** `src/lib/db.ts`, `src/lib/db-init.ts`, `scripts/stress-test.ts`
- **Descrição Funcional:**
  - Banco de dados MongoDB 6.0 autenticado com pooling de conexões dinâmico (`min: 2`, `max: 25`).
  - **Índices Compostos, Únicos e TTL Ativos:**
    - `orders`: `{ created_at: -1 }`, `{ status: 1, created_at: -1 }`, `{ payment_status: 1 }`, `{ gateway_payment_id: 1 }`, `{ customer_phone: 1 }`.
    - `users`: `{ email: 1 }` (**Unique**).
    - `promotions`: `{ active: 1, created_at: -1 }`.
    - `address_cache`: `{ updated_at: 1 }` (**TTL automático de 30 dias**).
  - **Benchmark de Persistência (`scripts/stress-test.ts`):** Teste direto de validação Zod + gravação concorrente no MongoDB (~120 inserções/s, latência média de 37ms).
- **Critérios para os Auditores Avaliarem:**
  - [ ] Uso de índices em consultas complexas no painel de relatórios.
  - [ ] Eficiência de consumo de memória RAM do container de banco de dados.

---

### 🐳 MÓDULO 8: Infraestrutura Docker, Rede e Segurança de Borda (Nginx / SSL)

- **Arquivos Principais:** `docker-compose.yml`, `Dockerfile`, `.env.example`
- **Descrição Funcional:**
  - Conteinerização de 5 serviços essenciais com credenciais parametrizadas via `.env`:
    1. `web`: Build de produção (`vite build`) rodando em Bun na porta `3002:8080`.
    2. `db` (`pizzaria_db`): MongoDB 6.0 com volume persistente `mongo_data`.
    3. `evolution_api` (`pizzaria_evolution`): Evolution API v2 na porta `8085:8080`.
    4. `postgres` (`pizzaria_postgres`): PostgreSQL 15 para persistência da Evolution API.
    5. `evolution_manager` (`pizzaria_evolution_manager`): Painel da Evolution API na porta `8086:80`.
  - **Nginx Reverse Proxy:** Terminação SSL via Let's Encrypt (Certbot), suporte a HTTP/2 e isolamento de portas para a internet pública.
- **Critérios para os Auditores Avaliarem:**
  - [ ] Exposição de portas de banco de dados para a internet pública (garantia de restrição por firewall UFW).
  - [ ] Política de renovação de certificados SSL/TLS.
  - [ ] Estratégia de backup automático diário dos volumes Docker.

---

## 📋 4. Matriz de Cobertura e Questionário para a Equipe de Auditoria

| Módulo                                 | Tipo de Teste Recomendado                             | Nível de Criticidade |
| :------------------------------------- | :---------------------------------------------------- | :------------------: |
| **Módulo 1 (Cardápio & Carrinho)**     | Validação de Inputs, XSS, Cálculo Anti-Adulteração    |       **Alto**       |
| **Módulo 2 (Geocodificação & Frete)**  | Teste de Carga de Cache, Fallback de APIs             |      **Médio**       |
| **Módulo 3 (Pagamentos & Webhook)**    | Idempotência, Race Conditions, Conciliação Pix        |     **Crítico**      |
| **Módulo 4 (WhatsApp & n8n)**          | Políticas Anti-Ban, Resiliência a Timeout             |      **Médio**       |
| **Módulo 5 (KDS & Impressão ESC/POS)** | Conexão Web Serial, Formatação de Metades             |      **Médio**       |
| **Módulo 6 (Segurança & RBAC)**        | Criptoanálise de Senhas (`scrypt`), Elevação de Cargo |     **Crítico**      |
| **Módulo 7 (MongoDB & Desempenho)**    | Stress Test de Concorrência, Uso de Índices           |       **Alto**       |
| **Módulo 8 (Docker & Infra)**          | Isolamento de Redes, Portas e Certificados SSL        |       **Alto**       |

---

_Documento gerado e aprovado para contratação e execução de auditoria técnica independente._ 🍕🛡️📄
