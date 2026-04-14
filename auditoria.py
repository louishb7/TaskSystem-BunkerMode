from datetime import UTC, datetime


class EventoAuditoria:
    """Representa um evento auditável do sistema."""

    def __init__(
        self,
        evento_id=None,
        missao_id=None,
        usuario_id=None,
        acao=None,
        detalhes="",
        criado_em=None,
    ):
        self.evento_id = evento_id
        self.missao_id = self._validar_id_optional(missao_id, "ID da missão")
        self.usuario_id = self._validar_id_optional(usuario_id, "ID do usuário")
        self.acao = self._validar_acao(acao)
        self.detalhes = self._validar_detalhes(detalhes)
        self.criado_em = self._validar_criado_em(criado_em)

    def _validar_id_optional(self, valor, campo):
        if valor is None:
            return None
        if not isinstance(valor, int) or valor < 1:
            raise ValueError(f"{campo} deve ser um inteiro positivo.")
        return valor

    def _validar_acao(self, acao):
        if not isinstance(acao, str) or not acao.strip():
            raise ValueError("Ação de auditoria inválida.")
        return acao.strip()

    def _validar_detalhes(self, detalhes):
        if not isinstance(detalhes, str):
            raise ValueError("Detalhes da auditoria devem ser texto.")
        return detalhes.strip()

    def _validar_criado_em(self, criado_em):
        if criado_em is None:
            return datetime.now(UTC).replace(tzinfo=None)
        if not isinstance(criado_em, datetime):
            raise ValueError("Data de auditoria inválida.")
        return criado_em
