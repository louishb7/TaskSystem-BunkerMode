from datetime import datetime

from backend.services.missao_service import MissaoService
from backend.services.operacao_service import OperacaoService
from backend.services.revisao_service import RevisaoService


class ComandoService:
    """Agrega dados secundários do Comando General em uma única chamada."""

    def __init__(self, repositorio, now_provider=None):
        self.repositorio = repositorio
        self._now_provider = now_provider or datetime.now

    def obter_suporte_general(self, usuario) -> dict:
        missao_service = MissaoService(self.repositorio, now_provider=self._now)
        revisao_service = RevisaoService(self.repositorio, now_provider=self._now)
        operacao_service = OperacaoService(self.repositorio, now_provider=self._now)

        return {
            "review_missions": missao_service.to_response_list(
                missao_service.listar_missoes_para_revisao(usuario=usuario),
                usuario=usuario,
            ),
            "historical_missions": missao_service.to_response_list(
                missao_service.listar_missoes_historicas(usuario=usuario),
                usuario=usuario,
            ),
            "review_state": revisao_service.obter_estado(usuario),
            "weekly_reviews": revisao_service.listar_revisoes(usuario),
            "operations": operacao_service.listar_operacoes(usuario=usuario),
        }

    def _now(self):
        return self._now_provider()
