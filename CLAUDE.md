# Meu Bolso — memória do projeto

Este arquivo é a memória deste projeto. Leia-o inteiro sempre que abrir esta pasta, antes de fazer qualquer coisa.

## 1. O que é este projeto

O **Meu Bolso** é um app de gastos pessoais, feito durante a Formação Claude Pro.

- **Quem usa:** só eu, no celular e no computador.
- **O que faz:** registra gastos e mostra o total do mês, separado por categoria.
- **Na sexta:** ganha um assistente que lança o gasto a partir de uma frase (por exemplo, "almoço 32 reais") ou da foto do cupom fiscal.
- **Telas e categorias:** ainda não estão definidas. Elas vão sair de uma entrevista que o Claude vai conduzir comigo.

## 2. Regras técnicas que não se discutem

- Os arquivos do app ficam na pasta `app/`: `index.html`, `estilo.css`, `app.js`, `configuracao.js`, `manifest.webmanifest` e `icone.svg`.
- Sem Node, sem build, sem framework. O app é feito só com HTML, CSS e JavaScript simples.
- O cliente do Supabase entra pela internet (CDN), com esta linha:
  `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>`
- A entrada no app é por e-mail e senha, sem confirmação de e-mail.
- As tabelas `gastos` e `resumos` têm proteção por linha: cada pessoa só enxerga e altera os próprios dados.
- A URL do projeto Supabase e a chave pública ficam em `app/configuracao.js`, dentro de `window.MEU_BOLSO`.
- A chave secreta do Supabase e a chave do Gemini **nunca** entram em arquivo nenhum.
- Na raiz da pasta:
  - o `netlify.toml` publica a pasta `app`;
  - o `.gitignore` deixa de fora `.env`, `.netlify` e `node_modules`.
- O celular vem primeiro: tudo é pensado para uma tela de 390 px de largura e depois adaptado para o computador.
- Todo erro aparece como uma frase em português dizendo o que fazer (por exemplo: "Não consegui salvar. Confira sua internet e tente de novo.").

## 3. O que este app nunca faz

- Nunca pede, guarda ou mostra senha de banco, número de conta ou número de cartão.
- Nunca guarda a foto do cupom: ela é lida e descartada.
- Nunca envia e-mail ou mensagem.
- Nunca usa dado de outra pessoa.

## 4. Como trabalhar comigo

- Antes de alterar qualquer arquivo, diga o plano em até dez linhas e espere a minha aprovação.
- Uma mudança por vez, mostrando a diferença (o que era e como ficou).
- Toda entrega vai para um arquivo; na conversa, mostre só os caminhos dos arquivos.
- Fale em português, para quem não programa.
