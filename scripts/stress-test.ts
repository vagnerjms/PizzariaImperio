/**
 * Script de Teste de Carga e Capacidade de Pedidos (Stress Test)
 * Pizzaria Império v2.0.0
 * 
 * Execução dentro do container Docker:
 *   docker compose exec web bun scripts/stress-test.ts --total 30 --concurrency 5
 *   docker compose exec web bun scripts/stress-test.ts --total 100 --concurrency 10 --clean
 */

import { z } from "zod";
import crypto from "node:crypto";
import { getOrdersCollection, client } from "../src/lib/db";

const itemSchema = z.object({
  pizza_id: z.string().min(1).max(60),
  pizza_name: z.string().min(1).max(120),
  quantity: z.number().int().min(1).max(50),
  unit_price: z.number().min(0).max(5000),
});

const createOrderSchema = z.object({
  customer_name: z.string().trim().min(2).max(120),
  customer_phone: z.string().trim().min(8).max(30),
  customer_address: z.string().trim().min(5).max(400),
  payment_method: z.enum(["Pix", "Dinheiro", "Cartão de crédito", "Cartão de débito"]),
  troco: z.number().min(0).max(10000).nullable().optional(),
  notes: z.string().max(500).optional().nullable(),
  items: z.array(itemSchema).min(1).max(50),
  delivery_fee: z.number().min(0).max(500).optional().nullable(),
});

interface TestResult {
  orderId?: string;
  durationMs: number;
  success: boolean;
  error?: string;
}

// Argumentos da linha de comando
const args = process.argv.slice(2);
function getArg(flag: string, defaultValue: string): string {
  const index = args.indexOf(flag);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return defaultValue;
}

const TOTAL_ORDERS = parseInt(getArg("--total", "30"), 10);
const CONCURRENCY = parseInt(getArg("--concurrency", "5"), 10);
const SHOULD_CLEAN = args.includes("--clean");

const SAMPLE_NAMES = [
  "Carlos Eduardo", "Mariana Silva", "Lucas Santos", "Beatriz Lima", 
  "Fernando Souza", "Camila Oliveira", "Rodrigo Costa", "Juliana Pereira",
  "Gabriel Almeida", "Larissa Ferreira", "Rafael Barbosa", "Patricia Ribeiro"
];

const SAMPLE_PIZZAS = [
  { id: "1", name: "Calabresa Especial", price: 45.00 },
  { id: "2", name: "Mussarela Tradicional", price: 42.00 },
  { id: "3", name: "Frango com Catupiry", price: 48.00 },
  { id: "4", name: "Portuguesa", price: 50.00 },
  { id: "5", name: "Quatro Queijos", price: 52.00 }
];

const SAMPLE_BAIRROS = [
  "Centro", "Lavapés", "Jardim América", "Jardim Europa", 
  "Jardim do Lago", "Cidade Planejada I", "Henedina Cortez", "Taboão"
];

function generateRandomOrder(index: number) {
  const name = `${SAMPLE_NAMES[index % SAMPLE_NAMES.length]} (Teste #${index + 1})`;
  const bairro = SAMPLE_BAIRROS[index % SAMPLE_BAIRROS.length];
  const pizza = SAMPLE_PIZZAS[index % SAMPLE_PIZZAS.length];
  const qty = (index % 2) + 1;

  return {
    customer_name: name,
    customer_phone: `(11) 9${Math.floor(10000000 + Math.random() * 90000000)}`,
    customer_address: `Rua das Flores, ${100 + index} - Bairro ${bairro}, Bragança Paulista - SP`,
    payment_method: "Dinheiro" as const,
    troco: 100,
    notes: `[TESTE DE CARGA AUTOMATIZADO #${index + 1}]`,
    delivery_fee: 5.00,
    items: [
      {
        pizza_id: pizza.id,
        pizza_name: pizza.name,
        quantity: qty,
        unit_price: pizza.price
      }
    ]
  };
}

async function processSingleOrder(index: number, ordersCol: any): Promise<TestResult> {
  const rawPayload = generateRandomOrder(index);
  const startTime = performance.now();

  try {
    // 1. Validação estrita de Schema (Zod)
    const validData = createOrderSchema.parse(rawPayload);

    // 2. Cálculo seguro de Subtotais e Frete
    const orderId = `test-order-${crypto.randomUUID()}`;
    const subtotal = validData.items.reduce((acc, i) => acc + (Math.max(0, i.unit_price) * Math.max(1, i.quantity)), 0);
    const verifiedDeliveryFee = Math.max(0, validData.delivery_fee || 0);
    const total = Number((subtotal + verifiedDeliveryFee).toFixed(2));

    const newOrder = {
      _id: orderId,
      customer_name: validData.customer_name,
      customer_phone: validData.customer_phone,
      customer_address: validData.customer_address,
      payment_method: validData.payment_method,
      troco: validData.troco ?? null,
      notes: validData.notes ?? null,
      total,
      delivery_fee: verifiedDeliveryFee,
      status: "novo" as const,
      payment_status: "on_delivery" as const,
      payment_gateway: null,
      gateway_payment_id: null,
      payment_details: null,
      is_test: true,
      created_at: new Date(),
      updated_at: new Date(),
      items: validData.items.map((i) => ({
        pizza_id: i.pizza_id,
        pizza_name: i.pizza_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
    };

    // 3. Gravação atômica no MongoDB
    await ordersCol.insertOne(newOrder);

    const durationMs = Math.round(performance.now() - startTime);
    return {
      orderId,
      durationMs,
      success: true,
    };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);
    return {
      durationMs,
      success: false,
      error: err?.message || "Erro no processamento do pedido",
    };
  }
}

async function runStressTest() {
  console.log("\n=======================================================");
  console.log("   🍕 INICIANDO TESTE DE CARGA - PIZZARIA IMPÉRIO 🍕");
  console.log("=======================================================");
  console.log(`📦 Total de Pedidos:      ${TOTAL_ORDERS}`);
  console.log(`⚡ Concorrência:          ${CONCURRENCY} pedidos simultâneos`);
  console.log(`🧹 Limpar após o teste:   ${SHOULD_CLEAN ? "SIM" : "NÃO"}`);
  console.log("=======================================================\n");

  const ordersCol = await getOrdersCollection();
  const createdOrderIds: string[] = [];
  const results: TestResult[] = [];
  const testStartTime = performance.now();
  let completedCount = 0;

  const queue = Array.from({ length: TOTAL_ORDERS }, (_, i) => i);

  async function worker() {
    while (queue.length > 0) {
      const index = queue.shift();
      if (index === undefined) break;

      const result = await processSingleOrder(index, ordersCol);
      results.push(result);
      if (result.orderId) {
        createdOrderIds.push(result.orderId);
      }
      completedCount++;

      const icon = result.success ? "✅" : "❌";
      process.stdout.write(
        `\r[Progresso: ${completedCount}/${TOTAL_ORDERS}] ${icon} Pedido #${index + 1} (${result.durationMs}ms)`
      );
    }
  }

  // Iniciar workers simultâneos
  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const totalTimeSeconds = ((performance.now() - testStartTime) / 1000).toFixed(2);
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  const durations = results.map(r => r.durationMs).sort((a, b) => a - b);
  const minLatency = durations[0] || 0;
  const maxLatency = durations[durations.length - 1] || 0;
  const avgLatency = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
  const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
  const throughput = (TOTAL_ORDERS / parseFloat(totalTimeSeconds)).toFixed(1);

  console.log("\n\n=======================================================");
  console.log("             📊 RESULTADO DO TESTE DE CARGA            ");
  console.log("=======================================================");
  console.log(`⏱️ Tempo Total do Teste:     ${totalTimeSeconds}s`);
  console.log(`🚀 Taxa de Processamento:    ${throughput} pedidos/segundo`);
  console.log(`✅ Pedidos Bem-Sucedidos:    ${successful.length} / ${TOTAL_ORDERS} (${((successful.length / TOTAL_ORDERS) * 100).toFixed(1)}%)`);
  console.log(`❌ Pedidos com Falha:        ${failed.length} / ${TOTAL_ORDERS}`);
  console.log("-------------------------------------------------------");
  console.log("📈 Latências de Gravação no MongoDB:");
  console.log(`   • Mínima:                  ${minLatency}ms`);
  console.log(`   • Média:                   ${avgLatency}ms`);
  console.log(`   • Mediana (p50):           ${p50}ms`);
  console.log(`   • Percentil 95% (p95):     ${p95}ms`);
  console.log(`   • Máxima:                  ${maxLatency}ms`);
  console.log("=======================================================");

  if (SHOULD_CLEAN && createdOrderIds.length > 0) {
    console.log(`\n🧹 Removendo os ${createdOrderIds.length} pedidos de teste do banco...`);
    await ordersCol.deleteMany({ _id: { $in: createdOrderIds } });
    console.log("✨ Banco de dados limpo com sucesso!");
  } else {
    console.log(`\n📌 Os pedidos foram mantidos no banco para você visualizar no Painel Administrativo.`);
  }

  console.log("=======================================================\n");
  
  if (client) {
    await client.close();
  }
}

runStressTest().catch((err) => {
  console.error("Erro fatal no teste de carga:", err);
  process.exit(1);
});
