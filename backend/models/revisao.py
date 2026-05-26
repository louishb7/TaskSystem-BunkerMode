from datetime import date, datetime


class RevisaoSemanal:
    """Registro persistido do fechamento operacional feito pelo General."""

    def __init__(
        self,
        revisao_id=None,
        usuario_id=None,
        start_date=None,
        end_date=None,
        reviewed_at=None,
        resumo_operacional="",
        completed_missions=0,
        pending_missions=0,
        failed_missions=0,
        high_priority_missions=0,
        observacao=None,
    ):
        self.revisao_id = self._validar_id(revisao_id, "ID da revisão", obrigatorio=False)
        self.usuario_id = self._validar_id(usuario_id, "ID do usuário", obrigatorio=True)
        self.start_date = self._validar_date(start_date, "Data inicial da revisão inválida.")
        self.end_date = self._validar_date(end_date, "Data final da revisão inválida.")
        if self.end_date < self.start_date:
            raise ValueError("Período da revisão inválido.")
        self.reviewed_at = self._validar_datetime(reviewed_at)
        self.resumo_operacional = self._validar_texto(resumo_operacional)
        self.completed_missions = self._validar_contagem(completed_missions, "executadas")
        self.pending_missions = self._validar_contagem(pending_missions, "pendentes")
        self.failed_missions = self._validar_contagem(failed_missions, "falhas")
        self.high_priority_missions = self._validar_contagem(high_priority_missions, "prioridade elevada")
        self.observacao = self._validar_texto_opcional(observacao)

    def to_dict(self):
        return {
            "id": self.revisao_id,
            "usuario_id": self.usuario_id,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "reviewed_at": self.reviewed_at.isoformat(),
            "resumo_operacional": self.resumo_operacional,
            "completed_missions": self.completed_missions,
            "pending_missions": self.pending_missions,
            "failed_missions": self.failed_missions,
            "high_priority_missions": self.high_priority_missions,
            "observacao": self.observacao,
        }

    def atualizar_revisao_id(self, revisao_id):
        self.revisao_id = self._validar_id(revisao_id, "ID da revisão", obrigatorio=True)

    def _validar_id(self, valor, campo, obrigatorio):
        if valor is None:
            if obrigatorio:
                raise ValueError(f"{campo} é obrigatório.")
            return None
        if not isinstance(valor, int) or valor < 1:
            raise ValueError(f"{campo} deve ser um inteiro positivo.")
        return valor

    def _validar_date(self, valor, mensagem):
        if isinstance(valor, date) and not isinstance(valor, datetime):
            return valor
        if isinstance(valor, datetime):
            return valor.date()
        if isinstance(valor, str):
            try:
                return date.fromisoformat(valor)
            except ValueError as erro:
                raise ValueError(mensagem) from erro
        raise ValueError(mensagem)

    def _validar_datetime(self, valor):
        if valor is None:
            return datetime.now()
        if isinstance(valor, str):
            try:
                return datetime.fromisoformat(valor)
            except ValueError as erro:
                raise ValueError("Data da revisão inválida.") from erro
        if not isinstance(valor, datetime):
            raise ValueError("Data da revisão inválida.")
        return valor

    def _validar_texto(self, valor):
        if not isinstance(valor, str):
            raise ValueError("Resumo operacional deve ser texto.")
        texto = valor.strip()
        if not texto:
            raise ValueError("Resumo operacional é obrigatório.")
        return texto

    def _validar_texto_opcional(self, valor):
        if valor is None:
            return None
        if not isinstance(valor, str):
            raise ValueError("Observação da revisão deve ser texto.")
        texto = valor.strip()
        return texto or None

    def _validar_contagem(self, valor, campo):
        if not isinstance(valor, int) or valor < 0:
            raise ValueError(f"Quantidade de {campo} deve ser um inteiro não negativo.")
        return valor
