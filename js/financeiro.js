// js/financeiro.js

// Importe fetchAuthenticated se estiver usando ES Modules:
// import { fetchAuthenticated } from './utils/api.js'; 

let financialChart = null; // Para a instância do gráfico (se for usar Chart.js)

async function renderFinanceiroPage() {
    const pageContent = document.getElementById('page-content');
    pageContent.innerHTML = `
        <div id="financeiro-content">
            <h2 class="section-title">Acompanhamento Financeiro</h2>
            
            <div class="dashboard-section">
                <div class="dashboard-header">
                    <h3>Relatório de Período</h3>
                    <div class="dashboard-filters">
                        <input type="date" id="finance-start-date" required>
                        <span>até</span>
                        <input type="date" id="finance-end-date" required>
                    </div>
                </div>
                
                <div class="stats-grid" id="finance-stats-grid">
                    <div class="stat-card" style="border-left: 5px solid var(--color-success);">
                        <div class="stat-card-info">
                            <span class="stat-card-value" id="total-receita">R$ 0,00</span>
                            <span class="stat-card-label">Receita Bruta Total</span>
                        </div>
                    </div>
                    <div class="stat-card" style="border-left: 5px solid var(--color-danger);">
                        <div class="stat-card-info">
                            <span class="stat-card-value" id="total-custo">R$ 0,00</span>
                            <span class="stat-card-label">Custo Total (Motorista + Veículo)</span>
                        </div>
                    </div>
                    <div class="stat-card" style="border-left: 5px solid var(--color-primary);">
                        <div class="stat-card-info">
                            <span class="stat-card-value" id="total-lucro">R$ 0,00</span>
                            <span class="stat-card-label">Lucro Líquido do Período</span>
                        </div>
                    </div>
                </div>
            </div>

            <button class="btn btn-primary" id="open-new-mov-modal">Novo Lançamento Manual</button>
            
            <div class="data-table-container">
                <h3 class="recent-packages-title">Lançamentos Recentes</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Cód. Pacote</th>
                            <th>Cliente</th>
                            <th>Receita</th>
                            <th>Custo Motorista</th>
                            <th>Custo Veículo</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="financial-transactions-body">
                        <tr><td colspan="7">Carregando lançamentos...</td></tr>
                    </tbody>
                </table>
            </div>

        </div>
    `;

    // Inicializa a função de relatórios
    initializeFinanceReports();
    
    // Adiciona o listener para o botão de novo lançamento (Você precisará criar o modal)
    document.getElementById('open-new-mov-modal').addEventListener('click', () => {
        // Lógica para abrir o modal de inserção de dados
        console.log("Abrir modal de Lançamento Financeiro");
    });
}

// --- LÓGICA DOS RELATÓRIOS ---

function initializeFinanceReports() {
    // Define o período inicial como o último mês
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    const endInput = document.getElementById('finance-end-date');
    const startInput = document.getElementById('finance-start-date');

    endInput.value = endDate.toISOString().split('T')[0];
    startInput.value = startDate.toISOString().split('T')[0];

    // Atualiza o relatório na mudança de data
    endInput.addEventListener('change', updateFinanceReports);
    startInput.addEventListener('change', updateFinanceReports);
    
    // Carrega os dados iniciais
    updateFinanceReports();
    loadFinancialTransactions();
}

async function updateFinanceReports() {
    const startDate = document.getElementById('finance-start-date').value;
    const endDate = document.getElementById('finance-end-date').value;
    const statsGrid = document.getElementById('finance-stats-grid');
    
    if (!startDate || !endDate) return;

    statsGrid.innerHTML = '<p class="loading-message">Calculando relatórios...</p>';

    try {
        // Chama a API com o filtro de agregação
        const response = await fetchAuthenticated(`/api/financeiro?relatorio=agregado&startDate=${startDate}&endDate=${endDate}`);
        if (!response.ok) throw new Error('Falha ao carregar dados agregados.');
        
        const data = await response.json();
        
        // Formatação de Moeda
        const formatCurrency = (value) => {
            if (typeof value !== 'number') return 'R$ 0,00';
            return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        };
        
        // Renderiza os cards
        statsGrid.innerHTML = `
            <div class="stat-card" style="border-left: 5px solid var(--color-success);">
                <div class="stat-card-info">
                    <span class="stat-card-value" id="total-receita">${formatCurrency(data.receita_total)}</span>
                    <span class="stat-card-label">Receita Bruta Total (${data.total_entradas} Lanç.)</span>
                </div>
            </div>
            <div class="stat-card" style="border-left: 5px solid var(--color-danger);">
                <div class="stat-card-info">
                    <span class="stat-card-value" id="total-custo">${formatCurrency(data.custo_motorista_total)}</span>
                    <span class="stat-card-label">Custo Total (Motorista + Veículo)</span>
                </div>
            </div>
            <div class="stat-card" style="border-left: 5px solid var(--color-primary);">
                <div class="stat-card-info">
                    <span class="stat-card-value" id="total-lucro">${formatCurrency(data.lucro_liquido)}</span>
                    <span class="stat-card-label">Lucro Líquido do Período</span>
                </div>
            </div>
        `;
        
    } catch (error) {
        statsGrid.innerHTML = `<p class="error-message">Erro: ${error.message}</p>`;
    }
}

// --- LÓGICA DA TABELA DE TRANSAÇÕES ---
async function loadFinancialTransactions() {
    const tbody = document.getElementById('financial-transactions-body');
    tbody.innerHTML = '<tr><td colspan="7">Carregando dados...</td></tr>';
    
    try {
        // Chama a API para a lista completa (ou com paginação se for grande)
        const response = await fetchAuthenticated('/api/financeiro');
        if (!response.ok) throw new Error('Falha ao carregar lista de lançamentos.');
        
        const transactions = await response.json();
        
        if (transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data-message">Nenhum lançamento encontrado.</td></tr>';
            return;
        }

        const formatCurrency = (value) => {
            return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        };

        tbody.innerHTML = transactions.map(t => `
            <tr>
                <td>${new Date(t.data_lancamento).toLocaleDateString('pt-BR')}</td>
                <td>${t.pacotes ? t.pacotes.codigo_rastreio : 'N/A'}</td>
                <td>${t.clientes ? t.clientes.nome_completo : 'N/A'}</td>
                <td style="color: var(--color-success-dark);">${formatCurrency(t.valor_pedido)}</td>
                <td style="color: var(--color-danger-dark);">${formatCurrency(t.custo_motorista)}</td>
                <td style="color: var(--color-danger-dark);">${formatCurrency(t.custo_veiculo)}</td>
                <td>
                    <button class="btn btn-sm btn-edit" data-id="${t.id}">Editar</button>
                    <button class="btn btn-sm btn-delete" data-id="${t.id}">Excluir</button>
                </td>
            </tr>
        `).join('');

        // Adicionar Listeners de Ação
        // ... (Você implementará a lógica de edição/exclusão aqui)

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" class="error-message">Erro ao carregar dados: ${error.message}</td></tr>`;
    }
}