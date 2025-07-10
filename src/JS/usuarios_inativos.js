// Função para mascarar CPF (mantém apenas os 3 primeiros e 2 últimos dígitos)
function mascararCPF(cpf) {
    if (!cpf) return '';
    // Remove caracteres não numéricos
    const numeros = cpf.replace(/\D/g, '');
    // Mantém apenas os 3 primeiros e 2 últimos dígitos
    return numeros.substring(0, 3) + '.***.***' + (numeros.length > 5 ? '-' + numeros.slice(-2) : '');
}

document.addEventListener('DOMContentLoaded', async () => {
    const tabelaUsuariosInativos = document.getElementById('tabelaUsuariosInativos');

    try {
        // Buscar usuários inativos do backend
        const response = await fetch('/api/usuarios/inativos');
        if (!response.ok) {
            throw new Error('Erro ao buscar usuários inativos');
        }

        const usuarios = await response.json();

        // Preencher a tabela com os dados dos usuários inativos
        usuarios.forEach(usuario => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${usuario.nome}</td>
                <td>${mascararCPF(usuario.cpf)}</td>
                <td>${usuario.email}</td>
                <td>${usuario.telefone}</td>
                <td>${usuario.data_nascimento}</td>
                <td>${usuario.endereco}</td>
                <td>${usuario.cidade}</td>
                <td>${usuario.estado}</td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="reativarUsuario(${usuario.id})">Reativar</button>
                </td>
            `;
            tabelaUsuariosInativos.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar usuários inativos:', error);
        alert('Erro ao carregar usuários inativos.');
    }
});

// Função para reativar usuário
async function reativarUsuario(usuarioId) {
    if (!confirm('Tem certeza que deseja reativar este usuário?')) {
        return;
    }

    try {
        const response = await fetch(`/api/usuarios/${usuarioId}/reativar`, {
            method: 'POST'
        });

        if (response.ok) {
            alert('Usuário reativado com sucesso!');
            location.reload();
        } else {
            const erro = await response.json();
            alert(`Erro ao reativar usuário: ${erro.erro}`);
        }
    } catch (error) {
        console.error('Erro ao reativar usuário:', error);
        alert('Erro ao reativar usuário.');
    }
}