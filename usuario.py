from enum import Enum


class PapelUsuario(Enum):
    GENERAL = "general"
    SOLDADO = "soldado"


class Usuario:
    """Representa um usuário autenticável do sistema."""

    def __init__(
        self,
        usuario_id=None,
        username=None,
        nome=None,
        papel=PapelUsuario.SOLDADO,
        senha_hash=None,
        ativo=True,
    ):
        self.usuario_id = self._validar_usuario_id(usuario_id)
        self.username = self._validar_username(username)
        self.nome = self._validar_nome(nome)
        self.papel = self._validar_papel(papel)
        self.senha_hash = self._validar_senha_hash(senha_hash)
        self.ativo = self._validar_ativo(ativo)

    def _validar_usuario_id(self, usuario_id):
        if usuario_id is None:
            return None
        if not isinstance(usuario_id, int) or usuario_id < 1:
            raise ValueError("ID do usuário deve ser um inteiro positivo.")
        return usuario_id

    def _validar_username(self, username):
        if not isinstance(username, str):
            raise ValueError("Username deve ser um texto.")
        username = username.strip().lower()
        if len(username) < 3:
            raise ValueError("Username deve ter pelo menos 3 caracteres.")
        if " " in username:
            raise ValueError("Username não pode conter espaços.")
        return username

    def _validar_nome(self, nome):
        if not isinstance(nome, str):
            raise ValueError("Nome do usuário deve ser um texto.")
        nome = nome.strip()
        if not nome:
            raise ValueError("Nome do usuário não pode ser vazio.")
        return nome

    def _validar_papel(self, papel):
        if isinstance(papel, PapelUsuario):
            return papel
        try:
            return PapelUsuario(papel)
        except ValueError as erro:
            raise ValueError("Papel do usuário inválido.") from erro

    def _validar_senha_hash(self, senha_hash):
        if not isinstance(senha_hash, str) or not senha_hash.strip():
            raise ValueError("Hash de senha inválido.")
        return senha_hash

    def _validar_ativo(self, ativo):
        if not isinstance(ativo, bool):
            raise ValueError("Status ativo deve ser booleano.")
        return ativo
