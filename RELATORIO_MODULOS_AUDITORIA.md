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
* **Arquivos Principais:** [`src/routes/index.tsx`](file:///c:/Users/vagnermoraes/Desktop/pizzariaimperio011-main/src/routes/index.tsx), [`src/lib/promotions-engine.ts`](file:///c:/Users/vagnermoraes/Desktop/pizzariaimperio011-main/src/lib/promotions-engine.ts)
* **Descrição Funcional:**
  * Apresentação responsiva de 70+ sabores com fotos, badges promocionais e filtros de categoria.
  * **Modal de Montagem de Pizzas:** Permite escolher entre *Pizza Inteira (1 Sabor)* ou *Meio a Meio (2 Sabores)* com busca dinâmica do 2º sabor e indicação transparente de diferença de preço.
  * **Seleção de Bordas Recheadas em Radio Cards:** Catupiry Original, Cheddar Cremoso, Chocolate e Doce de Leite.
  * **Observações Segmentadas por Metade:** Campos dedicados de observação por sabor para o pizzaiolo.
  * **Regra de Precificação Padrão de Mercado:** $\text{Preço Final} = \max(\text{Preço Sabor 1}, \text{Preço Sabor 2}) + \text{Preço Borda}$.
  * **Persistência de Carrinho:** Armazenamento resiliente no `localStorage` do navegador (`imperio_cart_v2`).
* **Critérios para os Auditores Avaliarem:**
  * [ ] Sanitização contra XSS em campos de texto livre (observações).
  * [ ] Validação no backend de que o cliente não consegue enviar preços adulterados no payload do carrinho.
  * [ ] Aplicação de regras de cupons e brindes sem conflito de descontos acumulados.

---

### 📍 MÓDULO 2: Motor de Geocodificação em 5 Camadas, Cache & Frete Dinâmico
* **Arquivos Principais:** [`src/lib/location.functions.ts`](file:///c:/Users/vagnermoraes/Desktop/pizzariaimperio011-main/src/lib/location.functions.ts), [`src/lib/delivery-config.ts`](file:///c:/Users/vagnermoraes/Desktop/pizzariaimperio011-main/src/lib/delivery-config.ts), [`src/lib/delivery.functions.ts`](file:///c:/Users/vagnermoraes/Desktop/pizzariaimperio011-main/src/lib/delivery.functions.ts)
* **Descrição Funcional:**
  * **Resolução de Endereços em 5 Camadas:**
    1. *Camada 0 (Cache Duplo Nível):* Memória RAM LRU (< 1ms) + MongoDB `address_cache` com TTL de 30 dias (< 2ms).
    2. *Camada 1 (Oficial):* ViaCEP Oficial de Ruas e CEPs de Bragança Paulista - SP.
    3. *Camada 2 (Fuzzy Search):* Photon Komoot OpenStreetMap com tolerância a erros ortográficos.
    4. *Camada 3 (Estruturada):* Nominatim OpenStreetMap no servidor (sem bloqueio de CORS).
    5. *Camada 4 (Catálogo Local):* Base de 90+ Bairros Oficiais cadastrados no MongoDB.
    6. *Camada 5 (Failover de Segurança):* Google Maps Geocoding / Places API (`AIzaSy...`), acionada **estritamente se as 4 anteriores retornarem zero resultados**.
  * **Sensor GPS Mobile:** Captura coordenadas de satélite do celular e realiza geocodificação reversa instantânea no backend.
  * **Cálculo Automático de Frete:** Mapeia o bairro identificado e aplica a taxa cadastrada na tabela de entrega.
* **Critérios para os Auditores Avaliarem:**
  * [ ] Eficácia do cache (garantia de zero chamadas externas para endereços repetidos).
  * [ ] Isolamento da chave da API do Google Maps (não exposta no bundle cliente).
  * [ ] Resiliência com fallback automático caso provedores públicos de CEP fiquem fora do ar.

---

### 💳 MÓDULO 3: Liquidação Financeira, Pix Oficial e Webhook Idempotente
* **Arquivos Principais:** [`src/lib/orders.functions.ts`](file:///c:/Users/vagnermoraes/Desktop/pizzariaimperio011-main/src/lib/orders.functions.ts), [`src/routes/api/webhook.ts`](file:///c:/Users/vagnermoraes/Desktop/pizzariaimperio011-main/src/routes/api/webhook.ts)
* **Descrição Funcional:**
  * Geração instantânea de payload Pix EMV oficial do Banco Central (QR Code estático e dinâmico Mercado Pago).
  * Geração de preferência de pagamento seguro para Cartão de Crédito/Débito.
  * Suporte a pagamento presencial na entrega (Dinheiro com cálculo de troco / Maquininha).
  * **Idempotência Estrita no Webhook (`/api/webhook`):** Transição atômica de status (`updateOne({ _id: orderId, payment_status: { $ne: "paid" } })`), impedindo disparos duplicados no n8n.
* **Critérios para os Auditores Avaliarem:**
  * [ ] Proteção contra ataques de concorrência (*Race Conditions*) em notificações simultâneas de webhook.
  * [ ] Tratamento seguro de falhas de comunicação com a API do Mercado Pago (timeouts e retentativas).
  * [ ] Verificação de integridade dos valores totais no momento da criação do pedido.

---

### 📲 MÓDULO 4: Automação de WhatsApp com Blindagem Anti-Bloqueio (Anti-Ban)
* **Arquivos Principais:** `PizzariaImperio.json` (n8n Workflow), [`src/lib/orders.server.ts`](file:///c:/Users/vagnermoraes/Desktop/pizzariaimperio011-main/src/lib/orders.server.ts), Docker Evolution API v2
* **Descrição Funcional:**
  * Disparos automáticos de notificações para o WhatsApp do cliente nos eventos:
    1. `order.created`: Envio de resumo detalhado do pedido (incluindo metades e bordas) e chave Pix.
    2. `order.paid`: Confirmação automática de recebimento de pagamento com aviso de preparo no forno.
    3. `order.status_updated`: Notificações quando o pedido entra em *Preparando*, *Saiu para Entrega* ou *Entregue*.
  * **Políticas Anti-Ban Implementadas:**
    * *Simulação de Digitação Humana:* Status "Digitando..." ativo por 2.800ms antes do envio.
    * *Sanitização E.164:* Normalização de números de celular com remoção de duplicidade de DDI (`55...`).
    * *Supressão de Prévia de Links (`linkPreview: false`):* Reduz análise heurística de spam pela Meta.
* **Critérios para os Auditores Avaliarem:**
  * [ ] Comportamento do fluxo n8n caso a Evolution API fique temporariamente indisponível.
  * [ ] Validação de que nenhuma mensagem de marketing não solicitada é enviada aos clientes.

---

### 🖨️ MÓDULO 5: KDS (Painel da Cozinha) & Spooler de Impressão Térmica ESC/POS
* **Arquivos Principais:** [`src/routes/_authenticated/admin.tsx`](file:///c:/Users/vagnermoraes/Desktop/pizzariaimperio011-main/src/routes/_authenticated/admin.tsx), [`src/lib/thermal-printer.ts`](file:///c:/Users/vagnermoraes/Desktop/pizzariaimperio011-main/src/lib/thermal-printer.ts)
* **Descrição Funcional:**
  * Painel operacional em tempo real para controle de status dos pedidos (`novo`, `preparando`, `saiu`, `entregue`, `cancelado`).
  * **Driver de Impressão Térmica ESC/POS:** Integração direta com portas seriais USB (Bematech MP-4200 TH, Epson, Elgin) através da **Web Serial API** (`navigator.serial`).
  * **Controles Configuráveis de Impressão:** Ajuste de largura (80mm / 58mm), *baud rate* (9600 a 115200), bip sonoro (*buzzer*), corte automático (*guilhotina/auto-cut*) e auto-impressão ao aceitar pedidos.
  * **Formatação de Comanda:** Impressão estruturada de metades, bordas e observações segmentadas.
* **Critérios para os Auditores Avaliarem:**
  * [ ] Fallback suave para `window.print` em navegadores que não suportam Web Serial.
  * [ ] Latência na atualização de novos pedidos no painel da cozinha.

---

### 🔐 MÓDULO 6: Autenticação, Criptografia e Matriz de Acessos (RBAC)
* **Arquivos Principais:** [`src/lib/auth-passwords.server.ts`](file:///c:/Users/vagnermoraes/Desktop/pizzariaimperio011-main/src/lib/auth-passwords.server.ts), [`src/lib/auth.server.ts`](file:///c:/Users/vagnermoraes/Desktop/pizzariaimperio011-main/src/lib/auth.server.ts), [`src/lib/auth-middleware.ts`](file:///c:/Users/vagnermoraes/Desktop/pizzariaimperio011-main/src/lib/auth-middleware.ts), [`src/lib/users.functions.ts`](file:///c:/Users/vagnermoraes/Desktop/pizzariaimperio011-main/src/lib/users.functions.ts)
* **Descrição Funcional:**
  * **Hash Criptográfico de Senhas:** Algoritmo **`scrypt`** com *salt* criptográfico exclusivo de 16 bytes gerado via `crypto.randomBytes`.
  * **Sessão JWT:** Assinatura HMAC-SHA256 (`JWT_SECRET`) com verificação estrita de papéis no middleware de servidor.
  * **Matriz de Permissões RBAC:**
    * `atendente`: Gestão e alteração de status de pedidos.
    * `supervisor`: Métricas de faturamento, QR Code do WhatsApp e edição da tabela de bairros.
    * `admin`: Controle de usuários, reset de senhas, exclusão de operadores e configuração de tokens de API.
  * **Regras de Proteção do Sistema:** Bloqueio contra exclusão do último administrador ativo e contra auto-exclusão acidental.
* **Critérios para os Auditores Avaliarem:**
  * [ ] Tentativas de elevação de privilégios de rotas autenticadas (`/admin`).
  * [ ] Resistência a ataques de força bruta no endpoint de login.
  * [ ] Validação de expiração e revogação de tokens de sessão.

---

### 💾 MÓDULO 7: Modelagem de Dados, Estratégia de Indexação & Concorrência
* **Arquivos Principais:** [`src/lib/db.ts`](file:///c:/Users/vagnermoraes/Desktop/pizzariaimperio011-main/src/lib/db.ts), [`scripts/stress-test.ts`](file:///c:/Users/vagnermoraes/Desktop/pizzariaimperio011-main/scripts/stress-test.ts)
* **Descrição Funcional:**
  * Banco de dados MongoDB 6.0 autenticado com pooling de conexões dinâmico (`min: 2`, `max: 25`).
  * **Índices Compostos e Únicos Ativos:**
    * `orders`: `{ created_at: -1 }`, `{ status: 1 }`, `{ payment_status: 1 }`, `{ gateway_payment_id: 1 }`.
    * `users`: `{ email: 1 }` (**Unique**).
    * `address_cache`: `{ _id: 1 }` (com TTL automático de expiração em 30 dias).
  * **Benchmark de Desempenho Homologado:**
    * Processamento sustentado de **120 pedidos/segundo**.
    * Latência média de gravação: **37ms**.
    * Taxa de sucesso em concorrência máxima: **100% (zero falhas)**.
* **Critérios para os Auditores Avaliarem:**
  * [ ] Uso de índices em consultas complexas no painel de relatórios.
  * [ ] Eficiência de consumo de memória RAM do container de banco de dados.

---

### 🐳 MÓDULO 8: Infraestrutura Docker, Rede e Segurança de Borda (Nginx / SSL)
* **Arquivos Principais:** `docker-compose.yml`, `Dockerfile`, Nginx Configuration
* **Descrição Funcional:**
  * Conteinerização de 4 serviços essenciais:
    1. `pizzariaimperio-web`: Aplicação SSR Bun/Node na porta interna `3002`.
    2. `pizzaria_db`: MongoDB 6.0 na porta `27018:27017` com volume persistente `pizzaria_mongo_data`.
    3. `pizzaria_evolution`: Evolution API v2 na porta `8085:8080`.
    4. `pizzaria_postgres`: PostgreSQL 16 para persistência da Evolution API na porta `5433:5432`.
  * **Nginx Reverse Proxy:** Terminação SSL via Let's Encrypt (Certbot), suporte a HTTP/2 e isolamento de portas para a internet pública.
* **Critérios para os Auditores Avaliarem:**
  * [ ] Exposição de portas de banco de dados para a internet pública (garantia de restrição por firewall UFW).
  * [ ] Política de renovação de certificados SSL/TLS.
  * [ ] Estratégia de backup automático diário dos volumes Docker.

---

## 📋 4. Matriz de Cobertura e Questionário para a Equipe de Auditoria

| Módulo | Tipo de Teste Recomendado | Nível de Criticidade |
| :--- | :--- | :---: |
| **Módulo 1 (Cardápio & Carrinho)** | Validação de Inputs, XSS, Cálculo Anti-Adulteração | **Alto** |
| **Módulo 2 (Geocodificação & Frete)** | Teste de Carga de Cache, Fallback de APIs | **Médio** |
| **Módulo 3 (Pagamentos & Webhook)** | Idempotência, Race Conditions, Conciliação Pix | **Crítico** |
| **Módulo 4 (WhatsApp & n8n)** | Políticas Anti-Ban, Resiliência a Timeout | **Médio** |
| **Módulo 5 (KDS & Impressão ESC/POS)** | Conexão Web Serial, Formatação de Metades | **Médio** |
| **Módulo 6 (Segurança & RBAC)** | Criptoanálise de Senhas (`scrypt`), Elevação de Cargo | **Crítico** |
| **Módulo 7 (MongoDB & Desempenho)** | Stress Test de Concorrência, Uso de Índices | **Alto** |
| **Módulo 8 (Docker & Infra)** | Isolamento de Redes, Portas e Certificados SSL | **Alto** |

---

*Documento gerado e aprovado para contratação e execução de auditoria técnica independente.* 🍕🛡️📄
