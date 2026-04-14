from auditoria import EventoAuditoria
from core_exceptions import MissaoNaoEncontrada
from missao import Missao, StatusMissao
from services.exceptions import PermissaoNegadaError
from usuario import PapelUsuario, Usuario


class MissaoService:
    """Centraliza as regras de negócio das missões e seu contexto multiusuário."""

    def __init__(self, repositorio):
        self.repositorio = repositorio

    def criar_missao(self, dados: dict, actor: Usuario | None = None) -> Missao:
        actor = actor or self._usuario_sistema()
        self._garantir_general(actor)

        dados_missao = {
            "titulo": dados["titulo"],
            "prioridade": dados["prioridade"],
            "prazo": dados.get("prazo"),
            "instrucao": dados["instrucao"],
            "status": dados.get("status", StatusMissao.PENDENTE),
        }
        missao = Missao(**dados_missao)
        self.repositorio.adicionar_missao(missao)

        responsavel_id = dados.get("responsavel_id")
        if responsavel_id is not None:
            self._obter_usuario_existente(responsavel_id)

        if hasattr(self.repositorio, "salvar_contexto_missao"):
            self.repositorio.salvar_contexto_missao(
                missao.missao_id,
                criada_por_id=actor.usuario_id,
                responsavel_id=responsavel_id,
            )

        self._registrar_auditoria(
            missao.missao_id,
            actor.usuario_id,
            "missao_criada",
            f"Missão '{missao.titulo}' criada.",
        )
        return missao

    def listar_missoes(self, actor: Usuario | None = None) -> list[Missao]:
        actor = actor or self._usuario_sistema()
        if actor.papel == PapelUsuario.GENERAL:
            return self.repositorio.carregar_dados()
        if hasattr(self.repositorio, "carregar_dados_por_responsavel"):
            return self.repositorio.carregar_dados_por_responsavel(actor.usuario_id)
        return []

    def detalhar_missao(self, missao_id: int, actor: Usuario | None = None) -> Missao:
        actor = actor or self._usuario_sistema()
        missao = self.buscar_por_id(missao_id)
        self._garantir_acesso_missao(actor, missao_id)
        return missao

    def editar_missao(self, missao_id: int, novos_dados: dict, actor: Usuario | None = None) -> Missao:
        actor = actor or self._usuario_sistema()
        self._garantir_general(actor)
        missao = self.buscar_por_id(missao_id)
        self._aplicar_atualizacoes(missao, novos_dados)
        self.repositorio.atualizar_missao(missao)

        if "responsavel_id" in novos_dados and hasattr(self.repositorio, "salvar_contexto_missao"):
            responsavel_id = novos_dados["responsavel_id"]
            if responsavel_id is not None:
                self._obter_usuario_existente(responsavel_id)
            contexto = self._buscar_contexto(missao_id)
            self.repositorio.salvar_contexto_missao(
                missao_id,
                criada_por_id=contexto.get("criada_por_id"),
                responsavel_id=responsavel_id,
            )

        self._registrar_auditoria(
            missao_id,
            actor.usuario_id,
            "missao_editada",
            f"Missão '{missao.titulo}' atualizada.",
        )
        return missao

    def remover_missao(self, missao_id: int, actor: Usuario | None = None) -> Missao:
        actor = actor or self._usuario_sistema()
        self._garantir_general(actor)
        missao = self.buscar_por_id(missao_id)
        self.repositorio.remover_missao(missao_id)
        self._registrar_auditoria(
            missao_id,
            actor.usuario_id,
            "missao_removida",
            f"Missão '{missao.titulo}' removida.",
        )
        return missao

    def concluir_missao(self, missao_id: int, actor: Usuario | None = None) -> Missao:
        actor = actor or self._usuario_sistema()
        self._garantir_acesso_missao(actor, missao_id)
        missao = self.buscar_por_id(missao_id)
        missao.concluir()
        self.repositorio.atualizar_missao(missao)
        self._registrar_auditoria(
            missao_id,
            actor.usuario_id,
            "missao_concluida",
            f"Missão '{missao.titulo}' concluída.",
        )
        return missao

    def gerar_relatorio(self, actor: Usuario | None = None) -> dict:
        missoes = self.listar_missoes(actor)
        concluidas = [m for m in missoes if m.status == StatusMissao.CONCLUIDA]
        pendentes = [m for m in missoes if m.status != StatusMissao.CONCLUIDA]
        return {"total": len(missoes), "concluidas": concluidas, "pendentes": pendentes}

    def buscar_por_id(self, missao_id: int) -> Missao:
        missao = self.repositorio.buscar_por_id(missao_id)
        if missao is None:
            raise MissaoNaoEncontrada(f"Missão {missao_id} não encontrada")
        return missao

    def listar_historico(self, missao_id: int, actor: Usuario) -> list[EventoAuditoria]:
        self._garantir_acesso_missao(actor, missao_id)
        if not hasattr(self.repositorio, "listar_auditoria_por_missao"):
            return []
        return self.repositorio.listar_auditoria_por_missao(missao_id)

    def _garantir_general(self, actor: Usuario) -> None:
        if actor.papel != PapelUsuario.GENERAL:
            raise PermissaoNegadaError("Apenas usuários General podem executar esta ação.")

    def _garantir_acesso_missao(self, actor: Usuario, missao_id: int) -> None:
        if actor.papel == PapelUsuario.GENERAL:
            return
        contexto = self._buscar_contexto(missao_id)
        if contexto.get("responsavel_id") != actor.usuario_id:
            raise PermissaoNegadaError("Usuário sem permissão para acessar esta missão.")

    def _buscar_contexto(self, missao_id: int) -> dict:
        if not hasattr(self.repositorio, "buscar_contexto_missao"):
            return {}
        return self.repositorio.buscar_contexto_missao(missao_id) or {}

    def _obter_usuario_existente(self, usuario_id: int) -> Usuario:
        usuario = self.repositorio.buscar_usuario_por_id(usuario_id)
        if usuario is None:
            raise ValueError(f"Usuário {usuario_id} não encontrado.")
        return usuario

    def _registrar_auditoria(self, missao_id: int, usuario_id: int | None, acao: str, detalhes: str) -> None:
        if not hasattr(self.repositorio, "registrar_auditoria"):
            return
        evento = EventoAuditoria(
            missao_id=missao_id,
            usuario_id=usuario_id,
            acao=acao,
            detalhes=detalhes,
        )
        self.repositorio.registrar_auditoria(evento)

    def _aplicar_atualizacoes(self, missao: Missao, novos_dados: dict) -> None:
        if "titulo" in novos_dados:
            missao.atualizar_titulo(novos_dados["titulo"])
        if "instrucao" in novos_dados:
            missao.atualizar_instrucao(novos_dados["instrucao"])
        if "prioridade" in novos_dados:
            missao.atualizar_prioridade(novos_dados["prioridade"])
        if "prazo" in novos_dados:
            missao.atualizar_prazo(novos_dados["prazo"])

    def _usuario_sistema(self) -> Usuario:
        return Usuario(
            usuario_id=1,
            username="sistema",
            nome="Sistema",
            papel=PapelUsuario.GENERAL,
            senha_hash="sistema$interno",
        )
