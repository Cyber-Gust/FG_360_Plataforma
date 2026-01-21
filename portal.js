console.log("✅ portal.js carregou e tá vivo");

// ======================================================
// 🔒 CONFIG + SEGURANÇA
// ======================================================

if (!supabaseUrl || !supabaseKey) {
  alert('Por favor, configure supabaseUrl e supabaseKey no arquivo config.js!');
  throw new Error('Supabase não configurado.');
}

// ======================================================
// ⏳ AUTO LOGOUT POR INATIVIDADE (7 DIAS)
// ======================================================

const INACTIVITY_LIMIT_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
const LAST_ACTIVITY_KEY = "fg360_last_activity";

function now() {
  return Date.now();
}

function updateLastActivity() {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(now()));
}

function getLastActivity() {
  const value = localStorage.getItem(LAST_ACTIVITY_KEY);
  return value ? Number(value) : null;
}

async function forceLogout(reason = "Sessão expirada por inatividade.") {
  console.warn("🚪 Logout automático:", reason);

  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error("Erro ao deslogar:", err);
  }

  alert(reason);
  showLogin();
}

async function checkInactivityAndLogoutIfNeeded() {
  const last = getLastActivity();

  // Se nunca registrou atividade, cria agora
  if (!last) {
    updateLastActivity();
    return;
  }

  const diff = now() - last;

  if (diff >= INACTIVITY_LIMIT_MS) {
    await forceLogout("Você ficou 1 semana sem atividade. Por segurança, você foi deslogado ✅");
  }
}

function startInactivityMonitor() {
  // Eventos que contam como "atividade"
  const events = [
    "mousemove",
    "mousedown",
    "keydown",
    "touchstart",
    "scroll",
    "click"
  ];

  // Atualiza atividade (com leve controle pra não spammar localStorage)
  let throttleTimer = null;

  function throttledActivityUpdate() {
    if (throttleTimer) return;
    throttleTimer = setTimeout(() => {
      updateLastActivity();
      throttleTimer = null;
    }, 1000);
  }

  events.forEach(evt => {
    window.addEventListener(evt, throttledActivityUpdate, { passive: true });
  });

  // Quando a aba volta a ficar visível, atualiza também
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      updateLastActivity();
    }
  });

  // Check periódico (a cada 1 minuto)
  setInterval(checkInactivityAndLogoutIfNeeded, 60 * 1000);
}


// ======================================================
// ✅ FETCH AUTENTICADO (mantive igual, só mais seguro)
// ======================================================

async function fetchAuthenticated(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sem sessão ativa. Faça login.');

  const headers = {
    'Authorization': `Bearer ${session.access_token}`,
    ...(options.headers || {}),
  };

  // Só define Content-Type se NÃO for FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(url, { ...options, headers });
}
window.fetchAuthenticated = fetchAuthenticated;


// ======================================================
// 🧠 APP PRINCIPAL (roda só depois do DOM pronto)
// ======================================================

window.addEventListener("DOMContentLoaded", () => {
  // --- SELEÇÃO DE ELEMENTOS DA DOM ---
  const authContainer = document.getElementById('auth-container');
  const portalContainer = document.getElementById('portal-container');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const userEmailSpan = document.getElementById('user-email');
  const logoutButton = document.getElementById('logout-button');
  const navLinks = document.querySelectorAll('.nav-link');
  const pageTitle = document.getElementById('page-title');
  const pageContent = document.getElementById('page-content');
  
  window.pageContent = pageContent;
  window.pageTitle = pageTitle;
    
  // Se esses caras não existirem, nem adianta continuar
  if (!authContainer || !portalContainer || !loginForm || !loginError || !userEmailSpan || !logoutButton) {
    console.error("❌ Elementos essenciais do portal não encontrados no DOM.");
    return;
  }

  // ======================================================
  // ✅ CONTROLE DE TELAS
  // ======================================================

  function showPortal(user) {
    userEmailSpan.textContent = user.email;

    authContainer.classList.add('hidden');
    portalContainer.classList.remove('hidden');

    // Registra atividade assim que loga
    updateLastActivity();

    // Carrega dashboard inicial
    loadPageContent('dashboard');
  }

  function showLogin() {
    authContainer.classList.remove('hidden');
    portalContainer.classList.add('hidden');
  }

  // deixa no window caso você use em outros arquivos
  window.showPortal = showPortal;
  window.showLogin = showLogin;

  // ======================================================
  // ✅ LOGIN BLINDADO
  // ======================================================

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    updateLastActivity();

    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value;

    if (!email || !password) {
      loginError.textContent = "Preenche email e senha direito aí 😅";
      loginError.classList.remove('hidden');
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      loginError.textContent = 'Erro: ' + error.message;
      loginError.classList.remove('hidden');
      return;
    }

    loginError.classList.add('hidden');

    // ✅ Não depende do data.user (às vezes vem null em alguns fluxos)
    // mas aqui geralmente vem ok. Mesmo assim vamos ficar seguros:
    const user = data?.user;
    if (user) showPortal(user);
  });

  // ======================================================
  // ✅ LOGOUT MANUAL
  // ======================================================

  logoutButton.addEventListener('click', async () => {
    updateLastActivity();

    const { error } = await supabase.auth.signOut();
    if (error) {
      alert('Erro ao sair: ' + error.message);
    } else {
      showLogin();
    }
  });

  // ======================================================
  // ✅ ROTEADOR / NAVEGAÇÃO
  // ======================================================

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      updateLastActivity();

      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      const page = link.dataset.page;
      if (!page) return;

      loadPageContent(page);
    });
  });

  function loadPageContent(page) {
    updateLastActivity();

    // título
    const link = document.querySelector(`.nav-link[data-page="${page}"]`);
    const title = link ? link.textContent : page.charAt(0).toUpperCase() + page.slice(1);
    if (pageTitle) pageTitle.textContent = title;

    // conteúdo
    try {
      if (page === 'dashboard') {
        renderDashboardPage();
      } else if (page === 'clientes') {
        renderClientesPage();
      } else if (page === 'pedidos') {
        renderPacotesPage();
      } else if (page === 'frota') {
        renderVeiculosPage();
      } else if (page === 'motoristas') {
        renderMotoristasPage();
      } else if (page === 'financeiro') {
        renderFinanceiroPage();
      } else if (page === 'custos') {
        renderCustosPage();
      } else if (page === 'formularios') {
        renderFormulariosPage();
      } else {
        pageContent.innerHTML = `<h2>Página ${title}</h2><p>Conteúdo em construção.</p>`;
      }
    } catch (err) {
      console.error("💥 Erro carregando página:", page, err);
      pageContent.innerHTML = `
        <h2>Opa 😬</h2>
        <p>Deu erro ao carregar <strong>${title}</strong>.</p>
        <pre style="white-space:pre-wrap; background:#111; color:#0f0; padding:12px; border-radius:8px;">${err}</pre>
      `;
    }
  }

  // deixa acessível global caso algum outro script chame
  window.loadPageContent = loadPageContent;

  // ======================================================
  // 📱 MENU MOBILE (mantive seu código, só com segurança)
  // ======================================================

  function setupMobileMenu() {
    const menuToggleButton = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobile-overlay');

    if (!menuToggleButton || !sidebar || !overlay) return;

    menuToggleButton.addEventListener('click', (e) => {
      e.stopPropagation();
      updateLastActivity();
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
      updateLastActivity();
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });

    sidebar.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        updateLastActivity();
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    });
  }

  setupMobileMenu();

  // ======================================================
  // ✅ ESTADO DE SESSÃO (Supabase manda, a UI obedece)
  // ======================================================

  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log("🔐 Supabase auth event:", event);

    if (session?.user) {
      // Antes de mostrar portal, verifica se a sessão não ficou velha por inatividade
      await checkInactivityAndLogoutIfNeeded();

      // Se ainda existir sessão depois do check, entra
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession?.user) {
        showPortal(currentSession.user);
      }
    } else {
      showLogin();
    }
  });

  // ======================================================
  // 🚀 INICIALIZAÇÃO
  // ======================================================

  // começa a monitorar atividade
  startInactivityMonitor();

  // se o cara ficou 1 semana fora e abriu a página, já expulsa
  checkInactivityAndLogoutIfNeeded();

  // checa sessão atual (inicial)
  (async function checkUserSession() {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      showPortal(data.session.user);
    } else {
      showLogin();
    }
  })();
});
