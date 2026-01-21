console.log("✅ portal.js carregou e tá vivo");

// ======================================================
// 🔒 CONFIG + SEGURANÇA
// ======================================================

if (typeof supabaseUrl === "undefined" || typeof supabaseKey === "undefined") {
  alert("Por favor, configure supabaseUrl e supabaseKey no arquivo config.js!");
  throw new Error("Supabase não configurado.");
}

// ======================================================
// 🛑 AUTO LOGOUT DESATIVADO (Sessão Infinita)
// ======================================================

function updateLastActivity() {
  // Sessão infinita: não faz nada.
}

function startInactivityMonitor() {
  console.log("♾️ Sessão infinita ativada: monitor de inatividade DESLIGADO.");
}

async function checkInactivityAndLogoutIfNeeded() {
  // Sessão infinita: nunca desloga ninguém.
}

// Mantém acessível global caso algum script chame
window.updateLastActivity = updateLastActivity;

// ======================================================
// ✅ FETCH AUTENTICADO (global e único)
// ======================================================

async function fetchAuthenticated(url, options = {}) {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session) throw new Error("Sem sessão ativa. Faça login.");

  const headers = {
    Authorization: `Bearer ${session.access_token}`,
    ...(options.headers || {}),
  };

  // Só define Content-Type se NÃO for FormData
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(url, { ...options, headers });
}

window.fetchAuthenticated = fetchAuthenticated;

// ======================================================
// 🧠 APP PRINCIPAL (roda só depois do DOM pronto)
// ======================================================

window.addEventListener("DOMContentLoaded", () => {
  // --- SELEÇÃO DE ELEMENTOS DA DOM ---
  const authContainer = document.getElementById("auth-container");
  const portalContainer = document.getElementById("portal-container");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const userEmailSpan = document.getElementById("user-email");
  const logoutButton = document.getElementById("logout-button");
  const navLinks = document.querySelectorAll(".nav-link");
  const pageTitle = document.getElementById("page-title");
  const pageContent = document.getElementById("page-content");

  window.pageContent = pageContent;
  window.pageTitle = pageTitle;

  // Se esses caras não existirem, nem adianta continuar
  if (
    !authContainer ||
    !portalContainer ||
    !loginForm ||
    !loginError ||
    !userEmailSpan ||
    !logoutButton
  ) {
    console.error("❌ Elementos essenciais do portal não encontrados no DOM.");
    return;
  }

  // ======================================================
  // ✅ CONTROLE DE TELAS
  // ======================================================

  let portalInitialized = false;

  function showPortal(user) {
    userEmailSpan.textContent = user?.email || "(sem email)";

    authContainer.classList.add("hidden");
    portalContainer.classList.remove("hidden");

    // Registra atividade assim que loga (no-op porque sessão infinita)
    updateLastActivity();

    // ✅ IMPORTANTÍSSIMO:
    // Só carrega dashboard 1 vez ao entrar, pra não duplicar listeners/render.
    if (!portalInitialized) {
      portalInitialized = true;
      loadPageContent("dashboard");
    }
  }

  function showLogin() {
    portalInitialized = false; // reseta para próximo login
    authContainer.classList.remove("hidden");
    portalContainer.classList.add("hidden");
  }

  // deixa no window caso você use em outros arquivos
  window.showPortal = showPortal;
  window.showLogin = showLogin;

  // ======================================================
  // ✅ LOGIN (quem manda é o onAuthStateChange)
  // ======================================================

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    loginError.classList.add("hidden");
    updateLastActivity();

    const email = document.getElementById("login-email")?.value?.trim();
    const password = document.getElementById("login-password")?.value;

    if (!email || !password) {
      loginError.textContent = "Favor preencher E-Mail e Senha corretamente!";
      loginError.classList.remove("hidden");
      return;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      loginError.textContent = "Erro: " + error.message;
      loginError.classList.remove("hidden");
      return;
    }

    // ✅ Não chama showPortal aqui!
    // O Supabase vai disparar onAuthStateChange e aí sim entra.
  });

  // ======================================================
  // ✅ LOGOUT MANUAL
  // ======================================================

  logoutButton.addEventListener("click", async () => {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();

      // Se não tem sessão, só volta pra tela de login e pronto
      if (!session) {
        console.warn("⚠️ Logout clicado sem sessão ativa. Indo para login.");
        showLogin();
        return;
      }

      const { error } = await supabaseClient.auth.signOut({ scope: "global" });

      if (error) {
        console.error("❌ Erro no signOut:", error);
        alert("Erro ao sair: " + error.message);

        // Mesmo com erro, manda o usuário pra tela de login
        showLogin();
        return;
      }

      showLogin();
    } catch (err) {
      console.error("💥 Falha geral no logout:", err);
      showLogin();
    }
  });

  // ======================================================
  // ✅ ROTEADOR / NAVEGAÇÃO
  // ======================================================

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      updateLastActivity();

      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      const page = link.dataset.page;
      if (!page) return;

      loadPageContent(page);
    });
  });

  function loadPageContent(page) {
    updateLastActivity();

    // título
    const link = document.querySelector(`.nav-link[data-page="${page}"]`);
    const title = link
      ? link.textContent
      : page.charAt(0).toUpperCase() + page.slice(1);

    if (pageTitle) pageTitle.textContent = title;

    // conteúdo
    try {
      if (page === "dashboard") {
        renderDashboardPage();
      } else if (page === "clientes") {
        renderClientesPage();
      } else if (page === "pedidos") {
        renderPacotesPage();
      } else if (page === "frota") {
        renderVeiculosPage();
      } else if (page === "motoristas") {
        renderMotoristasPage();
      } else if (page === "financeiro") {
        renderFinanceiroPage();
      } else if (page === "custos") {
        renderCustosPage();
      } else if (page === "formularios") {
        renderFormulariosPage();
      } else {
        pageContent.innerHTML = `<h2>Página ${title}</h2><p>Conteúdo em construção.</p>`;
      }
    } catch (err) {
      console.error("💥 Erro carregando página:", page, err);
      pageContent.innerHTML = `
        <h2>Opa 😬</h2>
        <p>Deu erro ao carregar <strong>${title}</strong>.</p>
        <pre style="white-space:pre-wrap; background:#111; color:#0f0; padding:12px; border-radius:8px;">${String(
          err?.stack || err
        )}</pre>
      `;
    }
  }

  // deixa acessível global caso algum outro script chame
  window.loadPageContent = loadPageContent;

  // ======================================================
  // 📱 MENU MOBILE (seguro)
  // ======================================================

  function setupMobileMenu() {
    const menuToggleButton = document.getElementById("mobile-menu-toggle");
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.getElementById("mobile-overlay");

    if (!menuToggleButton || !sidebar || !overlay) return;

    menuToggleButton.addEventListener("click", (e) => {
      e.stopPropagation();
      updateLastActivity();
      sidebar.classList.toggle("open");
      overlay.classList.toggle("active");
    });

    overlay.addEventListener("click", () => {
      updateLastActivity();
      sidebar.classList.remove("open");
      overlay.classList.remove("active");
    });

    sidebar.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        updateLastActivity();
        sidebar.classList.remove("open");
        overlay.classList.remove("active");
      });
    });
  }

  setupMobileMenu();

  // ======================================================
  // ✅ ESTADO DE SESSÃO (Supabase manda, a UI obedece)
  // ======================================================

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log("🔐 Supabase auth event:", event);

    if (session?.user) {
      // Sessão infinita: isso não faz nada, mas mantemos
      await checkInactivityAndLogoutIfNeeded();

      // Mostra portal
      showPortal(session.user);
    } else {
      showLogin();
    }
  });

  // ======================================================
  // 🚀 INICIALIZAÇÃO
  // ======================================================

  // inicia o monitor (aqui tá desligado por sessão infinita)
  startInactivityMonitor();

  // Sessão infinita: não expulsa ninguém
  checkInactivityAndLogoutIfNeeded();

  // Check inicial de sessão (pra entrar direto sem precisar clicar login)
  (async function checkUserSession() {
    const { data } = await supabaseClient.auth.getSession();

    if (data.session?.user) {
      showPortal(data.session.user);
    } else {
      showLogin();
    }
  })();
});
