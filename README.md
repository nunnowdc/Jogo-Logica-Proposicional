# Circuito do Conectivo

> A usina está apagada há anos. Você é o técnico enviado para religá-la, sala por sala.
> Cada porta é controlada por um circuito lógico e só abre quando a fórmula dele for **VERDADEIRA**.

Jogo de puzzle digital em que a **Lógica Proposicional** é a própria mecânica: o jogador manipula valores-verdade e monta fórmulas com conectivos para energizar circuitos e abrir portas.

Projeto desenvolvido para a AV2 da disciplina de Lógica (CESAR School, 2026.2).

## Como jogar

**Online:** https://nunnowdc.github.io/Jogo-Logica-Proposicional/

**Localmente:** baixe ou clone o repositório e abra o `index.html` no navegador. Não precisa instalar nada.

```bash
git clone https://github.com/nunnowdc/Jogo-Logica-Proposicional.git
```

## Etapas

### Etapa 1 · Interruptores
O circuito já está montado. O jogador liga e desliga as variáveis (P, Q, R) até a fórmula inteira dar **V** e a lâmpada acender.

- Cada clique conta como uma jogada, e as jogadas são limitadas. Se acabarem com a lâmpada apagada, o circuito entra em curto.
- As portas destacam o estado por cor (verde/vermelho), sem etiquetas numéricas sobre os componentes.
- Em algumas fases, o clique que conserta uma parte da fórmula quebra a outra, ou é preciso acender **duas lâmpadas ao mesmo tempo** (satisfazer duas fórmulas juntas).

### Etapa 2 · Construção
Os interruptores ficam travados e o jogador **monta o circuito**, arrastando conectivos e variáveis para os encaixes.

- As peças são limitadas, então é preciso planejar.
- Encaixes de negação (¬) são opcionais.
- Desafios avançados: fazer o mesmo circuito funcionar em duas salas com valores diferentes, e construir um circuito **equivalente** a `P → Q` usando só `∨` e `¬`, válido em todas as linhas da tabela-verdade.

### Etapa 3 · Equivalência lógica
Um circuito queimou e precisa ser trocado. O jogador recebe o **circuito original** e quatro candidatos, e deve escolher os que são **equivalentes** (≡), ou seja, que dão o mesmo valor em todas as linhas da tabela-verdade.

- Ao acertar, o jogo mostra a tabela-verdade completa provando a equivalência.
- Ao errar, o jogo mostra um **contraexemplo**: uma combinação de valores em que os dois circuitos discordam.
- Algumas fases têm dois substitutos válidos, e a porta só abre quando o jogador encontra os dois.
- Leis trabalhadas: dupla negação, comutatividade, De Morgan (∧ e ∨), condicional como `¬P ∨ Q` e contrapositiva (e por que a recíproca e a inversa **não** servem), bicondicional sem `↔` e distributividade.

### Multiplayer local
No menu, informe os nomes de dois jogadores para iniciar uma partida no mesmo dispositivo. Os dois recebem as **mesmas três fases** sorteadas, uma de cada etapa, e os turnos alternam após cada fase concluída. Cada jogador tem 120 segundos por tentativa, e apenas o tempo do turno ativo soma ao total.

- Cada jogada além do mínimo da fase (escolha errada, clique ou peça a mais) soma **+15 s** ao tempo, para que chutar não compense.
- Vence o menor tempo total; em empate, contam menos tentativas e, persistindo a igualdade, ambos resolvem a fase extra de desempate.

### Tempo e ranking
Cada fase tem limite de **120 segundos**. Ao zerar, a tentativa termina e é possível recomeçar.

Cada nome salvo no menu tem o **próprio progresso** (fases liberadas e estrelas), e o ranking da sala soma as estrelas de cada um. Sem nome, você joga como visitante e não entra no ranking. Tudo fica salvo no navegador daquele computador: para compartilhar o ranking entre dispositivos seria necessário um servidor, que este projeto não possui.

### Pontuação
Menos jogadas, menos peças ou menos tentativas rendem mais estrelas (até ★★★ por fase). Consultar a tabela-verdade custa uma estrela.

## Lógica proposicional no jogo

| Conceito | Onde aparece |
|---|---|
| Negação `¬` | Inversores nos circuitos e encaixes de negação |
| Conjunção `∧` | Portas que exigem os dois lados verdadeiros |
| Disjunção `∨` | Portas em que basta um lado verdadeiro |
| Condicional `→` | Fase "Promessa quebrada" e circuitos mistos |
| Bicondicional `↔` | Portas "espelho", que exigem valores iguais |
| Valoração / satisfatibilidade | Encontrar valores que tornam a fórmula V |
| Satisfação simultânea | Várias lâmpadas ou várias salas ao mesmo tempo |
| Equivalência lógica | Etapa 3 inteira e a fase "Peça de reposição" (`P → Q` com `∨` e `¬`) |
| Contraexemplo | Feedback de cada escolha errada na Etapa 3 |
| Leis de equivalência | De Morgan, dupla negação, contrapositiva, comutatividade, distributividade |
| Tabela-verdade | Consulta dentro do jogo (com custo) e prova das equivalências |

## Estrutura

```
index.html        telas do jogo (menu, fase, final)
css/
  tema.css        cores e fontes (todas as variáveis do visual)
  base.css        estrutura geral, botões, tabelas e janelas
  menu.css        tela de menu e tela final
  jogo.css        HUD, interruptores, circuito, porta e bandeja
js/
  logic.js        avaliação das fórmulas (conectivos, valorações, tabela-verdade)
  levels.js       definição das fases
  game.js         interação, drag-and-drop, estrelas e progresso salvo
img/              imagens e prints
```

- **Mudar o visual:** comece pelo `css/tema.css`. Os outros arquivos CSS usam só as variáveis definidas nele.
- **Criar uma fase nova:** copie um objeto em `js/levels.js` e altere os campos (o arquivo explica cada um).

## Equipe

- Ivon Buarque
- Luana Fernandes
- Nelson Meira
- Nunno Wakiyama
- Rodrigo Lucena
- Tiago Emilio

## 📄 Licença

Distribuído sob a licença MIT. Veja o arquivo [LICENSE](LICENSE).

## Próximas melhorias

- Multiplayer entre jogadores.
