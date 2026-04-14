class Missao:

    def __init__(self, missao, prioridade, prazo, descricao):
        if prioridade not in [1, 2, 3]:
            raise ValueError("Prioridade inválida")

        self.missao = missao
        self.prioridade = prioridade
        self.prazo = prazo
        self.descricao = descricao
