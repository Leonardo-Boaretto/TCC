console.log('=== Script de avaliações carregado ===');

if (typeof window.graficoAvaliacoesGlobal === 'undefined') {
    window.graficoAvaliacoesGlobal = null;
}
if (typeof window.medicosGlobal === 'undefined') {
    window.medicosGlobal = [];
}

let graficoAvaliacoes = window.graficoAvaliacoesGlobal;
let medicos = window.medicosGlobal;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado, verificando elementos...');
    
    // Verificar se esta na página de relatórios com a aba de avaliações
    const avaliacoesTab = document.getElementById('avaliacoes-tab');
    const avaliacoesPane = document.getElementById('avaliacoes');
    
    console.log('Elementos encontrados:', {
        avaliacoesTab: !!avaliacoesTab,
        avaliacoesPane: !!avaliacoesPane
    });
    
    if (!avaliacoesTab || !avaliacoesPane) {
        console.warn('Elementos da aba de avaliações não encontrados');
        return;
    }
    
    // Verificar se o Chart.js está disponível
    if (typeof Chart === 'undefined') {
        console.error('Chart.js não está disponível');
        return;
    }
    
    // Adicionar evento para quando a aba for mostrada
    console.log('Configurando eventos de abas...');
    
    /**
     * Limpa os recursos do gráfico quando a aba é fechada
     * @returns {void}
     */
    function limparGraficoAvaliacoes() {
        console.log('Limpando recursos do gráfico de avaliações...');
        
        try {
            // Limpar o canvas
            const canvas = document.getElementById('graficoAvaliacoes');
            if (canvas) {
                if (canvas._resizeObserver) {
                    console.log('Removendo observador de redimensionamento...');
                    try {
                        canvas._resizeObserver.disconnect();
                    } catch (e) {
                        console.warn('Erro ao desconectar observador de redimensionamento:', e);
                    }
                    delete canvas._resizeObserver;
                }
                
                // Limpar o canvas
                try {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                    }
                } catch (e) {
                    console.warn('Erro ao limpar o canvas:', e);
                }
            }
            
            if (window.graficoAvaliacoesGlobal) {
                console.log('Destruindo instância do gráfico...');
                try {
                    if (window.graficoAvaliacoesGlobal.canvas) {
                        try {
                            const newCanvas = document.createElement('canvas');
                            window.graficoAvaliacoesGlobal.canvas.parentNode.replaceChild(newCanvas, window.graficoAvaliacoesGlobal.canvas);
                        } catch (e) {
                            console.warn('Erro ao substituir o canvas:', e);
                        }
                    }
                    
                    window.graficoAvaliacoesGlobal.destroy();
                } catch (e) {
                    console.warn('Erro ao destruir o gráfico:', e);
                } finally {
                    window.graficoAvaliacoesGlobal = null;
                }
            }
            
            // Forçar coleta de lixo 
            try {
                if (window.gc) {
                    window.gc();
                } else if (window.CollectGarbage) {
                    window.CollectGarbage();
                }
            } catch (e) {
                console.warn('Erro ao forçar coleta de lixo:', e);
            }
            
        } catch (error) {
            console.error('Erro durante a limpeza do gráfico:', error);
        }
    }

    /**
     * Inicializa a aba de avaliações e configura o gráfico
     * @returns {Promise<void>}
     */
    async function inicializarAbaAvaliacoes() {
        console.log('=== Inicializando aba de avaliações ===');
        
        try {
            // Verificar se esta na página de relatórios
            const avaliacoesPane = document.getElementById('avaliacoes');
            if (!avaliacoesPane) {
                console.warn('Aba de avaliações não encontrada na página atual');
                return;
            }
            
            // Verificar se o container do gráfico existe
            const container = avaliacoesPane.querySelector('.chart-container');
            if (!container) {
                console.error('Container do gráfico não encontrado');
                return;
            }
            
            // Limpar conteúdo anterior se existir
            container.innerHTML = '';
            
            // Criar wrapper para o gráfico
            const wrapper = document.createElement('div');
            wrapper.className = 'chart-wrapper';
            wrapper.style.position = 'relative';
            wrapper.style.height = '400px';
            wrapper.style.width = '100%';
            
            // Criar canvas para o gráfico
            const canvas = document.createElement('canvas');
            canvas.id = 'graficoAvaliacoes';
            canvas.setAttribute('aria-label', 'Gráfico de avaliações');
            canvas.setAttribute('role', 'img');
            
            // Adicionar mensagem de carregamento
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'chart-loading';
            loadingDiv.style.display = 'none';
            loadingDiv.style.position = 'absolute';
            loadingDiv.style.top = '0';
            loadingDiv.style.left = '0';
            loadingDiv.style.right = '0';
            loadingDiv.style.bottom = '0';
            loadingDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            loadingDiv.style.display = 'flex';
            loadingDiv.style.justifyContent = 'center';
            loadingDiv.style.alignItems = 'center';
            loadingDiv.style.zIndex = '10';
            loadingDiv.innerHTML = `
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Carregando...</span>
                </div>
                <span class="ms-2">Carregando dados do gráfico...</span>
            `;
            
            // Montar a estrutura do DOM
            wrapper.appendChild(canvas);
            wrapper.appendChild(loadingDiv);
            container.appendChild(wrapper);
            
            try {
                // Mostrar indicador de carregamento
                loadingDiv.style.display = 'flex';
                
                // Inicializar o gráfico
                await initAvaliacoes();
                
            } catch (error) {
                console.error('Erro ao inicializar o gráfico:', error);
                
                // Mostrar mensagem de erro
                container.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Ocorreu um erro ao carregar o gráfico de avaliações.
                        <button class="btn btn-sm btn-outline-danger ms-2" onclick="inicializarAbaAvaliacoes()">
                            <i class="bi bi-arrow-clockwise"></i> Tentar novamente
                        </button>
                    </div>
                `;
                
                throw error;
            } finally {
                // Esconder indicador de carregamento
                if (loadingDiv.parentNode) {
                    loadingDiv.style.display = 'none';
                }
            }
            
        } catch (error) {
            console.error('Erro na inicialização da aba de avaliações:', error);
            throw error;
        }
    }
    
    // Função para lidar com a mudança de aba
    function handleTabChange(e) {
        try {
            if (!e.target) {
                console.warn('Evento de mudança de aba sem alvo');
                return;
            }
            
            const targetTab = e.target.getAttribute('href');
            console.log('Mudando para a aba:', targetTab);
            
            // Limpar gráfico ao sair da aba de avaliações
            if (e.relatedTarget && e.relatedTarget.getAttribute('href') === '#avaliacoes') {
                console.log('Saindo da aba de avaliações, limpando recursos...');
                limparGraficoAvaliacoes();
            }
            
            if (targetTab === '#avaliacoes') {
                console.log('Aba de avaliações ativada, inicializando...');
                //  garantir que a transição da aba foi concluída
                setTimeout(() => {
                    try {
                        inicializarAbaAvaliacoes();
                    } catch (error) {
                        console.error('Erro ao inicializar a aba de avaliações:', error);
                        mostrarMensagem('Erro ao carregar o gráfico de avaliações', 'danger');
                    }
                }, 100);
            }
        } catch (error) {
            console.error('Erro no manipulador de mudança de aba:', error);
        }
    }
    
    // Adicionar evento para todas as abas
    function setupTabListeners() {
        const tabs = document.querySelectorAll('[data-bs-toggle="tab"]');
        tabs.forEach(tab => {
     
            tab.removeEventListener('shown.bs.tab', handleTabChange);
            tab.removeEventListener('hidden.bs.tab', handleTabChange);
            
            tab.addEventListener('shown.bs.tab', handleTabChange);
            
            tab.addEventListener('hidden.bs.tab', function(e) {
                const hiddenTab = e.target.getAttribute('href');
                if (hiddenTab === '#avaliacoes') {
                    console.log('Aba de avaliações ocultada, limpando recursos...');
                    limparGraficoAvaliacoes();
                }
            });
        });
    }
    
    // Configurar os listeners iniciais
    let tabObserver = null;
    
    function setupTabObserver() {
        // Limpar observer anterior 
        if (tabObserver) {
            tabObserver.disconnect();
        }
        
        // Configurar MutationObserver para detectar mudanças no DOM que possam afetar as abas
        tabObserver = new MutationObserver((mutations) => {
            try {
                const needsUpdate = mutations.some(mutation => {
                    return mutation.type === 'childList' && 
                           Array.from(mutation.addedNodes).some(node => 
                               node.nodeType === 1 && node.matches('[data-bs-toggle="tab"]')
                           );
                });
                
                if (needsUpdate) {
                    console.log('Mudanças no DOM detectadas, atualizando listeners de abas...');
                    setupTabListeners();
                }
            } catch (error) {
                console.error('Erro ao processar mutações do DOM:', error);
            }
        });
        
        // Iniciar a observação do DOM
        try {
            tabObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        } catch (error) {
            console.error('Erro ao configurar o MutationObserver:', error);
        }
    }
    
    // Configurar os listeners iniciais
    setupTabListeners();
    setupTabObserver();
    
    // Limpar recursos quando a página for descarregada
    const cleanup = () => {
        try {
            // Limpar observer
            if (tabObserver) {
                tabObserver.disconnect();
                tabObserver = null;
            }
            
            // Limpar gráfico
            limparGraficoAvaliacoes();
            
            // Remover event listeners globais
            window.removeEventListener('beforeunload', cleanup);
            window.removeEventListener('unload', cleanup);
            window.removeEventListener('pagehide', cleanup);
        } catch (error) {
            console.error('Erro durante a limpeza dos recursos:', error);
        }
    };
    
    // Adicionar listeners para limpeza
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('unload', cleanup);
    window.addEventListener('pagehide', cleanup);
    
    // Adicionar evento de clique direto na aba
    avaliacoesTab.addEventListener('click', function() {
        console.log('Clique na aba de avaliações detectado');
        // Forçar a inicialização após um pequeno atraso
        setTimeout(inicializarAbaAvaliacoes, 100);
    });
    
    // Se a aba já estiver ativa ao carregar a página
    if (avaliacoesTab.classList.contains('active')) {
        console.log('Aba de avaliações já está ativa, inicializando...');
        // Pequeno atraso para garantir que o DOM esteja pronto
        setTimeout(inicializarAbaAvaliacoes, 300);
    } else {
        console.log('Aba de avaliações não está ativa no carregamento');
    }
});

// Função para inicializar o gráfico
async function initAvaliacoes() {
    console.log('=== Inicializando aba de avaliações ===');
    
    try {
        // Verificar se o container existe
        const container = document.querySelector('#avaliacoes .chart-container');
        if (!container) {
            console.error('Container do gráfico não encontrado');
            mostrarMensagem('Erro: Container do gráfico não encontrado', 'danger');
            return;
        }
        
        // Mostrar indicador de carregamento
        container.innerHTML = `
            <div class="d-flex justify-content-center align-items-center" style="height: 400px;">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Carregando...</span>
                </div>
                <span class="ms-3">Inicializando avaliações...</span>
            </div>`;
        
       
        console.log('Carregando lista de médicos...');
        try {
            await carregarMedicos();
            console.log('Lista de médicos carregada com sucesso');
        } catch (error) {
            console.error('Erro ao carregar médicos:', error);
            mostrarMensagem('Erro ao carregar a lista de médicos', 'danger');
            
        }
        
        
        console.log('Configurando eventos dos filtros...');
        const filtroAno = document.getElementById('filtroAnoAvaliacao');
        const filtroMedico = document.getElementById('filtroMedico');
        const btnAtualizar = document.getElementById('btnAtualizarAvaliacoes');
        
       
        if (filtroAno && !filtroAno.value) {
            const anoAtual = new Date().getFullYear();
            filtroAno.value = anoAtual;
            console.log(`Ano definido para o atual: ${anoAtual}`);
        }
        
       
        if (filtroAno) {
            
            const novoFiltroAno = filtroAno.cloneNode(true);
            filtroAno.parentNode.replaceChild(novoFiltroAno, filtroAno);
            
            novoFiltroAno.addEventListener('change', () => {
                console.log('Ano alterado para:', novoFiltroAno.value);
                carregarDadosAvaliacoes();
            });
        } else {
            console.error('Elemento filtroAnoAvaliacao não encontrado');
            mostrarMensagem('Aviso: Filtro de ano não encontrado', 'warning');
        }
        
        // Configurar evento de alteração do médico
        if (filtroMedico) {
            const novoFiltroMedico = filtroMedico.cloneNode(true);
            filtroMedico.parentNode.replaceChild(novoFiltroMedico, filtroMedico);
            
            novoFiltroMedico.addEventListener('change', () => {
                console.log('Médico alterado para:', novoFiltroMedico.value);
                carregarDadosAvaliacoes();
            });
        } else {
            console.error('Elemento filtroMedico não encontrado');
            mostrarMensagem('Aviso: Filtro de médico não encontrado', 'warning');
        }
        
        // Configurar botão de atualizar
        if (btnAtualizar) {
            
            const novoBtnAtualizar = btnAtualizar.cloneNode(true);
            btnAtualizar.parentNode.replaceChild(novoBtnAtualizar, btnAtualizar);
            
            novoBtnAtualizar.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Atualizando manualmente os dados...');
                carregarDadosAvaliacoes();
            });
        }
        
        //  Carregar dados iniciais
        console.log('Carregando dados iniciais...');
        await carregarDadosAvaliacoes();
        
        console.log('=== Inicialização da aba de avaliações concluída com sucesso ===');
        
    } catch (error) {
        console.error('Erro durante a inicialização da aba de avaliações:', error);
        mostrarMensagem('Erro ao inicializar a aba de avaliações: ' + (error.message || 'Erro desconhecido'), 'danger');
        

        const container = document.querySelector('#avaliacoes .chart-container');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Ocorreu um erro ao carregar as avaliações. 
                    <button class="btn btn-sm btn-outline-danger ms-2" onclick="carregarDadosAvaliacoes()">
                        Tentar novamente
                    </button>
                </div>`;
        }
    }
}

async function carregarMedicos() {
    try {
        console.log('Buscando lista de médicos...');
        const response = await fetch('/api/medicos');
        if (!response.ok) {
            throw new Error(`Erro ao carregar médicos: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Dados dos médicos recebidos:', data);
        
        medicos = data.medicos || data || []; 
        
        // Preencher dropdown de médicos
        const selectMedico = document.getElementById('filtroMedico');
        if (!selectMedico) {
            console.error('Elemento selectMedico não encontrado');
            return;
        }
        
        selectMedico.innerHTML = '<option value="todos">Todos os Médicos</option>';
        
        if (medicos.length === 0) {
            console.warn('Nenhum médico encontrado');
            return;
        }
        
        medicos.forEach(medico => {
            const option = document.createElement('option');
            option.value = medico.id || medico._id || '';
            option.textContent = medico.nome || 'Médico sem nome';
            selectMedico.appendChild(option);
        });
        
        console.log(`Carregados ${medicos.length} médicos`);
        
        // Atualizar a referência global
        window.medicosGlobal = medicos;
    } catch (error) {
        console.error('Erro ao carregar médicos:', error);
        mostrarMensagem('Erro ao carregar a lista de médicos: ' + error.message, 'danger');
    }
}

/**
 * Atualiza as métricas exibidas na interface
 * @param {Object} metricas - Objeto contendo as métricas a serem exibidas
 */
function atualizarMetricas(metricas) {
    try {
        console.log('Atualizando métricas com:', metricas);
        
        const formatarNumero = (valor) => {
            if (valor === null || valor === undefined) return '0.0';
            const num = parseFloat(valor);
            return isNaN(num) ? '0.0' : num.toFixed(1);
        };
        
        // Atualizar média geral
        const mediaGeralElement = document.getElementById('media-geral');
        if (mediaGeralElement) {
            const mediaGeral = metricas.media_geral !== undefined ? metricas.media_geral : 
                             (metricas.mediaGeral !== undefined ? metricas.mediaGeral : null);
            mediaGeralElement.textContent = formatarNumero(mediaGeral);
        }
        
        // Atualizar total de avaliações
        const totalAvaliacoesElement = document.getElementById('total-avaliacoes');
        if (totalAvaliacoesElement) {
            const totalAvaliacoes = metricas.total_avaliacoes !== undefined ? metricas.total_avaliacoes : 
                                  (metricas.totalAvaliacoes !== undefined ? metricas.totalAvaliacoes : 0);
            totalAvaliacoesElement.textContent = totalAvaliacoes.toString();
        }
        
        // Atualizar melhor mês
        const melhorMesElement = document.getElementById('melhor-mes');
        if (melhorMesElement) {
            const melhorMes = metricas.melhor_mes || metricas.melhorMes;
            
            if (melhorMes && melhorMes.mes) {
                try {
                    const data = new Date();
                    const mes = parseInt(melhorMes.mes, 10);
                    if (!isNaN(mes) && mes >= 1 && mes <= 12) {
                        data.setMonth(mes - 1);
                        const nomeMes = data.toLocaleString('pt-BR', { month: 'long' });
                        const media = melhorMes.media ? parseFloat(melhorMes.media).toFixed(1) : '0.0';
                        melhorMesElement.textContent = `${nomeMes} (${media})`;
                        return;
                    }
                } catch (e) {
                    console.warn('Erro ao formatar melhor mês:', e);
                }
            }
            
            melhorMesElement.textContent = 'N/A';
        }
        
    } catch (error) {
        console.error('Erro ao atualizar métricas:', error);
        
        const mediaGeralElement = document.getElementById('media-geral');
        const totalAvaliacoesElement = document.getElementById('total-avaliacoes');
        const melhorMesElement = document.getElementById('melhor-mes');
        
        if (mediaGeralElement) mediaGeralElement.textContent = '0.0';
        if (totalAvaliacoesElement) totalAvaliacoesElement.textContent = '0';
        if (melhorMesElement) melhorMesElement.textContent = 'N/A';
    }
}

/**
 * Carrega os dados das avaliações com base nos filtros atuais
 * @returns {Promise<void>}
 */
async function carregarDadosAvaliacoes() {
    console.log('=== Iniciando carregamento de dados de avaliações ===');
    
    // Obter elementos dos filtros
    const filtroAno = document.getElementById('filtroAnoAvaliacao');
    const filtroMedico = document.getElementById('filtroMedico');
    const container = document.querySelector('#avaliacoes .chart-container');
    const btnAtualizar = document.getElementById('btnAtualizarAvaliacoes');
    let loadingDiv = null;
    
    try {
        // Verificar elementos necessários
        if (!filtroAno || !filtroMedico) {
            const errorMsg = 'Elementos de filtro não encontrados';
            console.error(errorMsg);
            mostrarMensagem('Erro: ' + errorMsg, 'danger');
            return;
        }
        
        if (!container) {
            console.error('Container do gráfico não encontrado');
            return;
        }
    
        // Obter valores dos filtros
        const ano = filtroAno.value || new Date().getFullYear();
        const medicoId = filtroMedico.value || 'todos';
        
        console.log(`Aplicando filtros - Ano: ${ano}, Médico ID: ${medicoId}`);
        
        // Atualizar estado do botão de atualizar
        if (btnAtualizar) {
            btnAtualizar.disabled = true;
            btnAtualizar.innerHTML = `
                <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                Carregando...`;
        }
        
        // Mostrar indicador de carregamento
        container.innerHTML = `
            <div class="d-flex flex-column justify-content-center align-items-center" style="height: 400px;">
                <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;">
                    <span class="visually-hidden">Carregando...</span>
                </div>
                <h5 class="text-muted">Carregando dados das avaliações</h5>
                <p class="text-muted mb-0">Aguarde enquanto buscamos as informações...</p>
            </div>`;
        
        // Construir URL da API com timestamp para evitar cache
        const timestamp = new Date().getTime();
        let url = `/api/avaliacoes/relatorio?ano=${ano}&_t=${timestamp}`;
        
        if (medicoId && medicoId !== 'todos') {
            url += `&medico_id=${encodeURIComponent(medicoId)}`;
        }
        
        console.log('Solicitando dados da API:', url);
        
        // Adicionar timeout para a requisição
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos de timeout
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId); // Limpar o timeout
        
        // Verificar status da resposta
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Sem detalhes adicionais');
            console.error('Erro na resposta da API:', response.status, errorText);
            
            let mensagemErro = `Erro ao carregar os dados (${response.status})`;
            
            if (response.status === 401) {
                mensagemErro = 'Sessão expirada. Por favor, faça login novamente.';
            } else if (response.status === 404) {
                mensagemErro = 'Nenhum dado encontrado para os critérios selecionados.';
            } else if (response.status >= 500) {
                mensagemErro = 'Erro no servidor. Tente novamente mais tarde.';
            }
            
            throw new Error(mensagemErro);
        }
        
        // Processar resposta JSON
        console.log('Resposta recebida, processando JSON...');
        const data = await response.json().catch(error => {
            console.error('Erro ao processar JSON da resposta:', error);
            throw new Error('Formato de resposta inválido da API');
        });
        
        console.log('Dados recebidos da API:', data);
        
        // Verificar se existem dados para exibir
        if (!data || (Array.isArray(data.dados) && data.dados.length === 0)) {
            console.warn('Nenhum dado disponível para os filtros selecionados');
            
            // Limpar gráfico existente
            if (window.graficoAvaliacoesGlobal) {
                try {
                    window.graficoAvaliacoesGlobal.destroy();
                } catch (e) {
                    console.warn('Erro ao destruir gráfico existente:', e);
                }
                window.graficoAvaliacoesGlobal = null;
            }
            
            // Obter valores atuais dos filtros para mensagem personalizada
            const anoAtual = document.getElementById('filtroAnoAvaliacao')?.value || new Date().getFullYear();
            const medicoSelecionado = document.getElementById('filtroMedico');
            const nomeMedico = medicoSelecionado?.options[medicoSelecionado?.selectedIndex]?.text || 'o médico selecionado';
            
            // Mostrar mensagem informativa
            container.innerHTML = `
                <div class="d-flex flex-column justify-content-center align-items-center text-center p-5" style="min-height: 400px;">
                    <div class="mb-4">
                        <i class="bi bi-graph-up text-muted" style="font-size: 3rem; opacity: 0.5;"></i>
                    </div>
                    <h4 class="text-muted mb-3">Nenhum dado encontrado</h4>
                    <p class="text-muted mb-4">
                        Não foram encontradas avaliações para ${nomeMedico} no ano de ${anoAtual}.
                    </p>
                    <div class="d-flex gap-3">
                        <button class="btn btn-primary" onclick="carregarDadosAvaliacoes()">
                            <i class="bi bi-arrow-repeat me-2"></i>Tentar novamente
                        </button>
                        <button class="btn btn-outline-secondary" onclick="document.getElementById('filtroAnoAvaliacao').value = new Date().getFullYear(); carregarDadosAvaliacoes()">
                            <i class="bi bi-calendar2-check me-2"></i>Ver ano atual
                        </button>
                    </div>
                </div>`;
                
            // Atualizar métricas com valores zerados
            atualizarMetricas({
                media_geral: 0,
                total_avaliacoes: 0,
                melhor_mes: { mes: null, media: 0 }
            });
            
            return;
        }
        
        // Limpar conteúdo atual do container
        container.innerHTML = '';
        
        // Criar wrapper para o gráfico
        const chartWrapper = document.createElement('div');
        chartWrapper.className = 'chart-wrapper';
        chartWrapper.style.position = 'relative';
        chartWrapper.style.height = '400px';
        chartWrapper.style.width = '100%';
        
        // Criar canvas para o gráfico
        const canvas = document.createElement('canvas');
        canvas.id = 'graficoAvaliacoes';
        canvas.setAttribute('aria-label', 'Gráfico de avaliações');
        canvas.setAttribute('role', 'img');
        
        // Adicionar mensagem de carregamento
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chart-loading';
        loadingDiv.style.display = 'none';
        loadingDiv.style.position = 'absolute';
        loadingDiv.style.top = '0';
        loadingDiv.style.left = '0';
        loadingDiv.style.right = '0';
        loadingDiv.style.bottom = '0';
        loadingDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        loadingDiv.style.display = 'flex';
        loadingDiv.style.justifyContent = 'center';
        loadingDiv.style.alignItems = 'center';
        loadingDiv.style.zIndex = '10';
        loadingDiv.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Carregando...</span>
            </div>
            <span class="ms-2">Carregando dados do gráfico...</span>
        `;
        
        // Montar a estrutura do DOM
        chartWrapper.appendChild(canvas);
        chartWrapper.appendChild(loadingDiv);
        container.appendChild(chartWrapper);
        
        // Limpar gráfico existente se houver
        if (window.graficoAvaliacoesGlobal) {
            try {
                window.graficoAvaliacoesGlobal.destroy();
            } catch (e) {
                console.warn('Erro ao destruir gráfico existente:', e);
            }
            window.graficoAvaliacoesGlobal = null;
        }
        
        // Atualizar métricas se disponíveis
        if (data.metricas) {
            console.log('Atualizando métricas com dados:', data.metricas);
            atualizarMetricas(data.metricas);
        } else {
            console.warn('Nenhuma métrica fornecida na resposta');
            // Atualizar métricas com valores vazios
            atualizarMetricas({
                media_geral: 0,
                total_avaliacoes: 0,
                melhor_mes: { mes: null, media: 0 }
            });
        }
        
        // Renderizar gráfico com os dados
        console.log('Iniciando renderização do gráfico...');
        try {
            // Mostrar indicador de carregamento
            loadingDiv.style.display = 'flex';
            
            // Pequeno atraso para garantir que o DOM foi atualizado
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Renderizar o gráfico
            renderizarGraficoAvaliacoes(data.dados || []);
            
        } catch (error) {
            console.error('Erro ao renderizar o gráfico:', error);
            
            // Mostrar mensagem de erro no container
            if (container) {
                container.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Ocorreu um erro ao renderizar o gráfico. Tente novamente.
                        <button class="btn btn-sm btn-outline-danger ms-2" onclick="carregarDadosAvaliacoes()">
                            <i class="bi bi-arrow-clockwise"></i> Tentar novamente
                        </button>
                    </div>`;
            }
            
            throw new Error('Falha ao renderizar o gráfico: ' + (error.message || 'Erro desconhecido'));
            
        } finally {
            // Esconder indicador de carregamento
            if (loadingDiv && loadingDiv.parentNode) {
                loadingDiv.style.display = 'none';
            }
            
            // Restaurar estado do botão de atualizar
            if (btnAtualizar) {
                btnAtualizar.disabled = false;
                btnAtualizar.innerHTML = `
                    <i class="bi bi-arrow-clockwise me-1"></i>
                    Atualizar Dados`;
            }
        }
    } catch (error) {
        console.error('Erro inesperado em carregarDadosAvaliacoes:', error);
        mostrarMensagem('Ocorreu um erro inesperado ao carregar os dados: ' + (error.message || 'Erro desconhecido'), 'danger');
        
        // Mostrar mensagem de erro no container
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Ocorreu um erro inesperado. Por favor, tente novamente.
                    <button class="btn btn-sm btn-outline-danger ms-2" onclick="carregarDadosAvaliacoes()">
                        <i class="bi bi-arrow-clockwise"></i> Tentar novamente
                    </button>
                </div>`;
        }
    }
}

// ...

/**
 * Renderiza o gráfico de avaliações com os dados fornecidos
 * @param {Array} dados - Array de objetos contendo os dados mensais das avaliações
 */
function renderizarGraficoAvaliacoes(dados) {
    console.log('=== Iniciando renderização do gráfico ===');
    console.log('Dados recebidos para renderização:', dados);
    
    // Verificar se o Chart.js está disponível
    if (typeof Chart === 'undefined') {
        const errorMsg = 'Biblioteca de gráficos (Chart.js) não foi carregada corretamente';
        console.error(errorMsg);
        mostrarMensagem('Erro: ' + errorMsg, 'danger');
        return;
    }
    
    console.log('Chart.js está disponível');
    
    // Obter o container do gráfico
    const container = document.querySelector('#avaliacoes .chart-container');
    if (!container) {
        console.error('Container do gráfico não encontrado');
        mostrarMensagem('Erro: Container do gráfico não encontrado', 'danger');
        return;
    }
    
    // Verificar se existem dados para exibir
    if (!Array.isArray(dados) || dados.length === 0) {
        console.warn('Nenhum dado fornecido para renderização do gráfico');
        container.innerHTML = `
            <div class="alert alert-warning m-4">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                Nenhum dado disponível para exibição no gráfico.
            </div>`;
        return;
    }
    
    try {
        // Criar ou limpar o container do gráfico
        container.innerHTML = `
            <div class="chart-wrapper position-relative" style="height: 400px; width: 100%;">
                <canvas id="graficoAvaliacoes"></canvas>
            </div>
            <div class="chart-legend mt-3 text-center" id="legendaGrafico"></div>`;
        
        // Obter referência ao canvas
        const canvas = document.getElementById('graficoAvaliacoes');
        if (!canvas) {
            throw new Error('Elemento canvas não foi criado corretamente');
        }
        
        // Obter contexto 2D
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Não foi possível obter o contexto 2D do canvas');
        }
        
        console.log('Contexto 2D obtido com sucesso');
        
        // Verificar se já existe um gráfico e destruí-lo
        if (window.graficoAvaliacoesGlobal) {
            console.log('Destruindo gráfico existente...');
            try {
                window.graficoAvaliacoesGlobal.destroy();
            } catch (e) {
                console.warn('Erro ao destruir gráfico existente:', e);
            } finally {
                window.graficoAvaliacoesGlobal = null;
            }
        }
    
        // Preparar dados para o gráfico
        console.log('Preparando dados para o gráfico...');
        const meses = Array.from({length: 12}, (_, i) => obterNomeMes(i + 1).substring(0, 3));
        const medias = Array(12).fill(null);
        const contagens = Array(12).fill(0);
        let totalAvaliacoes = 0;
        let somaMedias = 0;
        let mesesComDados = 0;
        
        // Processar os dados da API
        if (Array.isArray(dados) && dados.length > 0) {
            dados.forEach(item => {
                if (item.mes >= 1 && item.mes <= 12) {
                    const index = item.mes - 1; 
                    const media = parseFloat(item.media) || 0;
                    const total = parseInt(item.total) || 0;
                    
                    medias[index] = media;
                    contagens[index] = total;
                    
                    // Calcular totais para métricas
                    if (total > 0) {
                        totalAvaliacoes += total;
                        somaMedias += media * total;
                        mesesComDados++;
                    }
                }
            });
        }
        
        // Calcular média geral
        const mediaGeral = mesesComDados > 0 ? (somaMedias / totalAvaliacoes).toFixed(1) : 0;
        
        // Atualizar métricas se necessário
        const elementoMediaGeral = document.getElementById('mediaGeral');
        if (elementoMediaGeral && !isNaN(mediaGeral)) {
            elementoMediaGeral.textContent = mediaGeral;
        }
        
        // Configuração do gráfico
        console.log('Configurando opções do gráfico...');
        const config = {
            type: 'line',
            data: {
                labels: meses,
                datasets: [
                    // Linha para a média das avaliações
                    {
                        label: 'Média das Avaliações',
                        data: medias,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        borderWidth: 2,
                        pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                        pointBorderColor: '#fff',
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgba(75, 192, 192, 1)',
                        pointHoverBorderWidth: 2,
                        pointHitRadius: 10,
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        fill: true,
                        tension: 0.3,
                        yAxisID: 'y',
                        order: 2
                    },
                    // Barras para o número de avaliações
                    {
                        label: 'Número de Avaliações',
                        data: contagens,
                        type: 'bar',
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                        yAxisID: 'y1',
                        order: 1
                    },
                    // Linha de referência para a média geral
                    {
                        label: 'Média Geral',
                        data: Array(12).fill(mediaGeral),
                        borderColor: 'rgba(255, 99, 132, 0.8)',
                        borderWidth: 1.5,
                        borderDash: [5, 5],
                        borderCapStyle: 'round',
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        fill: false,
                        yAxisID: 'y',
                        order: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                backgroundColor: 'white',
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        titleFont: {
                            size: 14,
                            weight: 'bold',
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        bodyFont: {
                            size: 13,
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        padding: 12,
                        cornerRadius: 6,
                        displayColors: true,
                        usePointStyle: true,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    if (label === 'Média Geral') {
                                        return `Referência: ${context.parsed.y.toFixed(1)}`;
                                    }
                                    return `${label}: ${context.parsed.y}`;
                                }
                                return null;
                            },
                            afterLabel: function(context) {
                                if (context.dataset.label === 'Média das Avaliações') {
                                    return `Nota: ${context.parsed.y.toFixed(1)}`;
                                } else if (context.dataset.label === 'Número de Avaliações') {
                                    return `Total: ${context.parsed.y}`;
                                }
                                return null;
                            },
                            labelColor: function(context) {
                                return {
                                    borderColor: context.dataset.borderColor || '#666',
                                    backgroundColor: context.dataset.borderColor || '#666',
                                    borderWidth: 2,
                                    borderRadius: 2
                                };
                            }
                        }
                    },
                    legend: {
                        position: 'bottom',
                        align: 'center',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 13,
                                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                            },
                            generateLabels: (chart) => {
                                return chart.data.datasets
                                    .filter(dataset => dataset.label !== 'Média Geral')
                                    .map((dataset, i) => ({
                                        text: dataset.label,
                                        fillStyle: dataset.backgroundColor || '#ccc',
                                        strokeStyle: dataset.borderColor || '#666',
                                        lineWidth: 1,
                                        hidden: !chart.isDatasetVisible(i),
                                        lineCap: 'round',
                                        lineDash: dataset.borderDash || [],
                                        pointStyle: 'circle',
                                        datasetIndex: i
                                    }));
                            }
                        },
                        onClick: (e, legendItem, legend) => {
                            const index = legendItem.datasetIndex;
                            const ci = legend.chart;
                            
                            if (ci.isDatasetVisible(index)) {
                                ci.hide(index);
                                legendItem.hidden = true;
                            } else {
                                ci.show(index);
                                legendItem.hidden = false;
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Desempenho das Avaliações por Mês',
                        font: {
                            size: 16,
                            weight: 'bold',
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        },
                        color: '#333'
                    },
                    subtitle: {
                        display: true,
                        text: 'Média das avaliações e volume por mês',
                        font: {
                            size: 13,
                            style: 'italic',
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        padding: {
                            bottom: 20
                        },
                        color: '#666'
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false,
                            drawBorder: true,
                            drawOnChartArea: false,
                            drawTicks: true
                        },
                        ticks: {
                            font: {
                                size: 12,
                                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                            },
                            color: '#666',
                            padding: 8
                        },
                        title: {
                            display: true,
                            text: 'Meses',
                            font: {
                                size: 13,
                                weight: 'bold',
                                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                            },
                            color: '#555'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Média (1-5)',
                            font: {
                                weight: 'bold',
                                size: 12,
                                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                            },
                            color: '#555'
                        },
                        min: 0,
                        max: 5.5,
                        ticks: {
                            stepSize: 0.5,
                            precision: 1,
                            callback: function(value) {
                                return value.toFixed(1);
                            },
                            font: {
                                size: 11,
                                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                            },
                            color: '#666',
                            padding: 5
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false,
                            drawTicks: false
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Número de Avaliações',
                            font: {
                                weight: 'bold',
                                size: 12,
                                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                            },
                            color: '#555'
                        },
                        min: 0,
                        suggestedMax: Math.max(...contagens) > 0 ? Math.max(...contagens) * 1.2 : 10,
                        grid: {
                            drawOnChartArea: false,
                            drawTicks: false
                        },
                        ticks: {
                            precision: 0,
                            font: {
                                size: 11,
                                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                            },
                            color: '#666',
                            padding: 5
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart',
                    onProgress: function(animation) {
                        // Adicionar animação de progresso se necessário
                    },
                    onComplete: function() {
                        // Ações após a conclusão da animação
                        console.log('Animação do gráfico concluída');
                    }
                },
                layout: {
                    padding: {
                        left: 10,
                        right: 10,
                        top: 10,
                        bottom: 10
                    }
                },
                elements: {
                    line: {
                        tension: 0.3
                    },
                    point: {
                        radius: 4,
                        hoverRadius: 6
                    }
                },
                onHover: (event, chartElement) => {
                    // Alterar o cursor ao passar sobre elementos clicáveis
                    if (chartElement.length > 0) {
                        event.native.target.style.cursor = 'pointer';
                    } else {
                        event.native.target.style.cursor = 'default';
                    }
                },
                onClick: (event, elements) => {
                    // Lógica para manipular cliques no gráfico, se necessário
                    if (elements.length > 0) {
                        const elementIndex = elements[0].index;
                        const datasetIndex = elements[0].datasetIndex;
                        console.log(`Clicado no índice ${elementIndex} do dataset ${datasetIndex}`);
                    }
                }
            },
            plugins: [{
                id: 'customCanvasBackgroundColor',
                beforeDraw: (chart) => {
                    const {ctx} = chart;
                    ctx.save();
                    ctx.globalCompositeOperation = 'destination-over';
                    ctx.fillStyle = '#ffffff'; 
                    ctx.fillRect(0, 0, chart.width, chart.height);
                    ctx.restore();
                }
            }]
        };
        
        // Forçar tema claro para o gráfico
        config.options.scales.x.ticks.color = '#666';
        config.options.scales.y.ticks.color = '#666';
        config.options.scales.y1.ticks.color = '#666';
        config.options.scales.x.title.color = '#555';
        config.options.scales.y.title.color = '#555';
        config.options.scales.y1.title.color = '#555';
        config.options.plugins.title.color = '#333';
        config.options.plugins.subtitle.color = '#666';
        config.options.plugins.legend.labels.color = '#333';
        config.options.scales.y.grid.color = 'rgba(0, 0, 0, 0.05)';
        
        console.log('Criando novo gráfico...');
        window.graficoAvaliacoesGlobal = new Chart(ctx, config);
        console.log('Gráfico criado com sucesso!');
        
        // Configurar redimensionamento responsivo
        const updateCanvasSize = () => {
            const container = canvas.parentElement;
            if (container && window.graficoAvaliacoesGlobal) {
                try {
                    canvas.style.width = '100%';
                    canvas.style.height = '100%';
                    canvas.width = container.offsetWidth;
                    canvas.height = container.offsetHeight;
                    window.graficoAvaliacoesGlobal.resize();
                } catch (e) {
                    console.warn('Erro ao redimensionar o gráfico:', e);
                }
            }
        };
        
        // Ajustar tamanho inicial
        updateCanvasSize();
        
        // Configurar observador de redimensionamento
        if (typeof ResizeObserver !== 'undefined') {
            const resizeObserver = new ResizeObserver(updateCanvasSize);
            if (canvas.parentElement) {
                try {
                    resizeObserver.observe(canvas.parentElement);
                    // Armazenar referência para limpeza posterior
                    canvas._resizeObserver = resizeObserver;
                } catch (e) {
                    console.warn('Erro ao configurar observador de redimensionamento:', e);
                }
            }
        }
        
        return window.graficoAvaliacoesGlobal;
        
    } catch (error) {
        console.error('Erro ao criar o gráfico:', error);
        throw new Error(`Falha ao renderizar o gráfico: ${error.message}`);
    }
}

function obterNomeMes(numeroMes) {
    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[numeroMes - 1] || '';
}

function mostrarMensagem(mensagem, tipo = 'info') {
    console.log(`[${tipo.toUpperCase()}] ${mensagem}`);
    
    // Verificar se a mensagem está vazia
    if (!mensagem) return;
    
    // Mapear tipos de alerta para ícones e classes do Bootstrap
    const tipos = {
        success: { 
            icon: 'check-circle-fill',
            bg: 'success',
            text: 'text-white'
        },
        danger: { 
            icon: 'exclamation-triangle-fill',
            bg: 'danger',
            text: 'text-white'
        },
        warning: { 
            icon: 'exclamation-triangle-fill',
            bg: 'warning',
            text: 'text-dark'
        },
        info: { 
            icon: 'info-circle-fill',
            bg: 'info',
            text: 'text-white'
        },
        primary: { 
            icon: 'info-circle-fill',
            bg: 'primary',
            text: 'text-white'
        },
        secondary: { 
            icon: 'info-circle-fill',
            bg: 'secondary',
            text: 'text-white'
        }
    };
    
    // Usar 'info' como padrão se o tipo não for reconhecido
    const config = tipos[tipo] || tipos.info;
    
    try {
        // Criar elemento de mensagem
        const mensagemElement = document.createElement('div');
        mensagemElement.className = `alert alert-${config.bg} alert-dismissible fade show ${config.text} mb-3`;
        mensagemElement.role = 'alert';
        mensagemElement.style.position = 'fixed';
        mensagemElement.style.top = '20px';
        mensagemElement.style.right = '20px';
        mensagemElement.style.zIndex = '9999';
        mensagemElement.style.minWidth = '300px';
        mensagemElement.style.maxWidth = '90%';
        mensagemElement.style.boxShadow = '0 0.5rem 1rem rgba(0, 0, 0, 0.15)';
        mensagemElement.style.border = 'none';
        mensagemElement.style.borderRadius = '0.5rem';
        mensagemElement.style.overflow = 'hidden';
        
        // Adicionar conteúdo da mensagem
        mensagemElement.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi bi-${config.icon} me-2"></i>
                <div class="flex-grow-1">${mensagem}</div>
                <button type="button" class="btn-close ${config.text === 'text-dark' ? 'btn-close-dark' : ''}" data-bs-dismiss="alert" aria-label="Fechar"></button>
            </div>
        `;
        
        // Adicionar ao corpo do documento
        document.body.appendChild(mensagemElement);
        
        setTimeout(() => {
            mensagemElement.style.opacity = '1';
            mensagemElement.style.transition = 'opacity 0.3s ease-in-out';
            mensagemElement.style.opacity = '1';
        }, 10);
        
        // Configurar fechamento automático
        if (tipo !== 'danger') {
            setTimeout(() => {
                if (mensagemElement && mensagemElement.parentNode) {
                    mensagemElement.style.opacity = '0';
                    setTimeout(() => {
                        if (mensagemElement && mensagemElement.parentNode) {
                            mensagemElement.parentNode.removeChild(mensagemElement);
                        }
                    }, 300);
                }
            }, 5000);
        }
        
        // Configurar botão de fechar
        const btnFechar = mensagemElement.querySelector('.btn-close');
        if (btnFechar) {
            btnFechar.addEventListener('click', (e) => {
                e.preventDefault();
                if (mensagemElement && mensagemElement.parentNode) {
                    mensagemElement.style.opacity = '0';
                    setTimeout(() => {
                        if (mensagemElement && mensagemElement.parentNode) {
                            mensagemElement.parentNode.removeChild(mensagemElement);
                        }
                    }, 300);
                }
            });
        }
        
    } catch (error) {
        console.error('Erro ao exibir mensagem:', error);
        alert(`[${tipo.toUpperCase()}] ${mensagem}`);
    }
}