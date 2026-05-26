from datetime import datetime
from enum import Enum


class TipoSonho(Enum):
    PRINCIPAL = "principal"
    SECUNDARIO = "secundario"


class StatusSonho(Enum):
    ATIVO = "ativo"
    ARQUIVADO = "arquivado"
    CONCLUIDO = "concluido"


class Sonho:
    """Direção estratégica de longo prazo definida pelo General."""

    def __init__(
        self,
        sonho_id=None,
        usuario_id=None,
        titulo=None,
        descricao=None,
        tipo=TipoSonho.SECUNDARIO,
        status=StatusSonho.ATIVO,
        justificativa_arquivamento=None,
        created_at=None,
        updated_at=None,
        archived_at=None,
        concluded_at=None,
    ):
        self.sonho_id = self._validar_id(sonho_id, "ID do sonho inválido.", obrigatorio=False)
        self.usuario_id = self._validar_id(usuario_id, "Usuário do sonho inválido.", obrigatorio=True)
        self.titulo = self._validar_titulo(titulo)
        self.descricao = self._validar_texto_opcional(descricao, "Descrição do sonho inválida.")
        self.tipo = self._validar_tipo(tipo)
        self.status = self._validar_status(status)
        self.justificativa_arquivamento = self._validar_texto_opcional(
            justificativa_arquivamento,
            "Justificativa de arquivamento inválida.",
            obrigatorio=self.status == StatusSonho.ARQUIVADO,
        )
        self.created_at = self._validar_datetime(created_at, "Data de criação do sonho inválida.", default_now=True)
        self.updated_at = self._validar_datetime(updated_at, "Data de atualização do sonho inválida.", default_now=True)
        self.archived_at = self._validar_datetime(archived_at, "Data de arquivamento do sonho inválida.")
        self.concluded_at = self._validar_datetime(concluded_at, "Data de conclusão do sonho inválida.")

    def atualizar_sonho_id(self, sonho_id):
        self.sonho_id = self._validar_id(sonho_id, "ID do sonho inválido.", obrigatorio=True)

    def atualizar_dados(self, payload: dict, instante=None):
        if "titulo" in payload:
            self.titulo = self._validar_titulo(payload["titulo"])
        if "descricao" in payload:
            self.descricao = self._validar_texto_opcional(payload["descricao"], "Descrição do sonho inválida.")
        self.updated_at = self._validar_datetime(instante, "Data de atualização do sonho inválida.", default_now=True)

    def definir_tipo(self, tipo, instante=None):
        self.tipo = self._validar_tipo(tipo)
        self.updated_at = self._validar_datetime(instante, "Data de atualização do sonho inválida.", default_now=True)

    def arquivar(self, justificativa, instante=None):
        agora = self._validar_datetime(instante, "Data de arquivamento do sonho inválida.", default_now=True)
        self.status = StatusSonho.ARQUIVADO
        self.justificativa_arquivamento = self._validar_texto_opcional(
            justificativa,
            "Justificativa de arquivamento é obrigatória.",
            obrigatorio=True,
        )
        self.archived_at = agora
        self.updated_at = agora

    def esta_ativo(self):
        return self.status == StatusSonho.ATIVO

    def to_dict(self):
        return {
            "id": self.sonho_id,
            "usuario_id": self.usuario_id,
            "titulo": self.titulo,
            "descricao": self.descricao,
            "tipo": self.tipo.value,
            "status": self.status.value,
            "justificativa_arquivamento": self.justificativa_arquivamento,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "archived_at": None if self.archived_at is None else self.archived_at.isoformat(),
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
            raise ValueError("Título do sonho é obrigatório.")
        texto = valor.strip()
        if not texto:
            raise ValueError("Título do sonho é obrigatório.")
        if len(texto) > 200:
            raise ValueError("Título do sonho deve ter no máximo 200 caracteres.")
        return texto

    @staticmethod
    def _validar_texto_opcional(valor, mensagem, obrigatorio=False):
        if valor is None:
            if obrigatorio:
                raise ValueError(mensagem)
            return None
        if not isinstance(valor, str):
            raise ValueError(mensagem)
        texto = valor.strip()
        if not texto:
            if obrigatorio:
                raise ValueError(mensagem)
            return None
        return texto

    @staticmethod
    def _validar_tipo(valor):
        if isinstance(valor, TipoSonho):
            return valor
        try:
            return TipoSonho(str(valor).strip().lower())
        except ValueError as erro:
            raise ValueError("Tipo de sonho inválido.") from erro

    @staticmethod
    def _validar_status(valor):
        if isinstance(valor, StatusSonho):
            return valor
        try:
            return StatusSonho(str(valor).strip().lower())
        except ValueError as erro:
            raise ValueError("Status de sonho inválido.") from erro

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
