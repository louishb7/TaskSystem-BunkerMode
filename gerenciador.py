from missao import Missao, StatusMissao


class MissaoNaoEncontrada(Exception):
    """Erro levantado quando uma missão não é encontrada pelo ID."""


class GerenciadorDeMissoes:
    """Centraliza as regras de manipulação da lista de missões."""

    def __init__(self, repositorio):
        """
        Inicializa o gerenciador com o repositório informado.

        Carrega as missões persistidas e mantém a lista ordenada
        por prioridade desde o início da execução.
        """
        self.repositorio = repositorio
        self.missoes = self.repositorio.carregar_dados()
        self._ordenar_missoes()

    def adicionar_missao(self, dados_missao):
        """Cria uma nova missão, atribui um ID único e persiste a alteração."""
        dados_missao["id"] = self._proximo_id()
        nova_missao = Missao(**dados_missao)
        self.missoes.append(nova_missao)
        self._ordenar_missoes()
        self._salvar()
        return nova_missao

    def editar_missao(self, id_procurado, novos_dados):
        """
        Atualiza apenas os campos informados de uma missão já existente.

        Busca a missão pelo ID, aplica alterações parciais e persiste
        o novo estado da lista após a edição.
        """
        missao = self.buscar_por_id(id_procurado)

        if "titulo" in novos_dados:
            missao.atualizar_titulo(novos_dados["titulo"])

        if "instrucao" in novos_dados:
            missao.atualizar_instrucao(novos_dados["instrucao"])

        if "prioridade" in novos_dados:
            missao.atualizar_prioridade(novos_dados["prioridade"])

        if "prazo" in novos_dados:
            missao.atualizar_prazo(novos_dados["prazo"])

        self._ordenar_missoes()
        self._salvar()
        return missao

    def remover_missao(self, id_procurado):
        """Remove a missão pelo ID informado e persiste a alteração."""
        missao = self.buscar_por_id(id_procurado)
        self.missoes.remove(missao)
        self._salvar()
        return missao

    def listar_missoes(self):
        """Retorna uma cópia da lista de missões ordenadas."""
        return list(self.missoes)

    def detalhar_missao(self, id_procurado):
        """Retorna uma missão específica sem modificar seu estado."""
        return self.buscar_por_id(id_procurado)

    def concluir_missao(self, id_procurado):
        """Marca a missão como concluída e persiste a alteração."""
        missao = self.buscar_por_id(id_procurado)
        missao.concluir()
        self._salvar()
        return missao

    def buscar_por_id(self, id_procurado):
        """
        Retorna a missão correspondente ao ID informado.

        Levanta MissaoNaoEncontrada caso não exista.
        """
        for missao in self.missoes:
            if missao.id == id_procurado:
                return missao

        raise MissaoNaoEncontrada(f"Missão {id_procurado} não encontrada")

    def gerar_relatorio(self):
        """Agrupa as missões em concluídas e pendentes com base no status."""
        concluidas = [
            missao
            for missao in self.missoes
            if missao.status == StatusMissao.CONCLUIDA
        ]

        pendentes = [
            missao
            for missao in self.missoes
            if missao.status != StatusMissao.CONCLUIDA
        ]

        return {
            "total": len(self.missoes),
            "concluidas": concluidas,
            "pendentes": pendentes,
        }

    # ===== MÉTODOS AUXILIARES =====
    def _ordenar_missoes(self):
        """Mantém a lista de missões ordenada por prioridade."""
        self.missoes.sort(key=lambda missao: missao.prioridade.value)

    def _proximo_id(self):
        """Retorna o próximo ID disponível para uma nova missão."""
        if not self.missoes:
            return 1
        return max(missao.id for missao in self.missoes) + 1

    def _salvar(self):
        """Persiste no repositório o estado atual da lista de missões."""
        self.repositorio.salvar_dados(self.missoes)
