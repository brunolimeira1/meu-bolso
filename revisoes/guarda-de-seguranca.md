# Relatório: guarda-de-seguranca

Verifiquei todos os arquivos do projeto, menos a pasta `.git`. Isso inclui `.gitignore`, a pasta `.claude`, `app/`, `netlify/functions/`, `netlify.toml`, `BRIEFING.md` e `CLAUDE.md`.

| Arquivo | O que encontrou | Gravidade | O que fazer |
|---|---|---|---|
| `app/configuracao.js` (linha 5) | Chave pública do Supabase (`sb_pub…`). É o lugar permitido. | Sem achado | Nada. |
| `netlify/functions/assistente.mjs` (linha 8) | Chave pública do Supabase (`sb_pub…`) no topo do arquivo de função. É o lugar permitido. | Sem achado | Nada. |
| `netlify/functions/assistente.mjs` (linhas 244-246) | A chave do Gemini é lida de `process.env.CHAVE_GEMINI`. Não há valor escrito no arquivo. | Sem achado | Nada. |
| `app/app.js`, `app/index.html` | As palavras "senha", "token" e "Bearer" aparecem só em código que lê o login ou a sessão da pessoa, e em mensagens de erro. Não há valor escrito. | Sem achado | Nada. |
| `.gitignore` | Tem `.env`, `.netlify` e `node_modules`. | Sem achado | Nada. |
| Todo o projeto | Não encontrei `sb_secret`, `service_role`, `AIza`, textos começando com `eyJ`, arquivo `.env`, CPF, número de cartão, telefone nem e-mail de pessoa. | Sem achado | Nada. |

Nenhum achado ALTA ou MÉDIA.

PODE ENVIAR
