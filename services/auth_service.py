from auth import decode_token, generate_token, hash_password, verify_password
from services.exceptions import AutenticacaoError, UsuarioJaExisteError, UsuarioNaoEncontrado
from usuario import Usuario


class AuthService:
    """Gerencia cadastro e autenticação de usuários."""

    def __init__(self, repositorio):
        self.repositorio = repositorio

    def registrar_usuario(self, dados: dict) -> Usuario:
        existente = self.repositorio.buscar_usuario_por_email(dados["email"])
        if existente is not None:
            raise UsuarioJaExisteError("Email já está em uso.")

        usuario = Usuario(
            usuario=dados["usuario"],
            email=dados["email"],
            senha_hash=hash_password(dados["senha"]),
        )
        self.repositorio.adicionar_usuario(usuario)
        return usuario

    def autenticar(self, email: str, senha: str) -> dict:
        usuario = self.repositorio.buscar_usuario_por_email(email)
        if usuario is None or not verify_password(senha, usuario.senha_hash):
            raise AutenticacaoError("Credenciais inválidas.")
        if not usuario.ativo:
            raise AutenticacaoError("Usuário inativo.")

        token = generate_token({"sub": usuario.usuario_id, "email": usuario.email})
        return {"access_token": token, "token_type": "bearer", "usuario": usuario}

    def obter_usuario_por_token(self, token: str) -> Usuario:
        payload = decode_token(token)
        usuario = self.repositorio.buscar_usuario_por_id(payload["sub"])
        if usuario is None:
            raise UsuarioNaoEncontrado("Usuário autenticado não encontrado.")
        return usuario

    def definir_nome_general(self, usuario_id: int, nome_general: str) -> Usuario:
        usuario = self.repositorio.buscar_usuario_por_id(usuario_id)
        if usuario is None:
            raise UsuarioNaoEncontrado("Usuário autenticado não encontrado.")

        usuario.definir_nome_general(nome_general)
        self.repositorio.atualizar_nome_general(usuario.usuario_id, usuario.nome_general)
        return usuario

    def alterar_modo(self, usuario_id: int, modo: str) -> Usuario:
        if str(modo).strip().lower() != "soldier":
            raise ValueError("Este endpoint aceita apenas a ativação do modo Soldado.")
        usuario = self.repositorio.buscar_usuario_por_id(usuario_id)
        if usuario is None:
            raise UsuarioNaoEncontrado("Usuário autenticado não encontrado.")

        usuario.definir_modo(modo)
        self.repositorio.atualizar_modo_ativo(usuario.usuario_id, usuario.active_mode)
        return usuario

    def liberar_general(self, usuario_id: int, senha: str) -> Usuario:
        usuario = self.repositorio.buscar_usuario_por_id(usuario_id)
        if usuario is None:
            raise UsuarioNaoEncontrado("Usuário autenticado não encontrado.")
        if not verify_password(senha, usuario.senha_hash):
            raise AutenticacaoError("Senha incorreta.")

        usuario.definir_modo("general")
        self.repositorio.atualizar_modo_ativo(usuario.usuario_id, usuario.active_mode)
        return usuario
