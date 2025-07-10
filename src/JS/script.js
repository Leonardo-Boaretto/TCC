function atualizarConteudo(mensagem) {
    document.getElementById("conteudo").innerHTML = `<p class="content-text">${mensagem}</p>`;
}

function agendarConsulta() {
    atualizarConteudo("Página de Agendamento de Consulta em desenvolvimento.");
}

function cancelarConsulta() {
    atualizarConteudo("Página de Cancelamento de Consulta em desenvolvimento.");
}

function marcarExame() {
    atualizarConteudo("Página de Marcação de Exames em desenvolvimento.");
}

function cancelarExame() {
    atualizarConteudo("Página de Cancelamento de Exames em desenvolvimento.");
}

function suporteCliente() {
    atualizarConteudo("Página de Suporte ao Cliente em desenvolvimento.");
}

function historicoMedico() {
    atualizarConteudo("Página do Histórico Médico em desenvolvimento.");
}

function historicoConsultasExames() {
    atualizarConteudo("Página do Histórico de Consultas e Exames em desenvolvimento.");
}
// script.js
function toggleMenu() {
    var menu = document.getElementById('menu-opcoes');
    menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
}
