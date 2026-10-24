// Minhas Despesas — lógica do app.
// Usa só o cliente do Supabase (carregado pela CDN) e a configuração pública.

(function () {
  "use strict";

  // Se configuracao.js não carregar, o app não para aqui: iniciar() avisa a pessoa.
  const config = window.MEU_BOLSO || {};
  const CATEGORIAS = config.CATEGORIAS || [];
  const $ = (id) => document.getElementById(id);

  const formatoReal = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const formatoMes = new Intl.DateTimeFormat("pt-BR", { month: "long" });

  let supabase = null;
  let usuario = null;

  // ---------- Utilidades ----------

  function hojeTexto() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function limitesDoMes() {
    const d = new Date();
    const ano = d.getFullYear();
    const mes = d.getMonth() + 1;
    const proximoAno = mes === 12 ? ano + 1 : ano;
    const proximoMes = mes === 12 ? 1 : mes + 1;
    return {
      inicio: ano + "-" + String(mes).padStart(2, "0") + "-01",
      fim: proximoAno + "-" + String(proximoMes).padStart(2, "0") + "-01"
    };
  }

  function dataCurta(texto) {
    const [ano, mes, dia] = texto.split("-");
    return dia + "/" + mes;
  }

  // Aceita "32", "32,5", "32,50", "1.234,56" e "32.50".
  function lerValor(texto) {
    let t = String(texto).trim().replace(/\s|R\$/g, "");
    if (!t) return NaN;
    if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
    const n = Number(t);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
  }

  // Todo erro vira uma frase em português dizendo o que fazer.
  function fraseDeErro(erro) {
    const msg = String((erro && (erro.message || erro.error_description)) || erro || "").toLowerCase();
    if (msg.includes("invalid login credentials")) return "E-mail ou senha incorretos. Confira e tente de novo.";
    if (msg.includes("already registered") || msg.includes("already been registered")) return "Este e-mail já tem conta. Toque em Entrar.";
    if (msg.includes("password should be at least") || msg.includes("password is too short")) return "A senha precisa ter pelo menos 6 caracteres. Escolha uma senha maior.";
    if (msg.includes("email not confirmed")) return "O Supabase está pedindo confirmação de e-mail. Desative essa opção no painel do Supabase e tente de novo.";
    if (msg.includes("invalid email") || msg.includes("unable to validate email")) return "Este e-mail não parece válido. Confira se digitou certo.";
    if (msg.includes("rate limit") || msg.includes("too many")) return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
    if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("load failed")) return "Sem conexão com a internet. Confira sua rede e tente de novo.";
    if (msg.includes("jwt") || msg.includes("session")) return "Sua sessão expirou. Toque em Sair e entre de novo.";
    if (msg.includes("row-level security") || msg.includes("permission denied")) return "O banco recusou a operação. Confira a proteção por linha da tabela no Supabase.";
    if (msg.includes("does not exist") || msg.includes("could not find")) return "Não encontrei a tabela no banco. Confira se as tabelas gastos e resumos existem no Supabase.";
    return "Algo deu errado. Tente de novo em instantes.";
  }

  function mostrarAviso(id, texto) {
    const el = $(id);
    el.textContent = texto;
    el.hidden = !texto;
  }

  function ocupado(botao, sim) {
    botao.disabled = sim;
  }

  // ---------- Abertura e telas ----------

  function esconderAbertura() {
    const a = $("abertura");
    a.classList.add("saindo");
    setTimeout(() => { a.hidden = true; }, 300);
  }

  function mostrarTela(qual) {
    $("tela-entrada").hidden = qual !== "entrada";
    $("tela-principal").hidden = qual !== "principal";
  }

  // ---------- Entrada ----------

  function dadosEntrada() {
    const email = $("email").value.trim();
    const senha = $("senha").value;
    if (!email || !senha) {
      mostrarAviso("aviso-entrada", "Preencha o e-mail e a senha.");
      return null;
    }
    return { email, senha };
  }

  async function entrar(evento) {
    evento.preventDefault();
    mostrarAviso("aviso-entrada", "");
    const dados = dadosEntrada();
    if (!dados) return;
    ocupado($("botao-entrar"), true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: dados.email, password: dados.senha });
      if (error) throw error;
    } catch (e) {
      mostrarAviso("aviso-entrada", fraseDeErro(e));
    } finally {
      ocupado($("botao-entrar"), false);
    }
  }

  async function criarConta() {
    mostrarAviso("aviso-entrada", "");
    const dados = dadosEntrada();
    if (!dados) return;
    if (dados.senha.length < 6) {
      mostrarAviso("aviso-entrada", "A senha precisa ter pelo menos 6 caracteres. Escolha uma senha maior.");
      return;
    }
    ocupado($("botao-criar"), true);
    try {
      const { data, error } = await supabase.auth.signUp({ email: dados.email, password: dados.senha });
      if (error) throw error;
      if (!data.session) {
        // Sem confirmação de e-mail, o Supabase já devolve a sessão. Se não devolveu, tentamos entrar.
        const r = await supabase.auth.signInWithPassword({ email: dados.email, password: dados.senha });
        if (r.error) throw r.error;
      }
    } catch (e) {
      mostrarAviso("aviso-entrada", fraseDeErro(e));
    } finally {
      ocupado($("botao-criar"), false);
    }
  }

  async function sair() {
    await supabase.auth.signOut();
  }

  // ---------- Tela principal ----------

  function montarCategorias() {
    const caixa = $("opcoes-categoria");
    caixa.textContent = "";
    CATEGORIAS.forEach((nome, i) => {
      const rotulo = document.createElement("label");
      rotulo.className = "opcao-categoria";
      const entrada = document.createElement("input");
      entrada.type = "radio";
      entrada.name = "categoria";
      entrada.value = nome;
      entrada.id = "categoria-" + i;
      const texto = document.createElement("span");
      texto.textContent = nome;
      rotulo.append(entrada, texto);
      caixa.append(rotulo);
    });
  }

  function desenharTotais(gastos) {
    const somas = {};
    CATEGORIAS.forEach((c) => { somas[c] = 0; });
    let total = 0;
    gastos.forEach((g) => {
      const v = Number(g.valor) || 0;
      total += v;
      const c = CATEGORIAS.includes(g.categoria) ? g.categoria : "Outros";
      somas[c] += v;
    });

    $("nome-mes").textContent = formatoMes.format(new Date());
    $("total-mes").textContent = formatoReal.format(total);

    const maior = Math.max(...Object.values(somas), 0);
    const lista = $("barras");
    lista.textContent = "";
    CATEGORIAS.forEach((c) => {
      const item = document.createElement("li");
      const linha = document.createElement("div");
      linha.className = "barra-linha";
      const nome = document.createElement("span");
      nome.textContent = c;
      const valor = document.createElement("span");
      valor.className = "barra-valor";
      valor.textContent = formatoReal.format(somas[c]);
      linha.append(nome, valor);
      const trilho = document.createElement("div");
      trilho.className = "barra-trilho";
      const preenchida = document.createElement("div");
      preenchida.className = "barra-preenchida";
      preenchida.style.width = maior > 0 ? (somas[c] / maior) * 100 + "%" : "0%";
      trilho.append(preenchida);
      item.append(linha, trilho);
      lista.append(item);
    });
  }

  function desenharLista(gastos) {
    const lista = $("lista-gastos");
    lista.textContent = "";
    $("lista-vazia").hidden = gastos.length > 0;
    gastos.forEach((g) => {
      const item = document.createElement("li");
      item.className = "gasto";

      const info = document.createElement("div");
      info.className = "gasto-info";
      const desc = document.createElement("p");
      desc.className = "gasto-descricao";
      desc.textContent = g.descricao || g.categoria;
      const detalhe = document.createElement("p");
      detalhe.className = "gasto-detalhe";
      detalhe.textContent = dataCurta(g.data) + " · " + g.categoria;
      info.append(desc, detalhe);

      const valor = document.createElement("span");
      valor.className = "gasto-valor";
      valor.textContent = formatoReal.format(Number(g.valor) || 0);

      const apagar = document.createElement("button");
      apagar.type = "button";
      apagar.className = "botao-apagar";
      apagar.textContent = "Apagar";
      apagar.setAttribute("aria-label", "Apagar " + (g.descricao || g.categoria) + " de " + formatoReal.format(Number(g.valor) || 0));
      apagar.addEventListener("click", () => apagarGasto(g, apagar));

      item.append(info, valor, apagar);
      lista.append(item);
    });
  }

  async function carregarGastos() {
    const { inicio, fim } = limitesDoMes();
    const { data, error } = await supabase
      .from("gastos")
      .select("id, data, descricao, valor, categoria, origem, criado_em")
      .gte("data", inicio)
      .lt("data", fim)
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false });
    if (error) {
      mostrarAviso("aviso-geral", fraseDeErro(error));
      return;
    }
    mostrarAviso("aviso-geral", "");
    desenharTotais(data || []);
    desenharLista(data || []);
  }

  async function carregarResumo() {
    const { data, error } = await supabase
      .from("resumos")
      .select("texto, criado_em")
      .order("criado_em", { ascending: false })
      .limit(1);
    const texto = !error && data && data[0] && data[0].texto ? String(data[0].texto).trim() : "";
    $("texto-resumo").textContent = texto;
    $("cartao-resumo").hidden = !texto;
  }

  async function salvarGasto(evento) {
    evento.preventDefault();
    mostrarAviso("aviso-gasto", "");

    const escolhida = document.querySelector('input[name="categoria"]:checked');
    const valor = lerValor($("valor").value);
    const descricao = $("descricao").value.trim();
    const data = $("data").value;

    if (!escolhida) return mostrarAviso("aviso-gasto", "Escolha uma categoria.");
    if (!Number.isFinite(valor) || valor <= 0) return mostrarAviso("aviso-gasto", "Digite um valor maior que zero, por exemplo 32,50.");
    if (!data) return mostrarAviso("aviso-gasto", "Escolha a data do gasto.");

    const botao = $("botao-salvar");
    ocupado(botao, true);
    try {
      const { error } = await supabase.from("gastos").insert({
        dono: usuario.id,
        data,
        descricao: descricao || null,
        valor,
        categoria: escolhida.value,
        origem: "manual"
      });
      if (error) throw error;
      $("valor").value = "";
      $("descricao").value = "";
      $("data").value = hojeTexto();
      escolhida.checked = false;
      await carregarGastos();
    } catch (e) {
      mostrarAviso("aviso-gasto", fraseDeErro(e));
    } finally {
      ocupado(botao, false);
    }
  }

  async function apagarGasto(gasto, botao) {
    const nome = gasto.descricao || gasto.categoria;
    if (!confirm("Apagar \"" + nome + "\" de " + formatoReal.format(Number(gasto.valor) || 0) + "?")) return;
    ocupado(botao, true);
    const { error } = await supabase.from("gastos").delete().eq("id", gasto.id);
    if (error) {
      ocupado(botao, false);
      mostrarAviso("aviso-geral", fraseDeErro(error));
      return;
    }
    await carregarGastos();
  }

  // ---------- Assistente ----------

  function respostaAssistente(texto, erro) {
    $("aviso-assistente").classList.toggle("informativo", !erro);
    mostrarAviso("aviso-assistente", texto);
  }

  // Reduz a foto para no máximo 1600 px e converte em JPEG, no próprio aparelho.
  // A foto não é guardada: só a versão reduzida sai, uma vez, para o assistente.
  function reduzirFoto(arquivo) {
    return new Promise((resolver, rejeitar) => {
      const endereco = URL.createObjectURL(arquivo);
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        const tela = document.createElement("canvas");
        tela.width = Math.round(img.naturalWidth * escala);
        tela.height = Math.round(img.naturalHeight * escala);
        tela.getContext("2d").drawImage(img, 0, 0, tela.width, tela.height);
        URL.revokeObjectURL(endereco);
        resolver(tela.toDataURL("image/jpeg", 0.85).split(",")[1]);
      };
      img.onerror = () => {
        URL.revokeObjectURL(endereco);
        rejeitar(new Error("foto"));
      };
      img.src = endereco;
    });
  }

  async function chamarAssistente(pedido, botao) {
    respostaAssistente("Pensando…", false);
    ocupado(botao, true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session && data.session.access_token;
      if (!token) throw new Error("Sua sessão expirou. Toque em Sair e entre de novo.");

      let resposta;
      try {
        resposta = await fetch("/api/assistente", {
          method: "POST",
          headers: { "content-type": "application/json", Authorization: "Bearer " + token },
          body: JSON.stringify({ ...pedido, categorias: CATEGORIAS })
        });
      } catch {
        throw new Error("Sem conexão com a internet. Confira sua rede e tente de novo.");
      }

      let corpo = null;
      try { corpo = await resposta.json(); } catch {}
      if (!corpo) throw new Error("O assistente não está disponível neste endereço. Use o app publicado na Netlify.");
      if (!resposta.ok || corpo.erro) throw new Error(corpo.erro || "O assistente não respondeu. Tente de novo.");

      respostaAssistente(corpo.resposta, false);
      if (corpo.lancou) await carregarGastos();
      return true;
    } catch (e) {
      respostaAssistente(e.message, true);
      return false;
    } finally {
      ocupado(botao, false);
    }
  }

  async function enviarFrase(evento) {
    evento.preventDefault();
    const mensagem = $("frase").value.trim();
    if (!mensagem) return respostaAssistente("Escreva um gasto ou uma pergunta.", true);
    if (await chamarAssistente({ mensagem }, $("botao-enviar"))) $("frase").value = "";
  }

  async function enviarFoto(entrada, botao) {
    const arquivo = entrada.files && entrada.files[0];
    entrada.value = "";
    if (!arquivo) return;
    let imagem;
    try {
      imagem = await reduzirFoto(arquivo);
    } catch {
      return respostaAssistente("Não consegui abrir essa foto. Tire outra, com o cupom inteiro e bem iluminado.", true);
    }
    await chamarAssistente({ imagem, mime: "image/jpeg", mensagem: $("frase").value.trim() }, botao);
  }

  async function abrirPrincipal() {
    mostrarTela("principal");
    $("data").value = hojeTexto();
    await Promise.all([carregarGastos(), carregarResumo()]);
  }

  // ---------- Início ----------

  // Qualquer falha ao abrir tira a logo da frente e mostra uma frase, nunca a tela em branco.
  function falhaNaAbertura() {
    esconderAbertura();
    if (!$("tela-principal").hidden) {
      mostrarAviso("aviso-geral", "Não consegui carregar seus gastos. Confira sua internet e recarregue a página.");
      return;
    }
    mostrarTela("entrada");
    mostrarAviso("aviso-entrada", "Não consegui abrir o app. Confira sua internet e recarregue a página.");
  }

  async function iniciar() {
    if (!window.supabase || !window.supabase.createClient || !config.SUPABASE_URL || !CATEGORIAS.length) {
      falhaNaAbertura();
      return;
    }

    supabase = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_CHAVE_PUBLICA);
    montarCategorias();

    $("form-entrada").addEventListener("submit", entrar);
    $("botao-criar").addEventListener("click", criarConta);
    $("botao-sair").addEventListener("click", sair);
    $("form-gasto").addEventListener("submit", salvarGasto);
    $("form-assistente").addEventListener("submit", enviarFrase);
    // Abrir câmera tira a foto na hora; Anexar foto escolhe uma da galeria.
    $("botao-camera").addEventListener("click", () => $("arquivo-camera").click());
    $("botao-anexar").addEventListener("click", () => $("arquivo-anexo").click());
    $("arquivo-camera").addEventListener("change", () => enviarFoto($("arquivo-camera"), $("botao-camera")));
    $("arquivo-anexo").addEventListener("change", () => enviarFoto($("arquivo-anexo"), $("botao-anexar")));

    const minimoAbertura = new Promise((r) => setTimeout(r, 700));
    const { data } = await supabase.auth.getSession();
    usuario = data.session ? data.session.user : null;
    await minimoAbertura;

    if (usuario) await abrirPrincipal();
    else mostrarTela("entrada");
    esconderAbertura();

    supabase.auth.onAuthStateChange((evento, sessao) => {
      const novo = sessao ? sessao.user : null;
      const mudou = (novo && novo.id) !== (usuario && usuario.id);
      usuario = novo;
      if (!mudou) return;
      if (usuario) {
        $("senha").value = "";
        // Fora do aviso do Supabase, para não travar o cliente.
        setTimeout(abrirPrincipal, 0);
      } else {
        mostrarAviso("aviso-geral", "");
        mostrarAviso("aviso-assistente", "");
        mostrarTela("entrada");
      }
    });
  }

  iniciar().catch(falhaNaAbertura);
})();
