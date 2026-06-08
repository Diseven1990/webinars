const MODULES = [
  { order: 1, number: 'Módulo I', title: 'Teoria dos Videojogos' },
  { order: 2, number: 'Módulo II', title: 'Programação C#' },
  { order: 3, number: 'Módulo III', title: 'Introdução ao Unity' },
  { order: 4, number: 'Módulo IV', title: 'Físicas e Comportamentos' },
  { order: 5, number: 'Módulo V', title: 'Controlo de Objetos' },
  { order: 6, number: 'Módulo VI', title: 'Interface' },
  { order: 7, number: 'Módulo VII', title: 'Gráficos e Som' }
];

const SUPABASE_URL = "https://yymbsueuqglzikfshenn.supabase.co";
const SUPABASE_KEY = "sb_publishable_1vd_-hZR6wqilx39E-W8BA_fx9THigQ";

const MEMORY_SECONDS = 8;
const GAME_SECONDS = 120;
const QUIZ_TOTAL = 15;

const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const resultScreen = document.getElementById('resultScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const continueBtn = document.getElementById('continueBtn');
const cardsGrid = document.getElementById('cardsGrid');
const selectedStrip = document.getElementById('selectedStrip');
const countdownEl = document.getElementById('countdown');
const instructionEl = document.getElementById('instruction');
const timerEl = document.getElementById('timer');
const progressText = document.getElementById('progressText');
const errorsText = document.getElementById('errorsText');
const finalTime = document.getElementById('finalTime');
const finalErrors = document.getElementById('finalErrors');
const finalScore = document.getElementById('finalScore');
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownBig = document.getElementById('countdownBig');

let shuffledModules = [];
let expectedOrder = 1;
let errors = 0;
let gameStarted = false;
let timeLeft = GAME_SECONDS;
let timerId = null;
let memoryId = null;
let gameStartTimestamp = null;
let playerName = '';
let playerCenter = '';
let journeyStartTimestamp = null;
let quizCorrectCount = 0;
let quizAnsweredCount = 0;

const CENTERS = ['Lisboa', 'Porto', 'Coimbra', 'Faro', 'Braga', 'Central'];
const RANKING_KEY = 'levelup_unity_ranking_v1';
let showFullRanking = false;

// Mais tarde, quando criarmos a base de dados no Supabase, basta preencher estes dados
// e trocar as funções loadRankings/saveRankingEntry para usar fetch/Supabase REST.
const SUPABASE_CONFIG = {
  url: '',
  anonKey: '',
  table: 'rankings'
};

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const m = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const s = (safeSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function setScreen(screen) {
  startScreen?.classList.add('hidden');
  gameScreen?.classList.add('hidden');
  resultScreen?.classList.add('hidden');
  screen?.classList.remove('hidden');
}

function clearTimers() {
  if (timerId) clearInterval(timerId);
  if (memoryId) clearInterval(memoryId);
  timerId = null;
  memoryId = null;
}

function renderCards() {
  cardsGrid.innerHTML = '';

  shuffledModules.forEach((module) => {
    const card = document.createElement('button');
    card.className = 'card';
    card.type = 'button';
    card.dataset.order = module.order;
    card.setAttribute('aria-label', `${module.number} - ${module.title}`);

    card.innerHTML = `
      <span class="card-inner">
        <span class="card-face card-front">
          <span class="module-number">${module.number}</span>
          <span class="module-title">${module.title}</span>
        </span>
        <span class="card-face card-back">
          <span class="back-mark">LEVEL UP</span>
          <span class="back-sub">UNITY</span>
        </span>
      </span>
    `;

    card.addEventListener('click', () => handleCardClick(card, module));
    cardsGrid.appendChild(card);
  });
}

function startGame() {
  const nameInput = document.getElementById('playerName');
  const centerSelect = document.getElementById('playerCenter');
  playerName = (nameInput?.value || '').trim().replace(/\s+/g, ' ').slice(0, 28);
  playerCenter = centerSelect?.value || '';

  if (!playerName || !playerCenter) {
    const formError = document.getElementById('formError');
    if (formError) formError.textContent = 'Indica o nome e o centro para começar.';
    if ('vibrate' in navigator) navigator.vibrate(80);
    return;
  }

  clearTimers();
  journeyStartTimestamp = Date.now();
  quizCorrectCount = 0;
  quizAnsweredCount = 0;
  shuffledModules = shuffle(MODULES);
  expectedOrder = 1;
  errors = 0;
  gameStarted = false;
  timeLeft = GAME_SECONDS;
  gameStartTimestamp = null;

  setScreen(gameScreen);
  selectedStrip.innerHTML = '';
  timerEl.textContent = formatTime(GAME_SECONDS);
  progressText.textContent = '0/7';
  errorsText.textContent = '0';
  instructionEl.textContent = 'Memoriza a posição dos módulos';
  countdownEl.textContent = String(MEMORY_SECONDS);
  renderCards();
  startMemoryCountdown();
}

function startMemoryCountdown() {
  countdownEl.textContent = '';

  if (countdownOverlay) {
    countdownOverlay.classList.remove('hidden');
    countdownOverlay.innerHTML = `
      <div class="intro-message">
        <div class="intro-title">MEMORIZA E ORDENA<br>OS MÓDULOS</div>
        <div class="intro-subtitle">Tens 8 segundos para memorizar a posição dos módulos.</div>
      </div>
    `;
  }

  setTimeout(() => {
    let count = MEMORY_SECONDS;

    if (countdownOverlay) {
      countdownOverlay.innerHTML = `
        <div id="countdownBig" class="countdown-big">${MEMORY_SECONDS}</div>
        <div class="countdown-text">Memoriza a estrutura</div>
      `;
    }

    const countdownBigEl = () => document.getElementById('countdownBig');

    memoryId = setInterval(() => {
      count -= 1;
      const value = count > 0 ? String(count) : 'GO!';
      countdownEl.textContent = count > 0 ? String(count) : 'Começar';

      const el = countdownBigEl();
      if (el) el.textContent = value;

      if (count <= 0) {
        clearInterval(memoryId);
        memoryId = null;

        setTimeout(() => {
          countdownOverlay?.classList.add('hidden');
          flipCardsDown();
          setTimeout(beginPlayableRound, 420);
        }, 450);
      }
    }, 1000);
  }, 2000);
}

function flipCardsDown() {
  document.querySelectorAll('.card').forEach((card) => {
    card.classList.add('is-facedown');
  });
}

function beginPlayableRound() {
  gameStarted = true;
  instructionEl.textContent = 'Seleciona os módulos pela ordem correta';
  countdownEl.textContent = '';
  gameStartTimestamp = Date.now();

  timerId = setInterval(() => {
    timeLeft -= 1;
    timerEl.textContent = formatTime(timeLeft);
    if (timeLeft <= 0) finishGame(false);
  }, 1000);
}

function handleCardClick(card, module) {
  if (!gameStarted || card.classList.contains('disabled')) return;

  card.classList.remove('is-facedown');

  if (module.order === expectedOrder) {
    card.classList.add('correct');
    addSelectedChip(module);

    setTimeout(() => {
      card.classList.add('disabled');
    }, 220);

    expectedOrder += 1;
    progressText.textContent = `${expectedOrder - 1}/7`;

    if (expectedOrder > MODULES.length) {
      setTimeout(() => finishGame(true), 420);
    }
  } else {
    registerWrong(card);
  }
}

function addSelectedChip(module) {
  selectedStrip.innerHTML = '';
  const chip = document.createElement('div');
  chip.className = 'selected-chip selected-chip-highlight';
  chip.textContent = `✓ ${module.number} - ${module.title}`;
  selectedStrip.appendChild(chip);
  setTimeout(() => {
    if (chip.parentNode) chip.remove();
  }, 1800);
}

function registerWrong(card) {
  errors += 1;
  errorsText.textContent = String(errors);
  card.classList.add('wrong');
  document.getElementById('app')?.classList.add('shake');

  if ('vibrate' in navigator) navigator.vibrate(120);

  instructionEl.textContent = 'Ordem incorreta. Tenta novamente.';

  setTimeout(() => {
    resetSequence();
    instructionEl.textContent = 'Seleciona os módulos pela ordem correta';
  }, 750);
}

function resetSequence() {
  expectedOrder = 1;
  progressText.textContent = '0/7';
  selectedStrip.innerHTML = '';
  document.getElementById('app')?.classList.remove('shake');

  document.querySelectorAll('.card').forEach((card) => {
    card.classList.remove('correct', 'wrong', 'disabled');
    card.classList.add('is-facedown');
  });
}

function finishGame(completed) {
  clearTimers();
  gameStarted = false;

  const used = gameStartTimestamp ? Math.round((Date.now() - gameStartTimestamp) / 1000) : GAME_SECONDS;
  const score = completed ? Math.max(100, 1000 - (errors * 35) - used) : Math.max(0, 250 - (errors * 25));

  if (completed) {
    // Sem popup ou ecrã intermédio: passa diretamente para os conteúdos.
    setTimeout(showConcepts, 520);
    return;
  }

  finalTime.textContent = formatTime(Math.min(used, GAME_SECONDS));
  finalErrors.textContent = String(errors);
  finalScore.textContent = String(score);
  setScreen(resultScreen);
}

startBtn?.addEventListener('click', startGame);
restartBtn?.addEventListener('click', startGame);
continueBtn?.addEventListener('click', showConcepts);
window.addEventListener('beforeunload', clearTimers);

const concepts = [
  'Novo conteúdo',
  'Conteúdos atualizados',
  'Estrutura com 7 módulos',
  '7 casos práticos',
  '1 projeto final',
  '7 práticas',
  '7,5 horas de sessões práticas',
  'Introdução à Realidade Mista',
  'Controlos para VR',
  'Criação de Projetos VR',
  'Leitura de QR Codes para AR',
  'Otimização de Componentes Gráficos',
  'Conteúdos reorganizados'
];

const quizQuestions = [
  { q: 'O que significa VR?', correct: 'Realidade Virtual', wrong: ['Vídeo Rápido', 'Validação Remota', 'Versão Reduzida'] },
  { q: 'O que significa AR?', correct: 'Realidade Aumentada', wrong: ['Análise de Redes', 'Arquivo Remoto', 'Acesso Rápido'] },
  { q: 'O que é Realidade Mista?', correct: 'Combinação entre elementos reais e virtuais', wrong: ['Apenas vídeo em 2D', 'Um tipo de folha de cálculo', 'Um método de email marketing'] },
  { q: 'Para que servem os controlos de VR?', correct: 'Para interagir em ambientes virtuais', wrong: ['Para enviar newsletters', 'Para editar fotografias', 'Para gerir pagamentos'] },
  { q: 'O que é um projeto para VR?', correct: 'Uma experiência criada para Realidade Virtual', wrong: ['Um documento em PDF', 'Uma campanha de redes sociais', 'Uma folha de cálculo'] },
  { q: 'Para que podem servir QR Codes em AR?', correct: 'Para aceder a conteúdos aumentados', wrong: ['Para calcular impostos', 'Para enviar emails automáticos', 'Para criar passwords'] },
  { q: 'O que é otimização gráfica?', correct: 'Melhorar desempenho e qualidade visual', wrong: ['Apagar todos os gráficos', 'Trocar Unity por Excel', 'Criar apenas textos'] },
  { q: 'Quantos módulos tem a nova estrutura do curso?', correct: '7 módulos', wrong: ['5 módulos', '6 módulos', '8 módulos'] },
  { q: 'Quantos casos práticos fazem parte da estrutura?', correct: '7 casos práticos', wrong: ['3 casos práticos', '5 casos práticos', '10 casos práticos'] },
  { q: 'Quantas práticas foram destacadas?', correct: '7 práticas', wrong: ['4 práticas', '5 práticas', '9 práticas'] },
  { q: 'Quantas horas de sessões práticas foram destacadas?', correct: '7,5 horas', wrong: ['3 horas', '5 horas', '12 horas'] },
  { q: 'O curso inclui um projeto final?', correct: 'Sim, inclui 1 projeto final', wrong: ['Não inclui projeto final', 'Inclui apenas um teste teórico', 'Inclui apenas uma ficha de leitura'] },
  { q: 'Qual é a ferramenta central do curso?', correct: 'Unity', wrong: ['Excel', 'Canva', 'WordPress'] },
  { q: 'Que linguagem está associada à programação no curso?', correct: 'C#', wrong: ['PHP', 'HTML apenas', 'SQL'] },
  { q: 'Para que servem casos práticos?', correct: 'Para aplicar os conteúdos em situações concretas', wrong: ['Para substituir todos os módulos', 'Para eliminar a prática', 'Para decorar nomes de ferramentas'] },
  { q: 'Para que servem sessões práticas?', correct: 'Para treinar competências técnicas', wrong: ['Para evitar usar o Unity', 'Para ler apenas teoria', 'Para fazer tarefas comerciais'] },
  { q: 'Qual é o objetivo da estrutura por módulos?', correct: 'Organizar melhor o percurso formativo', wrong: ['Remover conteúdos práticos', 'Tornar o curso menos claro', 'Eliminar o projeto final'] },
  { q: 'O que significa conteúdo atualizado?', correct: 'Conteúdo revisto e adaptado à nova estrutura', wrong: ['Conteúdo eliminado', 'Conteúdo sem prática', 'Conteúdo apenas administrativo'] },
  { q: 'O que significa conteúdo novo?', correct: 'Conteúdo acrescentado ao curso', wrong: ['Conteúdo antigo sem alterações', 'Conteúdo removido', 'Conteúdo duplicado'] },
  { q: 'Qual destes temas está ligado a experiências imersivas?', correct: 'Realidade Mista', wrong: ['Contabilidade', 'Email marketing', 'Faturação'] },
  { q: 'Qual destes temas está ligado a Realidade Virtual?', correct: 'Controlos para VR', wrong: ['SEO local', 'Gestão de newsletters', 'Folhas de cálculo'] },
  { q: 'Qual destes temas está ligado a Realidade Aumentada?', correct: 'Leitura de QR Codes para AR', wrong: ['Criação de faturas', 'Gestão de email', 'Calendário editorial'] },
  { q: 'O que pode melhorar com a otimização gráfica?', correct: 'A fluidez e o desempenho visual', wrong: ['O preço do curso', 'A gestão de emails', 'A inscrição administrativa'] },
  { q: 'O que é uma interface num jogo?', correct: 'A zona de interação visual com o utilizador', wrong: ['Um relatório financeiro', 'Um contrato de formação', 'Uma campanha de anúncios'] },
  { q: 'O que são gráficos e som num jogo?', correct: 'Elementos visuais e áudio da experiência', wrong: ['Dados de faturação', 'Textos administrativos', 'Emails automáticos'] },
  { q: 'O que é controlo de objetos?', correct: 'Movimentação e interação com elementos do jogo', wrong: ['Gestão de centros formativos', 'Criação de contratos', 'Agendamento comercial'] },
  { q: 'O que são físicas num jogo?', correct: 'Regras de movimento, colisão e comportamento', wrong: ['Regras de faturação', 'Regras de email', 'Regras de SEO'] },
  { q: 'O que é teoria dos videojogos?', correct: 'Base conceptual sobre jogos e funcionamento', wrong: ['Gestão de salários', 'Marketing de moda', 'Arquivo documental'] },
  { q: 'O que é Programação C# no contexto do curso?', correct: 'Criação de lógica e comportamentos no Unity', wrong: ['Edição de fotografias', 'Gestão de campanhas', 'Criação de newsletters'] },
  { q: 'O que é Introdução ao Unity?', correct: 'Primeiro contacto com o ambiente e ferramentas Unity', wrong: ['Introdução ao Excel', 'Introdução a redes sociais', 'Introdução a faturação'] },
  { q: 'Porque é importante haver um projeto final?', correct: 'Para consolidar aprendizagens', wrong: ['Para evitar exercícios', 'Para substituir todos os módulos', 'Para retirar a componente técnica'] },
  { q: 'Porque é importante haver práticas?', correct: 'Para transformar teoria em aplicação', wrong: ['Para evitar contacto com ferramentas', 'Para reduzir aprendizagem', 'Para eliminar exercícios'] },
  { q: 'O que torna a atualização mais fácil de comunicar?', correct: 'Estrutura clara, conteúdos novos e mais prática', wrong: ['Menos informação e menos prática', 'Apenas mudança visual', 'Remoção dos conteúdos técnicos'] },
  { q: 'Qual é uma vantagem de falar em 7 módulos?', correct: 'Facilita explicar a organização do curso', wrong: ['Confunde a estrutura', 'Elimina a progressão', 'Substitui o Unity'] },
  { q: 'Qual é uma vantagem de destacar 7 casos práticos?', correct: 'Mostra aplicação real dos conteúdos', wrong: ['Mostra ausência de prática', 'Mostra que não há projeto final', 'Mostra que o curso é só teórico'] },
  { q: 'Qual é uma vantagem de referir 7,5 horas de sessões práticas?', correct: 'Ajuda a reforçar a componente acompanhada', wrong: ['Retira valor à prática', 'Elimina o acompanhamento', 'Substitui todos os conteúdos'] },
  { q: 'Que conceito se associa a objetos digitais no mundo real?', correct: 'Realidade Aumentada', wrong: ['Realidade Virtual apenas', 'Email marketing', 'SEO técnico'] },
  { q: 'Que conceito se associa a ambientes totalmente virtuais?', correct: 'Realidade Virtual', wrong: ['Realidade Aumentada apenas', 'Gestão documental', 'Marketing de moda'] },
  { q: 'Que conceito pode misturar o real e o virtual?', correct: 'Realidade Mista', wrong: ['Folha de cálculo', 'Relatório comercial', 'Campanha de email'] },
  { q: 'Qual destes conteúdos é novo ou reforçado?', correct: 'Criação de Projetos VR', wrong: ['Criação de newsletters', 'Gestão de anúncios Meta', 'Contabilidade avançada'] },
  { q: 'Qual destes conteúdos é novo ou reforçado?', correct: 'Leitura de QR Codes para AR', wrong: ['Tratamento de salários', 'Google Analytics', 'Gestão de inbox'] },
  { q: 'Qual destes conteúdos é novo ou reforçado?', correct: 'Otimização de Componentes Gráficos', wrong: ['Criação de posts no Canva', 'Gestão de CRM', 'Escrita de emails'] },
  { q: 'Qual destes conteúdos é novo ou reforçado?', correct: 'Introdução à Realidade Mista', wrong: ['Introdução ao Word', 'Introdução ao Excel', 'Introdução ao Photoshop'] },
  { q: 'Qual destes conteúdos é novo ou reforçado?', correct: 'Controlos para VR', wrong: ['Controlos de orçamento', 'Controlos de email', 'Controlos de redes sociais'] },
  { q: 'Qual destas opções resume melhor o relançamento?', correct: 'Mais organização, prática e conteúdos imersivos', wrong: ['Menos prática e menos clareza', 'Apenas alteração de nome', 'Fim da componente técnica'] },
  { q: 'O que deve um assessor reter sobre a atualização?', correct: 'Há nova estrutura e conteúdos reforçados', wrong: ['O curso deixou de usar Unity', 'O curso perdeu a prática', 'O curso não tem projeto final'] },
  { q: 'Qual é a melhor forma de explicar VR a um candidato?', correct: 'Experiências em ambientes virtuais', wrong: ['Vídeos para redes sociais', 'Validação de documentos', 'Vendas por telefone'] },
  { q: 'Qual é a melhor forma de explicar AR a um candidato?', correct: 'Conteúdos digitais sobre o mundo real', wrong: ['Relatórios automáticos', 'Emails em massa', 'Folhas de cálculo'] },
  { q: 'Qual é a melhor forma de explicar Realidade Mista?', correct: 'Integração entre real e virtual', wrong: ['Uma tabela de avaliação', 'Um formulário comercial', 'Um plano financeiro'] },
  { q: 'Qual destes pontos reforça a componente prática do curso?', correct: '7 práticas e 7 casos práticos', wrong: ['Apenas teoria', 'Sem exercícios', 'Sem projeto final'] },
  { q: 'Qual destes pontos reforça a conclusão do percurso?', correct: '1 projeto final', wrong: ['Um email automático', 'Uma campanha paga', 'Uma ficha administrativa'] }
];

function showConcepts() {
  clearTimers();
  document.body.innerHTML = `
    <main class="concept-stage" id="conceptStage">
      <div class="concept-watermark">UNITY</div>
      <section class="concept-card" id="conceptCard" role="button" tabindex="0" aria-label="Toca para continuar">
        <h1 class="concept-title" id="conceptTitle"></h1>
        <p class="concept-hint">Toca para avançar</p>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:14px;flex-wrap:wrap;">
</div>
</section>
    </main>
  `;

  let i = 0;
  const stage = document.getElementById('conceptStage');
  const card = document.getElementById('conceptCard');
  const title = document.getElementById('conceptTitle');
  let locked = false;

  function renderConcept() {
    if (i >= concepts.length) {
      stage.removeEventListener('click', nextConcept);
      window.removeEventListener('keydown', onKey);
      renderQuizIntro();
      return;
    }

    title.textContent = concepts[i];
    card.classList.remove('fade-in', 'fade-out');
    void card.offsetWidth;
    card.classList.add('fade-in');
  }

  function nextConcept() {
    if (locked) return;
    locked = true;
    card.classList.remove('fade-in');
    card.classList.add('fade-out');

    setTimeout(() => {
      i += 1;
      locked = false;
      renderConcept();
    }, 280);
  }

  function onKey(e) {
    if (e.key === 'Enter' || e.key === ' ') nextConcept();
  }

  stage.addEventListener('click', nextConcept);
  window.addEventListener('keydown', onKey);
  renderConcept();
}


function getElapsedJourneySeconds() {
  return journeyStartTimestamp ? Math.max(1, Math.round((Date.now() - journeyStartTimestamp) / 1000)) : 0;
}

function loadRankings() {
  try {
    return JSON.parse(localStorage.getItem(RANKING_KEY) || '[]');
  } catch (error) {
    return [];
  }
}

function saveRankingEntry(entry) {
  const rankings = loadRankings();
  rankings.push(entry);
  rankings.sort(compareRankingEntries);
  localStorage.setItem(RANKING_KEY, JSON.stringify(rankings.slice(0, 250)));
  return rankings;
}

function compareRankingEntries(a, b) {
  if (b.correct !== a.correct) return b.correct - a.correct;
  if (a.timeSeconds !== b.timeSeconds) return a.timeSeconds - b.timeSeconds;
  return new Date(a.createdAt) - new Date(b.createdAt);
}

function rankingToSupabasePayload(entry) {
  return {
    nome: entry.name,
    centro: entry.center,
    acertos: entry.correct,
    total: entry.total,
    tempo_segundos: entry.timeSeconds
  };
}

function rankingFromSupabaseRow(row) {
  return {
    id: row.id,
    name: row.nome || 'Assessor',
    center: row.centro || 'Sem centro',
    correct: Number(row.acertos || 0),
    total: Number(row.total || QUIZ_TOTAL),
    timeSeconds: Number(row.tempo_segundos || 0),
    createdAt: row.created_at || new Date().toISOString()
  };
}

async function saveRankingEntryRemote(entry) {
  const lookupUrl = new URL(`${SUPABASE_URL}/rest/v1/rankings`);
  lookupUrl.searchParams.set('select','*');
  lookupUrl.searchParams.set('nome',`eq.${entry.name}`);
  lookupUrl.searchParams.set('centro',`eq.${entry.center}`);
  const existingResponse = await fetch(lookupUrl.toString(), {
    headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}
  });
  const existing = existingResponse.ok ? await existingResponse.json() : [];
  const current = existing && existing.length ? existing[0] : null;

  if (current) {
    const betterScore =
      entry.correct > Number(current.acertos || 0) ||
      (entry.correct === Number(current.acertos || 0) &&
       entry.timeSeconds < Number(current.tempo_segundos || 999999));

    if (!betterScore) return rankingFromSupabaseRow(current);

    const patchUrl = `${SUPABASE_URL}/rest/v1/rankings?id=eq.${current.id}`;
    const patchResponse = await fetch(patchUrl,{
      method:'PATCH',
      headers:{
        apikey:SUPABASE_KEY,
        Authorization:`Bearer ${SUPABASE_KEY}`,
        'Content-Type':'application/json',
        Prefer:'return=representation'
      },
      body:JSON.stringify(rankingToSupabasePayload(entry))
    });
    if(!patchResponse.ok){
      const message = await patchResponse.text();
      throw new Error(`Erro ao atualizar ranking: ${patchResponse.status} ${message}`);
    }
    const data = await patchResponse.json();
    return rankingFromSupabaseRow(data[0]);
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rankings`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(rankingToSupabasePayload(entry))
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Erro ao gravar no Supabase: ${response.status} ${message}`);
  }

  const data = await response.json();
  return rankingFromSupabaseRow(data[0]);
}

async function loadRankingsRemote() {
  const url = new URL(`${SUPABASE_URL}/rest/v1/rankings`);
  url.searchParams.set('select', '*');
  url.searchParams.set('order', 'acertos.desc,tempo_segundos.asc,created_at.asc');
  url.searchParams.set('limit', '250');

  const response = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Erro ao ler ranking do Supabase: ${response.status} ${message}`);
  }

  const data = await response.json();
  return data.map(rankingFromSupabaseRow).sort(compareRankingEntries);
}

function badgeForScore(correct) {
  if (correct >= 15) return { label: 'Mestre Unity', icon: '🥇' };
  if (correct >= 12) return { label: 'Especialista Unity', icon: '🥈' };
  if (correct >= 8) return { label: 'Explorador Unity', icon: '🥉' };
  return { label: 'Em progresso', icon: '🎮' };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function rankingPosition(rankings, entryId, center = null) {
  const list = center ? rankings.filter((item) => item.center === center) : rankings;
  return list.findIndex((item) => item.id === entryId) + 1;
}

function renderRankingList(rankings, filterCenter = 'Nacional') {
  const list = (filterCenter === 'Nacional' ? rankings : rankings.filter((item) => item.center === filterCenter)).slice(0, showFullRanking ? 1000 : 10);
  if (!list.length) {
    return '<div class="empty-ranking">Ainda não há resultados neste ranking.</div>';
  }

  return list.map((item, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
    return `
      <article class="ranking-row ${item.isCurrent ? 'current-player' : ''}">
        <div class="ranking-position">${medal}</div>
        <div class="ranking-main">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.center)}</span>
        </div>
        <div class="ranking-score">
          <strong>${item.correct}/${item.total}</strong>
          <span>${formatTime(item.timeSeconds)}</span>
        </div>
      </article>
    `;
  }).join('');
}

async function renderFinalRanking(entry) {
  document.body.innerHTML = `
    <main class="ranking-shell">
      <section class="result-summary">
        <div class="quiz-kicker">LevelUp: Unity Quizz</div>
        <h1>A gravar<br>resultado...</h1>
        <p class="position-copy">A ligar ao ranking geral.</p>
      </section>
    </main>
  `;

  let savedEntry = entry;
  let rankings = [];
  let warning = '';

  try {
    savedEntry = await saveRankingEntryRemote(entry);
    rankings = await loadRankingsRemote();
  } catch (error) {
    console.error(error);
    warning = 'Não foi possível ligar ao Supabase. A mostrar ranking local neste dispositivo.';
    rankings = saveRankingEntry(entry);
  }

  rankings = rankings
    .sort(compareRankingEntries)
    .map((item) => ({ ...item, isCurrent: item.id === savedEntry.id }));

  const nationalPos = rankingPosition(rankings, savedEntry.id);
  const centerPos = rankingPosition(rankings, savedEntry.id, savedEntry.center);
  const badge = badgeForScore(savedEntry.correct);

  document.body.innerHTML = `
    <main class="ranking-shell">
      <section class="result-summary">
        <div class="quiz-kicker">LevelUp: Unity Quizz</div>
        <h1>${badge.icon}<br>${badge.label}</h1>
        <div class="summary-grid">
          <div><span>Acertos</span><strong>${savedEntry.correct}/${savedEntry.total}</strong></div>
          <div><span>Tempo</span><strong>${formatTime(savedEntry.timeSeconds)}</strong></div>
        </div>
        <p class="position-copy">A tua posição: <strong>#${nationalPos || '-'} Nacional</strong> · <strong>#${centerPos || '-'} ${escapeHtml(savedEntry.center)}</strong></p>
        ${warning ? `<p class="ranking-warning">${warning}</p>` : ''}
      </section>

      <section class="ranking-panel">
        <div class="ranking-head">
          <h2>Ranking</h2>
          <p>Critério: mais acertos. Em empate, menor tempo.</p>
        </div>

        <div class="ranking-filters" id="rankingFilters"></div>
        <div class="ranking-list" id="rankingList"></div>
        <div class="ranking-actions">
          <button class="primary-btn" id="playAgainBtn" type="button">Voltar a jogar</button>
        </div>
      </section>
    </main>
  `;

  attachRankingControls(rankings, { defaultFilter: 'Nacional' });
  document.getElementById('playAgainBtn')?.addEventListener('click', bootHome);
}

function renderQuizIntro() {
  document.body.innerHTML = `
    <main class="quiz-shell intro">
      <section class="quiz-panel">
        <div class="quiz-kicker">LevelUp</div>
        <h1 class="quiz-logo">Unity<br><span>Quizz</span></h1>
      </section>
    </main>`;
  setTimeout(startQuiz, 1100);
}

function buildQuestion(rawQuestion) {
  const answers = shuffle([
    { text: rawQuestion.correct, correct: true },
    ...rawQuestion.wrong.map((text) => ({ text, correct: false }))
  ]);
  return { q: rawQuestion.q, answers };
}

function startQuiz() {
  const qs = shuffle(quizQuestions).slice(0, QUIZ_TOTAL).map(buildQuestion);
  let idx = 0;
  quizCorrectCount = 0;
  quizAnsweredCount = 0;
  let locked = false;

  function renderQuestion() {
    locked = false;
    const q = qs[idx];

    document.body.innerHTML = `
      <main class="quiz-shell">
        <section class="quiz-panel">
          <header class="quiz-header">
            <div>
              <div class="quiz-kicker">LevelUp: Unity Quizz</div>
              <div class="quiz-counter">Pergunta ${idx + 1}/${QUIZ_TOTAL}</div>
            </div>
          </header>

          <div class="quiz-progress" aria-hidden="true">
            <span style="width:${((idx + 1) / QUIZ_TOTAL) * 100}%"></span>
          </div>

          <h1 class="quiz-question">${q.q}</h1>
          <div class="quiz-feedback" id="quizFeedback" aria-live="polite"></div>
          <div class="quiz-answers" id="quizAnswers"></div>
        </section>
      </main>
    `;

    const answers = document.getElementById('quizAnswers');
    const feedback = document.getElementById('quizFeedback');

    q.answers.forEach((answer, answerIndex) => {
      const button = document.createElement('button');
      button.className = 'quiz-answer';
      button.type = 'button';
      button.innerHTML = `
        <span class="answer-letter">${String.fromCharCode(65 + answerIndex)}</span>
        <span class="answer-text">${answer.text}</span>
      `;

      button.addEventListener('click', () => {
        if (locked) return;
        locked = true;

        const allButtons = [...answers.querySelectorAll('.quiz-answer')];
        allButtons.forEach((btn) => btn.disabled = true);

        const correctIndex = q.answers.findIndex((item) => item.correct);

        if (answer.correct) {
          quizCorrectCount += 1;
          button.classList.add('correct-answer');
          feedback.textContent = 'Certo';
          feedback.className = 'quiz-feedback is-correct';
        } else {
          button.classList.add('wrong-answer');
          allButtons[correctIndex]?.classList.add('correct-answer');
          feedback.textContent = 'Errado';
          feedback.className = 'quiz-feedback is-wrong';
          if ('vibrate' in navigator) navigator.vibrate(110);
        }

        setTimeout(() => {
          quizAnsweredCount += 1;
          idx += 1;
          if (idx < qs.length) renderQuestion();
          else renderQuizEnd();
        }, 900);
      });

      answers.appendChild(button);
    });
  }

  renderQuestion();
}

function renderQuizEnd() {
  const entry = {
    id: (crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`),
    name: playerName || 'Assessor',
    center: playerCenter || 'Sem centro',
    correct: quizCorrectCount,
    total: QUIZ_TOTAL,
    timeSeconds: getElapsedJourneySeconds(),
    createdAt: new Date().toISOString()
  };

  void renderFinalRanking(entry);
}


function bootHome() {
  window.location.reload();
}

function attachRankingControls(rankings, options = {}) {
  const filters = ['Nacional', ...CENTERS];
  const filtersEl = document.getElementById('rankingFilters');
  const listEl = document.getElementById('rankingList');
  if (!filtersEl || !listEl) return;

  function setFilter(filter) {
    filtersEl.querySelectorAll('button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    listEl.innerHTML = renderRankingList(rankings, filter);
  }

  filters.forEach((filter) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = filter;
    btn.dataset.filter = filter;
    btn.addEventListener('click', () => setFilter(filter));
    filtersEl.appendChild(btn);
  });

  setFilter(options.defaultFilter || 'Nacional');
}

function renderRankingShell({ title = 'Ranking', subtitle = 'Critério: mais acertos. Em empate, menor tempo.', showBack = false, showReplay = false, warning = '' } = {}) {
  document.body.innerHTML = `
    <main class="ranking-shell">
      <section class="ranking-panel ranking-full-panel">
        <div class="ranking-head">
          <div class="quiz-kicker">LevelUp: Unity Quizz</div>
          <h2>${title}</h2>
          <p>${subtitle}</p>
          ${warning ? `<p class="ranking-warning">${warning}</p>` : ''}
        </div>

        <div class="ranking-filters" id="rankingFilters"></div>
        <div class="ranking-list" id="rankingList"></div>

        <div class="ranking-actions">
          ${showBack ? '<button class="ghost-btn" id="backHomeBtn" type="button">Voltar</button>' : ''}
          ${showReplay ? '<button class="primary-btn" id="playAgainBtn" type="button">Voltar a jogar</button>' : ''}
        </div>
      </section>
    </main>
  `;

  document.getElementById('backHomeBtn')?.addEventListener('click', bootHome);
  document.getElementById('playAgainBtn')?.addEventListener('click', bootHome);
}

async function showInitialRanking() {
  renderRankingShell({
    title: 'Hall of Fame',
    subtitle: 'Ranking geral dos assessores. Mais acertos, menor tempo.',
    showBack: true,
    showReplay: true
  });

  const listEl = document.getElementById('rankingList');
  if (listEl) listEl.innerHTML = '<div class="empty-ranking">A carregar ranking...</div>';

  let rankings = [];
  let warning = '';
  try {
    rankings = await loadRankingsRemote();
  } catch (error) {
    console.error(error);
    warning = 'Não foi possível ligar ao Supabase. A mostrar ranking local neste dispositivo.';
    rankings = loadRankings().sort(compareRankingEntries);
  }

  if (warning) {
    const head = document.querySelector('.ranking-head');
    head?.insertAdjacentHTML('beforeend', `<p class="ranking-warning">${warning}</p>`);
  }

  attachRankingControls(rankings, { defaultFilter: 'Nacional' });
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('viewRankingBtn');
  if (btn) btn.addEventListener('click', showInitialRanking);
});
