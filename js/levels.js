/* =====================================================================
   levels.js — Fases do "Circuito do Conectivo"
   ---------------------------------------------------------------------
   COMO ADICIONAR UMA FASE: copie um objeto abaixo, mude os campos e
   recarregue o jogo. O verificador (no console, F12) avisa se a fase
   não tiver solução ou se o critério de estrelas estiver errado.

   Campos:
     id               texto único, ex.: '1-3'
     etapa            1 = interruptores · 2 = construção · 3 = circuito gêmeo
     titulo, dica     textos mostrados na tela
     formula          Etapa 1: fórmula (ou lista de fórmulas = várias lâmpadas)
                      Etapa 2: fórmula com encaixes SLOT_BIN / SLOT_NEG / SLOT_VAR
                      Etapa 3: o circuito gêmeo, com encaixes (como na Etapa 2)
     alvoEquivalente  Etapa 3: o circuito original que o gêmeo deve imitar em
                      TODAS as combinações (mesma tabela-verdade)
     desempate        Etapa 3: fase extra usada quando a partida local empata
     variaveis        lista das variáveis, ex.: ['P', 'Q']
     estadoInicial    valores dos interruptores, ex.: { P: true, Q: false }
                      Etapa 2: pode ser uma LISTA de configurações (várias salas)
                      ou null na fase de equivalência
     travado          false = jogador mexe nos interruptores · true = fixos
     pecasDisponiveis Etapa 2: { AND: 1, OR: 1, NOT: 2, P: 1, ... } · Etapa 1: null
     maxJogadas       Etapa 1: limite de cliques · Etapa 2: null (sem limite)
     criterioEstrelas { tres: X, dois: Y } — jogadas (Etapa 1), peças
                      colocadas (Etapas 2 e 3)
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

  /* ===================== ETAPA 3 — CIRCUITO GÊMEO (EQUIVALÊNCIA) ===================== */
  {
    id: '3-1', etapa: 3,
    titulo: 'Negação em dobro',
    dica: 'Dois inversores seguidos se anulam. O gêmeo não tem inversores: o que sobra da expressão?',
    alvoEquivalente: NAO(NAO(E(P, Q))),
    formula: SLOT_BIN('a', SLOT_VAR('x'), SLOT_VAR('y')),
    variaveis: ['P', 'Q'],
    estadoInicial: null, travado: false, maxJogadas: null,
    pecasDisponiveis: { AND: 1, OR: 1, P: 1, Q: 1 },
    criterioEstrelas: { tres: 3, dois: 5 },
  },
  {
    id: '3-2', etapa: 3,
    titulo: 'Lei de De Morgan',
    dica: 'No gêmeo, a negação fica nas pontas. Negar as duas pontas exige TROCAR o conectivo.',
    alvoEquivalente: NAO(E(P, Q)),
    formula: SLOT_BIN('a', SLOT_NEG('n1', SLOT_VAR('x')), SLOT_NEG('n2', SLOT_VAR('y'))),
    variaveis: ['P', 'Q'],
    estadoInicial: null, travado: false, maxJogadas: null,
    pecasDisponiveis: { AND: 1, OR: 1, NOT: 2, P: 1, Q: 1 },
    criterioEstrelas: { tres: 5, dois: 7 },
  },
  {
    id: '3-3', etapa: 3,
    titulo: 'De Morgan ao contrário',
    dica: '¬(P ∨ Q) só é V quando P e Q são F. Como dizer isso com negações nas pontas?',
    alvoEquivalente: NAO(OU(P, Q)),
    formula: SLOT_BIN('a', SLOT_NEG('n1', SLOT_VAR('x')), SLOT_NEG('n2', SLOT_VAR('y'))),
    variaveis: ['P', 'Q'],
    estadoInicial: null, travado: false, maxJogadas: null,
    pecasDisponiveis: { AND: 1, OR: 1, NOT: 2, P: 1, Q: 1 },
    criterioEstrelas: { tres: 5, dois: 7 },
  },
  {
    id: '3-4', etapa: 3,
    titulo: 'Alarme invertido',
    dica: 'O gêmeo já tem inversores fixos. A contrapositiva troca os lados e nega os dois; a inversa não serve.',
    alvoEquivalente: IMPLICA(P, Q),
    formula: SLOT_BIN('a', NAO(SLOT_VAR('x')), NAO(SLOT_VAR('y'))),
    variaveis: ['P', 'Q'],
    estadoInicial: null, travado: false, maxJogadas: null,
    pecasDisponiveis: { AND: 1, OR: 1, IMPLIES: 1, P: 1, Q: 1 },
    criterioEstrelas: { tres: 3, dois: 5 },
  },
  {
    id: '3-5', etapa: 3,
    titulo: 'Promessa descumprida',
    dica: 'P → Q só é F quando P é V e Q é F. Então ¬(P → Q) é V exatamente nesse caso.',
    alvoEquivalente: NAO(IMPLICA(P, Q)),
    formula: SLOT_BIN('a', SLOT_VAR('x'), NAO(SLOT_VAR('y'))),
    variaveis: ['P', 'Q'],
    estadoInicial: null, travado: false, maxJogadas: null,
    pecasDisponiveis: { AND: 1, OR: 1, IMPLIES: 1, P: 1, Q: 1 },
    criterioEstrelas: { tres: 3, dois: 5 },
  },
  {
    id: '3-6', etapa: 3,
    titulo: 'Espelho desmontado',
    dica: 'P ↔ Q vale nos dois sentidos: "se P então Q" E "se Q então P".',
    alvoEquivalente: SSE(P, Q),
    formula: E(SLOT_BIN('a', SLOT_VAR('x'), SLOT_VAR('y')), SLOT_BIN('b', SLOT_VAR('z'), SLOT_VAR('w'))),
    variaveis: ['P', 'Q'],
    estadoInicial: null, travado: false, maxJogadas: null,
    pecasDisponiveis: { OR: 1, IMPLIES: 2, P: 2, Q: 2 },
    criterioEstrelas: { tres: 6, dois: 8 },
  },
  {
    id: '3-7', etapa: 3, desempate: true,
    titulo: 'Distribuição de carga',
    dica: 'P ∧ (Q ∨ R): o P precisa chegar aos dois ramos do gêmeo.',
    alvoEquivalente: E(P, OU(Q, R)),
    formula: SLOT_BIN('a', E(SLOT_VAR('x'), SLOT_VAR('y')), E(SLOT_VAR('z'), SLOT_VAR('w'))),
    variaveis: ['P', 'Q', 'R'],
    estadoInicial: null, travado: false, maxJogadas: null,
    pecasDisponiveis: { AND: 1, OR: 1, P: 2, Q: 1, R: 1 },
    criterioEstrelas: { tres: 5, dois: 7 },
  },
];

if (typeof module !== 'undefined') module.exports = { FASES };
