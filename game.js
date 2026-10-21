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
      'Cada porta lógica mostra seu valor em tempo real: borda <b class="txt-v">verde</b> = V, borda <b class="txt-f">vermelha</b> = F.',
      'A lâmpada acende quando a fórmula inteira é V, e aí a porta abre.',
      'Se as jogadas acabarem com a lâmpada apagada, o circuito entra em curto e você recomeça.',
      'Menos jogadas = mais estrelas. Consultar a tabela-verdade custa 1 estrela.',
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
};

/* ---------- Progresso salvo (localStorage com try/catch) ---------- */
const CHAVE_SAVE = 'circuito-do-conectivo-v1';

function carregarProgresso() {
  try {
    const texto = localStorage.getItem(CHAVE_SAVE);
    if (texto) {
      const dados = JSON.parse(texto);
      return { estrelas: dados.estrelas || {}, introVista: dados.introVista || {} };
    }
  } catch (e) { /* navegador sem acesso ao armazenamento: segue sem salvar */ }
  return { estrelas: {}, introVista: {} };
}

function salvarProgresso() {
  try { localStorage.setItem(CHAVE_SAVE, JSON.stringify(progresso)); } catch (e) { /* ignora */ }
}

let progresso = carregarProgresso();

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

function faseDesbloqueada(i) {
  return i === 0 || (progresso.estrelas[FASES[i - 1].id] || 0) > 0;
}

/* =====================================================================
   MENU
   ===================================================================== */
function renderMenu() {
  const cont = $('#lista-fases');
  cont.innerHTML = '';

  [1, 2].forEach(etapa => {
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
}

/* =====================================================================
   ABRIR / REINICIAR FASE
   ===================================================================== */
function abrirFase(i) {
  const f = FASES[i];
  jogo = {
    idx: i,
    fase: f,
    val: f.etapa === 1 ? { ...f.estadoInicial } : null,  // interruptores (Etapa 1)
    jogadas: 0,
    preench: {},                                         // encaixe → peça (Etapa 2)
    pecas: { ...(f.pecasDisponiveis || {}) },            // estoque da bandeja
    selecionada: null,                                   // peça escolhida por toque/clique
    arrastando: null,                                    // peça sendo arrastada
    usouTabela: false,
    fim: false,
    venceu: false,
  };
  mostrarTela('tela-jogo');
  renderFase();

  // Mostra a introdução da etapa na primeira vez que o jogador chega nela
  const primeiraDaEtapa = FASES.findIndex(x => x.etapa === f.etapa) === i;
  if (primeiraDaEtapa && !progresso.introVista[f.etapa]) {
    progresso.introVista[f.etapa] = true;
    salvarProgresso();
    mostrarIntro(f.etapa);
  }
}

/* =====================================================================
   O QUE CADA "LINHA" DO CIRCUITO MOSTRA
   Etapa 1: uma linha por lâmpada, todas com a mesma valoração.
   Etapa 2: uma linha por sala (configuração de interruptores), ou uma
            linha sem valores na fase de equivalência.
   ===================================================================== */
function linhasDaFase() {
  const f = jogo.fase;
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

  const hj = $('#hud-jogadas');
  if (f.etapa === 1) {
    hj.textContent = `Jogadas: ${jogo.jogadas} / ${f.maxJogadas}`;
    hj.classList.toggle('alerta', f.maxJogadas - jogo.jogadas <= 1 && !jogo.venceu);
  } else {
    hj.textContent = `Peças colocadas: ${jogo.jogadas}`;
    hj.classList.remove('alerta');
  }
  $('#hud-estrelas').textContent = estrelasTexto(calcularEstrelas(f, jogo.jogadas, jogo.usouTabela));

  // Fórmula em texto, acima do circuito
  const ft = $('#formula-texto');
  if (f.etapa === 1) {
    ft.innerHTML = '';
    lampadasDe(f).forEach((form, k, arr) => {
      if (arr.length > 1) ft.appendChild(el('span', null, 'L' + (k + 1) + ':'));
      ft.appendChild(document.createTextNode(formulaParaTexto(form) + (k < arr.length - 1 ? '   ' : '')));
    });
  } else {
    ft.innerHTML = '<span>Fórmula:</span>';
    ft.appendChild(document.createTextNode(formulaParaTexto(f.formula, jogo.preench)));
  }
}

/* ---------- Painel de interruptores ---------- */
function renderInterruptores() {
  const f = jogo.fase;
  const painel = $('#painel-interruptores');
  painel.innerHTML = '';
  const cfgs = f.etapa === 2 ? configsDe(f) : [];

  // Sem painel lateral: fase de equivalência ou várias salas (os valores aparecem em cada sala)
  const semPainel = f.etapa === 2 && cfgs.length !== 1;
  $('.sala').classList.toggle('sem-interruptores', semPainel);
  if (semPainel) return;

  const val = f.etapa === 1 ? jogo.val : cfgs[0];
  painel.appendChild(el('p', 'painel-titulo', f.travado ? 'Interruptores travados' : 'Interruptores'));

  f.variaveis.forEach(v => {
    const b = el('button', 'interruptor' + (val[v] ? ' ligado' : ''));
    b.innerHTML = `<span class="alavanca"><span class="pino"></span></span><span>${v}</span>` +
                  `<span class="bitv">${bit(val[v])}</span>`;
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
      if (linha.mostrarConfig) {
        Object.keys(linha.val).forEach(v => {
          rot.appendChild(el('span', 'chip-val ' + (linha.val[v] ? 'v1' : 'v0'), `${v} = ${bit(linha.val[v])}`));
        });
      }
      caixa.appendChild(rot);
    }

    const corpo = el('div', 'linha-corpo');
    corpo.appendChild(renderNo(linha.formula, linha.val));
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
    if (val) d.appendChild(el('span', 'bit', bit(v)));
    return d;
  }

  // Encaixes (Etapa 2)
  if (ehSlot(no)) {
    if (no.tipo === 'var') return renderSlot(no, cor, v, val);

    if (no.tipo === 'neg') {
      const g = el('div', 'no gate' + cor + (jogo.preench[no.slot] ? '' : ' neg-vazio'));
      g.appendChild(renderSlot(no));
      g.appendChild(renderNo(no.child, val));
      adicionarSaida(g, v);
      return g;
    }

    const g = el('div', 'no gate' + cor);   // encaixe binário
    g.appendChild(renderNo(no.left, val));
    g.appendChild(renderSlot(no));
    g.appendChild(renderNo(no.right, val));
    adicionarSaida(g, v);
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
  adicionarSaida(g, v);
  return g;
}

/* Etiqueta com o valor de saída de cada porta (V/F) */
function adicionarSaida(g, v) {
  if (v === undefined) return;
  g.appendChild(el('span', 'saida', bit(v)));
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
      if (val) s.appendChild(el('span', 'bit', bit(v)));
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
  const todas = linhasDaFase().every(lampadaAcesa);
  if (todas) { vencer(); return; }
  if (jogo.fase.etapa === 1 && jogo.jogadas >= jogo.fase.maxJogadas) perder();
}

function vencer() {
  jogo.fim = true;
  jogo.venceu = true;
  jogo.selecionada = null;
  const f = jogo.fase;
  const est = calcularEstrelas(f, jogo.jogadas, jogo.usouTabela);
  progresso.estrelas[f.id] = Math.max(progresso.estrelas[f.id] || 0, est);
  salvarProgresso();
  renderFase();

  const ultima = jogo.idx === FASES.length - 1;
  const unidade = f.etapa === 1 ? 'jogada' : 'peça';
  const s = jogo.jogadas === 1 ? '' : 's';

  setTimeout(() => {
    abrirModal(
      `<h3>Porta aberta!</h3>
       <div class="estrelas-grandes">${'★'.repeat(est)}<span class="apagada">${'★'.repeat(3 - est)}</span></div>
       <p>Você resolveu com <b>${jogo.jogadas}</b> ${unidade}${s}. O mínimo possível é <b>${f.criterioEstrelas.tres}</b>.` +
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

function perder() {
  jogo.fim = true;
  renderFase();
  const sala = $('.sala');
  sala.classList.remove('curto');
  void sala.offsetWidth;          // reinicia a animação
  sala.classList.add('curto');
  abrirModal(
    `<h3>Curto-circuito!</h3>
     <p>As ${jogo.fase.maxJogadas} jogadas acabaram e a lâmpada continua apagada.
        Olhe para as portas em vermelho: qual subfórmula precisa mudar de valor?</p>`,
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
    btn.onclick = () => { fecharModal(); if (b.acao) b.acao(); };
    linha.appendChild(btn);
  });
  caixa.appendChild(linha);
  $('#modal').classList.remove('oculto');
  const principal = linha.querySelector('.btn-primario');
  if (principal) principal.focus();
}

function fecharModal() { $('#modal').classList.add('oculto'); }

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
  // Ao fechar a primeira, mostra a segunda
  const btn = $('#modal-caixa .btn-primario');
  btn.textContent = 'Próximo: Etapa 2';
  btn.onclick = () => mostrarIntro(2);
}

function irParaMenu() {
  fecharModal();
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
  $('#btn-reset').onclick = () => abrirModal(
    '<h3>Apagar progresso?</h3><p>Todas as estrelas e fases desbloqueadas serão perdidas.</p>',
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
