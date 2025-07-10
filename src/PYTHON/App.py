from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from flask_session import Session
from flask_cors import CORS
from flask_mail import Mail, Message
from datetime import timedelta
import datetime
import mysql.connector
from mysql.connector import Error
import os
import sys
import json
import logging
import secrets
from functools import wraps

app = Flask(__name__)

# Configuração da chave secreta para sessão
app.secret_key = 'sua_chave_secreta_muito_segura_aqui_123!@#'

# Configuração da sessão
app.config.update(
    SESSION_TYPE='filesystem',
    SESSION_PERMANENT=True,
    SESSION_USE_SIGNER=True,
    SESSION_COOKIE_SECURE=False,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    PERMANENT_SESSION_LIFETIME=timedelta(hours=24),  
    SESSION_FILE_THRESHOLD=1000  
)


Session(app)


cors = CORS(app, 
           resources={
               r"/api/*": {
                   "origins": ["http://localhost:5000", "http://127.0.0.1:5000"],
                   "supports_credentials": True
               }
           })

# Configurações adicionais do CORS
app.config['CORS_HEADERS'] = 'Content-Type'
app.config['CORS_SUPPORTS_CREDENTIALS'] = True
app.config['CORS_ORIGINS'] = ['http://localhost:5000', 'http://127.0.0.1:5000']

# Garante que a pasta de sessão existe
if app.config['SESSION_TYPE'] == 'filesystem':
    try:
        os.makedirs(app.instance_path, exist_ok=True)
        print(f"[DEBUG] Pasta de instância criada em: {app.instance_path}")
    except Exception as e:
        print(f"[AVISO] Não foi possível criar a pasta de instância: {str(e)}") 

# Configuração do banco de dados MySQL
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'matheus',
    'database': 'clinica'
}

# Configurações do servidor de e-mail 
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_USERNAME'] = 'clinica.vida.saude7@gmail.com'  
app.config['MAIL_PASSWORD'] = 'rtyy vpzk axte ilfo'  
app.config['MAIL_DEFAULT_SENDER'] = 'clinica.vida.saude7@gmail.com'
app.config['MAIL_DEBUG'] = True  # Habilita logs detalhados
app.config['MAIL_SUPPRESS_SEND'] = False  # Garante que os e-mails serão enviados
app.config['MAIL_ASCII_ATTACHMENTS'] = False

# Configurações adicionais de segurança
app.config['MAIL_MAX_EMAILS'] = None  # Número máximo de e-mails a serem enviados
app.config['MAIL_DEFAULT_CHARSET'] = 'utf-8'

# Inicializa a extensão de e-mail
mail = Mail()
mail.init_app(app)

# Dicionário para armazenar o estado do servidor de e-mail
email_status = {
    'connected': False,
    'last_error': None,
    'last_success': None
}

# Testar conexão com o servidor de e-mail
def testar_conexao_email():
    try:
        with app.app_context():
            print("[DEBUG] Testando conexão com o servidor de e-mail...")
            mail.verify()
            email_status['connected'] = True
            email_status['last_success'] = datetime.datetime.now()
            email_status['last_error'] = None
            print("[SUCESSO] Conexão com o servidor de e-mail estabelecida com sucesso!")
            return True
    except Exception as e:
        error_msg = f"Falha ao conectar ao servidor de e-mail: {str(e)}"
        print(f"[ERRO] {error_msg}")
        import traceback
        print(f"[DEBUG] Detalhes do erro: {traceback.format_exc()}")
        email_status['connected'] = False
        email_status['last_error'] = error_msg
        email_status['last_success'] = None
        return False

# Testar a conexão ao iniciar o aplicativo
if __name__ != '__main__':
    testar_conexao_email()

# Rota para verificar o status do servidor de e-mail
@app.route('/api/email/status', methods=['GET'])
def email_status_route():
    return jsonify({
        'connected': email_status['connected'],
        'last_error': email_status['last_error'],
        'last_success': str(email_status['last_success'])
    })

# Função para criar conexão com o banco de dados
def get_db_connection():
    try:
        connection = mysql.connector.connect(**db_config, buffered=True)
        # Configurar para autenticação nativa do MySQL 8.0+
        connection.cmd_init_db(db_config['database'])
        # Testar a conexão
        connection.ping(reconnect=True, attempts=3, delay=5)
        return connection
    except Error as e:
        print(f"[ERRO] Erro ao conectar ao MySQL: {e}")
        return None

# Configuração das pastas estáticas
app.static_folder = '../'
app.static_url_path = ''

def get_usuario_logado():
    try:
        print("\n[DEBUG] === GET_USUARIO_LOGADO ===")
        
        # Verificar se há um token de autenticação no cabeçalho
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            print(f"[DEBUG] Token recebido no header: {token}")
            if 'auth_token' in session:
                print(f"[DEBUG] Token na sessão: {session['auth_token']}")
                if session['auth_token'] == token:
                    print("[DEBUG] Token válido, retornando usuario_id:", session.get('usuario_id'))
                    return session.get('usuario_id')
                else:
                    print("[DEBUG] Token inválido")
            else:
                print("[DEBUG] Nenhum token encontrado na sessão")
        else:
            print("[DEBUG] Nenhum token Bearer encontrado no cabeçalho")
        
        # Verificar se a sessão existe
        if not hasattr(session, '_get_current_object'):
            print("[DEBUG] Sessão não possui _get_current_object")
            return None
            
        # Verificar se há um usuário logado na sessão
        if 'usuario_id' in session:
            print("[DEBUG] Usuário encontrado na sessão (usuario_id):", session['usuario_id'])
            return session['usuario_id']
            
        if 'user' in session and isinstance(session['user'], dict) and 'id' in session['user']:
            print("[DEBUG] Usuário encontrado na sessão (user.id):", session['user']['id'])
            return session['user']['id']
            
        # Verificar se há um token na sessão
        if 'auth_token' in session:
            print("[DEBUG] Token encontrado na sessão, retornando usuario_id:", session.get('usuario_id'))
            return session.get('usuario_id')
            
        print("[DEBUG] Nenhum usuário autenticado encontrado")
        return None
        
    except Exception as e:
        print(f"[ERRO] Erro em get_usuario_logado: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not get_usuario_logado():
            return jsonify({'error': 'Usuário não autenticado'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        print("Dados de login recebidos:", data)
        
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)

        # Verificar se o email pertence a um funcionário
        query_funcionario = "SELECT * FROM funcionarios WHERE email = %s"
        cursor.execute(query_funcionario, (data['email'],))
        funcionario = cursor.fetchone()

        if funcionario and check_password_hash(funcionario['senha'], data['senha']):
            # Login como funcionário
            del funcionario['senha']  
            session['usuario_id'] = funcionario['id'] 
            session['tipo_usuario'] = 'funcionario' 
            session['user'] = funcionario  # Adiciona o usuário completo na sessão
            
            # Gerar um token simples para autenticação do lado do cliente
            import secrets
            token = secrets.token_hex(16)
            session['auth_token'] = token
            
            # Definir a URL de redirecionamento com base no cargo do funcionário
            if funcionario.get('cargo') == 'Administrador':
                redirect_url = "/HTML/funcionario.html"
            else:
                redirect_url = "/HTML/Tela_de_Enfermagem.html"
                
            return jsonify({
                "mensagem": "Login realizado com sucesso!",
                "usuario": funcionario,
                "tipo": "funcionario",
                "token": token,  # Enviar o token para o cliente
                "redirect_url": redirect_url
            })

        # Verificar se o email pertence a um médico
        query_medico = "SELECT * FROM medicos WHERE email = %s"
        cursor.execute(query_medico, (data['email'],))
        medico = cursor.fetchone()

        if medico and check_password_hash(medico['senha'], data['senha']):
            # Login como médico
            del medico['senha']  
            session['usuario_id'] = medico['id'] 
            session['tipo_usuario'] = 'medico' 
            session['user'] = medico  # Adiciona o usuário completo na sessão
            return jsonify({
                "mensagem": "Login realizado com sucesso!",
                "usuario": medico,
                "tipo": "medico",
                "redirect_url": "/HTML/pagina-profissional.html"
            })

        # Verificar se o email pertence a um usuário
        query_usuario = "SELECT * FROM usuarios WHERE email = %s"
        cursor.execute(query_usuario, (data['email'],))
        usuario = cursor.fetchone()

        if usuario:
            if not usuario['ativo']:
                return jsonify({"erro": "Sua conta está inativa. Entre em contato com o suporte."}), 403

            if check_password_hash(usuario['senha'], data['senha']):
                # Atualizar a data do último acesso
                update_query = "UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = %s"
                cursor.execute(update_query, (usuario['id'],))
                connection.commit()
                
                # Login como usuário
                del usuario['senha']  
                session['usuario_id'] = usuario['id'] 
                session['tipo_usuario'] = 'usuario'
                session['user'] = usuario  # Adiciona o usuário completo na sessão
                return jsonify({
                    "mensagem": "Login realizado com sucesso!",
                    "usuario": usuario,
                    "tipo": "usuario",
                    "redirect_url": "/HTML/index.html" 
                })

        return jsonify({"erro": "Email ou senha incorretos"}), 401

    except Error as e:
        print("Erro MySQL:", str(e))
        return jsonify({"erro": f"Erro ao fazer login: {str(e)}"}), 500
    except Exception as e:
        print("Erro geral:", str(e))
        return jsonify({"erro": f"Erro ao fazer login: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/usuarios', methods=['POST'])
def cadastrar():
    try:
        data = request.json
        print("Dados recebidos:", data)
        
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        # Gerar token de confirmação
        token_confirmacao = secrets.token_urlsafe(32)
        
        # Criptografar a senha antes de salvar
        senha_hash = generate_password_hash(data['senha'])
        cursor = connection.cursor()
        query = "INSERT INTO usuarios (nome, cpf, data_nascimento, email, telefone, cep, endereco, numero, bairro, cidade, estado, referencia, senha, token_confirmacao, email_confirmado) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
        valores = (
            data['nome'], data['cpf'], data['data_nascimento'], data['email'], data['telefone'],
            data['cep'], data['endereco'], data['numero'], data['bairro'], data['cidade'],
            data['estado'], data.get('referencia', None), senha_hash, token_confirmacao, False
        ) 
        
        cursor.execute(query, valores)
        connection.commit()
        
        # Enviar email de confirmação
        try:
            link_confirmacao = f"http://localhost:5000/HTML/confirmar-email.html?token={token_confirmacao}"
            msg = Message(
                subject='Confirmação de Email - Clínica Vida e Saúde',
                recipients=[data['email']]
            )
            msg.html = f"""
                <h2>Bem-vindo(a) à Clínica Vida e Saúde!</h2>
                <p>Olá {data['nome']},</p>
                <p>Seu cadastro foi realizado com sucesso em nossa clínica.</p>
                <p>Para confirmar seu email e ativar sua conta, clique no link abaixo:</p>
                <p><a href="{link_confirmacao}">Confirmar meu email</a></p>
                <p>Se você não criou uma conta em nossa clínica, ignore este email.</p>
                <p>Este link expira em 24 horas.</p>
                <p>Com os melhores cumprimentos,<br>Equipe Clínica Vida e Saúde</p>
            """
            mail.send(msg)
        except Exception as e:
            print(f"Erro ao enviar email: {str(e)}")
            
        
        return jsonify({"mensagem": "Cadastro realizado com sucesso! Por favor, verifique seu email para confirmar sua conta."})
        
    except Error as e:
        print("Erro MySQL:", str(e)) 
        return jsonify({"erro": f"Erro ao cadastrar: {str(e)}"}), 500
    except Exception as e:
        print("Erro geral:", str(e)) 
        return jsonify({"erro": f"Erro ao cadastrar: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/usuarios', methods=['GET'])
def listar_usuarios():
    connection = None
    cursor = None
    try:
        print("Iniciando busca de usuários...")
        connection = get_db_connection()
        if not connection:
            print("Falha na conexão com o banco de dados")
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT id, nome, cpf, email, telefone, data_nascimento, 
                   endereco, cidade, estado, cep, ultimo_acesso
            FROM usuarios
            WHERE ativo = 1
        """
        print("Executando query...")
        cursor.execute(query)
        print("Query executada com sucesso")
        
        usuarios = cursor.fetchall()
        print(f"Encontrados {len(usuarios)} usuários")
        
        # Formatando as datas
        for usuario in usuarios:
            if 'data_nascimento' in usuario and usuario['data_nascimento']:
                if isinstance(usuario['data_nascimento'], (datetime.date, datetime.datetime)):
                    usuario['data_nascimento'] = usuario['data_nascimento'].isoformat()
            
            if 'ultimo_acesso' in usuario and usuario['ultimo_acesso']:
                if isinstance(usuario['ultimo_acesso'], (datetime.date, datetime.datetime)):
                    usuario['ultimo_acesso'] = usuario['ultimo_acesso'].isoformat()
        
        return jsonify(usuarios)
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Erro ao listar usuários: {str(e)}")
        print(f"Traceback: {error_trace}")
        return jsonify({
            "erro": "Erro ao listar usuários",
            "detalhes": str(e),
            "traceback": error_trace
        }), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/api/usuarios/inativos', methods=['GET'])
def listar_usuarios_inativos():
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)
        
        #  buscar usuários que estão inativos ou devem ser marcados como inativos
        query = """
            SELECT id, nome, cpf, email, telefone, data_nascimento, 
                   endereco, cidade, estado, cep, ultimo_acesso,
                   ultimo_acesso as ultima_atividade
            FROM usuarios 
            WHERE ativo = 0 
               OR (ativo = 1 AND ultimo_acesso < DATE_SUB(NOW(), INTERVAL 1 YEAR))
            ORDER BY ultimo_acesso DESC
        """
        
        cursor.execute(query)
        usuarios = cursor.fetchall()
        
        # Agora, atualizar para inativo os que estão há mais de 1 ano sem acesso
        update_query = """
            UPDATE usuarios 
            SET ativo = 0 
            WHERE ativo = 1 
            AND ultimo_acesso < DATE_SUB(NOW(), INTERVAL 1 YEAR)
        """
        cursor.execute(update_query)
        connection.commit()
        
        # Atualizar a lista após a mudança de status
        cursor.execute(query)
        usuarios = cursor.fetchall()
        
        return jsonify(usuarios)
        
    except Exception as e:
        print("Erro ao listar usuários inativos:", str(e))
        return jsonify({"erro": "Erro ao listar usuários inativos"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/usuarios/<int:usuario_id>', methods=['GET'])
def obter_usuario(usuario_id):
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT 
                id, nome, cpf, data_nascimento, email, telefone, cep, endereco, numero, bairro, cidade, estado, referencia
            FROM usuarios
            WHERE id = %s
        """
        cursor.execute(query, (usuario_id,))
        usuario = cursor.fetchone()

        if not usuario:
            return jsonify({"erro": "Usuário não encontrado"}), 404

        if usuario.get('data_nascimento'):
            usuario['data_nascimento'] = usuario['data_nascimento'].strftime('%Y-%m-%d')

        return jsonify(usuario)
        
    except Exception as e:
        print("Erro ao obter usuário:", str(e))
        return jsonify({"erro": f"Erro ao obter usuário: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/usuarios/<int:usuario_id>', methods=['PUT'])
def atualizar_usuario(usuario_id):
    try:
        data = request.json
        print("Dados recebidos para atualização:", data)

        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor()
        query = """
            UPDATE usuarios
            SET nome = %s, cpf = %s, data_nascimento = %s, email = %s, telefone = %s,
                cep = %s, endereco = %s, numero = %s, bairro = %s, cidade = %s, estado = %s, referencia = %s
            WHERE id = %s
        """
        valores = (
            data['nome'], data['cpf'], data['data_nascimento'], data['email'], data['telefone'],
            data['cep'], data['endereco'], data['numero'], data['bairro'], data['cidade'],
            data['estado'], data.get('referencia', None), usuario_id
        )
        cursor.execute(query, valores)
        connection.commit()

        return jsonify({"mensagem": "Usuário atualizado com sucesso!"}), 200
        
    except Exception as e:
        print("Erro ao atualizar usuário:", str(e))
        return jsonify({"erro": f"Erro ao atualizar usuário: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/usuarios/<int:usuario_id>/cancelar', methods=['POST'])
def cancelar_usuario(usuario_id):
    try:
        # verificar se pode cancelar
        response = verificar_agendamentos_paciente(usuario_id)
        if response.status_code != 200:
            return response
            
        dados = response.get_json()
        if not dados['pode_cancelar']:
            return jsonify({
                "erro": "Não é possível cancelar este usuário pois ele tem consultas ou exames marcados.",
                "total_consultas": dados['total_consultas'],
                "total_exames": dados['total_exames']
            }), 400

        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
            
        cursor = connection.cursor(dictionary=True)
        cursor.execute("UPDATE usuarios SET ativo = 0 WHERE id = %s", (usuario_id,))
        connection.commit()
        
        return jsonify({"mensagem": "Usuário cancelado com sucesso"}), 200
        
    except Exception as e:
        return jsonify({"erro": f"Erro ao cancelar usuário: {str(e)}"}), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals() and connection and connection.is_connected():
            connection.close()

@app.route('/api/usuarios/<int:usuario_id>/reativar', methods=['POST'])
def reativar_usuario(usuario_id):
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)
        
        # Verificar se o usuário existe
        cursor.execute("SELECT * FROM usuarios WHERE id = %s", (usuario_id,))
        usuario = cursor.fetchone()
        
        if not usuario:
            return jsonify({"erro": "Usuário não encontrado"}), 404
            
        # Atualizar para ativo e atualizar a data do último acesso
        update_query = """
            UPDATE usuarios 
            SET ativo = 1,
                ultimo_acesso = NOW()
            WHERE id = %s
        """
        cursor.execute(update_query, (usuario_id,))
        connection.commit()
        
        return jsonify({"mensagem": "Usuário reativado com sucesso"})
        
    except Exception as e:
        print("Erro ao reativar usuário:", str(e))
        return jsonify({"erro": "Erro ao reativar usuário"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/confirmar-email', methods=['POST'])
def confirmar_email():
    try:
        data = request.json
        token = data.get('token')
        
        if not token:
            return jsonify({"erro": "Token não fornecido"}), 400

        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)
        
        # Verificar se o token é válido
        query = "SELECT id FROM usuarios WHERE token_confirmacao = %s AND email_confirmado = %s"
        cursor.execute(query, (token, False))
        usuario = cursor.fetchone()
        
        if not usuario:
            return jsonify({"erro": "Token inválido ou email já confirmado"}), 400

        # Atualizar status de confirmação
        update_query = "UPDATE usuarios SET email_confirmado = %s, token_confirmacao = NULL WHERE id = %s"
        cursor.execute(update_query, (True, usuario['id']))
        connection.commit()
        
        return jsonify({"mensagem": "Email confirmado com sucesso! Você já pode fazer login."})
        
    except Exception as e:
        print("Erro ao confirmar email:", str(e))
        return jsonify({"erro": "Erro ao confirmar email"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/recuperar-senha', methods=['POST'])
def recuperar_senha():
    try:
        data = request.json
        email = data.get('email')
        
        if not email:
            return jsonify({"erro": "Email não fornecido"}), 400

        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)
        
        # Verificar se o email existe
        cursor.execute("SELECT id FROM usuarios WHERE email = %s", (email,))
        usuario = cursor.fetchone()
        
        if not usuario:
            return jsonify({"erro": "Email não encontrado"}), 404

        # Gerar token de recuperação
        token = secrets.token_urlsafe(32)
        
        # Salvar token no banco de dados
        cursor.execute("UPDATE usuarios SET token_recuperacao = %s, token_expiracao = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE email = %s", 
                      (token, email))
        connection.commit()

        # Criar link de recuperação
        link_recuperacao = f"http://localhost:5000/HTML/Nova-senha.html?token={token}"
        print("Link de recuperação gerado:", link_recuperacao)  # Debug
        
        # Enviar email
        msg = Message('Recuperação de Senha - Clínica Vida e Saúde',
                     recipients=[email])
        msg.body = f'''Olá,

Você solicitou a recuperação de senha da sua conta na Clínica Vida e Saúde.

Para criar uma nova senha, clique no link abaixo:
{link_recuperacao}

Este link expira em 1 hora.

Se você não solicitou a recuperação de senha, ignore este email.

Atenciosamente,
Equipe Clínica Vida e Saúde'''

        try:
            mail.send(msg)
            print("Email enviado com sucesso")  # Debug
        except Exception as e:
            print("Erro ao enviar email:", str(e))  # Debug
            return jsonify({"erro": "Erro ao enviar email de recuperação"}), 500
        
        return jsonify({"mensagem": "Email de recuperação enviado com sucesso!"})
        
    except Exception as e:
        print("Erro ao recuperar senha:", str(e))
        return jsonify({"erro": "Erro ao processar a recuperação de senha"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/nova-senha', methods=['POST'])
def atualizar_senha():
    try:
        data = request.json
        print("Dados recebidos para atualizar senha:", data)
        
        token = data.get('token')
        nova_senha = data.get('senha')
        
        if not token or not nova_senha:
            print("Token ou senha não fornecidos")
            return jsonify({"erro": "Token e nova senha são obrigatórios"}), 400

        # Criptografar a nova senha
        senha_hash = generate_password_hash(nova_senha)
        
        connection = get_db_connection()
        if not connection:
            print("Erro ao conectar ao banco de dados")
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)
        
        # Verificar se o token é válido e não expirou
        query = """
            SELECT id, email FROM usuarios 
            WHERE token_recuperacao = %s 
            AND token_expiracao > NOW()
        """
        print("Query de verificação de token:", query) 
        print("Token:", token) 
        
        cursor.execute(query, (token,))
        usuario = cursor.fetchone()
        
        if not usuario:
            print("Token inválido ou expirado")  
            return jsonify({"erro": "Token inválido ou expirado"}), 400

        print("Usuário encontrado:", usuario) 

        # Atualizar a senha e limpar o token
        update_query = """
            UPDATE usuarios 
            SET senha = %s, 
                token_recuperacao = NULL, 
                token_expiracao = NULL 
            WHERE id = %s 
            AND token_recuperacao = %s
        """
        valores = (senha_hash, usuario['id'], token)
        print("Query de atualização:", update_query) 
        print("Valores:", valores) 
        
        cursor.execute(update_query, valores)
        rows_affected = cursor.rowcount
        print("Linhas afetadas:", rows_affected) 
        
        if rows_affected == 0:
            print("Nenhuma linha foi atualizada") 
            return jsonify({"erro": "Erro ao atualizar senha"}), 500
            
        connection.commit()
        
        print("Senha atualizada com sucesso") 
        return jsonify({"mensagem": "Senha atualizada com sucesso!"})
        
    except Exception as e:
        print("Erro ao atualizar senha:", str(e)) 
        return jsonify({"erro": f"Erro ao atualizar senha: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/')
def index():
    return send_from_directory(app.static_folder + '/HTML', 'login.html')

@app.route('/HTML/<path:path>')
def serve_html(path):
   return send_from_directory('../HTML', path)

@app.route('/CSS/<path:path>')
def serve_css(path):
    return send_from_directory('../CSS', path)

@app.route('/JS/<path:path>')
def serve_js(path):
    return send_from_directory('../JS', path)

@app.route('/IMG/<path:path>')
def serve_img(path):
        return send_from_directory('../IMG', path)

@app.route('/api/consultas', methods=['GET'])
@login_required
def listar_consultas():
    try:
        # Verifica se o usuário está autenticado
        if 'usuario_id' not in session:
            return jsonify({"erro": "Usuário não autenticado"}), 401
            
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)
        
        print("Executando consulta SQL...")  
        
        query = """
            SELECT 
                a.id,
                a.especialidade,
                a.data_consulta,
                a.horario,
                a.tipo_consulta,
                a.status,
                u.nome AS nome_paciente,
                m.nome AS nome_medico,
                a.observacoes,
                a.ativa
            FROM agendamentos a
            JOIN usuarios u ON a.usuario_id = u.id
            JOIN medicos m ON a.medico_id = m.id
            WHERE a.status = 'Agendado' AND a.ativa = 1
            ORDER BY a.data_consulta, a.horario
        """
        
        cursor.execute(query)
        consultas = cursor.fetchall()
        
        print(f"Consulta retornou {len(consultas)} registros")  

        for consulta in consultas:
            if 'data_consulta' in consulta and consulta['data_consulta']:
                consulta['data_consulta'] = consulta['data_consulta'].strftime('%Y-%m-%d')
            if 'horario' in consulta and consulta['horario']:
                consulta['horario'] = str(consulta['horario'])

        return jsonify(consultas)
        
    except mysql.connector.Error as err:
        print(f"Erro de banco de dados ao listar consultas: {err}")
        return jsonify({"erro": f"Erro de banco de dados: {err}"}), 500
    except Exception as e:
        print(f"Erro inesperado ao listar consultas: {str(e)}")
        return jsonify({"erro": f"Erro inesperado ao listar consultas: {str(e)}"}), 500
@login_required
def listar_consultas_funcionario(funcionario_id):
    try:
        print(f"[DEBUG] Iniciando listar_consultas_funcionario para funcionario_id: {funcionario_id}")
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT 
                a.id,
                a.especialidade,
                a.data_consulta,
                a.horario,
                a.tipo_consulta,
                a.status,
                u.nome AS nome_paciente,
                m.nome AS nome_medico,
                a.observacoes
            FROM agendamentos a
            JOIN usuarios u ON a.usuario_id = u.id
            JOIN medicos m ON a.medico_id = m.id
            WHERE a.usuario_id = %s
            ORDER BY a.data_consulta, a.horario
        """
        cursor.execute(query, (funcionario_id,))
        consultas = cursor.fetchall()
        print(f"[DEBUG] Consultas encontradas: {len(consultas)}")
        
        # Lista para armazenar as consultas processadas
        consultas_processadas = []
        
        # Processar cada consulta para garantir a serialização correta
        for i, consulta in enumerate(consultas):
            try:
                print(f"\n[DEBUG] Processando consulta {i+1}:")
                consulta_processada = {}
                
                # Copiar todos os campos da consulta original
                for key, value in consulta.items():
                    print(f"[DEBUG]   Campo: {key} (tipo: {type(value) if value is not None else 'None'})")
                    
                    if value is None:
                        consulta_processada[key] = None
                    elif isinstance(value, (str, int, float, bool)):
                        # Tipos básicos que podem ser serializados diretamente
                        consulta_processada[key] = value
                    elif isinstance(value, datetime.date):
                        # Converter data para string
                        consulta_processada[key] = value.strftime('%Y-%m-%d')
                        print(f"[DEBUG]     Convertido data: {consulta_processada[key]}")
                    elif isinstance(value, datetime.timedelta):
                        # Converter timedelta para string HH:MM:SS
                        total_seconds = value.total_seconds()
                        hours = int(total_seconds // 3600)
                        minutes = int((total_seconds % 3600) // 60)
                        seconds = int(total_seconds % 60)
                        consulta_processada[key] = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
                        print(f"[DEBUG]     Convertido timedelta: {consulta_processada[key]}")
                    elif hasattr(value, 'strftime'):
                        consulta_processada[key] = value.strftime('%Y-%m-%d %H:%M:%S')
                        print(f"[DEBUG]     Convertido com strftime: {consulta_processada[key]}")
                    else:
                        try:
                            consulta_processada[key] = str(value)
                            print(f"[DEBUG]     Convertido para string: {consulta_processada[key]}")
                        except Exception as e:
                            print(f"[DEBUG]     Erro ao converter campo {key}: {str(e)}")
                            consulta_processada[key] = None
                
                consultas_processadas.append(consulta_processada)
                print(f"[DEBUG]   Consulta processada: {consulta_processada}")
                
            except Exception as e:
                print(f"[DEBUG]   Erro ao processar consulta {i+1}: {str(e)}")
                continue
        
        print("\n[DEBUG] Retornando consultas processadas")
        return jsonify(consultas_processadas)
        
    except Exception as e:
        print("Erro ao listar consultas:", str(e))
        return jsonify({"erro": f"Erro ao listar consultas: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT 
                a.id,
                a.especialidade,
                a.data_consulta, 
                a.horario, 
                a.tipo_consulta,
                a.observacoes,
                a.status,
                u.nome AS nome_paciente,
                m.nome AS nome_medico
            FROM agendamentos a
            JOIN usuarios u ON a.usuario_id = u.id
            JOIN medicos m ON a.medico_id = m.id
            WHERE a.id = %s
        """
        cursor.execute(query, (consulta_id,))
        consulta = cursor.fetchone()

        if not consulta:
            return jsonify({"erro": "Consulta não encontrada"}), 404

        if consulta.get('horario'):
            if hasattr(consulta['horario'], 'strftime'):
                consulta['horario'] = consulta['horario'].strftime('%H:%M:%S')
            elif isinstance(consulta['horario'], str):
                
                pass
            else:
                consulta['horario'] = str(consulta['horario'])

        if consulta.get('data_consulta') and hasattr(consulta['data_consulta'], 'strftime'):
            consulta['data_consulta'] = consulta['data_consulta'].strftime('%Y-%m-%d')

        return jsonify(consulta)
        
    except Exception as e:
        print("Erro ao obter consulta:", str(e))
        return jsonify({"erro": f"Erro ao obter consulta: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/consultas/<int:consulta_id>', methods=['GET'])
def obter_consulta(consulta_id):
    print(f"[DEBUG] Iniciando obter_consulta para ID: {consulta_id}")
    try:
        print("[DEBUG] Obtendo conexão com o banco de dados...")
        connection = get_db_connection()
        if not connection:
            print("[ERRO] Falha ao conectar ao banco de dados")
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)
        print("[DEBUG] Executando consulta SQL...")
        query = """
            SELECT 
                a.id,
                a.especialidade,
                a.data_consulta,
                a.horario,
                a.tipo_consulta,
                a.status,
                a.observacoes,
                a.usuario_id,
                a.medico_id,
                u.nome AS nome_paciente,
                m.nome AS nome_medico
            FROM agendamentos a
            LEFT JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN medicos m ON a.medico_id = m.id
            WHERE a.id = %s
        """
        print(f"[DEBUG] Query: {query}")
        print(f"[DEBUG] Parâmetros: ({consulta_id},)")
        
        cursor.execute(query, (consulta_id,))
        consulta = cursor.fetchone()
        print(f"[DEBUG] Resultado da consulta: {consulta}")

        if not consulta:
            print(f"[ERRO] Nenhuma consulta encontrada com o ID: {consulta_id}")
            return jsonify({"erro": "Consulta não encontrada"}), 404

        # Processar a consulta para garantir que todos os campos sejam serializáveis
        consulta_processada = {}
        for key, value in consulta.items():
            if isinstance(value, (str, int, float, bool)) or value is None:
                consulta_processada[key] = value
            elif isinstance(value, datetime.date):
                consulta_processada[key] = value.strftime('%Y-%m-%d')
            elif isinstance(value, datetime.timedelta):
                # Converter timedelta para string HH:MM:SS
                total_seconds = int(value.total_seconds())
                hours = total_seconds // 3600
                minutes = (total_seconds % 3600) // 60
                seconds = total_seconds % 60
                consulta_processada[key] = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
            else:
                consulta_processada[key] = str(value)

        print("[DEBUG] Retornando consulta processada com sucesso")
        return jsonify(consulta_processada), 200
        
    except Exception as e:
        print(f"[ERRO] Erro ao obter consulta: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"erro": f"Erro interno ao obter consulta: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()
            print("[DEBUG] Conexão com o banco de dados fechada")

@app.route('/api/consultas/<int:consulta_id>', methods=['PUT'])
def atualizar_consulta(consulta_id):
    try:
        data_payload = request.json 
        print("Dados recebidos para atualização:", data_payload)

        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor()
        query = """
            UPDATE agendamentos
            SET data_consulta = %s, 
                horario = %s,
                medico_id = %s,
                especialidade = %s,
                tipo_consulta = %s,
                observacoes = %s
            WHERE id = %s
        """
        valores = (
            data_payload['data_consulta'],
            data_payload['horario'],
            data_payload['medico_id'],
            data_payload['especialidade'],
            data_payload['tipo_consulta'],
            data_payload.get('observacoes', ''),
            consulta_id
        )
        cursor.execute(query, valores)
        connection.commit()

        return jsonify({"mensagem": "Consulta atualizada com sucesso!"}), 200
        
    except KeyError as e:
        print(f"Erro de chave ao atualizar consulta: {str(e)} - Payload: {data_payload}")
        return jsonify({"erro": f"Campo ausente nos dados da requisição: {str(e)}"}), 400
    except Exception as e:
        print(f"Erro ao atualizar consulta: {str(e)} - Payload: {data_payload}")
        return jsonify({"erro": f"Erro ao atualizar consulta: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/medicos', methods=['GET'])
@login_required
def listar_medicos():
    def safe_print(*args, **kwargs):
        """Função auxiliar para imprimir de forma segura"""
        try:
            message = ' '.join(str(arg) for arg in args)
            # Remove caracteres especiais que podem causar problemas
            message = message.replace('❌', '[ERRO]').replace('✅', '[OK]')
            print(message, **kwargs)
        except Exception as e:
            print(f"Erro ao imprimir mensagem: {str(e)}")
    
    import io
    import sys
    
    # Cria um buffer de saída para capturar a saída do print
    buffer = io.StringIO()
    original_stdout = sys.stdout
    sys.stdout = buffer
    
    try:
        safe_print("\n=== Iniciando listagem de médicos ===")
        safe_print(f"Usuário autenticado: {session.get('usuario_id')}")
        
        # Tenta obter conexão com o banco de dados
        safe_print("Tentando conectar ao banco de dados...")
        conn = get_db_connection()
        if not conn:
            error_msg = "[ERRO] Não foi possível obter conexão com o banco de dados"
            safe_print(error_msg)
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
            
        safe_print("Conexão com o banco de dados estabelecida com sucesso")
        cursor = conn.cursor(dictionary=True)

        try:
            # Verifica se a tabela de médicos existe
            safe_print("Verificando se a tabela 'medicos' existe...")
            cursor.execute("SHOW TABLES LIKE 'medicos'")
            tabela_existe = cursor.fetchone()
            safe_print(f"Tabela 'medicos' existe? {bool(tabela_existe)}")
            
            if not tabela_existe:
                error_msg = "[ERRO] Tabela 'medicos' não encontrada no banco de dados"
                safe_print(error_msg)
                return jsonify({"erro": "Tabela de médicos não encontrada"}), 500

            # Obtém o parâmetro de especialidade, se fornecido
            especialidade = request.args.get('especialidade')
            safe_print(f"Especialidade filtrada: {especialidade if especialidade else 'Todas'}")
            
            # Busca todos os médicos ativos com a contagem de atendimentos
            print("Preparando consulta SQL...")
            query = """
                SELECT 
                    m.id, 
                    m.nome, 
                    m.cpf,
                    m.crm, 
                    m.especialidade, 
                    m.email, 
                    m.telefone,
                    m.cep,
                    m.endereco,
                    m.numero,
                    m.bairro,
                    m.cidade,
                    m.estado,
                    m.referencia,
                    m.ativo,
                    IFNULL(m.email_confirmado, 0) as email_confirmado,
                    COALESCE(m.atendimentos_realizados, 0) as atendimentos_realizados,
                    CONCAT_WS(', ', 
                        CONCAT_WS(' ', m.endereco, IFNULL(m.numero, 'S/N')), 
                        m.bairro, 
                        CONCAT_WS('/', m.cidade, m.estado),
                        m.cep
                    ) as endereco_completo
                FROM medicos m
                WHERE m.ativo = 1
                {}
                ORDER BY m.nome
            """
            
            # Adiciona condição de filtro por especialidade se fornecida
            if especialidade:
                query = query.format("AND m.especialidade = %s")
                safe_print(f"Executando query com filtro de especialidade: {especialidade}")
                cursor.execute(query, (especialidade,))
            else:
                query = query.format("")
                safe_print("Executando query sem filtro de especialidade")
                cursor.execute(query)
            safe_print("Query executada com sucesso")
            
            medicos = cursor.fetchall()
            safe_print(f"Total de médicos encontrados: {len(medicos)}")
            
            # Log dos resultados para depuração
            for i, medico in enumerate(medicos, 1):
                safe_print(f"  {i}. {medico.get('nome', 'N/A')} - {medico.get('especialidade', 'N/A')} ({medico.get('atendimentos_realizados', 0)} atendimentos)")
            
    
            import json
            from decimal import Decimal
            
            def default_serializer(obj):
                if isinstance(obj, Decimal):
                    return float(obj)
                elif isinstance(obj, datetime.date):
                    return obj.isoformat()
                elif isinstance(obj, bytes):
                    return obj.decode('utf-8')
                raise TypeError(f"Type {type(obj)} not serializable")
            
            print("Convertendo resultados para JSON...")
            medicos_json = json.dumps(medicos, default=default_serializer, ensure_ascii=False)
            
            cursor.close()
            conn.close()
            safe_print("Listagem de médicos concluída com sucesso")
            
            from flask import Response
            response = Response(medicos_json, mimetype='application/json; charset=utf-8')
            response.headers['Content-Type'] = 'application/json; charset=utf-8'
            return response
            
        except Exception as e:
            error_msg = f"[ERRO] Erro ao executar consulta: {str(e)}"
            safe_print(error_msg)
            import traceback
            traceback.print_exc()
            if conn:
                conn.close()
            return jsonify({"erro": f"Erro ao buscar médicos: {str(e)}"}), 500
            
    except Exception as e:
        error_msg = f"[ERRO] Erro inesperado em listar_medicos: {str(e)}"
        safe_print(error_msg)
        import traceback
        traceback.print_exc()
        return jsonify({"erro": "Erro interno no servidor"}), 500

@app.route('/api/consultas/canceladas', methods=['GET'])
@login_required
def listar_consultas_canceladas():
    connection = None
    cursor = None
    try:
        print("\n=== Iniciando listar_consultas_canceladas ===")
        
        # Obter parâmetros de data
        data_inicio = request.args.get('data_inicio')
        data_fim = request.args.get('data_fim')
        
        print(f"Parâmetros recebidos - data_inicio: {data_inicio}, data_fim: {data_fim}")
        
        # Conectar ao banco de dados
        print("Conectando ao banco de dados...")
        connection = get_db_connection()
        if not connection:
            print("Erro: Não foi possível conectar ao banco de dados")
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
            
        print("Conexão com o banco de dados estabelecida com sucesso")
        cursor = connection.cursor(dictionary=True)
        
        # Construir a query base
        query = """
            SELECT 
                a.id,
                a.especialidade,
                a.data_consulta,
                a.horario,
                a.tipo_consulta,
                a.status,
                a.observacoes,
                a.motivo_cancelamento,
                a.quem_cancelou,
                u.nome AS nome_paciente,
                m.nome AS nome_medico,
                COALESCE(m.especialidade, a.especialidade) AS especialidade_medico,
                a.ativa
            FROM agendamentos a
            LEFT JOIN usuarios u ON a.usuario_id = u.id
            LEFT JOIN medicos m ON a.medico_id = m.id
            WHERE a.status = 'Cancelado'
        """
        
        params = []
        
        # Adicionar filtros de data
        if data_inicio and data_fim:
            query += " AND a.data_consulta BETWEEN %s AND %s"
            params.extend([data_inicio, data_fim])
        elif data_inicio:
            query += " AND a.data_consulta >= %s"
            params.append(data_inicio)
        elif data_fim:
            query += " AND a.data_consulta <= %s"
            params.append(data_fim)
            
        query += " ORDER BY a.data_consulta DESC, a.horario DESC"
        
        print("\n=== Query SQL ===")
        print(query)
        print("Parâmetros:", params)
        
        # Executar a query
        print("Executando a query...")
        cursor.execute(query, params)
        print("Query executada com sucesso")
        
        print("Obtendo resultados...")
        consultas = cursor.fetchall()
        print(f"\n=== Resultados encontrados: {len(consultas)} ===")
        
        # Log dos resultados
        for i, consulta in enumerate(consultas[:3]):
            print(f"Consulta {i+1}:", consulta)
        if len(consultas) > 3:
            print(f"... e mais {len(consultas) - 3} registros")
        
        consultas_serializaveis = []
        for consulta in consultas:
            consulta_serializavel = {}
            for key, value in consulta.items():
                if hasattr(value, 'isoformat'):
                    consulta_serializavel[key] = value.isoformat()
                elif hasattr(value, 'seconds'):
                    hours = value.seconds // 3600
                    minutes = (value.seconds % 3600) // 60
                    consulta_serializavel[key] = f"{hours:02d}:{minutes:02d}"
                else:
                    consulta_serializavel[key] = value
            consultas_serializaveis.append(consulta_serializavel)
        
        print("Retornando resultados...")
        return jsonify(consultas_serializaveis)
        
    except Exception as e:
        print("\n=== ERRO ===")
        import traceback
        traceback.print_exc()
        return jsonify({"erro": f"Erro ao listar consultas canceladas: {str(e)}"}), 500
        
    finally:
        if cursor:
            cursor.close()
@app.route('/api/consultas/<int:consulta_id>/cancelar', methods=['POST'])
def cancelar_consulta(consulta_id):
    connection = None
    cursor = None
    try:
        print(f"\n=== INÍCIO DO CANCELAMENTO DA CONSULTA {consulta_id} ===")
        print("Headers da requisição:", dict(request.headers))
        print("Dados brutos da requisição:", request.get_data())
        print("Sessão atual:", dict(session))
        print("Tipo de usuário na sessão:", session.get('tipo_usuario'))
        print("ID do usuário na sessão:", session.get('usuario_id'))
        
        # Verifica se o usuário está autenticado
        if 'usuario_id' not in session:
            print("ERRO: Usuário não autenticado")
            return jsonify({"erro": "Usuário não autenticado"}), 401
            
        data = request.get_json()
        if not data:
            print("ERRO: Dados não fornecidos")
            return jsonify({"erro": "Dados não fornecidos"}), 400
            
        motivo = data.get('motivo', 'Não informado')
        print("Motivo do cancelamento:", motivo)
        
        quem_cancelou = None
        if 'tipo_usuario' in session:
            print("Tipo de usuário encontrado na sessão")
            if session['tipo_usuario'] == 'funcionario':
                quem_cancelou = 'Adm'
            elif session['tipo_usuario'] == 'medico':
                quem_cancelou = 'Médico'
            elif session['tipo_usuario'] == 'usuario':
                quem_cancelou = 'Paciente'
        else:
            print("ERRO: Tipo de usuário não identificado")
            return jsonify({"erro": "Tipo de usuário não identificado"}), 400
                
        connection = get_db_connection()
        if not connection:
            print("ERRO: Falha ao conectar ao banco de dados")
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
            
        cursor = connection.cursor(dictionary=True)
        print("Conexão com banco estabelecida")
        
        cursor.execute("SELECT * FROM agendamentos WHERE id = %s AND ativa = 1", (consulta_id,))
        consulta = cursor.fetchone()
        print("Consulta encontrada:", consulta)
        
        if not consulta:
            print("ERRO: Consulta não encontrada ou já cancelada")
            return jsonify({"erro": "Consulta não encontrada ou já cancelada"}), 404
            
        print("Atualizando status da consulta...")
        query = """
            UPDATE agendamentos
            SET ativa = 0, 
                status = 'Cancelado',
                motivo_cancelamento = %s,
                quem_cancelou = %s
            WHERE id = %s
        """
        cursor.execute(query, (motivo, quem_cancelou, consulta_id))
        connection.commit()
        print("Consulta cancelada com sucesso!")

        return jsonify({
            "mensagem": "Consulta cancelada com sucesso!",
            "consulta_id": consulta_id,
            "motivo_cancelamento": motivo,
            "quem_cancelou": quem_cancelou
        }), 200
        
    except Exception as e:
        print("\n=== ERRO DETALHADO ===")
        print(f"Erro ao cancelar consulta: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"erro": f"Erro ao cancelar consulta: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
@app.route('/api/exames/<int:exame_id>/cancelar', methods=['POST'])
@login_required
def cancelar_exame(exame_id):
    """
    Cancela um exame e registra o motivo do cancelamento.
    """
    print(f"[DEBUG] Iniciando cancelar_exame para o exame ID: {exame_id}")
    
    connection = None
    cursor = None
    
    try:
        # Obter o ID do usuário da sessão
        usuario_id = session.get('usuario_id')
        print(f"[DEBUG] Usuário autenticado - ID: {usuario_id}")
        
        if not usuario_id:
            return jsonify({"erro": "Usuário não autenticado"}), 401
        
        # Obter os dados da requisição
        try:
            dados = request.get_json()
            print(f"[DEBUG] Dados recebidos: {dados}")
            
            if dados is None:
                print("[DEBUG] Nenhum dado JSON recebido")
                return jsonify({"erro": "Nenhum dado fornecido"}), 400
                
            motivo = dados.get('motivo', '').strip()
            print(f"[DEBUG] Motivo recebido: '{motivo}'")
            
            if not motivo:
                return jsonify({"erro": "O motivo do cancelamento é obrigatório"}), 400
                
        except Exception as e:
            print(f"[ERRO] Erro ao processar JSON: {str(e)}")
            return jsonify({"erro": "Erro ao processar os dados da requisição"}), 400
        
        # Conectar ao banco de dados
        connection = get_db_connection()
        if not connection:
            print("[ERRO] Falha ao conectar ao banco de dados")
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
            
        cursor = connection.cursor(dictionary=True)
        
        try:
            # Iniciar transação
            cursor.execute("START TRANSACTION")
            
            # Verificar se o exame existe e pode ser cancelado
            cursor.execute("""
                SELECT e.*, u.nome as nome_paciente, u.cpf as cpf_paciente, 
                       m.nome as nome_medico, e.horario as hora_exame
                FROM exames e
                LEFT JOIN usuarios u ON e.usuario_id = u.id
                LEFT JOIN medicos m ON e.medico_id = m.id
                WHERE e.id = %s AND e.ativo = 1
                FOR UPDATE
            """, (exame_id,))
            
            exame = cursor.fetchone()
            
            if not exame:
                raise Exception("Exame não encontrado ou já cancelado")
                
            print(f"[DEBUG] Exame encontrado - ID: {exame['id']}, Status atual: {exame.get('status', 'N/A')}")
            
            # Obter as observações atuais para não sobrescrevê-las
            observacoes_atuais = exame.get('observacoes', '')
            
            # Formatar a mensagem de cancelamento
            data_hora = datetime.datetime.now().strftime('%d/%m/%Y %H:%M')
            mensagem_cancelamento = f"[CANCELADO EM: {data_hora} POR USUÁRIO_ID: {usuario_id}] Motivo: {motivo}"
            
            # Concatenar com as observações existentes, se houver
            if observacoes_atuais and observacoes_atuais.strip():
                nova_observacao = f"{observacoes_atuais}\n{mensagem_cancelamento}"
            else:
                nova_observacao = mensagem_cancelamento
            
            # Atualizar o exame na tabela exames
            cursor.execute("""
                UPDATE exames 
                SET status = 'Cancelado',
                    ativo = 0,
                    motivo = %s,
                    observacoes = %s
                WHERE id = %s
            """, (motivo, nova_observacao, exame_id))
            
            # Verificar se alguma linha foi afetada
            if cursor.rowcount == 0:
                raise Exception("Nenhum exame foi atualizado. Verifique se o ID está correto e se o exame está ativo.")
            
            # Commit da transação
            connection.commit()
            print("[DEBUG] Exame cancelado com sucesso no banco de dados")
            
            # Buscar os dados atualizados do exame para retornar
            cursor.execute("""
                SELECT e.*, u.nome as nome_paciente, u.cpf as cpf_paciente,
                       m.nome as nome_medico, e.horario as hora_exame
                FROM exames e
                LEFT JOIN usuarios u ON e.usuario_id = u.id
                LEFT JOIN medicos m ON e.medico_id = m.id
                WHERE e.id = %s
            """, (exame_id,))
            
            exame_atualizado = cursor.fetchone()
            
            # Converter o objeto timedelta para string antes de serializar para JSON
            exame_serializavel = {}
            for key, value in exame_atualizado.items():
                if isinstance(value, datetime.timedelta):
                    exame_serializavel[key] = str(value)
                elif isinstance(value, datetime.time):
                    exame_serializavel[key] = value.strftime('%H:%M:%S')
                elif isinstance(value, datetime.date):
                    exame_serializavel[key] = value.isoformat()
                elif isinstance(value, datetime.datetime):
                    exame_serializavel[key] = value.isoformat()
                else:
                    exame_serializavel[key] = value
            
            return jsonify({
                "mensagem": "Exame cancelado com sucesso",
                "exame_id": exame_id,
                "status": "Cancelado",
                "observacoes": nova_observacao,
                "exame": exame_serializavel
            }), 200
            
        except Exception as e:
            if connection and connection.is_connected():
                connection.rollback()
            print(f"[ERRO] Erro ao processar cancelamento do exame: {str(e)}")
            return jsonify({"erro": f"Erro ao cancelar o exame: {str(e)}"}), 500
            
        finally:
            if cursor:
                cursor.close()
    
    except Exception as e:
        print(f"[ERRO CRÍTICO] {str(e)}")
        if connection and connection.is_connected():
            connection.rollback()
            print("[DEBUG] Rollback realizado")
        print(f"Erro ao processar requisição: {str(e)}")
        return jsonify({"erro": f"Erro ao processar a requisição: {str(e)}"}), 500
        
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/api/exames/<int:exame_id>', methods=['GET'])
@login_required
def obter_exame(exame_id):
    """
    Obtém os detalhes de um exame específico.
    """
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
            
        cursor = connection.cursor(dictionary=True)
        
        # Buscar detalhes do exame com informações do paciente e médico
        cursor.execute("""
            SELECT 
                e.*, 
                u.nome as nome_paciente, 
                u.cpf as cpf_paciente,
                u.data_nascimento as data_nascimento_paciente,
                u.telefone as telefone_paciente,
                u.email as email_paciente,
                m.nome as nome_medico,
                m.crm as crm,
                m.especialidade as especialidade_medico
            FROM exames e
            LEFT JOIN usuarios u ON e.usuario_id = u.id
            LEFT JOIN medicos m ON e.medico_id = m.id
            WHERE e.id = %s AND e.ativo = 1
        """, (exame_id,))
        
        exame = cursor.fetchone()
        
        if not exame:
            return jsonify({"erro": "Exame não encontrado ou inativo"}), 404
        
        # Converter tipos de data/hora para string
        if 'data_exame' in exame and exame['data_exame']:
            exame['data_exame'] = exame['data_exame'].isoformat()
        if 'horario' in exame and exame['horario']:
            exame['horario'] = str(exame['horario'])
        if 'data_nascimento_paciente' in exame and exame['data_nascimento_paciente']:
            exame['data_nascimento_paciente'] = exame['data_nascimento_paciente'].isoformat()
        if 'data_criacao' in exame and exame['data_criacao']:
            exame['data_criacao'] = exame['data_criacao'].isoformat()
        if 'data_atualizacao' in exame and exame['data_atualizacao']:
            exame['data_atualizacao'] = exame['data_atualizacao'].isoformat()
        
        # Remover campos sensíveis ou desnecessários
        campos_remover = ['senha', 'senha_hash', 'token_recuperacao', 'data_expiracao_token']
        for campo in campos_remover:
            exame.pop(campo, None)
        
        return jsonify(exame), 200
        
    except Exception as e:
        print(f"Erro ao obter detalhes do exame: {str(e)}")
        return jsonify({"erro": f"Erro ao obter detalhes do exame: {str(e)}"}), 500
        
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/api/exames', methods=['GET', 'POST'])
def gerenciar_exames():
    connection = None
    cursor = None
    
    try:
        if request.method == 'GET':
            # Obter parâmetros de consulta
            data = request.args.get('data')
            
            connection = get_db_connection()
            if not connection:
                return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
                
            cursor = connection.cursor(dictionary=True)
            
            # Construir a consulta base
            query = """
                SELECT e.*, u.nome as nome_paciente, m.nome as nome_medico
                FROM exames e
                LEFT JOIN usuarios u ON e.usuario_id = u.id
                LEFT JOIN medicos m ON e.medico_id = m.id
                WHERE e.ativo = 1
            """
            
            # Adicionar filtro de data se fornecido
            params = []
            if data:
                query += " AND DATE(e.data_exame) = %s"
                params.append(data)
            
            # Ordenar por data e horário
            query += " ORDER BY e.data_exame, e.horario"
            
            # Executar a consulta
            cursor.execute(query, params)
            exames = cursor.fetchall()
            
            # Converter objetos date e time para strings
            for exame in exames:
                if 'data_exame' in exame and exame['data_exame']:
                    if isinstance(exame['data_exame'], str):
                        # Se já for string, verificar se está no formato correto
                        try:
                            data_obj = datetime.datetime.strptime(exame['data_exame'], '%Y-%m-%d').date()
                            exame['data_exame'] = data_obj.isoformat()
                        except ValueError:
                            # Se não estiver no formato esperado, manter como está
                            pass
                    else:
                        exame['data_exame'] = exame['data_exame'].isoformat()
                
                if 'horario' in exame and exame['horario']:
                    if isinstance(exame['horario'], str):
                        # Se já for string, verificar se está no formato correto
                        try:
                            hora_obj = datetime.datetime.strptime(exame['horario'], '%H:%M:%S').time()
                            exame['horario'] = hora_obj.strftime('%H:%M:%S')
                        except ValueError:
                            # Se não estiver no formato esperado, manter como está
                            pass
                    else:
                        exame['horario'] = str(exame['horario'])
            
            return jsonify(exames)
            
        elif request.method == 'POST':
            # Marcar novo exame
            data = request.json
            print("Dados recebidos para marcação de exame:", data)

            connection = get_db_connection()
            if not connection:
                return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

            # Inserir o exame
            cursor = connection.cursor(dictionary=True)  # Adicionando dictionary=True
            query = """
                INSERT INTO exames (
                    tipo_exame, especificacao, medico_id, usuario_id, data_exame, 
                    horario, preparacao, observacoes, status, ativo
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'Agendado', 1)
            """
            valores = (
                data['tipo_exame'],
                data['especificacao'],
                data['medico_id'],
                data['usuario_id'],
                data['data_exame'],
                data['horario'],
                data.get('preparacao', None),
                data.get('observacoes', None)
            )

            cursor.execute(query, valores)
            id_exame_agendado = cursor.lastrowid
            connection.commit()
            
            # Buscar informações do usuário
            cursor.execute("SELECT email, nome FROM usuarios WHERE id = %s", (data['usuario_id'],))
            usuario_result = cursor.fetchone()
            print(f"Dados do usuário: {usuario_result}")  # Log para debug
            
            # Buscar informações do médico
            cursor.execute("SELECT nome FROM medicos WHERE id = %s", (data['medico_id'],))
            medico_result = cursor.fetchone()
            print(f"Dados do médico: {medico_result}")  # Log para debug
            
            # Verificar se os dados foram encontrados
            if not usuario_result or not medico_result:
                print("Erro: Usuário ou médico não encontrado")
                return jsonify({"erro": "Dados do usuário ou médico não encontrados"}), 404
                
            # Extrair os valores necessários
            usuario = {
                'email': usuario_result[1] if isinstance(usuario_result, (list, tuple)) else usuario_result['email'],
                'nome': usuario_result[0] if isinstance(usuario_result, (list, tuple)) else usuario_result['nome']
            }
            
            medico = {
                'nome': medico_result[0] if isinstance(medico_result, (list, tuple)) else medico_result['nome']
            }
            
            # Enviar e-mail de confirmação
            try:
                # Formatar a data para exibição
                data_obj = datetime.datetime.strptime(str(data['data_exame']), '%Y-%m-%d')
                data_formatada = data_obj.strftime('%d/%m/%Y')
                
                msg = Message(
                    'Agendamento de Exame Confirmado! ✅',
                    recipients=[usuario['email']]
                )
                
                preparo_texto = {
                    'jejum-4': '4 horas de jejum',
                    'jejum-8': '8 horas de jejum',
                    'jejum-12': '12 horas de jejum',
                    'repouso': 'Repouso de 24 horas antes do exame',
                    'dieta': 'Dieta especial nas 24 horas anteriores',
                    'outro': 'Siga as instruções fornecidas pelo médico'
                }.get(data.get('preparacao', ''), 'Nenhuma preparação especial necessária.')
                
                msg.body = f'''Agendamento de Exame Confirmado! ✅

Olá {usuario['nome']},

Seu exame foi agendado com sucesso. Agradecemos por escolher a Clínica Vida e Saúde!

Detalhes do Exame
Tipo de Exame: {data['tipo_exame']}
Especificação: {data['especificacao']}
Médico(a): {medico['nome']}
Data: {data_formatada}
Horário: {data['horario']}

Preparação: {preparo_texto}

Informações da Clínica
📍 Localização:

Rua Marcolino De Lazarin Souza, 123 - Centro de Catuba

📞 Contato:

(41) 4002-8922

⏰ Horário de Atendimento:

Segunda a Sexta: 08:00 - 19:00
Sábado: 08:00 - 12:00

Por favor, chegue com 15 minutos de antecedência para realizar o check-in.

Observações: {data.get('observacoes', 'Nenhuma observação fornecida.')}

Em caso de dúvidas ou necessidade de reagendamento, entre em contato conosco através do telefone ou e-mail de contato.

Atenciosamente,
Equipe Clínica Vida e Saúde

---
Este é um e-mail automático, por favor não responda.'''
                
                mail.send(msg)
                print("E-mail de confirmação de exame enviado com sucesso!")
                
            except Exception as email_error:
                print(f"Erro ao enviar e-mail de confirmação: {str(email_error)}")
                # Não interrompe o fluxo se o e-mail falhar

            return jsonify({"mensagem": "Exame marcado com sucesso!", "id_exame": id_exame_agendado}), 201
            
    except Exception as e:
        print(f"Erro na rota /api/exames {request.method}:", str(e))
        return jsonify({"erro": f"Erro ao processar requisição: {str(e)}"}), 500
        
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()



@app.route('/api/exames/<int:exame_id>/finalizar', methods=['POST'])
def finalizar_exame(exame_id):
    print(f"[DEBUG] Iniciando finalização do exame ID: {exame_id}")
    connection = None
    cursor = None
    try:
        # Obter dados da requisição
        data = request.json or {}
        observacoes = data.get('observacoes', '')
        print(f"[DEBUG] Dados recebidos: {data}")
        
        connection = get_db_connection()
        if not connection:
            print("[ERRO] Falha ao conectar ao banco de dados")
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)
        
        # Primeiro, obter os dados atuais do exame para registro
        print(f"[DEBUG] Buscando exame ID: {exame_id}")
        cursor.execute("SELECT * FROM exames WHERE id = %s", (exame_id,))
        exame = cursor.fetchone()
        
        if not exame:
            print(f"[ERRO] Exame {exame_id} não encontrado")
            return jsonify({"erro": "Exame não encontrado"}), 404
        
        print(f"[DEBUG] Dados atuais do exame: {exame}")
            
        # Atualizar o exame para marcá-lo como realizado
        query = """
            UPDATE exames 
            SET status = 'Realizado', 
                ativo = 1,
                obs_enfermagem = %s,
                data_exame = CURDATE(),
                horario = CURTIME()
            WHERE id = %s
        """
        
        print(f"[DEBUG] Executando query: {query}")
        print(f"[DEBUG] Parâmetros: observacoes={observacoes}, exame_id={exame_id}")
        
        cursor.execute(query, (observacoes, exame_id))
        
        # Se necessário, você pode adicionar aqui o registro em uma tabela de histórico
        # mas como mencionado, não estamos usando a tabela historico_exames
        
        connection.commit()
        print(f"[DEBUG] Exame {exame_id} finalizado com sucesso")

        return jsonify({
            "mensagem": "Exame finalizado com sucesso!",
            "exame_id": exame_id
        }), 200
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"[ERRO] Erro ao finalizar exame: {str(e)}")
        print(f"[ERRO] Traceback completo:\n{error_traceback}")
        
        if connection and connection.is_connected():
            try:
                connection.rollback()
                print("[DEBUG] Rollback realizado com sucesso")
            except Exception as rollback_error:
                print(f"[ERRO] Falha ao fazer rollback: {str(rollback_error)}")
        
        return jsonify({
            "erro": "Erro ao finalizar exame",
            "detalhes": str(e),
            "tipo": type(e).__name__,
            "traceback": error_traceback.split('\n') if app.debug else None
        }), 500
        
    finally:
        try:
            if cursor:
                cursor.close()
                print("[DEBUG] Cursor fechado com sucesso")
            if connection and connection.is_connected():
                connection.close()
                print("[DEBUG] Conexão com o banco de dados fechada com sucesso")
        except Exception as e:
            print(f"[AVISO] Erro ao fechar conexões: {str(e)}")

@app.route('/api/usuarios/<int:usuario_id>/consultas/realizadas', methods=['GET'])
def listar_consultas_realizadas(usuario_id):
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT 
                a.id,
                a.especialidade,
                a.data_consulta,
                a.horario,
                a.tipo_consulta,
                a.status,
                m.nome AS nome_medico
            FROM agendamentos a
            JOIN medicos m ON a.medico_id = m.id
            WHERE a.usuario_id = %s AND a.status = 'Concluído'
            ORDER BY a.data_consulta DESC
        """
        cursor.execute(query, (usuario_id,))
        consultas = cursor.fetchall()
        
        consultas_processadas = []
        for consulta in consultas:
            consulta_processada = {}
            for key, value in consulta.items():
                if value is None:
                    consulta_processada[key] = None
                elif isinstance(value, (str, int, float, bool)):
                    consulta_processada[key] = value
                elif isinstance(value, datetime.date):
                    consulta_processada[key] = value.strftime('%Y-%m-%d')
                elif isinstance(value, datetime.timedelta):
                    total_seconds = value.total_seconds()
                    hours = int(total_seconds // 3600)
                    minutes = int((total_seconds % 3600) // 60)
                    seconds = int(total_seconds % 60)
                    consulta_processada[key] = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
                elif hasattr(value, 'strftime'):
                    consulta_processada[key] = value.strftime('%Y-%m-%d %H:%M:%S')
                else:
                    try:
                        consulta_processada[key] = str(value)
                    except Exception:
                        consulta_processada[key] = None
            consultas_processadas.append(consulta_processada)

        return jsonify(consultas_processadas)
    except Exception as e:
        print("Erro ao listar consultas realizadas:", str(e))
        return jsonify({"erro": f"Erro ao listar consultas realizadas: {str(e)}"}), 500

@app.route('/api/usuarios/<int:usuario_id>/exames/realizados', methods=['GET'])
def listar_exames_realizados(usuario_id):
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT 
                e.id,
                e.tipo_exame,
                e.data_exame,
                e.horario, 
                e.status,
                m.nome AS nome_medico
            FROM exames e
            JOIN medicos m ON e.medico_id = m.id
            WHERE e.usuario_id = %s AND e.status = 'Realizado'
            ORDER BY e.data_exame DESC
        """
        cursor.execute(query, (usuario_id,))
        exames = cursor.fetchall()
        
        exames_processados = []
        for exame in exames:
            exame_processado = {}
            for key, value in exame.items():
                if value is None:
                    exame_processado[key] = None
                elif isinstance(value, (str, int, float, bool)):
                    exame_processado[key] = value
                elif isinstance(value, datetime.date):
                    exame_processado[key] = value.strftime('%Y-%m-%d')
                elif isinstance(value, datetime.timedelta):
                    total_seconds = value.total_seconds()
                    hours = int(total_seconds // 3600)
                    minutes = int((total_seconds % 3600) // 60)
                    seconds = int(total_seconds % 60)
                    exame_processado[key] = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
                elif hasattr(value, 'strftime'):
                    exame_processado[key] = value.strftime('%Y-%m-%d %H:%M:%S')
                else:
                    try:
                        exame_processado[key] = str(value)
                    except Exception:
                        exame_processado[key] = None
            exames_processados.append(exame_processado)

        return jsonify(exames_processados)
    except Exception as e:
        print("Erro ao listar exames realizados:", str(e))
        return jsonify({"erro": f"Erro ao listar exames realizados: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/medicos/<int:medico_id>/exames', methods=['GET'])
def listar_exames_medico(medico_id):
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT 
                e.id, 
                e.data_exame, 
                e.horario, 
                e.status, 
                u.nome AS paciente, 
                e.tipo_exame
            FROM exames e
            JOIN usuarios u ON e.usuario_id = u.id
            WHERE e.medico_id = %s AND e.ativo = 1
            ORDER BY e.data_exame, e.horario
        """
        cursor.execute(query, (medico_id,))
        exames = cursor.fetchall()
        
        exames_processados = []
        for exame in exames:
            exame_processado = {}
            for key, value in exame.items():
                if value is None:
                    exame_processado[key] = None
                elif isinstance(value, (str, int, float, bool)):
                    exame_processado[key] = value
                elif isinstance(value, datetime.date):
                    exame_processado[key] = value.strftime('%Y-%m-%d')
                elif isinstance(value, datetime.timedelta):
                    total_seconds = value.total_seconds()
                    hours = int(total_seconds // 3600)
                    minutes = int((total_seconds % 3600) // 60)
                    seconds = int(total_seconds % 60)
                    exame_processado[key] = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
                elif hasattr(value, 'strftime'):
                    exame_processado[key] = value.strftime('%Y-%m-%d %H:%M:%S')
                else:
                    try:
                        exame_processado[key] = str(value)
                    except Exception:
                        exame_processado[key] = None
            exames_processados.append(exame_processado)

        return jsonify(exames_processados), 200
    except Exception as e:
        print("Erro ao listar exames do médico:", str(e))
        return jsonify({"erro": f"Erro ao listar exames do médico: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()


@app.route('/api/exames/<int:exame_id>', methods=['PUT'])
def atualizar_exame(exame_id):
    try:
        data_payload = request.json
        print(f"Dados recebidos para atualização do exame {exame_id}: {data_payload}")

        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor()
        query = """
            UPDATE exames
            SET data_exame = %s, 
                horario = %s,
                tipo_exame = %s,
                observacoes = %s
            WHERE id = %s
        """
        valores = (
            data_payload.get('data_exame'),
            data_payload.get('horario'),
            data_payload.get('tipo_exame'),
            data_payload.get('observacoes', None),
            exame_id
        )
        
        cursor.execute(query, valores)
        connection.commit()

        return jsonify({"mensagem": "Exame atualizado com sucesso!"}), 200
        
    except KeyError as e:
        print(f"Erro de chave ao atualizar exame: {str(e)} - Payload: {data_payload}")
        return jsonify({"erro": f"Campo ausente nos dados da requisição: {str(e)}"}), 400
    except Exception as e:
        print(f"Erro ao atualizar exame: {str(e)} - Payload: {data_payload}")
        return jsonify({"erro": f"Erro ao atualizar exame: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/pacientes/<int:paciente_id>/consultas', methods=['GET'])
def listar_consultas_paciente_endpoint(paciente_id):
    """
    Lista todas as consultas de um paciente específico.
    Retorna o histórico de consultas com informações detalhadas.
    """
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
            
        cursor = connection.cursor(dictionary=True)
        
        # Verificar se o paciente existe
        cursor.execute("SELECT id FROM usuarios WHERE id = %s", (paciente_id,))
        if not cursor.fetchone():
            return jsonify({"erro": "Paciente não encontrado"}), 404
        
        # Consulta para obter as consultas do paciente
        query = """
            SELECT 
                a.id,
                a.data_consulta,
                a.horario,
                a.tipo_consulta,
                a.status,
                a.especialidade,
                a.observacoes,
                m.nome as nome_medico,
                m.especialidade as especialidade_medico
            FROM agendamentos a
            JOIN medicos m ON a.medico_id = m.id
            WHERE a.usuario_id = %s
            AND a.status = 'Concluído'
            ORDER BY a.data_consulta DESC, a.horario DESC
        """
        
        cursor.execute(query, (paciente_id,))
        consultas = cursor.fetchall()
        
        # Processar os resultados
        consultas_processadas = []
        for consulta in consultas:
            consulta_processada = {}
            for key, value in consulta.items():
                if value is None:
                    consulta_processada[key] = None
                elif isinstance(value, (str, int, float, bool)):
                    consulta_processada[key] = value
                elif isinstance(value, datetime.date):
                    consulta_processada[key] = value.isoformat()
                elif hasattr(value, 'strftime'):
                    consulta_processada[key] = value.strftime('%Y-%m-%d %H:%M:%S')
                else:
                    consulta_processada[key] = str(value)
            consultas_processadas.append(consulta_processada)
        
        return jsonify(consultas_processadas), 200
        
    except Exception as e:
        print(f"[ERRO] Erro ao listar consultas do paciente: {str(e)}")
        return jsonify({"erro": f"Erro ao listar consultas: {str(e)}"}), 500
        
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()


@app.route('/api/pacientes/<int:paciente_id>/exames', methods=['GET'])
def listar_exames_paciente_endpoint(paciente_id):
    """
    Lista todos os exames de um paciente específico.
    Retorna o histórico de exames com informações detalhadas.
    """
    print(f"\n[DEBUG] ===== INÍCIO listar_exames_paciente_endpoint para paciente_id: {paciente_id} =====")
    try:
        print("[DEBUG] Obtendo conexão com o banco de dados...")
        connection = get_db_connection()
        if not connection:
            print("[ERRO CRÍTICO] Falha ao conectar ao banco de dados")
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
            
        cursor = connection.cursor(dictionary=True)
        print("[DEBUG] Conexão com o banco de dados estabelecida com sucesso")
        
        # Verificar se o paciente existe
        print(f"[DEBUG] Verificando se o paciente {paciente_id} existe na tabela usuarios...")
        cursor.execute("SELECT id, nome FROM usuarios WHERE id = %s", (paciente_id,))
        paciente = cursor.fetchone()
        if not paciente:
            print(f"[ERRO] Paciente com ID {paciente_id} não encontrado na tabela usuarios")
            return jsonify({"erro": "Paciente não encontrado"}), 404
            
        print(f"[DEBUG] Paciente encontrado: ID={paciente['id']}, Nome={paciente.get('nome', 'N/A')}")
        
        # Consulta para obter os exames do paciente
        print("\n[DEBUG] ===== PREPARANDO CONSULTA SQL =====")
        query = """
            SELECT 
                e.id,
                e.tipo_exame,
                e.especificacao as especificacao,
                e.data_exame,
                e.horario,
                e.status,
                e.obs_enfermagem,
                e.medico_id,
                -- Por enquanto, vamos definir tem_resultado como 0 por padrão
                -- já que não temos a tabela de arquivos
                0 as tem_resultado,
                COALESCE(m.nome, 'Médico não especificado') as nome_medico,
                COALESCE(m.especialidade, 'Especialidade não informada') as especialidade
            FROM exames e
            LEFT JOIN medicos m ON e.medico_id = m.id
            WHERE e.usuario_id = %s
            AND e.status = 'Realizado'
            ORDER BY e.data_exame DESC, e.horario DESC
        """
        
        print(f"[DEBUG] Query SQL que será executada:")
        print(query)
        print(f"[DEBUG] Parâmetro paciente_id: {paciente_id}")
        
        try:
            print("\n[DEBUG] ===== EXECUTANDO CONSULTA SQL =====")
            cursor.execute(query, (paciente_id,))
            exames = cursor.fetchall()
            print(f"[DEBUG] Consulta executada com sucesso. {len(exames)} exames encontrados.")
            
            # Log dos primeiros 2 exames para depuração
            for i, exame in enumerate(exames[:2], 1):
                print(f"\n[DEBUG] Exemplo de exame {i} (ID: {exame.get('id')}):")
                for key, value in exame.items():
                    print(f"  - {key}: {value}")
            if len(exames) > 2:
                print(f"[DEBUG] ... mais {len(exames) - 2} exames não mostrados ...")
        except Exception as e:
            print(f"[ERRO] Erro ao executar a consulta SQL: {str(e)}")
            print(f"[ERRO] Query: {query}")
            print(f"[ERRO] Parâmetros: paciente_id={paciente_id}")
            raise
        
        # Processar os resultados
        print("[DEBUG] Iniciando processamento dos resultados dos exames")
        exames_processados = []
        
        for idx, exame in enumerate(exames, 1):
            try:
                print(f"[DEBUG] Processando exame {idx}/{len(exames)} - ID: {exame.get('id')}")
                exame_processado = {}
                
                for key, value in exame.items():
                    try:
                        if value is None:
                            exame_processado[key] = None
                        elif isinstance(value, (str, int, float, bool)):
                            exame_processado[key] = value
                        elif isinstance(value, datetime.date):
                            exame_processado[key] = value.isoformat()
                        elif hasattr(value, 'strftime'):
                            exame_processado[key] = value.strftime('%Y-%m-%d %H:%M:%S')
                        else:
                            exame_processado[key] = str(value)
                    except Exception as e:
                        print(f"[ERRO] Erro ao processar campo '{key}': {str(e)}")
                        exame_processado[key] = f"[ERRO: {str(e)[:50]}]"
                
                # Adicionar URL para o resultado do exame se existir
                if exame_processado.get('tem_resultado'):
                    exame_processado['resultado_url'] = f"/api/exames/{exame_processado['id']}/resultado"
                
                exames_processados.append(exame_processado)
                print(f"[DEBUG] Exame {idx} processado com sucesso")
                
            except Exception as e:
                print(f"[ERRO] Erro ao processar exame {idx}: {str(e)}")
                print(f"[DEBUG] Dados do exame com erro: {exame}")
                continue
        
        return jsonify(exames_processados), 200
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"[ERRO CRÍTICO] Erro ao listar exames do paciente: {str(e)}")
        print(f"[ERRO CRÍTICO] Traceback completo:\n{error_traceback}")
        
        # Tentar obter mais informações sobre o erro
        error_info = {
            "erro": "Erro ao listar exames",
            "tipo": str(type(e).__name__),
            "mensagem": str(e),
            "traceback": error_traceback.split('\n') if app.debug else None
        }
        
        return jsonify(error_info), 500
        
    finally:
        if 'cursor' in locals() and cursor is not None:
            cursor.close()
        if 'connection' in locals() and connection.is_connected():
            connection.close()

@app.route('/api/pacientes/<int:paciente_id>/prontuario', methods=['GET'])
def obter_prontuario(paciente_id):
    """
    Obtém o prontuário de um paciente específico.
    """
    print(f"[DEBUG] Obtendo prontuário para o paciente ID: {paciente_id}")
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
            
        cursor = connection.cursor(dictionary=True)
        
        # Verificar se o paciente existe
        cursor.execute("SELECT id, nome FROM usuarios WHERE id = %s", (paciente_id,))
        paciente = cursor.fetchone()
        if not paciente:
            return jsonify({"erro": "Paciente não encontrado"}), 404
        
        # Buscar o prontuário do paciente
        cursor.execute("""
            SELECT p.*, m.nome as medico_nome, m.especialidade as medico_especialidade
            FROM prontuarios p
            JOIN medicos m ON p.medico_id = m.id
            WHERE p.paciente_id = %s
        """, (paciente_id,))
        
        prontuario = cursor.fetchone()
        
        if not prontuario:
            # Se não existir um prontuário, retornar um objeto vazio
            return jsonify({
                "paciente_id": paciente_id,
                "paciente_nome": paciente['nome'],
                "historico_medico": "",
                "historico_familiar": "",
                "alergias": "",
                "medicamentos_uso_continuo": "",
                "observacoes": "",
                "data_criacao": None,
                "ultima_atualizacao": None,
                "medico_nome": None,
                "medico_especialidade": None
            }), 200
            
        return jsonify(prontuario), 200
        
    except Exception as e:
        print(f"[ERRO] Erro ao obter prontuário: {str(e)}")
        return jsonify({"erro": f"Erro ao obter prontuário: {str(e)}"}), 500
        
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/api/pacientes/<int:paciente_id>/prontuario', methods=['POST'])
def salvar_prontuario(paciente_id):
    """
    Salva ou atualiza o prontuário de um paciente.
    """
    print(f"[DEBUG] Salvando prontuário para o paciente ID: {paciente_id}")
    
    # Obter dados do JSON da requisição
    data = request.json
    if not data:
        return jsonify({"erro": "Dados não fornecidos"}), 400
        
    # Validar campos obrigatórios
    campos_obrigatorios = ['medico_id', 'historico_medico', 'historico_familiar', 
                          'alergias', 'medicamentos_uso_continuo', 'observacoes']
    
    for campo in campos_obrigatorios:
        if campo not in data:
            return jsonify({"erro": f"Campo obrigatório ausente: {campo}"}), 400
    
    connection = None
    cursor = None
    
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
            
        cursor = connection.cursor(dictionary=True)
        
        # Verificar se o paciente existe
        cursor.execute("SELECT id FROM usuarios WHERE id = %s", (paciente_id,))
        if not cursor.fetchone():
            return jsonify({"erro": "Paciente não encontrado"}), 404
            
        # Verificar se o médico existe
        cursor.execute("SELECT id FROM medicos WHERE id = %s", (data['medico_id'],))
        if not cursor.fetchone():
            return jsonify({"erro": "Médico não encontrado"}), 404
        
        # Verificar se já existe um prontuário para este paciente
        cursor.execute("SELECT id FROM prontuarios WHERE paciente_id = %s", (paciente_id,))
        prontuario_existente = cursor.fetchone()
        
        if prontuario_existente:
            # Atualizar prontuário existente
            query = """
                UPDATE prontuarios 
                SET medico_id = %s, 
                    historico_medico = %s, 
                    historico_familiar = %s, 
                    alergias = %s, 
                    medicamentos_uso_continuo = %s, 
                    observacoes = %s,
                    ultima_atualizacao = NOW()
                WHERE paciente_id = %s
            """
            cursor.execute(query, (
                data['medico_id'],
                data['historico_medico'],
                data['historico_familiar'],
                data['alergias'],
                data['medicamentos_uso_continuo'],
                data['observacoes'],
                paciente_id
            ))
            mensagem = "Prontuário atualizado com sucesso"
        else:
            # Inserir novo prontuário
            query = """
                INSERT INTO prontuarios 
                (paciente_id, medico_id, historico_medico, historico_familiar, 
                 alergias, medicamentos_uso_continuo, observacoes)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(query, (
                paciente_id,
                data['medico_id'],
                data['historico_medico'],
                data['historico_familiar'],
                data['alergias'],
                data['medicamentos_uso_continuo'],
                data['observacoes']
            ))
            mensagem = "Prontuário criado com sucesso"
        
        connection.commit()
        
        # Buscar os dados atualizados do prontuário
        cursor.execute("""
            SELECT p.*, m.nome as medico_nome, m.especialidade as medico_especialidade
            FROM prontuarios p
            JOIN medicos m ON p.medico_id = m.id
            WHERE p.paciente_id = %s
        """, (paciente_id,))
        
        prontuario = cursor.fetchone()
        
        return jsonify({
            "mensagem": mensagem,
            "prontuario": prontuario
        }), 200
        
    except Exception as e:
        if connection and connection.is_connected():
            connection.rollback()
        print(f"[ERRO] Erro ao salvar prontuário: {str(e)}")
        return jsonify({"erro": f"Erro ao salvar prontuário: {str(e)}"}), 500
        
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/api/exames/<int:exame_id>/resultado', methods=['GET'])
def visualizar_resultado_exame(exame_id):
    """
    Retorna o arquivo de resultado de um exame específico.
    """
    connection = None
    cursor = None
    
    try:
        print(f"[DEBUG] Solicitado resultado do exame ID: {exame_id}")
        
        # Verificar se o exame existe e se o usuário tem permissão para visualizá-lo
        connection = get_db_connection()
        if not connection:
            print("[ERRO] Falha ao conectar ao banco de dados")
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
            
        cursor = connection.cursor(dictionary=True)
        
        # Obter informações do exame
        cursor.execute("""
            SELECT e.resultado, e.resultado_nome_arquivo, e.usuario_id
            FROM exames e
            WHERE e.id = %s AND e.status = 'Realizado'
        """, (exame_id,))
        
        exame = cursor.fetchone()
        if not exame:
            print(f"[ERRO] Exame {exame_id} não encontrado ou não está realizado")
            return jsonify({"erro": "Exame não encontrado ou não disponível"}), 404
        
        # Verificar se o exame tem um resultado anexado
        if not exame.get('resultado'):
            print(f"[ERRO] Exame {exame_id} não possui resultado anexado")
            return jsonify({"erro": "Resultado não disponível para este exame"}), 404
        
        # Retornar o arquivo de resultado
        from io import BytesIO
        import base64
        
        # Decodificar o conteúdo do arquivo (assumindo que está em base64)
        try:
            file_content = base64.b64decode(exame['resultado'])
            filename = exame.get('resultado_nome_arquivo', f'resultado_exame_{exame_id}.pdf')
            
            from flask import send_file
            return send_file(
                BytesIO(file_content),
                as_attachment=True,
                download_name=filename,
                mimetype='application/pdf'
            )
            
        except Exception as e:
            print(f"[ERRO] Erro ao processar arquivo do exame {exame_id}: {str(e)}")
            return jsonify({"erro": "Erro ao processar o arquivo do exame"}), 500
            
    except Exception as e:
        print(f"[ERRO] Erro ao buscar resultado do exame: {str(e)}")
        return jsonify({"erro": "Erro ao buscar resultado do exame"}), 500
        
    finally:
        try:
            if cursor is not None:
                cursor.close()
            if connection is not None and connection.is_connected():
                connection.close()
        except Exception as e:
            print(f"[AVISO] Erro ao fechar conexão com o banco de dados: {str(e)}")



@app.route('/api/medicos/<int:medico_id>/consultas', methods=['GET'])
def listar_consultas_medico(medico_id):
    print(f"[DEBUG] Buscando consultas para o médico ID: {medico_id}")
    try:
        connection = get_db_connection()
        if not connection:
            print("[ERRO] Falha ao conectar ao banco de dados")
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)
        print("[DEBUG] Conexão com o banco de dados estabelecida")
        
        # verifique se o médico existe
        cursor.execute("SELECT id FROM medicos WHERE id = %s", (medico_id,))
        if not cursor.fetchone():
            print(f"[ERRO] Médico com ID {medico_id} não encontrado")
            return jsonify({"erro": "Médico não encontrado"}), 404
            
        print("[DEBUG] Médico encontrado, buscando consultas...")
        
        query = """
            SELECT 
                a.id,
                a.data_consulta,
                a.horario,
                a.status,
                a.tipo_consulta,
                u.nome as nome_paciente
            FROM agendamentos a
            JOIN usuarios u ON a.usuario_id = u.id
            WHERE a.medico_id = %s AND a.status != 'Cancelado'
            ORDER BY a.data_consulta, a.horario
        """
        print("[DEBUG] Executando query:", query.replace('%s', str(medico_id)))
        cursor.execute(query, (medico_id,))
        consultas = cursor.fetchall()
        print(f"[DEBUG] {len(consultas)} consultas encontradas")
        
        consultas_processadas = []
        for consulta in consultas:
            try:
                consulta_processada = {}
                for key, value in consulta.items():
                    if value is None:
                        consulta_processada[key] = None
                    elif isinstance(value, datetime.date):
                        consulta_processada[key] = value.isoformat()
                    elif isinstance(value, (datetime.datetime, datetime.time)):
                        consulta_processada[key] = value.isoformat(timespec='minutes')
                    elif isinstance(value, (int, float, str, bool)):
                        consulta_processada[key] = value
                    else:
                        consulta_processada[key] = str(value)
                consultas_processadas.append(consulta_processada)
            except Exception as e:
                print(f"[ERRO] Erro ao processar consulta {consulta.get('id', 'desconhecido')}: {str(e)}")
        
        print("[DEBUG] Retornando consultas processadas")
        return jsonify(consultas_processadas), 200
        
    except Exception as e:
        import traceback
        error_msg = f"Erro ao listar consultas do médico: {str(e)}\n{traceback.format_exc()}"
        print(f"[ERRO CRÍTICO] {error_msg}")
        return jsonify({"erro": f"Erro ao listar consultas: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()
            print("[DEBUG] Conexão com o banco de dados fechada")

@app.route('/api/medicos/<int:medico_id>', methods=['GET'])
def obter_dados_medico(medico_id):
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT id, nome, cpf, crm, especialidade, email, telefone, 
                   cep, endereco, numero, bairro, cidade, estado,
                   email_confirmado, ativo, COALESCE(atendimentos_realizados, 0) as atendimentos_realizados
            FROM medicos
            WHERE id = %s
        """
        cursor.execute(query, (medico_id,))
        medico = cursor.fetchone()
        
        if not medico:
            return jsonify({"erro": "Médico não encontrado"}), 404
            

        if 'data_cadastro' in medico and medico['data_cadastro']:
            medico['data_cadastro'] = medico['data_cadastro'].isoformat()
            
        return jsonify(medico), 200
        
    except Exception as e:
        print("Erro ao obter dados do médico:", str(e))
        return jsonify({"erro": f"Erro ao obter dados do médico: {str(e)}"}), 500
def listar_consultas_medico(medico_id):
    try:
        print(f"[DEBUG] Iniciando listar_consultas_medico para medico_id: {medico_id}")
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT 
                a.id, 
                a.data_consulta, 
                a.horario, 
                a.status, 
                u.nome AS nome_paciente, 
                a.especialidade, 
                a.tipo_consulta,
                a.observacoes
            FROM agendamentos a
            JOIN usuarios u ON a.usuario_id = u.id
            WHERE a.medico_id = %s
            ORDER BY a.data_consulta, a.horario
        """
        cursor.execute(query, (medico_id,))
        consultas = cursor.fetchall()
        print(f"[DEBUG] Consultas encontradas: {len(consultas)}")
        
        # Lista para armazenar as consultas processadas
        consultas_processadas = []
               
        for i, consulta in enumerate(consultas):
            try:
                print(f"\n[DEBUG] Processando consulta {i+1}:")
                consulta_processada = {}
                
                # Copiar todos os campos da consulta original
                for key, value in consulta.items():
                    print(f"[DEBUG]   Campo: {key} (tipo: {type(value) if value is not None else 'None'})")
                    
                    if value is None:
                        consulta_processada[key] = None
                    elif isinstance(value, (str, int, float, bool)):
                        consulta_processada[key] = value
                    elif isinstance(value, datetime.date):
                        consulta_processada[key] = value.strftime('%Y-%m-%d')
                        print(f"[DEBUG]     Convertido data: {consulta_processada[key]}")
                    elif isinstance(value, datetime.timedelta):
                        total_seconds = value.total_seconds()
                        hours = int(total_seconds // 3600)
                        minutes = int((total_seconds % 3600) // 60)
                        seconds = int(total_seconds % 60)
                        consulta_processada[key] = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
                        print(f"[DEBUG]     Convertido timedelta: {consulta_processada[key]}")
                    elif hasattr(value, 'strftime'):
                        consulta_processada[key] = value.strftime('%Y-%m-%d %H:%M:%S')
                        print(f"[DEBUG]     Convertido com strftime: {consulta_processada[key]}")
                    else:
                        try:
                            consulta_processada[key] = str(value)
                            print(f"[DEBUG]     Convertido para string: {consulta_processada[key]}")
                        except Exception as e:
                            print(f"[DEBUG]     Erro ao converter campo {key}: {str(e)}")
                            consulta_processada[key] = None
                
                consultas_processadas.append(consulta_processada)
                print(f"[DEBUG]   Consulta processada: {consulta_processada}")
                
            except Exception as e:
                print(f"[DEBUG]   Erro ao processar consulta {i+1}: {str(e)}")
                continue
        
        print("\n[DEBUG] Retornando consultas processadas")
        return jsonify(consultas_processadas), 200
        
    except Exception as e:
        print("Erro ao listar consultas do médico:", str(e))
        return jsonify({"erro": f"Erro ao listar consultas do médico: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/consultas/<int:consulta_id>/concluir', methods=['POST'])
@app.route('/api/consultas/<int:consulta_id>/iniciar', methods=['POST'])
@login_required
def iniciar_consulta(consulta_id):
    """
    Registra o horário de início de uma consulta.
    """
    print(f"\n[DEBUG] Iniciando consulta ID: {consulta_id}")
    connection = None
    cursor = None
    
    try:
        print("[DEBUG] Obtendo conexão com o banco de dados...")
        connection = get_db_connection()
        if not connection:
            print("[ERRO] Falha ao conectar ao banco de dados")
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)
        
        # Verificar se a consulta existe e está agendada
        print(f"[DEBUG] Verificando consulta ID: {consulta_id}")
        query_consulta = """
            SELECT id, status, inicio_consulta, data_consulta, horario 
            FROM agendamentos 
            WHERE id = %s
        """
        print(f"[DEBUG] Executando query: {query_consulta} com ID: {consulta_id}")
        cursor.execute(query_consulta, (consulta_id,))
        
        consulta = cursor.fetchone()
        print(f"[DEBUG] Dados da consulta: {consulta}")
        
        if not consulta:
            print("[ERRO] Consulta não encontrada")
            return jsonify({"erro": "Consulta não encontrada"}), 404
            
        if consulta['status'] != 'Agendado':
            print(f"[ERRO] Status inválido: {consulta['status']}")
            return jsonify({"erro": "Apenas consultas agendadas podem ser iniciadas"}), 400
            
        if consulta['inicio_consulta'] is not None:
            print("[ERRO] Consulta já iniciada anteriormente")
            return jsonify({"erro": "Esta consulta já foi iniciada anteriormente"}), 400
        
        # Atualizar a consulta com o horário de início
        agora = datetime.datetime.now().time().strftime('%H:%M:%S')
        print(f"[DEBUG] Atualizando consulta com horário de início: {agora}")
        
        # Primeiro, vamos adicionar o status 'Em Andamento' ao ENUM se ele não existir
        try:
            print("[DEBUG] Verificando se o status 'Em Andamento' existe no ENUM")
            cursor.execute("""
                SELECT COLUMN_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'agendamentos' 
                AND COLUMN_NAME = 'status';
            """)
            
            enum_result = cursor.fetchone()
            if enum_result:
                enum_values = enum_result['COLUMN_TYPE'].decode('utf-8') if isinstance(enum_result['COLUMN_TYPE'], bytes) else enum_result['COLUMN_TYPE']
                print(f"[DEBUG] Valores atuais do ENUM: {enum_values}")
                
                if 'Em Andamento' not in enum_values:
                    print("[DEBUG] Adicionando 'Em Andamento' ao ENUM")
                    try:
                        cursor.execute("""
                            ALTER TABLE agendamentos 
                            MODIFY COLUMN status ENUM('Agendado', 'Em Andamento', 'Cancelado', 'Concluído') NOT NULL DEFAULT 'Agendado';
                        """)
                        connection.commit()
                        print("[DEBUG] ENUM atualizado com sucesso")
                    except Exception as alter_error:
                        print(f"[ERRO] Falha ao atualizar o ENUM: {str(alter_error)}")
                        # Se não conseguir alterar o ENUM, tenta atualizar diretamente com o status existente
                        print("[DEBUG] Tentando atualizar com status existente...")
                        query_update = """
                            UPDATE agendamentos 
                            SET inicio_consulta = %s
                            WHERE id = %s
                        """
                        cursor.execute(query_update, (agora, consulta_id))
                        connection.commit()
                        return jsonify({
                            "mensagem": "Consulta atualizada com sucesso",
                            "inicio_consulta": agora,
                            "status": consulta['status']
                        }), 200
        except Exception as e:
            print(f"[AVISO] Não foi possível atualizar o ENUM: {str(e)}")
            # Se houver erro na verificação do ENUM, continua com a atualização normal
        
        # Agora atualiza a consulta
        query_update = """
            UPDATE agendamentos 
            SET status = 'Em Andamento', 
                inicio_consulta = %s
            WHERE id = %s
        """
        print(f"[DEBUG] Executando update: {query_update} com valores: ({agora}, {consulta_id})")
        cursor.execute(query_update, (agora, consulta_id))
        
        connection.commit()
        print("[DEBUG] Commit realizado com sucesso")
        
        return jsonify({
            "mensagem": "Consulta iniciada com sucesso",
            "inicio_consulta": agora,
            "status": "Em Andamento"
        }), 200
        
    except Exception as e:
        print("\n[ERRO CRÍTICO] Erro ao iniciar consulta:", str(e))
        import traceback
        traceback.print_exc()
        if connection:
            connection.rollback()
        return jsonify({"erro": "Ocorreu um erro ao processar sua solicitação"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
            print("[DEBUG] Conexão com o banco de dados fechada")

@app.route('/api/consultas/<int:consulta_id>/encerrar', methods=['POST'])
@login_required
def encerrar_consulta(consulta_id):
    """
    Registra o horário de encerramento de uma consulta e a marca como concluída.
    """
    print(f"\n[DEBUG] Encerrando consulta ID: {consulta_id}")
    connection = None
    cursor = None
    
    try:
        print("[DEBUG] Obtendo conexão com o banco de dados...")
        connection = get_db_connection()
        if not connection:
            print("[ERRO] Falha ao conectar ao banco de dados")
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)
        
        # Verificar se a consulta existe e está em andamento
        query_consulta = """
            SELECT id, status, inicio_consulta, fim_consulta, data_consulta, horario 
            FROM agendamentos 
            WHERE id = %s
        """
        print(f"[DEBUG] Executando query: {query_consulta} com ID: {consulta_id}")
        cursor.execute(query_consulta, (consulta_id,))
        
        consulta = cursor.fetchone()
        print(f"[DEBUG] Dados da consulta: {consulta}")
        
        if not consulta:
            print("[ERRO] Consulta não encontrada")
            return jsonify({"erro": "Consulta não encontrada"}), 404
            
        if consulta['status'] != 'Em Andamento':
            print(f"[ERRO] Status inválido para encerramento: {consulta['status']}")
            return jsonify({"erro": "Apenas consultas em andamento podem ser encerradas"}), 400
            
        if consulta['fim_consulta'] is not None:
            print("[ERRO] Consulta já encerrada anteriormente")
            return jsonify({"erro": "Esta consulta já foi encerrada"}), 400
        
        # Verificar se o status 'Concluído' existe no ENUM
        try:
            print("[DEBUG] Verificando se o status 'Concluído' existe no ENUM")
            cursor.execute("""
                SELECT COLUMN_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'agendamentos' 
                AND COLUMN_NAME = 'status';
            """)
            
            enum_result = cursor.fetchone()
            if enum_result:
                enum_values = enum_result['COLUMN_TYPE'].decode('utf-8') if isinstance(enum_result['COLUMN_TYPE'], bytes) else enum_result['COLUMN_TYPE']
                print(f"[DEBUG] Valores atuais do ENUM: {enum_values}")
                
                if 'Concluído' not in enum_values:
                    print("[DEBUG] Adicionando 'Concluído' ao ENUM")
                    try:
                        cursor.execute("""
                            ALTER TABLE agendamentos 
                            MODIFY COLUMN status ENUM('Agendado', 'Em Andamento', 'Cancelado', 'Concluído') NOT NULL DEFAULT 'Agendado';
                        """)
                        connection.commit()
                        print("[DEBUG] ENUM atualizado com sucesso")
                    except Exception as alter_error:
                        print(f"[ERRO] Falha ao atualizar o ENUM: {str(alter_error)}")
                        print("[DEBUG] Tentando atualizar com status 'Cancelado'...")
                        # Se não conseguir atualizar o ENUM, usa 'Cancelado' como fallback
                        agora = datetime.datetime.now().time().strftime('%H:%M:%S')
                        query_update = """
                            UPDATE agendamentos 
                            SET status = 'Cancelado', 
                                fim_consulta = %s,
                                ativa = 0
                            WHERE id = %s
                        """
                        cursor.execute(query_update, (agora, consulta_id))
                        connection.commit()
                        return jsonify({
                            "mensagem": "Consulta encerrada com sucesso (status alterado para Cancelado)",
                            "fim_consulta": agora,
                            "status": "Cancelado"
                        }), 200
        except Exception as e:
            print(f"[AVISO] Não foi possível verificar o ENUM: {str(e)}")
        
        # Obter dados completos da consulta para o e-mail
        cursor.execute("""
            SELECT a.*, u.nome as nome_paciente, u.email as email_paciente, m.nome as nome_medico
            FROM agendamentos a
            JOIN usuarios u ON a.usuario_id = u.id
            JOIN medicos m ON a.medico_id = m.id
            WHERE a.id = %s
        """, (consulta_id,))
        
        consulta = cursor.fetchone()
        if not consulta:
            print("[ERRO] Dados da consulta não encontrados")
            return jsonify({"erro": "Dados da consulta não encontrados"}), 404
            
        # Verificar se a consulta já foi encerrada anteriormente
        if consulta['fim_consulta'] is not None:
            print("[AVISO] Consulta já foi encerrada anteriormente, pulando envio de e-mail")
            return jsonify({
                "mensagem": "Consulta já foi encerrada anteriormente",
                "fim_consulta": str(consulta['fim_consulta']),
                "status": consulta['status']
            }), 200
        
        # Atualizar a consulta com o horário de término e marcar como concluída
        agora = datetime.datetime.now().time().strftime('%H:%M:%S')
        print(f"[DEBUG] Atualizando consulta com horário de término: {agora}")
        
        try:
            query_update = """
                UPDATE agendamentos 
                SET status = 'Concluído', 
                    fim_consulta = %s,
                    ativa = 0
                WHERE id = %s
            """
            print(f"[DEBUG] Executando update: {query_update} com valores: ({agora}, {consulta_id})")
            cursor.execute(query_update, (agora, consulta_id))
            connection.commit()
            
            # Enviar e-mail de notificação ao paciente
            try:
                # Construir a URL de avaliação
                url_avaliacao = f"http://localhost:5000/HTML/avaliacao_consulta.html?consulta_id={consulta_id}&medico_id={consulta['medico_id']}&paciente_id={consulta['usuario_id']}"
                
                # Criar a mensagem de e-mail
                msg = Message(
                    'Consulta Concluída - Avalie sua experiência',
                    recipients=[consulta['email_paciente']]
                )
                
                # Corpo do e-mail com formatação HTML
                msg.body = f'''Olá {consulta['nome_paciente']},\n\nSua consulta com o(a) Dr(a). {consulta['nome_medico']} foi concluída com sucesso!\n\nAvalie sua experiência e nos ajude a melhorar nossos serviços:\n{url_avaliacao}\n\nAgradecemos por escolher a Clínica Vida e Saúde!\n\nAtenciosamente,\nEquipe Clínica Vida e Saúde'''
                
                # Versão HTML do e-mail
                msg.html = f'''
                <html>
                <body>
                    <p>Olá {consulta['nome_paciente']},</p>
                    <p>Sua consulta com o(a) Dr(a). {consulta['nome_medico']} foi concluída com sucesso!</p>
                    <p>Avalie sua experiência e nos ajude a melhorar nossos serviços:</p>
                    <p><a href="{url_avaliacao}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Avaliar Consulta</a></p>
                    <p>Ou copie e cole este link em seu navegador:<br>{url_avaliacao}</p>
                    <p>Agradecemos por escolher a Clínica Vida e Saúde!</p>
                    <p>Atenciosamente,<br>Equipe Clínica Vida e Saúde</p>
                </body>
                </html>
                '''
                
                # Enviar o e-mail
                mail.send(msg)
                print("[DEBUG] E-mail de notificação de consulta concluída enviado com sucesso!")
                
            except Exception as email_error:
                print(f"[AVISO] Erro ao enviar e-mail de notificação: {str(email_error)}")
                # Não interrompe o fluxo principal, apenas registra o erro
        except Exception as update_error:
            print(f"[ERRO] Falha ao atualizar para 'Concluído': {str(update_error)}")
            print("[DEBUG] Tentando atualizar para 'Cancelado'...")
            query_update = """
                UPDATE agendamentos 
                SET status = 'Cancelado', 
                    fim_consulta = %s,
                    ativa = 0
                WHERE id = %s
            """
            cursor.execute(query_update, (agora, consulta_id))
            connection.commit()
            return jsonify({
                "mensagem": "Consulta encerrada com sucesso (status alterado para Cancelado)",
                "fim_consulta": agora,
                "status": "Cancelado"
            }), 200
        print("[DEBUG] Commit realizado com sucesso")
        
        return jsonify({
            "mensagem": "Consulta encerrada com sucesso",
            "fim_consulta": agora,
            "status": "Concluído"
        }), 200
        
    except Exception as e:
        print("\n[ERRO CRÍTICO] Erro ao encerrar consulta:", str(e))
        import traceback
        traceback.print_exc()
        if connection:
            connection.rollback()
        return jsonify({"erro": "Ocorreu um erro ao processar sua solicitação"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
            print("[DEBUG] Conexão com o banco de dados fechada")

@app.route('/api/consultas/<int:consulta_id>/concluir', methods=['POST'])
@login_required
def concluir_consulta(consulta_id):
    """
    Função mantida para compatibilidade com chamadas antigas.
    Será removida em versões futuras.
    """
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor()
        query = """
            UPDATE agendamentos
            SET ativa = 0, status = 'Concluído',
                fim_consulta = %s
            WHERE id = %s
        """
        agora = datetime.datetime.now().time().strftime('%H:%M:%S')
        cursor.execute(query, (agora, consulta_id))
        connection.commit()

        return jsonify({
            "mensagem": "Consulta concluída com sucesso!",
            "fim_consulta": agora,
            "status": "Concluído"
        }), 200
    except Exception as e:
        print("Erro ao concluir consulta:", str(e))
        return jsonify({"erro": f"Erro ao concluir consulta: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/agendar-consulta', methods=['POST'])
def agendar_consulta():
    try:
        data = request.json
        print("Dados recebidos para agendamento:", data)

        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)
        
        # Primeiro, obter o email do usuário
        cursor.execute("SELECT email, nome FROM usuarios WHERE id = %s", (data['usuario_id'],))
        usuario = cursor.fetchone()
        
        if not usuario:
            return jsonify({"erro": "Usuário não encontrado"}), 404
            
        # Obter o nome do médico
        cursor.execute("SELECT nome FROM medicos WHERE id = %s", (data['medico_id'],))
        medico = cursor.fetchone()
        
        if not medico:
            return jsonify({"erro": "Médico não encontrado"}), 404

        # Inserir o agendamento
        cursor = connection.cursor()
        query = """
            INSERT INTO agendamentos (
                especialidade, medico_id, usuario_id, data_consulta, horario, tipo_consulta, observacoes, status, ativa
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, 'Agendado', 1)
        """
        valores = (
            data['especialidade'],
            data['medico_id'],
            data['usuario_id'],
            data['data_consulta'],
            data['horario'],
            data['tipo_consulta'],
            data.get('observacoes', None)
        )
        cursor.execute(query, valores)
        connection.commit()
        
        # Enviar email de confirmação
        try:
            # Formatar a data para exibição
            data_obj = datetime.datetime.strptime(str(data['data_consulta']), '%Y-%m-%d')
            data_formatada = data_obj.strftime('%d/%m/%Y')
            print(f"Data formatada: {data_formatada}")
            
            msg = Message(
                'Confirmação de Agendamento - Clínica Vida e Saúde',
                recipients=[usuario['email']]
            )
            
            msg.body = f'''Agendamento Confirmado! ✅

Olá {usuario['nome']},

Seu agendamento foi realizado com sucesso. Agradecemos por escolher a Clínica Vida e Saúde!

Detalhes da Consulta
Especialidade: {data['especialidade']}
Médico(a): {medico['nome']}
Data: {data['data_consulta']}
Horário: {data['horario']}
Tipo de Consulta: {data['tipo_consulta']}

Informações da Clínica
📍 Localização:

Rua Marcolino De Lazarin Souza, 123 - Centro de Catuba

📞 Contato:

(41) 4002-8922

⏰ Horário de Atendimento:

Segunda a Sexta: 08:00 - 19:00
Sábado: 08:00 - 12:00

Por favor, chegue com 15 minutos de antecedência para realizar o check-in.

Observações: {data.get('observacoes', 'Nenhuma observação fornecida.')}

Em caso de dúvidas ou necessidade de reagendamento, entre em contato conosco através do telefone ou e-mail de contato.

Atenciosamente,
Equipe Clínica Vida e Saúde

---
Este é um e-mail automático, por favor não responda.'''
            
            mail.send(msg)
            print("E-mail de confirmação enviado com sucesso!")
            
        except Exception as email_error:
            print(f"Erro ao enviar e-mail de confirmação: {str(email_error)}")
            # Não interrompe o fluxo principal, apenas registra o erro

        return jsonify({"mensagem": "Consulta agendada com sucesso! Um e-mail de confirmação foi enviado para você."}), 201
        
    except Exception as e:
        print("Erro ao agendar consulta:", str(e))
        return jsonify({"erro": f"Erro ao agendar consulta: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/medicos/<int:medico_id>/inativar', methods=['POST'])
def inativar_medico(medico_id):
    try:
        # verificar se pode inativar
        response = verificar_agendamentos_medico(medico_id)
        if response.status_code != 200:
            return response
            
        dados = response.get_json()
        if not dados['pode_inativar']:
            return jsonify({
                "erro": "Não é possível inativar este médico pois ele tem consultas ou exames marcados.",
                "total_consultas": dados['total_consultas'],
                "total_exames": dados['total_exames']
            }), 400

        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor()
        query = "UPDATE medicos SET ativo = 0 WHERE id = %s"
        cursor.execute(query, (medico_id,))
        connection.commit()
        
        return jsonify({"mensagem": "Médico inativado com sucesso!"})
        
    except Error as e:
        print(f"Erro MySQL: {str(e)}")
        return jsonify({"erro": f"Erro ao inativar médico: {str(e)}"}), 500
    except Exception as e:
        print(f"Erro geral: {str(e)}")
        return jsonify({"erro": f"Erro ao inativar médico: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/medicos', methods=['POST'])
def cadastrar_medico():
    try:
        data = request.json
        print("Dados recebidos para cadastro de médico:", data)

        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        # Criptografar a senha antes de salvar
        senha_hash = generate_password_hash(data['senha'])

        cursor = connection.cursor()
        query = """
            INSERT INTO medicos (
                nome, crm, cpf, especialidade, email, telefone, cep, endereco, numero, bairro, cidade, estado, senha, ativo
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1)
        """
        valores = (
            data['nome'], data['crm'], data['cpf'], data['especialidade'], data['email'], data['telefone'],
            data['cep'], data['endereco'], data['numero'], data['bairro'], data['cidade'], data['estado'], senha_hash
        )
        cursor.execute(query, valores)
        connection.commit()

        return jsonify({"mensagem": "Médico cadastrado com sucesso!"}), 201
    except Exception as e:
        print("Erro ao cadastrar médico:", str(e))
        return jsonify({"erro": f"Erro ao cadastrar médico: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/funcionarios', methods=['POST'])
def cadastrar_funcionario():
    try:
        data = request.json
        print("Dados recebidos para cadastro de funcionário:", data)

        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        # Criptografar a senha antes de salvar
        senha_hash = generate_password_hash(data['senha'])

        cursor = connection.cursor()
        query = """
            INSERT INTO funcionarios (
                nome, cpf, data_nascimento, email, telefone, cargo, salario, data_contratacao, endereco, numero, bairro, cidade, estado, cep, senha, ativo
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1)
        """
        valores = (
            data['nome'], data['cpf'], data['data_nascimento'], data['email'], data['telefone'], data['cargo'],
            data['salario'], data['data_contratacao'], data['endereco'], data['numero'], data['bairro'], data['cidade'],
            data['estado'], data['cep'], senha_hash
        )
        cursor.execute(query, valores)
        connection.commit()

        return jsonify({"mensagem": "Funcionário cadastrado com sucesso!"}), 201
    except Exception as e:
        print("Erro ao cadastrar funcionário:", str(e))
        return jsonify({"erro": f"Erro ao cadastrar funcionário: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/usuarios/<int:usuario_id>/consultas', methods=['GET'])
def listar_consultas_paciente(usuario_id):
    try:
        print(f"[DEBUG] Iniciando listar_consultas_paciente para usuário_id: {usuario_id}")
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT 
                a.id,
                a.especialidade,
                a.data_consulta,
                a.horario,
                a.tipo_consulta,
                a.status,
                a.observacoes,
                m.nome AS nome_medico,
                m.especialidade AS especialidade_medico,
                m.crm AS crm_medico
            FROM agendamentos a
            JOIN medicos m ON a.medico_id = m.id
            WHERE a.usuario_id = %s
            ORDER BY 
                CASE 
                    WHEN a.status = 'Agendado' THEN 1
                    WHEN a.status = 'Concluído' THEN 2
                    ELSE 3
                END,
                data_consulta,
                a.horario
        """
        cursor.execute(query, (usuario_id,))
        consultas = cursor.fetchall()
        print(f"[DEBUG] Consultas encontradas: {len(consultas)}")
        
        # Lista para armazenar as consultas processadas
        consultas_processadas = []
        
        for i, consulta in enumerate(consultas):
            try:
                print(f"\n[DEBUG] Processando consulta {i+1}:")
                consulta_processada = {}
                
                # Copiar todos os campos da consulta original
                for key, value in consulta.items():
                    print(f"[DEBUG]   Campo: {key} (tipo: {type(value) if value is not None else 'None'})")
                    
                    if value is None:
                        consulta_processada[key] = None
                    elif isinstance(value, (str, int, float, bool)):
                        consulta_processada[key] = value
                    elif isinstance(value, datetime.date):
                        consulta_processada[key] = value.strftime('%Y-%m-%d')
                        print(f"[DEBUG]     Convertido data: {consulta_processada[key]}")
                    elif isinstance(value, datetime.timedelta):
                        total_seconds = value.total_seconds()
                        hours = int(total_seconds // 3600)
                        minutes = int((total_seconds % 3600) // 60)
                        seconds = int(total_seconds % 60)
                        consulta_processada[key] = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
                        print(f"[DEBUG]     Convertido timedelta: {consulta_processada[key]}")
                    elif hasattr(value, 'strftime'):
                        consulta_processada[key] = value.strftime('%Y-%m-%d %H:%M:%S')
                        print(f"[DEBUG]     Convertido com strftime: {consulta_processada[key]}")
                    else:
                        try:
                            consulta_processada[key] = str(value)
                            print(f"[DEBUG]     Convertido para string: {consulta_processada[key]}")
                        except Exception as e:
                            print(f"[DEBUG]     Erro ao converter campo {key}: {str(e)}")
                            consulta_processada[key] = None
                
                consultas_processadas.append(consulta_processada)
                print(f"[DEBUG]   Consulta processada: {consulta_processada}")
                
            except Exception as e:
                print(f"[DEBUG]   Erro ao processar consulta {i+1}: {str(e)}")
                continue
        
        print("\n[DEBUG] Retornando consultas processadas")
        return jsonify(consultas_processadas)
        
    except Exception as e:
        print("Erro ao listar consultas do paciente:", str(e))
        return jsonify({"erro": f"Erro ao listar consultas: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/consultas/paciente', methods=['GET'])
@login_required
def listar_consultas_paciente_atual():
    try:
        usuario_id = get_usuario_logado()
        if not usuario_id:
            return jsonify({"erro": "Usuário não autenticado"}), 401
            
        return listar_consultas_paciente(usuario_id)
    except Exception as e:
        print("Erro ao listar consultas do paciente atual:", str(e))
        return jsonify({"erro": f"Erro ao listar consultas: {str(e)}"}), 500

@app.route('/api/horarios-disponiveis', methods=['GET'])
@login_required
def get_horarios_disponiveis():
    try:
        data_selecionada = request.args.get('data')    

        if not data_selecionada:
            return jsonify({"erro": "Parâmetro 'data' é obrigatório"}), 400

        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        #
        horarios_padrao_clinica = [
            "08:00", "09:00", "10:00", "11:00", 
            "14:00", "15:00", "16:00", "17:00"  
        ]
        
        
        horarios_ja_agendados = ["10:00", "15:00"] 

        horarios_disponiveis_calculados = []
        for horario_base in horarios_padrao_clinica:
            if horario_base not in horarios_ja_agendados:
                horarios_disponiveis_calculados.append({"horario": horario_base})
        
        return jsonify(horarios_disponiveis_calculados), 200

    except Error as e:
        print(f"Erro MySQL ao buscar horários: {str(e)}")
        return jsonify({"erro": f"Erro de banco de dados ao buscar horários disponíveis: {str(e)}"}), 500
    except Exception as e:
        print(f"Erro geral ao buscar horários: {str(e)}")
        return jsonify({"erro": f"Erro inesperado ao buscar horários disponíveis: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection and connection.is_connected():
            if 'cursor' in locals() and cursor: 
                 cursor.close()
            connection.close()

@app.route('/api/horarios-exames-disponiveis', methods=['GET'])
@login_required 
def get_horarios_exames_disponiveis():
    horarios_disponiveis = [
        {"horario": "08:00"}, {"horario": "08:30"}, {"horario": "09:00"},
        {"horario": "09:30"}, {"horario": "10:00"}, {"horario": "10:30"},
        {"horario": "11:00"}, {"horario": "11:30"}, {"horario": "14:00"},
        {"horario": "14:30"}, {"horario": "15:00"}, {"horario": "15:30"},
        {"horario": "16:00"}, {"horario": "16:30"}
    ]
    return jsonify(horarios_disponiveis)

@app.route('/api/usuario/atual', methods=['GET'])
@login_required
def obter_usuario_atual():
    try:
        print("\n[DEBUG] ======= INÍCIO obter_usuario_atual =======")
        print(f"[DEBUG] Sessão atual: {dict(session) if hasattr(session, '_get_current_object') else 'Sessão não disponível'}")
        
        # Obter o ID do usuário logado
        usuario_id = session.get('usuario_id')
        if not usuario_id:
            print("[ERRO] Nenhum ID de usuário encontrado na sessão")
            return jsonify({"erro": "Usuário não autenticado"}), 401
            
        print(f"[DEBUG] Retornando ID do usuário: {usuario_id}")
        return jsonify({
            "id": usuario_id,
            "tipo_usuario": session.get('tipo_usuario', 'usuario')
        })
        
    except Exception as e:
        print(f"[ERRO] Erro ao obter usuário atual: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"erro": "Erro interno ao obter dados do usuário"}), 500

@app.route('/api/exames/paciente', methods=['GET'])
@login_required
def listar_exames_paciente_atual():
    print("\n[DEBUG] ======= INÍCIO listar_exames_paciente_atual =======")
    print(f"[DEBUG] Sessão atual: {dict(session) if hasattr(session, '_get_current_object') else 'Sessão não disponível'}")
    
    connection = None
    cursor = None
    
    # Registrar informações do ambiente
    print("[DEBUG] Informações do ambiente:")
    print(f"  - Diretório de trabalho: {os.getcwd()}")
    print(f"  - Usuário do sistema: {os.getlogin() if hasattr(os, 'getlogin') else 'N/A'}")
    print(f"  - Variáveis de ambiente: DB_HOST={os.environ.get('DB_HOST', 'Não definido')}")
    print(f"  - Python version: {sys.version}")
    print(f"  - MySQL Connector version: {mysql.connector.__version__}")
    
    try:
        # Verificar todas as chaves na sessão
        print("\n[DEBUG] === INÍCIO VERIFICAÇÃO DE SESSÃO ===")
        if hasattr(session, '_get_current_object'):
            try:
                session_obj = session._get_current_object()
                print(f"[DEBUG] Chaves na sessão: {list(session_obj.keys())}")
                print(f"[DEBUG] Conteúdo da sessão: {dict(session_obj)}")
            except Exception as sess_err:
                print(f"[DEBUG] Erro ao acessar sessão: {str(sess_err)}")
        else:
            print("[DEBUG] Sessão não possui _get_current_object")
        
        # Obter o ID do usuário logado
        usuario_id = None
        try:
            print("\n[DEBUG] === OBTENDO USUÁRIO DA SESSÃO ===")
            usuario_id = session.get('usuario_id')
            print(f"[DEBUG] Usuário ID direto da sessão: {usuario_id} (tipo: {type(usuario_id)})")
            
            if not usuario_id and 'user' in session:
                print(f"[DEBUG] Tentando obter ID de session['user']: {session['user']}")
                if isinstance(session['user'], dict) and 'id' in session['user']:
                    usuario_id = session['user']['id']
                    print(f"[DEBUG] ID obtido de session['user']['id']: {usuario_id}")
            
            print(f"[DEBUG] Usuário ID final: {usuario_id} (tipo: {type(usuario_id) if usuario_id else 'None'})")
            
        except Exception as user_err:
            print(f"[ERRO] Erro ao obter usuário da sessão: {str(user_err)}")
            import traceback
            traceback.print_exc()
        
        if not usuario_id:
            error_msg = "[ERRO] Usuário não autenticado - Nenhum ID de usuário encontrado na sessão"
            print(error_msg)
            print(f"[DEBUG] Dados completos da sessão: {dict(session) if hasattr(session, '_get_current_object') else 'Sessão não disponível'}")
            return jsonify({"erro": "Usuário não autenticado", "detalhes": "Nenhum ID de usuário encontrado na sessão"}), 401
            
        # Validar se o ID do usuário é um número
        try:
            usuario_id_int = int(usuario_id)
        except (ValueError, TypeError) as e:
            print(f"[ERRO] ID de usuário inválido: {usuario_id}")
            print(f"[ERRO] Detalhes: {str(e)}")
            return jsonify({"erro": f"ID de usuário inválido: {str(e)}"}), 400

        print("[DEBUG] Obtendo conexão com o banco de dados...")
        try:
            connection = get_db_connection()
            if not connection:
                print("[ERRO] Falha ao obter conexão com o banco de dados")
                return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
                
            # Testar a conexão com uma consulta simples
            try:
                test_cursor = connection.cursor()
                test_cursor.execute("SELECT 1")
                test_cursor.close()
                print("[DEBUG] Conexão com o banco de dados testada com sucesso")
            except Error as e:
                print(f"[ERRO] Falha ao testar conexão com o banco de dados: {str(e)}")
                # Tentar reconectar
                connection = get_db_connection()
                if not connection:
                    return jsonify({"erro": "Erro ao reconectar ao banco de dados"}), 500
                
            print("[DEBUG] Conexão com o banco de dados estabelecida com sucesso")
            cursor = connection.cursor(dictionary=True)
                
            # Verificar se a tabela de exames existe
            print("[DEBUG] Verificando existência das tabelas...")
            try:
                # Verificar se a tabela exames existe
                cursor.execute("SHOW TABLES LIKE 'exames'")
                tabela_exames = cursor.fetchone()
                print(f"[DEBUG] Resultado da verificação da tabela 'exames': {tabela_exames}")
                
                # Consumir todos os resultados pendentes
                while cursor.nextset():
                    pass
                    
                if not tabela_exames:
                    print("[ERRO] Tabela 'exames' não encontrada")
                    # Listar todas as tabelas disponíveis para ajudar no diagnóstico
                    cursor.execute("SHOW TABLES")
                    todas_tabelas = cursor.fetchall()
                    
                    # Consumir todos os resultados pendentes
                    while cursor.nextset():
                        pass
                        
                    print(f"[DEBUG] Tabelas disponíveis no banco de dados: {todas_tabelas}")
                    return jsonify({
                        "erro": "Tabela de exames não encontrada no banco de dados",
                        "tabelas_disponiveis": [t[list(t.keys())[0]] for t in todas_tabelas] if todas_tabelas else []
                    }), 500
                
                # Verificar se a tabela medicos existe
                cursor.execute("SHOW TABLES LIKE 'medicos'")
                tabela_medicos = cursor.fetchone()
                
                # Consumir todos os resultados pendentes
                while cursor.nextset():
                    pass
                    
                print(f"[DEBUG] Resultado da verificação da tabela 'medicos': {tabela_medicos}")
                if not tabela_medicos:
                    print("[ERRO] Tabela 'medicos' não encontrada")
                    return jsonify({"erro": "Tabela de médicos não encontrada no banco de dados"}), 500
                    
            except Error as e:
                print(f"[ERRO] Falha ao verificar tabelas: {str(e)}")
                print(f"[DEBUG] Tipo de erro: {type(e).__name__}")
                import traceback
                traceback.print_exc()
                return jsonify({
                    "erro": "Erro ao verificar a estrutura do banco de dados",
                    "detalhes": str(e),
                    "tipo": type(e).__name__
                }), 500
            
            # Verificar a estrutura da tabela de exames
            try:
                print("[DEBUG] Verificando estrutura da tabela exames...")
                cursor.execute("DESCRIBE exames")
                
                # Obter os nomes das colunas do resultado 
                colunas_descricao = cursor.fetchall()
                print(f"[DEBUG] Estrutura completa da tabela exames: {colunas_descricao}")
                
                # Extrair apenas os nomes das colunas
                colunas = [col['Field'] for col in colunas_descricao if 'Field' in col]
                print(f"[DEBUG] Colunas da tabela exames: {colunas}")
                
                if not colunas:
                    print("[ERRO] Não foi possível obter as colunas da tabela exames")
                    return jsonify({"erro": "Não foi possível obter a estrutura da tabela de exames"}), 500
                
                # Verificar se as colunas necessárias existem
                colunas_necessarias = {'id', 'tipo_exame', 'data_exame', 'horario', 'status', 'usuario_id', 'medico_id'}
                colunas_faltando = [col for col in colunas_necessarias if col not in colunas]
                
                if colunas_faltando:
                    print(f"[ERRO] Colunas faltando na tabela exames: {colunas_faltando}")
                    return jsonify({
                        "erro": "Estrutura da tabela de exames incompleta", 
                        "colunas_faltando": list(colunas_faltando),
                        "colunas_existentes": colunas
                    }), 500
                
            except Error as e:
                print(f"[ERRO] Erro ao verificar estrutura da tabela exames: {str(e)}")
                return jsonify({"erro": f"Erro ao verificar estrutura do banco de dados: {str(e)}"}), 500
            
            # Verificar se existem exames para o usuário
            try:
                print(f"[DEBUG] Verificando exames para usuário_id: {usuario_id_int}")
                check_query = "SELECT COUNT(*) as total FROM exames WHERE usuario_id = %s"
                print(f"[DEBUG] Query: {check_query}")
                print(f"[DEBUG] Parâmetros: ({usuario_id_int},)")
                
                cursor.execute(check_query, (usuario_id_int,))
                result = cursor.fetchone()
                
                if not result:
                    print("[ERRO] Nenhum resultado retornado ao contar exames")
                    # Testar conexão com uma consulta simples
                    try:
                        cursor.execute("SELECT 1 as test")
                        test_result = cursor.fetchone()
                        print(f"[DEBUG] Teste de conexão: {test_result}")
                    except Exception as test_error:
                        print(f"[ERRO] Teste de conexão falhou: {str(test_error)}")
                    
                    return jsonify({"erro": "Erro ao verificar exames do usuário"}), 500
                
                total_exames = result.get('total', 0)
                print(f"[DEBUG] Total de exames encontrados: {total_exames}")
                
                if total_exames == 0:
                    print("[INFO] Nenhum exame encontrado para o usuário")
                    # Verificar se existem exames na tabela
                    try:
                        cursor.execute("SELECT COUNT(*) as total_geral FROM exames")
                        total_geral = cursor.fetchone().get('total_geral', 0)
                        print(f"[DEBUG] Total de exames na tabela: {total_geral}")
                        
                        if total_geral > 0:
                            cursor.execute("SELECT id, usuario_id, tipo_exame, data_exame, horario, status FROM exames LIMIT 5")
                            exames_debug = cursor.fetchall()
                            print(f"[DEBUG] Primeiros 5 exames: {exames_debug}")
                            
                            cursor.execute("SELECT COUNT(*) as total_nulos FROM exames WHERE usuario_id IS NULL")
                            total_nulos = cursor.fetchone().get('total_nulos', 0)
                            print(f"[DEBUG] Exames com usuario_id nulo: {total_nulos}")
                            
                    except Exception as debug_error:
                        print(f"[DEBUG] Erro ao obter informações de debug: {str(debug_error)}")
                        
                    return jsonify([])
                    
            except Error as e:
                print(f"[ERRO] Erro ao contar exames do usuário: {str(e)}")
                try:
                    cursor.execute("SHOW ERRORS")
                    db_error = cursor.fetchone()
                    if db_error:
                        print(f"[ERRO] Detalhes do erro do MySQL: {db_error}")
                except:
                    pass
                return jsonify({"erro": f"Erro ao verificar exames: {str(e)}"}), 500
            
            # Consulta principal
            try:
                print("[DEBUG] Executando consulta principal...")
                try:
                    #  testar uma consulta simples para verificar a conexão
                    cursor.execute("SELECT 1 as test")
                    test_result = cursor.fetchone()
                    print(f"[DEBUG] Teste de conexão bem-sucedido: {test_result}")
                    
                    # Garantir que não há resultados pendentes
                    while cursor.nextset():
                        pass
                    
                    print("[DEBUG] Executando consulta simplificada...")
                    
                    try:
                        # apenas os campos básicos sem formatação
                        cursor.execute("""
                            SELECT id, tipo_exame, data_exame, horario, status, medico_id
                            FROM exames 
                            WHERE usuario_id = %s
                            ORDER BY data_exame DESC, horario DESC
                            LIMIT 10
                        """, (usuario_id_int,))
                        
                        exames_raw = cursor.fetchall()
                        print(f"[DEBUG] Exames encontrados (simplificado): {len(exames_raw)}")
                        
                        # Garantir que não há resultados pendentes
                        while cursor.nextset():
                            pass
                        
                        # Se encontrou resultados, processar formatando as datas manualmente
                        if exames_raw:
                            exames_processados = []
                            
                            # Primeiro, obter todos os IDs de médicos únicos
                            medicos_ids = list({exame['medico_id'] for exame in exames_raw if exame.get('medico_id')})
                            medicos_dict = {}
                            
                            # Buscar nomes dos médicos em uma única consulta
                            if medicos_ids:
                                try:
                                    placeholders = ','.join(['%s'] * len(medicos_ids))
                                    cursor.execute(f"SELECT id, nome FROM medicos WHERE id IN ({placeholders})", medicos_ids)
                                    for medico in cursor.fetchall():
                                        medicos_dict[medico['id']] = medico['nome']
                                    
                                    # Consumir resultados pendentes
                                    while cursor.nextset():
                                        pass
                                        
                                except Exception as e:
                                    print(f"[AVISO] Erro ao buscar médicos: {str(e)}")
                            
                            # Processar cada exame
                            for exame in exames_raw:
                                try:
                                    # Formatar data e hora manualmente
                                    data = exame['data_exame'].strftime('%Y-%m-%d') if exame['data_exame'] else ''
                                    horario = str(exame['horario']) if exame['horario'] else ''
                                    
                                    # Obter nome do médico do dicionário
                                    nome_medico = medicos_dict.get(exame.get('medico_id'), 'Não especificado')
                                    
                                    exames_processados.append({
                                        'id': exame['id'],
                                        'tipo': exame['tipo_exame'],
                                        'data': data,
                                        'horario': horario,
                                        'status': exame.get('status', 'Não especificado'),
                                        'nome_medico': nome_medico
                                    })
                                    
                                except Exception as e:
                                    print(f"[AVISO] Erro ao processar exame {exame.get('id')}: {str(e)}")
                            
                            print(f"[DEBUG] Retornando {len(exames_processados)} exames processados")
                            return jsonify(exames_processados)
                            
                    except Error as e:
                        print(f"[ERRO] Erro na consulta simplificada: {str(e)}")
                        raise
                    
                    # Se chegou aqui, não encontrou exames
                    print("[DEBUG] Nenhum exame encontrado para o usuário")
                    # Verificar se existem exames na tabela para fins de depuração
                    cursor.execute("SELECT COUNT(*) as total FROM exames")
                    total_geral = cursor.fetchone()['total']
                    print(f"[DEBUG] Total de exames na tabela: {total_geral}")
                    
                    if total_geral > 0:
                        cursor.execute("SELECT * FROM exames WHERE usuario_id IS NULL LIMIT 5")
                        exames_nulos = cursor.fetchall()
                        print(f"[DEBUG] Exames com usuário nulo: {exames_nulos}")
                        
                    return jsonify([])
                            
                except Error as e:
                    print(f"[ERRO] Erro durante os testes de depuração: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    raise
                
            except Error as e:
                print(f"[ERRO] Erro na consulta: {str(e)}")
                import traceback
                traceback.print_exc()
                return jsonify({"erro": f"Erro ao buscar exames: {str(e)}"}), 500
            

            
        except Error as e:
            print(f"[ERRO] Erro no banco de dados: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({"erro": f"Erro no banco de dados: {str(e)}"}), 500
            
    except Exception as e:
        error_msg = f"[ERRO CRÍTICO] Erro inesperado: {str(e)}"
        print(error_msg)
        import traceback
        error_trace = traceback.format_exc()
        print(error_trace)
        
        # Registrar informações adicionais para diagnóstico
        if connection:
            try:
                print("[DEBUG] Verificando status da conexão...")
                cursor = connection.cursor()
                cursor.execute("SELECT 1")
                print("[DEBUG] Conexão ativa e respondendo a consultas")
                cursor.close()
            except Exception as db_err:
                print(f"[DEBUG] Status da conexão: {str(db_err)}")
        
        return jsonify({
            "erro": "Erro interno no servidor",
            "detalhes": str(e),
            "tipo": str(type(e).__name__)
        }), 500
        
    finally:
        # Fechar cursor e conexão
        try:
            if cursor:
                if not cursor._connection.is_closed():
                    cursor.close()
                    print("[DEBUG] Cursor fechado com sucesso")
                else:
                    print("[DEBUG] Conexão já estava fechada ao tentar fechar o cursor")
        except Exception as e:
            print(f"[AVISO] Erro ao fechar cursor: {str(e)}")
            
        try:
            if connection:
                if hasattr(connection, 'is_connected') and callable(connection.is_connected):
                    if connection.is_connected():
                        connection.close()
                        print("[DEBUG] Conexão com o banco de dados fechada com sucesso")
                    else:
                        print("[DEBUG] Conexão já estava fechada")
                else:
                    connection.close()
                    print("[DEBUG] Conexão fechada (método is_connected não disponível)")
        except Exception as e:
            print(f"[AVISO] Erro ao fechar conexão: {str(e)}")
            
    print("[DEBUG] ======= FIM listar_exames_paciente_atual =======\n")


@app.route('/api/medicos/<int:medico_id>/atualizar', methods=['PUT'])
@login_required
def atualizar_medico(medico_id):
    data = request.json
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor()

        query = """
            UPDATE medicos
            SET nome = %s, cpf = %s, crm = %s, especialidade = %s, email = %s, 
                telefone = %s, cep = %s, endereco = %s, numero = %s, 
                bairro = %s, cidade = %s, estado = %s, ativo = %s
            WHERE id = %s
        """
        valores = (
            data.get('nome'), data.get('cpf'), data.get('crm'), data.get('especialidade'),
            data.get('email'), data.get('telefone'), data.get('cep'), data.get('endereco'),
            data.get('numero'), data.get('bairro'), data.get('cidade'), data.get('estado'),
            int(data.get('ativo', 0)),  
            medico_id
        )

        cursor.execute(query, valores)
        connection.commit()

        if cursor.rowcount == 0:
            return jsonify({"erro": "Médico não encontrado ou nenhum dado alterado"}), 404

        return jsonify({"mensagem": "Médico atualizado com sucesso!"}), 200

    except KeyError as e:
        return jsonify({"erro": f"Campo ausente nos dados da requisição: {str(e)}"}), 400
    except Error as e:
        if connection:
            connection.rollback()
        print(f"Erro de banco de dados ao atualizar médico: {str(e)}")
        return jsonify({"erro": f"Erro de banco de dados: {str(e)}"}), 500
    except Exception as e:
        if connection:
            connection.rollback()
        print(f"Erro ao atualizar médico: {str(e)}")
        return jsonify({"erro": f"Erro inesperado ao atualizar médico: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/api/agendar-exame', methods=['POST'])
def agendar_exame():
    try:
        data = request.json
        print("Dados recebidos para agendamento de exame:", data)

        # Validações básicas dos campos obrigatórios
        required_fields = ['tipo_exame', 'especificacao', 'usuario_id', 'data_exame', 'horario']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"erro": f"Campo obrigatório '{field}' ausente ou vazio"}), 400
                
        # Verifica se é um exame que exige médico realizante
        exames_com_medico = ['Cardiologico', 'Respiratorio', 'Imagem']
        if data.get('tipo_exame') in exames_com_medico and (not data.get('medico_id')):
            return jsonify({"erro": "Este tipo de exame requer a seleção de um médico realizante"}), 400

        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        # Configurar o cursor para retornar dicionários
        cursor = connection.cursor(dictionary=True)
        
        try:
                # Verificar se é um exame que exige médico realizante
            exames_com_medico = ['Cardiologico', 'Respiratorio', 'Imagem']
            tipo_exame = data.get('tipo_exame')
            
            if tipo_exame in exames_com_medico and not data.get('medico_id'):
                return jsonify({"erro": "Este tipo de exame requer a seleção de um médico realizante"}), 400
            
            # Query de inserção
            query = """
                INSERT INTO exames (
                    tipo_exame, especificacao, medico_id, usuario_id, data_exame, horario, 
                    preparacao, observacoes, status, ativo
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'Agendado', 1)
            """
            
            # Preparar os valores
            valores = (
                tipo_exame,
                data['especificacao'],
                data['medico_id'],  # Já vem com o valor padrão do frontend
                data['usuario_id'],
                data['data_exame'],
                data['horario'],
                data.get('preparacao'),
                data.get('observacoes')
            )
            cursor.execute(query, valores)
            id_exame_agendado = cursor.lastrowid
            connection.commit()
            
            # Buscar informações do usuário e médico para o e-mail
            cursor.execute("SELECT email, nome FROM usuarios WHERE id = %s", (data['usuario_id'],))
            usuario = cursor.fetchone()
            
            if not usuario:
                print(f"Usuário com ID {data['usuario_id']} não encontrado")
                return jsonify({"erro": "Usuário não encontrado"}), 404
                
            cursor.execute("SELECT nome FROM medicos WHERE id = %s", (data['medico_id'],))
            medico = cursor.fetchone()
            
            if not medico:
                print(f"Médico com ID {data['medico_id']} não encontrado")
                return jsonify({"erro": "Médico não encontrado"}), 404
                
        except Exception as e:
            connection.rollback()
            print(f"Erro ao agendar exame: {str(e)}")
            return jsonify({"erro": f"Erro ao agendar exame: {str(e)}"}), 500
        
        # Enviar e-mail de confirmação
        try:
            print(f"[DEBUG] Preparando para enviar e-mail para: {usuario['email']}")
            
            # Formatar a data para exibição
            data_obj = datetime.datetime.strptime(str(data['data_exame']), '%Y-%m-%d')
            data_formatada = data_obj.strftime('%d/%m/%Y')
            
            # Verificar se o e-mail do destinatário está presente
            if not usuario.get('email'):
                print("[ERRO] E-mail do destinatário não encontrado")
                raise Exception("E-mail do destinatário não encontrado")
                
            print(f"[DEBUG] Criando mensagem para {usuario['email']}")
            
            # Criar mensagem
            msg = Message(
                'Agendamento de Exame Confirmado! ✅',
                recipients=[usuario['email']],
                sender=app.config['MAIL_DEFAULT_SENDER']
            )
            
            # Corpo do e-mail
            corpo_email = f'''Agendamento de Exame Confirmado! ✅

Olá {usuario['nome']},

Seu exame foi agendado com sucesso. Agradecemos por escolher a Clínica Vida e Saúde!

Detalhes do Exame
Tipo de Exame: {data['tipo_exame']}
Especificação: {data['especificacao']}
Médico(a): {medico['nome']}
Data: {data_formatada}
Horário: {data['horario']}

Preparação: {data.get('preparacao', 'Nenhuma preparação especial necessária.')}

Informações da Clínica
📍 Localização:

Rua Marcolino De Lazarin Souza, 123 - Centro de Catuba

📞 Contato:

(41) 4002-8922

⏰ Horário de Atendimento:

Segunda a Sexta: 08:00 - 19:00
Sábado: 08:00 - 12:00

Por favor, chegue com 15 minutos de antecedência para realizar o check-in.

Observações: {data.get('observacoes', 'Nenhuma observação fornecida.')}

Em caso de dúvidas ou necessidade de reagendamento, entre em contato conosco através do telefone ou e-mail de contato.

Atenciosamente,
Equipe Clínica Vida e Saúde

---
Este é um e-mail automático, por favor não responda.'''
            
            msg.body = corpo_email
            
            print("[DEBUG] Enviando e-mail...")
            mail.send(msg)
            print("[SUCESSO] E-mail de confirmação de exame enviado com sucesso!")
            
        except Exception as email_error:
            print(f"[ERRO] Falha ao enviar e-mail de confirmação: {str(email_error)}")
            import traceback
            print(f"[DEBUG] Detalhes do erro: {traceback.format_exc()}")
            # Não interrompe o fluxo se o e-mail falhar, mas registra o erro

        return jsonify({"mensagem": "Exame agendado com sucesso!", "id_exame": id_exame_agendado}), 201
    except Exception as e:
        print(f"Erro ao agendar exame: {str(e)}")
        return jsonify({"erro": f"Erro interno ao agendar exame: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            if 'cursor' in locals():
                cursor.close()
            connection.close()

@app.route('/api/medicos/<int:medico_id>/verificar-agendamentos', methods=['GET'])
def verificar_agendamentos_medico(medico_id):
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)
        
        # Verificar consultas marcadas e ativas
        query_consultas = """
            SELECT COUNT(*) as total_consultas
            FROM agendamentos
            WHERE medico_id = %s
            AND status = 'Agendado'
            AND data_consulta >= CURDATE()
        """
        cursor.execute(query_consultas, (medico_id,))
        resultado_consultas = cursor.fetchone()
        
        # Verificar exames marcados e ativos
        query_exames = """
            SELECT COUNT(*) as total_exames
            FROM exames
            WHERE medico_id = %s
            AND status = 'Agendado'
            AND data_exame >= CURDATE()
        """
        cursor.execute(query_exames, (medico_id,))
        resultado_exames = cursor.fetchone()
        
        return jsonify({
            "pode_inativar": resultado_consultas['total_consultas'] == 0 and resultado_exames['total_exames'] == 0,
            "total_consultas": resultado_consultas['total_consultas'],
            "total_exames": resultado_exames['total_exames']
        })
        
    except Error as e:
        print(f"Erro MySQL: {str(e)}")
        return jsonify({"erro": f"Erro ao verificar agendamentos: {str(e)}"}), 500
    except Exception as e:
        print(f"Erro geral: {str(e)}")
        return jsonify({"erro": f"Erro ao verificar agendamentos: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/medicos/<int:medico_id>', methods=['DELETE'])
@login_required
def excluir_medico(medico_id):
    try:
        #  verificar se pode excluir
        response = verificar_agendamentos_medico(medico_id)
        if response.status_code != 200:
            return response
            
        dados = response.get_json()
        if not dados['pode_inativar']:
            return jsonify({
                "erro": "Não é possível excluir este médico pois ele tem consultas ou exames marcados.",
                "total_consultas": dados['total_consultas'],
                "total_exames": dados['total_exames']
            }), 400

        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor()
        query = "DELETE FROM medicos WHERE id = %s"
        cursor.execute(query, (medico_id,))
        connection.commit()
        
        return jsonify({"mensagem": "Médico excluído com sucesso!"})
        
    except Error as e:
        print(f"Erro MySQL: {str(e)}")
        return jsonify({"erro": f"Erro ao excluir médico: {str(e)}"}), 500
    except Exception as e:
        print(f"Erro geral: {str(e)}")
        return jsonify({"erro": f"Erro ao excluir médico: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/usuarios/<int:usuario_id>/verificar-agendamentos', methods=['GET'])
def verificar_agendamentos_paciente(usuario_id):
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)
        
        # Verificar consultas marcadas e ativas
        query_consultas = """
            SELECT COUNT(*) as total_consultas
            FROM agendamentos
            WHERE usuario_id = %s
            AND status = 'Agendado'
            AND data_consulta >= CURDATE()
        """
        cursor.execute(query_consultas, (usuario_id,))
        resultado_consultas = cursor.fetchone()
        
        # Verificar exames marcados e ativos
        query_exames = """
            SELECT COUNT(*) as total_exames
            FROM exames
            WHERE usuario_id = %s
            AND status = 'Agendado'
            AND data_exame >= CURDATE()
        """
        cursor.execute(query_exames, (usuario_id,))
        resultado_exames = cursor.fetchone()
        
        return jsonify({
            "pode_cancelar": resultado_consultas['total_consultas'] == 0 and resultado_exames['total_exames'] == 0,
            "total_consultas": resultado_consultas['total_consultas'],
            "total_exames": resultado_exames['total_exames']
        })
        
    except Error as e:
        print(f"Erro MySQL: {str(e)}")
        return jsonify({"erro": f"Erro ao verificar agendamentos: {str(e)}"}), 500
    except Exception as e:
        print(f"Erro geral: {str(e)}")
        return jsonify({"erro": f"Erro ao verificar agendamentos: {str(e)}"}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/relatorios/medicos', methods=['GET'])
@login_required
def get_medicos():
    try:
        # Busca todos os médicos ativos
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
            
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, nome, cpf, crm, especialidade, email, telefone, 
                   cep, endereco, numero, bairro, cidade, estado, referencia,
                   email_confirmado, ativo, COALESCE(atendimentos_realizados, 0) as atendimentos_realizados
            FROM medicos
            ORDER BY nome
        """)
        medicos = cursor.fetchall()
        cursor.close()
        connection.close()
        
        print(f"Total de médicos encontrados: {len(medicos)}")
        if medicos:
            print("Exemplo de médico encontrado:", medicos[0])
        
        return jsonify(medicos), 200
    except Exception as e:
        print(f"Erro ao buscar médicos: {str(e)}")
        return jsonify({"erro": f"Erro ao buscar médicos: {str(e)}"}), 500

@app.route('/api/relatorios/pacientes', methods=['GET'])
@login_required
def get_pacientes():
    try:
        # Busca todos os pacientes ativos
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Falha ao conectar ao banco de dados"}), 500
            
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, nome, cpf, data_nascimento, email, telefone, 
                   cep, endereco, numero, bairro, cidade, estado, referencia,
                   email_confirmado, ativo, ultimo_acesso
            FROM usuarios
            WHERE ativo = 1
            ORDER BY nome
        """)
        pacientes = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return jsonify(pacientes), 200
    except Exception as e:
        print(f"Erro ao buscar pacientes: {str(e)}")
        if 'connection' in locals() and connection:
            connection.close()
        return jsonify({"erro": f"Erro ao buscar pacientes: {str(e)}"}), 500

@app.route('/api/medicos/por-especialidade', methods=['GET'])
@login_required
def medicos_por_especialidade():
    """
    Retorna a lista de médicos agrupados por especialidade.
    """
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
            
        cursor = connection.cursor(dictionary=True)
        
        # Busca todos os médicos ativos com suas especialidades
        cursor.execute("""
            SELECT 
                m.id,
                m.nome,
                m.especialidade,
                m.crm,
                m.telefone,
                m.email
            FROM medicos m
            WHERE m.ativo = 1
            ORDER BY m.especialidade, m.nome
        """)
        
        medicos = cursor.fetchall()
        
        # Agrupa médicos por especialidade
        medicos_por_especialidade = {}
        for medico in medicos:
            especialidade = medico['especialidade'].strip()
            
            # Normaliza o nome da especialidade
            if 'clinico' in especialidade.lower() and 'geral' in especialidade.lower():
                especialidade = 'Clínica Geral'
            else:
                especialidade = ' '.join(especialidade.split()).title()
            
            if especialidade not in medicos_por_especialidade:
                medicos_por_especialidade[especialidade] = []
                
            medicos_por_especialidade[especialidade].append({
                'id': medico['id'],
                'nome': medico['nome'],
                'crm': medico['crm'],
                'telefone': medico['telefone'],
                'email': medico['email']
            })
        
        cursor.close()
        connection.close()
        
        return jsonify(medicos_por_especialidade)
        
    except Exception as e:
        print(f"Erro ao buscar médicos por especialidade: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"erro": "Erro ao buscar médicos por especialidade"}), 500


@app.route('/api/especialidades/relatorio', methods=['GET'])
@login_required
def relatorio_especialidades():
    print("\n=== Iniciando geração de relatório de especialidades ===")
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
            
        cursor = connection.cursor(dictionary=True)
        
        # obtém todas as especialidades únicas
        cursor.execute("""
            SELECT DISTINCT TRIM(especialidade) as especialidade 
            FROM medicos 
            WHERE ativo = 1
            ORDER BY especialidade
        """)
        especialidades_brutas = [row['especialidade'] for row in cursor.fetchall()]
        
        variacoes_clinica_geral = [
            'clinico-geral',
            'clinico geral',
            'Clinica Geral'
        ]
        
        # Garante que todas as variações estejam na lista de especialidades
        for variacao in variacoes_clinica_geral:
            if variacao not in especialidades_brutas:
                especialidades_brutas.append(variacao)
        
        if not especialidades_brutas:
            return jsonify({"erro": "Nenhuma especialidade encontrada"}), 404
        
        def normalizar_especialidade(nome):
            nome = str(nome).lower().replace('-', ' ').strip()
            print(f"Normalizando especialidade: '{nome}'")
            if 'clinico' in nome and 'geral' in nome:
                print(f"  -> Mapeado para 'Clinica Geral'")
                return 'Clinica Geral'
            resultado = ' '.join(nome.split()).title()
            print(f"  -> Mantido como: '{resultado}'")
            return resultado
        
        especialidades_agrupadas = {}
        print("\n=== Processando especialidades ===")
        for esp in especialidades_brutas:
            print(f"\nProcessando especialidade: '{esp}'")
            esp_normalizada = normalizar_especialidade(esp)
            if esp_normalizada not in especialidades_agrupadas:
                especialidades_agrupadas[esp_normalizada] = []
            
            if esp not in especialidades_agrupadas[esp_normalizada]:
                especialidades_agrupadas[esp_normalizada].append(esp)
            
            print(f"  -> Adicionada ao grupo: '{esp_normalizada}'")
            print(f"  -> Grupo atual: {especialidades_agrupadas[esp_normalizada]}")
        
        print("\n=== Grupos de especialidades criados ===")
        for grupo, variacoes in especialidades_agrupadas.items():
            print(f"- {grupo}: {variacoes}")
        
        # Obtém a data de 12 meses atrás
        data_inicio = (datetime.datetime.now() - datetime.timedelta(days=365)).strftime('%Y-%m-%d')
        
        # Inicializa o dicionário de resultados
        resultados = {}
        
        # Para cada grupo de especialidades, busca os dados dos últimos 12 meses
        for nome_padrao, variacoes in especialidades_agrupadas.items():
            # Prepara a cláusula IN para todas as variações da especialidade
            placeholders = ', '.join(['%s'] * len(variacoes))
            
            # Monta a consulta dinamicamente
            query = f"""
                SELECT 
                    MONTH(data_consulta) as mes,
                    COUNT(*) as total
                FROM agendamentos
                WHERE 
                    TRIM(especialidade) IN ({placeholders})
                    AND data_consulta >= %s
                    AND status = 'Concluído'
                GROUP BY MONTH(data_consulta)
                ORDER BY mes
            """
            
            print(f"Executando query com parâmetros: nome_padrao={nome_padrao}, variacoes={variacoes}, data_inicio={data_inicio}")
            
            # Executa a consulta com os parâmetros
            params = variacoes.copy()
            params.append(data_inicio)
            cursor.execute(query, params)
            
            # Inicializa um array com 12 meses
            dados_mensais = [0] * 12
            
            # Preenche os meses com os dados do banco
            for row in cursor.fetchall():
                mes = row['mes'] - 1  
                if 0 <= mes < 12: 
                    dados_mensais[mes] = row['total']
            
            # Adiciona ao resultado se houver dados
            if any(dados_mensais):
                resultados[nome_padrao] = dados_mensais
        
        cursor.close()
        connection.close()
        
        print(f"Dados retornados: {len(resultados)} especialidades")
        print(f"Especialidades encontradas: {', '.join(resultados.keys())}")
        return jsonify(resultados)
        
    except Exception as e:
        print(f"\n=== ERRO ao gerar relatório de especialidades ===")
        print(f"Tipo do erro: {type(e).__name__}")
        print(f"Mensagem: {str(e)}")
        import traceback
        traceback.print_exc()
        print("=== Fim do erro ===\n")
        return jsonify({"erro": f"Erro ao processar o relatório de especialidades: {str(e)}"}), 500

@app.route('/api/consultas/mes', methods=['GET'])
@login_required
def consultas_por_mes():
    connection = None
    cursor = None
    try:
        data_param = request.args.get('data')  
        if not data_param:
            return jsonify({'error': 'Parâmetro data é obrigatório'}), 400
            
        # Valida o formato da data
        try:
            ano, mes = map(int, data_param.split('-'))
            if not (1 <= mes <= 12):
                raise ValueError("Mês inválido")
        except (ValueError, AttributeError) as e:
            print(f"Erro ao validar data: {str(e)}")
            return jsonify({'error': 'Formato de data inválido. Use YYYY-MM'}), 400
        
        # Obter conexão com o banco de dados
        connection = get_db_connection() 
        if not connection:
            return jsonify({'error': 'Erro ao conectar ao banco de dados'}), 500
            
        cursor = connection.cursor(dictionary=True)
        
        # Consulta para obter o total de consultas agendadas no mês
        query = """
            SELECT 
                DAY(data_consulta) as dia,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Concluído' THEN 1 ELSE 0 END) as realizadas
            FROM agendamentos
            WHERE 
                YEAR(data_consulta) = %s 
                AND MONTH(data_consulta) = %s
            GROUP BY DAY(data_consulta)
            ORDER BY dia
        """
        
        print(f"Executando query com parâmetros: ano={ano}, mes={mes}")
        cursor.execute(query, (ano, mes))
        resultados = cursor.fetchall()
        
        print(f"Resultados encontrados: {resultados}")
        

        detalhamento_dias = []
        total_consultas = 0
        total_realizadas = 0
        
        for row in resultados:
            total = int(row['total']) if row['total'] is not None else 0
            realizadas = int(row['realizadas']) if row['realizadas'] is not None else 0
            pendentes = total - realizadas
            taxa_comparecimento = round((realizadas / total) * 100) if total > 0 else 0
            
            detalhamento_dias.append({
                'data': f"{row['dia']:02d}/{mes:02d}/{ano}",
                'total': total,
                'realizadas': realizadas,
                'pendentes': pendentes,
                'taxaComparecimento': taxa_comparecimento
            })
            
            total_consultas += total
            total_realizadas += realizadas
        
        return jsonify({
            'success': True,
            'totalConsultas': total_consultas,
            'consultasRealizadas': total_realizadas,
            'consultasPendentes': total_consultas - total_realizadas,
            'detalhamentoDias': detalhamento_dias
        })
        
    except Exception as e:
        print(f"Erro ao buscar consultas por mês: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Erro interno ao processar a requisição'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

@app.route('/api/relatorios/tempo-espera', methods=['GET'])
def relatorio_tempo_espera():
    try:
        print("\n=== Iniciando busca de dados de tempo de espera ===")
        print("Tentando conectar ao banco de dados...")
        connection = get_db_connection()
        if not connection:
            error_msg = "Erro ao conectar ao banco de dados"
            print(error_msg)
            return jsonify({"erro": error_msg}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Consulta principal
        print("\nPreparando consulta SQL...")
        query = """
            SELECT 
                a.id,
                a.data_consulta as data,
                TIME(a.horario) as horario_marcado,
                TIME(a.inicio_consulta) as inicio_consulta,
                TIME(a.fim_consulta) as fim_consulta,
                a.especialidade,
                m.nome as medico_nome,
                u.nome as paciente_nome
            FROM agendamentos a
            LEFT JOIN medicos m ON a.medico_id = m.id
            LEFT JOIN usuarios u ON a.usuario_id = u.id
            WHERE a.status = 'Concluído' 
            AND a.inicio_consulta IS NOT NULL 
            AND a.fim_consulta IS NOT NULL
            ORDER BY a.data_consulta, a.horario
        """
        print(f"SQL a ser executado:\n{query}")
        
        try:
            print("\n=== Executando consulta SQL ===")
            print("Tentando executar a consulta...")
            cursor.execute(query)
            print("Consulta executada com sucesso")
            
            consultas = cursor.fetchall()
            print(f"Total de registros retornados: {len(consultas)}")
            
            if not consultas:
                print("AVISO: Nenhum registro encontrado na consulta")
                return jsonify([])
            

            print("\n=== Primeiros registros retornados ===")
            for i, consulta in enumerate(consultas[:3], 1):
                print(f"Registro {i}:")
                print(f"  ID: {consulta.get('id')}")
                print(f"  Data: {consulta.get('data')}")
                print(f"  Horário Marcado: {consulta.get('horario_marcado')}")
                print(f"  Início: {consulta.get('inicio_consulta')}")
                print(f"  Fim: {consulta.get('fim_consulta')}")
                print(f"  Especialidade: {consulta.get('especialidade')}")
                print("-" * 40)
                
            return processar_resultados(consultas)
                
        except Exception as e:
            error_msg = f"Erro ao executar consulta: {str(e)}"
            print(f"ERRO NA CONSULTA: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({"erro": f"Erro ao executar consulta: {str(e)}"}), 500
            
    except Exception as e:
        error_msg = f"Erro ao buscar dados de tempo de espera: {str(e)}"
        print(error_msg)
        import traceback
        traceback.print_exc()
        return jsonify({"erro": error_msg}), 500
    finally:
        if 'connection' in locals() and connection.is_connected():
            if 'cursor' in locals() and cursor:
                cursor.close()
            connection.close()
            print("Conexão com o banco de dados fechada")

def processar_resultados(consultas):
    try:
        print("\n=== Processando resultados ===")
        resultado = []
        
        for i, consulta in enumerate(consultas, 1):
            try:
                # Verificar se os campos necessários existem
                if not all(k in consulta for k in ['inicio_consulta', 'horario_marcado', 'data']):
                    print(f"Consulta {consulta.get('id')} está faltando campos obrigatórios")
                    continue
                
                # Processar cada consulta
                item = processar_consulta(consulta, i, len(consultas))
                if item:
                    resultado.append(item)
                    
            except Exception as e:
                print(f"Erro ao processar consulta {consulta.get('id')}: {str(e)}")
                import traceback
                traceback.print_exc()
                continue
        
        print(f"\nProcessamento concluído. Total de itens processados: {len(resultado)}")
        return jsonify(resultado)
        
    except Exception as e:
        error_msg = f"Erro ao processar resultados: {str(e)}"
        print(error_msg)
        import traceback
        traceback.print_exc()
        return jsonify({"erro": error_msg}), 500

def processar_consulta(consulta, indice, total):
    try:
        print(f"\nProcessando consulta {indice}/{total} - ID: {consulta.get('id')}")
        
        # Processar horários
        inicio_str = str(consulta['inicio_consulta'])
        marcado_str = str(consulta['horario_marcado'])
        
        # Converter para datetime para cálculo do atraso
        inicio = datetime.datetime.strptime(inicio_str, '%H:%M:%S')
        marcado = datetime.datetime.strptime(marcado_str, '%H:%M:%S')
        
        # Calcular atraso em minutos
        atraso_minutos = (inicio - marcado).total_seconds() / 60
        atraso_minutos = max(0, atraso_minutos)  
        
        # Determinar nível de atraso
        if atraso_minutos < 10:
            nivel = 0  
        elif atraso_minutos < 20:
            nivel = 1 
        else:
            nivel = 2 
            
        # Calcular duração da consulta
        duracao_minutos = 30  
        if consulta['fim_consulta']:
            fim_str = str(consulta['fim_consulta'])
            fim = datetime.datetime.strptime(fim_str, '%H:%M:%S')
            duracao_minutos = (fim - inicio).total_seconds() / 60
        
        # Processar data
        data_consulta = consulta['data']
        if not data_consulta:
            data_consulta = datetime.date.today()
            
        if isinstance(data_consulta, str):
            try:
                data_obj = datetime.datetime.strptime(data_consulta, '%Y-%m-%d').date()
                data_formatada = data_consulta
            except Exception as e:
                print(f"Erro ao converter data {data_consulta}: {str(e)}")
                data_obj = datetime.date.today()
                data_formatada = data_obj.strftime('%Y-%m-%d')
        else:
            data_obj = data_consulta
            data_formatada = data_obj.strftime('%Y-%m-%d')
        
        # Criar item com os dados processados
        item = {
            'id': consulta.get('id'),
            'medico': consulta.get('medico_nome', 'Médico não informado'),
            'paciente': consulta.get('paciente_nome', 'Paciente não informado'),
            'data': data_formatada,
            'ano': data_obj.year,
            'mes': data_obj.month,
            'dia': data_obj.day,
            'horario_marcado': marcado_str,
            'horario_inicio': inicio_str,
            'horario_fim': str(consulta['fim_consulta']) if consulta['fim_consulta'] else None,
            'especialidade': consulta.get('especialidade', 'Não informada'),
            'atraso': int(round(atraso_minutos)),
            'nivel': nivel,
            'duracao': int(round(duracao_minutos))
        }
        
        print(f"Item processado: {item}")
        return item
        
    except Exception as e:
        print(f"Erro ao processar consulta {consulta.get('id')}: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

@app.route('/api/avaliacoes', methods=['POST'])
def salvar_avaliacao():
    """
    Salva a avaliação de uma consulta no banco de dados.
    """
    try:
        # Obter dados do formulário
        id_medico = request.form.get('id_medico')
        id_paciente = request.form.get('id_paciente')
        id_consulta = request.form.get('id_consulta')
        nota = request.form.get('nota')
        avaliacao = request.form.get('avaliacao', '')
        
        # Validar campos obrigatórios
        if not all([id_medico, id_paciente, id_consulta, nota]):
            return jsonify({"erro": "Dados incompletos para salvar a avaliação"}), 400
            
        # Obter conexão e cursor
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
            
        cursor = connection.cursor(dictionary=True)
        
        # Verificar se a consulta existe e pertence ao paciente
        cursor.execute("""
            SELECT id, usuario_id, status 
            FROM agendamentos 
            WHERE id = %s AND usuario_id = %s
        """, (id_consulta, id_paciente))
        
        consulta = cursor.fetchone()
        
        if not consulta:
            return jsonify({"erro": "Consulta não encontrada ou você não tem permissão para avaliá-la"}), 404
            
        if consulta['status'] != 'Concluído':
            return jsonify({"erro": "Apenas consultas concluídas podem ser avaliadas"}), 400
            
        # Verificar se a consulta já foi avaliada
        cursor.execute("""
            SELECT id FROM avaliacoes_pacientes 
            WHERE id_consulta = %s
        """, (id_consulta,))
        
        if cursor.fetchone():
            return jsonify({"erro": "Esta consulta já foi avaliada anteriormente"}), 400
        
        # Obter data e hora atuais
        data_atual = datetime.datetime.now().date()
        hora_atual = datetime.datetime.now().time()
        
        # Inserir avaliação na tabela avaliacoes_pacientes
        query = """
            INSERT INTO avaliacoes_pacientes 
            (id_medico, id_paciente, id_consulta, nota, avaliacao, data, horario)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        
        valores = (
            id_medico,
            id_paciente,
            id_consulta,
            nota,
            avaliacao if avaliacao else None,
            data_atual,
            hora_atual
        )
        
        cursor.execute(query, valores)
        connection.commit()
        
        return jsonify({"mensagem": "Avaliação salva com sucesso!"}), 200
        
    except mysql.connector.IntegrityError as ie:
        if ie.errno == 1062:  # Código de erro para entrada duplicada
            print(f"[AVISO] Tentativa de avaliar uma consulta já avaliada: {str(ie)}")
            return jsonify({"erro": "Esta consulta já foi avaliada anteriormente"}), 400
        else:
            print(f"[ERRO] Erro de integridade ao salvar avaliação: {str(ie)}")
            if 'connection' in locals() and connection.is_connected():
                connection.rollback()
            return jsonify({"erro": f"Erro de integridade ao salvar avaliação: {str(ie)}"}), 500
    except Exception as e:
        print(f"[ERRO] Erro ao salvar avaliação: {str(e)}")
        if 'connection' in locals() and connection.is_connected():
            connection.rollback()
        return jsonify({"erro": f"Erro ao salvar avaliação: {str(e)}"}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals() and connection.is_connected():
            connection.close()

@app.route('/api/avaliacoes/medico/<int:medico_id>', methods=['GET'])
@login_required
def obter_avaliacoes_medico(medico_id):
    try:
        # Verificar se o usuário tem permissão para acessar estas avaliações
        
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
            
        cursor = connection.cursor(dictionary=True)
        
        # Buscar avaliações do médico
        query = """
            SELECT ap.*, u.nome as nome_paciente, u.email as email_paciente
            FROM avaliacoes_pacientes ap
            JOIN usuarios u ON ap.id_paciente = u.id
            WHERE ap.id_medico = %s
            ORDER BY ap.data DESC, ap.horario DESC
        """
        
        cursor.execute(query, (medico_id,))
        avaliacoes = cursor.fetchall()
        
        # Converter objetos date e time para strings
        for avaliacao in avaliacoes:
            if 'data' in avaliacao and avaliacao['data']:
                avaliacao['data'] = avaliacao['data'].isoformat()
            if 'horario' in avaliacao and avaliacao['horario']:
                avaliacao['horario'] = str(avaliacao['horario'])
        
        return jsonify(avaliacoes), 200
        
    except Exception as e:
        print(f"[ERRO] Erro ao buscar avaliações: {str(e)}")
        return jsonify({"erro": f"Erro ao buscar avaliações: {str(e)}"}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals() and connection.is_connected():
            connection.close()

@app.route('/api/avaliacoes/estatisticas/medico/<int:medico_id>', methods=['GET'])
@login_required
def obter_estatisticas_avaliacoes(medico_id):
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
            
        cursor = connection.cursor(dictionary=True)
        
        # Calcular média de notas
        cursor.execute("""
            SELECT 
                AVG(nota) as media_geral,
                COUNT(*) as total_avaliacoes,
                SUM(CASE WHEN nota = 5 THEN 1 ELSE 0 END) as cinco_estrelas,
                SUM(CASE WHEN nota = 4 THEN 1 ELSE 0 END) as quatro_estrelas,
                SUM(CASE WHEN nota = 3 THEN 1 ELSE 0 END) as tres_estrelas,
                SUM(CASE WHEN nota = 2 THEN 1 ELSE 0 END) as duas_estrelas,
                SUM(CASE WHEN nota = 1 THEN 1 ELSE 0 END) as uma_estrela
            FROM avaliacoes_pacientes
            WHERE id_medico = %s
        """, (medico_id,))
        
        estatisticas = cursor.fetchone()
        
        if not estatisticas or estatisticas['total_avaliacoes'] == 0:
            return jsonify({
                "media_geral": 0,
                "total_avaliacoes": 0,
                "distribuicao": {
                    "5_estrelas": 0,
                    "4_estrelas": 0,
                    "3_estrelas": 0,
                    "2_estrelas": 0,
                    "1_estrela": 0
                }
            }), 200
        
        # Formatar estatísticas
        resultado = {
            "media_geral": float(estatisticas['media_geral']),
            "total_avaliacoes": estatisticas['total_avaliacoes'],
            "distribuicao": {
                "5_estrelas": estatisticas['cinco_estrelas'],
                "4_estrelas": estatisticas['quatro_estrelas'],
                "3_estrelas": estatisticas['tres_estrelas'],
                "2_estrelas": estatisticas['duas_estrelas'],
                "1_estrela": estatisticas['uma_estrela']
            }
        }
        
        return jsonify(resultado), 200
        
    except Exception as e:
        print(f"[ERRO] Erro ao buscar estatísticas de avaliações: {str(e)}")
        return jsonify({"erro": f"Erro ao buscar estatísticas: {str(e)}"}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals() and connection.is_connected():
            connection.close()

@app.route('/api/avaliacoes/relatorio', methods=['GET'])
@login_required
def relatorio_avaliacoes():
    try:
        ano = request.args.get('ano', type=int)
        medico_id = request.args.get('medico_id', type=int)
        
        if not ano:
            return jsonify({"erro": "O parâmetro 'ano' é obrigatório"}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
            
        cursor = connection.cursor(dictionary=True)
        
        # Construir a consulta SQL
        query = """
            SELECT 
                MONTH(ap.data) as mes,
                AVG(ap.nota) as media,
                COUNT(*) as total
            FROM avaliacoes_pacientes ap
            WHERE YEAR(ap.data) = %s
        """
        
        params = [ano]
        
        # Adicionar filtro por médico se fornecido
        if medico_id:
            query += " AND ap.id_medico = %s"
            params.append(medico_id)
        
        # Agrupar por mês
        query += " GROUP BY MONTH(ap.data) ORDER BY mes"
        
        # Executar a consulta
        cursor.execute(query, tuple(params))
        dados = cursor.fetchall()
        
        # Calcular métricas
        total_avaliacoes = sum(item['total'] for item in dados) if dados else 0
        media_geral = sum(item['media'] * item['total'] for item in dados) / total_avaliacoes if total_avaliacoes > 0 else 0
        
        # Encontrar o mês com melhor avaliação
        melhor_mes = None
        if dados:
            melhor_mes = max(dados, key=lambda x: x['media'])
        
        # Formatar os dados para o frontend
        dados_formatados = [
            {
                'mes': item['mes'],
                'media': float(item['media']),
                'total': item['total']
            }
            for item in dados
        ]
        
        # Retornar os dados
        return jsonify({
            'dados': dados_formatados,
            'metricas': {
                'media_geral': round(media_geral, 2),
                'total_avaliacoes': total_avaliacoes,
                'melhor_mes': {
                    'mes': melhor_mes['mes'],
                    'media': float(melhor_mes['media'])
                } if melhor_mes else None
            }
        })
        
    except Exception as e:
        print(f"[ERRO] Erro ao gerar relatório de avaliações: {str(e)}")
        return jsonify({"erro": f"Erro ao gerar relatório: {str(e)}"}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals() and connection.is_connected():
            connection.close()

@app.route('/api/avaliacoes/consulta/<int:consulta_id>', methods=['GET'])
def verificar_avaliacao_consulta(consulta_id):
   
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
            
        cursor = connection.cursor(dictionary=True)
        
        # Buscar avaliação da consulta com verificação de segurança
        query = """
            SELECT ap.*, u.nome as nome_paciente, m.nome as nome_medico
            FROM avaliacoes_pacientes ap
            JOIN usuarios u ON ap.id_paciente = u.id
            JOIN medicos m ON ap.id_medico = m.id
            JOIN agendamentos a ON ap.id_consulta = a.id
            WHERE ap.id_consulta = %s
            AND a.status = 'Concluído'  # Só permite avaliar consultas concluídas
        """
        
        cursor.execute(query, (consulta_id,))
        avaliacao = cursor.fetchone()
        
        if not avaliacao:
            # Verificar se a consulta existe e está concluída
            cursor.execute("""
                SELECT id, status FROM agendamentos 
                WHERE id = %s AND status = 'Concluído'
            """, (consulta_id,))
            consulta = cursor.fetchone()
            
            if not consulta:
                return jsonify({"erro": "Consulta não encontrada ou não está concluída"}), 404
                
            return jsonify({"mensagem": "Consulta ainda não avaliada", "pode_avaliar": True}), 200
            
        # Converter objetos date e time para strings
        if 'data' in avaliacao and avaliacao['data']:
            avaliacao['data'] = avaliacao['data'].isoformat()
        if 'horario' in avaliacao and avaliacao['horario']:
            avaliacao['horario'] = str(avaliacao['horario'])
        
        return jsonify(avaliacao), 200
        
    except Exception as e:
        print(f"[ERRO] Erro ao verificar avaliação: {str(e)}")
        return jsonify({"erro": f"Erro ao verificar avaliação: {str(e)}"}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals() and connection.is_connected():
            connection.close()


@app.route('/api/receitas/medico/<int:medico_id>', methods=['GET'])
@login_required
def listar_receitas_medico(medico_id):
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500

        cursor = connection.cursor(dictionary=True)

        # Buscar as receitas do médico
        query = """
        SELECT r.*, 
               p.nome as paciente_nome,
               p.cpf as paciente_cpf,
               p.data_nascimento as paciente_data_nascimento
        FROM receitas r
        JOIN usuarios p ON r.paciente_id = p.id
        WHERE r.medico_id = %s
        ORDER BY r.data_prescricao DESC
        """
        
        cursor.execute(query, (medico_id,))
        receitas = cursor.fetchall()

        # Converter objetos datetime para strings
        for receita in receitas:
            for key, value in receita.items():
                if hasattr(value, 'isoformat'):
                    receita[key] = value.isoformat()

        return jsonify({
            "mensagem": "Receitas encontradas com sucesso",
            "receitas": receitas,
            "total": len(receitas)
        })

    except Error as e:
        print(f"Erro ao listar receitas: {str(e)}")
        return jsonify({"erro": f"Erro ao listar receitas: {str(e)}"}), 500
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/api/medico/atual', methods=['GET'])
@login_required
def obter_medico_atual():
    """
    Retorna as informações do médico atualmente logado.
    """
    try:
        # Obter o usuário logado
        usuario = get_usuario_logado()
        if not usuario:
            return jsonify({"erro": "Usuário não autenticado"}), 401
            
        # Verificar se o usuário é um médico
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
            
        cursor = connection.cursor(dictionary=True)
        
        # Buscar informações do médico
        cursor.execute("""
            SELECT m.*, u.nome, u.email, u.cpf, u.data_nascimento, u.telefone, u.endereco, 
                   u.cidade, u.estado, u.cep, u.sexo, u.foto_perfil
            FROM medicos m
            JOIN usuarios u ON m.usuario_id = u.id
            WHERE u.id = %s
        """, (usuario['id'],))
        
        medico = cursor.fetchone()
        
        if not medico:
            return jsonify({"erro": "Médico não encontrado"}), 404
            
        # Converter datetime para string
        for key, value in medico.items():
            if hasattr(value, 'isoformat'):
                medico[key] = value.isoformat()
                
        return jsonify(medico), 200
        
    except Exception as e:
        print(f"[ERRO] Erro ao obter médico: {str(e)}")
        return jsonify({"erro": f"Erro ao obter médico: {str(e)}"}), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals() and connection.is_connected():
            connection.close()

@app.route('/api/medicos/<int:medico_id>/pacientes', methods=['GET'])
@login_required
def listar_pacientes_medico(medico_id):
    print(f"[DEBUG] Buscando pacientes do médico ID: {medico_id}")
    try:
        connection = get_db_connection()
        if not connection:
            print("[ERRO] Falha ao conectar ao banco de dados")
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
            
        cursor = connection.cursor(dictionary=True)
        
        # Verificar se o médico existe
        cursor.execute("SELECT id FROM medicos WHERE id = %s", (medico_id,))
        if not cursor.fetchone():
            print(f"[ERRO] Médico com ID {medico_id} não encontrado")
            return jsonify({"erro": "Médico não encontrado"}), 404
        
        # Consulta para obter os pacientes únicos do médico
        query = """
            SELECT DISTINCT
                u.id,
                u.nome,
                u.cpf,
                u.data_nascimento,
                u.email,
                u.telefone,
                u.ativo,
                MAX(a.data_consulta) as ultima_consulta
            FROM usuarios u
            JOIN agendamentos a ON u.id = a.usuario_id
            WHERE a.medico_id = %s
            GROUP BY u.id
            ORDER BY u.nome ASC
        """
        
        cursor.execute(query, (medico_id,))
        pacientes = cursor.fetchall()
        print(f"[DEBUG] {len(pacientes)} pacientes encontrados")
        
        # Processar os resultados
        pacientes_processados = []
        for paciente in pacientes:
            try:
                paciente_processado = {}
                for key, value in paciente.items():
                    if value is None:
                        paciente_processado[key] = None
                    elif isinstance(value, (str, int, float, bool)):
                        paciente_processado[key] = value
                    elif isinstance(value, datetime.date):
                        paciente_processado[key] = value.isoformat()
                    elif hasattr(value, 'strftime'):
                        paciente_processado[key] = value.strftime('%Y-%m-%d %H:%M:%S')
                    else:
                        paciente_processado[key] = str(value)
                
                pacientes_processados.append(paciente_processado)
                
            except Exception as e:
                print(f"[ERRO] Erro ao processar paciente {paciente.get('id', 'desconhecido')}: {str(e)}")
                continue
        
        return jsonify(pacientes_processados), 200
        
    except Exception as e:
        import traceback
        error_msg = f"Erro ao listar pacientes do médico: {str(e)}\n{traceback.format_exc()}"
        print(f"[ERRO CRÍTICO] {error_msg}")
        return jsonify({"erro": f"Erro ao listar pacientes: {str(e)}"}), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals() and connection.is_connected():
            connection.close()
            print("[DEBUG] Conexão com o banco de dados fechada")

@app.route('/api/receitas', methods=['POST'])
@login_required
def salvar_receita():
    try:
        # Obter dados do formulário
        data = request.get_json()
        
        # Validar campos obrigatórios
        campos_obrigatorios = ['paciente_id', 'medicamento', 'dosagem', 'frequencia', 'duracao', 'medico_id']
        for campo in campos_obrigatorios:
            if campo not in data or not data[campo]:
                return jsonify({"erro": f"O campo {campo} é obrigatório"}), 400
        
        # Obter conexão com o banco de dados
        connection = get_db_connection()
        if not connection:
            return jsonify({"erro": "Erro ao conectar ao banco de dados"}), 500
            
        cursor = connection.cursor(dictionary=True)
        
        # Inserir a receita no banco de dados
        query = """
            INSERT INTO receitas 
            (paciente_id, medico_id, medicamento, dosagem, frequencia, duracao, observacoes, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'ativa')
        """
        
        valores = (
            data['paciente_id'],
            data['medico_id'],
            data['medicamento'],
            data['dosagem'],
            data['frequencia'],
            data['duracao'],
            data.get('observacoes')
        )
        
        cursor.execute(query, valores)
        connection.commit()
        
        # Obter o ID da receita inserida
        receita_id = cursor.lastrowid
        
        # Buscar os dados completos da receita para retornar
        cursor.execute("""
            SELECT r.*, u.nome as nome_paciente, m.nome as nome_medico
            FROM receitas r
            JOIN usuarios u ON r.paciente_id = u.id
            JOIN medicos m ON r.medico_id = m.id
            WHERE r.id = %s
        """, (receita_id,))
        
        receita = cursor.fetchone()
        
        # Converter datetime para string
        if 'data_prescricao' in receita and receita['data_prescricao']:
            receita['data_prescricao'] = receita['data_prescricao'].isoformat()
        if 'created_at' in receita and receita['created_at']:
            receita['created_at'] = receita['created_at'].isoformat()
        if 'updated_at' in receita and receita['updated_at']:
            receita['updated_at'] = receita['updated_at'].isoformat()
        
        return jsonify({
            "mensagem": "Receita salva com sucesso",
            "receita": receita
        }), 201
        
    except Exception as e:
        print(f"Erro ao salvar receita: {str(e)}")
        return jsonify({"erro": f"Erro ao salvar receita: {str(e)}"}), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals() and connection.is_connected():
            connection.close()

def enviar_lembretes_consultas():
    try:
        connection = get_db_connection()
        if not connection:
            print("Erro ao conectar ao banco de dados para enviar lembretes")
            return

        cursor = connection.cursor(dictionary=True)
        
        # Calcular data e horário de amanhã no mesmo horário
        agora = datetime.datetime.now()
        amanha = agora + datetime.timedelta(days=1)
        
        # Formatar para buscar consultas que ocorrerão em 24h
        data_amanha = amanha.strftime('%Y-%m-%d')
        horario_consulta = amanha.strftime('%H:%M:%S')
        
        # Buscar consultas agendadas para amanhã no mesmo horário
        query = """
            SELECT a.*, u.nome as nome_paciente, u.email as email_paciente, 
                   m.nome as nome_medico
            FROM agendamentos a
            JOIN usuarios u ON a.usuario_id = u.id
            JOIN medicos m ON a.medico_id = m.id
            WHERE a.data_consulta = %s 
            AND a.horario = %s
            AND a.status = 'Agendado'
            AND (a.lembrete_enviado = 0 OR a.lembrete_enviado IS NULL)
        """
        
        cursor.execute(query, (data_amanha, horario_consulta))
        consultas = cursor.fetchall()
        
        if not consultas:
            print(f"Nenhum lembrete para enviar em {agora}")
            return
        
        print(f"Enviando {len(consultas)} lembretes de consulta...")
        
        for consulta in consultas:
            try:
                # Formatar data e horário para exibição
                data_obj = consulta['data_consulta']
                if isinstance(data_obj, str):
                    data_obj = datetime.datetime.strptime(data_obj, '%Y-%m-%d')
                
                data_formatada = data_obj.strftime('%d/%m/%Y')
                horario_formatado = str(consulta['horario'])[:5]  # Formata HH:MM
                
                # Criar e enviar e-mail de lembrete
                msg = Message(
                    'Lembrete de Consulta - Clínica Vida e Saúde',
                    recipients=[consulta['email_paciente']]
                )
                
                msg.body = f'''Lembrete de Consulta! ⏰

Olá {consulta['nome_paciente']},

Este é um lembrete da sua consulta agendada para amanhã.

Detalhes da Consulta:
• Especialidade: {consulta['especialidade']}
• Médico(a): {consulta['nome_medico']}
• Data: {data_formatada}
• Horário: {horario_formatado}
• Tipo de Consulta: {consulta['tipo_consulta']}

Recomendamos que você chegue com 15 minutos de antecedência.

Em caso de desistência, por favor, cancele com pelo menos 24 horas de antecedência.

Atenciosamente,
Equipe Clínica Vida e Saúde

---
Este é um e-mail automático, por favor não responda.'''
                
                mail.send(msg)
                print(f"Lembrete enviado para {consulta['email_paciente']}")
                
                # Marcar que o lembrete foi enviado
                cursor.execute(
                    "UPDATE agendamentos SET lembrete_enviado = 1 WHERE id = %s",
                    (consulta['id'],)
                )
                connection.commit()
                
            except Exception as email_error:
                print(f"Erro ao enviar lembrete para {consulta.get('email_paciente', 'email não encontrado')}: {str(email_error)}")
                connection.rollback()
        
    except Exception as e:
        print(f"Erro ao processar lembretes: {str(e)}")
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

def agendar_tarefa_lembretes():
    from apscheduler.schedulers.background import BackgroundScheduler
    
    scheduler = BackgroundScheduler()
    scheduler.add_job(enviar_lembretes_consultas, 'interval', hours=1)
    scheduler.start()
    print("Agendador de lembretes iniciado. Verificando a cada hora...")

if __name__ == '__main__':
    # Testar conexão com o banco de dados antes de iniciar o servidor
    connection = get_db_connection()
    if connection:
        print("Conexão com o banco de dados estabelecida com sucesso!")
        connection.close()
    
    # Iniciar agendador de lembretes
    try:
        agendar_tarefa_lembretes()
    except Exception as e:
        print(f"Erro ao iniciar agendador de lembretes: {str(e)}")
        print("Certifique-se de que o pacote 'apscheduler' está instalado")
    
    # Iniciar o servidor
    app.run(debug=True, port=5000)