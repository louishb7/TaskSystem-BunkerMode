from datetime import date, datetime
from enum import Enum


class StatusMissao(Enum):
    PENDENTE = "Pendente"
    CONCLUIDA = "Concluída"
    FALHA_PENDENTE_JUSTIFICATIVA = "Falha aguardando justificativa"
    FALHA_JUSTIFICADA_PENDENTE_REVISAO = "Falha justificada aguardando revisão"
    FALHA_REVISADA = "Falha revisada"


class PrioridadeMissao(Enum):
    ALTA = 1
    MEDIA = 2
    BAIXA = 3


_STATUS_ALIAS = {
    "Aguardando Recruta!": StatusMissao.PENDENTE,
    "Concluída": StatusMissao.CONCLUIDA,
    "Pendente": StatusMissao.PENDENTE,
    "Falha aguardando justificativa": StatusMissao.FALHA_PENDENTE_JUSTIFICATIVA,
    "Falha justificada aguardando revisão": StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO,
    "Falha revisada": StatusMissao.FALHA_REVISADA,
}

_REVIEW_OUTCOME_ALIAS = {
    "justified": "accepted",
    "unjustified": "rejected",
    "accepted": "accepted",
    "rejected": "rejected",
}


class Missao:
    """Representa uma missão do sistema e suas transições válidas."""

    def __init__(
        self,
        missao_id=None,
        titulo=None,
        prioridade=None,
        prazo=None,
        instrucao=None,
        status=StatusMissao.PENDENTE,
        is_decided=False,
        created_at=None,
        completed_at=None,
        failed_at=None,
        failure_reason=None,
        soldier_excuse=None,
        general_verdict=None,
        user_id=None,
    ):
        self.missao_id = self._validar_missao_id(missao_id)
        self.titulo = self._validar_titulo(titulo)
        self.prioridade = self._validar_prioridade(prioridade)
        self._prazo = self._validar_prazo(prazo)
        self.instrucao = self._validar_instrucao(instrucao)
        self.status = self._validar_status(status)
        self.is_decided = self._validar_is_decided(is_decided)
        self.created_at = self._validar_datetime(created_at, "Data de criação inválida.", default_now=True)
        self.completed_at = self._validar_datetime(completed_at, "Data de conclusão inválida.")
        self.failed_at = self._validar_datetime(failed_at, "Data de falha inválida.")
        self.failure_reason = self._validar_texto_opcional(
            failure_reason if failure_reason is not None else soldier_excuse,
            "Justificativa da falha não pode ser vazia.",
        )
        self.general_verdict = self._validar_general_verdict(general_verdict)
        self.user_id = self._validar_user_id(user_id)
        self._normalizar_consistencia_inicial()

    def to_dict(self):
        return {
            "id": self.missao_id,
            "titulo": self.titulo,
            "prioridade": self.prioridade.value,
            "prazo": self.prazo,
            "due_date": self.prazo,
            "instrucao": self.instrucao,
            "status": self.status.value,
            "is_decided": self.is_decided,
            "created_at": self.created_at.isoformat(),
            "completed_at": None if self.completed_at is None else self.completed_at.isoformat(),
            "failed_at": None if self.failed_at is None else self.failed_at.isoformat(),
            "failure_reason": self.failure_reason,
            "soldier_excuse": self.failure_reason,
            "general_verdict": self.general_verdict,
            "user_id": self.user_id,
        }

    @property
    def prazo(self):
        if self._prazo is None:
            return None
        return self._prazo.strftime("%d-%m-%Y")

    @property
    def prazo_date(self):
        return self._prazo

    @property
    def due_date(self):
        return self._prazo

    @property
    def soldier_excuse(self):
        return self.failure_reason

    def descricao_prioridade(self):
        descricoes = {
            PrioridadeMissao.ALTA: "Faça! Prioridade máxima.",
            PrioridadeMissao.MEDIA: "Média prioridade.",
            PrioridadeMissao.BAIXA: "Baixa prioridade.",
        }
        return descricoes[self.prioridade]

    def atualizar_missao_id(self, missao_id):
        self.missao_id = self._validar_missao_id(missao_id)

    def atualizar_user_id(self, user_id):
        self.user_id = self._validar_user_id(user_id)

    def atualizar_titulo(self, titulo):
        self.titulo = self._validar_titulo(titulo)

    def atualizar_instrucao(self, instrucao):
        self.instrucao = self._validar_instrucao(instrucao)

    def atualizar_prioridade(self, prioridade):
        self.prioridade = self._validar_prioridade(prioridade)

    def atualizar_prazo(self, prazo):
        self._prazo = self._validar_prazo(prazo)

    def concluir(self, instante=None, referencia=None):
        if self.status == StatusMissao.CONCLUIDA:
            raise ValueError("Esta missão já está concluída.")
        if not self.permite_conclusao(referencia=referencia):
            raise ValueError("Missão vencida exige justificativa antes de seguir.")
        self.status = StatusMissao.CONCLUIDA
        self.completed_at = self._validar_datetime(instante, "Data de conclusão inválida.", default_now=True)
        self.failed_at = None
        self.failure_reason = None
        self.general_verdict = None

    def reabrir(self):
        self.status = StatusMissao.PENDENTE
        self.completed_at = None
        self.failed_at = None
        self.failure_reason = None
        self.general_verdict = None

    def alternar_decisao(self):
        self.is_decided = not self.is_decided

    def atualizar_status(self, status):
        novo_status = self._validar_status(status)
        if novo_status == StatusMissao.PENDENTE:
            self.reabrir()
            return
        if novo_status == StatusMissao.CONCLUIDA:
            self.concluir()
            return
        self.status = novo_status
        if novo_status == StatusMissao.FALHA_PENDENTE_JUSTIFICATIVA:
            self.completed_at = None
            if self.failed_at is None:
                self.failed_at = datetime.now()
            self.failure_reason = None
            self.general_verdict = None
        elif novo_status == StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO:
            self.completed_at = None
            if self.failed_at is None:
                self.failed_at = datetime.now()
        elif novo_status == StatusMissao.FALHA_REVISADA:
            self.completed_at = None
            if self.failed_at is None:
                self.failed_at = datetime.now()

    def permite_conclusao(self, referencia=None):
        return (
            self.completed_at is None
            and self.status == StatusMissao.PENDENTE
            and not self.esta_vencida(referencia=referencia)
        )

    def esta_vencida(self, referencia=None):
        if self.status == StatusMissao.CONCLUIDA or self._prazo is None:
            return False
        referencia = referencia or date.today()
        return self._prazo < referencia

    def marcar_como_falha(self, instante=None):
        if self.status == StatusMissao.CONCLUIDA:
            raise ValueError("Missão concluída não entra em fluxo de falha.")
        self.status = StatusMissao.FALHA_PENDENTE_JUSTIFICATIVA
        self.completed_at = None
        if self.failed_at is None:
            self.failed_at = self._validar_datetime(instante, "Data de falha inválida.", default_now=True)
        self.failure_reason = None
        self.general_verdict = None

    def registrar_justificativa_soldado(self, motivo):
        if self.status != StatusMissao.FALHA_PENDENTE_JUSTIFICATIVA:
            raise ValueError("A missão não está aguardando justificativa.")
        self.failure_reason = self._validar_texto_opcional(
            motivo,
            "Justificativa da falha não pode ser vazia.",
            obrigatorio=True,
        )
        self.status = StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO

    def registrar_veredito_general(self, veredito):
        if self.status != StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO:
            raise ValueError("Não há justificativa pendente de revisão.")
        if not self.failure_reason:
            raise ValueError("Não é possível revisar sem justificativa prévia do Soldado.")
        self.general_verdict = self._validar_general_verdict(veredito, obrigatorio=True)
        self.status = StatusMissao.FALHA_REVISADA

    def _normalizar_consistencia_inicial(self):
        if self.status == StatusMissao.CONCLUIDA:
            if self.completed_at is None:
                self.completed_at = self.created_at
            self.failed_at = None
            self.failure_reason = None
            self.general_verdict = None
            return

        self.completed_at = None

        if self.status == StatusMissao.PENDENTE:
            self.failed_at = None
            self.failure_reason = None
            self.general_verdict = None
            return

        if self.failed_at is None:
            self.failed_at = self.created_at

        if self.status == StatusMissao.FALHA_PENDENTE_JUSTIFICATIVA:
            self.failure_reason = None
            self.general_verdict = None
            return

        if self.status == StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO:
            self.general_verdict = None
            return

        if self.status == StatusMissao.FALHA_REVISADA and self.general_verdict is None:
            raise ValueError("Falha revisada precisa de resultado da revisão.")

    def _validar_missao_id(self, missao_id):
        if missao_id is None:
            return None
        if not isinstance(missao_id, int):
            raise ValueError("ID da missão deve ser um número inteiro.")
        if missao_id < 1:
            raise ValueError("ID da missão deve ser maior que zero.")
        return missao_id

    def _validar_user_id(self, user_id):
        if user_id is None:
            return None
        if not isinstance(user_id, int) or user_id < 1:
            raise ValueError("ID do usuário da missão deve ser um inteiro positivo.")
        return user_id

    def _validar_prioridade(self, prioridade):
        if isinstance(prioridade, PrioridadeMissao):
            return prioridade
        try:
            return PrioridadeMissao(prioridade)
        except ValueError as erro:
            raise ValueError("Prioridade deve ser entre 1 e 3.") from erro

    def _validar_prazo(self, prazo):
        if prazo is None:
            return None
        if isinstance(prazo, datetime):
            return prazo.date()
        if isinstance(prazo, date):
            return prazo
        if not isinstance(prazo, str):
            raise ValueError("Formato de data inválido. Use DD-MM-YYYY.")
        try:
            return datetime.strptime(prazo, "%d-%m-%Y").date()
        except ValueError as erro:
            raise ValueError("Formato de data inválido. Use DD-MM-YYYY.") from erro

    def _validar_status(self, status):
        if isinstance(status, StatusMissao):
            return status
        status_normalizado = _STATUS_ALIAS.get(status, status)
        try:
            return StatusMissao(status_normalizado)
        except ValueError as erro:
            raise ValueError("Status de missão inválido.") from erro

    def _validar_is_decided(self, is_decided):
        if not isinstance(is_decided, bool):
            raise ValueError("Marcador de decisão deve ser booleano.")
        return is_decided

    def _validar_datetime(self, valor, mensagem_erro, default_now=False):
        if valor is None:
            return datetime.now() if default_now else None
        if isinstance(valor, str):
            try:
                return datetime.fromisoformat(valor)
            except ValueError as erro:
                raise ValueError(mensagem_erro) from erro
        if not isinstance(valor, datetime):
            raise ValueError(mensagem_erro)
        return valor

    def _validar_texto_opcional(self, valor, mensagem_erro, obrigatorio=False):
        if valor is None:
            if obrigatorio:
                raise ValueError(mensagem_erro)
            return None
        if not isinstance(valor, str):
            raise ValueError(mensagem_erro)
        texto = valor.strip()
        if not texto:
            if obrigatorio:
                raise ValueError(mensagem_erro)
            return None
        return texto

    def _validar_general_verdict(self, veredito, obrigatorio=False):
        if veredito is None:
            if obrigatorio:
                raise ValueError("Resultado da revisão do General é obrigatório.")
            return None
        if not isinstance(veredito, str):
            raise ValueError("Resultado da revisão do General é inválido.")
        normalizado = _REVIEW_OUTCOME_ALIAS.get(veredito.strip().lower())
        if normalizado is None:
            raise ValueError("Resultado da revisão do General é inválido.")
        return normalizado

    def _validar_titulo(self, titulo):
        if not isinstance(titulo, str):
            raise ValueError("Título da missão deve ser um texto.")
        titulo = titulo.strip()
        if not titulo:
            raise ValueError("Título da missão é obrigatório.")
        return titulo

    def _validar_instrucao(self, instrucao):
        if not isinstance(instrucao, str):
            raise ValueError("Instrução da missão deve ser um texto.")
        instrucao = instrucao.strip()
        if not instrucao:
            raise ValueError("Instrução da missão é obrigatória.")
        return instrucao
