// js/financeiro.js

// Nota: A função 'fetchAuthenticated' deve estar disponível no escopo global
// (vinda do portal.js ou de um arquivo de utilitário).

// ===============================================
// FUNÇÕES DE UTILIDADE
// ===============================================

const formatCurrency = (value, fallback = 'R$ 0,00') => {
    if (typeof value !== 'number') return fallback;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// ===============================================
// 1. FUNÇÃO PRINCIPAL DE RENDERIZAÇÃO DA PÁGINA
// ===============================================

async function renderFinanceiroPage() {
    const pageContent = document.getElementById('page-content');

    // HTML da página do Financeiro
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
                    </div>
            </div>

            <button class="btn btn-primary" id="open-new-mov-modal">Novo Lançamento Manual</button>
            
            <div class="data-table-container">
                <h3 class="recent-packages-title">Lançamentos Recentes</h3>
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Cód. Pacote</th>
                                <th>Cliente</th>
                                <th>Receita (R$)</th>
                                <th>Custo Motorista (R$)</th>
                                <th>Custo Veículo (R$)</th>
                                <th>Lucro (R$)</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="financial-transactions-body">
                            <tr><td colspan="8">Carregando lançamentos...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    const financeMovModal = document.getElementById('finance-mov-modal');
    const financeMovForm = document.getElementById('finance-mov-form');
    const pacoteInfoDisplay = document.getElementById('pacote-info-display');

    // 2. Setup e inicialização de todas as funcionalidades
    initializeFinanceReports();
    loadFinancialTransactions();
    setupModalListeners(); // <--- CHAMA A FUNÇÃO DE SETUP DO MODAL
}

// ===============================================
// 2. LÓGICA DE RELATÓRIOS (Painel Agregado)
// ===============================================

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
}

async function updateFinanceReports() {
    const startDate = document.getElementById('finance-start-date').value;
    const endDate = document.getElementById('finance-end-date').value;
    const statsGrid = document.getElementById('finance-stats-grid');

    if (!startDate || !endDate) return;

    statsGrid.innerHTML = '<p class="loading-message">Calculando relatórios...</p>';

    try {
        const response = await fetchAuthenticated(`/api/financeiro?relatorio=agregado&startDate=${startDate}&endDate=${endDate}`);
        if (!response.ok) throw new Error('Falha ao carregar dados agregados.');

        const data = await response.json();

        // Garante que todos os valores (mesmo os 0) sejam tratados como números
        const lucro_liquido = data.lucro_liquido || 0;
        const receita_total = data.receita_total || 0;
        const custo_motorista_total = data.custo_motorista_total || 0;

        // Determina a cor do card de lucro (para o estilo CSS)
        const lucroColor = lucro_liquido >= 0 ? 'var(--color-success)' : 'var(--color-danger)';

        // Renderiza os cards
        statsGrid.innerHTML = `
            <div class="stat-card" style="border-left: 5px solid var(--color-success);">
                <div class="stat-card-info">
                    <span class="stat-card-value" id="total-receita">${formatCurrency(receita_total)}</span>
                    <span class="stat-card-label">Receita Bruta Total (${data.total_entradas || 0} Lanç.)</span>
                </div>
            </div>
            <div class="stat-card" style="border-left: 5px solid var(--color-danger);">
                <div class="stat-card-info">
                    <span class="stat-card-value" id="total-custo">${formatCurrency(custo_motorista_total)}</span>
                    <span class="stat-card-label">Custo Total (Motorista + Veículo)</span>
                </div>
            </div>
            <div class="stat-card" style="border-left: 5px solid ${lucroColor};">
                <div class="stat-card-info">
                    <span class="stat-card-value" id="total-lucro">${formatCurrency(lucro_liquido)}</span>
                    <span class="stat-card-label">Lucro Líquido do Período</span>
                </div>
            </div>
        `;

    } catch (error) {
        statsGrid.innerHTML = `<p class="error-message">Erro ao carregar relatórios: ${error.message}</p>`;
    }
}

// ===============================================
// 3. LÓGICA DA TABELA DE LANÇAMENTOS
// ===============================================

async function loadFinancialTransactions() {
    const tbody = document.getElementById('financial-transactions-body');
    tbody.innerHTML = '<tr><td colspan="8">Carregando dados...</td></tr>';

    try {
        const response = await fetchAuthenticated('/api/financeiro');
        if (!response.ok) throw new Error('Falha ao carregar lista de lançamentos.');

        const transactions = await response.json();

        if (transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="no-data-message">Nenhum lançamento encontrado.</td></tr>';
            return;
        }

        tbody.innerHTML = transactions.map(t => {
            const receita = t.valor_pedido || 0;
            const custoMotorista = t.custo_motorista || 0;
            const custoVeiculo = t.custo_veiculo || 0;
            const custoTotal = custoMotorista + custoVeiculo;
            const lucro = receita - custoTotal;
            const lucroColor = lucro >= 0 ? 'var(--color-success-dark)' : 'var(--color-danger-dark)';

            return `
                <tr>
                    <td>${new Date(t.data_lancamento).toLocaleDateString('pt-BR')}</td>
                    <td>${t.pacotes ? t.pacotes.codigo_rastreio : 'N/A'}</td>
                    <td>${t.clientes ? t.clientes.nome_completo : 'N/A'}</td>
                    <td style="color: var(--color-success-dark);">${formatCurrency(t.valor_pedido, '-')}</td>
                    <td style="color: var(--color-danger-dark);">${formatCurrency(custoMotorista, '-')}</td>
                    <td style="color: var(--color-danger-dark);">${formatCurrency(custoVeiculo, '-')}</td>
                    <td style="font-weight: 600; color: ${lucroColor};">${formatCurrency(lucro)}</td>
                    <td>
                        <button class="btn btn-sm btn-edit" data-id="${t.id}">Editar</button>
                        <button class="btn btn-sm btn-delete" data-id="${t.id}">Excluir</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Adicionar Listeners de Ação (Para a próxima etapa de CRUD)
        // document.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', handleEdit));
        // document.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', handleDelete));

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="8" class="error-message">Erro ao carregar dados: ${error.message}</td></tr>`;
    }
}

// ===============================================
// 4. LÓGICA DO MODAL (NOVO LANÇAMENTO)
// ===============================================

function setupModalListeners() {
    // 1. ABRIR E FECHAR MODAL
    document.getElementById('open-new-mov-modal').addEventListener('click', () => {
        document.getElementById('finance-modal-title').textContent = 'Novo Lançamento Financeiro';
        financeMovForm.reset(); // Limpa o formulário
        financeMovModal.style.display = 'flex';
        pacoteInfoDisplay.textContent = ''; // Limpa info do pacote
    });

    financeMovModal.querySelectorAll('[data-close-modal]').forEach(button => {
        button.addEventListener('click', () => {
            financeMovModal.style.display = 'none';
        });
    });

    // 2. Busca de Pacote
    document.getElementById('search-pacote-btn').addEventListener('click', searchAndLinkPacote);

    // 3. Submissão do Formulário
    financeMovForm.addEventListener('submit', handleFinanceFormSubmit);
}

async function searchAndLinkPacote() {
    const rastreio = document.getElementById('mov-pacote-rastreio').value.trim();

    if (rastreio.length < 5) {
        pacoteInfoDisplay.textContent = 'Digite um código de rastreio válido.';
        return;
    }

    pacoteInfoDisplay.textContent = 'Buscando...';

    try {
        // ASSUMIMOS que sua rota /api/pacotes aceita um parâmetro 'rastreio_code'
        // ou que a API de pacotes tem uma lógica para buscar por código de rastreio.
        const response = await fetchAuthenticated(`/api/pacotes?rastreio_code=${rastreio}`);

        if (!response.ok) throw new Error('Pacote não encontrado ou erro na busca.');

        // A API de Pacotes deve retornar um único objeto se encontrar.
        const pacote = await response.json();

        // Armazena os IDs nos campos ocultos
        document.getElementById('mov-pacote-id').value = pacote.id;
        document.getElementById('mov-cliente-id').value = pacote.cliente_id;
        document.getElementById('mov-motorista-id').value = pacote.motorista_id || '';
        document.getElementById('mov-veiculo-id').value = pacote.veiculo_id || '';

        const clienteNome = pacote.clientes ? pacote.clientes.nome_completo : 'Cliente Não Vinculado';

        pacoteInfoDisplay.innerHTML = `Pacote <strong>${rastreio}</strong> encontrado e vinculado! Cliente: <strong>${clienteNome}</strong>`;
        pacoteInfoDisplay.style.color = 'var(--color-success-dark)';

    } catch (error) {
        pacoteInfoDisplay.textContent = `Erro: ${error.message}`;
        pacoteInfoDisplay.style.color = 'var(--color-danger-dark)';

        // Limpa campos ocultos em caso de erro
        document.getElementById('mov-pacote-id').value = '';
        document.getElementById('mov-cliente-id').value = '';
        document.getElementById('mov-motorista-id').value = '';
        document.getElementById('mov-veiculo-id').value = '';
    }
}


async function handleFinanceFormSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-mov-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Salvando...';

    try {
        const payload = {
            pacote_id: document.getElementById('mov-pacote-id').value || null,
            cliente_id: document.getElementById('mov-cliente-id').value || null,
            motorista_id: document.getElementById('mov-motorista-id').value || null,
            veiculo_id: document.getElementById('mov-veiculo-id').value || null,

            // Converte valores para números ou null
            valor_pedido: parseFloat(document.getElementById('mov-valor-pedido').value) || null,
            custo_motorista: parseFloat(document.getElementById('mov-custo-motorista').value) || null,
            custo_veiculo: parseFloat(document.getElementById('mov-custo-veiculo').value) || null,

            data_lancamento: document.getElementById('mov-data-lancamento').value,
            observacoes: document.getElementById('mov-observacoes').value,
        };

        // Validação Mínima de Dados Financeiros
        if (!payload.data_lancamento) {
            throw new Error('A data do lançamento é obrigatória.');
        }

        if (!payload.valor_pedido && !payload.custo_motorista && !payload.custo_veiculo) {
            throw new Error('Você deve inserir pelo menos um valor (Receita, Custo Motorista ou Custo Veículo).');
        }

        // POST para a rota /api/financeiro
        const response = await fetchAuthenticated('/api/financeiro', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha ao salvar lançamento.');
        }

        alert('Lançamento salvo com sucesso!');
        financeMovModal.style.display = 'none';

        // Recarrega os relatórios e a lista após a inserção
        updateFinanceReports();
        loadFinancialTransactions();

    } catch (error) {
        alert(`Erro ao salvar: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar Lançamento';
    }
}