from datetime import date, datetime
from enum import Enum


class StatusMissao(Enum):
    PENDENTE = "Aguardando Recruta!"
    CONCLUIDA = "Concluída"


class PrioridadeMissao(Enum):
    ALTA = 1
    MEDIA = 2
    BAIXA = 3


class Missao:
    """
    Representa uma missão do sistema com seus dados essenciais.

    Mantém a validação do domínio concentrada na entidade.
    O prazo é armazenado internamente como ``date`` para evitar conversões
    espalhadas pela aplicação, mas continua sendo exposto em ``DD-MM-YYYY``
    para não quebrar a interface atual.
    """

    def __init__(
        self,
        missao_id=None,
        titulo=None,
        prioridade=None,
        prazo=None,
        instrucao=None,
        status=StatusMissao.PENDENTE,
        is_decided=False,
    ):
        self.missao_id = self._validar_missao_id(missao_id)
        self.titulo = self._validar_titulo(titulo)
        self.prioridade = self._validar_prioridade(prioridade)
        self._prazo = self._validar_prazo(prazo)
        self.instrucao = self._validar_instrucao(instrucao)
        self.status = self._validar_status(status)
        self.is_decided = self._validar_is_decided(is_decided)

    def to_dict(self):
        return {
            "id": self.missao_id,
            "titulo": self.titulo,
            "prioridade": self.prioridade.value,
            "prazo": self.prazo,
            "instrucao": self.instrucao,
            "status": self.status.value,
            "is_decided": self.is_decided,
        }

    @property
    def prazo(self):
        """Retorna o prazo formatado em DD-MM-YYYY para a camada externa."""
        if self._prazo is None:
            return None
        return self._prazo.strftime("%d-%m-%Y")

    @property
    def prazo_date(self):
        """Retorna o prazo como objeto ``date`` para persistência."""
        return self._prazo

    def descricao_prioridade(self):
        """Retorna a descrição textual da prioridade."""
        descricoes = {
            PrioridadeMissao.ALTA: "Faça! Prioridade máxima.",
            PrioridadeMissao.MEDIA: "Média prioridade.",
            PrioridadeMissao.BAIXA: "Baixa prioridade.",
        }
        return descricoes[self.prioridade]

    def atualizar_missao_id(self, missao_id):
        """Atualiza o ID da missão após a persistência no banco."""
        self.missao_id = self._validar_missao_id(missao_id)

    def atualizar_titulo(self, titulo):
        """Atualiza o título da missão com validação."""
        self.titulo = self._validar_titulo(titulo)

    def atualizar_instrucao(self, instrucao):
        """Atualiza a instrução da missão com validação."""
        self.instrucao = self._validar_instrucao(instrucao)

    def atualizar_prioridade(self, prioridade):
        """Atualiza a prioridade da missão com validação."""
        self.prioridade = self._validar_prioridade(prioridade)

    def atualizar_prazo(self, prazo):
        """Atualiza o prazo da missão com validação e normalização."""
        self._prazo = self._validar_prazo(prazo)

    def concluir(self):
        """Marca a missão como concluída."""
        if self.status == StatusMissao.CONCLUIDA:
            raise ValueError("Esta missão já está concluída.")
        self.status = StatusMissao.CONCLUIDA

    def alternar_decisao(self):
        """Alterna o marcador de compromisso psicológico."""
        self.is_decided = not self.is_decided

    def _validar_missao_id(self, missao_id):
        """Garante que o ID da missão seja um inteiro positivo ou ausente."""
        if missao_id is None:
            return None

        if not isinstance(missao_id, int):
            raise ValueError("ID da missão deve ser um número inteiro.")

        if missao_id < 1:
            raise ValueError("ID da missão deve ser maior que zero.")

        return missao_id

    def _validar_prioridade(self, prioridade):
        """Garante que a prioridade da missão seja um valor válido do domínio."""
        if isinstance(prioridade, PrioridadeMissao):
            return prioridade

        try:
            return PrioridadeMissao(prioridade)
        except ValueError as erro:
            raise ValueError("Prioridade deve ser entre 1 e 3.") from erro

    def _validar_prazo(self, prazo):
        """
        Valida e normaliza o prazo para ``date``.

        Aceita ``None``, string no formato ``DD-MM-YYYY`` ou ``date``.
        """
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
            raise ValueError(
                "Formato de data inválido. Use DD-MM-YYYY."
            ) from erro

    def _validar_status(self, status):
        """Garante que o status da missão seja um valor válido do domínio."""
        if isinstance(status, StatusMissao):
            return status

        try:
            return StatusMissao(status)
        except ValueError as erro:
            raise ValueError("Status de missão inválido.") from erro

    def _validar_is_decided(self, is_decided):
        """Garante que o marcador psicológico seja booleano."""
        if not isinstance(is_decided, bool):
            raise ValueError("Marcador de decisão deve ser booleano.")
        return is_decided

    def _validar_titulo(self, titulo):
        """Valida e normaliza o título da missão."""
        if not isinstance(titulo, str):
            raise ValueError("Título da missão deve ser um texto.")

        titulo = titulo.strip()

        if not titulo:
            raise ValueError("Título da missão não pode ser vazio.")

        return titulo

    def _validar_instrucao(self, instrucao):
        """Valida e normaliza a instrução da missão."""
        if not isinstance(instrucao, str):
            raise ValueError("Instrução da missão deve ser um texto.")

        instrucao = instrucao.strip()

        if not instrucao:
            raise ValueError("Instrução da missão não pode ser vazia.")

        return instrucao
