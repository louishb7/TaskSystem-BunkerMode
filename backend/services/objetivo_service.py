from datetime import datetime

from backend.models.objetivo import Objetivo
from backend.services.exceptions import PermissaoNegadaError


class ObjetivoService:
    """Casos de uso da camada Objetivo da Montanha."""

    def __init__(self, repositorio, now_provider=None):
        self.repositorio = repositorio
        self._now_provider = now_provider or datetime.now

    def listar_objetivos(self, usuario) -> list[dict]:
        self._garantir_modo_general(usuario)
        return [
            objetivo.to_dict()
            for objetivo in self.repositorio.listar_objetivos_por_usuario(usuario.usuario_id)
        ]

    def criar_objetivo(self, usuario, payload: dict) -> dict:
        self._garantir_modo_general(usuario)
        self._garantir_sonho_do_usuario(usuario, payload.get("sonho_id"))
        agora = self._now()
        calcular_order_index = getattr(self.repositorio, "proximo_order_index_objetivo", None)
        proximo_order_index = (
            calcular_order_index(usuario.usuario_id, payload.get("sonho_id"))
            if callable(calcular_order_index)
            else 0
        )
        objetivo = Objetivo(
            usuario_id=usuario.usuario_id,
            sonho_id=payload.get("sonho_id"),
            titulo=payload.get("titulo"),
            descricao=payload.get("descricao"),
            data_alvo=payload.get("data_alvo"),
            progresso=payload.get("progresso", 0),
            order_index=proximo_order_index,
            created_at=agora,
            updated_at=agora,
        )
        self.repositorio.criar_objetivo(objetivo)
        return objetivo.to_dict()

    def atualizar_objetivo(self, usuario, objetivo_id: int, payload: dict) -> dict:
        self._garantir_modo_general(usuario)
        self._garantir_sonho_do_usuario(usuario, payload.get("sonho_id"))
        objetivo = self._buscar_objetivo_do_usuario(usuario, objetivo_id)
        objetivo.atualizar_dados(payload, instante=self._now())
        self.repositorio.atualizar_objetivo(objetivo)
        return objetivo.to_dict()

    def atualizar_progresso(self, usuario, objetivo_id: int, progresso: int) -> dict:
        self._garantir_modo_general(usuario)
        objetivo = self._buscar_objetivo_do_usuario(usuario, objetivo_id)
        objetivo.atualizar_progresso(progresso, instante=self._now())
        self.repositorio.atualizar_objetivo(objetivo)
        return objetivo.to_dict()

    def atualizar_status(self, usuario, objetivo_id: int, status: str) -> dict:
        self._garantir_modo_general(usuario)
        objetivo = self._buscar_objetivo_do_usuario(usuario, objetivo_id)
        objetivo.atualizar_status(status, instante=self._now())
        self.repositorio.atualizar_objetivo(objetivo)
        return objetivo.to_dict()

    def reordenar_objetivos(self, usuario, objetivo_ids: list[int]) -> list[dict]:
        self._garantir_modo_general(usuario)
        if len(set(objetivo_ids)) != len(objetivo_ids):
            raise ValueError("Lista de objetivos contém duplicidade.")
        objetivos = [self._buscar_objetivo_do_usuario(usuario, objetivo_id) for objetivo_id in objetivo_ids]
        sonho_ids = {objetivo.sonho_id for objetivo in objetivos}
        if len(sonho_ids) > 1:
            raise ValueError("Reordene apenas objetivos da mesma rota.")

        self.repositorio.atualizar_ordem_objetivos(usuario.usuario_id, objetivo_ids)
        return self.listar_objetivos(usuario)

    def deletar_objetivo(self, usuario, objetivo_id: int) -> None:
        self._garantir_modo_general(usuario)
        self._buscar_objetivo_do_usuario(usuario, objetivo_id)
        self.repositorio.deletar_objetivo(objetivo_id, usuario.usuario_id)

    def _buscar_objetivo_do_usuario(self, usuario, objetivo_id: int) -> Objetivo:
        objetivo = self.repositorio.buscar_objetivo_por_id(objetivo_id)
        if objetivo is None or objetivo.usuario_id != usuario.usuario_id:
            raise ValueError("Objetivo não encontrado.")
        return objetivo

    def _garantir_sonho_do_usuario(self, usuario, sonho_id: int | None) -> None:
        if sonho_id is None:
            return
        sonho = self.repositorio.buscar_sonho_por_id(sonho_id)
        if sonho is None or sonho.usuario_id != usuario.usuario_id:
            raise ValueError("Sonho vinculado não encontrado.")

    def _now(self):
        return self._now_provider()

    def _garantir_modo_general(self, usuario) -> None:
        if usuario is not None and getattr(usuario, "active_mode", "general") != "general":
            raise PermissaoNegadaError(
                "Planejamento indisponível enquanto o modo Soldado estiver ativo."
            )
