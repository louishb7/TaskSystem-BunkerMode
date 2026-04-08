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

    Garante a integridade básica da entidade, validando a prioridade
    permitida e o formato final do prazo quando ele for informado.
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
        self.id = id
        self.titulo = titulo
        self.prioridade = self._validar_prioridade(prioridade)
        self.prazo = self._validar_prazo(prazo)
        self.instrucao = instrucao
        self.status = self._validar_status(status)

    def _validar_prioridade(self, prioridade):
        """Garante que a prioridade da missão seja um valor válido do domínio."""
        if isinstance(prioridade, PrioridadeMissao):
            return prioridade

        try:
            return PrioridadeMissao(prioridade)
        except ValueError:
            raise ValueError("Prioridade deve ser entre 1 e 3.")

    def _validar_prazo(self, prazo):
        """
        Valida e normaliza o prazo para o formato DD-MM-YYYY.

        Retorna None quando a missão não possui prazo definido.
        """
        if prazo is not None:
            try:
                return datetime.strptime(prazo, "%d-%m-%Y").strftime(
                    "%d-%m-%Y"
                )
            except ValueError:
                raise ValueError("Formato de data inválido. Use DD-MM-YYYY")
        return prazo

    def _validar_status(self, status):
        """Garante que o status da missão seja um valor válido do domínio."""
        if isinstance(status, StatusMissao):
            return status

        try:
            return StatusMissao(status)
        except ValueError:
            raise ValueError("Status de missão inválido.")

    def descricao_prioridade(self):
        """Retorna a descrição textual da prioridade."""
        if self.prioridade == PrioridadeMissao.ALTA:
            return "Faça! Prioridade máxima."
        elif self.prioridade == PrioridadeMissao.MEDIA:
            return "Média Prioridade!"
        return "Baixa prioridade."

    def atualizar_titulo(self, titulo):
        """Atualiza o título da missão"""
        self.titulo = titulo

    def atualizar_instrucao(self, instrucao):
        """Atualiza a instrução da missão."""
        self.instrucao = instrucao

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
