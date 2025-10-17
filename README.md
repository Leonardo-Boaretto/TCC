# Clínica Vida e Saúde TCC

Um sistema de gerenciamento de clínica desenvolvido em Python com Flask para agendamento de consultas, exames e gestão de pacientes.

## Funcionalidades

- **Autenticação e Autorização**: Login para pacientes, médicos e funcionários
- **Agendamento de Consultas**: Marcar consultas médicas com diferentes especialidades
- **Agendamento de Exames**: Solicitar e agendar exames médicos
- **Gestão de Usuários**: Cadastro, edição e cancelamento de contas de pacientes
- **Avaliações**: Sistema de avaliação de consultas e exames
- **Recuperação de Senha**: Funcionalidade para recuperar senha via email
- **Confirmação de Email**: Verificação de email para novos cadastros

## Pré-requisitos

Antes de executar o projeto, certifique-se de ter instalado:

- **Python 3.8+**
- **MySQL Server 8.0+**
- **pip** (gerenciador de pacotes do Python)

## Instalação

1. **Clone o repositório:**
   ```bash
   git clone <url-do-repositorio>
   cd TCC-main
   ```

2. **Instale as dependências:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure o banco de dados:**

   a. Certifique-se de que o MySQL está rodando em sua máquina.

   b. Crie um banco de dados chamado `clinica`:
   ```sql
   CREATE DATABASE clinica;
   ```

   c. Execute o script SQL fornecido para criar as tabelas:
   ```bash
   mysql -u root -p clinica < clnica.sql
   ```

   **Nota:** O script SQL usa as seguintes credenciais padrão (ajuste conforme necessário):
   - Host: localhost
   - Usuário: root
   - Senha: matheus
   - Banco: clinica

4. **Configure as variáveis de ambiente (opcional, mas recomendado):**

   Para maior segurança, defina as seguintes variáveis de ambiente em vez de usar as configurações hardcoded:

   ```bash
   export DB_HOST=localhost
   export DB_USER=root
   export DB_PASSWORD=sua_senha_mysql
   export DB_NAME=clinica
   export MAIL_USERNAME=seu_email@gmail.com
   export MAIL_PASSWORD=sua_senha_app_gmail
   export SECRET_KEY=sua_chave_secreta_flask
   ```

## Executando o Projeto

1. **Navegue até o diretório do projeto:**
   ```bash
   cd TCC-main/src/PYTHON
   ```

2. **Execute a aplicação:**
   ```bash
   python App.py
   ```

3. **Acesse a aplicação:**
   Abra seu navegador e vá para `http://localhost:5000`

## Estrutura do Projeto

```
TCC-main/
├── src/
│   ├── PYTHON/
│   │   └── App.py          # Aplicação principal Flask
│   ├── HTML/               # Templates HTML
│   ├── CSS/                # Arquivos de estilo
│   ├── JS/                 # Scripts JavaScript
│   └── IMG/                # Imagens
├── clnica.sql              # Script de criação do banco de dados
├── requirements.txt        # Dependências Python
└── README.md               # Este arquivo
```

## Configuração

### Banco de Dados

O sistema utiliza MySQL. As configurações padrão estão definidas em `App.py`, mas é recomendável usar variáveis de ambiente para produção.

### Email

O sistema utiliza o Gmail para envio de emails. Configure uma senha de aplicativo no Gmail para maior segurança.

### Sessões

As sessões são armazenadas no sistema de arquivos por padrão. Para produção, considere usar Redis ou outro backend de sessão.

## Desenvolvimento

Para contribuir com o projeto:

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Problemas Conhecidos

- Credenciais hardcoded no código (recomenda-se mover para variáveis de ambiente)
- Falta de tratamento de erros mais robusto em algumas rotas
- Interface pode precisar de melhorias de responsividade

## Licença

Este projeto é desenvolvido para fins acadêmicos (TCC).

## Suporte

Para suporte, entre em contato com a equipe de desenvolvimento ou abra uma issue no repositório.
