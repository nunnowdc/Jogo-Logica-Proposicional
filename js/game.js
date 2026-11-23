/* =====================================================================
   game.js — Telas, interação e regras do "Circuito do Conectivo"
   ---------------------------------------------------------------------
   Este arquivo NÃO calcula lógica por conta própria: toda avaliação de
   fórmula vem do logic.js. Aqui ficam o menu, o HUD, os interruptores,
   o desenho do circuito, o drag-and-drop, as estrelas e o progresso.
   ===================================================================== */
'use strict';

/* ---------- Atalhos de DOM ---------- */
const $ = (sel) => document.querySelector(sel);

function el(tag, classe, conteudo) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (conteudo !== undefined) e.textContent = conteudo;
  return e;
}

/* ---------- Textos de introdução das etapas ---------- */
const INTRO_ETAPAS = {
  1: {
    titulo: 'Etapa 1 · Interruptores',
    resumo: 'O circuito já está montado. Ligue e desligue interruptores até a lâmpada acender.',
    itens: [
      'Clique em um interruptor para alternar entre <b class="txt-v">V</b> e <b class="txt-f">F</b>. Cada clique conta como uma jogada.',
      'As portas destacam os resultados por cor, sem exibir caixas com valores sobre o circuito.',
      'A lâmpada acende quando a fórmula inteira é V, e aí a porta abre.',
      'Se as jogadas acabarem com a lâmpada apagada, o circuito entra em curto e você recomeça.',
      'Você tem 120 segundos por fase. Menos jogadas rendem mais estrelas; consultar a tabela-verdade custa 1 estrela.',
    ],
  },
  2: {
    titulo: 'Etapa 2 · Construção',
    resumo: 'Os interruptores estão travados. Encaixe conectivos e variáveis para completar o circuito.',
    itens: [
      'Arraste uma peça da bandeja até um encaixe tracejado. No celular: toque na peça e depois no encaixe.',
      'Toque numa peça já encaixada para devolvê-la à bandeja.',
      'Encaixes pequenos <b>[¬]</b> são opcionais: aceitam uma negação ou podem ficar vazios.',
      'Cada peça tem quantidade limitada. Algumas fases exigem que o circuito funcione em mais de uma sala ou em TODAS as linhas da tabela-verdade.',
      'Cada peça colocada conta como jogada: acertar com menos peças vale mais estrelas.',
    ],
  },
  3: {
    titulo: 'Etapa 3 · Equivalência lógica',
    resumo: 'Um circuito queimou. Escolha os substitutos que dão o MESMO resultado em todas as combinações.',
    itens: [
      'Duas fórmulas são <b>equivalentes</b> (≡) quando têm a mesma tabela-verdade: o mesmo valor em TODAS as linhas.',
      'Toque num circuito candidato para instalá-lo. Se ele for equivalente ao original, fica verde.',
      'Se não for, o jogo mostra um <b>contraexemplo</b>: uma combinação de valores em que os dois circuitos discordam.',
      'Algumas fases têm mais de um substituto válido: a porta só abre quando você encontrar todos.',
      'Cada escolha conta como tentativa. Sem erros, você ganha 3 estrelas; consultar a tabela-verdade custa 1 estrela.',
    ],
  },
};

/* ---------- Progresso salvo (localStorage com try/catch) ----------
   Cada nome de jogador tem o próprio perfil (estrelas + introduções
   vistas), tudo salvo NESTE navegador. O ranking é calculado a partir
   dos perfis, então ninguém herda as estrelas de outra pessoa.
   Sem nome salvo, o jogador é "visitante" e não entra no ranking.    */
const CHAVE_PERFIS = 'circuito-do-conectivo-perfis-v2';
const CHAVE_SAVE_ANTIGO = 'circuito-do-conectivo-v1';   // formato antigo (um só progresso)
const CHAVE_JOGADOR = 'circuito-do-conectivo-jogador-v1';
const TEMPO_POR_FASE = 120;
const PENALIDADE_ERRO = 15;   // segundos somados por jogada além do mínimo (partida local)

function chavePerfil(nome) { return nome.trim().toLocaleLowerCase(); }

function somaEstrelas(estrelas) {
  return Object.values(estrelas || {}).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
}

function carregarNomeJogador() {
  try { return (localStorage.getItem(CHAVE_JOGADOR) || '').trim().slice(0, 24); } catch (e) { return ''; }
}

function carregarPerfis() {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE_PERFIS) || 'null');
    if (dados && typeof dados === 'object' && !Array.isArray(dados)) return dados;
    // Primeira vez nesta versão: o progresso antigo passa para o nome salvo
    const antigo = JSON.parse(localStorage.getItem(CHAVE_SAVE_ANTIGO) || 'null');
    if (antigo && antigo.estrelas) {
      const nome = carregarNomeJogador();
      return { [chavePerfil(nome)]: { nome: nome, estrelas: antigo.estrelas, introVista: antigo.introVista || {} } };
    }
  } catch (e) { /* navegador sem acesso ao armazenamento: segue sem salvar */ }
  return {};
}

function progressoDe(nome) {
  const p = perfis[chavePerfil(nome)];
  return {
    estrelas: { ...((p && p.estrelas) || {}) },
    introVista: { ...((p && p.introVista) || {}) },
  };
}

function salvarProgresso() {
  perfis[chavePerfil(nomeJogador)] = { nome: nomeJogador, estrelas: progresso.estrelas, introVista: progresso.introVista };
  try { localStorage.setItem(CHAVE_PERFIS, JSON.stringify(perfis)); } catch (e) { /* ignora */ }
}

/* Troca o jogador atual: o menu passa a mostrar as fases e estrelas dele. */
function trocarJogador(nome) {
  nomeJogador = nome;
  try { localStorage.setItem(CHAVE_JOGADOR, nomeJogador); } catch (e) { /* segue só nesta sessão */ }
  progresso = progressoDe(nomeJogador);
}

/* Ranking: jogadores com nome e pelo menos 1 estrela, do maior para o menor */
function rankingAtual() {
  return Object.values(perfis)
    .filter(p => p && typeof p.nome === 'string' && p.nome.trim())
    .map(p => ({ nome: p.nome, estrelas: somaEstrelas(p.estrelas) }))
    .filter(p => p.estrelas > 0)
    .sort((a, b) => b.estrelas - a.estrelas || a.nome.localeCompare(b.nome))
    .slice(0, 10);
}

let perfis = carregarPerfis();
let nomeJogador = carregarNomeJogador();
let progresso = progressoDe(nomeJogador);
let partidaLocal = null;

/* Estado da fase em andamento */
let jogo = null;

/* ---------- Utilidades ---------- */
function mostrarTela(id) {
  document.querySelectorAll('.tela').forEach(t => t.classList.toggle('ativa', t.id === id));
  window.scrollTo(0, 0);
}

function estrelasTexto(n, total = 3) {
  return '★'.repeat(n) + '☆'.repeat(total - n);
}

function simboloPeca(p) { return OPS[p] ? OPS[p].simbolo : p; }
function nomePeca(p)    { return OPS[p] ? OPS[p].nome : 'Variável ' + p; }
function bit(v)         { return v ? 'V' : 'F'; }
function escaparHTML(texto) {
  return String(texto).replace(/[&<>"']/g, caractere => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[caractere]);
}

/* A primeira fase de cada etapa fica sempre liberada (dá para começar
   por qualquer etapa); dentro da etapa, cada fase libera a seguinte. */
function faseDesbloqueada(i) {
  const primeiraDaEtapa = i === 0 || FASES[i - 1].etapa !== FASES[i].etapa;
  return primeiraDaEtapa || (progresso.estrelas[FASES[i - 1].id] || 0) > 0;
}

function formatarTempo(segundos) {
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
}

function atualizarStatusPartida() {
  const visor = $('#match-status');
  if (!partidaLocal) {
    visor.hidden = true;
    return;
  }
  const jogadorAtivo = partidaLocal.jogadores[partidaLocal.ativo];
  const placar = partidaLocal.jogadores.map(jogador => {
    const tempoAtual = jogador === jogadorAtivo && jogador.iniciouEm !== null
      ? Date.now() - jogador.iniciouEm
      : 0;
    const tempo = (partidaLocal.desempate ? jogador.tempoDesempateMs : jogador.tempoMs) + tempoAtual;
    const erros = partidaLocal.desempate ? jogador.errosDesempate : jogador.erros;
    return `${jogador.nome}: ${jogador.concluidas}/3 · ${Math.floor(tempo / 1000)} s · ${erros} erro${erros === 1 ? '' : 's'}`;
  }).join(' | ');
  visor.textContent = `${partidaLocal.desempate ? 'Fase extra de desempate' : `Vez de ${jogadorAtivo.nome}`} — ${placar}`;
  visor.hidden = false;
}

function atualizarCronometro() {
  if (!jogo || jogo.fim || !jogo.tempoFim) return;
  jogo.tempoRestante = Math.max(0, Math.ceil((jogo.tempoFim - Date.now()) / 1000));
  const visor = $('#hud-tempo');
  visor.textContent = `Tempo: ${formatarTempo(jogo.tempoRestante)}`;
  visor.classList.toggle('alerta', jogo.tempoRestante <= 30);
  atualizarStatusPartida();
  if (jogo.tempoRestante === 0) perder('tempo');
}

function iniciarCronometro() {
  if (!jogo || jogo.fim || jogo.cronometro) return;
  if (partidaLocal && jogo.partidaLocal) {
    partidaLocal.jogadores[partidaLocal.ativo].iniciouEm = Date.now();
  }
  jogo.tempoFim = Date.now() + TEMPO_POR_FASE * 1000;
  atualizarCronometro();
  jogo.cronometro = setInterval(atualizarCronometro, 1000);
}

function pararCronometro() {
  if (!jogo) return;
  if (jogo.cronometro) clearInterval(jogo.cronometro);
  jogo.cronometro = null;
  jogo.aguardandoCronometro = false;
}

function renderRanking() {
  $('#nome-jogador').value = nomeJogador;
  $('#perfil-atual').innerHTML = nomeJogador
    ? `Jogando como <b>${escaparHTML(nomeJogador)}</b>. Para trocar de jogador, salve outro nome.`
    : 'Você está jogando como <b>visitante</b> e não aparece no ranking. Salve um nome para entrar nele.';
  const lista = $('#lista-ranking');
  lista.innerHTML = '';
  rankingAtual().forEach(item => {
    const li = el('li', null, `${item.nome} — ★ ${item.estrelas}`);
    if (chavePerfil(item.nome) === chavePerfil(nomeJogador)) li.className = 'voce';
    lista.appendChild(li);
  });
}

/* Partida local: UMA fase sorteada de cada etapa (1, 2 e 3), a mesma
   lista para os dois jogadores, para a disputa ser justa. */
function sortearFasesPartida() {
  return [1, 2, 3].map(etapa => {
    const opcoes = FASES.filter(f => f.etapa === etapa && !f.desempate);
    return opcoes[Math.floor(Math.random() * opcoes.length)].id;
  });
}

function criarEstadoFase(i) {
  const f = FASES[i];
  return {
    idx: i,
    fase: f,
    val: f.etapa === 1 ? { ...f.estadoInicial } : null,
    jogadas: 0,
    preench: {},
    pecas: { ...(f.pecasDisponiveis || {}) },
    selecionada: null,
    arrastando: null,
    usouTabela: false,
    fim: false,
    venceu: false,
    testadas: {},      // Etapa 3: índice da opção → { equivalente, contra }
    ultimaOpcao: null, // Etapa 3: última opção escolhida (para o feedback)
    tempoRestante: TEMPO_POR_FASE,
    tempoFim: null,
    cronometro: null,
    aguardandoCronometro: false,
  };
}

function iniciarPartidaLocal(nome1, nome2) {
  const faseDesempate = FASES.find(f => f.desempate);
  const temTodasEtapas = [1, 2, 3].every(e => FASES.some(f => f.etapa === e && !f.desempate));
  if (!temTodasEtapas || !faseDesempate) {
    abrirModal('<h3>Partida indisponível</h3><p>É necessária pelo menos uma fase em cada etapa e uma fase de desempate.</p>',
      [{ texto: 'Ok', primario: true }]);
    return;
  }

  pararCronometro();
  const fases = sortearFasesPartida();   // as mesmas fases para os dois
  const novoJogador = nome => ({
    nome: nome, fases: fases, concluidas: 0, iniciouEm: null,
    historico: [],   // uma entrada por fase jogada, para a tela de resultado
    tempoMs: 0, tentativas: 0, erros: 0,
    tempoDesempateMs: 0, tentativasDesempate: 0, errosDesempate: 0,
  });
  partidaLocal = {
    jogadores: [novoJogador(nome1), novoJogador(nome2)],
    ativo: 0,
    proximo: 0,
    desempate: false,
    idFaseDesempate: faseDesempate.id,
    encerrada: false,
  };
  iniciarTurnoMultiplayer(0);
}

function iniciarTurnoMultiplayer(indiceJogador) {
  if (!partidaLocal || partidaLocal.encerrada) return;
  pararCronometro();
  partidaLocal.ativo = indiceJogador;
  const jogador = partidaLocal.jogadores[indiceJogador];
  const id = partidaLocal.desempate
    ? partidaLocal.idFaseDesempate
    : jogador.fases[jogador.concluidas];
  const idx = FASES.findIndex(f => f.id === id);
  if (idx < 0) throw new Error('Fase da partida local não encontrada: ' + id);

  jogo = criarEstadoFase(idx);
  jogo.partidaLocal = true;
  jogo.desempate = partidaLocal.desempate;
  jogo.aguardandoCronometro = true;
  mostrarTela('tela-jogo');
  renderFase();
  const rotulo = partidaLocal.desempate ? 'Fase extra de desempate' : `Fase ${jogador.concluidas + 1} de 3`;
  const intro = INTRO_ETAPAS[jogo.fase.etapa];
  abrirModal(
    `<h3>Vez de ${escaparHTML(jogador.nome)}</h3>
     <p>${rotulo}: <b>${jogo.fase.titulo}</b> (${intro.titulo}).</p>
     <p>${intro.resumo}</p>
     <p>Cada jogada além do mínimo da fase soma <b>+${PENALIDADE_ERRO} s</b> ao seu tempo.
        Os 120 segundos começam no botão abaixo.</p>`,
    [{ texto: 'Começar turno', primario: true, acao: iniciarCronometro }]
  );
}

/* concluiu = true quando a fase foi resolvida; false quando a tentativa
   terminou em derrota (tempo ou curto-circuito) e será repetida.        */
function registrarTempoDoTurno(concluiu) {
  if (!partidaLocal || !jogo || !jogo.partidaLocal) return;
  const jogador = partidaLocal.jogadores[partidaLocal.ativo];
  if (jogador.iniciouEm === null) return;
  const decorrido = Math.max(0, Date.now() - jogador.iniciouEm);
  jogador.iniciouEm = null;
  // Erro = jogada além do mínimo da fase (escolha errada, clique ou peça a mais).
  // Assim, chutar todas as opções sai mais caro do que pensar.
  const erros = Math.max(0, jogo.jogadas - jogo.fase.criterioEstrelas.tres);
  const total = decorrido + erros * PENALIDADE_ERRO * 1000;

  // Histórico por fase (várias tentativas da mesma fase somam na mesma linha)
  let linha = jogador.historico.find(h => h.id === jogo.fase.id && h.desempate === !!jogo.desempate);
  if (!linha) {
    linha = { id: jogo.fase.id, desempate: !!jogo.desempate, ms: 0, erros: 0, tentativas: 0, perdidas: 0, concluiu: false };
    jogador.historico.push(linha);
  }
  linha.ms += total;
  linha.erros += erros;
  linha.tentativas += jogo.jogadas;
  if (concluiu) linha.concluiu = true;
  else linha.perdidas++;

  if (jogo.desempate) {
    jogador.tempoDesempateMs += total;
    jogador.tentativasDesempate += jogo.jogadas;
    jogador.errosDesempate += erros;
  } else {
    jogador.tempoMs += total;
    jogador.tentativas += jogo.jogadas;
    jogador.erros += erros;
  }
}

/* "38 s (2 erros, +30 s)": tempo total já com a penalidade */
function resumoJogador(jogador, desempate) {
  const erros = desempate ? jogador.errosDesempate : jogador.erros;
  const tentativas = desempate ? jogador.tentativasDesempate : jogador.tentativas;
  const pen = erros ? ` (${erros} erro${erros === 1 ? '' : 's'}, +${erros * PENALIDADE_ERRO} s)` : ' (sem erros)';
  return `${escaparHTML(jogador.nome)}: ${formatarSegundos(tempoEmSegundos(jogador, desempate))}${pen}, ${tentativas} tentativas.`;
}

/* Tempos da partida em DÉCIMOS de segundo (12,4 s): a soma das fases
   bate com o total mostrado e empates "artificiais" ficam raros.      */
function msParaSegundos(ms) { return Math.round(ms / 100) / 10; }

function formatarSegundos(s) {
  return s.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' s';
}

function tempoEmSegundos(jogador, desempate) {
  return msParaSegundos(desempate ? jogador.tempoDesempateMs : jogador.tempoMs);
}

function compararCompetidores(tempo) {
  const [a, b] = partidaLocal.jogadores;
  const diferencaTempo = tempo(a, partidaLocal.desempate) - tempo(b, partidaLocal.desempate);
  if (diferencaTempo !== 0) return diferencaTempo < 0 ? 0 : 1;
  const tentativasA = partidaLocal.desempate ? a.tentativasDesempate : a.tentativas;
  const tentativasB = partidaLocal.desempate ? b.tentativasDesempate : b.tentativas;
  if (tentativasA !== tentativasB) return tentativasA < tentativasB ? 0 : 1;
  return -1;
}

function concluirTurnoMultiplayer() {
  const partida = partidaLocal;
  const jogador = partida.jogadores[partida.ativo];
  registrarTempoDoTurno(true);

  if (jogo.desempate) {
    if (partida.ativo === 0) {
      iniciarTurnoMultiplayer(1);
      return;
    }
    partida.encerrada = true;
    const vencedorDesempate = compararCompetidores(tempoEmSegundos, null);
    setTimeout(() => mostrarResultadoPartida(vencedorDesempate), 900);
    return;
  }

  jogador.concluidas++;
  jogo.fim = true;
  jogo.venceu = true;
  renderFase();

  const todosConcluiram = partida.jogadores.every(p => p.concluidas === 3);
  if (todosConcluiram) {
    const vencedor = compararCompetidores(tempoEmSegundos, null);
    if (vencedor < 0) {
      partida.desempate = true;
      abrirModal('<h3>Empate!</h3><p>O tempo e o número de tentativas ficaram iguais. Cada jogador resolverá a mesma fase extra.</p>',
        [{ texto: `Desempate: ${partida.jogadores[0].nome}`, primario: true, acao: () => iniciarTurnoMultiplayer(0) }]);
      return;
    }

    partida.encerrada = true;
    // Pequena pausa para a porta abrir antes de trocar de tela
    setTimeout(() => mostrarResultadoPartida(vencedor), 900);
    return;
  }

  const proximo = 1 - partida.ativo;
  partida.proximo = partida.jogadores[proximo].concluidas < 3 ? proximo : partida.ativo;
  abrirModal(`<h3>Fase concluída</h3>
    <p>${escaparHTML(jogador.nome)} completou ${escaparHTML(jogo.fase.titulo)}.</p>
    <p>Placar até agora: ${resumoJogador(jogador, false)}</p>
    <p>Prepare o próximo jogador.</p>`,
    [{ texto: `Passar para ${partida.jogadores[partida.proximo].nome}`, primario: true, acao: () => iniciarTurnoMultiplayer(partida.proximo) }]);
}

/* =====================================================================
   TELA DE RESULTADO DA PARTIDA LOCAL
   vencedor: 0 ou 1 (índice do jogador) ou -1 (empate até no desempate)
   ===================================================================== */
function mostrarResultadoPartida(vencedor) {
  const partida = partidaLocal;
  if (!partida) return;
  const [a, b] = partida.jogadores;
  pararCronometro();
  fecharModal(true);

  $('#tela-resultado').classList.toggle('empate', vencedor < 0);
  $('#resultado-titulo').textContent = vencedor < 0 ? 'Empate!' : `${partida.jogadores[vencedor].nome} venceu!`;
  $('#resultado-motivo').textContent = motivoResultado(partida, vencedor);

  const caixa = $('#resultado-placar');
  caixa.innerHTML = '';
  caixa.appendChild(tabelaPlacar(partida, vencedor));

  $('#btn-revanche').onclick = () => iniciarPartidaLocal(a.nome, b.nome);
  $('#btn-resultado-menu').onclick = irParaMenu;
  $('#match-status').hidden = true;
  mostrarTela('tela-resultado');
}

/* Explica em uma frase POR QUE o vencedor venceu */
function motivoResultado(partida, vencedor) {
  const d = partida.desempate;
  if (vencedor < 0) return 'Tempo e tentativas ficaram iguais nas três fases e também na fase extra.';
  const v = partida.jogadores[vencedor];
  const p = partida.jogadores[1 - vencedor];
  const tv = tempoEmSegundos(v, d), tp = tempoEmSegundos(p, d);
  const inicio = d ? 'As três fases terminaram empatadas. Na fase extra, ' : '';
  if (tv !== tp) {
    return inicio + `${v.nome} fez ${formatarSegundos(tv)} contra ${formatarSegundos(tp)} de ${p.nome}` +
      (d ? '.' : ' no tempo total, já com as penalidades.');
  }
  const nv = d ? v.tentativasDesempate : v.tentativas;
  const np = d ? p.tentativasDesempate : p.tentativas;
  return inicio + `O tempo empatou em ${formatarSegundos(tv)}; ${v.nome} venceu por fazer menos tentativas (${nv} contra ${np}).`;
}

/* Célula do placar: tempo da fase + erros/derrotas */
function celulaPlacar(linha) {
  const td = el('td');
  if (!linha) { td.textContent = '—'; return td; }
  td.appendChild(el('b', null, formatarSegundos(msParaSegundos(linha.ms))));
  const detalhes = [linha.erros ? `${linha.erros} erro${linha.erros === 1 ? '' : 's'} (+${linha.erros * PENALIDADE_ERRO} s)` : 'sem erros'];
  if (linha.perdidas) detalhes.push(`${linha.perdidas} tentativa${linha.perdidas === 1 ? '' : 's'} perdida${linha.perdidas === 1 ? '' : 's'}`);
  td.appendChild(el('small', null, detalhes.join(' · ')));
  return td;
}

/* Tabela: uma linha por fase, o total e (se houve) a fase extra.
   Em cada linha, o menor tempo fica destacado.                       */
function tabelaPlacar(partida, vencedor) {
  const [a, b] = partida.jogadores;
  const t = el('table', 'tabela placar');
  const cab = el('tr');
  cab.appendChild(el('th', null, 'Fase'));
  [a, b].forEach((j, i) => cab.appendChild(el('th', i === vencedor ? 'vencedor' : null, (i === vencedor ? '★ ' : '') + j.nome)));
  t.appendChild(cab);

  function linhaTabela(rotulo, celulas, valores, classe) {
    const tr = el('tr', classe || null);
    tr.appendChild(el('td', 'placar-fase', rotulo));
    celulas.forEach((td, i) => {
      if (valores[0] !== valores[1] && valores[i] === Math.min(...valores)) td.classList.add('melhor');
      tr.appendChild(td);
    });
    t.appendChild(tr);
  }
  const busca = (j, id, desempate) => j.historico.find(h => h.id === id && h.desempate === desempate);
  const nomeFase = id => { const f = FASES.find(x => x.id === id); return `${id} · ${f.titulo}`; };

  a.fases.forEach(id => {
    const la = busca(a, id, false), lb = busca(b, id, false);
    linhaTabela(nomeFase(id), [celulaPlacar(la), celulaPlacar(lb)],
      [la ? la.ms : Infinity, lb ? lb.ms : Infinity]);
  });

  const totalCelula = j => {
    const td = el('td');
    td.appendChild(el('b', null, formatarSegundos(tempoEmSegundos(j, false))));
    td.appendChild(el('small', null, `${j.erros} erro${j.erros === 1 ? '' : 's'} · ${j.tentativas} tentativas`));
    return td;
  };
  linhaTabela('Total', [totalCelula(a), totalCelula(b)],
    [tempoEmSegundos(a, false), tempoEmSegundos(b, false)], 'total');

  if (partida.desempate) {
    const id = partida.idFaseDesempate;
    const la = busca(a, id, true), lb = busca(b, id, true);
    linhaTabela('Fase extra: ' + nomeFase(id), [celulaPlacar(la), celulaPlacar(lb)],
      [tempoEmSegundos(a, true), tempoEmSegundos(b, true)], 'extra');
  }
  return t;
}

/* =====================================================================
   MENU
   ===================================================================== */
function renderMenu() {
  const cont = $('#lista-fases');
  cont.innerHTML = '';

  [1, 2, 3].forEach(etapa => {
    const bloco = el('div', 'bloco-etapa');
    bloco.appendChild(el('h3', null, INTRO_ETAPAS[etapa].titulo));
    bloco.appendChild(el('p', 'etapa-desc', INTRO_ETAPAS[etapa].resumo));
    const grade = el('div', 'grade-fases');

    FASES.forEach((f, i) => {
      if (f.etapa !== etapa) return;
      const liberada = faseDesbloqueada(i);
      const est = progresso.estrelas[f.id] || 0;
      const b = el('button', 'cartao-fase' + (est ? ' concluida' : ''));
      b.innerHTML = `<span class="num">${f.id}</span><span class="nome"></span>` +
                    `<span class="estrelas">${liberada ? estrelasTexto(est) : 'bloqueada'}</span>`;
      b.querySelector('.nome').textContent = f.titulo;
      b.disabled = !liberada;
      b.onclick = () => abrirFase(i);
      grade.appendChild(b);
    });

    bloco.appendChild(grade);
    cont.appendChild(bloco);
  });

  const total = Object.values(progresso.estrelas).reduce((a, b) => a + b, 0);
  $('#total-estrelas').textContent = `★ ${total} / ${FASES.length * 3}`;
  renderRanking();
}

/* =====================================================================
   ABRIR / REINICIAR FASE
   ===================================================================== */
function abrirFase(i) {
  pararCronometro();
  partidaLocal = null;
  jogo = criarEstadoFase(i);
  mostrarTela('tela-jogo');
  $('#match-status').hidden = true;
  renderFase();

  // Mostra a introdução da etapa na primeira vez que o jogador chega nela
  const f = jogo.fase;
  const primeiraDaEtapa = FASES.findIndex(x => x.etapa === f.etapa) === i;
  if (primeiraDaEtapa && !progresso.introVista[f.etapa]) {
    progresso.introVista[f.etapa] = true;
    salvarProgresso();
    jogo.aguardandoCronometro = true;
    mostrarIntro(f.etapa);
  } else iniciarCronometro();
}

/* =====================================================================
   O QUE CADA "LINHA" DO CIRCUITO MOSTRA
   Etapa 1: uma linha por lâmpada, todas com a mesma valoração.
   Etapa 2: uma linha por sala (configuração de interruptores), ou uma
            linha sem valores na fase de equivalência.
   ===================================================================== */
function linhasDaFase() {
  const f = jogo.fase;
  if (f.etapa === 3) {
    return [{ formula: f.formula, val: null,
              rotulo: jogo.venceu ? 'Circuito original: substituto instalado' : 'Circuito original (queimado): precisa de um substituto equivalente' }];
  }
  if (f.etapa === 1) {
    const lamps = lampadasDe(f);
    return lamps.map((form, k) => ({
      formula: form, val: jogo.val,
      rotulo: lamps.length > 1 ? 'Lâmpada ' + (k + 1) : null,
    }));
  }
  if (f.alvoEquivalente) {
    return [{ formula: f.formula, val: null, equivalencia: true,
              rotulo: 'Seu circuito precisa imitar ' + formulaParaTexto(f.alvoEquivalente) + ' em todas as combinações' }];
  }
  const cfgs = configsDe(f);
  return cfgs.map((c, k) => ({
    formula: f.formula, val: c,
    rotulo: cfgs.length > 1 ? 'Sala ' + 'ABCDEF'[k] : null,
    mostrarConfig: cfgs.length > 1,
  }));
}

/* A lâmpada de uma linha está acesa? (usa o avaliador do logic.js) */
function lampadaAcesa(linha) {
  const f = jogo.fase;
  if (f.etapa === 3) return jogo.venceu;
  if (f.etapa === 1) return avaliar(linha.formula, linha.val);
  const concreta = preencher(f.formula, jogo.preench);
  if (!concreta) return false;
  if (linha.equivalencia) return equivalentes(concreta, f.alvoEquivalente, f.variaveis);
  return avaliar(concreta, linha.val);
}

/* =====================================================================
   DESENHO DA FASE
   ===================================================================== */
function renderFase() {
  renderHUD();
  renderInterruptores();
  renderCircuitos();
  renderPorta();
  renderExtra();
  renderBandeja();
  marcarCompativeis(jogo.selecionada);
}

function renderHUD() {
  const f = jogo.fase;
  const daEtapa = FASES.filter(x => x.etapa === f.etapa);
  const n = daEtapa.indexOf(f) + 1;
  $('#hud-etapa').textContent = `${INTRO_ETAPAS[f.etapa].titulo} · Fase ${n} de ${daEtapa.length}`;
  $('#hud-titulo').textContent = f.titulo;
  $('#dica').textContent = f.dica;
  $('#btn-reiniciar').hidden = !!partidaLocal;
  atualizarStatusPartida();

  const hj = $('#hud-jogadas');
  if (f.etapa === 1) {
    hj.textContent = `Jogadas: ${jogo.jogadas} / ${f.maxJogadas}`;
    hj.classList.toggle('alerta', f.maxJogadas - jogo.jogadas <= 1 && !jogo.venceu);
  } else if (f.etapa === 2) {
    hj.textContent = `Peças colocadas: ${jogo.jogadas}`;
    hj.classList.remove('alerta');
  } else {
    const total = opcoesEquivalentes(f).length;
    const achadas = Object.values(jogo.testadas).filter(t => t.equivalente).length;
    hj.textContent = `Equivalentes: ${achadas} / ${total} · Tentativas: ${jogo.jogadas}`;
    hj.classList.remove('alerta');
  }
  $('#hud-estrelas').textContent = estrelasTexto(calcularEstrelas(f, jogo.jogadas, jogo.usouTabela));
  $('#btn-tabela').hidden = !!partidaLocal;   // na partida local, sem consultas
  const tempo = $('#hud-tempo');
  tempo.textContent = `Tempo: ${formatarTempo(jogo.tempoRestante)}`;
  tempo.classList.toggle('alerta', jogo.tempoRestante <= 30);

  // Fórmula em texto, acima do circuito
  const ft = $('#formula-texto');
  if (f.etapa === 1) {
    ft.innerHTML = '';
    lampadasDe(f).forEach((form, k, arr) => {
      if (arr.length > 1) ft.appendChild(el('span', null, 'L' + (k + 1) + ':'));
      ft.appendChild(document.createTextNode(formulaParaTexto(form) + (k < arr.length - 1 ? '   ' : '')));
    });
  } else {
    ft.innerHTML = f.etapa === 3 ? '<span>Original:</span>' : '<span>Fórmula:</span>';
    ft.appendChild(document.createTextNode(formulaParaTexto(f.formula, jogo.preench)));
  }
}

/* ---------- Painel de interruptores ---------- */
function renderInterruptores() {
  const f = jogo.fase;
  const painel = $('#painel-interruptores');
  painel.innerHTML = '';
  const cfgs = f.etapa === 2 ? configsDe(f) : [];

  // Sem painel lateral: fase de equivalência ou várias salas.
  const semPainel = f.etapa === 3 || (f.etapa === 2 && cfgs.length !== 1);
  $('.sala').classList.toggle('sem-interruptores', semPainel);
  if (semPainel) return;

  const val = f.etapa === 1 ? jogo.val : cfgs[0];
  painel.appendChild(el('p', 'painel-titulo', f.travado ? 'Interruptores travados' : 'Interruptores'));

  f.variaveis.forEach(v => {
    const b = el('button', 'interruptor' + (val[v] ? ' ligado' : ''));
    b.innerHTML = `<span class="alavanca"><span class="pino"></span></span><span>${v}</span>`;
    b.setAttribute('aria-label', `Interruptor ${v}: ${val[v] ? 'verdadeiro' : 'falso'}`);
    if (f.travado || jogo.fim) b.disabled = true;
    else b.onclick = () => alternarInterruptor(v);
    painel.appendChild(b);
  });
  if (f.travado) painel.appendChild(el('span', 'travado-tag', 'Estes valores não mudam nesta etapa.'));
}

/* ---------- Circuitos (uma linha por lâmpada/sala) ---------- */
function renderCircuitos() {
  const area = $('#area-circuitos');
  area.innerHTML = '';

  linhasDaFase().forEach(linha => {
    const caixa = el('div', 'linha-circuito');
    if (linha.rotulo || linha.mostrarConfig) {
      const rot = el('div', 'linha-rotulo');
      if (linha.rotulo) rot.appendChild(el('b', null, linha.rotulo));
      caixa.appendChild(rot);
    }

    const corpo = el('div', 'linha-corpo');
    corpo.appendChild(renderNo(linha.formula, jogo.fase.etapa === 3 ? null : linha.val));
    const acesa = lampadaAcesa(linha);
    corpo.appendChild(el('div', 'fio' + (acesa ? ' v1' : '')));
    const lamp = el('div', 'lampada' + (acesa ? ' acesa' : ''));
    lamp.title = acesa ? 'Lâmpada acesa' : 'Lâmpada apagada';
    corpo.appendChild(lamp);

    caixa.appendChild(corpo);
    area.appendChild(caixa);
  });
}

/* Desenha um nó da árvore como uma "porta lógica" (recursivo).
   val = null → sem valores (fase de equivalência): fica neutro.      */
function renderNo(no, val) {
  const v = val ? avaliarParcial(no, val, jogo.preench) : undefined;
  const cor = v === true ? ' v1' : v === false ? ' v0' : '';

  // Variável fixa
  if (ehVar(no)) {
    const d = el('div', 'no no-var' + cor);
    d.appendChild(el('span', null, no.var));
    return d;
  }

  // Encaixes (Etapa 2)
  if (ehSlot(no)) {
    if (no.tipo === 'var') return renderSlot(no, cor, v, val);

    if (no.tipo === 'neg') {
      const g = el('div', 'no gate' + cor + (jogo.preench[no.slot] ? '' : ' neg-vazio'));
      g.appendChild(renderSlot(no));
      g.appendChild(renderNo(no.child, val));
      return g;
    }

    const g = el('div', 'no gate' + cor);   // encaixe binário
    g.appendChild(renderNo(no.left, val));
    g.appendChild(renderSlot(no));
    g.appendChild(renderNo(no.right, val));
    return g;
  }

  // Conectivos fixos
  const g = el('div', 'no gate' + cor);
  g.title = OPS[no.op].nome;
  if (no.op === 'NOT') {
    g.appendChild(el('span', 'op', OPS.NOT.simbolo));
    g.appendChild(renderNo(no.child, val));
  } else {
    g.appendChild(renderNo(no.left, val));
    g.appendChild(el('span', 'op', OPS[no.op].simbolo));
    g.appendChild(renderNo(no.right, val));
  }
  return g;
}

/* ---------- Encaixe interativo ---------- */
function renderSlot(no, cor = '', v, val) {
  const peca = jogo.preench[no.slot];
  const s = el('div', 'slot slot-' + no.tipo + (peca ? ' cheio' : ''));
  s.dataset.slot = no.slot;
  s.dataset.tipo = no.tipo;

  if (peca) {
    if (no.tipo === 'var') {
      s.className += cor;
      s.appendChild(el('span', null, peca));
    } else {
      s.textContent = simboloPeca(peca);
    }
    s.title = 'Toque para devolver à bandeja';
  } else {
    s.textContent = no.tipo === 'neg' ? '¬?' : '?';
    s.title = no.tipo === 'bin' ? 'Encaixe de conectivo (∧ ∨ → ↔)'
            : no.tipo === 'neg' ? 'Encaixe opcional de negação (¬)'
            : 'Encaixe de variável';
  }

  // Clique/toque: devolve a peça ou coloca a peça selecionada
  s.addEventListener('click', () => {
    if (jogo.fim) return;
    if (jogo.selecionada) colocarPeca(no.slot, no.tipo, jogo.selecionada);
    else if (peca) removerPeca(no.slot);
  });

  // Drag-and-drop nativo do HTML5
  s.addEventListener('dragover', e => {
    if (jogo.arrastando && pecaCabe(no.tipo, jogo.arrastando, jogo.fase.variaveis)) {
      e.preventDefault();
      s.classList.add('sobre');
    }
  });
  s.addEventListener('dragleave', () => s.classList.remove('sobre'));
  s.addEventListener('drop', e => {
    e.preventDefault();
    const p = jogo.arrastando || e.dataTransfer.getData('text/plain');
    jogo.arrastando = null;
    colocarPeca(no.slot, no.tipo, p);
  });
  return s;
}

/* Destaca os encaixes que aceitam a peça escolhida */
function marcarCompativeis(peca) {
  document.querySelectorAll('.slot').forEach(s => {
    s.classList.toggle('aceita', !!peca && !jogo.fim && pecaCabe(s.dataset.tipo, peca, jogo.fase.variaveis));
    s.classList.remove('sobre');
  });
}

/* ---------- Porta ---------- */
function renderPorta() {
  $('#porta').classList.toggle('aberta', jogo.venceu);
  const st = $('#porta-status');
  st.textContent = jogo.venceu ? 'Porta aberta' : 'Trancada';
  st.classList.toggle('aberta', jogo.venceu);
}

/* ---------- Área extra: comparação de tabelas (equivalência) ---------- */
function renderExtra() {
  const extra = $('#extra');
  extra.innerHTML = '';
  const f = jogo.fase;
  if (f.etapa === 3) {
    renderPuzzleEquivalencia(extra);
    return;
  }
  if (!f.alvoEquivalente) return;

  const concreta = preencher(f.formula, jogo.preench);
  extra.appendChild(el('h4', null, 'Teste de equivalência: as duas colunas precisam ser iguais em todas as linhas'));
  const t = el('table', 'tabela');
  const cab = el('tr');
  f.variaveis.forEach(v => cab.appendChild(el('th', null, v)));
  cab.appendChild(el('th', null, formulaParaTexto(f.alvoEquivalente)));
  cab.appendChild(el('th', null, concreta ? formulaParaTexto(concreta) : 'seu circuito'));
  cab.appendChild(el('th', null, 'confere?'));
  t.appendChild(cab);

  gerarTabelaVerdade(f.alvoEquivalente, f.variaveis).forEach(linha => {
    const tr = el('tr');
    f.variaveis.forEach(v => tr.appendChild(el('td', bit(linha.valoracao[v]), bit(linha.valoracao[v]))));
    tr.appendChild(el('td', bit(linha.resultado), bit(linha.resultado)));
    if (concreta) {
      const r = avaliar(concreta, linha.valoracao);
      tr.appendChild(el('td', bit(r), bit(r)));
      tr.appendChild(el('td', r === linha.resultado ? 'ok' : 'erro', r === linha.resultado ? 'sim' : 'não'));
    } else {
      tr.appendChild(el('td', null, '—'));
      tr.appendChild(el('td', null, '—'));
    }
    t.appendChild(tr);
  });
  extra.appendChild(t);
}

/* Etapa 3: circuito original + cartões com os candidatos a substituto */
function renderPuzzleEquivalencia(extra) {
  const f = jogo.fase;
  const certas = opcoesEquivalentes(f);
  const original = formulaParaTexto(f.formula);

  extra.appendChild(el('h4', null, certas.length > 1
    ? `Encontre os ${certas.length} circuitos equivalentes a ${original}`
    : `Qual circuito é equivalente a ${original}?`));
  extra.appendChild(el('p', 'legenda-desafio',
    'Equivalente (≡) = mesmo valor em TODAS as linhas da tabela-verdade. Toque num candidato para instalá-lo.'));

  const grade = el('div', 'opcoes-equiv');
  f.opcoes.forEach((op, i) => {
    const t = jogo.testadas[i];
    const estado = t ? (t.equivalente ? ' certa' : ' errada') : '';
    const b = el('button', 'opcao-equiv' + estado + (jogo.ultimaOpcao === i ? ' ultima' : ''));
    b.type = 'button';
    b.appendChild(el('span', 'opcao-letra', 'ABCDEF'[i]));
    b.appendChild(el('span', 'opcao-formula', formulaParaTexto(op)));
    b.appendChild(el('span', 'opcao-estado',
      t ? (t.equivalente ? '≡ equivalente' : '≢ não equivalente') : 'Instalar'));
    b.disabled = jogo.fim || !!t;
    b.setAttribute('aria-label', `Opção ${'ABCDEF'[i]}: ${formulaParaTexto(op)}` +
      (t ? (t.equivalente ? ', equivalente' : ', não equivalente') : ''));
    b.onclick = () => escolherOpcao(i);
    grade.appendChild(b);
  });
  extra.appendChild(grade);

  // Feedback da última escolha: prova (tabela inteira) ou contraexemplo (uma linha)
  if (jogo.ultimaOpcao !== null) {
    const i = jogo.ultimaOpcao;
    const t = jogo.testadas[i];
    const op = f.opcoes[i];
    const texto = formulaParaTexto(op);
    const fb = el('div', 'feedback-equiv' + (t.equivalente ? '' : ' erro'));
    if (t.equivalente) {
      const linhas = todasValoracoes(f.variaveis);
      fb.appendChild(el('p', null,
        `Correto! ${texto} ≡ ${original}: as duas colunas coincidem nas ${linhas.length} linhas.`));
      fb.appendChild(tabelaComparacao(f, [f.formula, op], linhas));
    } else {
      fb.appendChild(el('p', null,
        `Contraexemplo: com ${textoValoracao(t.contra)}, o original dá ${bit(avaliar(f.formula, t.contra))} ` +
        `e ${texto} dá ${bit(avaliar(op, t.contra))}. Uma única linha diferente já prova que não são equivalentes.`));
      fb.appendChild(tabelaComparacao(f, [f.formula, op], [t.contra]));
    }
    extra.appendChild(fb);
  }
}

/* Tabela pequena: variáveis | fórmulas, só para as valorações pedidas */
function tabelaComparacao(f, formulas, valoracoes) {
  const t = el('table', 'tabela');
  const cab = el('tr');
  f.variaveis.forEach(v => cab.appendChild(el('th', null, v)));
  formulas.forEach(form => cab.appendChild(el('th', null, formulaParaTexto(form))));
  t.appendChild(cab);
  valoracoes.forEach(val => {
    const tr = el('tr');
    f.variaveis.forEach(v => tr.appendChild(el('td', bit(val[v]), bit(val[v]))));
    formulas.forEach(form => {
      const r = avaliar(form, val);
      tr.appendChild(el('td', bit(r), bit(r)));
    });
    t.appendChild(tr);
  });
  return t;
}

/* ---------- Bandeja de peças (Etapa 2) ---------- */
function renderBandeja() {
  const b = $('#bandeja');
  b.innerHTML = '';
  const f = jogo.fase;
  if (f.etapa !== 2) return;

  const tit = el('div', 'bandeja-titulo', 'Bandeja de peças');
  tit.appendChild(el('small', null, 'Arraste para um encaixe, ou toque na peça e depois no encaixe. Toque numa peça encaixada para devolvê-la.'));
  b.appendChild(tit);

  const lista = el('div', 'pecas');
  Object.keys(f.pecasDisponiveis).forEach(p => {
    const n = jogo.pecas[p];
    const d = el('div', 'peca' + (n <= 0 ? ' esgotada' : '') + (jogo.selecionada === p ? ' selecionada' : ''));
    d.innerHTML = `<span class="simb">${simboloPeca(p)}</span>` +
                  `<span><span class="nome-peca">${nomePeca(p)}</span><br><span class="qtd">× ${n}</span></span>`;
    d.title = OPS[p] ? OPS[p].regra : 'Variável ' + p;

    if (n > 0 && !jogo.fim) {
      d.draggable = true;
      d.addEventListener('dragstart', e => {
        jogo.arrastando = p;
        e.dataTransfer.setData('text/plain', p);
        e.dataTransfer.effectAllowed = 'move';
        marcarCompativeis(p);
      });
      d.addEventListener('dragend', () => {
        jogo.arrastando = null;
        marcarCompativeis(jogo.selecionada);
      });
      d.addEventListener('click', () => {
        jogo.selecionada = jogo.selecionada === p ? null : p;
        renderFase();
      });
    }
    lista.appendChild(d);
  });
  b.appendChild(lista);
}

/* =====================================================================
   AÇÕES DO JOGADOR
   ===================================================================== */

/* Etapa 1: clique no interruptor */
function alternarInterruptor(v) {
  if (jogo.fim) return;
  jogo.val[v] = !jogo.val[v];
  jogo.jogadas++;
  renderFase();
  verificarFimDeJogada();
}

/* Etapa 2: colocar peça num encaixe */
function colocarPeca(slotId, tipoSlot, peca) {
  if (jogo.fim || !peca) return;
  if (!pecaCabe(tipoSlot, peca, jogo.fase.variaveis)) return;
  if ((jogo.pecas[peca] || 0) <= 0) return;

  const anterior = jogo.preench[slotId];
  if (anterior) jogo.pecas[anterior]++;     // a peça antiga volta para a bandeja
  jogo.preench[slotId] = peca;
  jogo.pecas[peca]--;
  jogo.jogadas++;
  if (jogo.pecas[peca] <= 0) jogo.selecionada = null;
  renderFase();
  verificarFimDeJogada();
}

/* Etapa 2: devolver peça para a bandeja */
function removerPeca(slotId) {
  const p = jogo.preench[slotId];
  if (!p || jogo.fim) return;
  jogo.pecas[p]++;
  delete jogo.preench[slotId];
  renderFase();
}

/* Depois de cada jogada: venceu? perdeu? */
function verificarFimDeJogada() {
  if (jogo.fase.etapa === 3) return;
  const todas = linhasDaFase().every(lampadaAcesa);
  if (todas) { vencer(); return; }
  if (jogo.fase.etapa === 1 && jogo.jogadas >= jogo.fase.maxJogadas) perder();
}

function vencer() {
  jogo.fim = true;
  jogo.venceu = true;
  jogo.selecionada = null;
  pararCronometro();
  if (partidaLocal && jogo.partidaLocal) {
    renderFase();
    concluirTurnoMultiplayer();
    return;
  }
  const f = jogo.fase;
  const est = calcularEstrelas(f, jogo.jogadas, jogo.usouTabela);
  progresso.estrelas[f.id] = Math.max(progresso.estrelas[f.id] || 0, est);
  salvarProgresso();
  renderFase();

  const ultima = jogo.idx === FASES.length - 1;
  const unidade = f.etapa === 1 ? 'jogada' : f.etapa === 2 ? 'peça' : 'tentativa';
  const s = jogo.jogadas === 1 ? '' : 's';
  const nCertas = f.etapa === 3 ? opcoesEquivalentes(f).length : 0;
  const resumoDesafio = f.etapa === 3
    ? `Você encontrou ${nCertas === 1 ? 'o substituto equivalente' : `os <b>${nCertas}</b> substitutos equivalentes`} em <b>${jogo.jogadas}</b> tentativa${s}. O mínimo possível é <b>${f.criterioEstrelas.tres}</b>.`
    : `Você resolveu com <b>${jogo.jogadas}</b> ${unidade}${s}. O mínimo possível é <b>${f.criterioEstrelas.tres}</b>.`;

  setTimeout(() => {
    abrirModal(
      `<h3>Porta aberta!</h3>
       <div class="estrelas-grandes">${'★'.repeat(est)}<span class="apagada">${'★'.repeat(3 - est)}</span></div>
       <p>${resumoDesafio}` +
       (jogo.usouTabela ? ' A consulta à tabela-verdade custou 1 estrela.' : '') + '</p>',
      [
        { texto: 'Repetir', acao: () => abrirFase(jogo.idx) },
        { texto: 'Menu', acao: irParaMenu },
        ultima
          ? { texto: 'Religar a usina', primario: true, acao: mostrarFinal }
          : { texto: 'Próxima fase', primario: true, acao: () => abrirFase(jogo.idx + 1) },
      ],
      'vitoria'
    );
  }, 900);
}

/* Etapa 3: instalar um candidato. Equivalente fica verde; senão, contraexemplo. */
function escolherOpcao(i) {
  if (jogo.fim || jogo.testadas[i]) return;
  const f = jogo.fase;
  const contra = contraexemplo(f.formula, f.opcoes[i], f.variaveis);
  jogo.testadas[i] = { equivalente: !contra, contra: contra };
  jogo.ultimaOpcao = i;
  jogo.jogadas++;
  const faltam = opcoesEquivalentes(f).filter(k => !jogo.testadas[k]).length;
  if (faltam === 0) vencer();
  else renderFase();
}

function perder(motivo) {
  if (jogo.fim) return;
  jogo.fim = true;
  pararCronometro();
  renderFase();
  if (motivo !== 'tempo') {
    const sala = $('.sala');
    sala.classList.remove('curto');
    void sala.offsetWidth;
    sala.classList.add('curto');
  }
  // Partida local: qualquer derrota (tempo ou curto-circuito na Etapa 1)
  // soma tempo e erros ao placar e o MESMO jogador tenta a fase de novo.
  if (partidaLocal && jogo.partidaLocal) {
    registrarTempoDoTurno(false);
    const nome = escaparHTML(partidaLocal.jogadores[partidaLocal.ativo].nome);
    const motivoTexto = motivo === 'tempo'
      ? `${nome} não concluiu esta fase a tempo.`
      : `As ${jogo.fase.maxJogadas} jogadas acabaram e a lâmpada de ${nome} continua apagada.`;
    abrirModal(`<h3>${motivo === 'tempo' ? 'Tempo esgotado!' : 'Curto-circuito!'}</h3>
      <p>${motivoTexto} O tempo e os erros desta tentativa foram somados ao placar.</p>
      <p>É possível tentar a mesma fase novamente; o turno continua com ${nome}.</p>`,
      [
        { texto: 'Desistir', acao: irParaMenu },
        { texto: 'Tentar de novo', primario: true, acao: () => iniciarTurnoMultiplayer(partidaLocal.ativo) },
      ],
      'derrota'
    );
    return;
  }
  const textoDerrota = motivo === 'tempo'
    ? 'O tempo desta fase terminou. Recomece para tentar novamente.'
    : `As ${jogo.fase.maxJogadas} jogadas acabaram e a lâmpada continua apagada. Olhe para as portas em vermelho: qual subfórmula precisa mudar de valor?`;
  abrirModal(
    `<h3>${motivo === 'tempo' ? 'Tempo esgotado!' : 'Curto-circuito!'}</h3>
     <p>${textoDerrota}</p>`,
    [
      { texto: 'Menu', acao: irParaMenu },
      { texto: 'Tentar de novo', primario: true, acao: () => abrirFase(jogo.idx) },
    ],
    'derrota'
  );
}

/* ---------- Tabela-verdade (custa 1 estrela) ---------- */
function pedirTabela() {
  if (jogo.usouTabela || jogo.fim) { mostrarTabela(); return; }

  const f = jogo.fase;
  if (f.etapa === 2 && !preencher(f.formula, jogo.preench)) {
    abrirModal('<h3>Circuito incompleto</h3><p>Preencha todos os encaixes obrigatórios para ver a tabela-verdade do seu circuito. Nada foi cobrado.</p>',
      [{ texto: 'Ok', primario: true }]);
    return;
  }
  abrirModal('<h3>Ver a tabela-verdade?</h3><p>Consultar a tabela nesta fase custa <b>1 estrela</b> (você sempre fica com pelo menos 1).</p>',
    [
      { texto: 'Cancelar' },
      { texto: 'Ver tabela', primario: true, acao: () => { jogo.usouTabela = true; renderHUD(); mostrarTabela(); } },
    ]);
}

function mostrarTabela() {
  const f = jogo.fase;
  let formulas;
  if (f.etapa === 1) formulas = lampadasDe(f);
  else {
    const c = preencher(f.formula, jogo.preench);
    if (!c) { abrirModal('<h3>Circuito incompleto</h3><p>Preencha os encaixes obrigatórios primeiro.</p>', [{ texto: 'Ok', primario: true }]); return; }
    formulas = [c];
    if (f.alvoEquivalente) formulas.push(f.alvoEquivalente);
  }

  // Valorações "atuais" ficam destacadas na tabela
  const atuais = f.etapa === 1 ? [jogo.val] : configsDe(f);
  const ehAtual = val => atuais.some(a => f.variaveis.every(v => a[v] === val[v]));

  const t = el('table', 'tabela');
  const cab = el('tr');
  f.variaveis.forEach(v => cab.appendChild(el('th', null, v)));
  formulas.forEach(form => cab.appendChild(el('th', null, formulaParaTexto(form))));
  t.appendChild(cab);

  gerarTabelaVerdade(formulas[0], f.variaveis).forEach(linha => {
    const tr = el('tr', ehAtual(linha.valoracao) ? 'atual' : '');
    f.variaveis.forEach(v => tr.appendChild(el('td', bit(linha.valoracao[v]), bit(linha.valoracao[v]))));
    formulas.forEach(form => {
      const r = avaliar(form, linha.valoracao);
      tr.appendChild(el('td', bit(r), bit(r)));
    });
    t.appendChild(tr);
  });

  const legenda = atuais.length ? '<p>A linha destacada é a configuração atual dos interruptores.</p>' : '';
  abrirModal('<h3>Tabela-verdade</h3>' + legenda, [{ texto: 'Fechar', primario: true }]);
  $('#modal-caixa').insertBefore(t, $('#modal-caixa .modal-botoes'));
}

/* =====================================================================
   JANELAS (modal), introdução e tela final
   ===================================================================== */
function abrirModal(html, botoes, variante) {
  const caixa = $('#modal-caixa');
  caixa.className = 'modal-caixa' + (variante ? ' ' + variante : '');
  caixa.innerHTML = html;
  const linha = el('div', 'modal-botoes');
  botoes.forEach(b => {
    const btn = el('button', 'btn' + (b.primario ? ' btn-primario' : ''), b.texto);
    btn.onclick = () => { fecharModal(true); if (b.acao) b.acao(); };
    linha.appendChild(btn);
  });
  caixa.appendChild(linha);
  $('#modal').classList.remove('oculto');
  const principal = linha.querySelector('.btn-primario');
  if (principal) principal.focus();
}

function fecharModal(forcar) {
  if (!forcar && partidaLocal && jogo && (jogo.fim || jogo.aguardandoCronometro)) return;
  $('#modal').classList.add('oculto');
  if (jogo && jogo.aguardandoCronometro && $('#tela-jogo').classList.contains('ativa')) {
    iniciarCronometro();
  }
}

function mostrarIntro(etapa) {
  const info = INTRO_ETAPAS[etapa];
  const conectivos = Object.keys(OPS).map(k =>
    `<tr><td>${OPS[k].simbolo}</td><td><b>${OPS[k].nome}</b>: ${OPS[k].regra}</td></tr>`).join('');
  abrirModal(
    `<h3>${info.titulo}</h3>
     <p>${info.resumo}</p>
     <ul>${info.itens.map(i => `<li>${i}</li>`).join('')}</ul>
     <table class="ref-conectivos">${conectivos}</table>`,
    [{ texto: 'Entendi', primario: true }]
  );
}

function mostrarComoJogar() {
  mostrarIntro(1);
  const btn = $('#modal-caixa .btn-primario');
  btn.textContent = 'Próximo: Etapa 2';
  btn.onclick = () => {
    mostrarIntro(2);
    const proximo = $('#modal-caixa .btn-primario');
    proximo.textContent = 'Próximo: Etapa 3';
    proximo.onclick = () => mostrarIntro(3);
  };
}

function irParaMenu() {
  pararCronometro();
  partidaLocal = null;
  $('#match-status').hidden = true;
  $('#btn-reiniciar').hidden = false;
  fecharModal(true);
  renderMenu();
  mostrarTela('tela-menu');
}

function mostrarFinal() {
  const total = Object.values(progresso.estrelas).reduce((a, b) => a + b, 0);
  $('#final-estrelas').textContent = `★ ${total} de ${FASES.length * 3} estrelas`;
  mostrarTela('tela-final');
}

/* =====================================================================
   INICIALIZAÇÃO
   ===================================================================== */
function iniciar() {
  // 1) Prova que todas as fases têm solução (veja o console com F12)
  verificarFases(FASES);

  // 2) Botões fixos
  $('#btn-menu').onclick = irParaMenu;
  $('#btn-reiniciar').onclick = () => abrirFase(jogo.idx);
  $('#btn-tabela').onclick = pedirTabela;
  $('#btn-ajuda').onclick = () => mostrarIntro(jogo.fase.etapa);
  $('#btn-como-jogar').onclick = mostrarComoJogar;
  $('#btn-final-menu').onclick = irParaMenu;
  $('#form-multiplayer').addEventListener('submit', e => {
    e.preventDefault();
    const nome1 = $('#multiplayer-jogador1').value.trim().slice(0, 24);
    const nome2 = $('#multiplayer-jogador2').value.trim().slice(0, 24);
    if (!nome1 || !nome2 || nome1.localeCompare(nome2, undefined, { sensitivity: 'base' }) === 0) {
      abrirModal('<h3>Nomes dos jogadores</h3><p>Informe dois nomes diferentes para iniciar a partida local.</p>',
        [{ texto: 'Ok', primario: true }]);
      return;
    }
    iniciarPartidaLocal(nome1, nome2);
  });
  $('#form-jogador').addEventListener('submit', e => {
    e.preventDefault();
    const nome = $('#nome-jogador').value.trim().slice(0, 24);
    if (!nome) { $('#nome-jogador').focus(); return; }
    trocarJogador(nome);
    renderMenu();
  });
  $('#btn-reset').onclick = () => abrirModal(
    `<h3>Apagar progresso?</h3><p>Todas as estrelas e fases desbloqueadas de
     <b>${nomeJogador ? escaparHTML(nomeJogador) : 'visitante'}</b> serão perdidas.
     O progresso dos outros jogadores não muda.</p>`,
    [
      { texto: 'Cancelar' },
      { texto: 'Apagar', primario: true, acao: () => {
          progresso = { estrelas: {}, introVista: {} };
          salvarProgresso();
          renderMenu();
        } },
    ]);

  // Clicar fora da caixa ou apertar Esc fecha a janela
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') fecharModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharModal(); });

  // Clique no vazio desfaz a seleção de peça
  document.addEventListener('click', e => {
    if (!jogo || !jogo.selecionada) return;
    if (e.target.closest('.peca') || e.target.closest('.slot')) return;
    jogo.selecionada = null;
    renderBandeja();
    marcarCompativeis(null);
  });

  renderMenu();
}

iniciar();
