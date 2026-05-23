from datetime import datetime

from services.exceptions import PermissaoNegadaError
from sonho import Sonho, TipoSonho


class SonhoService:
    """Casos de uso da camada Sonho da Montanha."""

    def __init__(self, repositorio, now_provider=None):
        self.repositorio = repositorio
        self._now_provider = now_provider or datetime.now

    def listar_sonhos(self, usuario) -> list[dict]:
        self._garantir_modo_general(usuario)
        return [
            sonho.to_dict()
            for sonho in self.repositorio.listar_sonhos_por_usuario(usuario.usuario_id)
        ]

    def criar_sonho(self, usuario, payload: dict) -> dict:
        self._garantir_modo_general(usuario)
        try:
            tipo = TipoSonho(str(payload.get("tipo", "")).strip().lower())
        except ValueError as erro:
            raise ValueError("Tipo de sonho inválido.") from erro
        self._validar_limites(usuario.usuario_id, tipo)
        sonho = Sonho(
            usuario_id=usuario.usuario_id,
            titulo=payload.get("titulo"),
            descricao=payload.get("descricao"),
            tipo=tipo,
            created_at=self._now(),
            updated_at=self._now(),
        )
        self.repositorio.criar_sonho(sonho)
        return sonho.to_dict()

    def atualizar_sonho(self, usuario, sonho_id: int, payload: dict) -> dict:
        self._garantir_modo_general(usuario)
        sonho = self._buscar_sonho_do_usuario(usuario, sonho_id)
        sonho.atualizar_dados(payload, instante=self._now())
        self.repositorio.atualizar_sonho(sonho)
        return sonho.to_dict()

    def promover_para_principal(self, usuario, sonho_id: int) -> dict:
        self._garantir_modo_general(usuario)
        alvo = self._buscar_sonho_do_usuario(usuario, sonho_id)
        if not alvo.esta_ativo():
            raise ValueError("Apenas sonhos ativos podem ser promovidos.")

        promover_atomico = getattr(self.repositorio, "promover_sonho_para_principal", None)
        if callable(promover_atomico):
            promover_atomico(usuario.usuario_id, alvo.sonho_id, self._now())
        else:
            for sonho in self.repositorio.listar_sonhos_por_usuario(usuario.usuario_id):
                if sonho.esta_ativo() and sonho.tipo == TipoSonho.PRINCIPAL:
                    sonho.definir_tipo(TipoSonho.SECUNDARIO, instante=self._now())
                    self.repositorio.atualizar_sonho(sonho)
            alvo.definir_tipo(TipoSonho.PRINCIPAL, instante=self._now())
            self.repositorio.atualizar_sonho(alvo)

        return self._buscar_sonho_do_usuario(usuario, sonho_id).to_dict()

    def arquivar_sonho(self, usuario, sonho_id: int, justificativa: str) -> dict:
        self._garantir_modo_general(usuario)
        sonho = self._buscar_sonho_do_usuario(usuario, sonho_id)
        sonho.arquivar(justificativa, instante=self._now())
        self.repositorio.atualizar_sonho(sonho)
        return sonho.to_dict()

    def _validar_limites(self, usuario_id: int, tipo: TipoSonho) -> None:
        contagem = self.repositorio.contar_sonhos_ativos_por_usuario(usuario_id)
        if contagem["total"] >= 4:
            raise ValueError("Limite de quatro sonhos ativos atingido.")
        if tipo == TipoSonho.PRINCIPAL and contagem["principal"] >= 1:
            raise ValueError("Já existe um sonho principal ativo.")
        if tipo == TipoSonho.SECUNDARIO and contagem["secundario"] >= 3:
            raise ValueError("Limite de três sonhos secundários ativos atingido.")

    def _buscar_sonho_do_usuario(self, usuario, sonho_id: int) -> Sonho:
        sonho = self.repositorio.buscar_sonho_por_id(sonho_id)
        if sonho is None or sonho.usuario_id != usuario.usuario_id:
            raise ValueError("Sonho não encontrado.")
        return sonho

    def _now(self):
        return self._now_provider()

    def _garantir_modo_general(self, usuario) -> None:
        if usuario is not None and getattr(usuario, "active_mode", "general") != "general":
            raise PermissaoNegadaError(
                "Planejamento indisponível enquanto o modo Soldado estiver ativo."
            )
