from auditoria import EventoAuditoria
from core_exceptions import MissaoNaoEncontrada
from missao import Missao
from services.exceptions import PermissaoNegadaError
from usuario import PapelUsuario


class MissaoService:
    """Centraliza os casos de uso de missão da API."""

    def __init__(self, repositorio):
        self.repositorio = repositorio

    def criar_missao(self, dados: dict, usuario=None) -> Missao:
        self._validar_permissao_criacao(usuario)

        campos_missao = {
            "titulo": dados["titulo"],
            "prioridade": dados["prioridade"],
            "prazo": dados.get("prazo"),
            "instrucao": dados["instrucao"],
        }
        if dados.get("status") is not None:
            campos_missao["status"] = dados["status"]

        missao = Missao(**campos_missao)
        self.repositorio.adicionar_missao(missao)

        if usuario is not None:
            responsavel_id = dados.get("responsavel_id")
            self.repositorio.salvar_contexto_missao(
                missao.missao_id,
                usuario.usuario_id,
                responsavel_id,
            )
            self._registrar_auditoria(
                missao_id=missao.missao_id,
                usuario_id=usuario.usuario_id,
                acao="missao_criada",
                detalhes=f"Missão '{missao.titulo}' criada.",
            )

        return missao

    def listar_missoes(self, usuario=None) -> list[Missao]:
        if usuario is not None and usuario.papel == PapelUsuario.SOLDADO:
            return list(self.repositorio.carregar_dados_por_responsavel(usuario.usuario_id))
        return list(self.repositorio.carregar_dados())

    def concluir_missao(self, missao_id: int, usuario=None) -> Missao:
        missao = self.buscar_por_id(missao_id)
        self._validar_permissao_conclusao(missao_id, usuario)
        missao.concluir()
        self.repositorio.atualizar_missao(missao)

        if usuario is not None:
            self._registrar_auditoria(
                missao_id=missao.missao_id,
                usuario_id=usuario.usuario_id,
                acao="missao_concluida",
                detalhes=f"Missão '{missao.titulo}' concluída.",
            )

        return missao

    def listar_historico(self, missao_id: int) -> list[EventoAuditoria]:
        self.buscar_por_id(missao_id)
        return self.repositorio.listar_auditoria_por_missao(missao_id)

    def buscar_por_id(self, missao_id: int) -> Missao:
        missao = self.repositorio.buscar_por_id(missao_id)
        if missao is None:
            raise MissaoNaoEncontrada(f"Missão {missao_id} não encontrada")
        return missao

    def _validar_permissao_criacao(self, usuario) -> None:
        if usuario is None:
            return
        if usuario.papel != PapelUsuario.GENERAL:
            raise PermissaoNegadaError("Apenas generals podem criar missões.")

    def _validar_permissao_conclusao(self, missao_id: int, usuario) -> None:
        if usuario is None or usuario.papel == PapelUsuario.GENERAL:
            return

        contexto = self.repositorio.buscar_contexto_missao(missao_id)
        if contexto is None or contexto.get("responsavel_id") != usuario.usuario_id:
            raise PermissaoNegadaError(
                "Você não tem permissão para concluir esta missão."
            )

    def _registrar_auditoria(
        self,
        *,
        missao_id: int,
        usuario_id: int,
        acao: str,
        detalhes: str,
    ) -> None:
        self.repositorio.registrar_auditoria(
            EventoAuditoria(
                missao_id=missao_id,
                usuario_id=usuario_id,
                acao=acao,
                detalhes=detalhes,
            )
        )
