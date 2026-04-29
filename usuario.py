from datetime import date, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


PLANNING_WINDOWS = {"morning", "afternoon", "night"}
DEFAULT_PLANNING_WINDOW = "night"
DEFAULT_TIMEZONE = "America/Recife"


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
        planning_window=DEFAULT_PLANNING_WINDOW,
        timezone=DEFAULT_TIMEZONE,
        emergency_unlock_date=None,
        timezone_updated_at=None,
    ):
        self.usuario_id = self._validar_usuario_id(usuario_id)
        self.usuario = self._validar_usuario(usuario)
        self.email = self._validar_email(email)
        self.senha_hash = self._validar_senha_hash(senha_hash)
        self.ativo = self._validar_ativo(ativo)
        self.nome_general = self._validar_nome_general(nome_general)
        self.active_mode = self._validar_active_mode(active_mode)
        self.planning_window = self._validar_planning_window(planning_window)
        self.timezone = self._validar_timezone(timezone)
        self.emergency_unlock_date = self._validar_emergency_unlock_date(
            emergency_unlock_date
        )
        self.timezone_updated_at = self._validar_timezone_updated_at(
            timezone_updated_at
        )

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
            raise ValueError("E-mail deve ser um texto.")
        email = email.strip().lower()
        if not email or "@" not in email or email.startswith("@") or email.endswith("@"):
            raise ValueError("E-mail inválido.")
        if " " in email:
            raise ValueError("E-mail não pode conter espaços.")
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

    def _validar_planning_window(self, planning_window):
        if not isinstance(planning_window, str):
            raise ValueError("Turno de planejamento deve ser um texto.")
        planning_window = planning_window.strip().lower()
        if planning_window not in PLANNING_WINDOWS:
            raise ValueError("Turno de planejamento inválido.")
        return planning_window

    def definir_turno_planejamento(self, turno):
        self.planning_window = self._validar_planning_window(turno)

    def _validar_timezone(self, timezone):
        if not isinstance(timezone, str):
            raise ValueError("Fuso horário deve ser um texto.")
        timezone = timezone.strip()
        if not timezone:
            raise ValueError("Fuso horário é obrigatório.")
        try:
            ZoneInfo(timezone)
        except ZoneInfoNotFoundError as erro:
            raise ValueError("Fuso horário inválido.") from erro
        return timezone

    def definir_timezone(self, timezone):
        self.timezone = self._validar_timezone(timezone)

    def _validar_timezone_updated_at(self, timezone_updated_at):
        if timezone_updated_at is None:
            return None
        if not isinstance(timezone_updated_at, datetime):
            raise ValueError("Data de alteração do timezone inválida.")
        if timezone_updated_at.tzinfo is None:
            raise ValueError("Data de alteração do timezone deve ter timezone.")
        return timezone_updated_at

    def registrar_alteracao_timezone(self, agora_utc):
        self.timezone_updated_at = self._validar_timezone_updated_at(agora_utc)

    def _validar_emergency_unlock_date(self, emergency_unlock_date):
        if emergency_unlock_date is None:
            return None
        if not isinstance(emergency_unlock_date, date):
            raise ValueError("Data de emergência do General inválida.")
        return emergency_unlock_date

    def registrar_uso_emergencia_general(self, local_date):
        self.emergency_unlock_date = self._validar_emergency_unlock_date(local_date)
