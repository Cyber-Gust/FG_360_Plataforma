// js/dashboard.js

// ===================================================================
// FUNÇÃO AUXILIAR PARA REQUISIÇÕES AUTENTICADAS
// (Copie esta função para cá ou importe de um arquivo comum)
// ===================================================================

async function fetchAuthenticated(url, options = {}) {
    // 1. Pega a sessão atual para obter o token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
        console.error('Nenhuma sessão ativa encontrada.');
        throw new Error('Usuário não autenticado.');
    }

    // 2. Inicia os cabeçalhos apenas com a autorização (token)
    const headers = {
        'Authorization': `Bearer ${session.access_token}`,
    };

    // 3. Lógica inteligente:
    // SÓ define 'Content-Type: application/json' se o corpo NÃO for um FormData (arquivo).
    // Se for um arquivo, o navegador vai cuidar do Content-Type correto ('multipart/form-data').
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    // 4. Combina os cabeçalhos e faz a requisição
    options.headers = { ...headers, ...options.headers };
    return await fetch(url, options);
}

// ===================================================================
// LÓGICA DA PÁGINA DO DASHBOARD
// ===================================================================

let statusChart = null; // Variável global para manter a instância do gráfico

async function renderDashboardPage() {
    pageContent.innerHTML = `<div id="dashboard-content"><p>Carregando dados do dashboard...</p></div>`;
    const dashboardContainer = document.getElementById('dashboard-content');

    try {
        // **MODIFICADO**: Usa fetchAuthenticated
        const response = await fetchAuthenticated('/api/dashboard');
        if (!response.ok) throw new Error('Falha ao carregar dados do dashboard.');
        const data = await response.json();

        // O resto da função continua igual...
        dashboardContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-card-icon icon-clientes"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
                    <div class="stat-card-info"><span class="stat-card-value">${data.totalClientes}</span><span class="stat-card-label">Total de Clientes</span></div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon icon-transito"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg></div>
                    <div class="stat-card-info"><span class="stat-card-value">${data.pacotesEmTransito}</span><span class="stat-card-label">Pacotes em Trânsito</span></div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon icon-entregues"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                    <div class="stat-card-info"><span class="stat-card-value">${data.pacotesEntregues}</span><span class="stat-card-label">Pacotes Entregues</span></div>
                </div>
            </div>

            <div class="recent-packages-container">
                <h3 class="recent-packages-title">Últimos Pacotes Adicionados</h3>
                <ul class="recent-packages-list">
                    ${data.ultimosPacotes.length > 0 ? data.ultimosPacotes.map(pacote => `
                        <li class="recent-package-item">
                            <div class="package-info">
                                <span class="package-code">${pacote.codigo_rastreio}</span>
                                <span class="package-client">${pacote.clientes ? pacote.clientes.nome_completo : 'Cliente desconhecido'}</span>
                            </div>
                            <span class="status-badge status-${pacote.status.toLowerCase().replace(/ /g, '-')}">${pacote.status}</span>
                        </li>
                    `).join('') : '<li class="no-packages">Nenhum pacote recente para mostrar.</li>'}
                </ul>
            </div>

            <div class="dashboard-section">
                <div class="dashboard-header">
                    <h3>Distribuição de Pacotes por Status</h3>
                    <div class="dashboard-filters"><input type="date" id="start-date"><span>até</span><input type="date" id="end-date"></div>
                </div>
                <div class="chart-container"><canvas id="statusChart"></canvas></div>
            </div>
        `;
        
        initializeChart();
        document.getElementById('start-date').addEventListener('change', updateChartData);
        document.getElementById('end-date').addEventListener('change', updateChartData);

    } catch (error) {
        dashboardContainer.innerHTML = `<p class="error-message">Erro ao carregar o dashboard: ${error.message}</p>`;
    }
}

// --- LÓGICA DO GRÁFICO ---

function initializeChart() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    document.getElementById('end-date').value = endDate.toISOString().split('T')[0];
    document.getElementById('start-date').value = startDate.toISOString().split('T')[0];
    updateChartData();
}

async function updateChartData() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    if (!startDate || !endDate) return;

    try {
        // **MODIFICADO**: Usa fetchAuthenticated
        const response = await fetchAuthenticated(`/api/dashboard?startDate=${startDate}&endDate=${endDate}T23:59:59`);
        if (!response.ok) throw new Error('Falha ao carregar dados do gráfico.');
        
        const pacotes = await response.json();
        
        // O resto da função continua igual...
        const statusCounts = pacotes.reduce((acc, pacote) => {
            acc[pacote.status] = (acc[pacote.status] || 0) + 1;
            return acc;
        }, {});

        const labels = Object.keys(statusCounts);
        const data = Object.values(statusCounts);
        renderStatusChart(labels, data);

    } catch (error) {
        console.error(error);
        const container = document.querySelector('.chart-container');
        container.innerHTML = `<p class="error-message">${error.message}</p>`;
    }
}

function renderStatusChart(labels, data) {
    // ... (nenhuma mudança necessária dentro desta função)
    const container = document.querySelector('.chart-container');
    if (statusChart) {
        statusChart.destroy();
    }
    
    if (labels.length === 0) {
        container.innerHTML = '<p class="no-data-message">Nenhum pacote encontrado para o período selecionado.</p>';
        return;
    } 
    
    if (!document.getElementById('statusChart')) {
        container.innerHTML = '<canvas id="statusChart"></canvas>';
    }
    const ctx = document.getElementById('statusChart').getContext('2d');
    
    const statusColors = {
        'Aguardando Coleta': 'rgba(108, 117, 125, 0.7)',
        'Coletado': 'rgba(54, 162, 235, 0.7)',
        'Em Transito': 'rgba(255, 193, 7, 0.7)',
        'Entregue': 'rgba(40, 167, 69, 0.7)',
        'Cancelado': 'rgba(220, 53, 69, 0.7)',
    };
    const backgroundColors = labels.map(label => statusColors[label] || 'rgba(201, 203, 207, 0.7)');

    statusChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Nº de Pacotes',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                borderWidth: 1,
                borderRadius: 4,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { display: false },
                    ticks: { color: 'var(--color-text-secondary)', precision: 0 }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: 'var(--color-text-secondary)' }
                }
            }
        }
    });
}