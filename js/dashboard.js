const SUPABASE_URL = "https://yymbsueuqglzikfshenn.supabase.co";
const SUPABASE_KEY = "sb_publishable_1vd_-hZR6wqilx39E-W8BA_fx9THigQ";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const TOTAL_CRITERIOS = 6;
let grafico = null;
let cacheResultados = [];

const participantesEl = document.getElementById("participantes");
const mediaEl = document.getElementById("media");
const percentagemEl = document.getElementById("percentagem");
const melhorEl = document.getElementById("melhor");
const respostasCompletasEl = document.getElementById("respostasCompletas");
const bonsResultadosEl = document.getElementById("bonsResultados");
const resultadosMaximosEl = document.getElementById("resultadosMaximos");
const tabelaBody = document.querySelector("#tabelaResultados tbody");
const estadoEl = document.getElementById("estadoDashboard");
const refreshBtn = document.getElementById("refreshBtn");
const exportBtn = document.getElementById("exportCSV");

function formatarData(valor) {
  if (!valor) return "-";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "-";
  return data.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function limparTextoCSV(valor) {
  return `"${String(valor ?? "").replaceAll('"', '""')}"`;
}

function mostrarEstado(mensagem, tipo = "info") {
  estadoEl.textContent = mensagem;
  estadoEl.dataset.tipo = tipo;
}

async function carregarResultados() {
  mostrarEstado("A atualizar resultados...");

  const { data, error } = await client
    .from("respostas")
    .select("nome, curso, pontuacao, total_criterios, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro Supabase:", error);
    mostrarEstado("Não foi possível carregar os resultados. Confirma as policies do Supabase.", "erro");
    tabelaBody.innerHTML = `<tr><td colspan="4">Erro ao carregar resultados.</td></tr>`;
    return;
  }

  cacheResultados = data || [];
  atualizarDashboard(cacheResultados);
  mostrarEstado("Resultados atualizados.", "sucesso");
}

function atualizarDashboard(resultados) {
  const total = resultados.length;
  const soma = resultados.reduce((acc, item) => acc + Number(item.pontuacao || 0), 0);
  const media = total ? soma / total : 0;
  const percentagem = total ? (media / TOTAL_CRITERIOS) * 100 : 0;
  const melhor = total ? Math.max(...resultados.map(item => Number(item.pontuacao || 0))) : 0;
  const bons = resultados.filter(item => Number(item.pontuacao || 0) >= 4).length;
  const maximos = resultados.filter(item => Number(item.pontuacao || 0) === TOTAL_CRITERIOS).length;

  participantesEl.textContent = total;
  mediaEl.textContent = `${media.toFixed(1).replace(".", ",")} / ${TOTAL_CRITERIOS}`;
  percentagemEl.textContent = `${Math.round(percentagem)}%`;
  melhorEl.textContent = `${melhor} / ${TOTAL_CRITERIOS}`;
  respostasCompletasEl.textContent = total;
  bonsResultadosEl.textContent = bons;
  resultadosMaximosEl.textContent = maximos;

  atualizarTabela(resultados);
  atualizarGrafico(resultados);
}

function atualizarTabela(resultados) {
  if (!resultados.length) {
    tabelaBody.innerHTML = `<tr><td colspan="4">Ainda não existem respostas registadas.</td></tr>`;
    return;
  }

  tabelaBody.innerHTML = resultados.map(item => {
    const pontuacao = Number(item.pontuacao || 0);
    return `
      <tr>
        <td>${item.nome || "-"}</td>
        <td>${item.curso || "-"}</td>
        <td><span class="score-pill">${pontuacao}/${TOTAL_CRITERIOS}</span></td>
        <td>${formatarData(item.created_at)}</td>
      </tr>
    `;
  }).join("");
}

function atualizarGrafico(resultados) {
  const distribuicao = Array.from({ length: TOTAL_CRITERIOS + 1 }, (_, pontuacao) => {
    return resultados.filter(item => Number(item.pontuacao || 0) === pontuacao).length;
  });

  const labels = distribuicao.map((_, pontuacao) => `${pontuacao}/${TOTAL_CRITERIOS}`);
  const ctx = document.getElementById("graficoPontuacoes");

  if (grafico) {
    grafico.data.labels = labels;
    grafico.data.datasets[0].data = distribuicao;
    grafico.update();
    return;
  }

  grafico = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Formandos",
        data: distribuicao,
        borderWidth: 1,
        borderRadius: 10
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}

function exportarCSV() {
  if (!cacheResultados.length) {
    mostrarEstado("Ainda não existem dados para exportar.", "erro");
    return;
  }

  const linhas = [
    ["Nome", "Curso", "Pontuação", "Total", "Data"].map(limparTextoCSV).join(","),
    ...cacheResultados.map(item => [
      item.nome,
      item.curso,
      item.pontuacao,
      item.total_criterios || TOTAL_CRITERIOS,
      formatarData(item.created_at)
    ].map(limparTextoCSV).join(","))
  ];

  const blob = new Blob([linhas.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "resultados-ugc.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  mostrarEstado("CSV exportado.", "sucesso");
}

refreshBtn?.addEventListener("click", carregarResultados);
exportBtn?.addEventListener("click", exportarCSV);

carregarResultados();
