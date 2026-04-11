from typing import Protocol

from missao import Missao, StatusMissao


class MissaoNaoEncontrada(Exception):
    """Erro levantado quando uma missão não é encontrada pelo ID."""


class RepositorioDeMissoes(Protocol):
    """Contrato mínimo esperado pelo gerenciador para persistir missões."""

    def carregar_dados(self) -> list[Missao]:
        """Retorna todas as missões persistidas já ordenadas."""

    def adicionar_missao(self, missao: Missao) -> None:
        """Persiste uma nova missão e atualiza seu ID, se necessário."""

    def buscar_por_id(self, missao_id: int) -> Missao | None:
        """Retorna a missão correspondente ao ID ou ``None``."""

    def atualizar_missao(self, missao: Missao) -> None:
        """Persiste as alterações de uma missão existente."""

    def remover_missao(self, missao_id: int) -> None:
        """Remove a missão persistida correspondente ao ID."""


class GerenciadorDeMissoes:
    """Centraliza as regras de negócio de manipulação das missões."""

    def __init__(self, repositorio: RepositorioDeMissoes):
        """Inicializa o gerenciador com um repositório compatível."""
        self.repositorio = repositorio

    def adicionar_missao(self, dados: dict) -> Missao:
        """Cria uma nova missão e delega a persistência ao repositório."""
        missao = Missao(**dados)
        self.repositorio.adicionar_missao(missao)
        return missao

    def editar_missao(self, id_procurado: int, novos_dados: dict) -> Missao:
        """Atualiza apenas os campos informados de uma missão existente."""
        missao = self.buscar_por_id(id_procurado)
        self._aplicar_atualizacoes(missao, novos_dados)
        self.repositorio.atualizar_missao(missao)
        return missao

    def remover_missao(self, id_procurado: int) -> Missao:
        """Remove a missão pelo ID informado e persiste a alteração."""
        missao = self.buscar_por_id(id_procurado)
        self.repositorio.remover_missao(id_procurado)
        return missao

    def listar_missoes(self) -> list[Missao]:
        """Retorna as missões ordenadas conforme o contrato do repositório."""
        return self.repositorio.carregar_dados()

    def detalhar_missao(self, id_procurado: int) -> Missao:
        """Retorna uma missão específica sem modificar seu estado."""
        return self.buscar_por_id(id_procurado)

    def concluir_missao(self, id_procurado: int) -> Missao:
        """Marca a missão como concluída e persiste a alteração."""
        missao = self.buscar_por_id(id_procurado)
        missao.concluir()
        self.repositorio.atualizar_missao(missao)
        return missao

    def buscar_por_id(self, id_procurado: int) -> Missao:
        """Busca a missão no repositório e levanta erro se não existir."""
        missao = self.repositorio.buscar_por_id(id_procurado)

        if missao is None:
            raise MissaoNaoEncontrada(f"Missão {id_procurado} não encontrada")

        return missao

    def gerar_relatorio(self) -> dict:
        """Agrupa as missões em concluídas e pendentes com base no status."""
        missoes = self.repositorio.carregar_dados()
        concluidas = [
            missao
            for missao in missoes
            if missao.status == StatusMissao.CONCLUIDA
        ]
        pendentes = [
            missao
            for missao in missoes
            if missao.status != StatusMissao.CONCLUIDA
        ]

        return {
            "total": len(missoes),
            "concluidas": concluidas,
            "pendentes": pendentes,
        }

    def _aplicar_atualizacoes(self, missao: Missao, novos_dados: dict) -> None:
        """Aplica mudanças parciais na entidade antes da persistência."""
        if "titulo" in novos_dados:
            missao.atualizar_titulo(novos_dados["titulo"])

        if "instrucao" in novos_dados:
            missao.atualizar_instrucao(novos_dados["instrucao"])

        if "prioridade" in novos_dados:
            missao.atualizar_prioridade(novos_dados["prioridade"])

        if "prazo" in novos_dados:
            missao.atualizar_prazo(novos_dados["prazo"])
