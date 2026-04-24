class Usuario:
    """Representa um usuário autenticável do sistema."""

    def __init__(
        self,
        usuario_id=None,
        usuario=None,
        email=None,
        senha_hash=None,
        ativo=True,
        nome_general=None,
        active_mode="general",
    ):
        self.usuario_id = self._validar_usuario_id(usuario_id)
        self.usuario = self._validar_usuario(usuario)
        self.email = self._validar_email(email)
        self.senha_hash = self._validar_senha_hash(senha_hash)
        self.ativo = self._validar_ativo(ativo)
        self.nome_general = self._validar_nome_general(nome_general)
        self.active_mode = self._validar_active_mode(active_mode)

    def _validar_usuario_id(self, usuario_id):
        if usuario_id is None:
            return None
        if not isinstance(usuario_id, int) or usuario_id < 1:
            raise ValueError("ID do usuário deve ser um inteiro positivo.")
        return usuario_id

    def _validar_usuario(self, usuario):
        if not isinstance(usuario, str):
            raise ValueError("Usuário deve ser um texto.")
        usuario = usuario.strip()
        if len(usuario) < 3:
            raise ValueError("Usuário deve ter pelo menos 3 caracteres.")
        return usuario

    def _validar_email(self, email):
        if not isinstance(email, str):
            raise ValueError("Email deve ser um texto.")
        email = email.strip().lower()
        if not email or "@" not in email or email.startswith("@") or email.endswith("@"):
            raise ValueError("Email inválido.")
        if " " in email:
            raise ValueError("Email não pode conter espaços.")
        return email

    def _validar_senha_hash(self, senha_hash):
        if not isinstance(senha_hash, str) or not senha_hash.strip():
            raise ValueError("Hash de senha inválido.")
        return senha_hash

    def _validar_ativo(self, ativo):
        if not isinstance(ativo, bool):
            raise ValueError("Status ativo deve ser booleano.")
        return ativo

    def _validar_nome_general(self, nome_general):
        if nome_general is None:
            return None
        if not isinstance(nome_general, str):
            raise ValueError("Nome do General deve ser um texto.")
        nome_general = nome_general.strip()
        if not nome_general:
            raise ValueError("Nome do General é obrigatório.")
        return nome_general

    def definir_nome_general(self, nome_general):
        self.nome_general = self._validar_nome_general(nome_general)

    def _validar_active_mode(self, active_mode):
        if not isinstance(active_mode, str):
            raise ValueError("Modo ativo deve ser um texto.")
        active_mode = active_mode.strip().lower()
        if active_mode not in {"general", "soldier"}:
            raise ValueError("Modo ativo inválido.")
        return active_mode

    def definir_modo(self, active_mode):
        self.active_mode = self._validar_active_mode(active_mode)
