// js/pacotes.js

// ===================================================================
// FUNÇÃO AUXILIAR ATUALIZADA (SUPORTE A UPLOAD DE ARQUIVOS)
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
// LÓGICA DA PÁGINA DE PACOTES
// ===================================================================

async function renderPacotesPage() {
    pageContent.innerHTML = `
        <div class="page-header">
            <input type="search" id="search-pacotes" class="search-input" placeholder="Buscar por cód. de rastreio...">
            <button id="add-pacote-btn" class="btn btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>Adicionar Pedido</span>
            </button>
        </div>
        <div class="tabs">
            <button class="tab-btn active" data-filter="ativos">Pedidos Ativos</button>
            <button class="tab-btn" data-filter="entregues">Entregues</button>
        </div>
        <div id="pacotes-table-container"><p>Carregando pedidos...</p></div>
    `;
    document.getElementById('add-pacote-btn').addEventListener('click', () => openPacoteModal());
    document.getElementById('search-pacotes').addEventListener('input', (e) => {
        const activeFilter = document.querySelector('.tab-btn.active').dataset.filter;
        fetchAndRenderPacotes(e.target.value, activeFilter);
    });
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelector('.tab-btn.active').classList.remove('active');
            e.currentTarget.classList.add('active');
            const searchTerm = document.getElementById('search-pacotes').value;
            fetchAndRenderPacotes(searchTerm, e.currentTarget.dataset.filter);
        });
    });
    await fetchAndRenderPacotes(null, 'ativos');
}

async function fetchAndRenderPacotes(searchTerm = '', filter = 'ativos') {
    const container = document.getElementById('pacotes-table-container');
    container.innerHTML = '<p>Carregando pedidos...</p>';

    try {
        // **MODIFICADO**
        const response = await fetchAuthenticated('/api/pacotes');
        if (!response.ok) throw new Error('Erro ao buscar pedidos da API.');
        
        let pacotes = await response.json();

        let filteredPacotes = pacotes.filter(p => {
            if (filter === 'entregues') return p.status === 'Entregue';
            return p.status !== 'Entregue';
        });

        if (searchTerm) {
            filteredPacotes = filteredPacotes.filter(p => p.codigo_rastreio.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        if (filteredPacotes.length === 0) {
            container.innerHTML = `<p>Nenhum pedido encontrado para o filtro '${filter}'.</p>`;
            return;
        }

        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Cód. Rastreio</th>
                    <th>Cliente</th>
                    <th>Motorista</th>
                    <th>Veículo</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${filteredPacotes.map(pacote => {
                    const escapedPacote = JSON.stringify(pacote).replace(/"/g, '&quot;');
                    return `
                    <tr data-id="${pacote.id}" data-pacote="${escapedPacote}">
                        <td><strong>${pacote.codigo_rastreio}</strong></td>
                        <td>${pacote.clientes ? pacote.clientes.nome_completo : 'N/A'}</td>
                        <td>${pacote.motoristas ? pacote.motoristas.nome_completo : 'Não atribuído'}</td>
                        <td>${pacote.veiculos ? `${pacote.veiculos.modelo} (${pacote.veiculos.placa})` : 'Não atribuído'}</td>
                        <td>
                            <div class="status-container">
                                <button class="status-badge-btn status-${(pacote.status || '').toLowerCase().replace(/ /g, '-')}">
                                    ${pacote.status}
                                </button>
                            </div>
                        </td>
                        <td class="actions">
                            ${pacote.status === 'Entregue' ? `
                                <button class="btn-icon btn-view-delivered" title="Visualizar Detalhes"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>
                            ` : `
                                <button class="btn-icon btn-edit-pacote" title="Editar"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button>
                                <button class="btn-icon btn-danger btn-delete-pacote" title="Excluir"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                            `}
                        </td>
                    </tr>
                `}).join('')}
            </tbody>
        `;
        container.innerHTML = '';
        container.appendChild(table);
        addPacoteActionListeners();
        addStatusButtonListeners();
        addViewDeliveredListeners();
    } catch (error) {
        container.innerHTML = `<p class="error-message">${error.message}</p>`;
    }
}

function addViewDeliveredListeners() {
    document.querySelectorAll('.btn-view-delivered').forEach(button => {
        button.addEventListener('click', handleViewDeliveredClick);
    });
}

function handleViewDeliveredClick(e) {
    try {
        const row = e.currentTarget.closest('tr');
        const pacoteDataString = row.dataset.pacote;
        if (pacoteDataString) {
            const pacote = JSON.parse(pacoteDataString);
            openViewDeliveredModal(pacote);
        } else {
            throw new Error('Dados do pacote não encontrados na linha da tabela.');
        }
    } catch (error) {
        console.error("Erro ao processar dados do pacote para visualização:", error);
        alert("Não foi possível carregar os detalhes do pacote.");
    }
}

function openViewDeliveredModal(pacote) {
    const dataEntrega = new Date(pacote.updated_at).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });
    const modalHtml = `
        <div class="modal-overlay" id="view-delivered-modal">
            <div class="modal-content">
                <header class="modal-header"><h2>Detalhes da Entrega</h2><button class="close-button">&times;</button></header>
                <div class="modal-form">
                    <div class="form-group"><label>Código de Rastreio</label><input type="text" value="${pacote.codigo_rastreio || ''}" readonly></div>
                    <div class="form-group"><label>Cliente</label><input type="text" value="${pacote.clientes ? pacote.clientes.nome_completo : 'N/A'}" readonly></div>
                    <div class="form-group"><label>Entregue em</label><input type="text" value="${dataEntrega !== 'Invalid Date' ? dataEntrega : 'Data indisponível'}" readonly></div>
                    <div class="form-group">
                        <label>Prova de Entrega</label>
                        ${pacote.prova_entrega_url ? `
                            <div class="proof-image-container">
                                <a href="${pacote.prova_entrega_url}" target="_blank" title="Abrir imagem em nova aba">
                                    <img src="${pacote.prova_entrega_url}" alt="Prova de Entrega">
                                </a>
                            </div>
                        ` : `<p>Nenhuma imagem de prova disponível para este pedido.</p>`}
                    </div>
                </div>
                <footer class="modal-footer"><button type="button" class="btn btn-secondary close-btn">Fechar</button></footer>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('view-delivered-modal');
    modal.querySelector('.close-button').onclick = () => modal.remove();
    modal.querySelector('.close-btn').onclick = () => modal.remove();
}

function addPacoteActionListeners() {
    document.querySelectorAll('.btn-edit-pacote').forEach(button => {
        button.addEventListener('click', handleEditPacote);
    });
    document.querySelectorAll('.btn-delete-pacote').forEach(button => {
        button.addEventListener('click', handleDeletePacote);
    });
}

async function handleDeletePacote(e) {
    const pacoteId = e.currentTarget.closest('tr').dataset.id;
    if (confirm('Tem certeza que deseja excluir este pacote?')) {
        try {
            // **MODIFICADO**
            const response = await fetchAuthenticated('/api/pacotes', {
                method: 'DELETE',
                body: JSON.stringify({ id: pacoteId }),
            });
            if (!response.ok) throw new Error('Erro ao excluir o pacote.');
            const activeFilter = document.querySelector('.tab-btn.active').dataset.filter;
            await fetchAndRenderPacotes(null, activeFilter);
        } catch (error) {
            alert(error.message);
        }
    }
}

async function handleEditPacote(e) {
    const pacoteId = e.currentTarget.closest('tr').dataset.id;
    try {
        // **MODIFICADO**
        const response = await fetchAuthenticated(`/api/pacotes?id=${pacoteId}`);
        if (!response.ok) throw new Error('Erro ao buscar dados do pacote.');
        const pacote = await response.json();
        openPacoteModal(pacote);
    } catch (error) {
        alert(error.message);
    }
}

function generateTrackingCode(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function openPacoteModal(pacote = null) {
    const isEditing = pacote !== null;
    const modalTitle = isEditing ? 'Editar Pedido' : 'Adicionar Novo Pedido';

    try {
        // **MODIFICADO**
        const [clientesRes, motoristasRes, veiculosRes] = await Promise.all([
            fetchAuthenticated('/api/clientes'),
            fetchAuthenticated('/api/motoristas'),
            fetchAuthenticated('/api/frota')
        ]);
        if (!clientesRes.ok || !motoristasRes.ok || !veiculosRes.ok) throw new Error('Erro ao carregar dados para o formulário.');
        
        const clientes = await clientesRes.json();
        const motoristas = await motoristasRes.json();
        const veiculos = await veiculosRes.json();

        const clienteOptions = clientes.map(c => `<option value="${c.id}" ${isEditing && c.id === pacote.cliente_id ? 'selected' : ''}>${c.nome_completo}</option>`).join('');
        const motoristaOptions = motoristas.map(m => `<option value="${m.id}" ${isEditing && m.id === pacote.motorista_id ? 'selected' : ''}>${m.nome_completo}</option>`).join('');
        const veiculoOptions = veiculos.map(v => `<option value="${v.id}" ${isEditing && v.id === pacote.veiculo_id ? 'selected' : ''}>${v.modelo} (${v.placa})</option>`).join('');
        
        const statusOptions = ['Pedido Criado', 'Aguardando Coleta', 'Coletado', 'Em Transito', 'Entregue', 'Cancelado']
            .map(s => `<option value="${s}" ${isEditing && s === pacote.status ? 'selected' : ''}>${s}</option>`).join('');

        const modalHtml = `
            <div class="modal-overlay" id="pacote-modal">
                <div class="modal-content">
                    <header class="modal-header"><h2>${modalTitle}</h2><button class="close-button">&times;</button></header>
                    <form id="pacote-form" class="modal-form" data-id="${isEditing ? pacote.id : ''}">
                        <div class="form-group"><label>Cliente *</label><select id="cliente_id" required><option value="" disabled selected>Selecione</option>${clienteOptions}</select></div>
                        <div class="form-row">
                            <div class="form-group"><label>Motorista</label><select id="motorista_id"><option value="">Não atribuído</option>${motoristaOptions}</select></div>
                            <div class="form-group"><label>Veículo</label><select id="veiculo_id"><option value="">Não atribuído</option>${veiculoOptions}</select></div>
                        </div>
                        <div class="form-group"><label>Descrição do Pacote *</label><input type="text" id="descricao" value="${isEditing ? pacote.descricao : ''}" required></div>
                        <div class="form-row">
                            <div class="form-group"><label>Origem *</label><input type="text" id="origem" value="${isEditing ? pacote.origem : ''}" required></div>
                            <div class="form-group"><label>Destino *</label><input type="text" id="destino_endereco" value="${isEditing ? pacote.destino_endereco || '' : ''}" required></div>
                        </div>
                        <div class="form-group"><label>Status *</label><select id="status" required>${statusOptions}</select></div>
                        <div class="form-group">
                            <label>Código de Rastreio</label>
                            <div class="input-with-button">
                                <input type="text" id="codigo_rastreio" value="${isEditing ? pacote.codigo_rastreio : generateTrackingCode()}" readonly>
                                ${!isEditing ? `<button type="button" id="generate-code-btn" class="btn-icon" title="Gerar novo"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg></button>` : ''}
                            </div>
                        </div>
                        <footer class="modal-footer"><button type="button" class="btn btn-secondary close-btn">Cancelar</button><button type="submit" class="btn btn-primary">${isEditing ? 'Salvar' : 'Criar'}</button></footer>
                    </form>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = document.getElementById('pacote-modal');
        if (!isEditing) {
            modal.querySelector('#generate-code-btn').onclick = () => {
                modal.querySelector('#codigo_rastreio').value = generateTrackingCode();
            };
        }
        modal.querySelector('.close-button').onclick = () => modal.remove();
        modal.querySelector('.close-btn').onclick = () => modal.remove();
        modal.querySelector('#pacote-form').onsubmit = handlePacoteFormSubmit;
    } catch (error) {
        alert(error.message);
    }
}

async function handlePacoteFormSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const editingId = form.dataset.id;
    const motoristaId = document.getElementById('motorista_id').value;
    const veiculoId = document.getElementById('veiculo_id').value;

    const pacoteData = {
        cliente_id: document.getElementById('cliente_id').value,
        motorista_id: motoristaId ? motoristaId : null,
        veiculo_id: veiculoId ? veiculoId : null,
        descricao: document.getElementById('descricao').value,
        origem: document.getElementById('origem').value,
        destino_endereco: document.getElementById('destino_endereco').value,
        status: document.getElementById('status').value,
    };

    let url = '/api/pacotes';
    let method = 'POST';

    if (editingId) {
        method = 'PUT';
        pacoteData.id = editingId;
    } else {
        pacoteData.codigo_rastreio = document.getElementById('codigo_rastreio').value;
    }

    try {
        // **MODIFICADO**
        const response = await fetchAuthenticated(url, {
            method: method,
            body: JSON.stringify(pacoteData)
        });
        if (!response.ok) throw new Error('Erro ao salvar o pacote.');
        
        document.getElementById('pacote-modal').remove();
        const activeFilter = document.querySelector('.tab-btn.active').dataset.filter;
        await fetchAndRenderPacotes(null, activeFilter);
    } catch (error) {
        alert(error.message);
    }
}

// --- FUNÇÕES PARA ATUALIZAÇÃO RÁPIDA DE STATUS ---

function addStatusButtonListeners() {
    document.querySelectorAll('.status-badge-btn').forEach(button => {
        button.addEventListener('click', openStatusModal);
    });
}

function openStatusModal(e) {
    // Primeiro, fecha qualquer outro modal de status que possa estar aberto
    closeStatusModal();

    const button = e.currentTarget;
    const pacoteId = button.closest('tr').dataset.id;
    const statusOptions = ['Pedido Criado', 'Aguardando Coleta', 'Coletado', 'Em Transito', 'Entregue', 'Cancelado'];

    // --- Cria a estrutura do Modal ---
    // 1. O Overlay (fundo escuro)
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay status-modal-overlay'; // Reutiliza sua classe de overlay

    // 2. O Conteúdo do Modal
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content status-modal-content'; // Reutiliza sua classe de modal

    // 3. O Cabeçalho
    modalContent.innerHTML = `
        <div class="modal-header">
            <h2>Alterar Status</h2>
            <button type="button" class="close-button">&times;</button>
        </div>
    `;

    // 4. O Corpo com a lista de botões de status
    const modalBody = document.createElement('div');
    modalBody.className = 'status-modal-body';
    
    const statusList = document.createElement('ul');
    statusOptions.forEach(status => {
        const listItem = document.createElement('li');
        const statusButton = document.createElement('button');
        statusButton.type = 'button';
        statusButton.textContent = status;
        
        // Adiciona um "ouvinte" para cada botão de status
        statusButton.addEventListener('click', async () => {
            if (status === 'Entregue') {
                openUploadModal(pacoteId); // Abre o modal de upload de foto
            } else {
                await updatePackageStatus(pacoteId, status); // Atualiza o status diretamente
            }
            closeStatusModal(); // Fecha este modal de status
        });
        
        listItem.appendChild(statusButton);
        statusList.appendChild(listItem);
    });
    
    modalBody.appendChild(statusList);
    modalContent.appendChild(modalBody);

    // Adiciona o conteúdo ao overlay
    overlay.appendChild(modalContent);
    
    // Adiciona tudo à página
    document.body.appendChild(overlay);

    // --- Adiciona os "ouvintes" para fechar o modal ---
    overlay.querySelector('.close-button').addEventListener('click', closeStatusModal);
    // Fecha se clicar no fundo escuro (overlay)
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            closeStatusModal();
        }
    });
}

// Função para FECHAR e remover o modal da tela
function closeStatusModal() {
    const modal = document.querySelector('.status-modal-overlay');
    if (modal) {
        modal.remove();
    }
}

async function updatePackageStatus(id, status, proofUrl = null) {
    try {
        const bodyData = { id, status };
        if (proofUrl) {
            bodyData.prova_entrega_url = proofUrl;
        }
        // **MODIFICADO**
        const response = await fetchAuthenticated('/api/pacotes', {
            method: 'PUT',
            body: JSON.stringify(bodyData),
        });
        if (!response.ok) throw new Error('Falha ao atualizar o status.');
        const activeFilter = document.querySelector('.tab-btn.active').dataset.filter;
        await fetchAndRenderPacotes(null, activeFilter);
    } catch (error) {
        alert(error.message);
    }
}

// ===================================================================
// LÓGICA DO MODAL DE UPLOAD DE PROVA DE ENTREGA
// ===================================================================

let pacoteIdParaAtualizar = null;

function openUploadModal(pacoteId) {
    pacoteIdParaAtualizar = pacoteId;
    const modal = document.getElementById('upload-proof-modal');
    document.getElementById('upload-modal-pacote-id').textContent = `#${pacoteId}`;
    modal.style.display = 'flex';
    modal.querySelector('.close-button').onclick = closeUploadModal;
    modal.querySelector('.close-btn').onclick = closeUploadModal;
    modal.querySelector('#upload-proof-form').onsubmit = handlePhotoUploadSubmit;
    modal.querySelector('#file-input').onchange = handleFilePreview;
}

function closeUploadModal() {
    const modal = document.getElementById('upload-proof-modal');
    const form = document.getElementById('upload-proof-form');
    modal.style.display = 'none';
    form.reset();
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('upload-status-message').textContent = '';
    document.getElementById('submit-upload-btn').disabled = false;
    document.getElementById('submit-upload-btn').textContent = 'Enviar Foto';
    pacoteIdParaAtualizar = null;
}

function handleFilePreview(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        const preview = document.getElementById('image-preview');
        reader.onload = (e) => {
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

async function handlePhotoUploadSubmit(event) {
    event.preventDefault();
    
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    const statusMessage = document.getElementById('upload-status-message');
    const submitBtn = document.getElementById('submit-upload-btn');

    if (!file || !pacoteIdParaAtualizar) {
        statusMessage.textContent = 'Por favor, selecione uma imagem.';
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Aguarde...';
    
    // ================== INÍCIO DA MODIFICAÇÃO ==================
    statusMessage.textContent = 'Comprimindo imagem...'; // NOVO: informa o usuário

    // Opções de compressão (você pode ajustar esses valores)
    const options = {
        maxSizeMB: 0.5,           // Tamanho máximo do arquivo final em MB (ex: 500KB)
        maxWidthOrHeight: 1280,     // Redimensiona para no máximo 1280px de largura/altura
        useWebWorker: true          // Processa em background para não travar a tela
    };

    let compressedFile;
    try {
        // Usa a função da biblioteca que adicionamos via CDN
        compressedFile = await imageCompression(file, options);
        console.log(`Tamanho original: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Tamanho comprimido: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
        console.error("Erro ao comprimir imagem:", error);
        statusMessage.textContent = `Erro ao processar imagem. Tente novamente.`;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar Foto';
        return; // Para a execução se a compressão falhar
    }
    // =================== FIM DA MODIFICAÇÃO ====================

    statusMessage.textContent = 'Enviando imagem...';

    const formData = new FormData();
    // MODIFICADO: anexa o arquivo JÁ COMPRIMIDO em vez do original
    formData.append('proofImage', compressedFile, compressedFile.name); // Adicionamos o nome do arquivo
    formData.append('pacoteId', pacoteIdParaAtualizar);

    try {
        // 1. Envia a foto para a API de upload
        const response = await fetchAuthenticated('/api/upload-proof', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha ao enviar a imagem.');
        }

        const result = await response.json();
        const imageUrl = result.publicUrl;

        statusMessage.textContent = 'Imagem enviada! Atualizando status...';

        // 2. Com a URL em mãos, atualiza o status do pacote
        await updatePackageStatus(pacoteIdParaAtualizar, 'Entregue', imageUrl);
        
        closeUploadModal();

    } catch (error) {
        statusMessage.textContent = `Erro: ${error.message}`;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar Foto';
    }
}