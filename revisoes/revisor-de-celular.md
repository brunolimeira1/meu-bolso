# Relatório: revisor-de-celular

Revisão feita lendo `app/index.html`, `app/estilo.css` e `app/app.js`, imaginando o app aberto num celular de 390 px. Nada foi alterado.

| Item | O que está errado | Onde | Gravidade | Correção em uma frase |
|---|---|---|---|---|
| 1. Alvo de toque | O botão "Apagar" de cada gasto tem 40 px de altura, abaixo dos 44 px. Fica colado ao valor, então é fácil apagar o gasto errado. | `estilo.css`, `.botao-apagar` (`min-height: 40px`) | MÉDIA | Trocar para `min-height: 44px` e `min-width: 44px`. |
| 1. Alvo de toque | O botão "Sair" tem 44 px de altura, mas só uns 36 px de largura (texto curto com `padding: 10px 4px`). | `estilo.css`, `.botao-texto` | BAIXA | Aumentar o `padding` lateral para uns 12 px, ou colocar `min-width: 44px`. |
| 1. Alvo de toque | Botões grandes (Entrar, Criar conta, Salvar, Enviar, câmera, anexar) e opções de categoria têm 44 px ou mais. | `.botao`, `.opcao-categoria span` | Nada a corrigir | — |
| 2. Tamanho do texto | O detalhe de cada gasto (data e categoria, por exemplo "23/10 · Mercado") tem 0,85 rem, ou seja, 13,6 px. | `estilo.css`, `.gasto-detalhe` | MÉDIA | Subir para `font-size: 0.875rem` (14 px) ou mais. |
| 2. Tamanho do texto | O texto do botão "Apagar" também tem 0,85 rem (13,6 px). | `estilo.css`, `.botao-apagar` | MÉDIA | Subir para `font-size: 0.875rem` ou mais. |
| 3. Rolagem para o lado | Descrição com corte (`ellipsis`), valor sem quebra e botão cabem em 390 px. As categorias quebram de linha (`flex-wrap`), a tela principal tem `max-width: 560px` e os campos usam 100% da largura. Não achei largura fixa nem imagem sem limite. | `.gasto`, `.opcoes-categoria`, `input` | Nada a corrigir | — |
| 4. Lista vazia | Sem gastos, aparece "Nenhum gasto lançado neste mês.". Porém, se o carregamento falhar, o aviso de erro aparece junto com essa frase, que fica enganosa (ela já está visível desde o início). | `index.html`, `#lista-vazia`; `app.js`, `carregarGastos` | BAIXA | Esconder `#lista-vazia` até os gastos carregarem, ou quando houver erro. |
| 5. Erros | Se a leitura da sessão falhar ao abrir (`supabase.auth.getSession`, sem `try/catch`) ou se `configuracao.js` não carregar, o JavaScript para. A tela de abertura (`position: fixed`, fundo branco) nunca sai e o app fica branco, sem frase nenhuma. | `app.js`, `iniciar()`; `estilo.css`, `.abertura` | ALTA | Envolver o início em `try/catch` que esconde a abertura e mostra "Não consegui abrir o app. Confira sua internet e recarregue a página.". |
| 5. Erros | `chamarAssistente` mostra `corpo.erro` e `e.message` como vierem. Se o servidor devolver texto técnico em inglês, ele aparece na tela. O `fraseDeErro` não é aplicado a esses casos. | `app.js`, `chamarAssistente` | MÉDIA | Passar essas mensagens por uma verificação: se não for frase em português conhecida, mostrar "O assistente não respondeu. Tente de novo em instantes.". |
| 5. Erros | `apagarGasto` e `carregarGastos` não têm `try/catch`. Uma falha inesperada de rede pode não mostrar aviso algum. A mensagem padrão "Algo deu errado. Tente de novo em instantes." também não diz o que fazer. | `app.js`, `apagarGasto`, `fraseDeErro` (última linha) | BAIXA | Envolver em `try/catch` e trocar o padrão por "Não consegui concluir. Confira sua internet e tente de novo.". |
| 6. Teclado numérico | O campo Valor usa `inputmode="decimal"`. | `index.html`, `#valor` | Nada a corrigir | — |
| 7. Contraste | Na faixa azul do total, os nomes e valores por categoria (branco, 14,7 px) e o rótulo "Gasto em…" (azul bem claro) ficam sobre azul médio (`#4a86d9`, fim do degradê), com contraste abaixo do ideal. | `estilo.css`, `.destaque`, `.barra-linha`, `.rotulo` | BAIXA | Escurecer o fim do degradê (usar `--azul` ou algo mais escuro no lugar de `--azul-medio`). |
| 7. Contraste | Textos cinza (`--texto-suave`) sobre branco e erro vermelho sobre fundo rosado ficam legíveis. | `.dica`, `.aviso` | Nada a corrigir | — |
| 8. Foco visível | Campos de texto têm contorno azul ao focar. As categorias (círculos de escolha escondidos) mostram contorno com `:focus-visible`. Os botões mantêm o contorno padrão do navegador, que não foi removido. | `input:focus`, `.opcao-categoria input:focus-visible + span` | Nada a corrigir | — |

## Os três que mais atrapalham

1. **Tela em branco para sempre se o app falhar ao abrir** (ALTA): `app.js`, `iniciar()` — a abertura cobre a tela e nunca sai se algo der erro no começo. Exemplo: sem internet no primeiro acesso, a pessoa vê só um fundo branco.
2. **Textos de 13,6 px na lista de gastos** (MÉDIA): `estilo.css`, `.gasto-detalhe` e `.botao-apagar` — pequenos demais para ler com conforto no celular. Suba para pelo menos 14 px.
3. **Botão "Apagar" com 40 px de altura, colado ao valor** (MÉDIA): `estilo.css`, `.botao-apagar` — fácil errar o toque e apagar o gasto errado (por exemplo, "mercado 50"). Suba para 44 px.
