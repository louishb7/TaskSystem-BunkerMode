from datetime import date, datetime, timedelta

from backend.models.auditoria import EventoAuditoria
from backend.core.exceptions import MissaoNaoEncontrada
from backend.models.missao import Missao, StatusMissao
from backend.services.exceptions import PermissaoNegadaError
from backend.services.mission_permissions import MissionPermissions
from backend.services.operational_day import (
    calendar_date_for,
    now_in_operational_timezone,
    operational_date_for,
)


LEGACY_DEFAULT_PRIORITY = 2


def merge_missoes_por_id(*listas: list[Missao]) -> list[Missao]:
    missoes_por_id = {}
    sem_id = []
    for lista in listas:
        for missao in lista:
            if missao.missao_id is None:
                sem_id.append(missao)
                continue
            missoes_por_id[missao.missao_id] = missao
    return [*missoes_por_id.values(), *sem_id]


class MissaoService:
    """Centraliza os casos de uso de missão da API."""

    RECURRENCE_WINDOW_DAYS = 14

    def __init__(self, repositorio, today_provider=None, now_provider=None):
        self.repositorio = repositorio
        self._today_provider = today_provider
        self._now_provider = now_provider or now_in_operational_timezone

    def criar_missao(self, dados: dict, usuario=None) -> Missao:
        self._garantir_modo_general(usuario)
        responsavel_id = dados.get("responsavel_id") or getattr(usuario, "usuario_id", None)
        self._garantir_vinculo_estrategico_unico(dados)
        self._garantir_objetivo_do_usuario(usuario, dados.get("objetivo_id"))
        self._garantir_sonho_do_usuario(usuario, dados.get("sonho_id"))
        if self._deve_materializar_recorrencia(dados):
            return self._criar_missoes_recorrentes(dados, usuario=usuario, responsavel_id=responsavel_id)

        campos_missao = {
            "titulo": dados["titulo"],
            # Compatibilidade legada do banco/API.
            "prioridade": dados.get("prioridade", LEGACY_DEFAULT_PRIORITY),
            "prazo": dados.get("prazo"),
            "instrucao": dados.get("instrucao"),
            "user_id": responsavel_id,
            "objetivo_id": dados.get("objetivo_id"),
            "sonho_id": dados.get("sonho_id"),
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
        if self._materializar_recorrencias_do_usuario(usuario=usuario, missoes=missoes):
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
        return self.quadro_turno_soldado(usuario=usuario)["daily_missions"]

    def listar_acoes_do_turno_soldado(self, usuario=None) -> list[Missao]:
        return self.quadro_turno_soldado(usuario=usuario)["action_missions"]

    def quadro_turno_soldado(self, usuario=None) -> dict:
        self._garantir_modo_soldado(usuario)
        agora = self._now()
        dia_operacional = operational_date_for(agora)
        dia_calendario = calendar_date_for(agora)
        dias_do_turno = [dia_operacional]
        if dia_calendario != dia_operacional:
            dias_do_turno.append(dia_calendario)
        missoes = self._carregar_missoes_do_usuario_para_dias(usuario, dias_do_turno)
        materializou = self._materializar_recorrencias_do_usuario(
            usuario=usuario,
            missoes=missoes,
            start_date=dia_operacional,
            end_date=dia_operacional,
        )
        if dia_calendario != dia_operacional:
            materializou = (
                self._materializar_recorrencias_do_usuario(
                    usuario=usuario,
                    missoes=missoes,
                    start_date=dia_calendario,
                    end_date=dia_calendario,
                )
                or materializou
            )
        if materializou:
            missoes = self._carregar_missoes_do_usuario_para_dias(usuario, dias_do_turno)

        missoes_ciclo_anterior = self.sort_missions_for_board(
            [missao for missao in missoes if self._pertence_ao_dia_operacional(missao, dia_operacional)]
        )
        missoes_dia_atual = (
            []
            if dia_calendario == dia_operacional
            else self.sort_missions_for_board(
                [missao for missao in missoes if self._pertence_ao_dia_operacional(missao, dia_calendario)]
            )
        )
        self._reconciliar_falhas(
            usuario=usuario,
            missoes=merge_missoes_por_id(missoes_ciclo_anterior, missoes_dia_atual),
        )
        pendencias_anteriores = [missao for missao in missoes_ciclo_anterior if missao.is_pending()]
        novo_dia_disponivel = dia_calendario != dia_operacional and len(missoes_dia_atual) > 0
        exige_decisao = novo_dia_disponivel and len(pendencias_anteriores) > 0
        migrou_automaticamente = novo_dia_disponivel and len(pendencias_anteriores) == 0
        dia_ativo = dia_calendario if migrou_automaticamente else dia_operacional
        missoes_dia_ativo = missoes_dia_atual if migrou_automaticamente else missoes_ciclo_anterior
        estado = {
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
        return {
            "turn": estado,
            "daily_missions": missoes_dia_ativo,
            "action_missions": [
                missao
                for missao in self.sort_missions_for_board(missoes_dia_ativo)
                if missao.is_visible_to_soldier(dia_ativo)
            ],
        }

    def estado_turno_soldado(self, usuario=None) -> dict:
        return self.quadro_turno_soldado(usuario=usuario)["turn"]

    def listar_missoes_por_dia_operacional(self, dia: date, usuario=None) -> list[Missao]:
        missoes = self._carregar_missoes_do_usuario(usuario)
        if self._materializar_recorrencias_do_usuario(
            usuario=usuario,
            missoes=missoes,
            start_date=dia,
            end_date=dia,
        ):
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
        if "sonho_id" in dados:
            self._garantir_sonho_do_usuario(usuario, dados["sonho_id"])
            missao.sonho_id = missao._validar_sonho_id(dados["sonho_id"])
        self._garantir_vinculo_estrategico_unico({
            "objetivo_id": missao.objetivo_id,
            "sonho_id": missao.sonho_id,
        })
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
        if getattr(usuario, "active_mode", "general") == "soldier":
            estado = self.estado_turno_soldado(usuario=usuario)
            if not missao.is_visible_to_soldier(estado["active_date"]):
                raise PermissaoNegadaError("Prioridade disponível apenas para ordens do turno.")
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
        quadro = self.quadro_turno_soldado(usuario=usuario)
        estado = quadro["turn"]
        if not estado["requires_decision"]:
            return estado

        dia_anterior = self._parse_iso_date(
            estado["previous_operational_date"],
            "Data do ciclo anterior inválida.",
        )
        for missao in quadro["daily_missions"]:
            if not self._pertence_ao_dia_operacional(missao, dia_anterior):
                continue
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

        estado_atualizado = estado.copy()
        estado_atualizado["active_date"] = self._parse_iso_date(
            estado["current_calendar_date"],
            "Data do dia atual inválida.",
        )
        estado_atualizado["active_date_label"] = estado["current_calendar_date"]
        estado_atualizado["requires_decision"] = False
        estado_atualizado["auto_advanced"] = True
        estado_atualizado["previous_pending_count"] = 0
        return estado_atualizado

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
            and calendar_date_for(self._now()) != reference_date
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

    def _carregar_missoes_do_usuario_para_dias(self, usuario, dias: list[date]) -> list[Missao]:
        if usuario is None:
            return [
                missao
                for missao in self._carregar_missoes_do_usuario(usuario)
                if missao.due_date in dias or missao.recurrence_weekdays
            ]

        carregar_por_dias = getattr(
            self.repositorio,
            "carregar_missoes_por_responsavel_e_dias",
            None,
        )
        if callable(carregar_por_dias):
            missoes = list(carregar_por_dias(usuario.usuario_id, dias))
            for missao in missoes:
                missao.atualizar_user_id(usuario.usuario_id)
            return missoes

        return [
            missao
            for missao in self._carregar_missoes_do_usuario(usuario)
            if missao.due_date in dias or missao.recurrence_weekdays
        ]

    def _garantir_objetivo_do_usuario(self, usuario, objetivo_id: int | None) -> None:
        if objetivo_id is None or usuario is None:
            return
        buscar_objetivo = getattr(self.repositorio, "buscar_objetivo_por_id", None)
        if not callable(buscar_objetivo):
            return
        objetivo = buscar_objetivo(objetivo_id)
        if objetivo is None or objetivo.usuario_id != usuario.usuario_id:
            raise ValueError("Objetivo vinculado não encontrado.")

    def _garantir_sonho_do_usuario(self, usuario, sonho_id: int | None) -> None:
        if sonho_id is None or usuario is None:
            return
        buscar_sonho = getattr(self.repositorio, "buscar_sonho_por_id", None)
        if not callable(buscar_sonho):
            return
        sonho = buscar_sonho(sonho_id)
        if sonho is None or sonho.usuario_id != usuario.usuario_id:
            raise ValueError("Sonho vinculado não encontrado.")

    @staticmethod
    def _garantir_vinculo_estrategico_unico(dados: dict) -> None:
        if dados.get("objetivo_id") is not None and dados.get("sonho_id") is not None:
            raise ValueError("A ordem deve estar vinculada ao sonho ou ao objetivo, não aos dois.")

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

    def _deve_materializar_recorrencia(self, dados: dict) -> bool:
        return bool(
            (dados.get("objetivo_id") or dados.get("sonho_id"))
            and dados.get("recurrence_weekdays")
            and dados.get("duration_type") in {"ate_objetivo", "prazo"}
        )

    def _criar_missoes_recorrentes(self, dados: dict, usuario=None, responsavel_id=None) -> Missao:
        weekdays = Missao(
            recurrence_weekdays=dados.get("recurrence_weekdays"),
            titulo=dados["titulo"],
            prioridade=dados.get("prioridade", LEGACY_DEFAULT_PRIORITY),
        ).recurrence_weekdays
        if not weekdays:
            raise ValueError("Selecione ao menos um dia da frequência semanal.")

        end_date = self._limite_recorrencia(dados)
        start_date = self._inicio_recorrencia(dados)
        if end_date < start_date:
            raise ValueError("Prazo da recorrência não pode ser anterior à data inicial.")

        existentes = self._carregar_missoes_do_usuario(usuario)
        chaves_existentes = self._chaves_recorrentes_existentes(existentes)
        criadas = []
        for prazo in self._datas_da_recorrencia(start_date, end_date, weekdays):
            missao = self._criar_ocorrencia_recorrente(
                dados,
                usuario=usuario,
                responsavel_id=responsavel_id,
                prazo=prazo,
                chaves_existentes=chaves_existentes,
                base=existentes,
            )
            if missao is not None:
                criadas.append(missao)

        if not criadas:
            raise ValueError("A frequência semanal não gera ordens dentro da janela permitida.")
        return criadas[0]

    def _criar_ocorrencia_recorrente(
        self,
        dados: dict,
        usuario=None,
        responsavel_id=None,
        prazo: date | None = None,
        chaves_existentes: set | None = None,
        base: list[Missao] | None = None,
    ) -> Missao | None:
        if chaves_existentes is None:
            base = self._carregar_missoes_do_usuario(usuario)
            chaves_existentes = self._chaves_recorrentes_existentes(base)
        chave = self._chave_recorrente(dados, prazo)
        if chave in chaves_existentes:
            return None

        missao = Missao(
            titulo=dados["titulo"],
            prioridade=dados.get("prioridade", LEGACY_DEFAULT_PRIORITY),
            prazo=prazo,
            instrucao=dados.get("instrucao"),
            user_id=responsavel_id,
            objetivo_id=dados.get("objetivo_id"),
            sonho_id=dados.get("sonho_id"),
            recurrence_weekdays=dados.get("recurrence_weekdays"),
            recurrence_end_date=dados.get("recurrence_end_date"),
            duration_type=dados.get("duration_type"),
        )
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
                acao="missao_recorrente_criada",
                detalhes=f"Recorrência gerou a ordem '{missao.titulo}'.",
            )
        chaves_existentes.add(chave)
        if base is not None:
            base.append(missao)
        return missao

    def _materializar_recorrencias_do_usuario(
        self,
        usuario=None,
        missoes=None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> bool:
        if usuario is None:
            return False
        base = list(missoes) if missoes is not None else self._carregar_missoes_do_usuario(usuario)
        chaves_existentes = self._chaves_recorrentes_existentes(base)
        materializou = False
        objetivos_validos = {}
        sonhos_validos = {}
        recorrentes = [
            missao for missao in base
            if (missao.objetivo_id is not None or missao.sonho_id is not None)
            and missao.recurrence_weekdays
            and missao.duration_type in {"ate_objetivo", "prazo"}
            and self._vinculo_aceita_recorrencia(usuario, missao, objetivos_validos, sonhos_validos)
        ]
        assinaturas_processadas = set()
        for missao in recorrentes:
            assinatura = (
                missao.objetivo_id,
                missao.sonho_id,
                missao.titulo,
                missao.instrucao,
                tuple(missao.recurrence_weekdays or []),
                missao.duration_type,
                None if missao.recurrence_end_date is None else missao.recurrence_end_date.isoformat(),
                missao.user_id,
            )
            if assinatura in assinaturas_processadas:
                continue
            assinaturas_processadas.add(assinatura)

            inicio = start_date or self._today()
            fim = min(
                end_date or (inicio + timedelta(days=self.RECURRENCE_WINDOW_DAYS - 1)),
                self._limite_recorrencia_missao(missao),
            )
            if fim < inicio:
                continue
            for prazo in self._datas_da_recorrencia(inicio, fim, missao.recurrence_weekdays):
                dados = {
                    "titulo": missao.titulo,
                    "prioridade": missao.prioridade.value,
                    "instrucao": missao.instrucao,
                    "objetivo_id": missao.objetivo_id,
                    "sonho_id": missao.sonho_id,
                    "recurrence_weekdays": missao.recurrence_weekdays,
                    "recurrence_end_date": (
                        None
                        if missao.recurrence_end_date is None
                        else missao.recurrence_end_date.strftime("%d-%m-%Y")
                    ),
                    "duration_type": missao.duration_type,
                }
                nova = self._criar_ocorrencia_recorrente(
                    dados,
                    usuario=usuario,
                    responsavel_id=missao.user_id or usuario.usuario_id,
                    prazo=prazo,
                    chaves_existentes=chaves_existentes,
                    base=base,
                )
                if nova is not None:
                    materializou = True
        return materializou

    def _vinculo_aceita_recorrencia(
        self,
        usuario,
        missao: Missao,
        objetivos_validos: dict | None = None,
        sonhos_validos: dict | None = None,
    ) -> bool:
        if missao.objetivo_id is not None:
            return self._objetivo_aceita_recorrencia(usuario, missao.objetivo_id, objetivos_validos)
        if missao.sonho_id is not None:
            return self._sonho_aceita_recorrencia(usuario, missao.sonho_id, sonhos_validos)
        return False

    def _objetivo_aceita_recorrencia(self, usuario, objetivo_id: int, cache: dict | None = None) -> bool:
        if cache is not None and objetivo_id in cache:
            return cache[objetivo_id]
        buscar_objetivo = getattr(self.repositorio, "buscar_objetivo_por_id", None)
        if not callable(buscar_objetivo):
            return True
        objetivo = buscar_objetivo(objetivo_id)
        if objetivo is None or objetivo.usuario_id != usuario.usuario_id:
            if cache is not None:
                cache[objetivo_id] = False
            return False
        status = getattr(objetivo, "status", "ativo")
        status_valor = getattr(status, "value", status)
        ativo = status_valor == "ativo"
        if cache is not None:
            cache[objetivo_id] = ativo
        return ativo

    def _sonho_aceita_recorrencia(self, usuario, sonho_id: int, cache: dict | None = None) -> bool:
        if cache is not None and sonho_id in cache:
            return cache[sonho_id]
        buscar_sonho = getattr(self.repositorio, "buscar_sonho_por_id", None)
        if not callable(buscar_sonho):
            return True
        sonho = buscar_sonho(sonho_id)
        if sonho is None or sonho.usuario_id != usuario.usuario_id:
            if cache is not None:
                cache[sonho_id] = False
            return False
        status = getattr(sonho, "status", "ativo")
        status_valor = getattr(status, "value", status)
        ativo = status_valor == "ativo"
        if cache is not None:
            cache[sonho_id] = ativo
        return ativo

    def _inicio_recorrencia(self, dados: dict) -> date:
        prazo = dados.get("prazo")
        if not prazo:
            return self._today()
        return Missao(
            titulo=dados["titulo"],
            prioridade=dados.get("prioridade", LEGACY_DEFAULT_PRIORITY),
            prazo=prazo,
        ).due_date

    def _limite_recorrencia(self, dados: dict) -> date:
        limite = self._inicio_recorrencia(dados) + timedelta(days=self.RECURRENCE_WINDOW_DAYS - 1)
        if dados.get("duration_type") == "prazo":
            if not dados.get("recurrence_end_date"):
                raise ValueError("Informe a data final da recorrência.")
            fim = Missao(
                titulo=dados["titulo"],
                prioridade=dados.get("prioridade", LEGACY_DEFAULT_PRIORITY),
                recurrence_end_date=dados.get("recurrence_end_date"),
            ).recurrence_end_date
            return min(limite, fim)
        return limite

    def _limite_recorrencia_missao(self, missao: Missao) -> date:
        limite = self._today() + timedelta(days=self.RECURRENCE_WINDOW_DAYS - 1)
        if missao.duration_type == "prazo" and missao.recurrence_end_date is not None:
            return min(limite, missao.recurrence_end_date)
        return limite

    @staticmethod
    def _datas_da_recorrencia(start_date: date, end_date: date, weekdays: list[int]) -> list[date]:
        datas = []
        dia = start_date
        while dia <= end_date:
            if dia.weekday() in weekdays:
                datas.append(dia)
            dia += timedelta(days=1)
        return datas

    def _chaves_recorrentes_existentes(self, missoes: list[Missao]) -> set:
        return {
            self._chave_recorrente(
                {
                    "objetivo_id": missao.objetivo_id,
                    "sonho_id": missao.sonho_id,
                    "titulo": missao.titulo,
                    "instrucao": missao.instrucao,
                },
                missao.due_date,
            )
            for missao in missoes
            if (missao.objetivo_id is not None or missao.sonho_id is not None) and missao.due_date is not None
        }

    @staticmethod
    def _chave_recorrente(dados: dict, prazo: date) -> tuple:
        return (
            dados.get("objetivo_id"),
            dados.get("sonho_id"),
            dados.get("titulo"),
            dados.get("instrucao"),
            prazo,
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
