// js/custos.js

// Variável global para armazenar a lista de motoristas e evitar múltiplas buscas
let listaDeMotoristas = [];

// ===============================================
// RENDERIZAÇÃO PRINCIPAL DA PÁGINA
// ===============================================
async function renderCustosPage() {
    // Busca a lista de motoristas uma vez quando a página carrega
    try {
        const response = await fetchAuthenticated("/api/motoristas");
        if (!response.ok) throw new Error("Falha ao carregar motoristas");
        listaDeMotoristas = await response.json();
    } catch (error) {
        console.error("Erro ao carregar lista de motoristas:", error);
        alert("Não foi possível carregar a lista de motoristas. A página pode não funcionar corretamente.");
    }

    const pageContent = document.getElementById("page-content");
    pageContent.innerHTML = `
        <div id="custos-content">
            <div class="flex" style="display:flex; gap:.5rem; flex-wrap:wrap; margin-bottom: .75rem;">
                <button class="btn btn-primary" id="open-custo-modal-btn">Adicionar Acerto</button>
            </div>
            <div class="data-table-container">
                <h3 class="recent-packages-title">Acerto</h3>
                <div class="table-wrapper" style="overflow-x: auto;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Motorista</th>
                                <th>Adiantamento</th>
                                <th>Saldo</th>
                                <th>Anexos</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="custos-table-body">
                            <tr><td colspan="6">Carregando...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    ensureCustosModal();
    setupCustosListeners();
    loadCustos();
}


// ===============================================
// TABELA DE CUSTOS
// ===============================================
async function loadCustos() {
    const tbody = document.getElementById("custos-table-body");
    tbody.innerHTML = '<tr><td colspan="6">Carregando Acertos...</td></tr>';

    try {
        const response = await fetchAuthenticated("/api/custos");
        if (!response.ok) throw new Error("Falha ao carregar Acertos.");
        const custos = await response.json();

        if (!custos || custos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data-message">Nenhum Acerto lançado.</td></tr>';
            return;
        }

        tbody.innerHTML = custos.map(custo => {
            const dataFmt = new Date(custo.data_custo).toLocaleDateString("pt-BR", { timeZone: 'UTC' });
            
            const anexo1Link = custo.anexo1_url ? `<a href="${custo.anexo1_url}" target="_blank" class="link">Anexo 1</a>` : '';
            const anexo2Link = custo.anexo2_url ? `<a href="${custo.anexo2_url}" target="_blank" class="link">Anexo 2</a>` : '';
            const anexosHtml = [anexo1Link, anexo2Link].filter(Boolean).join(' • ') || 'Nenhum';

            return `
                <tr data-id="${custo.id}">
                    <td>${dataFmt}</td>
                    <td>${custo.motoristas?.nome_completo || 'Motorista não encontrado'}</td>
                    <td style="color: var(--color-danger-dark);">${formatCurrency(custo.valor_adiantamento)}</td>
                    <td style="font-weight: 600;">${formatCurrency(custo.valor_saldo)}</td>
                    <td>${anexosHtml}</td>
                    <td class="actions">
                        <button class="btn-icon btn-edit-custo" title="Editar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        </button>
                        <button class="btn-icon btn-danger btn-delete-custo" title="Excluir">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="6" class="error-message">Erro ao carregar dados: ${error.message}</td></tr>`;
    }
}

// ===============================================
// MODAL
// ===============================================
function ensureCustosModal() {
    if (document.getElementById("custos-modal-overlay")) return;

    const modalHtml = `
    <div class="modal-overlay" id="custos-modal-overlay" style="display:none;">
      <div class="modal-content" style="max-height: 80vh; overflow-y: auto;">
        <header class="modal-header">
          <h2 id="custos-modal-title">Adicionar Acerto</h2>
          <button class="close-button" data-close-custos-modal>&times;</button>
        </header>
        <form id="custos-form" class="modal-form">
          <input type="hidden" id="custo-id">
          
          <div class="form-group">
            <label for="custo-motorista-id">Motorista</label>
            <select id="custo-motorista-id" required>
              <option value="">Selecione um motorista...</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="custo-data">Data</label>
            <input type="date" id="custo-data" required>
          </div>
          
          <div class="form-group">
            <label for="custo-chave-pix">Chave PIX</label>
            <input type="text" id="custo-chave-pix" placeholder="Chave PIX para o pagamento">
          </div>
          
          <div class="form-group">
            <label for="custo-adiantamento">Valor Adiantamento</label>
            <input type="number" step="0.01" id="custo-adiantamento" placeholder="0.00">
          </div>

          <div class="form-group">
            <label for="custo-saldo">Valor Saldo</label>
            <input type="number" step="0.01" id="custo-saldo" placeholder="0.00">
          </div>

          <div class="form-group">
            <label for="custo-anexo1">Anexo 1 (Comprovante)</label>
            <input type="file" id="custo-anexo1" accept="image/png, image/jpeg, application/pdf">
            <small id="anexo1-preview" class="anexo-preview"></small>
          </div>

          <div class="form-group">
            <label for="custo-anexo2">Anexo 2 (Opcional)</label>
            <input type="file" id="custo-anexo2" accept="image/png, image/jpeg, application/pdf">
            <small id="anexo2-preview" class="anexo-preview"></small>
          </div>

          <footer class="modal-footer">
            <button type="button" class="btn btn-secondary" data-close-custos-modal>Cancelar</button>
            <button type="submit" class="btn btn-primary" id="submit-custo-btn">Salvar</button>
          </footer>
        </form>
      </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function openCustosModal(custo = null) {
    const modal = document.getElementById("custos-modal-overlay");
    const form = document.getElementById("custos-form");
    const title = document.getElementById("custos-modal-title");
    if (!modal || !form) return;

    form.reset();
    form.dataset.mode = custo ? 'edit' : 'new';
    document.getElementById('custo-id').value = custo?.id || '';

    document.getElementById('anexo1-preview').innerHTML = '';
    document.getElementById('anexo2-preview').innerHTML = '';

    const select = document.getElementById('custo-motorista-id');
    select.innerHTML = '<option value="">Selecione um motorista...</option>';
    listaDeMotoristas.forEach(m => {
        const option = document.createElement('option');
        option.value = m.id;
        option.textContent = m.nome_completo;
        // option.dataset.cpf foi removido daqui
        select.appendChild(option);
    });

    if (custo) {
        title.textContent = 'Editar Acerto';
        select.value = custo.motorista_id;
        // Linha que preenchia o CPF foi removida
        document.getElementById('custo-data').value = custo.data_custo;
        document.getElementById('custo-chave-pix').value = custo.chave_pix || '';
        document.getElementById('custo-adiantamento').value = custo.valor_adiantamento ?? '';
        document.getElementById('custo-saldo').value = custo.valor_saldo ?? '';
        if (custo.anexo1_url) {
            document.getElementById('anexo1-preview').innerHTML = `Anexo salvo: <a href="${custo.anexo1_url}" target="_blank" class="link">Ver</a>. Envie um novo para substituir.`;
        }
        if (custo.anexo2_url) {
            document.getElementById('anexo2-preview').innerHTML = `Anexo salvo: <a href="${custo.anexo2_url}" target="_blank" class="link">Ver</a>. Envie um novo para substituir.`;
        }
    } else {
        title.textContent = 'Adicionar Acerto';
        document.getElementById('custo-data').value = new Date().toISOString().split('T')[0];
    }

    modal.style.display = 'flex';
}

// ===============================================
// EVENTOS E SUBMISSÃO DO FORMULÁRIO
// ===============================================
function setupCustosListeners() {
    document.getElementById('open-custo-modal-btn')?.addEventListener('click', () => {
        openCustosModal(null);
    });

    document.querySelectorAll('[data-close-custos-modal]').forEach(el => {
        el.addEventListener('click', () => {
            document.getElementById('custos-modal-overlay').style.display = 'none';
        });
    });

    // vvvvvv LISTENER PARA AUTO-PREENCHER CPF FOI REMOVIDO DAQUI vvvvvv

    document.getElementById('custos-form')?.addEventListener('submit', handleCustoFormSubmit);

    const tbody = document.getElementById('custos-table-body');
    tbody.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.btn-edit-custo');
        if (editBtn) {
            const id = editBtn.closest('tr').dataset.id;
            const response = await fetchAuthenticated(`/api/custos?id=${id}`);
            if (!response.ok) return alert('Erro ao carregar dados do custo.');
            const custo = await response.json();
            openCustosModal(custo);
        }

        const deleteBtn = e.target.closest('.btn-delete-custo');
        if (deleteBtn) {
            const id = deleteBtn.closest('tr').dataset.id;
            if (!confirm('Tem certeza que deseja excluir este Acerto? Os anexos também serão permanentemente removidos.')) return;
            
            try {
                const response = await fetchAuthenticated(`/api/custos?id=${id}`, { method: 'DELETE' });
                if (!response.ok) {
                    const { error } = await response.json().catch(() => ({}));
                    throw new Error(error || 'Falha ao excluir.');
                }
                await loadCustos();
            } catch (err) {
                alert(`Erro ao excluir: ${err.message}`);
            }
        }
    });
}

async function handleCustoFormSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-custo-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Salvando...';

    const id = document.getElementById('custo-id').value;
    const isEdit = !!id;

    try {
        // Função auxiliar para upload
        const uploadFile = async (fileInputId) => {
            const fileInput = document.getElementById(fileInputId);
            const file = fileInput.files[0];
            if (!file) return null;

            const motoristaId = document.getElementById('custo-motorista-id').value;
            // Cria um nome de arquivo único para evitar conflitos
            const fileName = `${motoristaId}/${Date.now()}-${file.name}`;
            
            const { data, error } = await supabase.storage
                .from('comprovantes_custos')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true // Permite substituir se o arquivo já existir
                });
            
            if (error) throw new Error(`Falha no upload do anexo: ${error.message}`);
            
            const { data: { publicUrl } } = supabase.storage
                .from('comprovantes_custos')
                .getPublicUrl(data.path);

            return publicUrl;
        };

        // Faz o upload dos arquivos e obtém as URLs
        const anexo1Url = await uploadFile('custo-anexo1');
        const anexo2Url = await uploadFile('custo-anexo2');

        // Monta o payload para enviar para a API
        const payload = {
            motorista_id: document.getElementById('custo-motorista-id').value,
            data_custo: document.getElementById('custo-data').value,
            chave_pix: document.getElementById('custo-chave-pix').value || null,
            valor_adiantamento: parseFloat(document.getElementById('custo-adiantamento').value) || null,
            valor_saldo: parseFloat(document.getElementById('custo-saldo').value) || null,
        };

        // Adiciona URLs somente se um novo arquivo foi enviado
        if (anexo1Url) payload.anexo1_url = anexo1Url;
        if (anexo2Url) payload.anexo2_url = anexo2Url;
        
        const method = isEdit ? 'PUT' : 'POST';
        if (isEdit) payload.id = id;

        const response = await fetchAuthenticated('/api/custos', {
            method,
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const { error } = await response.json().catch(() => ({}));
            throw new Error(error || 'Falha ao salvar o Acerto.');
        }

        alert('Acerto salvo com sucesso!');
        document.getElementById('custos-modal-overlay').style.display = 'none';
        await loadCustos();

    } catch (error) {
        alert(`Erro: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar';
    }
}