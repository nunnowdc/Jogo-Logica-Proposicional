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
- Cada porta lógica mostra seu valor em tempo real (verde = V, vermelho = F).
- Em algumas fases, o clique que conserta uma parte da fórmula quebra a outra, ou é preciso acender **duas lâmpadas ao mesmo tempo** (satisfazer duas fórmulas juntas).

### Etapa 2 · Construção
Os interruptores ficam travados e o jogador **monta o circuito**, arrastando conectivos e variáveis para os encaixes.

- As peças são limitadas, então é preciso planejar.
- Encaixes de negação (¬) são opcionais.
- Desafios avançados: fazer o mesmo circuito funcionar em duas salas com valores diferentes, e construir um circuito **equivalente** a `P → Q` usando só `∨` e `¬`, válido em todas as linhas da tabela-verdade.

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
index.html   telas do jogo (menu, fase, final)
style.css    visual
logic.js     avaliação das fórmulas (conectivos, valorações, tabela-verdade)
levels.js    definição das fases
game.js      interação, drag-and-drop, estrelas e progresso salvo
```

Para criar uma fase nova, copie um objeto em `levels.js` e altere os campos (o arquivo explica cada um).

## Equipe

- Ivon Buarque
- Luana Fernandes
- Nelson Meira
- Nunno Wakiyama
- Rodrigo Lucena
- Tiago Emilio

## 📄 Licença

Distribuído sob a licença MIT. Veja o arquivo [LICENSE](LICENSE).
