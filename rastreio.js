// js/rastreio.js

document.addEventListener('DOMContentLoaded', () => {
    const trackingForm = document.getElementById('tracking-form');
    const trackingCodeInput = document.getElementById('tracking-code');
    const resultsContainer = document.getElementById('tracking-results');

    const apiUrl = '/api/rastreio';

    function checkUrlForTrackingCode() {
        const path = window.location.pathname;
        const parts = path.split('/'); 
        if (parts.length > 2 && parts[1].toLowerCase() === 'rastreio') {
            const codigoFromUrl = parts[2];
            if (codigoFromUrl) {
                trackingCodeInput.value = codigoFromUrl.toUpperCase();
                trackingForm.requestSubmit();
            }
        }
    }

    trackingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codigo = trackingCodeInput.value.trim().toUpperCase();
        if (!codigo) return;

        resultsContainer.innerHTML = '<p class="loading-message">Buscando informações...</p>';
        
        try {
            const response = await fetch(`${apiUrl}?codigo=${codigo}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ocorreu um erro desconhecido.');
            }

            renderResults(data);
        } catch (error) {
            resultsContainer.innerHTML = `<p class="error-message">${error.message}</p>`;
        }
    });

    // **FUNÇÃO DE RENDERIZAÇÃO CORRIGIDA E FINAL**
    function renderResults(pacote) {
        const postDate = new Date(pacote.data_postagem).toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'long', year: 'numeric'
        });

        const detailsHtml = `
            <div class="package-details">
                <div class="detail-item"><strong>Código de Rastreio</strong><span>${pacote.codigo_rastreio}</span></div>
                <div class="detail-item"><strong>Status Atual</strong><span>${pacote.status}</span></div>
                <div class="detail-item"><strong>Descrição</strong><span>${pacote.descricao}</span></div>
                <div class="detail-item"><strong>Data da Postagem</strong><span>${postDate}</span></div>
                <div class="detail-item"><strong>Origem</strong><span>${pacote.origem}</span></div>
                <div class="detail-item"><strong>Destino</strong><span>${pacote.destino_endereco}</span></div>
            </div>
        `;
        
        // --- LÓGICA DA LINHA DO TEMPO CORRIGIDA ---
        let timelineHtml = '<div class="timeline">';

        // 1. Adiciona o evento inicial de "Pedido Criado" (sempre presente)
        timelineHtml += `
            <div class="timeline-item completed">
                <div class="timeline-icon">
                    <img src="/images/icon-pedido-criado.png" alt="Pedido Criado">
                </div>
                <div class="timeline-content">
                    <h4 class="timeline-status">Pedido Criado</h4>
                    <p class="timeline-date">Em: ${new Date(pacote.data_postagem).toLocaleString('pt-BR', {day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit'})}</p>
                </div>
            </div>
        `;
        
        // 2. Itera sobre o histórico real vindo da API para os status seguintes
        if (pacote.historico && pacote.historico.length > 0) {
            pacote.historico.forEach(evento => {
                const eventDate = new Date(evento.data_atualizacao).toLocaleString('pt-BR', {
                    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                });
                // CORRIGIDO: usa o status para gerar o nome do ícone
                const iconName = evento.status_novo.toLowerCase().replace(/ /g, '-');

                timelineHtml += `
                    <div class="timeline-item completed">
                        <div class="timeline-icon">
                            <img src="/images/icon-${iconName}.png" alt="${evento.status_novo}">
                        </div>
                        <div class="timeline-content">
                            <h4 class="timeline-status">${evento.status_novo}</h4>
                            <p class="timeline-date">Em: ${eventDate}</p>
                            ${evento.observacao ? `<p class="timeline-obs">Obs: ${evento.observacao}</p>` : ''}
                        </div>
                    </div>
                `;
            });
        }
        timelineHtml += '</div>';
        
        // Lógica da Prova de Entrega (sem mudanças)
        let proofImageHtml = '';
        if (pacote.status === 'Entregue' && pacote.prova_entrega_url) {
            proofImageHtml = `
                <div class="proof-of-delivery">
                    <h3>Prova de Entrega</h3>
                    <a href="${pacote.prova_entrega_url}" target="_blank" title="Clique para ampliar a imagem">
                        <img src="${pacote.prova_entrega_url}" alt="Foto da prova de entrega">
                    </a>
                </div>
            `;
        }

        resultsContainer.innerHTML = detailsHtml + timelineHtml + proofImageHtml;
    }

    checkUrlForTrackingCode();
});