from core_exceptions import MissaoNaoEncontrada
from typing import Protocol

from missao import Missao
from services.missao_service import MissaoService


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
    """Fachada compatível com CLI para a camada de serviço de missões."""

    def __init__(self, repositorio: RepositorioDeMissoes):
        self.repositorio = repositorio
        self.service = MissaoService(repositorio)

    def adicionar_missao(self, dados: dict) -> Missao:
        return self.service.criar_missao(dados)

    def editar_missao(self, id_procurado: int, novos_dados: dict) -> Missao:
        return self.service.editar_missao(id_procurado, novos_dados)

    def remover_missao(self, id_procurado: int) -> Missao:
        return self.service.remover_missao(id_procurado)

    def listar_missoes(self) -> list[Missao]:
        return self.service.listar_missoes()

    def detalhar_missao(self, id_procurado: int) -> Missao:
        return self.service.detalhar_missao(id_procurado)

    def concluir_missao(self, id_procurado: int) -> Missao:
        return self.service.concluir_missao(id_procurado)

    def buscar_por_id(self, id_procurado: int) -> Missao:
        return self.service.buscar_por_id(id_procurado)

    def gerar_relatorio(self) -> dict:
        return self.service.gerar_relatorio()
