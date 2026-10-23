# Briefing: Minhas Despesas

Resultado da entrevista de oito perguntas. O projeto continua sendo o Meu Bolso (veja CLAUDE.md), mas o nome que aparece no app é **Minhas Despesas**.

## C — Contexto (quem usa e onde)

- **Quem usa:** só eu, no celular (principal) e no computador.
- **Onde lanço mais:** com calma, na mesa de casa. Não é um uso apressado no caixa.
- **Sensação ao abrir:** leveza. Tons de azul com branco.
- **Primeira impressão:** a logo do app aparece rapidamente sobre fundo branco e logo dá lugar à tela principal.

## L — Limites

**O que o app nunca faz:**
- Nunca compartilha minhas informações sem a minha permissão.
- Nunca pede, guarda ou mostra senha de banco, número de conta ou número de cartão. A categoria "Cartão de Crédito" guarda só o nome da categoria e o valor.
- Nunca guarda a foto do cupom: ela é lida e descartada.
- Nunca envia e-mail ou mensagem.
- Nunca usa dado de outra pessoa.
- Nunca tem layout ruim no celular: a tela de 390 px vem primeiro.
- Nunca é lento: demorar para abrir ou para salvar é o que me faria abandonar o app na primeira semana.

**Toques máximos para lançar um gasto:** 4. São eles: escolher a categoria, digitar o valor, escrever uma descrição curta e salvar.

## A — Ação (o que construir)

**Uma tela só**, de cima para baixo:

1. **O que aparece em cinco segundos:** o total do mês, dividido por categoria (cada categoria com seu valor), e o total geral logo acima.
2. **Lançamento à mão:** botões grandes com as categorias, campo de valor, campo de descrição curta e o botão Salvar. A descrição aceita ditado pelo microfone do teclado do celular.
3. **Lista do mês:** os gastos do mês atual, do mais recente para o mais antigo, com data, categoria, descrição e valor.
4. **Espaço do assistente (chega na sexta):** um lugar reservado para lançar o gasto por uma frase (digitada ou ditada) ou pela foto do cupom. Até sexta, fica visível como "em breve".

**Categorias, com os meus nomes:**

1. Mercado
2. Carro
3. Cartão de Crédito
4. Contas Essenciais
5. Lazer
6. Miguel
7. Outros

## R — Resultado

Ao abrir o app, em até cinco segundos eu respondo **"Quanto já gastei este mês, e em quê?"** só olhando a tela, sem tocar em nada e sem rolar.

## O — Observáveis (cinco testes que provam que está pronto)

1. **Cinco segundos:** abro o app no celular e, em até 5 segundos, vejo o total do mês e o valor de cada uma das 7 categorias, sem tocar e sem rolar a tela.
2. **Quatro toques:** lanço um gasto (categoria, valor, descrição, Salvar) com no máximo 4 toques, e ele aparece na hora na lista do mês e no total da categoria.
3. **Rapidez:** depois de tocar em Salvar, o gasto aparece na tela em até 2 segundos; o app abre e mostra a tela principal em até 3 segundos.
4. **Celular primeiro:** na largura de 390 px, nada fica cortado, nada exige rolar para os lados e todos os botões dá para tocar com o dedo sem errar.
5. **Privacidade:** entro com outra conta de teste e não vejo nenhum gasto da minha conta; nenhuma tela pede número de cartão, conta ou senha de banco; um erro (por exemplo, sem internet) aparece como uma frase em português dizendo o que fazer.
