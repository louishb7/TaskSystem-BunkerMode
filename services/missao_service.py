from datetime import date, datetime

from auditoria import EventoAuditoria
from core_exceptions import MissaoNaoEncontrada
from missao import Missao, StatusMissao
from services.exceptions import PermissaoNegadaError
from services.mission_permissions import MissionPermissions


class MissaoService:
    """Centraliza os casos de uso de missão da API."""

    def __init__(self, repositorio, today_provider=None, now_provider=None):
        self.repositorio = repositorio
        self._today_provider = today_provider or date.today
        self._now_provider = now_provider or datetime.now

    def criar_missao(self, dados: dict, usuario=None) -> Missao:
        self._garantir_modo_general(usuario)
        responsavel_id = dados.get("responsavel_id") or getattr(usuario, "usuario_id", None)
        campos_missao = {
            "titulo": dados["titulo"],
            "prioridade": dados["prioridade"],
            "prazo": dados.get("prazo"),
            "instrucao": dados["instrucao"],
            "user_id": responsavel_id,
        }
        if dados.get("status") is not None:
            campos_missao["status"] = dados["status"]

        missao = Missao(**campos_missao)
        self.repositorio.adicionar_missao(missao)

        if usuario is not None:
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
        missoes = self._carregar_missoes_do_usuario(usuario)
        self._reconciliar_falhas(usuario, missoes)
        missoes = self.sort_missions_for_board(missoes)

        if usuario is not None and getattr(usuario, "active_mode", "general") == "soldier":
            return [missao for missao in missoes if missao.is_visible_to_soldier(self._today())]

        return [missao for missao in missoes if missao.is_visible_to_general_board()]

    def listar_missoes_historicas(self, usuario=None) -> list[Missao]:
        self._garantir_modo_general(usuario)
        missoes = self._carregar_missoes_do_usuario(usuario)
        self._reconciliar_falhas(usuario, missoes)
        return self.sort_missions_for_board(
            [missao for missao in missoes if missao.is_finalized()]
        )

    def listar_missoes_para_revisao(self, usuario=None) -> list[Missao]:
        self._garantir_modo_general(usuario)
        return [
            missao
            for missao in self.sort_missions_for_board(self._carregar_missoes_do_usuario(usuario))
            if missao.requires_general_review()
        ]

    def editar_missao(self, missao_id: int, dados: dict, usuario=None) -> Missao:
        self._garantir_modo_general(usuario)
        missao = self._buscar_por_id_do_usuario(missao_id, usuario)
        if not missao.can_be_edited_by_general():
            raise ValueError("Missão finalizada por revisão não pode ser editada pelo General.")

        if "titulo" in dados:
            missao.atualizar_titulo(dados["titulo"])
        if "instrucao" in dados:
            missao.atualizar_instrucao(dados["instrucao"])
        if "prioridade" in dados:
            missao.atualizar_prioridade(dados["prioridade"])
        if "prazo" in dados:
            missao.atualizar_prazo(dados["prazo"])
        if "status" in dados:
            self._aplicar_status_editavel_pelo_general(missao, dados["status"])

        self._reconciliar_estado_apos_edicao(missao)
        self.repositorio.atualizar_missao(missao)

        if usuario is not None:
            self._registrar_auditoria(
                missao_id=missao.missao_id,
                usuario_id=usuario.usuario_id,
                acao="missao_atualizada",
                detalhes=f"Missão '{missao.titulo}' atualizada.",
            )

        return missao

    def concluir_missao(self, missao_id: int, usuario=None) -> Missao:
        self._garantir_modo_soldado(usuario)
        missao = self._buscar_por_id_do_usuario(missao_id, usuario)
        if missao.user_id is not None and usuario is not None and missao.user_id != usuario.usuario_id:
            raise MissaoNaoEncontrada(f"Missão {missao_id} não encontrada")

        self._marcar_falha_se_vencida(missao, usuario)
        if not missao.can_be_completed(reference_date=self._today()):
            raise ValueError(
                "Missão fora do prazo. A conclusão foi bloqueada e a missão exige justificativa."
            )

        missao.concluir(instante=self._now(), referencia=self._today())
        self.repositorio.atualizar_missao(missao)

        if usuario is not None:
            self._registrar_auditoria(
                missao_id=missao.missao_id,
                usuario_id=usuario.usuario_id,
                acao="missao_concluida",
                detalhes=f"Missão '{missao.titulo}' concluída.",
            )

        return missao

    def alternar_decisao(self, missao_id: int, usuario=None) -> Missao:
        self._garantir_modo_general(usuario)
        missao = self._buscar_por_id_do_usuario(missao_id, usuario)
        if not missao.can_be_marked_decided():
            raise ValueError("Apenas missões pendentes podem receber o marcador de decisão.")
        missao.alternar_decisao()
        self.repositorio.atualizar_missao(missao)

        if usuario is not None:
            self._registrar_auditoria(
                missao_id=missao.missao_id,
                usuario_id=usuario.usuario_id,
                acao="missao_decidida" if missao.is_decided else "missao_decisao_removida",
                detalhes=(
                    "General marcou a missão como compromisso decidido."
                    if missao.is_decided
                    else "General removeu o marcador de compromisso decidido."
                ),
            )

        return missao

    def listar_historico(self, missao_id: int, usuario=None) -> list[EventoAuditoria]:
        self._garantir_modo_general(usuario)
        self._buscar_por_id_do_usuario(missao_id, usuario)
        return self.repositorio.listar_auditoria_por_missao(missao_id)

    def registrar_justificativa_soldado(self, missao_id: int, motivo: str, usuario=None) -> Missao:
        self._garantir_modo_soldado(usuario)
        missao = self._buscar_por_id_do_usuario(missao_id, usuario)
        self._marcar_falha_se_vencida(missao, usuario)
        missao.registrar_justificativa_soldado(motivo)
        self.repositorio.atualizar_missao(missao)

        if usuario is not None:
            self._registrar_auditoria(
                missao_id=missao.missao_id,
                usuario_id=usuario.usuario_id,
                acao="justificativa_registrada",
                detalhes=f"Soldado registrou justificativa: {missao.failure_reason}",
            )

        return missao

    def revisar_justificativa(self, missao_id: int, accepted: bool, usuario=None) -> Missao:
        self._garantir_modo_general(usuario)
        missao = self._buscar_por_id_do_usuario(missao_id, usuario)
        veredito = "accepted" if accepted else "rejected"
        missao.registrar_veredito_general(veredito)
        self.repositorio.atualizar_missao(missao)

        if usuario is not None:
            self._registrar_auditoria(
                missao_id=missao.missao_id,
                usuario_id=usuario.usuario_id,
                acao="justificativa_aceita" if accepted else "justificativa_recusada",
                detalhes=(
                    "General aceitou a justificativa da falha."
                    if accepted
                    else "General rejeitou a justificativa da falha."
                ),
            )

        return missao

    def registrar_veredito_general(self, missao_id: int, veredito: str, usuario=None) -> Missao:
        return self.revisar_justificativa(
            missao_id,
            accepted=veredito.strip().lower() in {"accepted", "justified"},
            usuario=usuario,
        )

    def remover_missao(self, missao_id: int, usuario=None) -> None:
        self._garantir_modo_general(usuario)
        missao = self._buscar_por_id_do_usuario(missao_id, usuario)
        if not missao.can_be_deleted_by_general():
            raise ValueError("Apenas missões operacionais podem ser removidas pelo General.")
        self.repositorio.remover_missao(missao_id)

        if usuario is not None:
            self._registrar_auditoria(
                missao_id=missao_id,
                usuario_id=usuario.usuario_id,
                acao="missao_removida",
                detalhes=f"Missão '{missao.titulo}' removida.",
            )

    def buscar_por_id(self, missao_id: int) -> Missao:
        missao = self.repositorio.buscar_por_id(missao_id)
        if missao is None:
            raise MissaoNaoEncontrada(f"Missão {missao_id} não encontrada")

        contexto = self.repositorio.buscar_contexto_missao(missao_id)
        if contexto is not None:
            missao.atualizar_user_id(contexto.get("responsavel_id"))

        return missao

    def to_response(self, missao: Missao, usuario=None) -> dict:
        return missao.to_dict(
            permissions=self._build_permissions(missao, usuario=usuario).to_dict()
        )

    def to_response_list(self, missoes: list[Missao], usuario=None) -> list[dict]:
        return [self.to_response(missao, usuario=usuario) for missao in missoes]

    def _buscar_por_id_do_usuario(self, missao_id: int, usuario=None) -> Missao:
        missao = self.buscar_por_id(missao_id)
        if usuario is None:
            return missao

        if missao.user_id != usuario.usuario_id:
            raise MissaoNaoEncontrada(f"Missão {missao_id} não encontrada")

        return missao

    def _carregar_missoes_do_usuario(self, usuario=None) -> list[Missao]:
        if usuario is None:
            missoes = list(self.repositorio.carregar_dados())
        else:
            missoes = list(self.repositorio.carregar_dados_por_responsavel(usuario.usuario_id))

        for missao in missoes:
            if usuario is not None:
                missao.atualizar_user_id(usuario.usuario_id)
            else:
                buscar_contexto = getattr(self.repositorio, "buscar_contexto_missao", None)
                contexto = buscar_contexto(missao.missao_id) if callable(buscar_contexto) else None
                if contexto is not None:
                    missao.atualizar_user_id(contexto.get("responsavel_id"))
        return missoes

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

    def _reconciliar_falhas(self, usuario=None, missoes=None) -> None:
        if missoes is None:
            missoes = self._carregar_missoes_do_usuario(usuario)

        for missao in missoes:
            self._marcar_falha_se_vencida(missao, usuario)

    def _marcar_falha_se_vencida(self, missao: Missao, usuario=None) -> None:
        if not missao.is_pending() or not missao.esta_vencida(referencia=self._today()):
            return

        missao.marcar_como_falha(self._now())
        self.repositorio.atualizar_missao(missao)

        if usuario is not None:
            self._registrar_auditoria(
                missao_id=missao.missao_id,
                usuario_id=usuario.usuario_id,
                acao="missao_falhou",
                detalhes=f"Missão '{missao.titulo}' venceu sem conclusão.",
            )

    def _reconciliar_estado_apos_edicao(self, missao: Missao) -> None:
        if missao.is_pending():
            return
        if missao.is_completed():
            return
        if missao.is_failed_waiting_justification() and missao.failure_reason:
            missao.atualizar_status(StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO)
        if missao.is_failed_waiting_review() and missao.general_verdict is not None:
            missao.atualizar_status(StatusMissao.FALHA_REVISADA)

    def _aplicar_status_editavel_pelo_general(self, missao: Missao, status) -> None:
        novo_status = missao._validar_status(status)
        if novo_status != StatusMissao.PENDENTE:
            raise ValueError(
                "Transições de execução devem usar concluir, justificar ou revisar."
            )
        missao.atualizar_status(novo_status)

    def sort_missions_for_board(self, missoes: list[Missao]) -> list[Missao]:
        return sorted(
            missoes,
            key=lambda missao: (
                0 if missao.requires_soldier_justification() else 1,
                0 if missao.is_decided else 1,
                missao.prioridade.value,
                missao.due_date or date.max,
                missao.missao_id or 0,
            ),
        )

    def _build_permissions(self, missao: Missao, usuario=None) -> MissionPermissions:
        modo = getattr(usuario, "active_mode", "general") if usuario is not None else "general"
        is_general = modo == "general"
        is_soldier = modo == "soldier"
        can_view_history = is_general and missao.is_finalized()

        return MissionPermissions(
            can_complete=is_soldier and missao.can_be_completed(reference_date=self._today()),
            can_edit=is_general and missao.can_be_edited_by_general(),
            can_delete=is_general and missao.can_be_deleted_by_general(),
            can_toggle_decided=is_general and missao.can_be_marked_decided(),
            can_justify=is_soldier and missao.requires_soldier_justification(),
            can_review=is_general and missao.requires_general_review(),
            can_view_history=can_view_history,
        )

    def _garantir_modo_general(self, usuario) -> None:
        if usuario is not None and getattr(usuario, "active_mode", "general") != "general":
            raise PermissaoNegadaError(
                "Planejamento indisponível enquanto o modo Soldado estiver ativo."
            )

    def _garantir_modo_soldado(self, usuario) -> None:
        if usuario is not None and getattr(usuario, "active_mode", "general") != "soldier":
            raise PermissaoNegadaError(
                "Conclusão de missão disponível apenas com o modo Soldado ativo."
            )

    def _today(self) -> date:
        return self._today_provider()

    def _now(self) -> datetime:
        return self._now_provider()
