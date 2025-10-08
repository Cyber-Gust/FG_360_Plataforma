// js/financeiro.js

// ===============================================
// UTIL
// ===============================================
const formatCurrency = (value, fallback = "R$ 0,00") => {
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return fallback;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

function clearPacoteLinkUI() {
  ["mov-pacote-id","mov-cliente-id","mov-motorista-id","mov-veiculo-id"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const info = document.getElementById("pacote-info-display");
  if (info) { info.textContent = "Sem pacote vinculado."; info.style.color = ""; }
  const rast = document.getElementById("mov-pacote-rastreio");
  if (rast) rast.value = "";
  const unlink = document.getElementById("unlink-pacote-btn");
  if (unlink) unlink.style.display = "none";
}

function setSemPacoteUI(enabled) {
  const rast = document.getElementById("mov-pacote-rastreio");
  const btn  = document.getElementById("search-pacote-btn");
  if (rast) { rast.disabled = enabled; if (enabled) rast.value = ""; }
  if (btn)  { btn.disabled  = enabled; }
  if (enabled) clearPacoteLinkUI();
}

function openFinanceiroModal(mov = null) {
  const modal = document.getElementById("financeiro-modal-overlay");
  const form  = document.getElementById("financeiro-mov-form");
  const title = document.getElementById("financeiro-modal-title");
  if (!modal || !form) return;

  // reset + modo
  form.reset();
  form.dataset.mode = mov ? "edit" : "new";
  (document.getElementById("mov-id") || {}).value = mov?.id || "";

  // preencher campos padrão
  if (mov) {
    if (title) title.textContent = "Editar Lançamento (Pacote)";
    (document.getElementById("mov-pacote-id") || {}).value    = mov.pacote_id || "";
    (document.getElementById("mov-cliente-id") || {}).value   = mov.cliente_id || "";
    (document.getElementById("mov-motorista-id") || {}).value = mov.motorista_id || "";
    (document.getElementById("mov-veiculo-id") || {}).value   = mov.veiculo_id || "";

    (document.getElementById("mov-valor-pedido") || {}).value     = mov.valor_pedido ?? "";
    (document.getElementById("mov-custo-motorista") || {}).value  = mov.custo_motorista ?? "";
    (document.getElementById("mov-custo-veiculo") || {}).value    = mov.custo_veiculo ?? "";
    (document.getElementById("mov-imposto") || {}).value          = mov.imposto ?? "";
    (document.getElementById("mov-custo-operacao") || {}).value   = mov.custo_operacao ?? "";
    (document.getElementById("mov-custo-descarga") || {}).value   = mov.custo_descarga ?? "";
    (document.getElementById("mov-custo-seguro") || {}).value     = mov.custo_seguro ?? "";

    (document.getElementById("mov-data-lancamento") || {}).value  = mov.data_lancamento || "";
    (document.getElementById("mov-observacoes") || {}).value      = mov.observacoes || "";
  } else {
    if (title) title.textContent = "Novo Lançamento (Pacote)";
    const today = new Date().toISOString().split("T")[0];
    (document.getElementById("mov-data-lancamento") || {}).value = today;
  }

  // ---------- BLOCO “sem pacote” ----------
  const semPacoteChk = document.getElementById("mov-sem-pacote");
  const unlinkBtn    = document.getElementById("unlink-pacote-btn");
  const info         = document.getElementById("pacote-info-display");

  const hasPacote = !!(mov && mov.pacote_id);

  if (info) {
    if (hasPacote) {
      const clienteNome = mov?.clientes?.nome_completo || "Cliente Não Vinculado";
      const rastreio    = mov?.pacotes?.codigo_rastreio || "N/A";
      info.innerHTML = `Pacote <strong>${rastreio}</strong> • Cliente: <strong>${clienteNome}</strong>`;
      info.style.color = "";
    } else {
      info.textContent = "Sem pacote vinculado.";
      info.style.color = "";
    }
  }

  if (semPacoteChk) semPacoteChk.checked = !hasPacote;

  // aplica estado (usa seus helpers)
  if (typeof setSemPacoteUI === "function") {
    setSemPacoteUI(!hasPacote);
  } else {
    // fallback se os helpers não estiverem disponíveis
    const rast = document.getElementById("mov-pacote-rastreio");
    const btn  = document.getElementById("search-pacote-btn");
    if (rast) rast.disabled = !hasPacote;
    if (btn)  btn.disabled  = !hasPacote;
  }

  if (unlinkBtn) unlinkBtn.style.display = hasPacote ? "inline-flex" : "none";

  // abre modal
  modal.style.display = "flex";
}
// injeta modal se não existir no DOM (idempotente)
function ensureFinanceModal() {
  if (document.getElementById("financeiro-modal-overlay")) return;

  const modalHtml = `
  <!-- MODAL: Movimentação por Pacote -->
  <div class="modal-overlay" id="financeiro-modal-overlay" style="display:none;">
    <div class="modal-content" id="financeiro-modal-content" style="max-height: 80vh; overflow-y: auto;">
      <header class="modal-header">
        <h2 id="financeiro-modal-title">Novo Lançamento (Pacote)</h2>
        <button class="close-button" data-close-financeiro-modal>&times;</button>
      </header>

      <form id="financeiro-mov-form" class="modal-form">
        <input type="hidden" id="mov-id">

        <input type="hidden" id="mov-pacote-id">
        <input type="hidden" id="mov-cliente-id">
        <input type="hidden" id="mov-motorista-id">
        <input type="hidden" id="mov-veiculo-id">

        <div class="form-group">
          <label>Vínculo com Pacote (opcional)</label>

          <div style="display:flex; align-items:center; gap:.75rem; flex-wrap:wrap;">
            <div style="display:flex; gap:.5rem; align-items:center;">
              <input id="mov-pacote-rastreio" placeholder="EX: BR123..." />
              <button type="button" id="search-pacote-btn" class="btn btn-secondary">Buscar</button>
            </div>

            <label style="display:flex; gap:.5rem; align-items:center; white-space:nowrap;">
              <input type="checkbox" id="mov-sem-pacote"> Não vincular agora
            </label>

            <button type="button" id="unlink-pacote-btn" class="btn btn-tertiary" style="display:none;">
              Desvincular
            </button>
          </div>

          <small id="pacote-info-display"></small>
        </div>

        <div class="form-group"><label>Valor Pedido (Receita)</label><input id="mov-valor-pedido" type="number" step="0.01"></div>
        <div class="form-group"><label>Custo Motorista</label><input id="mov-custo-motorista" type="number" step="0.01"></div>
        <div class="form-group"><label>Custo Veículo</label><input id="mov-custo-veiculo" type="number" step="0.01"></div>

        <div class="form-group"><label>Imposto</label><input id="mov-imposto" type="number" step="0.01"></div>
        <div class="form-group"><label>Custo Operação</label><input id="mov-custo-operacao" type="number" step="0.01"></div>
        <div class="form-group"><label>Custo Descarga</label><input id="mov-custo-descarga" type="number" step="0.01"></div>
        <div class="form-group"><label>Custo Seguro</label><input id="mov-custo-seguro" type="number" step="0.01"></div>

        <div class="form-group"><label>Data Lançamento</label><input id="mov-data-lancamento" type="date" required></div>
        <div class="form-group"><label>Observações</label><textarea id="mov-observacoes"></textarea></div>

        <footer class="modal-footer">
          <button type="button" class="btn btn-secondary" data-close-financeiro-modal>Cancelar</button>
          <button type="submit" class="btn btn-primary" id="submit-mov-btn">Salvar</button>
        </footer>
      </form>
    </div>
  </div>

  <!-- MODAL: Movimentação Avulsa -->
  <div class="modal-overlay" id="financeiro-avulsa-overlay" style="display:none;">
    <div class="modal-content" id="financeiro-avulsa-content" style="max-height: 70vh; overflow-y: auto;">
      <header class="modal-header">
        <h2>Nova Movimentação Avulsa</h2>
        <button class="close-button" data-close-financeiro-avulsa>&times;</button>
      </header>

      <form id="financeiro-avulsa-form" class="modal-form">
        <input type="hidden" id="avulsa-id">

        <div class="form-group">
          <label>Tipo</label>
          <div style="display:flex; gap:1rem;">
            <label><input type="radio" name="avulsa-tipo" value="receita" checked> Receita</label>
            <label><input type="radio" name="avulsa-tipo" value="custo"> Custo</label>
          </div>
        </div>

        <div class="form-group">
          <label>Descrição</label>
          <input id="avulsa-descricao" placeholder="Ex.: Ajuste de caixa, combustível extra, multa, etc.">
        </div>

        <div class="form-group">
          <label>Valor</label>
          <input id="avulsa-valor" type="number" step="0.01" required>
        </div>

        <div class="form-group">
          <label>Data Lançamento</label>
          <input id="avulsa-data" type="date" required>
        </div>

        <footer class="modal-footer">
          <button type="button" class="btn btn-secondary" data-close-financeiro-avulsa>Cancelar</button>
          <button type="submit" class="btn btn-primary" id="submit-avulsa-btn">Salvar</button>
        </footer>
      </form>
    </div>
  </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

// ===============================================
// 1) RENDER PRINCIPAL DA PÁGINA
// ===============================================
async function renderFinanceiroPage() {
  const pageContent = document.getElementById("page-content");

  // HTML da página do Financeiro
  pageContent.innerHTML = `
  <div id="financeiro-content">
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

    <div class="flex" style="display:flex; gap:.5rem; flex-wrap:wrap; margin-bottom: .75rem;">
      <button class="btn btn-primary" id="open-mov-pacote">Adicionar movimentação do pacote</button>
      <button class="btn btn-secondary" id="open-mov-avulsa">Adicionar movimentação avulsa</button>
    </div>

    <div class="data-table-container">
      <h3 class="recent-packages-title">Lançamentos Recentes</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
          <tr>
            <th>Data</th>
            <th>Tipo</th>
            <th>Cód. Pacote</th>
            <th>Cliente</th>
            <th>Receita (R$)</th>
            <th>Custos (R$)</th>
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

  // inicialização
  initializeFinanceReports();
  loadFinancialTransactions();
  setupModalListeners(); // agora busca os elementos internamente
}

// ===============================================
// 2) RELATÓRIOS (AGREGADO)
// ===============================================
function initializeFinanceReports() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);

  const endInput = document.getElementById("finance-end-date");
  const startInput = document.getElementById("finance-start-date");

  endInput.value = endDate.toISOString().split("T")[0];
  startInput.value = startDate.toISOString().split("T")[0];

  endInput.addEventListener("change", updateFinanceReports);
  startInput.addEventListener("change", updateFinanceReports);

  updateFinanceReports();
}

async function updateFinanceReports() {
  const startDate = document.getElementById("finance-start-date").value;
  const endDate = document.getElementById("finance-end-date").value;
  const statsGrid = document.getElementById("finance-stats-grid");

  if (!startDate || !endDate) return;

  statsGrid.innerHTML = '<p class="loading-message">Calculando relatórios...</p>';

  try {
    const response = await fetchAuthenticated(
      `/api/financeiro?relatorio=agregado&startDate=${startDate}&endDate=${endDate}`
    );
    if (!response.ok) throw new Error("Falha ao carregar dados agregados.");

    const data = await response.json();

    const receita_total = Number(data.receita_total || 0);
    const custo_total = Number(data.custo_total || 0);
    const lucro_liquido = Number(
      data.lucro_liquido != null
        ? data.lucro_liquido
        : receita_total -
            (Number(data.custo_motorista_total || 0) + Number(data.custo_veiculo_total || 0))
    );
    const total_entradas = Number(data.total_entradas || 0);

    const lucroColor = lucro_liquido >= 0 ? "var(--color-success)" : "var(--color-danger)";

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
          <span class="stat-card-label">Custo Total (Motorista, Veículo e Outros)</span>
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
  const tbody = document.getElementById("financial-transactions-body");
  tbody.innerHTML = '<tr><td colspan="8">Carregando dados...</td></tr>';

  try {
    const response = await fetchAuthenticated("/api/financeiro");
    if (!response.ok) throw new Error("Falha ao carregar lista de lançamentos.");

    const transactions = await response.json();

    if (!Array.isArray(transactions) || transactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="no-data-message">Nenhum lançamento encontrado.</td></tr>';
      return;
    }

    tbody.innerHTML = transactions.map((t) => {
    const isAv = !!t.is_avulsa;
    const tipo = isAv ? (t.avulsa_tipo === 'receita' ? 'Avulsa • Receita' : 'Avulsa • Custo') : 'Pacote';

    // Valores (pacote)
    const receitaPac = Number(t.valor_pedido || 0);
    const custosPac  = Number(t.custo_motorista || 0) + Number(t.custo_veiculo || 0) +
                      Number(t.imposto || 0) + Number(t.custo_operacao || 0) +
                      Number(t.custo_descarga || 0) + Number(t.custo_seguro || 0);

    // Valores (avulsa)
    const valAv = Number(t.avulsa_valor || 0);
    const receita = isAv && t.avulsa_tipo === 'receita' ? valAv : receitaPac;
    const custos  = isAv && t.avulsa_tipo === 'custo'   ? valAv : custosPac;

    const lucro = receita - custos;
    const lucroColor = lucro >= 0 ? "var(--color-success-dark)" : "var(--color-danger-dark)";
    const dt = t.data_lancamento ? new Date(t.data_lancamento) : null;
    const dataFmt = dt && !isNaN(dt) ? dt.toLocaleDateString("pt-BR") : "-";

    const codPacote = isAv ? "—" : (t.pacotes?.codigo_rastreio || "N/A");
    const cliente   = isAv ? (t.avulsa_descricao ? `Avulsa: ${t.avulsa_descricao}` : "Avulsa") : (t.clientes?.nome_completo || "N/A");

    return `
      <tr data-id="${t.id}">
        <td>${dataFmt}</td>
        <td>${tipo}</td>
        <td>${codPacote}</td>
        <td>${cliente}</td>
        <td style="color: var(--color-success-dark);">${formatCurrency(receita, "-")}</td>
        <td style="color: var(--color-danger-dark);">${formatCurrency(custos, "-")}</td>
        <td style="font-weight:600;color:${lucroColor};">${formatCurrency(lucro)}</td>
        <td class="actions">
          <button class="btn-icon btn-edit-mov" title="Editar">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          </button>
          <button class="btn-icon btn-danger btn-delete-mov" title="Excluir">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </td>
      </tr>
    `;
  }).join("");

    // 🔗 Binda DEPOIS de pintar o DOM (e evita duplicar)
    document.querySelectorAll(".btn-edit-mov").forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.closest("tr").dataset.id;
        const resp = await fetchAuthenticated(`/api/financeiro?id=${encodeURIComponent(id)}`);
        if (!resp.ok) return alert("Erro ao carregar lançamento.");
        const mov = await resp.json();
        if (mov.is_avulsa) openAvulsaModal(mov);
        else openFinanceiroModal(mov);
      });
    });

    document.querySelectorAll(".btn-delete-mov").forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.closest("tr").dataset.id;
        if (!confirm("Tem certeza que deseja excluir este lançamento?")) return;
        const res = await fetchAuthenticated(`/api/financeiro?id=${encodeURIComponent(id)}`, { method: "DELETE" });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          return alert("Erro ao excluir: " + (j.error || res.statusText));
        }
        await loadFinancialTransactions();
        await updateFinanceReports();
      });
    });
  } catch (error) {
    document.getElementById("financial-transactions-body").innerHTML =
      `<tr><td colspan="8" class="error-message">Erro ao carregar dados: ${error.message}</td></tr>`;
  }
}

// ===============================================
// 4) MODAL (NOVO/EDITAR LANÇAMENTO)
// ===============================================
function setupModalListeners() {
  // Garantir modais no DOM
  const modalPac = document.getElementById("financeiro-modal-overlay");
  const formPac  = document.getElementById("financeiro-mov-form");
  const modalAv  = document.getElementById("financeiro-avulsa-overlay");
  const formAv   = document.getElementById("financeiro-avulsa-form");
  const pacoteInfoDisplay = document.getElementById("pacote-info-display");

  // Abrir modais
  const btnPac = document.getElementById("open-mov-pacote");
  const btnAv  = document.getElementById("open-mov-avulsa");

  if (btnPac && !btnPac.dataset.bound) {
    btnPac.dataset.bound = "1";
    btnPac.addEventListener("click", () => {
      if (pacoteInfoDisplay) { pacoteInfoDisplay.textContent = ""; pacoteInfoDisplay.style.color = ""; }
      openFinanceiroModal(null); // modo novo (pacote)
    });
  }

  if (btnAv && !btnAv.dataset.bound) {
    btnAv.dataset.bound = "1";
    btnAv.addEventListener("click", () => {
      openAvulsaModal(null);
    });
  }

  // Fechar modais
  modalPac?.querySelectorAll("[data-close-financeiro-modal]")?.forEach(btn => {
    if (!btn.dataset.bound) {
      btn.dataset.bound = "1";
      btn.addEventListener("click", () => { modalPac.style.display = "none"; });
    }
  });
  modalAv?.querySelectorAll("[data-close-financeiro-avulsa]")?.forEach(btn => {
    if (!btn.dataset.bound) {
      btn.dataset.bound = "1";
      btn.addEventListener("click", () => { modalAv.style.display = "none"; });
    }
  });

  // Checkbox "Não vincular agora"
  const semPacoteChk = document.getElementById("mov-sem-pacote");
  if (semPacoteChk && !semPacoteChk.dataset.bound) {
    semPacoteChk.dataset.bound = "1";
    semPacoteChk.addEventListener("change", (e) => {
      setSemPacoteUI(e.target.checked);
    });
  }

  // Botão "Desvincular"
  const unlinkBtn = document.getElementById("unlink-pacote-btn");
  if (unlinkBtn && !unlinkBtn.dataset.bound) {
    unlinkBtn.dataset.bound = "1";
    unlinkBtn.addEventListener("click", () => {
      clearPacoteLinkUI();
      const semPacoteChk = document.getElementById("mov-sem-pacote");
      if (semPacoteChk) { semPacoteChk.checked = true; }
      setSemPacoteUI(true);
    });
  }

  // Buscar pacote
  const searchBtn = document.getElementById("search-pacote-btn");
  if (searchBtn && !searchBtn.dataset.bound) {
    searchBtn.dataset.bound = "1";
    searchBtn.addEventListener("click", () => searchAndLinkPacote({ pacoteInfoDisplay }));
  }

  // Submit PACOTE
  if (formPac && formPac.dataset.bound !== "1") {
    formPac.dataset.bound = "1";
    formPac.addEventListener("submit", (e) => handleFinanceFormSubmit(e, { financeMovModal: modalPac }), { once: false });
  }

  // Submit AVULSA
  if (formAv && formAv.dataset.bound !== "1") {
    formAv.dataset.bound = "1";
    formAv.addEventListener("submit", handleAvulsaSubmit, { once: false });
  }
}

function openAvulsaModal(mov = null) {
  const modal = document.getElementById("financeiro-avulsa-overlay");
  const form  = document.getElementById("financeiro-avulsa-form");
  if (!modal || !form) return;

  form.reset();
  document.getElementById("avulsa-id").value = mov?.id || "";

  // default: hoje
  const today = new Date().toISOString().split('T')[0];
  document.getElementById("avulsa-data").value = mov?.data_lancamento || today;

  if (mov) {
    // radio
    const tipo = mov.avulsa_tipo || 'receita';
    form.querySelectorAll('input[name="avulsa-tipo"]').forEach(r => { r.checked = (r.value === tipo); });
    document.getElementById("avulsa-descricao").value = mov.avulsa_descricao || "";
    document.getElementById("avulsa-valor").value = mov.avulsa_valor ?? "";
  } else {
    // default: receita
    form.querySelector('input[name="avulsa-tipo"][value="receita"]').checked = true;
  }

  modal.style.display = "flex";
}

async function handleAvulsaSubmit(e) {
  e.preventDefault();
  if (handleAvulsaSubmit._busy) return;
  handleAvulsaSubmit._busy = true;

  const submitBtn = document.getElementById("submit-avulsa-btn");
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Salvando..."; }

  try {
    const id = document.getElementById("avulsa-id").value || null;
    const tipo = [...document.querySelectorAll('input[name="avulsa-tipo"]')].find(r => r.checked)?.value || 'receita';
    const payload = {
      id,
      is_avulsa: true,
      avulsa_tipo: tipo,
      avulsa_descricao: (document.getElementById("avulsa-descricao") || {}).value || null,
      avulsa_valor: parseFloat((document.getElementById("avulsa-valor") || {}).value) || null,
      data_lancamento: (document.getElementById("avulsa-data") || {}).value,
      // campos de pacote ficam nulos
      pacote_id: null, cliente_id: null, motorista_id: null, veiculo_id: null,
      valor_pedido: null, custo_motorista: null, custo_veiculo: null,
      imposto: null, custo_operacao: null, custo_descarga: null, custo_seguro: null,
    };

    if (!payload.avulsa_valor) throw new Error("Informe o valor.");
    if (!payload.data_lancamento) throw new Error("Informe a data.");

    const method = id ? 'PUT' : 'POST';
    const resp = await fetchAuthenticated('/api/financeiro', { method, body: JSON.stringify(payload) });
    if (!resp.ok) {
      const j = await resp.json().catch(()=>({}));
      throw new Error(j.error || 'Falha ao salvar avulsa.');
    }

    alert(id ? "Movimentação avulsa atualizada!" : "Movimentação avulsa adicionada!");
    document.getElementById("financeiro-avulsa-overlay").style.display = "none";
    await updateFinanceReports();
    await loadFinancialTransactions();
  } catch (err) {
    alert("Erro: " + err.message);
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Salvar"; }
    handleAvulsaSubmit._busy = false;
  }
}  

async function searchAndLinkPacote({ pacoteInfoDisplay }) {
  const rastreioInput = document.getElementById("mov-pacote-rastreio");
  const rastreio = (rastreioInput?.value || "").trim();

  if (!pacoteInfoDisplay) return;

  // ✅ Se vazio: apenas considera "sem vínculo" e não bloqueia o fluxo
  if (rastreio.length === 0) {
    clearPacoteLinkUI();
    pacoteInfoDisplay.textContent = "Sem pacote vinculado.";
    pacoteInfoDisplay.style.color = "";
    return;
  }

  // Se digitou mas muito curto, só alerta visual (não bloqueia submit do form)
  if (rastreio.length < 5) {
    pacoteInfoDisplay.textContent = "Código muito curto — você pode salvar sem vincular.";
    pacoteInfoDisplay.style.color = "var(--color-warning, #b58900)";
    return;
  }

  pacoteInfoDisplay.textContent = "Buscando...";
  pacoteInfoDisplay.style.color = "";

  try {
    const response = await fetchAuthenticated(`/api/pacotes?rastreio_code=${encodeURIComponent(rastreio)}`);
    if (!response.ok) throw new Error("Pacote não encontrado.");

    const result = await response.json();
    const pacote = Array.isArray(result) ? result[0] : result;
    if (!pacote) throw new Error("Pacote não encontrado.");

    // vincula
    (document.getElementById("mov-pacote-id") || {}).value = pacote.id || "";
    (document.getElementById("mov-cliente-id") || {}).value = pacote.cliente_id || "";
    (document.getElementById("mov-motorista-id") || {}).value = pacote.motorista_id || "";
    (document.getElementById("mov-veiculo-id") || {}).value = pacote.veiculo_id || "";

    const clienteNome = pacote.clientes ? pacote.clientes.nome_completo : "Cliente Não Vinculado";
    pacoteInfoDisplay.innerHTML = `Pacote <strong>${rastreio}</strong> vinculado! Cliente: <strong>${clienteNome}</strong>`;
    pacoteInfoDisplay.style.color = "var(--color-success-dark)";

    const unlink = document.getElementById("unlink-pacote-btn");
    if (unlink) unlink.style.display = "inline-flex";

    const semChk = document.getElementById("mov-sem-pacote");
    if (semChk) semChk.checked = false;
    setSemPacoteUI(false);
  } catch (error) {
    pacoteInfoDisplay.textContent = `Erro: ${error.message} — você pode salvar sem vincular.`;
    pacoteInfoDisplay.style.color = "var(--color-danger-dark)";
    clearPacoteLinkUI();
  }
}

async function handleFinanceFormSubmit(e, { financeMovModal }) {
  e.preventDefault();
  if (handleFinanceFormSubmit._busy) return; // 🚫 evita duplo clique
  handleFinanceFormSubmit._busy = true;

  const submitBtn = document.getElementById("submit-mov-btn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Salvando...";
  }

  try {
    const payload = {
      id: (document.getElementById("mov-id") || {}).value || null,

      pacote_id: (document.getElementById("mov-pacote-id") || {}).value || null,
      cliente_id: (document.getElementById("mov-cliente-id") || {}).value || null,
      motorista_id: (document.getElementById("mov-motorista-id") || {}).value || null,
      veiculo_id: (document.getElementById("mov-veiculo-id") || {}).value || null,

      valor_pedido: parseFloat((document.getElementById("mov-valor-pedido") || {}).value) || null,
      custo_motorista: parseFloat((document.getElementById("mov-custo-motorista") || {}).value) || null,
      custo_veiculo: parseFloat((document.getElementById("mov-custo-veiculo") || {}).value) || null,

      imposto: parseFloat((document.getElementById("mov-imposto") || {}).value) || null,
      custo_operacao: parseFloat((document.getElementById("mov-custo-operacao") || {}).value) || null,
      custo_descarga: parseFloat((document.getElementById("mov-custo-descarga") || {}).value) || null,
      custo_seguro: parseFloat((document.getElementById("mov-custo-seguro") || {}).value) || null,

      data_lancamento: (document.getElementById("mov-data-lancamento") || {}).value,
      observacoes: (document.getElementById("mov-observacoes") || {}).value,
    };

    if (!payload.data_lancamento) throw new Error("A data do lançamento é obrigatória.");
    if (
      !payload.valor_pedido &&
      !payload.custo_motorista &&
      !payload.custo_veiculo &&
      !payload.imposto &&
      !payload.custo_operacao &&
      !payload.custo_descarga &&
      !payload.custo_seguro
    ) {
      throw new Error("Insira pelo menos um valor (Receita ou algum Custo).");
    }

    const isEdit = Boolean(payload.id);
    const method = isEdit ? "PUT" : "POST";

    const response = await fetchAuthenticated("/api/financeiro", { method, body: JSON.stringify(payload) });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Falha ao salvar lançamento.");
    }

    alert(isEdit ? "Lançamento atualizado com sucesso!" : "Lançamento salvo com sucesso!");
    if (financeMovModal) financeMovModal.style.display = "none";
    await updateFinanceReports();
    await loadFinancialTransactions();
  } catch (error) {
    alert(`Erro ao salvar: ${error.message}`);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Salvar Lançamento";
    }
    handleFinanceFormSubmit._busy = false;
  }
}
