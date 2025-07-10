console.log('Arquivo aba_consulta_canceladas.js carregado com sucesso!');

// Referência global para o gráfico
let graficoConsultasCanceladas = null;

/**
 * Agrupa os cancelamentos por mês
 * @param {Array} consultas 
 * @returns {Object} Dados agrupados por mês
 */
function agruparPorMes(consultas) {
    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    // Cria um objeto para armazenar os cancelamentos por mês
    const cancelamentosPorMes = {};
    
    // Inicializa todos os meses com zero
    const dataAtual = new Date();
    const ultimos12Meses = [];
    
    // Pega os últimos 12 meses
    for (let i = 11; i >= 0; i--) {
        const data = new Date();
        data.setMonth(data.getMonth() - i);
        const mes = data.getMonth();
        const ano = data.getFullYear();
        const chave = `${ano}-${String(mes + 1).padStart(2, '0')}`;
        const nomeMes = `${meses[mes]}/${ano}`;
        
        cancelamentosPorMes[chave] = {
            nome: nomeMes,
            total: 0,
            motivos: {}
        };
        
        ultimos12Meses.push(chave);
    }
    
    // Processa as consultas
    consultas.forEach(consulta => {
        if (!consulta.data_consulta) return;
        
        const dataConsulta = new Date(consulta.data_consulta);
        const mes = dataConsulta.getMonth();
        const ano = dataConsulta.getFullYear();
        const chave = `${ano}-${String(mes + 1).padStart(2, '0')}`;
        const motivo = consulta.motivo_cancelamento || 'Não informado';
        
        if (cancelamentosPorMes[chave]) {
            cancelamentosPorMes[chave].total++;
            
            if (!cancelamentosPorMes[chave].motivos[motivo]) {
                cancelamentosPorMes[chave].motivos[motivo] = 0;
            }
            cancelamentosPorMes[chave].motivos[motivo]++;
        }
    });
    
    return { cancelamentosPorMes, mesesExibicao: ultimos12Meses };
}

/**
 * Cria o gráfico de evolução mensal dos cancelamentos
 * @param {Array} consultas 
 */
function atualizarGraficoMotivosCancelamento(consultas) {
    // Agrupa os cancelamentos por mês
    const { cancelamentosPorMes, mesesExibicao } = agruparPorMes(consultas);
    
    // Prepara os dados para o gráfico
    const labels = [];
    const dados = [];
    const motivosPorMes = [];
    
    // Extrai os dados dos últimos 12 meses
    const ultimos12Meses = mesesExibicao;
    
    ultimos12Meses.forEach(chave => {
        if (cancelamentosPorMes[chave]) {
            labels.push(cancelamentosPorMes[chave].nome);
            dados.push(cancelamentosPorMes[chave].total);
            
            // Prepara os motivos para o tooltip
            const motivos = [];
            Object.entries(cancelamentosPorMes[chave].motivos).forEach(([motivo, quantidade]) => {
                const porcentagem = Math.round((quantidade / cancelamentosPorMes[chave].total) * 100);
                motivos.push({
                    motivo: motivo,
                    quantidade: quantidade,
                    porcentagem: porcentagem
                });
            });
            
            // Ordena os motivos do maior para o menor
            motivos.sort((a, b) => b.quantidade - a.quantidade);
            motivosPorMes.push(motivos);
        } else {
            motivosPorMes.push([]);
        }
    });
    
    const ctx = document.getElementById('graficoMotivosCancelamento').getContext('2d');
    
    // Destrói o gráfico anterior se existir
    if (graficoConsultasCanceladas) {
        graficoConsultasCanceladas.destroy();
    }
    
    graficoConsultasCanceladas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total de Cancelamentos',
                data: dados,
                backgroundColor: 'rgba(54, 162, 235, 0.7)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                hoverBackgroundColor: 'rgba(54, 162, 235, 0.9)',
                hoverBorderColor: 'rgba(54, 162, 235, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Evolução Mensal de Consultas Canceladas',
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return `Mês: ${context[0].label}`;
                        },
                        label: function(context) {
                            const mesIndex = context.dataIndex;
                            const motivos = motivosPorMes[mesIndex];
                            const total = context.parsed.y;
                            
                            // Se não houver motivos ou o total for zero, retorna apenas o total
                            if (motivos.length === 0 || total === 0) {
                                return [`Total: ${total} cancelamentos`];
                            }
                            
                            // Cria as linhas dos motivos
                            const linhasMotivos = motivos.map(m => {
                                return `${m.motivo}: ${m.quantidade} (${m.porcentagem}%)`;
                            });
                            
                            // Retorna o total seguido dos motivos
                            return [
                                `Total: ${total} cancelamentos`,
                                'Motivos: ',
                                ...linhasMotivos
                            ];
                        }
                    },
                    titleFontSize: 14,
                    bodyFontSize: 12,
                    padding: 10,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1,
                    displayColors: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Número de Cancelamentos',
                        font: {
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        stepSize: 1,
                        precision: 0
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Mês/Ano',
                        font: {
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

/**
 * Função para carregar as consultas canceladas
 * @async
 */
async function carregarConsultasCanceladas() {
    const tbody = document.getElementById('tabelaConsultasCanceladas');
    if (!tbody) {
        console.error('Elemento tabelaConsultasCanceladas não encontrado');
        return;
    }

    try {
        // Mostra um indicador de carregamento
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Carregando...</span>
                    </div>
                    <div class="mt-2">Carregando consultas canceladas...</div>
                </td>
            </tr>`;

        // Faz a requisição para a API
        const response = await fetch('/api/consultas/canceladas');
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.erro || `Erro ${response.status}: ${response.statusText}`;
            throw new Error(errorMessage);
        }
        
        const consultas = await response.json();
        
        if (!Array.isArray(consultas)) {
            throw new Error('Formato de dados inválido retornado pelo servidor');
        }
        
        console.log('Dados recebidos da API:', consultas); // Adicionado para depuração
        
        // Armazena os dados originais para filtragem
        dadosOriginais = consultas;
        
        // Preenche os filtros de motivo e quem cancelou
        preencherFiltros(consultas);
        
        // Aplica os filtros iniciais
        aplicarFiltros();
        
    } catch (error) {
        console.error('Erro ao carregar consultas canceladas:', error);
        const errorMessage = error.message || 'Erro desconhecido ao carregar as consultas canceladas';
        
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle"></i> ${errorMessage}
                        <div class="mt-2">
                            <button class="btn btn-sm btn-outline-primary" onclick="carregarConsultasCanceladas()">
                                <i class="bi bi-arrow-clockwise"></i> Tentar novamente
                            </button>
                        </div>
                    </div>
                </td>
            </tr>`;
    }
}

// Variável para armazenar os dados originais
let dadosOriginais = [];

/**
 * Aplica todos os filtros selecionados
 */
function aplicarFiltros() {
    const termoBusca = document.getElementById('buscaPaciente').value.toLowerCase();
    const quemCancelou = document.getElementById('filtroQuemCancelou').value;
    const motivo = document.getElementById('filtroMotivo').value;
    
    // Filtra os dados originais com base nos filtros
    const dadosFiltrados = dadosOriginais.filter(consulta => {
        // Filtro por nome do paciente
        const nomePaciente = consulta.nome_paciente ? consulta.nome_paciente.toLowerCase() : '';
        const buscaPacienteOk = !termoBusca || nomePaciente.includes(termoBusca);
        
        // Filtro por quem cancelou
        const quemCancelouConsulta = consulta.quem_cancelou || 'Sistema';
        const quemCancelouOk = !quemCancelou || quemCancelouConsulta === quemCancelou;
        
        // Filtro por motivo
        const motivoConsulta = consulta.motivo_cancelamento || 'Não informado';
        const motivoOk = !motivo || motivoConsulta === motivo;
        
        return buscaPacienteOk && quemCancelouOk && motivoOk;
    });
    
    // Atualiza a tabela e o gráfico com os dados filtrados
    atualizarTabelaConsultasCanceladas(dadosFiltrados);
    atualizarGraficoMotivosCancelamento(dadosFiltrados);
}

/**
 * Função mantida para compatibilidade com chamadas antigas
 */
function filtrarConsultasCanceladas() {
    aplicarFiltros();
}

/**
 * Atualiza a tabela de consultas canceladas com os dados fornecidos
 * @param {Array} consultas 
 */
function atualizarTabelaConsultasCanceladas(consultas) {
    const tbody = document.getElementById('tabelaConsultasCanceladas');
    
    if (consultas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="alert alert-info mb-0">
                        <i class="bi bi-info-circle"></i> Nenhuma consulta cancelada encontrada.
                    </div>
                </td>
            </tr>`;
        return;
    }
    
    // Limpa a tabela
    tbody.innerHTML = '';
    
    // Preenche a tabela com os dados das consultas canceladas
    consultas.forEach(consulta => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${consulta.nome_paciente || 'N/A'}</td>
            <td>${consulta.nome_medico || 'N/A'}</td>
            <td>${consulta.especialidade_medico || consulta.especialidade || 'N/A'}</td>
            <td>${consulta.data_consulta ? new Date(consulta.data_consulta).toLocaleDateString('pt-BR') : 'N/A'}</td>
            <td>${consulta.horario || 'N/A'}</td>
            <td>${consulta.motivo_cancelamento || 'Não informado'}</td>
            <td>${consulta.quem_cancelou || 'Sistema'}</td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Exporta o relatório de consultas canceladas para PDF
 * @param {HTMLElement} button 
 */
async function exportarRelatorioConsultasCanceladas(button) {
    const originalButtonHTML = button?.innerHTML || '';
    
    try {
        if (button) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Exportando...';
        }
        
        // Faz a requisição para a API para obter os dados mais recentes
        const response = await fetch('/api/consultas/canceladas');
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.erro || `Erro ${response.status}: ${response.statusText}`;
            throw new Error(errorMessage);
        }
        
        const consultas = await response.json();
        
        if (!Array.isArray(consultas)) {
            throw new Error('Formato de dados inválido retornado pelo servidor');
        }
        
        // Cria o documento PDF em modo paisagem
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        
        // Configurações do documento
        const titulo = 'RELATÓRIO DE CONSULTAS CANCELADAS';
        const subtitulo = 'Lista de consultas canceladas no sistema';
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
        
        // Prepara os dados da tabela
        const headers = [
            'Paciente',
            'Médico',
            'Especialidade',
            'Data',
            'Horário',
            'Motivo',
            'Cancelado por'
        ];
        
        const rows = consultas.map(consulta => [
            consulta.nome_paciente || 'N/A',
            consulta.nome_medico || 'N/A',
            consulta.especialidade_medico || consulta.especialidade || 'N/A',
            consulta.data_consulta ? new Date(consulta.data_consulta).toLocaleDateString('pt-BR') : 'N/A',
            consulta.horario || 'N/A',
            consulta.motivo_cancelamento || 'Não informado',
            consulta.quem_cancelou || 'Sistema'
        ]);
        
        // Configuração das larguras das colunas 
        const columnStyles = {
            0: { cellWidth: 30 },  // Paciente
            1: { cellWidth: 30 },  // Médico
            2: { cellWidth: 25 },  // Especialidade
            3: { cellWidth: 15 },  // Data
            4: { cellWidth: 15 },  // Horário
            5: { cellWidth: 35 },  // Motivo
            6: { cellWidth: 25 }   // Cancelado por
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
            }
        };

        // Adiciona a tabela ao PDF
        try {
            doc.autoTable(tableConfig);
            
            // Salva o PDF com nome personalizado
            doc.save(`relatorio_consultas_canceladas_${new Date().toISOString().split('T')[0]}.pdf`);
            
            // Mostra mensagem de sucesso
            if (typeof showToast === 'function') {
                showToast('success', 'Relatório de consultas canceladas exportado com sucesso!');
            } else {
                alert('Relatório de consultas canceladas exportado com sucesso!');
            }
            
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            if (typeof showToast === 'function') {
                showToast('error', `Erro ao gerar o relatório: ${error.message || 'Erro desconhecido'}`);
            } else {
                alert(`Erro ao gerar o relatório: ${error.message || 'Erro desconhecido'}`);
            }
        }
        
    } catch (error) {
        console.error('Erro ao exportar relatório de consultas canceladas:', error);
        if (typeof showToast === 'function') {
            showToast('error', `Erro ao exportar relatório: ${error.message || 'Erro desconhecido'}`);
        } else {
            alert(`Erro ao exportar relatório: ${error.message || 'Erro desconhecido'}`);
        }
    } finally {
        // Restaura o botão
        if (button) {
            button.disabled = false;
            button.innerHTML = originalButtonHTML;
        }
    }
}

/**
 * Preenche os filtros com os valores únicos encontrados nos dados
 * @param {Array} consultas - Array de consultas
 */
function preencherFiltros(consultas) {
    // Limpa e preenche o filtro de 'Quem Cancelou' 
    const filtroQuemCancelou = document.getElementById('filtroQuemCancelou');
    const quemCancelouSet = new Set();
    
    // Adiciona os valores únicos encontrados nos dados
    consultas.forEach(consulta => {
        if (consulta.quem_cancelou) {
            quemCancelouSet.add(consulta.quem_cancelou);
        } else {
            quemCancelouSet.add('Sistema'); 
        }
    });
    
    // Ordena e preenche as opções
    const opcoesQuemCancelou = Array.from(quemCancelouSet).sort();
    filtroQuemCancelou.innerHTML = '<option value="">Todos</option>';
    opcoesQuemCancelou.forEach(opcao => {
        const option = document.createElement('option');
        option.value = opcao;
        option.textContent = opcao;
        filtroQuemCancelou.appendChild(option);
    });
    
    // Limpa e preenche o filtro de 'Motivo' 
    const filtroMotivo = document.getElementById('filtroMotivo');
    const motivosSet = new Set();
    
    // Adiciona os valores únicos encontrados nos dados
    consultas.forEach(consulta => {
        if (consulta.motivo_cancelamento) {
            motivosSet.add(consulta.motivo_cancelamento);
        } else {
            motivosSet.add('Não informado');
        }
    });
    
    // Ordena e preenche as opções
    const opcoesMotivo = Array.from(motivosSet).sort();
    filtroMotivo.innerHTML = '<option value="">Todos os motivos</option>';
    opcoesMotivo.forEach(opcao => {
        const option = document.createElement('option');
        option.value = opcao;
        option.textContent = opcao;
        filtroMotivo.appendChild(option);
    });
}

// Evento disparado quando o DOM é totalmente carregado
document.addEventListener('DOMContentLoaded', function() {
    // Adiciona o evento de clique ao botão de exportar PDF
    const btnExportarPdf = document.getElementById('exportarPdfBtn');
    if (btnExportarPdf) {
        btnExportarPdf.addEventListener('click', function() {
            exportarRelatorioConsultasCanceladas(this);
        });
    }
    
    // Adiciona evento de tecla Enter no campo de busca
    const buscaPaciente = document.getElementById('buscaPaciente');
    if (buscaPaciente) {
        buscaPaciente.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                aplicarFiltros();
            }
        });
    }
    
    // Carrega as consultas canceladas ao carregar a página ou ao mudar para a aba
    const tabCanceladas = document.getElementById('canceladas-tab');
    if (tabCanceladas) {
        tabCanceladas.addEventListener('shown.bs.tab', function () {
            if (dadosOriginais.length === 0) {
                carregarConsultasCanceladas();
            }
        });
    }
    
    // Se já estiver na aba de cancelados ao carregar a página
    if (document.querySelector('#canceladas-tab.active')) {
        carregarConsultasCanceladas();
    }
});