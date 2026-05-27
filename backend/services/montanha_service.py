from datetime import datetime

from backend.services.missao_service import MissaoService
from backend.services.objetivo_service import ObjetivoService
from backend.services.operacao_service import OperacaoService
from backend.services.sonho_service import SonhoService


class MontanhaService:
    """Agrega a leitura da Montanha sem espalhar múltiplas chamadas HTTP."""

    def __init__(self, repositorio, now_provider=None):
        self.repositorio = repositorio
        self._now_provider = now_provider or datetime.now

    def obter_montanha(self, usuario) -> dict:
        sonho_service = SonhoService(self.repositorio, now_provider=self._now)
        objetivo_service = ObjetivoService(self.repositorio, now_provider=self._now)
        missao_service = MissaoService(self.repositorio, now_provider=self._now)
        operacao_service = OperacaoService(self.repositorio, now_provider=self._now)

        operacao_service.materializar_dia_operacional(usuario=usuario)
        missoes = missao_service.listar_missoes(usuario=usuario)
        missoes_do_dia = missao_service.listar_missoes_do_dia_operacional(usuario=usuario)

        return {
            "sonhos": sonho_service.listar_sonhos(usuario),
            "objetivos": objetivo_service.listar_objetivos(usuario),
            "missions": missao_service.to_response_list(missoes, usuario=usuario),
            "daily_missions": missao_service.to_response_list(missoes_do_dia, usuario=usuario),
        }

    def _now(self):
        return self._now_provider()
