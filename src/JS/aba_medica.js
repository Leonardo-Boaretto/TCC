// Evento disparado quando o DOM é totalmente carregado
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado, iniciando carregamento de médicos...');
    
    // Carrega os dados iniciais dos médicos
    carregarMedicos();
    
    // Configura os event listeners para os botões de exportação
    document.addEventListener('click', function(event) {
        if (event.target.matches('.btn-exportar-medicos-pdf') || 
            (event.target.closest && event.target.closest('.btn-exportar-medicos-pdf'))) {
            event.preventDefault();
            exportarMedicosPDF(event.target);
        }
    });

    // Configura o evento de busca
    configurarBusca();
});

// Configura os eventos de busca
function configurarBusca() {
    const buscaInput = document.getElementById('buscaMedico');
    // Atualizei o seletor para ser mais específico
    const btnBusca = document.querySelector('#medicos .btn-buscar-medico');
    
    if (!buscaInput) {
        console.error('ERRO: Campo de busca não encontrado!');
        return;
    }
    
    // Busca ao digitar 
    let timeoutBusca;
    buscaInput.addEventListener('input', function() {
        clearTimeout(timeoutBusca);
        timeoutBusca = setTimeout(() => {
            buscarMedicosAbaMedica();
        }, 300);
    });
    
    // Busca ao pressionar Enter
    buscaInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            buscarMedicosAbaMedica();
        }
    });
    
    // Configura o botão de busca se existir
    if (btnBusca) {
        btnBusca.onclick = function(e) {
            e.preventDefault();
            buscarMedicosAbaMedica();
        };
    } else {
        console.log('Botão de busca não encontrado, usando apenas o campo de texto');
    }
}

// Variável para armazenar a lista completa de médicos
let todosOsMedicos = [];

/**
 * Função global para buscar médicos
 */
window.buscarMedicosAbaMedica = function() {
    console.log('=== INÍCIO buscarMedicosAbaMedica ===');
    
    const buscaInput = document.getElementById('buscaMedico');
    if (!buscaInput) {
        console.error('ERRO: Campo de busca não encontrado!');
        return;
    }
    
    const termo = buscaInput.value.trim();
    console.log('Termo de busca:', termo);
    
    if (!todosOsMedicos || todosOsMedicos.length === 0) {
        console.log('Carregando médicos...');
        return carregarMedicos();
    }
    
    // Filtra os médicos
    let resultados;
    
    if (!termo) {
        resultados = [...todosOsMedicos];
        console.log('Sem termo de busca, retornando todos os médicos');
    } else {
        // Filtra os médicos pelo termo
        resultados = filtrarMedicos(termo);
        console.log(`Encontrados ${resultados.length} resultados para: ${termo}`);
    }
    
    // Renderiza os resultados
    renderizarTabelaMedicos(resultados);
    console.log('=== FIM buscarMedicosAbaMedica ===');
};

/**
 * Remove acentos e normaliza o texto para busca
 */
function normalizarTexto(texto) {
    if (!texto) return '';
    return String(texto)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

/**
 * Filtra a lista de médicos com base no termo de busca
 */
function filtrarMedicos(termo) {
    if (!termo) return [...todosOsMedicos];
    
    const termoNormalizado = normalizarTexto(termo);
    
    return todosOsMedicos.filter(medico => {
        // Verifica cada campo que deve ser pesquisado
        const camposParaBusca = [
            medico.nome,
            medico.crm,
            medico.especialidade,
            medico.email,
            medico.telefone
        ];
        
        // Verifica se algum dos campos contém o termo de busca
        return camposParaBusca.some(campo => {
            if (!campo) return false;
            return normalizarTexto(campo).includes(termoNormalizado);
        });
    });
}

/**
 * Renderiza a tabela de médicos
 */
function renderizarTabelaMedicos(medicos) {
    console.log('=== INÍCIO renderizarTabelaMedicos ===');
    console.log('Médicos para renderizar:', medicos.length);
    
    const tbody = document.getElementById('tabelaMedicos');
    const totalMedicosElement = document.getElementById('totalMedicos');
    
    if (!tbody) {
        console.error('ERRO: Tabela de médicos não encontrada!');
        return;
    }
    
    // Atualiza o contador
    if (totalMedicosElement) {
        totalMedicosElement.textContent = medicos.length;
    }
    
    // Limpa a tabela
    tbody.innerHTML = '';
    
    if (medicos.length === 0) {
        console.log('Nenhum médico encontrado para exibir');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5">
                    <div class="alert alert-info mb-0">
                        Nenhum médico encontrado com o termo informado.
                    </div>
                </td>
            </tr>`;
        return;
    }
    
    console.log('Renderizando', medicos.length, 'médicos na tabela');
    
    // Preenche a tabela com os médicos
    medicos.forEach((medico, index) => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onclick = () => {
            console.log('Clicou no médico:', medico.nome);
            if (typeof mostrarDetalhesMedico === 'function') {
                mostrarDetalhesMedico(medico);
            } else {
                console.error('Função mostrarDetalhesMedico não encontrada');
            }
        };
        
        tr.innerHTML = `
            <td>${medico.crm || 'N/A'}</td>
            <td>${medico.nome || 'Nome não informado'}</td>
            <td>${medico.especialidade || 'Não especificada'}</td>
            <td>${medico.telefone || 'Não informado'}</td>
            <td>${medico.email || 'Não informado'}</td>
            <td class="text-center">${medico.atendimentos_realizados || 0}</td>
        `;
        
        tbody.appendChild(tr);
        
   
        if (index < 3) {
            console.log(`Médico ${index + 1}:`, {
                nome: medico.nome,
                crm: medico.crm,
                especialidade: medico.especialidade
            });
        }
    });
    
    console.log('=== FIM renderizarTabelaMedicos ===');
}

/**
 * Carrega os médicos da API
 */
async function carregarMedicos() {
    console.log('=== INÍCIO carregarMedicos ===');
    
    const tbody = document.getElementById('tabelaMedicos');
    const containerLoading = document.getElementById('container-loading-medicos');
    
    if (!tbody) {
        console.error('ERRO: Tabela de médicos não encontrada!');
        if (containerLoading) {
            containerLoading.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i>
                    Erro: Elemento da tabela de médicos não encontrado.
                </div>`;
        }
        return;
    }
    
    try {
        // Mostra loading
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Carregando...</span>
                    </div>
                    <p class="mt-2 mb-0">Carregando médicos...</p>
                </td>
            </tr>`;
        
        console.log('Fazendo requisição para /api/relatorios/medicos...');
        
        // Adiciona timeout para a requisição
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch('/api/relatorios/medicos', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'same-origin',
            signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));
        
        console.log('Resposta recebida, status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro na resposta da API:', response.status, errorText);
            throw new Error(`Erro ao carregar médicos: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Dados recebidos da API:', data);
        
        if (!Array.isArray(data)) {
            console.error('Formato de dados inválido:', data);
            throw new Error('Formato de dados inválido retornado pelo servidor');
        }
        
        // Mapeia os dados recebidos para o formato esperado
        const medicos = data.map(medico => ({
            id: medico.id,
            nome: medico.nome,
            especialidade: medico.especialidade,
            crm: medico.crm,
            email: medico.email,
            telefone: medico.telefone,
            cpf: medico.cpf,
            cep: medico.cep,
            endereco: medico.endereco,
            numero: medico.numero,
            bairro: medico.bairro,
            cidade: medico.cidade,
            estado: medico.estado,
            complemento: medico.complemento,
            ativo: medico.ativo,
            atendimentos_realizados: medico.atendimentos_realizados || 0
        }));
        
        // Salva a lista completa e renderiza
        todosOsMedicos = medicos;
        console.log(`Total de médicos processados: ${medicos.length}`, medicos);
        
        if (medicos.length === 0) {
            console.warn('Nenhum médico encontrado nos dados');
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">
                        <div class="alert alert-info">
                            <i class="bi bi-info-circle"></i>
                            Nenhum médico encontrado.
                        </div>
                    </td>
                </tr>`;
            return;
        }
        
        // Verifica se há um termo de busca ativo
        const buscaInput = document.getElementById('buscaMedico');
        const termoBusca = buscaInput ? buscaInput.value.trim() : '';
        
        if (termoBusca) {
            console.log('Termo de busca ativo, filtrando médicos...');
            const resultados = filtrarMedicos(termoBusca);
            renderizarTabelaMedicos(resultados);
        } else {
            renderizarTabelaMedicos(medicos);
        }
        
    } catch (error) {
        console.error('Erro ao carregar médicos:', error);
        const errorMessage = error.name === 'AbortError' 
            ? 'A requisição demorou muito. Verifique sua conexão e tente novamente.'
            : error.message || 'Erro desconhecido ao carregar a lista de médicos';
        
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5">
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle"></i>
                        ${errorMessage}
                        <div class="mt-2">
                            <button class="btn btn-sm btn-outline-primary" onclick="carregarMedicos()">
                                <i class="bi bi-arrow-clockwise"></i> Tentar novamente
                            </button>
                        </div>
                    </div>
                </td>
            </tr>`;
    } finally {
        // Esconde o loading se existir
        if (containerLoading) {
            containerLoading.style.display = 'none';
        }
    }
    
    console.log('=== FIM carregarMedicos ===');
}

/**
 * Mostra os detalhes de um médico
 * @param {Object} medico - Os dados do médico
 */
function mostrarDetalhesMedico(medico) {
    console.log('Dados recebidos do médico:', medico);
    
    window.medicoAtual = medico;
    
    const modal = new bootstrap.Modal(document.getElementById('detalhesModal'));
    const titulo = document.getElementById('detalhesModalLabel');
    const corpo = document.getElementById('detalhesModalBody');
    
    // Função auxiliar para formatar dados
    const formatarCampo = (valor, padrao = 'Não informado') => {
        return valor !== null && valor !== undefined && valor !== '' ? valor : padrao;
    };
    
    // Formata a data
    const formatarData = (dataString) => {
        if (!dataString) return 'Não informada';
        try {
            const data = new Date(dataString);
            if (!isNaN(data)) {
                const dia = String(data.getDate()).padStart(2, '0');
                const mes = String(data.getMonth() + 1).padStart(2, '0');
                const ano = data.getFullYear();
                return `${dia}/${mes}/${ano}`;
            }
        } catch (e) {
            return 'Data inválida';
        }
    };
    
    // Formata o endereço completo
    const formatarEndereco = (medico) => {
        const partes = [];
        
        if (medico.endereco) partes.push(medico.endereco);
        if (medico.numero) partes.push(medico.numero);
        if (medico.complemento) partes.push(medico.complemento);
        if (medico.bairro) partes.push(medico.bairro);
        if (medico.cidade) partes.push(medico.cidade);
        if (medico.estado) partes.push(medico.estado);
        if (medico.cep) partes.push(`CEP: ${medico.cep}`);
        
        return partes.length > 0 ? partes.join(', ') : 'Endereço não informado';
    };
    
    // Formata o status
    const formatarStatus = (ativo) => {
        return ativo ? 
            '<span class="badge bg-success">Ativo</span>' : 
            '<span class="badge bg-secondary">Inativo</span>';
    };
    
    // Formata o email confirmado
    const formatarEmailConfirmado = (confirmado) => {
        return confirmado ? 
            '<span class="badge bg-success">Confirmado</span>' : 
            '<span class="badge bg-warning text-dark">Não confirmado</span>';
    };
    
    titulo.textContent = `Detalhes do Médico: ${formatarCampo(medico.nome)}`;
    
    // Cria o conteúdo do modal
    const conteudo = `
        <div class="container-fluid">
            <div class="row mb-4">
                <div class="col-md-12 text-center mb-3">
                    <div class="bg-light rounded-circle d-inline-flex align-items-center justify-content-center" style="width: 100px; height: 100px;">
                        <i class="bi bi-person-fill fs-1 text-primary"></i>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <h5 class="border-bottom pb-2 mb-3">Dados Pessoais</h5>
                    <div class="row mb-2">
                        <div class="col-md-4 fw-bold">ID:</div>
                        <div class="col-md-8">${formatarCampo(medico.id)}</div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-md-4 fw-bold">Nome:</div>
                        <div class="col-md-8">${formatarCampo(medico.nome)}</div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-md-4 fw-bold">CPF:</div>
                        <div class="col-md-8">${formatarCampo(medico.cpf)}</div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-md-4 fw-bold">Status:</div>
                        <div class="col-md-8">${formatarStatus(medico.ativo)}</div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <h5 class="border-bottom pb-2 mb-3">Informações Profissionais</h5>
                    <div class="row mb-2">
                        <div class="col-md-4 fw-bold">CRM:</div>
                        <div class="col-md-8">${formatarCampo(medico.crm)}</div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-md-4 fw-bold">Especialidade:</div>
                        <div class="col-md-8">${formatarCampo(medico.especialidade)}</div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-md-4 fw-bold">Atendimentos:</div>
                        <div class="col-md-8">${formatarCampo(medico.atendimentos_realizados, '0')}</div>
                    </div>
                </div>
            </div>
            
            <div class="row mt-4">
                <div class="col-md-6">
                    <h5 class="border-bottom pb-2 mb-3">Contato</h5>
                    <div class="row mb-2">
                        <div class="col-md-4 fw-bold">Telefone:</div>
                        <div class="col-md-8">${formatarCampo(medico.telefone)}</div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-md-4 fw-bold">E-mail:</div>
                        <div class="col-md-8">
                            ${formatarCampo(medico.email)}
                            ${medico.email_confirmado !== undefined ? formatarEmailConfirmado(medico.email_confirmado) : ''}
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <h5 class="border-bottom pb-2 mb-3">Endereço</h5>
                    <div class="mb-2">${formatarEndereco(medico)}</div>
                </div>
            </div>
            
            <div class="row mt-4">
                <div class="col-12">
                    <div class="d-flex justify-content-end">
                        <button type="button" class="btn btn-outline-primary" onclick="exportarRelatorioMedicoParaPDF()">
                            <i class="bi bi-file-earmark-pdf"></i> Exportar Relatório
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    
    corpo.innerHTML = conteudo;
    
    // Mostra o modal
    modal.show();
}

/**
 * Exporta os detalhes do médico para PDF
 * @async
 */
async function exportarRelatorioMedicoParaPDF() {
    let button;
    try {
        // Obtém os dados do médico da variável global
        const medico = window.medicoAtual;
        
        if (!medico) {
            throw new Error('Dados do médico não disponíveis para exportação');
        }
        
        // Mostra um indicador de carregamento
        button = document.querySelector('#detalhesModal .btn-outline-primary');
        const originalButtonHTML = button?.innerHTML || '';
        
        if (button) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Exportando...';
        }
        
        // Cria um novo documento PDF em modo retrato
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        // Configurações do documento
        const titulo = `Relatório do Médico: ${medico.nome || 'Não informado'}`;
        const dataAtual = new Date().toLocaleDateString('pt-BR');
        const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const margem = 15;
        const larguraPagina = doc.internal.pageSize.getWidth();
        let posicaoY = margem;
        
        // Adiciona o cabeçalho
        doc.setDrawColor(41, 128, 185);
        doc.setFillColor(41, 128, 185);
        doc.rect(0, 0, doc.internal.pageSize.width, 25, 'F');
        
        // Adiciona o título
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(titulo, doc.internal.pageSize.width / 2, 17, { align: 'center' });
        
        // Adiciona informações da clínica
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Clínica Vida & Saúde', margem, 35);
        doc.text(`Emitido em: ${dataAtual} às ${horaAtual}`, doc.internal.pageSize.width - margem, 35, { align: 'right' });
        
        // Posiciona o início das informações do médico
        posicaoY = 50;
        
        // Adiciona as informações do médico
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('DADOS PESSOAIS', margem, posicaoY);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        
        // Dados pessoais
        posicaoY += 15;
        doc.text(`Nome: ${medico.nome || 'Não informado'}`, margem, posicaoY);
        posicaoY += 7;
        doc.text(`CRM: ${medico.crm || 'Não informado'}`, margem, posicaoY);
        posicaoY += 7;
        doc.text(`CPF: ${medico.cpf || 'Não informado'}`, margem, posicaoY);
        
        // Contato
        posicaoY += 15;
        doc.setFont('helvetica', 'bold');
        doc.text('CONTATO', margem, posicaoY);
        
        doc.setFont('helvetica', 'normal');
        posicaoY += 10;
        doc.text(`Telefone: ${medico.telefone || 'Não informado'}`, margem, posicaoY);
        posicaoY += 7;
        doc.text(`E-mail: ${medico.email || 'Não informado'}`, margem, posicaoY);
        
        // Endereço
        posicaoY += 15;
        doc.setFont('helvetica', 'bold');
        doc.text('ENDEREÇO', margem, posicaoY);
        
        doc.setFont('helvetica', 'normal');
        posicaoY += 10;
        
        const endereco = [];
        if (medico.endereco) endereco.push(medico.endereco);
        if (medico.numero) endereco.push(medico.numero);
        if (medico.complemento) endereco.push(medico.complemento);
        if (medico.bairro) endereco.push(medico.bairro);
        if (medico.cidade) endereco.push(medico.cidade);
        if (medico.estado) endereco.push(medico.estado);
        if (medico.cep) endereco.push(`CEP: ${medico.cep}`);
        
        if (endereco.length > 0) {
            doc.text(endereco.join(', '), margem, posicaoY, { maxWidth: doc.internal.pageSize.width - 2 * margem });
            posicaoY += 10;
        } else {
            doc.text('Endereço não informado', margem, posicaoY);
            posicaoY += 7;
        }
        
        // Informações profissionais
        posicaoY += 10;
        doc.setFont('helvetica', 'bold');
        doc.text('INFORMAÇÕES PROFISSIONAIS', margem, posicaoY);
        
        doc.setFont('helvetica', 'normal');
        posicaoY += 10;
        doc.text(`Especialidade: ${medico.especialidade || 'Não informada'}`, margem, posicaoY);
        posicaoY += 7;
        doc.text(`Atendimentos realizados: ${medico.atendimentos_realizados || 0}`, margem, posicaoY);
        
        // Adiciona o rodapé
        const addFooter = (doc) => {
            const pageCount = doc.internal.getNumberOfPages();
            
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                
                // Linha divisória
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.3);
                doc.line(margem, doc.internal.pageSize.getHeight() - 20, doc.internal.pageSize.width - margem, doc.internal.pageSize.getHeight() - 20);
                
                // Texto do rodapé
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                
                // Número da página
                doc.text(
                    `Página ${i} de ${pageCount}`,
                    doc.internal.pageSize.width / 2,
                    doc.internal.pageSize.getHeight() - 15,
                    { align: 'center' }
                );
                
                // Data e hora
                doc.text(
                    `Gerado em ${dataAtual} às ${horaAtual}`,
                    doc.internal.pageSize.width - margem,
                    doc.internal.pageSize.getHeight() - 10,
                    { align: 'right' }
                );
                
                // Nome do sistema
                doc.text(
                    'Sistema de Gestão Médica - Relatório de Médico',
                    margem,
                    doc.internal.pageSize.getHeight() - 10,
                    { align: 'left' }
                );
            }
        };
        
        // Adiciona o rodapé a todas as páginas
        addFooter(doc);
        
        // Salva o documento
        doc.save(`relatorio_medico_${medico.id || 'sem_id'}_${new Date().toISOString().split('T')[0]}.pdf`);
        
        // Mostra mensagem de sucesso
        const toast = new bootstrap.Toast(document.getElementById('toastSucesso'));
        document.getElementById('toastMensagem').textContent = 'Relatório do médico exportado com sucesso!';
        toast.show();
        
    } catch (error) {
        console.error('Erro ao exportar relatório do médico:', error);
        
        // Mostra mensagem de erro
        const toast = new bootstrap.Toast(document.getElementById('toastErro'));
        document.getElementById('toastMensagemErro').textContent = 
            `Erro ao exportar relatório: ${error.message || 'Erro desconhecido'}`;
        toast.show();
        
    } finally {
        // Restaura o botão
        if (button) {
            button.disabled = false;
            button.innerHTML = '<i class="bi bi-file-earmark-pdf"></i> Exportar Relatório';
        }
    }
}

/**
 * Exporta a lista de médicos para PDF
 * @async
 * @param {HTMLElement} button - O botão que acionou a exportação
 */
async function exportarMedicosPDF(button) {
    const originalButtonHTML = button?.innerHTML || '';
    
    try {
        if (button) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Exportando...';
        }
        
        // Faz a requisição para a API para obter os dados mais recentes
        const response = await fetch('/api/medicos');
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.erro || `Erro ${response.status}: ${response.statusText}`;
            throw new Error(errorMessage);
        }
        
        const medicos = await response.json();
        
        if (!Array.isArray(medicos)) {
            throw new Error('Formato de dados inválido retornado pelo servidor');
        }
        
        // Cria o documento PDF em modo paisagem
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        
        // Configurações do documento
        const titulo = 'RELATÓRIO DE MÉDICOS';
        const subtitulo = 'Lista de médicos cadastrados no sistema';
        const dataAtual = new Date().toLocaleDateString('pt-BR');
        const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const margem = 15;
        
        // Adiciona o cabeçalho
        doc.setDrawColor(41, 128, 185);
        doc.setFillColor(41, 128, 185);
        doc.rect(0, 0, doc.internal.pageSize.width, 25, 'F');
        
        // Adiciona o título
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(titulo, doc.internal.pageSize.width / 2, 17, { align: 'center' });
        
        // Adiciona informações da clínica
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Clínica Vida & Saúde', margem, 35);
        doc.text(`Emitido em: ${dataAtual} às ${horaAtual}`, doc.internal.pageSize.width - margem, 35, { align: 'right' });
        
        // Adiciona o subtítulo
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(41, 128, 185);
        doc.text(subtitulo, doc.internal.pageSize.width / 2, 45, { align: 'center' });
        
        // Configuração da tabela
        const headers = [
            'CRM',
            'Nome',
            'Especialidade',
            'Tel', 
            'E-mail',
            'Atend.'
        ];
        
        // Prepara os dados da tabela
        const rows = medicos.map(medico => [
            medico.crm || 'N/A',
            medico.nome || 'N/I', 
            (medico.especialidade || 'N/I').substring(0, 20), 
            (medico.telefone || 'N/I').replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3'),
            (medico.email || 'N/I').substring(0, 20) + (medico.email && medico.email.length > 20 ? '...' : ''),
            medico.atendimentos_realizados?.toString() || '0'
        ]);
        
        // Configuração das larguras das colunas (em mm)
        const columnStyles = {
            0: { cellWidth: 15 },  // CRM
            1: { cellWidth: 45 },  // Nome
            2: { cellWidth: 35 },  // Especialidade
            3: { cellWidth: 20 },  // Telefone
            4: { cellWidth: 50 },  // E-mail
            5: { cellWidth: 15 }   // Atendimentos
        };
        
        // Configuração da tabela
        const tableConfig = {
            head: [headers],
            body: rows,
            startY: 55,
            margin: { 
                left: 5, 
                right: 5,
                top: 10
            },
            styles: {
                fontSize: 7,  
                cellPadding: 1,
                lineWidth: 0.1,
                overflow: 'linebreak',
                cellWidth: 'wrap',
                valign: 'middle',
                minCellHeight: 4
            },
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle',
                fontSize: 7,
                cellPadding: 2
            },
            columnStyles: columnStyles,
            tableWidth: 'wrap',
            theme: 'grid',
            didDrawPage: function(data) {
                // Adiciona o número da página no rodapé
                const pageSize = doc.internal.pageSize;
                const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(
                    'Página ' + doc.internal.getNumberOfPages(),
                    pageSize.width / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
                
                // Data e hora
                doc.text(
                    `Gerado em ${dataAtual} às ${horaAtual}`,
                    pageSize.width - margem,
                    pageHeight - 10,
                    { align: 'right' }
                );
                
                // Nome do sistema
                doc.text(
                    'Sistema de Gestão Médica - Relatório de Médico',
                    margem,
                    pageHeight - 10,
                    { align: 'left' }
                );
            }
        };

        // Adiciona a tabela ao PDF
        try {
            doc.autoTable(tableConfig);
            
            // Salva o PDF com nome personalizado
            doc.save(`relatorio_medicos_${new Date().toISOString().split('T')[0]}.pdf`);
            
            // Mostra mensagem de sucesso
            showToast('success', 'Relatório de médicos exportado com sucesso!');
            
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            showToast('error', `Erro ao gerar o relatório: ${error.message || 'Erro desconhecido'}`);
        }
        
    } catch (error) {
        console.error('Erro ao exportar relatório de médicos:', error);
        showToast('error', `Erro ao exportar relatório: ${error.message || 'Erro desconhecido'}`);
    } finally {
        // Restaura o botão
        if (button) {
            button.disabled = false;
            button.innerHTML = originalButtonHTML;
        }
    }
}

/**
 * Mostra uma notificação toast
 * @param {string} type - Tipo de notificação ('success' ou 'error')
 * @param {string} message - Mensagem a ser exibida
 */
function showToast(type, message) {
    try {
        const toastElement = document.getElementById(`toast${type.charAt(0).toUpperCase() + type.slice(1)}`);
        const messageElement = type === 'success' 
            ? document.getElementById('toastMensagem')
            : document.getElementById('toastMensagemErro');
        
        if (toastElement && messageElement) {
            messageElement.textContent = message;
            const toast = new bootstrap.Toast(toastElement);
            toast.show();
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    } catch (e) {
        console.error('Erro ao exibir notificação:', e);
    }
}