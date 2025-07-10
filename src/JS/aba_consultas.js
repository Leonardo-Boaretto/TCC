/**
 * arquivo responsável pela funcionalidade da aba de Consultas do Mês
 */

document.addEventListener('DOMContentLoaded', function() {
    // Configura o evento de mudança na aba
    const consultasTab = document.querySelector('#consultas-tab');
    if (consultasTab) {
        consultasTab.addEventListener('shown.bs.tab', function() {
            carregarConsultasMes();
        });
    }
    
    // Configura o evento de mudança no seletor de mês/ano
    const mesAnoInput = document.getElementById('mesConsulta');
    if (mesAnoInput) {
        // Define o valor padrão para janeiro de 2025
        mesAnoInput.value = '2025-01';
        // Define os valores mínimo e máximo para 2025
        mesAnoInput.min = '2025-01';
        mesAnoInput.max = '2025-12';
        mesAnoInput.addEventListener('change', carregarConsultasMes);
    }
});

/**
 * Busca as consultas do mês no banco de dados
 * @param {string} mes - Mês no formato MM
 * @param {string} ano - Ano no formato YYYY
 * @return {Promise<Object>} Dados das consultas
 */
async function buscarConsultasMes(mes, ano) {
    try {
        // Formata a data para o formato YYYY-MM
        const dataFormatada = `${ano}-${mes.padStart(2, '0')}`;
        console.log('Buscando consultas para:', dataFormatada);
        
        // Faz a chamada para a API
        const url = `/api/consultas/mes?data=${dataFormatada}`;
        console.log('URL da requisição:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include'
        });

        console.log('Resposta da API - Status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro na resposta da API:', errorText);
            throw new Error('Erro ao buscar consultas do mês');
        }

        const dados = await response.json();
        console.log('Dados recebidos da API:', dados);
        
        // Se a API retornar sucesso mas sem dados, retornar estrutura vazia
        if (!dados.detalhamentoDias || dados.detalhamentoDias.length === 0) {
            console.log('Nenhuma consulta encontrada para o período');
            return {
                totalConsultas: 0,
                consultasRealizadas: 0,
                consultasPendentes: 0,
                detalhamentoDias: []
            };
        }
        
        // Retorna os dados formatados da API
        return {
            totalConsultas: dados.totalConsultas || 0,
            consultasRealizadas: dados.consultasRealizadas || 0,
            consultasPendentes: dados.consultasPendentes || 0,
            detalhamentoDias: dados.detalhamentoDias.map(dia => ({
                data: dia.data,
                total: dia.total || 0,
                realizadas: dia.realizadas || 0,
                pendentes: dia.pendentes || 0,
                taxaComparecimento: dia.taxaComparecimento || 0
            }))
        };
        
    } catch (error) {
        console.error('Erro ao buscar consultas:', error);
        throw error;
    }
}

/**
 * Gera dados simulados para teste
 * @param {string} mes - Mês no formato MM
 * @param {string} ano - Ano no formato YYYY
 * @return {Object} Dados simulados no formato esperado
 */
function gerarDadosSimulados(mes, ano) {
    console.log('Gerando dados simulados para', `${mes}/${ano}`);

    const detalhamentoDias = [];
    const diasNoMes = new Date(ano, mes, 0).getDate();
    
    for (let dia = 1; dia <= 5; dia++) {
        const total = Math.floor(Math.random() * 10) + 1; // 1-10 consultas por dia
        const realizadas = Math.floor(total * 0.8); // 80% de taxa de comparecimento
        
        detalhamentoDias.push({
            data: `${dia.toString().padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`,
            total: total,
            realizadas: realizadas,
            pendentes: total - realizadas,
            taxaComparecimento: Math.round((realizadas / total) * 100)
        });
    }
    
    const totalConsultas = detalhamentoDias.reduce((sum, dia) => sum + dia.total, 0);
    const totalRealizadas = detalhamentoDias.reduce((sum, dia) => sum + dia.realizadas, 0);
    
    return {
        totalConsultas,
        consultasRealizadas: totalRealizadas,
        consultasPendentes: totalConsultas - totalRealizadas,
        detalhamentoDias
    };
}

/**
 * Carrega os dados das consultas do mês selecionado
 * @async
 */
async function carregarConsultasMes() {
    console.log('Iniciando carregamento das consultas do mês');
    try {
        const mesAnoInput = document.getElementById('mesConsulta');
        console.log('Input de mês/ano encontrado?', !!mesAnoInput);
        
        if (!mesAnoInput.value) {
            console.log('Valor não definido, definindo padrão 2025-01');
            mesAnoInput.value = '2025-01';
        }
        
        // Obtém o mês e ano do input
        const [ano, mes] = mesAnoInput.value.split('-');
        console.log(`Mês/Ano selecionado: ${mes}/${ano}`);
        
        // Verifica se o ano é 2025
        if (ano !== '2025') {
            console.log('Ano diferente de 2025, redefinindo para 2025-01');
            mesAnoInput.value = '2025-01';
            throw new Error('Por favor, selecione um mês no ano de 2025.');
        }
        
        // Atualiza o valor para garantir o formato correto
        mesAnoInput.value = `${ano}-${mes.padStart(2, '0')}`;

        // Mostra o indicador de carregamento
        const loadingElement = document.getElementById('loadingConsultas');
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }

        // Busca os dados reais da API
        console.log('Iniciando busca das consultas na API...');
        const dados = await buscarConsultasMes(mes, ano);
        console.log('Dados recebidos da busca:', dados);
        
        // Atualiza os cards de resumo
        if (document.getElementById('totalConsultas')) {
            document.getElementById('totalConsultas').textContent = dados.totalConsultas.toLocaleString('pt-BR') || '0';
        }
        if (document.getElementById('consultasRealizadas')) {
            document.getElementById('consultasRealizadas').textContent = dados.consultasRealizadas.toLocaleString('pt-BR') || '0';
        }
        if (document.getElementById('consultasPendentes')) {
            document.getElementById('consultasPendentes').textContent = dados.consultasPendentes.toLocaleString('pt-BR') || '0';
        }
        
        // Atualiza a tabela de detalhamento por dia
        if (dados.detalhamentoDias && dados.detalhamentoDias.length > 0) {
            console.log(`Atualizando tabela com ${dados.detalhamentoDias.length} dias de dados`);
            atualizarTabelaDetalhamentoDias(dados.detalhamentoDias);
        } else {
            console.log('Nenhum dado de detalhamento por dia encontrado');
            // Se não houver dados, limpa a tabela
            atualizarTabelaDetalhamentoDias([]);
        }
        
    } catch (error) {
        console.error('Erro ao carregar consultas do mês:', error);
        
        // Mostra mensagem de erro para o usuário
        if (window.showToast) {
            showToast(error.message || 'Erro ao carregar as consultas. Tente novamente.', 'error');
        } else {
            alert(error.message || 'Erro ao carregar as consultas do mês. Por favor, tente novamente.');
        }
    } finally {
        // Esconde o indicador de carregamento
        const loadingElement = document.getElementById('loadingConsultas');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }
}

/**
 * Atualiza a tabela de detalhamento por dia com os dados fornecidos
 * @param {Array} dados 
 */
function atualizarTabelaDetalhamentoDias(dados) {
    const tbody = document.querySelector('#tabelaConsultasDia');
    
    if (!tbody) {
        console.error('Elemento tbody da tabela de detalhamento não encontrado');
        return;
    }
    
    // Limpa a tabela
    tbody.innerHTML = '';
    
    if (!dados || dados.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="5" class="text-center">Nenhum dado disponível para o período selecionado</td>';
        tbody.appendChild(tr);
        return;
    }
    
    // Preenche a tabela com os dados
    dados.forEach(dia => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dia.data}</td>
            <td class="text-center">${dia.total}</td>
            <td class="text-center">${dia.realizadas}</td>
            <td class="text-center">${dia.pendentes}</td>
            <td class="text-center">
                <div class="progress" style="height: 20px;">
                    <div class="progress-bar bg-success" role="progressbar" 
                         style="width: ${dia.taxaComparecimento}%" 
                         aria-valuenow="${dia.taxaComparecimento}" 
                         aria-valuemin="0" 
                         aria-valuemax="100">
                        ${dia.taxaComparecimento}%
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Exporta o relatório de consultas do mês para PDF
 * @param {HTMLElement} button - Botão que acionou a exportação
 */
async function exportarRelatorioConsultasMes(button) {
    const originalButtonHTML = button?.innerHTML || '';
    
    try {
        if (button) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Exportando...';
        }
        
        // Obtém os dados atuais
        const mesAnoInput = document.getElementById('mesConsulta');
        const [ano, mes] = mesAnoInput.value.split('-');
        const dados = await buscarConsultasMes(mes, ano);
        
        // Cria um novo documento PDF em modo paisagem
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        
        // Configurações do documento
        const titulo = 'RELATÓRIO DE CONSULTAS DO MÊS';
        const subtitulo = `Período: ${mes.padStart(2, '0')}/${ano}`;
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
        
        // Adiciona os cards de resumo
        doc.setFontSize(10);
        doc.setFillColor(240, 248, 255);
        doc.roundedRect(margem, 55, 60, 25, 3, 3, 'F');
        doc.roundedRect(margem + 65, 55, 60, 25, 3, 3, 'F');
        doc.roundedRect(margem + 130, 55, 60, 25, 3, 3, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('TOTAL DE CONSULTAS', margem + 30, 65, { align: 'center' });
        doc.text('CONSULTAS REALIZADAS', margem + 95, 65, { align: 'center' });
        doc.text('CONSULTAS PENDENTES', margem + 160, 65, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(41, 128, 185);
        doc.text(dados.totalConsultas.toString(), margem + 30, 75, { align: 'center' });
        doc.text(dados.consultasRealizadas.toString(), margem + 95, 75, { align: 'center' });
        doc.text(dados.consultasPendentes.toString(), margem + 160, 75, { align: 'center' });
        
        // Prepara os dados da tabela
        const headers = ['Data', 'Total', 'Realizadas', 'Pendentes', 'Taxa de Comparecimento'];
        const data = dados.detalhamentoDias.map(dia => [
            dia.data,
            dia.total.toString(),
            dia.realizadas.toString(),
            dia.pendentes.toString(),
            `${dia.taxaComparecimento}%`
        ]);
        
        // Adiciona a tabela
        doc.autoTable({
            head: [headers],
            body: data,
            startY: 90,
            margin: { left: margem, right: margem },
            styles: {
                fontSize: 8,
                cellPadding: 3,
                overflow: 'linebreak',
                cellWidth: 'wrap',
                valign: 'middle',
                lineWidth: 0.1
            },
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                fontSize: 8,
                cellPadding: 4,
                lineWidth: 0.1,
                valign: 'middle',
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 30, halign: 'center' },
                1: { cellWidth: 20, halign: 'center' },
                2: { cellWidth: 25, halign: 'center' },
                3: { cellWidth: 22, halign: 'center' },
                4: { cellWidth: 40, halign: 'center' }
            },
            didDrawPage: function(data) {
                // Adiciona o número da página no rodapé
                const pageSize = doc.internal.pageSize;
                const pageHeight = pageSize.height || pageSize.getHeight();
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(
                    'Página ' + doc.internal.getNumberOfPages(),
                    pageSize.width / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
            }
        });
        
        // Salva o PDF
        const dataAtualArquivo = new Date().toISOString().split('T')[0];
        doc.save(`relatorio_consultas_${mes}_${ano}.pdf`);
        
        // Mostra mensagem de sucesso
        if (window.showToast) {
            showToast('Relatório exportado com sucesso!', 'success');
        } else if (window.bootstrap && document.getElementById('toastSucesso')) {
            const toast = new bootstrap.Toast(document.getElementById('toastSucesso'));
            toast.show();
        }
        
    } catch (error) {
        console.error('Erro ao exportar relatório:', error);
        
        // Exibe mensagem de erro de forma segura
        if (window.showToast) {
            showToast('Erro ao exportar o relatório. Tente novamente.', 'error');
        } else if (window.bootstrap && document.getElementById('toastErro')) {
            const toast = new bootstrap.Toast(document.getElementById('toastErro'));
            toast.show();
        } else {
            alert('Erro ao exportar o relatório. Verifique o console para mais detalhes.');
        }
    } finally {
        // Restaura o botão em qualquer caso
        if (button) {
            button.disabled = false;
            button.innerHTML = originalButtonHTML;
        }
    }
}