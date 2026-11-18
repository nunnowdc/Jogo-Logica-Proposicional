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

### Etapa 3 · Fios da tabela-verdade
O jogador avalia uma expressão para cada combinação de valores e conecta a saída do circuito ao terminal **V** ou **F** correspondente.

- A tabela-verdade é preenchida à medida que cada linha é resolvida.
- Uma conexão incorreta permite tentar novamente, mas conta como tentativa e pode reduzir as estrelas.
- A dificuldade cresce de duas para quatro variáveis, com expressões cada vez mais complexas.
- A fase “Prova por contraexemplo” compara `P → Q` e `P ∨ Q`.
- As três fases adicionais exploram condicional, bicondicional e fórmulas com quatro variáveis.

### Multiplayer local
No menu, informe os nomes de dois jogadores para iniciar uma partida no mesmo dispositivo. Cada participante recebe três fases sorteadas; os turnos alternam após cada fase concluída. Cada jogador tem 120 segundos por tentativa, e apenas o tempo do turno ativo soma ao total. Vence o menor tempo total; em empate, contam menos tentativas e, persistindo a igualdade, ambos resolvem a fase extra de desempate.

### Tempo e ranking
Cada fase tem limite de **120 segundos**. Ao zerar, a tentativa termina e é possível recomeçar. O ranking da sala é local ao navegador: registre um nome e acumule estrelas ao concluir fases. Para compartilhar o ranking entre dispositivos seria necessário um servidor, que este projeto não possui.

### Pontuação
Menos jogadas ou menos peças rendem mais estrelas (até ★★★ por fase). Consultar a tabela-verdade custa uma estrela.

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
| Equivalência lógica | Substituir `P → Q` por `¬P ∨ Q` |
| Tabela-verdade | Consulta dentro do jogo (com custo) |

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
