/* =====================================================================
   levels.js — Fases do "Circuito do Conectivo"
   ---------------------------------------------------------------------
   COMO ADICIONAR UMA FASE: copie um objeto abaixo, mude os campos e
   recarregue o jogo. O verificador (no console, F12) avisa se a fase
   não tiver solução ou se o critério de estrelas estiver errado.

   Campos:
     id               texto único, ex.: '1-3'
     etapa            1 = interruptores · 2 = construção · 3 = equivalência
     titulo, dica     textos mostrados na tela
     formula          Etapa 1: fórmula (ou lista de fórmulas = várias lâmpadas)
                      Etapa 2: fórmula com encaixes SLOT_BIN / SLOT_NEG / SLOT_VAR
                      Etapa 3: circuito original, que precisa de um substituto
     opcoes           Etapa 3: circuitos candidatos (pelo menos um equivalente e
                      um não equivalente). O jogador precisa achar TODOS os
                      equivalentes; os errados mostram um contraexemplo.
     desempate        Etapa 3: fase extra usada quando a partida local empata
     variaveis        lista das variáveis, ex.: ['P', 'Q']
     estadoInicial    valores dos interruptores, ex.: { P: true, Q: false }
                      Etapa 2: pode ser uma LISTA de configurações (várias salas)
                      ou null na fase de equivalência
     travado          false = jogador mexe nos interruptores · true = fixos
     pecasDisponiveis Etapa 2: { AND: 1, OR: 1, NOT: 2, P: 1, ... } · Etapa 1: null
     maxJogadas       Etapa 1: limite de cliques · Etapa 2: null (sem limite)
     criterioEstrelas { tres: X, dois: Y } — jogadas (Etapa 1), peças
                      colocadas (Etapa 2) ou escolhas feitas (Etapa 3:
                      tres = número de opções equivalentes)
     alvoEquivalente  (opcional) fórmula que a montagem deve imitar
   ===================================================================== */

/* Atalhos para as variáveis, só para deixar as fórmulas mais legíveis */
const P = V('P'), Q = V('Q'), R = V('R'), S = V('S');

const FASES = [
  /* ===================== ETAPA 1 — INTERRUPTORES ===================== */
  {
    id: '1-1', etapa: 1,
    titulo: 'Primeira faísca',
    dica: 'A negação inverte o valor: ¬P só é V quando P é F.',
    formula: NAO(P),
    variaveis: ['P'],
    estadoInicial: { P: true },
    travado: false, pecasDisponiveis: null,
    maxJogadas: 1,
    criterioEstrelas: { tres: 1, dois: 1 },
  },
  {
    id: '1-2', etapa: 1,
    titulo: 'Dois disjuntores',
    dica: 'A conjunção (∧) só é V quando os DOIS lados são V.',
    formula: E(P, Q),
    variaveis: ['P', 'Q'],
    estadoInicial: { P: false, Q: false },
    travado: false, pecasDisponiveis: null,
    maxJogadas: 4,
    criterioEstrelas: { tres: 2, dois: 3 },
  },
  {
    id: '1-3', etapa: 1,
    titulo: 'Basta um',
    dica: 'A disjunção (∨) precisa de apenas UM lado verdadeiro. Qual clique resolve? Há mais de uma resposta.',
    formula: OU(P, NAO(Q)),
    variaveis: ['P', 'Q'],
    estadoInicial: { P: false, Q: true },
    travado: false, pecasDisponiveis: null,
    maxJogadas: 3,
    criterioEstrelas: { tres: 1, dois: 2 },
  },
  {
    id: '1-4', etapa: 1,
    titulo: 'Promessa quebrada',
    dica: 'P → Q só é F quando P é V e Q é F. Existem dois jeitos de consertar com um clique.',
    formula: IMPLICA(P, Q),
    variaveis: ['P', 'Q'],
    estadoInicial: { P: true, Q: false },
    travado: false, pecasDisponiveis: null,
    maxJogadas: 3,
    criterioEstrelas: { tres: 1, dois: 2 },
  },
  {
    id: '1-5', etapa: 1,
    titulo: 'Painel de três',
    dica: 'Resolva cada metade: (P ∨ Q) precisa de um V e ¬R precisa que R seja F. Pouca margem de erro!',
    formula: E(OU(P, Q), NAO(R)),
    variaveis: ['P', 'Q', 'R'],
    estadoInicial: { P: false, Q: false, R: true },
    travado: false, pecasDisponiveis: null,
    maxJogadas: 3,
    criterioEstrelas: { tres: 2, dois: 3 },
  },
  {
    id: '1-6', etapa: 1,
    titulo: 'O espelho e a trava',
    dica: '↔ exige valores iguais. Cuidado: o clique que conserta uma metade pode quebrar a outra.',
    formula: E(SSE(P, Q), IMPLICA(Q, NAO(R))),
    variaveis: ['P', 'Q', 'R'],
    estadoInicial: { P: false, Q: true, R: true },
    travado: false, pecasDisponiveis: null,
    maxJogadas: 3,
    criterioEstrelas: { tres: 1, dois: 2 },
  },
  {
    id: '1-7', etapa: 1,
    titulo: 'Gerador duplo',
    dica: 'As duas lâmpadas precisam acender JUNTAS: procure uma valoração que satisfaça as duas fórmulas ao mesmo tempo.',
    formula: [
      IMPLICA(OU(P, Q), R),
      OU(NAO(R), E(P, NAO(Q))),
    ],
    variaveis: ['P', 'Q', 'R'],
    estadoInicial: { P: true, Q: true, R: false },
    travado: false, pecasDisponiveis: null,
    maxJogadas: 4,
    criterioEstrelas: { tres: 2, dois: 3 },
  },

  /* ===================== ETAPA 2 — CONSTRUÇÃO ===================== */
  {
    id: '2-1', etapa: 2,
    titulo: 'Encaixe simples',
    dica: 'Com P=V e Q=F, qual conectivo dá V?',
    formula: SLOT_BIN('a', P, Q),
    variaveis: ['P', 'Q'],
    estadoInicial: { P: true, Q: false },
    travado: true,
    pecasDisponiveis: { AND: 1, OR: 1, IFF: 1 },
    maxJogadas: null,
    criterioEstrelas: { tres: 1, dois: 2 },
  },
  {
    id: '2-2', etapa: 2,
    titulo: 'Dois encaixes',
    dica: 'Monte de dentro para fora: primeiro decida o valor de (P □ Q), depois como combiná-lo com R.',
    formula: SLOT_BIN('b', SLOT_BIN('a', P, Q), R),
    variaveis: ['P', 'Q', 'R'],
    estadoInicial: { P: false, Q: true, R: false },
    travado: true,
    pecasDisponiveis: { AND: 1, OR: 1, IMPLIES: 1 },
    maxJogadas: null,
    criterioEstrelas: { tres: 2, dois: 4 },
  },
  {
    id: '2-3', etapa: 2,
    titulo: 'Inversores',
    dica: 'Os encaixes pequenos aceitam ¬ e podem ficar vazios. Use a negação só onde ela ajuda.',
    formula: E(SLOT_NEG('n1', P), SLOT_BIN('a', Q, SLOT_NEG('n2', R))),
    variaveis: ['P', 'Q', 'R'],
    estadoInicial: { P: false, Q: false, R: true },
    travado: true,
    pecasDisponiveis: { NOT: 2, OR: 1, IFF: 1 },
    maxJogadas: null,
    criterioEstrelas: { tres: 2, dois: 3 },
  },
  {
    id: '2-4', etapa: 2,
    titulo: 'Estoque baixo',
    dica: 'Sem ∨ e sem → na bandeja! Lembre: ↔ também é V quando os DOIS lados são F.',
    formula: SLOT_BIN('b', SLOT_BIN('a', P, Q), R),
    variaveis: ['P', 'Q', 'R'],
    estadoInicial: { P: false, Q: true, R: false },
    travado: true,
    pecasDisponiveis: { AND: 2, IFF: 1 },
    maxJogadas: null,
    criterioEstrelas: { tres: 2, dois: 4 },
  },
  {
    id: '2-5', etapa: 2,
    titulo: 'Fios soltos',
    dica: 'Agora você escolhe as variáveis. Cada peça só existe uma vez: pense em quem precisa ser V e quem precisa ser F.',
    formula: E(E(SLOT_VAR('x'), NAO(SLOT_VAR('y'))), IMPLICA(SLOT_VAR('z'), R)),
    variaveis: ['P', 'Q', 'R'],
    estadoInicial: { P: true, Q: false, R: false },
    travado: true,
    pecasDisponiveis: { P: 1, Q: 1, R: 1 },
    maxJogadas: null,
    criterioEstrelas: { tres: 3, dois: 5 },
  },
  {
    id: '2-6', etapa: 2,
    titulo: 'Peça de reposição',
    dica: 'O → quebrou! Monte um circuito EQUIVALENTE a P → Q usando só ∨ e ¬. Ele precisa acertar TODAS as linhas da tabela.',
    formula: SLOT_BIN('a', SLOT_NEG('n1', SLOT_VAR('x')), SLOT_NEG('n2', SLOT_VAR('y'))),
    variaveis: ['P', 'Q'],
    estadoInicial: null,
    travado: true,
    pecasDisponiveis: { OR: 1, NOT: 2, P: 1, Q: 1 },
    maxJogadas: null,
    criterioEstrelas: { tres: 4, dois: 6 },
    alvoEquivalente: IMPLICA(P, Q),
  },
  {
    id: '2-7', etapa: 2,
    titulo: 'Núcleo da usina',
    dica: 'O MESMO circuito alimenta duas salas com interruptores diferentes. Ele precisa dar V nas duas ao mesmo tempo.',
    formula: E(SLOT_BIN('a', P, Q), SLOT_BIN('b', SLOT_NEG('n', R), P)),
    variaveis: ['P', 'Q', 'R'],
    estadoInicial: [
      { P: true, Q: false, R: true },
      { P: false, Q: true, R: false },
    ],
    travado: true,
    pecasDisponiveis: { AND: 1, OR: 1, IMPLIES: 1, IFF: 1, NOT: 1 },
    maxJogadas: null,
    criterioEstrelas: { tres: 2, dois: 4 },
  },

  /* ===================== ETAPA 3 — EQUIVALÊNCIA LÓGICA ===================== */
  {
    id: '3-1', etapa: 3,
    titulo: 'Dupla negação',
    dica: 'Negar duas vezes desfaz a negação. Qual circuito sempre dá o mesmo valor que ¬¬P?',
    formula: NAO(NAO(P)),
    opcoes: [NAO(P), P, OU(P, NAO(P)), E(P, NAO(P))],
    variaveis: ['P'],
    criterioEstrelas: { tres: 1, dois: 2 },
  },
  {
    id: '3-2', etapa: 3,
    titulo: 'Ordem dos fios',
    dica: 'Na conjunção, a ordem dos lados não muda o resultado (comutatividade).',
    formula: E(P, Q),
    opcoes: [OU(P, Q), E(Q, P), IMPLICA(P, Q), E(NAO(P), Q)],
    variaveis: ['P', 'Q'],
    criterioEstrelas: { tres: 1, dois: 2 },
  },
  {
    id: '3-3', etapa: 3,
    titulo: 'Lei de De Morgan',
    dica: 'Negar um ∧ vira um ∨ das negações. Há DOIS substitutos válidos: encontre os dois.',
    formula: NAO(E(P, Q)),
    opcoes: [E(NAO(P), NAO(Q)), OU(NAO(P), NAO(Q)), OU(NAO(P), Q), IMPLICA(P, NAO(Q))],
    variaveis: ['P', 'Q'],
    criterioEstrelas: { tres: 2, dois: 3 },
  },
  {
    id: '3-4', etapa: 3,
    titulo: 'De Morgan ao contrário',
    dica: 'Negar um ∨ vira um ∧ das negações: nenhum dos dois pode ser V.',
    formula: NAO(OU(P, Q)),
    opcoes: [OU(NAO(P), NAO(Q)), E(NAO(P), Q), E(NAO(P), NAO(Q)), NAO(E(P, Q))],
    variaveis: ['P', 'Q'],
    criterioEstrelas: { tres: 1, dois: 2 },
  },
  {
    id: '3-5', etapa: 3,
    titulo: 'Condicional disfarçada',
    dica: 'P → Q só é F quando P é V e Q é F. A recíproca e a inversa NÃO servem; há dois substitutos válidos.',
    formula: IMPLICA(P, Q),
    opcoes: [IMPLICA(Q, P), OU(NAO(P), Q), IMPLICA(NAO(P), NAO(Q)), IMPLICA(NAO(Q), NAO(P))],
    variaveis: ['P', 'Q'],
    criterioEstrelas: { tres: 2, dois: 3 },
  },
  {
    id: '3-6', etapa: 3,
    titulo: 'Espelho desmontado',
    dica: 'P ↔ Q é V quando os valores são iguais. Há dois jeitos de montá-lo sem usar ↔.',
    formula: SSE(P, Q),
    opcoes: [E(IMPLICA(P, Q), IMPLICA(Q, P)), OU(IMPLICA(P, Q), IMPLICA(Q, P)), SSE(NAO(P), Q), OU(E(P, Q), E(NAO(P), NAO(Q)))],
    variaveis: ['P', 'Q'],
    criterioEstrelas: { tres: 2, dois: 3 },
  },
  {
    id: '3-7', etapa: 3, desempate: true,
    titulo: 'Distribuição de carga',
    dica: 'O ∧ se distribui sobre o ∨: P ∧ (Q ∨ R) é o mesmo que aplicar P a cada lado.',
    formula: E(P, OU(Q, R)),
    opcoes: [OU(E(P, Q), R), OU(E(P, Q), E(P, R)), E(OU(P, Q), OU(P, R)), OU(P, E(Q, R))],
    variaveis: ['P', 'Q', 'R'],
    criterioEstrelas: { tres: 1, dois: 2 },
  },
];

if (typeof module !== 'undefined') module.exports = { FASES };
