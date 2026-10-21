/* =====================================================================
   logic.js — Núcleo de Lógica Proposicional do "Circuito do Conectivo"
   ---------------------------------------------------------------------
   Aqui fica TODA a lógica proposicional do jogo:
     • construtores de fórmulas (árvores)
     • avaliador de fórmulas (com e sem encaixes vazios)
     • conversão de fórmula para texto, com parênteses corretos
     • geração de tabela-verdade e teste de equivalência
     • verificador automático que prova que cada fase tem solução
   O game.js só desenha a tela e chama estas funções.
   ===================================================================== */

/* ---------------------------------------------------------------------
   1. Conectivos
   precedencia: quanto maior, mais "forte" o conectivo liga.
   ¬ > ∧ > ∨ > → > ↔   (ordem usual nos livros de lógica)
   --------------------------------------------------------------------- */
const OPS = {
  NOT:     { simbolo: '¬', aridade: 1, precedencia: 5, nome: 'Negação',       regra: '¬A é V quando A é F (inverte o valor).' },
  AND:     { simbolo: '∧', aridade: 2, precedencia: 4, nome: 'Conjunção',     regra: 'A ∧ B é V só quando A e B são V.' },
  OR:      { simbolo: '∨', aridade: 2, precedencia: 3, nome: 'Disjunção',     regra: 'A ∨ B é V quando pelo menos um deles é V.' },
  IMPLIES: { simbolo: '→', aridade: 2, precedencia: 2, nome: 'Condicional',   regra: 'A → B só é F quando A é V e B é F.' },
  IFF:     { simbolo: '↔', aridade: 2, precedencia: 1, nome: 'Bicondicional', regra: 'A ↔ B é V quando A e B têm o mesmo valor.' },
};

const CONECTIVOS_BINARIOS = ['AND', 'OR', 'IMPLIES', 'IFF'];

/* ---------------------------------------------------------------------
   2. Construtores
   Atalhos para escrever fórmulas no levels.js sem montar objetos na mão.
   Exemplo: (P ∨ Q) ∧ ¬R  →  E(OU(V('P'), V('Q')), NAO(V('R')))
   --------------------------------------------------------------------- */
function V(nome)          { return { var: nome }; }
function NAO(filho)       { return { op: 'NOT', child: filho }; }
function E(a, b)          { return { op: 'AND', left: a, right: b }; }
function OU(a, b)         { return { op: 'OR', left: a, right: b }; }
function IMPLICA(a, b)    { return { op: 'IMPLIES', left: a, right: b }; }
function SSE(a, b)        { return { op: 'IFF', left: a, right: b }; }

/* Encaixes (slots) usados na Etapa 2. Cada um tem um id único na fase.
   - SLOT_BIN: espaço para um conectivo binário (∧, ∨, →, ↔) entre a e b
   - SLOT_NEG: espaço OPCIONAL para um ¬ antes de "filho"
   - SLOT_VAR: espaço para uma variável (P, Q, R...)                     */
function SLOT_BIN(id, a, b)   { return { slot: id, tipo: 'bin', left: a, right: b }; }
function SLOT_NEG(id, filho)  { return { slot: id, tipo: 'neg', child: filho }; }
function SLOT_VAR(id)         { return { slot: id, tipo: 'var' }; }

/* Testes de tipo de nó */
function ehVar(no)     { return no !== null && no !== undefined && no.var !== undefined; }
function ehSlot(no)    { return no !== null && no !== undefined && no.slot !== undefined; }
function ehBinario(no) {
  return (no.op !== undefined && no.op !== 'NOT') || (ehSlot(no) && no.tipo === 'bin');
}

/* ---------------------------------------------------------------------
   3. Avaliação
   --------------------------------------------------------------------- */

/* Aplica um conectivo binário a dois valores-verdade. */
function aplicarOp(op, a, b) {
  switch (op) {
    case 'AND':     return a && b;
    case 'OR':      return a || b;
    case 'IMPLIES': return !a || b;     // só é falsa em V → F
    case 'IFF':     return a === b;     // verdadeira quando os valores coincidem
  }
  throw new Error('Conectivo desconhecido: ' + op);
}

/* avaliar(formula, valoracao)
   Avalia uma fórmula COMPLETA (sem encaixes vazios).
   valoracao é um objeto como { P: true, Q: false }.                    */
function avaliar(f, val) {
  if (ehVar(f)) {
    if (!(f.var in val)) throw new Error('Variável sem valor: ' + f.var);
    return !!val[f.var];
  }
  if (ehSlot(f)) throw new Error('Fórmula com encaixe — use preencher() antes de avaliar.');
  if (f.op === 'NOT') return !avaliar(f.child, val);
  return aplicarOp(f.op, avaliar(f.left, val), avaliar(f.right, val));
}

/* avaliarParcial(no, valoracao, preenchimento)
   Avalia um nó que PODE conter encaixes. Devolve true, false ou
   undefined (quando falta alguma peça obrigatória para saber o valor).
   É isso que permite acender os fios em tempo real no circuito.       */
function avaliarParcial(no, val, pre = {}) {
  if (ehVar(no)) return val[no.var];

  if (ehSlot(no)) {
    if (no.tipo === 'var') {
      const nome = pre[no.slot];
      return nome ? val[nome] : undefined;
    }
    if (no.tipo === 'neg') {
      const c = avaliarParcial(no.child, val, pre);
      if (c === undefined) return undefined;
      return pre[no.slot] === 'NOT' ? !c : c;  // vazio = passa o valor direto
    }
    if (no.tipo === 'bin') {
      const op = pre[no.slot];
      const a = avaliarParcial(no.left, val, pre);
      const b = avaliarParcial(no.right, val, pre);
      if (!op || a === undefined || b === undefined) return undefined;
      return aplicarOp(op, a, b);
    }
  }

  if (no.op === 'NOT') {
    const c = avaliarParcial(no.child, val, pre);
    return c === undefined ? undefined : !c;
  }
  const a = avaliarParcial(no.left, val, pre);
  const b = avaliarParcial(no.right, val, pre);
  if (a === undefined || b === undefined) return undefined;
  return aplicarOp(no.op, a, b);
}

/* preencher(formulaComSlots, preenchimento)
   Troca os encaixes pelas peças colocadas e devolve uma fórmula comum.
   Devolve null se algum encaixe obrigatório (bin ou var) estiver vazio.
   Encaixes de ¬ vazios simplesmente somem.                              */
function preencher(f, pre) {
  if (ehVar(f)) return f;
  if (ehSlot(f)) {
    if (f.tipo === 'var') return pre[f.slot] ? V(pre[f.slot]) : null;
    if (f.tipo === 'neg') {
      const c = preencher(f.child, pre);
      if (!c) return null;
      return pre[f.slot] === 'NOT' ? NAO(c) : c;
    }
    if (f.tipo === 'bin') {
      const op = pre[f.slot];
      const l = preencher(f.left, pre);
      const r = preencher(f.right, pre);
      if (!op || !l || !r) return null;
      return { op: op, left: l, right: r };
    }
  }
  if (f.op === 'NOT') {
    const c = preencher(f.child, pre);
    return c ? NAO(c) : null;
  }
  const l = preencher(f.left, pre);
  const r = preencher(f.right, pre);
  return l && r ? { op: f.op, left: l, right: r } : null;
}

/* Lista os encaixes na ordem em que aparecem (da esquerda para a direita). */
function listarSlots(f, acc = []) {
  if (ehVar(f)) return acc;
  if (ehSlot(f)) {
    if (f.tipo === 'bin') { listarSlots(f.left, acc); acc.push(f); listarSlots(f.right, acc); }
    else if (f.tipo === 'neg') { acc.push(f); listarSlots(f.child, acc); }
    else acc.push(f);
    return acc;
  }
  if (f.op === 'NOT') return listarSlots(f.child, acc);
  listarSlots(f.left, acc);
  listarSlots(f.right, acc);
  return acc;
}

/* ---------------------------------------------------------------------
   4. Fórmula → texto
   Regra de parênteses: um filho binário dentro de outro conectivo leva
   parênteses, exceto quando é o mesmo conectivo associativo (∧ ou ∨),
   pois P ∧ Q ∧ R não é ambíguo. Assim o texto nunca fica ambíguo.
   Encaixes vazios aparecem como □ e ¬ opcional vazio como [¬].
   --------------------------------------------------------------------- */
function formulaParaTexto(f, pre = {}) {
  return texto(f, pre);
}

function texto(f, pre) {
  if (ehVar(f)) return f.var;

  if (ehSlot(f)) {
    if (f.tipo === 'var') return pre[f.slot] || '□';
    if (f.tipo === 'neg') return (pre[f.slot] === 'NOT' ? '¬' : '[¬]') + embrulharUnario(f.child, pre);
    const op = pre[f.slot];
    const simb = op ? OPS[op].simbolo : '□';
    return ladoBinario(f.left, op, pre) + ' ' + simb + ' ' + ladoBinario(f.right, op, pre);
  }

  if (f.op === 'NOT') return '¬' + embrulharUnario(f.child, pre);
  return ladoBinario(f.left, f.op, pre) + ' ' + OPS[f.op].simbolo + ' ' + ladoBinario(f.right, f.op, pre);
}

function embrulharUnario(filho, pre) {
  const s = texto(filho, pre);
  return ehBinario(filho) ? '(' + s + ')' : s;
}

function ladoBinario(filho, opPai, pre) {
  const s = texto(filho, pre);
  if (!ehBinario(filho)) return s;
  const opFilho = ehSlot(filho) ? pre[filho.slot] : filho.op;
  const associativo = opFilho && opFilho === opPai && (opPai === 'AND' || opPai === 'OR');
  return associativo ? s : '(' + s + ')';
}

/* ---------------------------------------------------------------------
   5. Tabela-verdade e equivalência
   --------------------------------------------------------------------- */

/* Variáveis que aparecem na fórmula, em ordem alfabética. */
function variaveisDe(f, conj = new Set()) {
  if (ehVar(f)) conj.add(f.var);
  else if (f.child) variaveisDe(f.child, conj);
  else if (f.left) { variaveisDe(f.left, conj); variaveisDe(f.right, conj); }
  return [...conj].sort();
}

/* Todas as 2^n valorações, na ordem clássica dos livros (V primeiro). */
function todasValoracoes(vars) {
  const n = vars.length, lista = [];
  for (let i = 0; i < (1 << n); i++) {
    const val = {};
    vars.forEach((v, j) => { val[v] = ((i >> (n - 1 - j)) & 1) === 0; });
    lista.push(val);
  }
  return lista;
}

/* gerarTabelaVerdade(formula) → [{ valoracao, resultado }, ...] */
function gerarTabelaVerdade(f, vars = variaveisDe(f)) {
  return todasValoracoes(vars).map(val => ({ valoracao: val, resultado: avaliar(f, val) }));
}

/* Duas fórmulas são equivalentes quando têm a MESMA tabela-verdade. */
function equivalentes(f1, f2, vars) {
  return todasValoracoes(vars).every(val => avaliar(f1, val) === avaliar(f2, val));
}

/* ---------------------------------------------------------------------
   6. Regras de vitória (usadas pelo jogo E pelo verificador)
   --------------------------------------------------------------------- */

/* Na Etapa 1, "formula" pode ser uma fórmula ou uma lista (várias lâmpadas). */
function lampadasDe(fase) {
  return Array.isArray(fase.formula) ? fase.formula : [fase.formula];
}

/* Etapa 1: todas as lâmpadas acesas com a valoração atual? */
function lampadasAcesas(fase, val) {
  return lampadasDe(fase).every(f => avaliar(f, val));
}

/* Na Etapa 2, "estadoInicial" pode ser uma configuração ou uma lista delas. */
function configsDe(fase) {
  if (!fase.estadoInicial) return [];
  return Array.isArray(fase.estadoInicial) ? fase.estadoInicial : [fase.estadoInicial];
}

/* Etapa 2: a fórmula montada cumpre o objetivo da fase?
   - fase de equivalência: tabela-verdade igual à da fórmula-alvo
   - demais fases: V em TODAS as configurações de interruptores         */
function objetivoAtingido(fase, concreta) {
  if (!concreta) return false;
  if (fase.alvoEquivalente) return equivalentes(concreta, fase.alvoEquivalente, fase.variaveis);
  return configsDe(fase).every(val => avaliar(concreta, val));
}

/* Quais peças cabem em cada tipo de encaixe. */
function pecaCabe(tipoSlot, peca, variaveis) {
  if (tipoSlot === 'bin') return CONECTIVOS_BINARIOS.includes(peca);
  if (tipoSlot === 'neg') return peca === 'NOT';
  if (tipoSlot === 'var') return variaveis.includes(peca);
  return false;
}

/* Estrelas: 3 se resolveu no mínimo, 2 se ficou perto, 1 caso contrário.
   Consultar a tabela-verdade custa 1 estrela (nunca abaixo de 1).     */
function calcularEstrelas(fase, jogadas, usouTabela) {
  const c = fase.criterioEstrelas;
  let e = jogadas <= c.tres ? 3 : jogadas <= c.dois ? 2 : 1;
  if (usouTabela) e -= 1;
  return Math.max(1, e);
}

/* ---------------------------------------------------------------------
   7. VERIFICADOR AUTOMÁTICO DE FASES
   Prova, por força bruta, que cada fase tem solução:
     • Etapa 1: busca em largura (BFS) sobre os estados dos interruptores
       → acha o MENOR número de cliques até acender tudo.
     • Etapa 2: testa TODAS as formas de colocar as peças disponíveis
       nos encaixes → conta soluções e acha o menor número de peças.
   --------------------------------------------------------------------- */
function textoValoracao(val) {
  return Object.keys(val).map(k => k + '=' + (val[k] ? 'V' : 'F')).join(' ');
}

function verificarEtapa1(fase) {
  const vars = fase.variaveis;
  const paraVal = m => { const v = {}; vars.forEach((x, j) => { v[x] = !!((m >> j) & 1); }); return v; };
  const inicio = vars.reduce((m, x, j) => m | (fase.estadoInicial[x] ? (1 << j) : 0), 0);
  const problemas = [];

  if (lampadasAcesas(fase, paraVal(inicio))) problemas.push('a fase já começa resolvida');

  // BFS: o primeiro estado vitorioso retirado da fila é o de menor distância
  const dist = new Map([[inicio, 0]]);
  const fila = [inicio];
  let minimo = Infinity, solucao = null;
  while (fila.length) {
    const m = fila.shift();
    const d = dist.get(m);
    if (lampadasAcesas(fase, paraVal(m))) { minimo = d; solucao = paraVal(m); break; }
    for (let j = 0; j < vars.length; j++) {
      const prox = m ^ (1 << j);  // alternar o interruptor j
      if (!dist.has(prox)) { dist.set(prox, d + 1); fila.push(prox); }
    }
  }

  const totalSolucoes = todasValoracoes(vars).filter(v => lampadasAcesas(fase, v)).length;
  if (minimo === Infinity) problemas.push('nenhuma valoração acende todas as lâmpadas');
  else if (minimo > fase.maxJogadas) problemas.push(`precisa de ${minimo} jogadas, mas o limite é ${fase.maxJogadas}`);
  if (fase.criterioEstrelas.tres !== minimo) problemas.push(`criterioEstrelas.tres deveria ser ${minimo}`);

  return {
    fase: fase.id, ok: problemas.length === 0,
    minimo: minimo, limite: fase.maxJogadas, solucoes: totalSolucoes,
    exemplo: solucao ? textoValoracao(solucao) : '-',
    problema: problemas.join('; ') || '-',
  };
}

function verificarEtapa2(fase) {
  const slots = listarSlots(fase.formula);
  const pecas = { ...fase.pecasDisponiveis };
  const pre = {};
  let total = 0, minimo = Infinity, exemplo = null;
  const problemas = [];

  const ids = slots.map(s => s.slot);
  if (new Set(ids).size !== ids.length) problemas.push('há encaixes com id repetido');

  function opcoes(s) {
    if (s.tipo === 'bin') return CONECTIVOS_BINARIOS;
    if (s.tipo === 'neg') return [null, 'NOT'];   // null = deixar vazio
    return fase.variaveis;
  }

  // Backtracking: tenta cada peça disponível em cada encaixe
  function tentar(i, usadas) {
    if (i === slots.length) {
      const concreta = preencher(fase.formula, pre);
      if (objetivoAtingido(fase, concreta)) {
        total++;
        if (usadas < minimo) { minimo = usadas; exemplo = formulaParaTexto(concreta); }
      }
      return;
    }
    const s = slots[i];
    for (const p of opcoes(s)) {
      if (p === null) { tentar(i + 1, usadas); continue; }
      if ((pecas[p] || 0) <= 0) continue;
      pecas[p]--; pre[s.slot] = p;
      tentar(i + 1, usadas + 1);
      delete pre[s.slot]; pecas[p]++;
    }
  }
  tentar(0, 0);

  if (total === 0) problemas.push('nenhuma combinação de peças resolve a fase');
  if (fase.criterioEstrelas.tres !== minimo && total > 0) problemas.push(`criterioEstrelas.tres deveria ser ${minimo}`);

  return {
    fase: fase.id, ok: problemas.length === 0,
    minimo: minimo, limite: 'peças', solucoes: total,
    exemplo: exemplo || '-', problema: problemas.join('; ') || '-',
  };
}

/* Roda a verificação de todas as fases e mostra o relatório no console. */
function verificarFases(fases) {
  const relatorio = fases.map(f => {
    try { return f.etapa === 1 ? verificarEtapa1(f) : verificarEtapa2(f); }
    catch (e) { return { fase: f.id, ok: false, minimo: '-', limite: '-', solucoes: 0, exemplo: '-', problema: e.message }; }
  });
  if (typeof console !== 'undefined') {
    const ruins = relatorio.filter(r => !r.ok);
    console.log('%c⚡ Verificação automática das fases', 'font-weight:bold;color:#ffc24b');
    console.table(relatorio);
    if (ruins.length) ruins.forEach(r => console.warn(`Fase ${r.fase}: ${r.problema}`));
    else console.log(`%cTodas as ${fases.length} fases têm solução dentro dos limites.`, 'color:#3ddc84');
  }
  return relatorio;
}

/* Permite testar este arquivo no Node.js (fora do navegador). */
if (typeof module !== 'undefined') {
  module.exports = {
    OPS, CONECTIVOS_BINARIOS, V, NAO, E, OU, IMPLICA, SSE, SLOT_BIN, SLOT_NEG, SLOT_VAR,
    avaliar, avaliarParcial, preencher, listarSlots, formulaParaTexto, variaveisDe,
    gerarTabelaVerdade, equivalentes, lampadasDe, lampadasAcesas, configsDe,
    objetivoAtingido, pecaCabe, calcularEstrelas, verificarFases, textoValoracao,
  };
}
