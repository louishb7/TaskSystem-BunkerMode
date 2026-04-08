from datetime import datetime
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

    Garante a integridade da entidade validando ID, título, instrução,
    prioridade, prazo e status no momento da criação e das atualizações.
    """

    def __init__(
        self,
        id,
        titulo,
        prioridade,
        prazo,
        instrucao,
        status=StatusMissao.PENDENTE,
    ):
        self.id = self._validar_id(id)
        self.titulo = self._validar_titulo(titulo)
        self.prioridade = self._validar_prioridade(prioridade)
        self.prazo = self._validar_prazo(prazo)
        self.instrucao = self._validar_instrucao(instrucao)
        self.status = self._validar_status(status)

    def descricao_prioridade(self):
        """Retorna a descrição textual da prioridade."""
        if self.prioridade == PrioridadeMissao.ALTA:
            return "Faça! Prioridade máxima."
        if self.prioridade == PrioridadeMissao.MEDIA:
            return "Média prioridade."
        return "Baixa prioridade."

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
        self.prazo = self._validar_prazo(prazo)

    def concluir(self):
        """Marca a missão como concluída."""
        if self.status == StatusMissao.CONCLUIDA:
            raise ValueError("Esta missão já está concluída.")
        self.status = StatusMissao.CONCLUIDA

    def para_dict(self):
        """Retorna uma representação serializável da missão."""
        return {
            "id": self.id,
            "titulo": self.titulo,
            "prioridade": self.prioridade.value,
            "prazo": self.prazo,
            "instrucao": self.instrucao,
            "status": self.status.value,
        }

    # ===== MÉTODOS AUXILIARES =====
    def _validar_id(self, id):
        """Garante que o ID da missão seja um inteiro positivo."""
        if not isinstance(id, int):
            raise ValueError("ID da missão deve ser um número inteiro.")

        if id < 1:
            raise ValueError("ID da missão deve ser maior que zero.")

        return id

    def _validar_prioridade(self, prioridade):
        """Garante que a prioridade da missão seja um valor válido do domínio."""
        if isinstance(prioridade, PrioridadeMissao):
            return prioridade

        try:
            return PrioridadeMissao(prioridade)
        except ValueError as e:
            raise ValueError("Prioridade deve ser entre 1 e 3.") from e

    def _validar_prazo(self, prazo):
        """
        Valida e normaliza o prazo para o formato DD-MM-YYYY.

        Retorna None quando a missão não possui prazo definido.
        """
        if prazo is None:
            return None

        try:
            return datetime.strptime(prazo, "%d-%m-%Y").strftime("%d-%m-%Y")
        except ValueError as e:
            raise ValueError(
                "Formato de data inválido. Use DD-MM-YYYY."
            ) from e

    def _validar_status(self, status):
        """Garante que o status da missão seja um valor válido do domínio."""
        if isinstance(status, StatusMissao):
            return status

        try:
            return StatusMissao(status)
        except ValueError as e:
            raise ValueError("Status de missão inválido.") from e

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
