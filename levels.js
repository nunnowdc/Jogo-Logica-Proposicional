/* =====================================================================
   levels.js — Fases do "Circuito do Conectivo"
   ---------------------------------------------------------------------
   COMO ADICIONAR UMA FASE: copie um objeto abaixo, mude os campos e
   recarregue o jogo. O verificador (no console, F12) avisa se a fase
   não tiver solução ou se o critério de estrelas estiver errado.

   Campos:
     id               texto único, ex.: '1-3'
     etapa            1 = interruptores · 2 = construção
     titulo, dica     textos mostrados na tela
     formula          Etapa 1: fórmula (ou lista de fórmulas = várias lâmpadas)
                      Etapa 2: fórmula com encaixes SLOT_BIN / SLOT_NEG / SLOT_VAR
     variaveis        lista das variáveis, ex.: ['P', 'Q']
     estadoInicial    valores dos interruptores, ex.: { P: true, Q: false }
                      Etapa 2: pode ser uma LISTA de configurações (várias salas)
                      ou null na fase de equivalência
     travado          false = jogador mexe nos interruptores · true = fixos
     pecasDisponiveis Etapa 2: { AND: 1, OR: 1, NOT: 2, P: 1, ... } · Etapa 1: null
     maxJogadas       Etapa 1: limite de cliques · Etapa 2: null (sem limite)
     criterioEstrelas { tres: X, dois: Y } — jogadas (Etapa 1) ou peças
                      colocadas (Etapa 2) para ganhar 3 ou 2 estrelas
     alvoEquivalente  (opcional) fórmula que a montagem deve imitar
   ===================================================================== */

/* Atalhos para as variáveis, só para deixar as fórmulas mais legíveis */
const P = V('P'), Q = V('Q'), R = V('R');

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
];

if (typeof module !== 'undefined') module.exports = { FASES };
