// Assistente do Minhas Despesas.
// Recebe uma frase ou a foto de um cupom, pede ao Gemini para escolher uma ferramenta
// e grava ou consulta os gastos no Supabase COM O LOGIN DA PRÓPRIA PESSOA.
// A chave do Gemini vem só de process.env.CHAVE_GEMINI. Nenhuma chave secreta aqui.

// Copiados de app/configuracao.js (dados públicos).
const SUPABASE_URL = "https://wfiluytqiofrtqdildgv.supabase.co";
const SUPABASE_CHAVE_PUBLICA = "sb_publishable_mIWJofUZl3FiytujxlX1Zg_RzOQnVTo";

const MODELO = "gemini-3.5-flash-lite";
const CATEGORIAS_PADRAO = ["Mercado", "Carro", "Cartão de Crédito", "Contas Essenciais", "Lazer", "Miguel", "Outros"];

export const config = { path: "/api/assistente" };

// ---------- Utilidades ----------

class ErroAmigavel extends Error {
  constructor(frase, status = 400) {
    super(frase);
    this.status = status;
  }
}

function responder(corpo, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function hojeSaoPaulo() {
  // en-CA formata como AAAA-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function dataValida(texto) {
  return typeof texto === "string" && /^\d{4}-\d{2}-\d{2}$/.test(texto) && !Number.isNaN(Date.parse(texto));
}

function dataBR(texto) {
  const [ano, mes, dia] = texto.split("-");
  return dia + "/" + mes + "/" + ano;
}

const formatoReal = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const real = (v) => formatoReal.format(v).replace(/ /g, " ");

function cabecalhosSupabase(token) {
  return {
    apikey: SUPABASE_CHAVE_PUBLICA,
    Authorization: "Bearer " + token,
    "content-type": "application/json"
  };
}

async function erroDoSupabase(resposta) {
  let detalhe = {};
  try { detalhe = await resposta.json(); } catch {}
  const texto = String(detalhe.message || detalhe.msg || "").toLowerCase();
  if (resposta.status === 401 || texto.includes("jwt")) {
    return new ErroAmigavel("Seu login venceu. Toque em Sair, entre de novo e repita.", 401);
  }
  if (detalhe.code === "42P01" || detalhe.code === "PGRST205" || texto.includes("does not exist") || texto.includes("could not find the table")) {
    return new ErroAmigavel("Não encontrei a tabela gastos no banco. Confira se ela existe no Supabase.", 500);
  }
  if (resposta.status === 403 || detalhe.code === "42501") {
    return new ErroAmigavel("O banco recusou a operação. Confira a proteção por linha da tabela gastos no Supabase.", 403);
  }
  return new ErroAmigavel("O banco não respondeu como esperado. Tente de novo em instantes.", 502);
}

// ---------- Login ----------

async function conferirLogin(req) {
  const cabecalho = req.headers.get("authorization") || "";
  const token = cabecalho.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new ErroAmigavel("Você não está conectado. Entre no app e tente de novo.", 401);

  let resposta;
  try {
    resposta = await fetch(SUPABASE_URL + "/auth/v1/user", {
      headers: { apikey: SUPABASE_CHAVE_PUBLICA, Authorization: "Bearer " + token }
    });
  } catch {
    throw new ErroAmigavel("Não consegui falar com o banco. Tente de novo em instantes.", 502);
  }
  if (!resposta.ok) throw new ErroAmigavel("Seu login venceu. Toque em Sair, entre de novo e repita.", 401);
  const usuario = await resposta.json();
  return { token, usuario };
}

// ---------- Gemini ----------

const FERRAMENTAS = [{
  function_declarations: [
    {
      name: "registrar_gasto",
      description: "Lança um gasto da pessoa. Use quando ela informar um gasto ou mandar a foto de um cupom fiscal.",
      parameters: {
        type: "object",
        properties: {
          data: { type: "string", description: "Data do gasto no formato AAAA-MM-DD." },
          descricao: { type: "string", description: "Onde ou com o quê, curto. No cupom, o nome da loja." },
          valor: { type: "number", description: "Valor em reais, com ponto decimal. No cupom, o VALOR TOTAL." },
          categoria: { type: "string", description: "Uma das categorias da pessoa." }
        },
        required: ["data", "descricao", "valor", "categoria"]
      }
    },
    {
      name: "consultar_gastos",
      description: "Consulta quanto a pessoa gastou num período, opcionalmente numa categoria.",
      parameters: {
        type: "object",
        properties: {
          desde: { type: "string", description: "Primeiro dia do período, AAAA-MM-DD." },
          ate: { type: "string", description: "Último dia do período, AAAA-MM-DD (incluído)." },
          categoria: { type: "string", description: "Categoria, se a pergunta citar uma." }
        },
        required: ["desde", "ate"]
      }
    }
  ]
}];

function promptDoSistema(hoje, categorias) {
  return [
    "Você é o assistente do app de gastos pessoais Minhas Despesas. Fale em português do Brasil, com frases curtas.",
    "Hoje é " + hoje + " (horário de São Paulo). Use essa data para entender 'hoje', 'ontem', 'este mês' etc.",
    "As categorias da pessoa são: " + categorias.join(", ") + ". Escolha sempre uma delas; se nenhuma servir, use Outros.",
    "Se a pessoa informar um gasto, chame registrar_gasto. Se perguntar quanto gastou, chame consultar_gastos.",
    "Se vier a foto de um cupom fiscal, chame registrar_gasto usando o VALOR TOTAL do cupom, a data de emissão e o nome da loja como descrição.",
    "Se faltar o valor ou algo essencial, não chame ferramenta: pergunte de forma curta o que falta.",
    "Nunca invente totais: quem soma é o banco. Nunca peça senha, número de conta ou de cartão."
  ].join("\n");
}

async function perguntarAoGemini({ chave, mensagem, imagem, mime, categorias, hoje }) {
  const partes = [];
  if (mensagem) partes.push({ text: mensagem });
  if (imagem) {
    partes.push({ inline_data: { mime_type: mime || "image/jpeg", data: imagem } });
    if (!mensagem) partes.push({ text: "Lance o gasto deste cupom fiscal." });
  }

  let resposta;
  try {
    resposta = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + MODELO + ":generateContent",
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": chave },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: promptDoSistema(hoje, categorias) }] },
          contents: [{ role: "user", parts: partes }],
          tools: FERRAMENTAS,
          generationConfig: { temperature: 0 }
        })
      }
    );
  } catch {
    throw new ErroAmigavel("Não consegui falar com o assistente. Tente de novo em instantes.", 502);
  }

  if (resposta.status === 429) {
    throw new ErroAmigavel("O assistente atingiu o limite de uso por agora. Espere alguns minutos e tente de novo, ou lance à mão.", 429);
  }
  if (resposta.status === 400 || resposta.status === 401 || resposta.status === 403) {
    let texto = "";
    try { texto = JSON.stringify(await resposta.json()).toLowerCase(); } catch {}
    if (texto.includes("api key") || texto.includes("api_key") || resposta.status !== 400) {
      throw new ErroAmigavel("A chave do assistente não foi aceita. Confira a CHAVE_GEMINI cadastrada na Netlify.", 500);
    }
    throw new ErroAmigavel("O assistente não entendeu o pedido. Tente escrever de outro jeito ou mande outra foto.", 400);
  }
  if (!resposta.ok) {
    throw new ErroAmigavel("O assistente está fora do ar agora. Tente de novo em instantes ou lance à mão.", 502);
  }

  const dados = await resposta.json();
  const partesResposta = (dados.candidates && dados.candidates[0] && dados.candidates[0].content && dados.candidates[0].content.parts) || [];
  const chamada = partesResposta.find((p) => p.functionCall || p.function_call);
  if (chamada) {
    const f = chamada.functionCall || chamada.function_call;
    return { ferramenta: f.name, args: f.args || {} };
  }
  const texto = partesResposta.map((p) => p.text || "").join("").trim();
  return { texto: texto || "Não entendi. Escreva o gasto assim: mercado 50 hoje." };
}

// ---------- Ferramentas ----------

async function registrarGasto({ token, usuario, args, categorias, hoje, origem }) {
  const valor = Math.round(Number(args.valor) * 100) / 100;
  if (!Number.isFinite(valor) || valor <= 0) {
    return "Não consegui identificar o valor. Qual foi o valor do gasto?";
  }
  const data = dataValida(args.data) ? args.data : hoje;
  const categoria = categorias.includes(args.categoria) ? args.categoria : "Outros";
  const descricao = String(args.descricao || "").trim().slice(0, 80) || categoria;

  const resposta = await fetch(SUPABASE_URL + "/rest/v1/gastos", {
    method: "POST",
    headers: { ...cabecalhosSupabase(token), Prefer: "return=minimal" },
    body: JSON.stringify({ dono: usuario.id, data, descricao, valor, categoria, origem })
  });
  if (!resposta.ok) throw await erroDoSupabase(resposta);

  return "Lancei " + real(valor) + " em " + categoria + ": " + descricao + ", " + dataBR(data) + ".";
}

async function consultarGastos({ token, args, categorias, hoje }) {
  const desde = dataValida(args.desde) ? args.desde : hoje.slice(0, 8) + "01";
  const ate = dataValida(args.ate) ? args.ate : hoje;
  const categoria = categorias.includes(args.categoria) ? args.categoria : null;

  const filtro = new URLSearchParams();
  filtro.set("select", "valor");
  filtro.append("data", "gte." + desde);
  filtro.append("data", "lte." + ate);
  if (categoria) filtro.set("categoria", "eq." + categoria);

  const resposta = await fetch(SUPABASE_URL + "/rest/v1/gastos?" + filtro.toString(), {
    headers: cabecalhosSupabase(token)
  });
  if (!resposta.ok) throw await erroDoSupabase(resposta);
  const linhas = await resposta.json();

  // O total vem da soma do banco, em centavos para não errar arredondamento.
  const centavos = linhas.reduce((soma, l) => soma + Math.round(Number(l.valor) * 100), 0);
  const total = centavos / 100;
  const onde = categoria ? " com " + categoria : "";
  const periodo = desde === ate ? "em " + dataBR(desde) : "de " + dataBR(desde) + " a " + dataBR(ate);
  const quantos = linhas.length === 1 ? "1 gasto" : linhas.length + " gastos";
  return "Você gastou " + real(total) + onde + " " + periodo + " (" + quantos + ").";
}

// ---------- Entrada da função ----------

export default async (req) => {
  try {
    if (req.method !== "POST") throw new ErroAmigavel("Use o assistente pelo app.", 405);

    const chave = process.env.CHAVE_GEMINI;
    if (!chave) {
      throw new ErroAmigavel("O assistente ainda não tem chave. Cadastre a CHAVE_GEMINI nas variáveis da Netlify e publique de novo.", 500);
    }

    const { token, usuario } = await conferirLogin(req);

    let corpo;
    try { corpo = await req.json(); } catch { throw new ErroAmigavel("Pedido inválido. Tente de novo pelo app.", 400); }

    const mensagem = String(corpo.mensagem || "").trim().slice(0, 500);
    const imagem = typeof corpo.imagem === "string" && corpo.imagem ? corpo.imagem : null;
    const mime = typeof corpo.mime === "string" && corpo.mime.startsWith("image/") ? corpo.mime : "image/jpeg";
    const categorias = Array.isArray(corpo.categorias) && corpo.categorias.length
      ? corpo.categorias.map(String).slice(0, 12)
      : CATEGORIAS_PADRAO;
    if (!categorias.includes("Outros")) categorias.push("Outros");

    if (!mensagem && !imagem) throw new ErroAmigavel("Escreva um gasto ou mande a foto do cupom.", 400);

    const hoje = hojeSaoPaulo();
    const escolha = await perguntarAoGemini({ chave, mensagem, imagem, mime, categorias, hoje });

    if (escolha.ferramenta === "registrar_gasto") {
      const resposta = await registrarGasto({
        token, usuario, args: escolha.args, categorias, hoje, origem: imagem ? "foto" : "texto"
      });
      return responder({ resposta, lancou: resposta.startsWith("Lancei") });
    }
    if (escolha.ferramenta === "consultar_gastos") {
      const resposta = await consultarGastos({ token, args: escolha.args, categorias, hoje });
      return responder({ resposta, lancou: false });
    }
    return responder({ resposta: escolha.texto, lancou: false });
  } catch (e) {
    if (e instanceof ErroAmigavel) return responder({ erro: e.message }, e.status);
    return responder({ erro: "Algo deu errado no assistente. Tente de novo em instantes." }, 500);
  }
};
