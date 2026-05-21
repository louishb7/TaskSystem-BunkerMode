from datetime import date, datetime

from auditoria import EventoAuditoria
from core_exceptions import MissaoNaoEncontrada
from missao import Missao, StatusMissao
from services.exceptions import PermissaoNegadaError
from services.mission_permissions import MissionPermissions
from services.operational_day import operational_date_for


LEGACY_DEFAULT_PRIORITY = 2


class MissaoService:
    """Centraliza os casos de uso de missão da API."""

    def __init__(self, repositorio, today_provider=None, now_provider=None):
        self.repositorio = repositorio
        self._today_provider = today_provider
        self._now_provider = now_provider or datetime.now

    def criar_missao(self, dados: dict, usuario=None) -> Missao:
        self._garantir_modo_general(usuario)
        responsavel_id = dados.get("responsavel_id") or getattr(usuario, "usuario_id", None)
        self._garantir_objetivo_do_usuario(usuario, dados.get("objetivo_id"))
        campos_missao = {
            "titulo": dados["titulo"],
            # Compatibilidade legada do banco/API.
            "prioridade": dados.get("prioridade", LEGACY_DEFAULT_PRIORITY),
            "prazo": dados.get("prazo"),
            "instrucao": dados.get("instrucao"),
            "user_id": responsavel_id,
            "objetivo_id": dados.get("objetivo_id"),
            "recurrence_weekdays": dados.get("recurrence_weekdays"),
            "recurrence_end_date": dados.get("recurrence_end_date"),
            "duration_type": dados.get("duration_type"),
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
        self._reconciliar_falhas(usuario=usuario, missoes=missoes)
        missoes = self.sort_missions_for_board(missoes)

        if usuario is not None and getattr(usuario, "active_mode", "general") == "soldier":
            return [missao for missao in missoes if missao.is_visible_to_soldier(self._today())]

        return [missao for missao in missoes if missao.is_visible_to_general_board()]

    def listar_missoes_historicas(self, usuario=None) -> list[Missao]:
        self._garantir_modo_general(usuario)
        missoes = self._carregar_missoes_do_usuario(usuario)
        self._reconciliar_falhas(usuario=usuario, missoes=missoes)
        return self.sort_missions_for_board(
            [
                missao
                for missao in missoes
                if missao.is_finalized()
            ]
        )

    def listar_missoes_para_revisao(self, usuario=None) -> list[Missao]:
        self._garantir_modo_general(usuario)
        return []

    def listar_missoes_do_dia_operacional(self, usuario=None) -> list[Missao]:
        return self.listar_missoes_por_dia_operacional(self._today(), usuario=usuario)

    def listar_missoes_do_turno_soldado(self, usuario=None) -> list[Missao]:
        estado = self.estado_turno_soldado(usuario=usuario)
        return self.listar_missoes_por_dia_operacional(estado["active_date"], usuario=usuario)

    def listar_acoes_do_turno_soldado(self, usuario=None) -> list[Missao]:
        estado = self.estado_turno_soldado(usuario=usuario)
        acoes_do_turno = self.listar_missoes_por_dia_operacional(estado["active_date"], usuario=usuario)
        return [
            missao
            for missao in self.sort_missions_for_board(acoes_do_turno)
            if missao.is_visible_to_soldier(estado["active_date"])
        ]

    def estado_turno_soldado(self, usuario=None) -> dict:
        self._garantir_modo_soldado(usuario)
        agora = self._now()
        dia_operacional = operational_date_for(agora)
        dia_calendario = agora.date()

        missoes_ciclo_anterior = self.listar_missoes_por_dia_operacional(dia_operacional, usuario=usuario)
        missoes_dia_atual = (
            []
            if dia_calendario == dia_operacional
            else self.listar_missoes_por_dia_operacional(dia_calendario, usuario=usuario)
        )
        pendencias_anteriores = [missao for missao in missoes_ciclo_anterior if missao.is_pending()]
        novo_dia_disponivel = dia_calendario != dia_operacional and len(missoes_dia_atual) > 0
        exige_decisao = novo_dia_disponivel and len(pendencias_anteriores) > 0
        migrou_automaticamente = novo_dia_disponivel and len(pendencias_anteriores) == 0
        dia_ativo = dia_operacional
        if migrou_automaticamente:
            dia_ativo = dia_calendario

        return {
            "active_date": dia_ativo,
            "active_date_label": dia_ativo.isoformat(),
            "previous_operational_date": dia_operacional.isoformat(),
            "current_calendar_date": dia_calendario.isoformat(),
            "before_cutoff": dia_calendario != dia_operacional,
            "current_day_available": novo_dia_disponivel,
            "requires_decision": exige_decisao,
            "auto_advanced": migrou_automaticamente,
            "previous_pending_count": len(pendencias_anteriores),
            "current_missions_count": len(missoes_dia_atual),
        }

    def listar_missoes_por_dia_operacional(self, dia: date, usuario=None) -> list[Missao]:
        missoes = self._carregar_missoes_do_usuario(usuario)
        self._reconciliar_falhas(usuario=usuario, missoes=missoes)
        return self.sort_missions_for_board(
            [
                missao
                for missao in missoes
                if self._pertence_ao_dia_operacional(missao, dia)
            ]
        )

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
        if "objetivo_id" in dados:
            self._garantir_objetivo_do_usuario(usuario, dados["objetivo_id"])
            missao.objetivo_id = missao._validar_objetivo_id(dados["objetivo_id"])
        if "recurrence_weekdays" in dados:
            missao.recurrence_weekdays = missao._validar_recurrence_weekdays(dados["recurrence_weekdays"])
        if "recurrence_end_date" in dados:
            missao.recurrence_end_date = missao._validar_prazo(dados["recurrence_end_date"])
        if "duration_type" in dados:
            missao.duration_type = missao._validar_duration_type(dados["duration_type"])

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
        self._garantir_contexto_de_execucao(usuario)
        missao = self._buscar_por_id_do_usuario(missao_id, usuario)
        if missao.user_id is not None and usuario is not None and missao.user_id != usuario.usuario_id:
            raise MissaoNaoEncontrada(f"Missão {missao_id} não encontrada")

        self._marcar_falha_se_vencida(missao, usuario)
        if not missao.can_be_completed(reference_date=self._today()):
            raise ValueError("Missão não pode ser concluída neste estado.")

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

    def alternar_prioridade_fixada(self, missao_id: int, usuario=None) -> Missao:
        self._garantir_contexto_de_execucao(usuario)
        missao = self._buscar_por_id_do_usuario(missao_id, usuario)
        missao.alternar_prioridade_fixada()
        self.repositorio.atualizar_missao(missao)

        if usuario is not None:
            self._registrar_auditoria(
                missao_id=missao.missao_id,
                usuario_id=usuario.usuario_id,
                acao="missao_prioridade_fixada" if missao.is_pinned else "missao_prioridade_removida",
                detalhes=(
                    "General fixou a missão no topo do dia."
                    if missao.is_pinned
                    else "General removeu a missão do topo do dia."
                ),
            )

        return missao

    def listar_historico(self, missao_id: int, usuario=None) -> list[EventoAuditoria]:
        self._garantir_modo_general(usuario)
        self._buscar_por_id_do_usuario(missao_id, usuario)
        return self.repositorio.listar_auditoria_por_missao(missao_id)

    def registrar_justificativa_falha(
        self,
        missao_id: int,
        tipo: str,
        motivo: str,
        usuario=None,
    ) -> Missao:
        return self.registrar_falha_missao(missao_id, usuario=usuario)

    def registrar_falha_missao(self, missao_id: int, usuario=None) -> Missao:
        self._garantir_contexto_de_execucao(usuario)
        missao = self._buscar_por_id_do_usuario(missao_id, usuario)
        if not missao.is_pending():
            raise ValueError("Apenas missão pendente pode ser registrada como falha.")
        missao.marcar_como_falha(self._now())
        self.repositorio.atualizar_missao(missao)

        if usuario is not None:
            self._registrar_auditoria(
                missao_id=missao.missao_id,
                usuario_id=usuario.usuario_id,
                acao="missao_nao_realizada",
                detalhes=f"Missão '{missao.titulo}' registrada como não realizada.",
            )

        return missao

    def registrar_justificativa_soldado(self, missao_id: int, motivo: str, usuario=None) -> Missao:
        return self.registrar_justificativa_falha(
            missao_id,
            tipo="other",
            motivo=motivo,
            usuario=usuario,
        )

    def revisar_justificativa(self, missao_id: int, accepted: bool, usuario=None) -> Missao:
        self._garantir_modo_general(usuario)
        missao = self._buscar_por_id_do_usuario(missao_id, usuario)
        return missao

    def limpar_relatorio_falhas(
        self,
        usuario=None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[Missao]:
        self._garantir_modo_general(usuario)
        if (start_date is None) != (end_date is None):
            raise ValueError("Informe start_date e end_date juntos para limpar o relatório.")
        if start_date and end_date and end_date < start_date:
            raise ValueError("Intervalo do relatório inválido.")

        limpas = []
        for missao in self._carregar_missoes_do_usuario(usuario):
            if not self._pode_limpar_falha_do_relatorio(missao, start_date, end_date):
                continue

            limpas.append(missao)

            if usuario is not None:
                self._registrar_auditoria(
                    missao_id=missao.missao_id,
                    usuario_id=usuario.usuario_id,
                    acao="relatorio_falha_limpo",
                    detalhes=f"Falha informativa da missão '{missao.titulo}' removida do relatório.",
                )

        return limpas

    def registrar_veredito_general(self, missao_id: int, veredito: str, usuario=None) -> Missao:
        return self.revisar_justificativa(
            missao_id,
            accepted=veredito.strip().lower() in {"accepted", "justified"},
            usuario=usuario,
        )

    def encerrar_pendencias_do_ciclo_anterior(self, usuario=None) -> dict:
        estado = self.estado_turno_soldado(usuario=usuario)
        if not estado["requires_decision"]:
            return estado

        dia_anterior = self._parse_iso_date(
            estado["previous_operational_date"],
            "Data do ciclo anterior inválida.",
        )
        for missao in self.listar_missoes_por_dia_operacional(dia_anterior, usuario=usuario):
            if not missao.is_pending():
                continue
            missao.marcar_como_falha(self._now())
            self.repositorio.atualizar_missao(missao)
            if usuario is not None:
                self._registrar_auditoria(
                    missao_id=missao.missao_id,
                    usuario_id=usuario.usuario_id,
                    acao="missao_falhou",
                    detalhes=f"Missão '{missao.titulo}' encerrada na transição operacional.",
                )

        return self.estado_turno_soldado(usuario=usuario)

    def remover_missao(self, missao_id: int, usuario=None) -> None:
        self._garantir_modo_general(usuario)
        missao = self._buscar_por_id_do_usuario(missao_id, usuario)
        if not missao.can_be_deleted_by_general():
            raise ValueError("Apenas ordens pendentes ou falhas podem ser removidas pelo General.")
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

    def to_response(self, missao: Missao, usuario=None, reference_date: date | None = None) -> dict:
        payload = missao.to_dict(
            permissions=self._build_permissions(missao, usuario=usuario, reference_date=reference_date).to_dict()
        )
        payload["is_previous_operational_pending"] = bool(
            reference_date is not None
            and missao.is_pending()
            and missao.due_date == reference_date
            and self._now().date() != reference_date
        )
        return payload

    def to_response_list(self, missoes: list[Missao], usuario=None, reference_date: date | None = None) -> list[dict]:
        return [self.to_response(missao, usuario=usuario, reference_date=reference_date) for missao in missoes]

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

    def _garantir_objetivo_do_usuario(self, usuario, objetivo_id: int | None) -> None:
        if objetivo_id is None or usuario is None:
            return
        buscar_objetivo = getattr(self.repositorio, "buscar_objetivo_por_id", None)
        if not callable(buscar_objetivo):
            return
        objetivo = buscar_objetivo(objetivo_id)
        if objetivo is None or objetivo.usuario_id != usuario.usuario_id:
            raise ValueError("Objetivo vinculado não encontrado.")

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

    def _pode_limpar_falha_do_relatorio(
        self,
        missao: Missao,
        start_date: date | None,
        end_date: date | None,
    ) -> bool:
        if not missao.is_failed():
            return False
        if start_date is None or end_date is None:
            return True
        if missao.failed_at is None:
            return False
        data_falha = operational_date_for(missao.failed_at)
        return start_date <= data_falha <= end_date

    @staticmethod
    def _parse_iso_date(valor: str, mensagem: str) -> date:
        try:
            return datetime.strptime(valor, "%Y-%m-%d").date()
        except (TypeError, ValueError) as erro:
            raise ValueError(mensagem) from erro

    def _pertence_ao_dia_operacional(self, missao: Missao, dia: date) -> bool:
        if missao.due_date == dia:
            return True
        data_evento = missao.completed_at or missao.failed_at
        if data_evento is None:
            return False
        return operational_date_for(data_evento) == dia

    def sort_missions_for_board(self, missoes: list[Missao]) -> list[Missao]:
        return sorted(
            missoes,
            key=lambda missao: (
                0 if missao.is_pinned else 1,
                1 if missao.is_completed() or missao.is_failed() else 0,
                missao.due_date or date.max,
                missao.missao_id or 0,
            ),
        )

    def _build_permissions(self, missao: Missao, usuario=None, reference_date: date | None = None) -> MissionPermissions:
        modo = getattr(usuario, "active_mode", "general") if usuario is not None else "general"
        is_general = modo == "general"
        is_soldier = modo == "soldier"
        can_execute = is_general or is_soldier
        can_view_history = is_general and missao.is_finalized()
        referencia = reference_date or self._today()

        return MissionPermissions(
            can_complete=can_execute and missao.can_be_completed(reference_date=referencia),
            can_edit=is_general and missao.can_be_edited_by_general(),
            can_delete=is_general and missao.can_be_deleted_by_general(),
            can_justify=False,
            can_fail=can_execute and missao.is_pending(),
            can_pin=can_execute and missao.is_pending(),
            can_review=False,
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

    def _garantir_contexto_de_execucao(self, usuario) -> None:
        modo = getattr(usuario, "active_mode", "general") if usuario is not None else "general"
        if modo not in {"general", "soldier"}:
            raise PermissaoNegadaError("Execução disponível apenas em contexto operacional válido.")

    def _today(self) -> date:
        return operational_date_for(self._now())

    def _now(self) -> datetime:
        return self._now_provider()
