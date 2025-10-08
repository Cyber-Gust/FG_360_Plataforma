// js/financeiro.js

// ===============================================
// UTIL
// ===============================================
const formatCurrency = (value, fallback = 'R$ 0,00') => {
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return fallback;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// injeta modal se não existir no DOM (idempotente)
function ensureFinanceModal() {
  if (document.getElementById('finance-mov-modal')) return;

  const modalHtml = `
  <div class="modal-overlay" id="finance-mov-modal" style="display:none;">
    <div class="modal-content">
      <header class="modal-header">
        <h2 id="finance-modal-title">Novo Lançamento Financeiro</h2>
        <button class="close-button" data-close-modal>&times;</button>
      </header>

      <form id="finance-mov-form" class="modal-form">
        <input type="hidden" id="mov-pacote-id">
        <input type="hidden" id="mov-cliente-id">
        <input type="hidden" id="mov-motorista-id">
        <input type="hidden" id="mov-veiculo-id">

        <div class="form-group">
          <label>Código de Rastreamento</label>
          <div style="display:flex; gap:.5rem;">
            <input id="mov-pacote-rastreio" placeholder="EX: BR123..." />
            <button type="button" id="search-pacote-btn" class="btn btn-secondary">Buscar</button>
          </div>
          <small id="pacote-info-display"></small>
        </div>

        <div class="form-group"><label>Valor Pedido</label><input id="mov-valor-pedido" type="number" step="0.01"></div>
        <div class="form-group"><label>Custo Motorista</label><input id="mov-custo-motorista" type="number" step="0.01"></div>
        <div class="form-group"><label>Custo Veículo</label><input id="mov-custo-veiculo" type="number" step="0.01"></div>
        <div class="form-group"><label>Data Lançamento</label><input id="mov-data-lancamento" type="date" required></div>
        <div class="form-group"><label>Observações</label><textarea id="mov-observacoes"></textarea></div>

        <footer class="modal-footer">
          <button type="button" class="btn btn-secondary" data-close-modal>Cancelar</button>
          <button type="submit" class="btn btn-primary" id="submit-mov-btn">Salvar Lançamento</button>
        </footer>
      </form>
    </div>
  </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ===============================================
// 1) RENDER PRINCIPAL DA PÁGINA
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

        <div class="stats-grid" id="finance-stats-grid"></div>
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

  // garante que o modal exista no DOM
  ensureFinanceModal();

  // captura refs AGORA (o DOM já tem tudo)
  const refs = {
    financeMovModal: document.getElementById('finance-mov-modal'),
    financeMovForm: document.getElementById('finance-mov-form'),
    pacoteInfoDisplay: document.getElementById('pacote-info-display'),
  };

  // inicialização
  initializeFinanceReports();
  loadFinancialTransactions();
  setupModalListeners(refs);
}

// ===============================================
// 2) RELATÓRIOS (AGREGADO)
// ===============================================
function initializeFinanceReports() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);

  const endInput = document.getElementById('finance-end-date');
  const startInput = document.getElementById('finance-start-date');

  endInput.value = endDate.toISOString().split('T')[0];
  startInput.value = startDate.toISOString().split('T')[0];

  endInput.addEventListener('change', updateFinanceReports);
  startInput.addEventListener('change', updateFinanceReports);

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

    // suporta API com custo_total OU com custo_motorista_total separado
    const receita_total = Number(data.receita_total || 0);
    const custo_total = data.custo_total != null
      ? Number(data.custo_total)
      : Number(data.custo_motorista_total || 0); // compat
    const lucro_liquido = Number(
      data.lucro_liquido != null
        ? data.lucro_liquido
        : receita_total - (data.custo_motorista_total || 0) - (data.custo_veiculo_total || 0)
    );
    const total_entradas = Number(data.total_entradas || 0);

    const lucroColor = lucro_liquido >= 0 ? 'var(--color-success)' : 'var(--color-danger)';

    statsGrid.innerHTML = `
      <div class="stat-card" style="border-left: 5px solid var(--color-success);">
        <div class="stat-card-info">
          <span class="stat-card-value" id="total-receita">${formatCurrency(receita_total)}</span>
          <span class="stat-card-label">Receita Bruta Total (${total_entradas} Lanç.)</span>
        </div>
      </div>
      <div class="stat-card" style="border-left: 5px solid var(--color-danger);">
        <div class="stat-card-info">
          <span class="stat-card-value" id="total-custo">${formatCurrency(custo_total)}</span>
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
// 3) TABELA DE LANÇAMENTOS
// ===============================================
async function loadFinancialTransactions() {
  const tbody = document.getElementById('financial-transactions-body');
  tbody.innerHTML = '<tr><td colspan="8">Carregando dados...</td></tr>';

  try {
    const response = await fetchAuthenticated('/api/financeiro');
    if (!response.ok) throw new Error('Falha ao carregar lista de lançamentos.');

    const transactions = await response.json();

    if (!Array.isArray(transactions) || transactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="no-data-message">Nenhum lançamento encontrado.</td></tr>';
      return;
    }

    tbody.innerHTML = transactions.map(t => {
      const receita = Number(t.valor_pedido || 0);
      const custoMotorista = Number(t.custo_motorista || 0);
      const custoVeiculo = Number(t.custo_veiculo || 0);
      const custoTotal = custoMotorista + custoVeiculo;
      const lucro = receita - custoTotal;
      const lucroColor = lucro >= 0 ? 'var(--color-success-dark)' : 'var(--color-danger-dark)';

      const dt = t.data_lancamento ? new Date(t.data_lancamento) : null;
      const dataFmt = dt && !isNaN(dt) ? dt.toLocaleDateString('pt-BR') : '-';

      return `
        <tr>
          <td>${dataFmt}</td>
          <td>${t.pacotes && t.pacotes.codigo_rastreio ? t.pacotes.codigo_rastreio : 'N/A'}</td>
          <td>${t.clientes && t.clientes.nome_completo ? t.clientes.nome_completo : 'N/A'}</td>
          <td style="color: var(--color-success-dark);">${formatCurrency(receita, '-')}</td>
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

    // (deixa os handlers de editar/excluir pra próxima fase)
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="8" class="error-message">Erro ao carregar dados: ${error.message}</td></tr>`;
  }
}

// ===============================================
// 4) MODAL (NOVO LANÇAMENTO)
// ===============================================
function setupModalListeners({ financeMovModal, financeMovForm, pacoteInfoDisplay }) {
  const openBtn = document.getElementById('open-new-mov-modal');
  if (!openBtn || !financeMovModal || !financeMovForm) return;

  // abrir modal
  openBtn.addEventListener('click', () => {
    const title = document.getElementById('finance-modal-title');
    if (title) title.textContent = 'Novo Lançamento Financeiro';
    financeMovForm.reset();
    if (pacoteInfoDisplay) {
      pacoteInfoDisplay.textContent = '';
      pacoteInfoDisplay.style.color = '';
    }
    financeMovModal.style.display = 'flex';
  });

  // fechar modal
  financeMovModal.querySelectorAll('[data-close-modal]').forEach(button => {
    button.addEventListener('click', () => {
      financeMovModal.style.display = 'none';
    });
  });

  // busca de pacote
  const searchBtn = document.getElementById('search-pacote-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => searchAndLinkPacote({ pacoteInfoDisplay }));
  }

  // submit
  financeMovForm.addEventListener('submit', (e) => handleFinanceFormSubmit(e, { financeMovModal }));
}

async function searchAndLinkPacote({ pacoteInfoDisplay }) {
  const rastreioInput = document.getElementById('mov-pacote-rastreio');
  const rastreio = (rastreioInput?.value || '').trim();

  if (!pacoteInfoDisplay) return;
  if (rastreio.length < 5) {
    pacoteInfoDisplay.textContent = 'Digite um código de rastreio válido.';
    pacoteInfoDisplay.style.color = 'var(--color-danger-dark)';
    return;
  }

  pacoteInfoDisplay.textContent = 'Buscando...';
  pacoteInfoDisplay.style.color = '';

  try {
    const response = await fetchAuthenticated(`/api/pacotes?rastreio_code=${encodeURIComponent(rastreio)}`);
    if (!response.ok) throw new Error('Pacote não encontrado ou erro na busca.');

    const result = await response.json();
    const pacote = Array.isArray(result) ? result[0] : result;
    if (!pacote) throw new Error('Pacote não encontrado.');

    // guarda ids
    (document.getElementById('mov-pacote-id') || {}).value = pacote.id || '';
    (document.getElementById('mov-cliente-id') || {}).value = pacote.cliente_id || '';
    (document.getElementById('mov-motorista-id') || {}).value = pacote.motorista_id || '';
    (document.getElementById('mov-veiculo-id') || {}).value = pacote.veiculo_id || '';

    const clienteNome = pacote.clientes ? pacote.clientes.nome_completo : 'Cliente Não Vinculado';
    pacoteInfoDisplay.innerHTML = `Pacote <strong>${rastreio}</strong> vinculado! Cliente: <strong>${clienteNome}</strong>`;
    pacoteInfoDisplay.style.color = 'var(--color-success-dark)';
  } catch (error) {
    pacoteInfoDisplay.textContent = `Erro: ${error.message}`;
    pacoteInfoDisplay.style.color = 'var(--color-danger-dark)';
    ['mov-pacote-id','mov-cliente-id','mov-motorista-id','mov-veiculo-id'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }
}

async function handleFinanceFormSubmit(e, { financeMovModal }) {
  e.preventDefault();

  const submitBtn = document.getElementById('submit-mov-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Salvando...';
  }

  try {
    const payload = {
      pacote_id:    (document.getElementById('mov-pacote-id') || {}).value || null,
      cliente_id:   (document.getElementById('mov-cliente-id') || {}).value || null,
      motorista_id: (document.getElementById('mov-motorista-id') || {}).value || null,
      veiculo_id:   (document.getElementById('mov-veiculo-id') || {}).value || null,

      valor_pedido:   parseFloat((document.getElementById('mov-valor-pedido') || {}).value) || null,
      custo_motorista:parseFloat((document.getElementById('mov-custo-motorista') || {}).value) || null,
      custo_veiculo:  parseFloat((document.getElementById('mov-custo-veiculo') || {}).value) || null,

      data_lancamento: (document.getElementById('mov-data-lancamento') || {}).value,
      observacoes:     (document.getElementById('mov-observacoes') || {}).value,
    };

    if (!payload.data_lancamento) throw new Error('A data do lançamento é obrigatória.');
    if (!payload.valor_pedido && !payload.custo_motorista && !payload.custo_veiculo) {
      throw new Error('Insira pelo menos um valor (Receita, Custo Motorista ou Custo Veículo).');
    }

    const response = await fetchAuthenticated('/api/financeiro', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Falha ao salvar lançamento.');
    }

    alert('Lançamento salvo com sucesso!');
    if (financeMovModal) financeMovModal.style.display = 'none';
    updateFinanceReports();
    loadFinancialTransactions();
  } catch (error) {
    alert(`Erro ao salvar: ${error.message}`);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Salvar Lançamento';
    }
  }
}
