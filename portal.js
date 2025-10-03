// portal.js
// ===================================================================
// ARQUIVO PRINCIPAL DE LÓGICA DO PORTAL
// Responsável pela autenticação e navegação entre as páginas.
// ===================================================================

// Inicialização do cliente Supabase (usando as chaves do config.js)
if (!supabaseUrl || !supabaseKey || supabaseUrl === 'https://plmyiaviwwcyovxslqlb.supabase.co') {
}
else {alert('Por favor, configure suas chaves do Supabase no arquivo config.js!');}

const supabase = self.supabase.createClient(supabaseUrl, supabaseKey);

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


// --- LÓGICA DE AUTENTICAÇÃO ---

// 1. Tenta fazer login quando o formulário é enviado
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        loginError.textContent = 'Erro: ' + error.message;
        loginError.classList.remove('hidden');
    } else {
        loginError.classList.add('hidden');
        showPortal(data.user);
    }
});

// 2. Função para fazer logout
logoutButton.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        alert('Erro ao sair: ' + error.message);
    } else {
        showLogin();
    }
});

// 3. Verifica se o usuário já está logado ao carregar a página
async function checkUserSession() {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
        showPortal(data.session.user);
    } else {
        showLogin();
    }
}


// --- CONTROLE DE VISIBILIDADE DAS TELAS ---

function showPortal(user) {
    userEmailSpan.textContent = user.email;
    authContainer.classList.add('hidden');
    portalContainer.classList.remove('hidden');
    loadPageContent('dashboard'); // Carrega a página inicial do dashboard ao logar
}

function showLogin() {
    authContainer.classList.remove('hidden');
    portalContainer.classList.add('hidden');
}


// --- LÓGICA DE NAVEGAÇÃO (ROTEADOR) ---

navLinks.forEach(link => {
    if (link.id !== 'logout-button') {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const page = link.dataset.page;
            loadPageContent(page);
        });
    }
});

// Função central que carrega o conteúdo da página selecionada
function loadPageContent(page) {
    const title = page.charAt(0).toUpperCase() + page.slice(1);
    pageTitle.textContent = title;

    // Chama a função de renderização correspondente de cada arquivo JS
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
    } else if (page === 'formularios') {
        renderFormulariosPage();
    } else {
        pageContent.innerHTML = `<h2>Página ${title}</h2><p>Conteúdo em construção.</p>`;
    }
}

function setupMobileMenu() {
    const menuToggleButton = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobile-overlay');

    if (menuToggleButton && sidebar && overlay) {
        // Abre o menu
        menuToggleButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Impede que o clique feche o menu imediatamente
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });

        // Fecha o menu clicando no overlay
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });

        // Fecha o menu clicando em um link da sidebar
        sidebar.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            });
        });
    }
}

// Chama a função para configurar o menu
setupMobileMenu();

// --- INICIALIZAÇÃO ---
// Inicia a verificação de sessão assim que o script é carregado
checkUserSession();
