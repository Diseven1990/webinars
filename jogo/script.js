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

const CENTERS = ['Lisboa', 'Porto', 'Coimbra', 'Faro', 'Braga', 'Televendas'];
const RANKING_KEY = 'levelup_unity_ranking_v1';

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
  let count = MEMORY_SECONDS;
  countdownEl.textContent = String(count);

  if (countdownOverlay && countdownBig) {
    countdownOverlay.classList.remove('hidden');
    countdownBig.textContent = String(count);
  }

  memoryId = setInterval(() => {
    count -= 1;
    const value = count > 0 ? String(count) : 'GO!';
    countdownEl.textContent = count > 0 ? String(count) : 'Começar';
    if (countdownBig) countdownBig.textContent = value;

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
  const chip = document.createElement('div');
  chip.className = 'selected-chip';
  chip.textContent = `✓ ${module.number} - ${module.title}`;
  selectedStrip.appendChild(chip);
  chip.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
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
  { q: 'Quantos módulos tem a nova estrutura do curso?', correct: '7 módulos', wrong: ['5 módulos', '6 módulos', '8 módulos'] },
  { q: 'O que foi reforçado na atualização do curso?', correct: 'Conteúdos novos e atualizados', wrong: ['Apenas conteúdos teóricos', 'Remoção das práticas', 'Substituição do Unity por Photoshop'] },
  { q: 'Quantos casos práticos foram destacados na atualização?', correct: '7 casos práticos', wrong: ['3 casos práticos', '5 casos práticos', '10 casos práticos'] },
  { q: 'Que elemento final foi incluído para consolidar aprendizagens?', correct: '1 projeto final', wrong: ['1 exame oral', '1 plano editorial', '1 relatório financeiro'] },
  { q: 'Quantas práticas foram destacadas na nova estrutura?', correct: '7 práticas', wrong: ['4 práticas', '5 práticas', '9 práticas'] },
  { q: 'Quantas horas de sessões práticas foram destacadas?', correct: '7,5 horas', wrong: ['3 horas', '5 horas', '12 horas'] },
  { q: 'Qual destes temas faz parte dos conteúdos novos?', correct: 'Introdução à Realidade Mista', wrong: ['Introdução ao Excel', 'Introdução ao Photoshop', 'Introdução ao Email Marketing'] },
  { q: 'Que tipo de controlos foi acrescentado aos conteúdos?', correct: 'Controlos para VR', wrong: ['Controlos para newsletters', 'Controlos para folhas de cálculo', 'Controlos para CRM comercial'] },
  { q: 'Que tipo de projeto é trabalhado nos novos conteúdos?', correct: 'Projeto para VR', wrong: ['Projeto de e-commerce', 'Projeto de copywriting', 'Projeto de contabilidade'] },
  { q: 'Que recurso é referido na componente de AR?', correct: 'Leitura de QR Codes', wrong: ['Criação de hashtags', 'Gestão de anúncios', 'Edição de newsletters'] },
  { q: 'Que área técnica foi reforçada para melhorar desempenho visual?', correct: 'Otimização de componentes gráficos', wrong: ['Automação de emails', 'Gestão documental', 'Pesquisa de palavras-chave'] },
  { q: 'O que significa VR neste contexto?', correct: 'Realidade Virtual', wrong: ['Vendas Rápidas', 'Vídeo Responsivo', 'Validação Remota'] },
  { q: 'O que significa AR neste contexto?', correct: 'Realidade Aumentada', wrong: ['Análise de Redes', 'Automação de Relatórios', 'Arquivo Remoto'] },
  { q: 'Qual destas opções está mais ligada a experiências imersivas?', correct: 'Realidade Mista', wrong: ['Folhas de cálculo', 'Email marketing', 'Gestão de redes sociais'] },
  { q: 'Qual destas opções se relaciona com dispositivos imersivos?', correct: 'Controlos para VR', wrong: ['Segmentação de anúncios', 'Planeamento editorial', 'Gestão de leads'] },
  { q: 'Qual é uma vantagem de estruturar o curso em módulos?', correct: 'Facilitar a compreensão do percurso formativo', wrong: ['Eliminar a prática', 'Reduzir a componente técnica', 'Remover o projeto final'] },
  { q: 'Qual destas opções resume melhor a atualização?', correct: 'Mais estrutura, prática e conteúdos imersivos', wrong: ['Menos prática e mais teoria isolada', 'Apenas redes sociais', 'Apenas design gráfico'] },
  { q: 'Que ferramenta central continua a orientar o curso?', correct: 'Unity', wrong: ['Excel', 'WordPress', 'Canva'] },
  { q: 'Que linguagem está associada à programação no curso?', correct: 'C#', wrong: ['PHP', 'SQL', 'HTML apenas'] },
  { q: 'Qual destas áreas faz sentido num curso de videojogos em Unity?', correct: 'Físicas e Comportamentos', wrong: ['Fiscalidade', 'Gestão de recursos humanos', 'Contabilidade'] },
  { q: 'Qual destes temas está mais associado à experiência do utilizador no jogo?', correct: 'Interface', wrong: ['Arquivo documental', 'Faturação', 'Email institucional'] },
  { q: 'Qual destes temas está ligado ao ambiente visual e sonoro?', correct: 'Gráficos e Som', wrong: ['Google Analytics', 'Gestão de cobranças', 'Atendimento telefónico'] },
  { q: 'Qual destas opções está ligada à criação de interações no jogo?', correct: 'Controlo de Objetos', wrong: ['Gestão de campanhas', 'Processamento salarial', 'Planeamento de posts'] },
  { q: 'Qual destes temas está ligado à base conceptual dos jogos?', correct: 'Teoria dos Videojogos', wrong: ['Marketing de moda', 'Gestão fiscal', 'Suporte administrativo'] },
  { q: 'Qual destas opções descreve melhor um projeto final?', correct: 'Aplicação prática dos conteúdos aprendidos', wrong: ['Resumo sem componente prática', 'Exercício sem Unity', 'Texto comercial do curso'] },
  { q: 'Porque é relevante incluir casos práticos?', correct: 'Ajudam a aplicar os conteúdos em situações concretas', wrong: ['Substituem todos os módulos', 'Eliminam a necessidade de prática', 'Servem apenas para avaliação comercial'] },
  { q: 'O que se pretende com sessões práticas?', correct: 'Treinar competências técnicas com orientação', wrong: ['Ler apenas documentação', 'Evitar uso do Unity', 'Trocar videojogos por redes sociais'] },
  { q: 'Que conteúdo aproxima o curso de experiências imersivas atuais?', correct: 'Realidade Mista', wrong: ['Email marketing', 'Excel financeiro', 'SEO local'] },
  { q: 'A leitura de QR Codes está associada a que área?', correct: 'Realidade Aumentada', wrong: ['Email marketing', 'WordPress', 'Contabilidade'] },
  { q: 'Qual destas opções é uma tecnologia imersiva?', correct: 'VR', wrong: ['CSV', 'PDF', 'SMTP'] },
  { q: 'Qual destas opções está associada a objetos digitais sobre o mundo real?', correct: 'AR', wrong: ['TXT', 'CRM', 'SEO'] },
  { q: 'Otimizar componentes gráficos ajuda sobretudo a melhorar o quê?', correct: 'Desempenho e qualidade visual', wrong: ['Gestão de emails', 'Taxas de IVA', 'Publicação em redes sociais'] },
  { q: 'Qual destes conteúdos aponta para criação de experiências em óculos/dispositivos imersivos?', correct: 'Projeto para VR', wrong: ['Plano de comunicação', 'Newsletter comercial', 'Relatório de vendas'] },
  { q: 'O que torna a atualização mais fácil de apresentar aos candidatos?', correct: 'Estrutura clara e organizada', wrong: ['Menos informação sobre práticas', 'Ausência de projeto final', 'Fim dos conteúdos técnicos'] },
  { q: 'Que frase descreve melhor a nova organização?', correct: 'Curso organizado em 7 módulos', wrong: ['Curso sem módulos', 'Curso apenas introdutório', 'Curso sem componente prática'] },
  { q: 'Que componente reforça a ligação entre teoria e execução?', correct: 'Casos práticos', wrong: ['Apenas leitura', 'Apenas teste final', 'Apenas apresentação comercial'] },
  { q: 'Que componente reforça a consolidação no fim do percurso?', correct: 'Projeto final', wrong: ['Remoção de exercícios', 'Ficha de inscrição', 'Newsletter'] },
  { q: 'Qual destas opções é conteúdo técnico de Unity?', correct: 'Otimização de componentes gráficos', wrong: ['Google Ads', 'Canva para redes sociais', 'Mailchimp'] },
  { q: 'Qual destas opções está ligada ao desenvolvimento de videojogos?', correct: 'Programação C#', wrong: ['Gestão de perfis LinkedIn', 'Análise de concorrência', 'Plano de conteúdos'] },
  { q: 'Qual destes elementos é importante para criar menus e ecrãs no jogo?', correct: 'Interface', wrong: ['IVA', 'Funil de vendas', 'Calendário editorial'] },
  { q: 'Qual destas áreas está ligada a movimento, colisões e comportamentos?', correct: 'Físicas e Comportamentos', wrong: ['E-mail marketing', 'SEO técnico', 'Gestão de eventos'] },
  { q: 'Qual destes temas ajuda a perceber o funcionamento e evolução dos jogos?', correct: 'Teoria dos Videojogos', wrong: ['Gestão financeira', 'Comunicação interna', 'Design editorial'] },
  { q: 'Qual é o foco principal da atualização apresentada?', correct: 'Reforçar conteúdos, prática e estrutura', wrong: ['Reduzir o curso a teoria', 'Eliminar Unity', 'Trocar videojogos por multimédia geral'] },
  { q: 'Que opção não pertence ao conjunto de novidades indicadas?', correct: 'Contabilidade avançada', wrong: ['Realidade Mista', 'Controlos para VR', 'Leitura de QR Codes para AR'] },
  { q: 'Qual destes conteúdos ajuda a ligar físico e digital?', correct: 'Leitura de QR Codes para AR', wrong: ['Criação de emails', 'Gestão de folhas Excel', 'Publicação de stories'] },
  { q: 'Que tipo de aprendizagem é reforçada com 7 práticas?', correct: 'Aprendizagem aplicada', wrong: ['Aprendizagem apenas passiva', 'Aprendizagem sem exercícios', 'Aprendizagem só teórica'] },
  { q: 'Qual é a melhor forma de explicar a atualização a um assessor?', correct: 'Nova estrutura, novos conteúdos e mais prática', wrong: ['Menos conteúdos e menos prática', 'Apenas mudança de nome', 'Apenas alteração visual'] },
  { q: 'Qual destas opções está mais associada à criação dentro do Unity?', correct: 'Controlo de objetos e comportamentos', wrong: ['Criação de campanhas Meta Ads', 'Gestão de newsletters', 'Tratamento de folhas de pagamento'] },
  { q: 'Que conteúdo novo pode ser associado a experiências imersivas em ambientes virtuais?', correct: 'Criação de um projeto para VR', wrong: ['Criação de um blog', 'Criação de uma campanha de email', 'Criação de um plano de SEO'] },
  { q: 'Que conteúdo novo pode ser associado a experiências sobrepostas ao mundo real?', correct: 'QR Codes para AR', wrong: ['Google Sheets', 'Photoshop básico', 'Gestão de contactos'] },
  { q: 'Qual destas opções está alinhada com o relançamento do curso?', correct: 'Conteúdos reorganizados e atualizados', wrong: ['Curso sem projeto final', 'Curso sem sessões práticas', 'Curso sem Unity'] }
];

function showConcepts() {
  clearTimers();
  document.body.innerHTML = `
    <main class="concept-stage" id="conceptStage">
      <div class="concept-watermark">UNITY</div>
      <section class="concept-card" id="conceptCard" role="button" tabindex="0" aria-label="Toca para continuar">
        <h1 class="concept-title" id="conceptTitle"></h1>
        <p class="concept-hint">Toca para avançar</p>
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
  const list = (filterCenter === 'Nacional' ? rankings : rankings.filter((item) => item.center === filterCenter)).slice(0, 10);
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
