from datetime import datetime

STATUS_PENDENTE = "Aguardando Recruta!"
STATUS_CONCLUIDA = "Concluída"


class Missao:
    """
    Representa uma missão do sistema com seus dados essenciais.

    Garante a integridade básica da entidade, validando a prioridade
    permitida e o formato final do prazo quando ele for informado.
    """

    def __init__(
        self,
        id,
        missao,
        prioridade,
        prazo,
        instrucao,
        status=STATUS_PENDENTE,
    ):
        self.id = id
        self.missao = missao
        self.prioridade = self._validar_prioridade(prioridade)
        self.prazo = self._validar_prazo(prazo)
        self.instrucao = instrucao
        self.status = status

    def _validar_prioridade(self, prioridade):
        """Valida se a prioridade está dentro do intervalo permitido."""
        if prioridade not in [1, 2, 3]:
            raise ValueError("Prioridade deve ser entre 1 e 3")
        return prioridade

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

    def atualizar_titulo(self, titulo):
        """Atualiza o título da missão"""
        self.missao = titulo

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
        self.status = STATUS_CONCLUIDA
