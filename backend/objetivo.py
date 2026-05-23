from datetime import date, datetime
from enum import Enum


class StatusObjetivo(Enum):
    ATIVO = "ativo"
    CONCLUIDO = "concluido"
    PAUSADO = "pausado"
    ABANDONADO = "abandonado"


class Objetivo:
    """Marco estratégico que pode orientar missões operacionais."""

    def __init__(
        self,
        objetivo_id=None,
        usuario_id=None,
        sonho_id=None,
        titulo=None,
        descricao=None,
        data_alvo=None,
        progresso=0,
        status=StatusObjetivo.ATIVO,
        created_at=None,
        updated_at=None,
        concluded_at=None,
    ):
        self.objetivo_id = self._validar_id(objetivo_id, "ID do objetivo inválido.", obrigatorio=False)
        self.usuario_id = self._validar_id(usuario_id, "Usuário do objetivo inválido.", obrigatorio=True)
        self.sonho_id = self._validar_id(sonho_id, "Sonho do objetivo inválido.", obrigatorio=False)
        self.titulo = self._validar_titulo(titulo)
        self.descricao = self._validar_texto_opcional(descricao, "Descrição do objetivo inválida.")
        self.data_alvo = self._validar_data(data_alvo, "Data alvo do objetivo inválida.")
        self.progresso = self._validar_progresso(progresso)
        self.status = self._validar_status(status)
        self.created_at = self._validar_datetime(created_at, "Data de criação do objetivo inválida.", default_now=True)
        self.updated_at = self._validar_datetime(updated_at, "Data de atualização do objetivo inválida.", default_now=True)
        self.concluded_at = self._validar_datetime(concluded_at, "Data de conclusão do objetivo inválida.")

    def atualizar_objetivo_id(self, objetivo_id):
        self.objetivo_id = self._validar_id(objetivo_id, "ID do objetivo inválido.", obrigatorio=True)

    def atualizar_dados(self, payload: dict, instante=None):
        if "titulo" in payload:
            self.titulo = self._validar_titulo(payload["titulo"])
        if "descricao" in payload:
            self.descricao = self._validar_texto_opcional(payload["descricao"], "Descrição do objetivo inválida.")
        if "data_alvo" in payload:
            self.data_alvo = self._validar_data(payload["data_alvo"], "Data alvo do objetivo inválida.")
        if "sonho_id" in payload:
            self.sonho_id = self._validar_id(payload["sonho_id"], "Sonho do objetivo inválido.", obrigatorio=False)
        if "progresso" in payload:
            self.progresso = self._validar_progresso(payload["progresso"])
        self.updated_at = self._validar_datetime(instante, "Data de atualização do objetivo inválida.", default_now=True)

    def atualizar_progresso(self, progresso, instante=None):
        self.progresso = self._validar_progresso(progresso)
        self.updated_at = self._validar_datetime(instante, "Data de atualização do objetivo inválida.", default_now=True)

    def atualizar_status(self, status, instante=None):
        novo_status = self._validar_status(status)
        agora = self._validar_datetime(instante, "Data de atualização do objetivo inválida.", default_now=True)
        self.status = novo_status
        if novo_status == StatusObjetivo.CONCLUIDO:
            self.concluded_at = agora
        self.updated_at = agora

    def to_dict(self):
        return {
            "id": self.objetivo_id,
            "usuario_id": self.usuario_id,
            "sonho_id": self.sonho_id,
            "titulo": self.titulo,
            "descricao": self.descricao,
            "data_alvo": None if self.data_alvo is None else self.data_alvo.isoformat(),
            "progresso": self.progresso,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "concluded_at": None if self.concluded_at is None else self.concluded_at.isoformat(),
        }

    @staticmethod
    def _validar_id(valor, mensagem, obrigatorio):
        if valor is None:
            if obrigatorio:
                raise ValueError(mensagem)
            return None
        if not isinstance(valor, int) or valor < 1:
            raise ValueError(mensagem)
        return valor

    @staticmethod
    def _validar_titulo(valor):
        if not isinstance(valor, str):
            raise ValueError("Título do objetivo é obrigatório.")
        texto = valor.strip()
        if not texto:
            raise ValueError("Título do objetivo é obrigatório.")
        if len(texto) > 200:
            raise ValueError("Título do objetivo deve ter no máximo 200 caracteres.")
        return texto

    @staticmethod
    def _validar_texto_opcional(valor, mensagem):
        if valor is None:
            return None
        if not isinstance(valor, str):
            raise ValueError(mensagem)
        texto = valor.strip()
        return texto or None

    @staticmethod
    def _validar_data(valor, mensagem):
        if valor is None:
            return None
        if isinstance(valor, datetime):
            return valor.date()
        if isinstance(valor, date):
            return valor
        if isinstance(valor, str):
            texto = valor.strip()
            if not texto:
                return None
            try:
                return date.fromisoformat(texto)
            except ValueError as erro:
                raise ValueError(mensagem) from erro
        raise ValueError(mensagem)

    @staticmethod
    def _validar_progresso(valor):
        if not isinstance(valor, int) or valor < 0 or valor > 100:
            raise ValueError("Progresso do objetivo deve estar entre 0 e 100.")
        return valor

    @staticmethod
    def _validar_status(valor):
        if isinstance(valor, StatusObjetivo):
            return valor
        try:
            return StatusObjetivo(str(valor).strip().lower())
        except ValueError as erro:
            raise ValueError("Status de objetivo inválido.") from erro

    @staticmethod
    def _validar_datetime(valor, mensagem, default_now=False):
        if valor is None:
            return datetime.now() if default_now else None
        if isinstance(valor, str):
            try:
                return datetime.fromisoformat(valor)
            except ValueError as erro:
                raise ValueError(mensagem) from erro
        if not isinstance(valor, datetime):
            raise ValueError(mensagem)
        return valor
