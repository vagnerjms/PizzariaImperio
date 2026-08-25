/**
 * Script de Teste de Carga e Capacidade (Stress Test)
 * Pizzaria Império v2.0.0
 * 
 * Uso:
 *   npx tsx scripts/stress-test.ts --total 20 --concurrency 3 --url http://localhost:3002
 *   npx tsx scripts/stress-test.ts --total 50 --concurrency 5 --url https://imperio.embraganca.com.br
 */

interface OrderPayload {
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  payment_method: string;
  troco?: number | null;
  notes?: string | null;
  delivery_fee: number;
  items: Array<{
    pizza_id: string;
    pizza_name: string;
    quantity: number;
    unit_price: number;
  }>;
}

interface TestResult {
  orderId?: string;
  durationMs: number;
  success: boolean;
  status?: number;
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

const TOTAL_ORDERS = parseInt(getArg("--total", "20"), 10);
const CONCURRENCY = parseInt(getArg("--concurrency", "4"), 10);
const TARGET_URL = getArg("--url", "http://localhost:3002").replace(/\/$/, "");

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
  "Jardim do Lago", "Cidade Planejada I", "Henedina Cortez"
];

function generateRandomOrder(index: number): OrderPayload {
  const name = `${SAMPLE_NAMES[index % SAMPLE_NAMES.length]} (Teste #${index + 1})`;
  const bairro = SAMPLE_BAIRROS[index % SAMPLE_BAIRROS.length];
  const pizza = SAMPLE_PIZZAS[index % SAMPLE_PIZZAS.length];
  const qty = (index % 2) + 1;

  return {
    customer_name: name,
    customer_phone: `(11) 9${Math.floor(10000000 + Math.random() * 90000000)}`,
    customer_address: `Rua das Flores, ${100 + index} - Bairro ${bairro}, Bragança Paulista - SP`,
    payment_method: "Dinheiro",
    troco: 100,
    notes: `Pedido de teste automatizado de carga #${index + 1}`,
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

async function sendOrder(index: number): Promise<TestResult> {
  const payload = generateRandomOrder(index);
  const startTime = performance.now();

  try {
    // TanStack Start Server Function call via HTTP POST
    const res = await fetch(`${TARGET_URL}/_serverFn/createOrder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        data: payload
      }),
      signal: AbortSignal.timeout(10000)
    });

    const durationMs = Math.round(performance.now() - startTime);

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        orderId: data?.orderId || `order-${index + 1}`,
        durationMs,
        success: true,
        status: res.status
      };
    } else {
      const text = await res.text().catch(() => "Erro");
      return {
        durationMs,
        success: false,
        status: res.status,
        error: text.slice(0, 100)
      };
    }
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);
    return {
      durationMs,
      success: false,
      error: err?.message || "Timeout / Erro de Rede"
    };
  }
}

async function runStressTest() {
  console.log("\n=======================================================");
  console.log("   🍕 INICIANDO TESTE DE CARGA - PIZZARIA IMPÉRIO 🍕");
  console.log("=======================================================");
  console.log(`🎯 Alvo: ${TARGET_URL}`);
  console.log(`📦 Total de Pedidos: ${TOTAL_ORDERS}`);
  console.log(`⚡ Concorrência: ${CONCURRENCY} pedidos simultâneos`);
  console.log("=======================================================\n");

  const results: TestResult[] = [];
  const testStartTime = performance.now();
  let completedCount = 0;

  // Pool de execução com controle de concorrência
  const queue = Array.from({ length: TOTAL_ORDERS }, (_, i) => i);

  async function worker() {
    while (queue.length > 0) {
      const index = queue.shift();
      if (index === undefined) break;

      const result = await sendOrder(index);
      results.push(result);
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
  console.log("📈 Latências de Resposta do Servidor:");
  console.log(`   • Mínima:                  ${minLatency}ms`);
  console.log(`   • Média:                   ${avgLatency}ms`);
  console.log(`   • Mediana (p50):           ${p50}ms`);
  console.log(`   • Percentil 95% (p95):     ${p95}ms`);
  console.log(`   • Máxima:                  ${maxLatency}ms`);
  console.log("=======================================================");

  if (failed.length > 0) {
    console.log("\n⚠️ Amostra de Erros Encontrados:");
    failed.slice(0, 3).forEach((f, i) => {
      console.log(`   ${i + 1}. [Status ${f.status || "Erro"}] ${f.error}`);
    });
  } else {
    console.log("\n🎉 EXCELENTE! Todos os pedidos foram processados com 100% de sucesso!");
  }
  console.log("=======================================================\n");
}

runStressTest().catch(console.error);
