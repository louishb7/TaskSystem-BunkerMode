from datetime import date, datetime, timezone
from types import SimpleNamespace

import pytest

from backend.models.auditoria import EventoAuditoria
from backend.core.exceptions import MissaoNaoEncontrada
from backend.models.missao import Missao, PrioridadeMissao, StatusMissao
from backend.services.auth_service import AuthService
from backend.services.missao_service import MissaoService
from backend.services.mission_permissions import MissionPermissions
from backend.services.operational_day import (
    operational_date_for,
    operational_week_bounds,
    previous_operational_week_bounds,
)
from backend.services.relatorio_service import RelatorioService
from backend.services.revisao_service import RevisaoService
from backend.models.usuario import Usuario


DATA_TESTE = date(2026, 4, 24)
INSTANTE_TESTE = datetime(2026, 4, 24, 10, 0, 0)


def criar_missao_service(repositorio):
    return MissaoService(
        repositorio,
        today_provider=lambda: DATA_TESTE,
        now_provider=lambda: INSTANTE_TESTE,
    )


class RepositorioListagemFake:
    def __init__(self):
        self.chamadas_por_responsavel = []

    def carregar_dados(self):
        return [
            Missao(
                missao_id=1,
                titulo="Missão geral",
                prioridade=1,
                prazo=None,
                instrucao="Executar",
            )
        ]

    def carregar_dados_por_responsavel(self, responsavel_id):
        self.chamadas_por_responsavel.append(responsavel_id)
        return [
            Missao(
                missao_id=2,
                titulo="Missão do usuário",
                prioridade=1,
                prazo=None,
                instrucao="Executar",
                user_id=responsavel_id,
            )
        ]

    def buscar_contexto_missao(self, missao_id):
        return None


class RepositorioOwnershipFake:
    def __init__(self):
        self.missao = Missao(
            missao_id=10,
            titulo="Missão protegida",
            prioridade=1,
            prazo=None,
            instrucao="Executar",
            user_id=1,
        )
        self.contexto = {"criada_por_id": 1, "responsavel_id": 1}
        self.missao_atualizada = None
        self.missao_adicionada = None
        self.missao_removida_id = None
        self.auditoria = [
            EventoAuditoria(
                evento_id=1,
                missao_id=10,
                usuario_id=1,
                acao="missao_criada",
                detalhes="Missão criada.",
            )
        ]
        self.auditoria_registrada = []
        self.revisoes = []

    def buscar_por_id(self, missao_id):
        if missao_id == self.missao.missao_id:
            return self.missao
        return None

    def buscar_contexto_missao(self, missao_id):
        if missao_id == self.missao.missao_id:
            return self.contexto
        return None

    def carregar_dados(self):
        return [self.missao]

    def carregar_dados_por_responsavel(self, responsavel_id):
        if self.contexto.get("responsavel_id") == responsavel_id:
            return [self.missao]
        return []

    def atualizar_missao(self, missao):
        self.missao = missao
        self.missao_atualizada = missao

    def adicionar_missao(self, missao):
        self.missao = missao
        self.missao_adicionada = missao

    def salvar_contexto_missao(self, missao_id, criada_por_id, responsavel_id, operacao_id=None, operacao_dia=None):
        self.contexto = {
            "criada_por_id": criada_por_id,
            "responsavel_id": responsavel_id,
            "operacao_id": operacao_id,
            "operacao_dia": operacao_dia,
        }

    def remover_missao(self, missao_id):
        self.missao_removida_id = missao_id

    def listar_auditoria_por_missao(self, missao_id):
        return [evento for evento in self.auditoria if evento.missao_id == missao_id]

    def registrar_auditoria(self, evento):
        self.auditoria_registrada.append(evento)

    def buscar_revisao_por_periodo(self, usuario_id, start_date, end_date):
        for revisao in self.revisoes:
            if (
                revisao.usuario_id == usuario_id
                and revisao.start_date == start_date
                and revisao.end_date == end_date
            ):
                return revisao
        return None

    def listar_revisoes_semanais(self, usuario_id):
        return [revisao for revisao in self.revisoes if revisao.usuario_id == usuario_id]

    def salvar_revisao_semanal(self, revisao):
        revisao.atualizar_revisao_id(len(self.revisoes) + 1)
        self.revisoes.append(revisao)


class RepositorioFluxoFake:
    def __init__(self):
        self.missoes = []
        self.objetivos = {}
        self.contextos = {}
        self.auditoria_registrada = []
        self.revisoes = []
        self._next_id = 1
        self.carregamentos_por_responsavel = 0

    def buscar_por_id(self, missao_id):
        return next((missao for missao in self.missoes if missao.missao_id == missao_id), None)

    def buscar_contexto_missao(self, missao_id):
        return self.contextos.get(missao_id)

    def buscar_objetivo_por_id(self, objetivo_id):
        return self.objetivos.get(objetivo_id)

    def carregar_dados(self):
        return list(self.missoes)

    def carregar_dados_por_responsavel(self, responsavel_id):
        self.carregamentos_por_responsavel += 1
        return [
            missao
            for missao in self.missoes
            if self.contextos.get(missao.missao_id, {}).get("responsavel_id") == responsavel_id
            or missao.user_id == responsavel_id
        ]

    def adicionar_missao(self, missao):
        if missao.missao_id is None:
            missao.atualizar_missao_id(self._next_id)
            self._next_id += 1
        self.missoes.append(missao)

    def atualizar_missao(self, missao):
        for index, existente in enumerate(self.missoes):
            if existente.missao_id == missao.missao_id:
                self.missoes[index] = missao
                return
        self.missoes.append(missao)

    def salvar_contexto_missao(self, missao_id, criada_por_id, responsavel_id, operacao_id=None, operacao_dia=None):
        self.contextos[missao_id] = {
            "criada_por_id": criada_por_id,
            "responsavel_id": responsavel_id,
            "operacao_id": operacao_id,
            "operacao_dia": operacao_dia,
        }

    def remover_missao(self, missao_id):
        self.missoes = [missao for missao in self.missoes if missao.missao_id != missao_id]

    def listar_auditoria_por_missao(self, missao_id):
        return [evento for evento in self.auditoria_registrada if evento.missao_id == missao_id]

    def registrar_auditoria(self, evento):
        self.auditoria_registrada.append(evento)

    def buscar_revisao_por_periodo(self, usuario_id, start_date, end_date):
        for revisao in self.revisoes:
            if (
                revisao.usuario_id == usuario_id
                and revisao.start_date == start_date
                and revisao.end_date == end_date
            ):
                return revisao
        return None

    def listar_revisoes_semanais(self, usuario_id):
        return [revisao for revisao in self.revisoes if revisao.usuario_id == usuario_id]

    def salvar_revisao_semanal(self, revisao):
        revisao.atualizar_revisao_id(len(self.revisoes) + 1)
        self.revisoes.append(revisao)


def test_mission_permissions_to_dict_expoe_todas_as_chaves_booleanas():
    permissions = MissionPermissions(
        can_complete=True,
        can_edit=False,
        can_delete=False,
        can_justify=False,
        can_fail=True,
        can_pin=True,
        can_review=False,
        can_view_history=True,
    )

    assert permissions.to_dict() == {
        "can_complete": True,
        "can_edit": False,
        "can_delete": False,
        "can_justify": False,
        "can_fail": True,
        "can_pin": True,
        "can_review": False,
        "can_view_history": True,
    }


def test_data_operacional_usa_timezone_padrao_e_corte_das_quatro():
    assert operational_date_for(datetime(2026, 4, 25, 3, 59, 0)) == date(2026, 4, 24)
    assert operational_date_for(datetime(2026, 4, 25, 4, 0, 0)) == date(2026, 4, 25)

    assert operational_date_for(datetime(2026, 4, 25, 6, 30, 0, tzinfo=timezone.utc)) == date(2026, 4, 24)
    assert operational_date_for(datetime(2026, 4, 25, 7, 0, 0, tzinfo=timezone.utc)) == date(2026, 4, 25)


def test_intervalos_operacionais_usam_semana_de_segunda_a_domingo():
    assert operational_week_bounds(date(2026, 4, 20)) == (
        date(2026, 4, 20),
        date(2026, 4, 26),
    )
    assert operational_week_bounds(date(2026, 4, 26)) == (
        date(2026, 4, 20),
        date(2026, 4, 26),
    )
    assert previous_operational_week_bounds(date(2026, 4, 27)) == (
        date(2026, 4, 20),
        date(2026, 4, 26),
    )


def test_listar_missoes_com_usuario_filtra_por_responsavel():
    repositorio = RepositorioListagemFake()
    service = criar_missao_service(repositorio)
    usuario = SimpleNamespace(usuario_id=42)

    missoes = service.listar_missoes(usuario=usuario)

    assert repositorio.chamadas_por_responsavel == [42]
    assert [missao.titulo for missao in missoes] == ["Missão do usuário"]


def test_listar_missoes_sem_usuario_mantem_listagem_geral():
    repositorio = RepositorioListagemFake()
    service = criar_missao_service(repositorio)

    missoes = service.listar_missoes()

    assert repositorio.chamadas_por_responsavel == []
    assert [missao.titulo for missao in missoes] == ["Missão geral"]


def test_listar_missoes_prioriza_prioridade_elevada_e_ignora_prioridade_numerica():
    repositorio = RepositorioListagemFake()
    repositorio.carregar_dados = lambda: [
        Missao(
            missao_id=1,
            titulo="Alta normal",
            prioridade=1,
            prazo="24-04-2026",
            instrucao="Executar",
        ),
        Missao(
            missao_id=2,
            titulo="Baixa prioridade elevada",
            prioridade=3,
            prazo="24-04-2026",
            instrucao="Executar",
            is_pinned=True,
        ),
        Missao(
            missao_id=3,
            titulo="Média normal",
            prioridade=2,
            prazo="24-04-2026",
            instrucao="Executar",
        ),
    ]
    service = criar_missao_service(repositorio)

    missoes = service.listar_missoes()

    assert [missao.titulo for missao in missoes] == [
        "Baixa prioridade elevada",
        "Alta normal",
        "Média normal",
    ]


def test_listar_missoes_prioriza_prioridade_elevada():
    repositorio = RepositorioListagemFake()
    repositorio.carregar_dados = lambda: [
        Missao(
            missao_id=1,
            titulo="Normal",
            prioridade=1,
            prazo="24-04-2026",
            instrucao="Executar",
        ),
        Missao(
            missao_id=2,
            titulo="Prioridade elevada",
            prioridade=3,
            prazo="24-04-2026",
            instrucao="Executar",
            is_pinned=True,
        ),
    ]
    service = criar_missao_service(repositorio)

    missoes = service.listar_missoes()

    assert [missao.titulo for missao in missoes] == ["Prioridade elevada", "Normal"]


def test_listar_missoes_nao_exibe_falha_no_quadro_operacional():
    repositorio = RepositorioListagemFake()
    repositorio.carregar_dados = lambda: [
        Missao(
            missao_id=1,
            titulo="Prioridade elevada",
            prioridade=1,
            prazo="24-04-2026",
            instrucao="Executar",
            status=StatusMissao.PENDENTE,
            is_pinned=True,
        ),
        Missao(
            missao_id=2,
            titulo="Aguardando justificativa",
            prioridade=3,
            prazo="01-01-2020",
            instrucao="Executar",
            status=StatusMissao.FALHA_PENDENTE_JUSTIFICATIVA,
            failed_at=datetime(2026, 4, 24, 10, 0, 0),
        ),
    ]
    service = criar_missao_service(repositorio)

    missoes = service.listar_missoes()

    assert [missao.titulo for missao in missoes] == ["Prioridade elevada"]


def test_fluxo_execucao_com_sucesso_preserva_prioridade_como_marcador():
    repositorio = RepositorioFluxoFake()
    momento = {"agora": datetime(2026, 4, 24, 10, 0, 0)}
    service = MissaoService(repositorio, now_provider=lambda: momento["agora"])
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    missao = service.criar_missao(
        {"titulo": "Executar bloco", "prazo": "24-04-2026"},
        usuario=usuario,
    )
    service.alternar_prioridade_fixada(missao.missao_id, usuario=usuario)

    usuario.active_mode = "soldier"
    acoes = service.listar_acoes_do_turno_soldado(usuario=usuario)
    momento["agora"] = datetime(2026, 4, 24, 11, 0, 0)
    concluida = service.concluir_missao(missao.missao_id, usuario=usuario)

    usuario.active_mode = "general"
    relatorio = RelatorioService(repositorio).get_weekly_report(
        1,
        start_date=date(2026, 4, 20),
        end_date=date(2026, 4, 26),
    )

    assert [acao.missao_id for acao in acoes] == [missao.missao_id]
    assert concluida.status == StatusMissao.CONCLUIDA
    assert concluida.is_pinned is True
    assert relatorio["completed_missions"] == 1
    assert relatorio["failed_missions"] == 0
    assert relatorio["high_priority_missions"] == 1


def test_fluxo_falha_sem_justificativa_e_relatorio_nao_ressuscita_falha():
    repositorio = RepositorioFluxoFake()
    momento = {"agora": datetime(2026, 4, 24, 10, 0, 0)}
    service = MissaoService(repositorio, now_provider=lambda: momento["agora"])
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    missao = service.criar_missao(
        {"titulo": "Executar tarefa crítica", "prazo": "24-04-2026"},
        usuario=usuario,
    )

    usuario.active_mode = "soldier"
    momento["agora"] = datetime(2026, 4, 24, 22, 0, 0)
    falha = service.registrar_justificativa_falha(
        missao.missao_id,
        "not_done",
        "Não executei.",
        usuario=usuario,
    )
    status_apos_justificativa = falha.status
    failed_at_apos_justificativa = falha.failed_at

    usuario.active_mode = "general"
    pendentes_revisao = service.listar_missoes_para_revisao(usuario=usuario)
    revisada = service.revisar_justificativa(missao.missao_id, accepted=True, usuario=usuario)
    relatorio = RelatorioService(repositorio).get_weekly_report(
        1,
        start_date=date(2026, 4, 20),
        end_date=date(2026, 4, 26),
    )
    limpas = service.limpar_relatorio_falhas(
        usuario=usuario,
        start_date=date(2026, 4, 20),
        end_date=date(2026, 4, 26),
    )

    assert status_apos_justificativa == StatusMissao.FALHA
    assert failed_at_apos_justificativa == datetime(2026, 4, 24, 22, 0, 0)
    assert pendentes_revisao == []
    assert revisada.status == StatusMissao.FALHA
    assert relatorio["failed_missions"] == 1
    assert [missao.missao_id for missao in limpas] == [missao.missao_id]
    assert service.listar_missoes_para_revisao(usuario=usuario) == []


def test_to_response_soldier_define_permissions_corretas():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="soldier")

    payload = service.to_response(repositorio.missao, usuario=usuario)

    assert payload["status_code"] == "PENDENTE"
    assert payload["status_label"] == "Pendente"
    assert payload["permissions"] == {
        "can_complete": True,
        "can_edit": False,
        "can_delete": False,
        "can_justify": False,
        "can_fail": True,
        "can_pin": True,
        "can_review": False,
        "can_view_history": False,
    }


def test_to_response_general_define_permissions_para_falha_simples():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao.failed_at = datetime(2026, 4, 24, 10, 0, 0)
    repositorio.missao.failure_reason = "Bloqueio externo."
    repositorio.missao.atualizar_status(StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO)
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    payload = service.to_response(repositorio.missao, usuario=usuario)

    assert payload["status_code"] == "FALHA"
    assert payload["permissions"]["can_review"] is False
    assert payload["permissions"]["can_edit"] is True
    assert payload["permissions"]["can_delete"] is True


def test_to_response_general_define_permissions_para_missao_concluida_historica():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao.concluir(instante=datetime(2026, 4, 24, 10, 0, 0))
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    payload = service.to_response(repositorio.missao, usuario=usuario)

    assert payload["status_code"] == "CONCLUIDA"
    assert payload["permissions"]["can_complete"] is False
    assert payload["permissions"]["can_edit"] is True
    assert payload["permissions"]["can_delete"] is False
    assert payload["permissions"]["can_view_history"] is True


def test_to_response_general_define_permissions_para_falha_legada_revisada():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao.failed_at = datetime(2026, 4, 24, 10, 0, 0)
    repositorio.missao.failure_reason = "Falhou."
    repositorio.missao.general_verdict = "accepted"
    repositorio.missao.atualizar_status(StatusMissao.FALHA_REVISADA)
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    payload = service.to_response(repositorio.missao, usuario=usuario)

    assert payload["permissions"]["can_edit"] is True
    assert payload["permissions"]["can_delete"] is True
    assert payload["permissions"]["can_review"] is False
    assert payload["permissions"]["can_view_history"] is True


def test_usuario_pode_editar_missao_propria_e_registra_auditoria():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    missao = service.editar_missao(
        10,
        {
            "titulo": "Missão atualizada",
            "instrucao": "Executar com novo plano",
            "prioridade": 3,
            "prazo": "22-04-2026",
        },
        usuario=usuario,
    )

    assert missao.titulo == "Missão atualizada"
    assert missao.instrucao == "Executar com novo plano"
    assert missao.prioridade.value == 3
    assert missao.prazo == "22-04-2026"
    assert repositorio.missao_atualizada is missao
    assert repositorio.auditoria_registrada[-1].acao == "missao_atualizada"


def test_general_pode_retirar_concluido_por_edicao():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao.concluir(instante=datetime(2026, 4, 24, 10, 0, 0))
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    missao = service.editar_missao(10, {"status": "Pendente"}, usuario=usuario)

    assert missao.status == StatusMissao.PENDENTE
    assert missao.completed_at is None
    assert repositorio.missao_atualizada is missao


def test_general_nao_pode_forcar_status_de_execucao_por_edicao():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    with pytest.raises(ValueError, match="Transições de execução"):
        service.editar_missao(
            10,
            {"status": StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO.value},
            usuario=usuario,
        )

    assert repositorio.missao.status == StatusMissao.PENDENTE
    assert repositorio.missao_atualizada is None


def test_usuario_nao_pode_editar_missao_de_outro_usuario():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=2, active_mode="general")

    with pytest.raises(MissaoNaoEncontrada):
        service.editar_missao(10, {"titulo": "Tentativa indevida"}, usuario=usuario)

    assert repositorio.missao_atualizada is None


def test_usuario_pode_concluir_apenas_missao_propria():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="soldier")

    missao = service.concluir_missao(10, usuario=usuario)

    assert missao.status == StatusMissao.CONCLUIDA
    assert missao.completed_at is not None
    assert repositorio.missao_atualizada is missao


def test_soldado_nao_conclui_missao_vencida_apos_corte_operacional():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao.atualizar_prazo("24-04-2026")
    service = MissaoService(
        repositorio,
        now_provider=lambda: datetime(2026, 4, 25, 4, 1, 0),
    )
    usuario = SimpleNamespace(usuario_id=1, active_mode="soldier")

    with pytest.raises(ValueError, match="Missão não pode ser concluída neste estado."):
        service.concluir_missao(10, usuario=usuario)

    assert repositorio.missao.status == StatusMissao.FALHA
    assert repositorio.missao.failed_at == datetime(2026, 4, 25, 4, 1, 0)
    assert repositorio.auditoria_registrada[-1].acao == "missao_falhou"


def test_missao_pendente_vencida_falha_automaticamente_apos_quatro_da_manha():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao.atualizar_prazo("24-04-2026")
    usuario = SimpleNamespace(usuario_id=1, active_mode="soldier")
    service_0359 = MissaoService(
        repositorio,
        today_provider=lambda: date(2026, 4, 25),
        now_provider=lambda: datetime(2026, 4, 25, 3, 59, 0),
    )

    missoes = service_0359.listar_missoes(usuario=usuario)

    assert [missao.missao_id for missao in missoes] == [10]
    assert repositorio.missao.status == StatusMissao.PENDENTE

    service_0401 = MissaoService(
        repositorio,
        today_provider=lambda: date(2026, 4, 25),
        now_provider=lambda: datetime(2026, 4, 25, 4, 1, 0),
    )
    missoes = service_0401.listar_missoes(usuario=usuario)

    assert missoes == []
    assert repositorio.missao.status == StatusMissao.FALHA
    assert repositorio.missao.failed_at == datetime(2026, 4, 25, 4, 1, 0)


def test_soldado_conclui_missao_do_dia_anterior_antes_das_quatro():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao.atualizar_prazo("24-04-2026")
    usuario = SimpleNamespace(usuario_id=1, active_mode="soldier")
    service = MissaoService(
        repositorio,
        today_provider=lambda: date(2026, 4, 25),
        now_provider=lambda: datetime(2026, 4, 25, 1, 0, 0),
    )

    missao = service.concluir_missao(10, usuario=usuario)

    assert missao.status == StatusMissao.CONCLUIDA
    assert missao.completed_at == datetime(2026, 4, 25, 1, 0, 0)


def test_dia_operacional_mantem_concluidas_no_progresso_da_cacada():
    repositorio = RepositorioOwnershipFake()
    missoes = []
    for indice in range(1, 5):
        missao = Missao(
            missao_id=indice,
            titulo=f"Ordem {indice}",
            prioridade=1,
            prazo="24-04-2026",
            instrucao="Executar",
            user_id=1,
        )
        if indice <= 2:
            missao.concluir(instante=datetime(2026, 4, 24, 10 + indice, 0, 0))
        missoes.append(missao)
    repositorio.carregar_dados_por_responsavel = lambda responsavel_id: missoes
    service = criar_missao_service(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="soldier")

    dia = service.listar_missoes_do_dia_operacional(usuario=usuario)

    assert len(dia) == 4
    assert sum(1 for missao in dia if missao.is_completed()) == 2


def test_usuario_nao_pode_concluir_missao_de_outro_usuario():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=2, active_mode="soldier")

    with pytest.raises(MissaoNaoEncontrada):
        service.concluir_missao(10, usuario=usuario)


def test_usuario_em_modo_general_pode_concluir_missao():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    missao = service.concluir_missao(10, usuario=usuario)

    assert missao.status == StatusMissao.CONCLUIDA
    assert missao.completed_at is not None


def test_usuario_em_modo_general_pode_registrar_falha_administrativa():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    missao = service.registrar_justificativa_falha(
        10,
        "not_done",
        "Não executei.",
        usuario=usuario,
    )

    assert missao.status == StatusMissao.FALHA
    assert missao.failure_reason is None


def test_usuario_em_modo_soldado_nao_pode_criar_missao():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="soldier")

    with pytest.raises(PermissionError):
        service.criar_missao(
            {
                "titulo": "Nova missão",
                "prioridade": 1,
                "prazo": "24-04-2026",
                "instrucao": "Executar",
                "responsavel_id": 1,
            },
            usuario=usuario,
        )


def test_criar_missao_usa_prioridade_legacy_quando_payload_nao_envia():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    missao = service.criar_missao(
        {
            "titulo": "Ordem sem prioridade visível",
            "prazo": "24-04-2026",
            "instrucao": "Executar sem renegociar",
            "responsavel_id": 1,
        },
        usuario=usuario,
    )

    assert missao.prioridade == PrioridadeMissao.MEDIA
    assert repositorio.missao_adicionada == missao
    assert repositorio.auditoria_registrada[-1].acao == "missao_criada"


def test_criar_missao_permite_apenas_titulo_sem_instrucao():
    repositorio = RepositorioOwnershipFake()
    service = criar_missao_service(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    missao = service.criar_missao(
        {
            "titulo": "Treinar",
            "prazo": "24-04-2026",
            "responsavel_id": 1,
        },
        usuario=usuario,
    )

    assert missao.titulo == "Treinar"
    assert missao.instrucao is None
    assert repositorio.missao_adicionada == missao


def test_criar_missao_sem_vinculo_nao_exige_arvore():
    repositorio = RepositorioFluxoFake()
    service = criar_missao_service(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    missao = service.criar_missao(
        {
            "titulo": "Beber água amanhã",
            "prazo": "25-04-2026",
        },
        usuario=usuario,
    )

    assert missao.objetivo_id is None
    assert missao.recurrence_weekdays is None
    assert missao.duration_type is None


def test_criar_missao_vinculada_a_objetivo_com_frequencia_e_duracao_infinita():
    repositorio = RepositorioFluxoFake()
    repositorio.objetivos[7] = SimpleNamespace(objetivo_id=7, usuario_id=1)
    service = criar_missao_service(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    missao = service.criar_missao(
        {
            "titulo": "Treinar escrita",
            "prazo": "24-04-2026",
            "objetivo_id": 7,
            "recurrence_weekdays": [0, 2, 4],
            "duration_type": "ate_objetivo",
        },
        usuario=usuario,
    )

    assert missao.objetivo_id == 7
    assert missao.recurrence_weekdays == [0, 2, 4]
    assert missao.duration_type == "ate_objetivo"
    assert missao.recurrence_end_date is None
    assert [ordem.due_date for ordem in repositorio.missoes] == [
        date(2026, 4, 24),
        date(2026, 4, 27),
        date(2026, 4, 29),
        date(2026, 5, 1),
        date(2026, 5, 4),
        date(2026, 5, 6),
    ]
    assert repositorio.carregamentos_por_responsavel == 1


def test_criar_missao_vinculada_a_objetivo_com_prazo_determinado():
    repositorio = RepositorioFluxoFake()
    repositorio.objetivos[9] = SimpleNamespace(objetivo_id=9, usuario_id=1)
    service = criar_missao_service(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    missao = service.criar_missao(
        {
            "titulo": "Revisar portfolio",
            "prazo": "24-04-2026",
            "objetivo_id": 9,
            "recurrence_weekdays": [1],
            "duration_type": "prazo",
            "recurrence_end_date": "30-05-2026",
        },
        usuario=usuario,
    )

    assert missao.objetivo_id == 9
    assert missao.recurrence_weekdays == [1]
    assert missao.duration_type == "prazo"
    assert missao.recurrence_end_date.isoformat() == "2026-05-30"
    assert [ordem.due_date for ordem in repositorio.missoes] == [
        date(2026, 4, 28),
        date(2026, 5, 5),
    ]


def test_criar_missao_recorrente_com_prazo_nao_ultrapassa_data_final():
    repositorio = RepositorioFluxoFake()
    repositorio.objetivos[9] = SimpleNamespace(objetivo_id=9, usuario_id=1)
    service = criar_missao_service(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    service.criar_missao(
        {
            "titulo": "Revisar portfolio",
            "prazo": "24-04-2026",
            "objetivo_id": 9,
            "recurrence_weekdays": [1, 4],
            "duration_type": "prazo",
            "recurrence_end_date": "28-04-2026",
        },
        usuario=usuario,
    )

    assert [ordem.due_date for ordem in repositorio.missoes] == [
        date(2026, 4, 24),
        date(2026, 4, 28),
    ]


def test_listagem_mantem_janela_recorrente_de_duas_semanas_sem_duplicar():
    repositorio = RepositorioFluxoFake()
    repositorio.objetivos[7] = SimpleNamespace(objetivo_id=7, usuario_id=1, status="ativo")
    service = criar_missao_service(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")
    service.criar_missao(
        {
            "titulo": "Treinar escrita",
            "prazo": "24-04-2026",
            "objetivo_id": 7,
            "recurrence_weekdays": [0, 2, 4],
            "duration_type": "ate_objetivo",
        },
        usuario=usuario,
    )
    service_futuro = MissaoService(
        repositorio,
        now_provider=lambda: datetime(2026, 5, 8, 10, 0, 0),
    )

    service_futuro.listar_missoes(usuario=usuario)
    service_futuro.listar_missoes(usuario=usuario)

    datas = [ordem.due_date for ordem in repositorio.missoes]
    assert datas.count(date(2026, 5, 8)) == 1
    assert datas.count(date(2026, 5, 20)) == 1
    assert date(2026, 5, 22) not in datas


def test_historico_nao_materializa_recorrencia_futura():
    repositorio = RepositorioFluxoFake()
    repositorio.objetivos[7] = SimpleNamespace(objetivo_id=7, usuario_id=1, status="ativo")
    service = criar_missao_service(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")
    service.criar_missao(
        {
            "titulo": "Treinar escrita",
            "prazo": "24-04-2026",
            "objetivo_id": 7,
            "recurrence_weekdays": [0, 2, 4],
            "duration_type": "ate_objetivo",
        },
        usuario=usuario,
    )
    total_apos_criacao = len(repositorio.missoes)

    service_futuro = MissaoService(
        repositorio,
        now_provider=lambda: datetime(2026, 5, 8, 10, 0, 0),
    )
    service_futuro.listar_missoes_historicas(usuario=usuario)

    assert len(repositorio.missoes) == total_apos_criacao


def test_usuario_pode_remover_apenas_missao_propria():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    service.remover_missao(10, usuario=usuario)

    assert repositorio.missao_removida_id == 10


def test_general_nao_remove_missao_finalizada():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao.concluir(instante=datetime(2026, 4, 24, 10, 0, 0))
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    with pytest.raises(ValueError, match="pendentes ou falhas"):
        service.remover_missao(10, usuario=usuario)


def test_general_pode_remover_missao_falhada():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao.marcar_como_falha(datetime(2026, 4, 24, 10, 0, 0))
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    service.remover_missao(10, usuario=usuario)

    assert repositorio.missao_removida_id == 10


def test_usuario_nao_pode_ver_historico_de_missao_de_outro_usuario():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=2, active_mode="general")

    with pytest.raises(MissaoNaoEncontrada):
        service.listar_historico(10, usuario=usuario)


def test_soldado_nao_pode_ver_historico_da_missao():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="soldier")

    with pytest.raises(PermissionError):
        service.listar_historico(10, usuario=usuario)


def test_usuario_pode_alternar_prioridade_fixada():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    missao = service.alternar_prioridade_fixada(10, usuario=usuario)

    assert missao.is_pinned is True
    assert repositorio.auditoria_registrada[-1].acao == "missao_prioridade_fixada"


def test_usuario_pode_rebaixar_prioridade_fixada():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    service.alternar_prioridade_fixada(10, usuario=usuario)
    missao = service.alternar_prioridade_fixada(10, usuario=usuario)

    assert missao.is_pinned is False
    assert repositorio.auditoria_registrada[-1].acao == "missao_prioridade_removida"


def test_usuario_em_modo_soldado_nao_pode_editar_missao():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="soldier")

    with pytest.raises(PermissionError):
        service.editar_missao(10, {"titulo": "Tentativa"}, usuario=usuario)


def test_usuario_em_modo_soldado_nao_pode_remover_missao():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="soldier")

    with pytest.raises(PermissionError):
        service.remover_missao(10, usuario=usuario)


def test_usuario_em_modo_soldado_pode_alternar_prioridade():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="soldier")

    missao = service.alternar_prioridade_fixada(10, usuario=usuario)

    assert missao.is_pinned is True


def test_missao_pendente_pode_registrar_falha_sem_justificativa():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao.atualizar_prazo("01-01-2020")
    service = MissaoService(repositorio)
    soldado = SimpleNamespace(usuario_id=1, active_mode="soldier")

    missao = service.registrar_justificativa_soldado(10, "Perdi a janela de execução.", usuario=soldado)

    assert missao.status == StatusMissao.FALHA
    assert missao.failure_reason is None
    assert repositorio.auditoria_registrada[-1].acao == "missao_nao_realizada"


def test_missao_expirada_registra_falha_sem_justificativa_tipificada():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao.atualizar_prazo("01-01-2020")
    service = criar_missao_service(repositorio)
    soldado = SimpleNamespace(usuario_id=1, active_mode="soldier")

    missao = service.registrar_justificativa_falha(
        10,
        "partially_done",
        "Executei apenas metade antes do prazo.",
        usuario=soldado,
    )

    assert missao.status == StatusMissao.FALHA
    assert missao.failure_reason_type is None
    assert missao.failure_reason is None
    assert repositorio.missao_atualizada is missao


def test_missao_concluida_nao_recebe_justificativa_de_falha():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao.concluir(instante=INSTANTE_TESTE)
    service = criar_missao_service(repositorio)
    soldado = SimpleNamespace(usuario_id=1, active_mode="soldier")

    with pytest.raises(ValueError, match="Apenas missão pendente"):
        service.registrar_justificativa_falha(
            10,
            "not_done",
            "Tentativa inválida.",
            usuario=soldado,
        )

    assert repositorio.missao.status == StatusMissao.CONCLUIDA


def test_done_not_marked_nao_cria_fluxo_especial_no_servico():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao.atualizar_prazo("01-01-2020")
    service = criar_missao_service(repositorio)
    soldado = SimpleNamespace(usuario_id=1, active_mode="soldier")

    missao = service.registrar_justificativa_falha(
        10,
        "done_not_marked",
        "Eu fiz, mas não registrei.",
        usuario=soldado,
    )

    assert missao.status == StatusMissao.FALHA
    assert missao.completed_at is None
    assert missao.failure_reason_type is None


def test_falha_nao_expoe_justificativa_imediata():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao.atualizar_prazo("01-01-2020")
    service = criar_missao_service(repositorio)
    soldado = SimpleNamespace(usuario_id=1, active_mode="soldier")

    repositorio.missao.marcar_como_falha(INSTANTE_TESTE)
    resposta = service.to_response(repositorio.missao, usuario=soldado)

    assert resposta["status_code"] == "FALHA"
    assert resposta["permissions"]["can_justify"] is False
    assert resposta["requires_immediate_justification"] is False
    assert resposta["has_pending_non_blocking_justification"] is False


def test_listar_missoes_general_retorna_apenas_quadro_operacional():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao = Missao(
        missao_id=10,
        titulo="Falha revisada",
        prioridade=1,
        prazo="01-01-2020",
        instrucao="Executar",
        status=StatusMissao.FALHA_REVISADA,
        failed_at=datetime(2026, 4, 24, 10, 0, 0),
        failure_reason="Falhou.",
        general_verdict="accepted",
        user_id=1,
    )
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    missoes = service.listar_missoes(usuario=usuario)

    assert missoes == []


def test_listar_missoes_historicas_retorna_apenas_finalizadas():
    concluida = Missao(
        missao_id=1,
        titulo="Concluída",
        prioridade=1,
        prazo="22-04-2026",
        instrucao="Executar",
        status=StatusMissao.CONCLUIDA,
        completed_at=datetime(2026, 4, 22, 10, 0, 0),
        user_id=1,
    )
    revisada = Missao(
        missao_id=2,
        titulo="Falha revisada",
        prioridade=2,
        prazo="23-04-2026",
        instrucao="Executar",
        status=StatusMissao.FALHA_REVISADA,
        failed_at=datetime(2026, 4, 23, 10, 0, 0),
        failure_reason="Falhou.",
        general_verdict="accepted",
        is_pinned=True,
        user_id=1,
    )
    pendente = Missao(
        missao_id=3,
        titulo="Pendente",
        prioridade=3,
        prazo="24-04-2099",
        instrucao="Executar",
        status=StatusMissao.PENDENTE,
        user_id=1,
    )
    repositorio = RepositorioOwnershipFake()
    repositorio.carregar_dados_por_responsavel = lambda responsavel_id: [concluida, revisada, pendente]
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    missoes = service.listar_missoes_historicas(usuario=usuario)

    assert [missao.missao_id for missao in missoes] == [2, 1]


def test_revisao_de_justificativa_legada_nao_altera_falha_simples():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao.atualizar_prazo("01-01-2020")
    service = MissaoService(repositorio)
    soldado = SimpleNamespace(usuario_id=1, active_mode="soldier")
    general = SimpleNamespace(usuario_id=1, active_mode="general")

    service.registrar_justificativa_soldado(10, "Houve interrupção externa.", usuario=soldado)
    missao = service.revisar_justificativa(10, True, usuario=general)

    assert missao.status == StatusMissao.FALHA
    assert missao.general_verdict is None

    repositorio.missao.reabrir()
    repositorio.missao.atualizar_prazo("01-01-2020")
    service.registrar_justificativa_soldado(10, "Eu procrastinei.", usuario=soldado)
    missao = service.revisar_justificativa(10, False, usuario=general)

    assert missao.status == StatusMissao.FALHA
    assert missao.general_verdict is None


def test_usuario_de_outro_contexto_nao_pode_justificar_missao():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao.atualizar_prazo("01-01-2020")
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=2, active_mode="soldier")

    with pytest.raises(MissaoNaoEncontrada):
        service.registrar_justificativa_soldado(10, "Tentativa indevida.", usuario=usuario)


def test_soldado_nao_pode_justificar_missao_concluida():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao.concluir(instante=INSTANTE_TESTE)
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="soldier")

    with pytest.raises(ValueError, match="Apenas missão pendente"):
        service.registrar_justificativa_soldado(10, "Tentativa inválida.", usuario=usuario)


def test_general_so_pode_revisar_estado_correto():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    missao = service.revisar_justificativa(10, True, usuario=usuario)

    assert missao.status == StatusMissao.PENDENTE


def test_soldado_nao_pode_acessar_revisao_do_general():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="soldier")

    with pytest.raises(PermissionError):
        service.listar_missoes_para_revisao(usuario=usuario)


class RepositorioUsuarioFake:
    def __init__(self):
        self.usuario = Usuario(
            usuario_id=1,
            usuario="Henrique",
            email="henrique@email.com",
            senha_hash="hash",
        )
        self.nome_atualizado = None

    def buscar_usuario_por_id(self, usuario_id):
        if usuario_id == self.usuario.usuario_id:
            return self.usuario
        return None

    def atualizar_nome_general(self, usuario_id, nome_general):
        self.nome_atualizado = (usuario_id, nome_general)
        self.usuario.definir_nome_general(nome_general)


class RepositorioRelatorioFake:
    def __init__(self, missoes):
        self._missoes = missoes

    def carregar_dados_por_responsavel(self, responsavel_id):
        return [missao for missao in self._missoes if missao.user_id == responsavel_id]


def test_relatorio_semanal_calcula_metricas():
    missoes = [
        Missao(
            missao_id=1,
            titulo="Concluir relatório",
            prioridade=1,
            prazo="22-04-2026",
            instrucao="Entregar versão final",
            status=StatusMissao.CONCLUIDA,
            completed_at=datetime(2026, 4, 22, 10, 0, 0),
            created_at=datetime(2026, 4, 21, 8, 0, 0),
            user_id=1,
        ),
        Missao(
            missao_id=2,
            titulo="Treino",
            prioridade=2,
            prazo="23-04-2026",
            instrucao="Executar bloco diário",
            status=StatusMissao.FALHA_PENDENTE_JUSTIFICATIVA,
            created_at=datetime(2026, 4, 21, 9, 0, 0),
            failed_at=datetime(2026, 4, 24, 8, 0, 0),
            is_pinned=True,
            user_id=1,
        ),
        Missao(
            missao_id=3,
            titulo="Reunião",
            prioridade=2,
            prazo="24-04-2026",
            instrucao="Revisar execução",
            status=StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO,
            created_at=datetime(2026, 4, 22, 8, 0, 0),
            failed_at=datetime(2026, 4, 24, 8, 0, 0),
            failure_reason="Perdi o horário por atraso externo.",
            user_id=1,
        ),
        Missao(
            missao_id=4,
            titulo="Auditoria",
            prioridade=3,
            prazo="25-04-2026",
            instrucao="Fechar pendências",
            status=StatusMissao.FALHA_REVISADA,
            created_at=datetime(2026, 4, 23, 8, 0, 0),
            failed_at=datetime(2026, 4, 25, 8, 0, 0),
            failure_reason="Subestimei o tempo necessário.",
            general_verdict="accepted",
            is_pinned=True,
            user_id=1,
        ),
    ]
    service = RelatorioService(RepositorioRelatorioFake(missoes))

    relatorio = service.get_weekly_report(
        1,
        start_date=date(2026, 4, 20),
        end_date=date(2026, 4, 26),
    )

    assert relatorio["total_missions"] == 4
    assert relatorio["completed_missions"] == 1
    assert relatorio["failed_missions"] == 3
    assert relatorio["completion_rate"] == 25.0
    assert relatorio["high_priority_missions"] == 2
    assert relatorio["missions_waiting_justification"] == 0
    assert relatorio["missions_waiting_review"] == 0
    assert relatorio["reviewed_failures"] == 3
    assert relatorio["failure_reasons"] == []


def test_relatorio_semanal_ignora_outro_usuario_e_semana_vazia():
    missoes = [
        Missao(
            missao_id=1,
            titulo="Outra pessoa",
            prioridade=1,
            prazo="22-04-2026",
            instrucao="Executar",
            status=StatusMissao.CONCLUIDA,
            completed_at=datetime(2026, 4, 22, 10, 0, 0),
            created_at=datetime(2026, 4, 21, 8, 0, 0),
            user_id=2,
        )
    ]
    service = RelatorioService(RepositorioRelatorioFake(missoes))

    relatorio = service.get_weekly_report(
        1,
        start_date=date(2026, 4, 20),
        end_date=date(2026, 4, 26),
    )

    assert relatorio["total_missions"] == 0
    assert relatorio["completed_missions"] == 0
    assert relatorio["completion_rate"] == 0
    assert relatorio["failure_reasons"] == []


def test_relatorio_semanal_usa_datas_reais_de_execucao_e_falha():
    missoes = [
        Missao(
            missao_id=1,
            titulo="Pendente criada na semana",
            prioridade=1,
            prazo="24-04-2026",
            instrucao="Ainda sem desfecho",
            status=StatusMissao.PENDENTE,
            created_at=datetime(2026, 4, 21, 8, 0, 0),
            user_id=1,
        ),
        Missao(
            missao_id=2,
            titulo="Concluída fora do prazo semanal",
            prioridade=1,
            prazo="01-01-2020",
            instrucao="Conta pela conclusão real",
            status=StatusMissao.CONCLUIDA,
            completed_at=datetime(2026, 4, 22, 10, 0, 0),
            created_at=datetime(2020, 1, 1, 8, 0, 0),
            user_id=1,
        ),
        Missao(
            missao_id=3,
            titulo="Falha fora da semana",
            prioridade=1,
            prazo="24-04-2026",
            instrucao="Não deve entrar pelo prazo",
            status=StatusMissao.FALHA_PENDENTE_JUSTIFICATIVA,
            failed_at=datetime(2026, 4, 10, 10, 0, 0),
            created_at=datetime(2026, 4, 21, 8, 0, 0),
            user_id=1,
        ),
    ]
    service = RelatorioService(RepositorioRelatorioFake(missoes))

    relatorio = service.get_weekly_report(
        1,
        start_date=date(2026, 4, 20),
        end_date=date(2026, 4, 26),
    )

    assert relatorio["total_missions"] == 1
    assert relatorio["completed_missions"] == 1
    assert relatorio["failed_missions"] == 0


def test_relatorio_conta_madrugada_no_dia_operacional_anterior():
    missoes = [
        Missao(
            missao_id=1,
            titulo="Concluída de madrugada",
            prioridade=1,
            prazo="24-04-2026",
            instrucao="Executar",
            status=StatusMissao.CONCLUIDA,
            completed_at=datetime(2026, 4, 25, 1, 0, 0),
            user_id=1,
        ),
        Missao(
            missao_id=2,
            titulo="Falha após virada operacional",
            prioridade=1,
            prazo="24-04-2026",
            instrucao="Executar",
            status=StatusMissao.FALHA_PENDENTE_JUSTIFICATIVA,
            failed_at=datetime(2026, 4, 25, 4, 1, 0),
            user_id=1,
        ),
    ]
    service = RelatorioService(RepositorioRelatorioFake(missoes))

    relatorio_dia_24 = service.get_weekly_report(
        1,
        start_date=date(2026, 4, 24),
        end_date=date(2026, 4, 24),
    )
    relatorio_dia_25 = service.get_weekly_report(
        1,
        start_date=date(2026, 4, 25),
        end_date=date(2026, 4, 25),
    )

    assert relatorio_dia_24["completed_missions"] == 1
    assert relatorio_dia_24["failed_missions"] == 0
    assert relatorio_dia_25["completed_missions"] == 0
    assert relatorio_dia_25["failed_missions"] == 1


def test_relatorio_default_usa_semana_da_data_operacional_antes_do_corte():
    missao = Missao(
        missao_id=1,
        titulo="Executada no domingo operacional",
        prioridade=1,
        prazo="26-04-2026",
        instrucao="Executar",
        status=StatusMissao.CONCLUIDA,
        completed_at=datetime(2026, 4, 27, 2, 0, 0),
        user_id=1,
    )
    service = RelatorioService(
        RepositorioRelatorioFake([missao]),
        now_provider=lambda: datetime(2026, 4, 27, 2, 30, 0),
    )

    relatorio = service.get_weekly_report(1)

    assert relatorio["start_date"] == "2026-04-20"
    assert relatorio["end_date"] == "2026-04-26"
    assert relatorio["completed_missions"] == 1


def test_relatorio_nao_trata_done_not_marked_como_executada():
    missao = Missao(
        missao_id=1,
        titulo="Feita sem registro",
        prioridade=1,
        prazo="24-04-2026",
        instrucao="Executar",
        status=StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO,
        failed_at=datetime(2026, 4, 24, 10, 0, 0),
        failure_reason_type="done_not_marked",
        failure_reason="Executei, mas não registrei no aplicativo.",
        user_id=1,
    )
    service = RelatorioService(RepositorioRelatorioFake([missao]))

    relatorio = service.get_weekly_report(
        1,
        start_date=date(2026, 4, 24),
        end_date=date(2026, 4, 24),
    )

    assert relatorio["completed_missions"] == 0
    assert relatorio["failed_missions"] == 1
    assert relatorio["completion_rate"] == 0.0
    assert relatorio["failure_reasons"] == []


def test_limpar_relatorio_falhas_nao_altera_registros_objetivos():
    informativa = Missao(
        missao_id=1,
        titulo="Falha informativa",
        prioridade=1,
        prazo="24-04-2026",
        instrucao="Executar",
        status=StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO,
        failed_at=datetime(2026, 4, 24, 10, 0, 0),
        failure_reason="Não executei.",
        user_id=1,
    )
    prioritária = Missao(
        missao_id=2,
        titulo="Falha prioritária",
        prioridade=1,
        prazo="24-04-2026",
        instrucao="Executar",
        status=StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO,
        failed_at=datetime(2026, 4, 24, 10, 0, 0),
        failure_reason="Não executei.",
        is_pinned=True,
        user_id=1,
    )
    repositorio = RepositorioOwnershipFake()
    repositorio.carregar_dados_por_responsavel = lambda responsavel_id: [informativa, prioritária]
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    limpas = service.limpar_relatorio_falhas(
        usuario=usuario,
        start_date=date(2026, 4, 24),
        end_date=date(2026, 4, 24),
    )

    assert [missao.missao_id for missao in limpas] == [1, 2]
    assert informativa.status == StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO
    assert informativa.general_verdict is None
    assert prioritária.status == StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO
    assert prioritária.general_verdict is None
    assert repositorio.missao_atualizada is None

    relatorio = RelatorioService(RepositorioRelatorioFake([informativa, prioritária])).get_weekly_report(
        1,
        start_date=date(2026, 4, 24),
        end_date=date(2026, 4, 24),
    )
    historicas = service.listar_missoes_historicas(usuario=usuario)

    assert relatorio["failed_missions"] == 2
    assert relatorio["failure_reasons"] == []
    assert [missao.missao_id for missao in historicas] == [2, 1]


def test_relatorio_semanal_valida_intervalo_invertido_e_parcial():
    service = RelatorioService(RepositorioRelatorioFake([]))

    with pytest.raises(ValueError, match="Intervalo semanal inválido"):
        service.get_weekly_report(
            1,
            start_date=date(2026, 4, 26),
            end_date=date(2026, 4, 20),
        )

    with pytest.raises(ValueError, match="start_date e end_date juntos"):
        service.get_weekly_report(
            1,
            start_date=date(2026, 4, 20),
        )


def test_relatorio_semanal_exige_modo_general():
    service = RelatorioService(RepositorioRelatorioFake([]))
    usuario = SimpleNamespace(usuario_id=1, active_mode="soldier")

    with pytest.raises(PermissionError):
        service.get_weekly_report_for_user(
            usuario,
            start_date=date(2026, 4, 20),
            end_date=date(2026, 4, 26),
        )


def test_revisao_general_identifica_pendencia_fecha_e_lista_historico():
    repositorio = RepositorioOwnershipFake()
    repositorio.carregar_dados_por_responsavel = lambda responsavel_id: [
        Missao(
            missao_id=1,
            titulo="Executada",
            prioridade=1,
            prazo="21-04-2026",
            instrucao="Executar",
            status=StatusMissao.CONCLUIDA,
            completed_at=datetime(2026, 4, 21, 10, 0, 0),
            user_id=1,
        ),
        Missao(
            missao_id=2,
            titulo="Pendente ignorada",
            prioridade=1,
            prazo="22-04-2026",
            instrucao="Executar",
            status=StatusMissao.PENDENTE,
            user_id=1,
        ),
        Missao(
            missao_id=3,
            titulo="Prioridade falhada",
            prioridade=1,
            prazo="23-04-2026",
            instrucao="Executar",
            status=StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO,
            failed_at=datetime(2026, 4, 23, 10, 0, 0),
            failure_reason="Não executei.",
            is_pinned=True,
            user_id=1,
        ),
    ]
    service = RevisaoService(
        repositorio,
        now_provider=lambda: datetime(2026, 4, 28, 10, 0, 0),
    )
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    estado = service.obter_estado(usuario)
    revisao = service.fechar_revisao(usuario, observacao="Ajustar execução da manhã.")
    estado_fechado = service.obter_estado(usuario)
    historico = service.listar_revisoes(usuario)

    assert estado["pending"] is True
    assert estado["period"] == {"start_date": "2026-04-20", "end_date": "2026-04-26"}
    assert estado["reading"]["report"]["completed_missions"] == 1
    assert estado["reading"]["pending_missions"] == 1
    assert estado["reading"]["report"]["high_priority_missions"] == 1
    assert revisao["completed_missions"] == 1
    assert revisao["pending_missions"] == 1
    assert revisao["failed_missions"] == 1
    assert revisao["high_priority_missions"] == 1
    assert revisao["observacao"] == "Ajustar execução da manhã."
    assert estado_fechado["pending"] is False
    assert historico == [revisao]


def test_revisao_semanal_respeita_virada_operacional_da_semana():
    repositorio = RepositorioOwnershipFake()
    repositorio.carregar_dados_por_responsavel = lambda responsavel_id: [
        Missao(
            missao_id=1,
            titulo="Executada na semana anterior real",
            prioridade=1,
            prazo="19-04-2026",
            instrucao="Executar",
            status=StatusMissao.CONCLUIDA,
            completed_at=datetime(2026, 4, 19, 10, 0, 0),
            user_id=1,
        ),
        Missao(
            missao_id=2,
            titulo="Domingo ainda no ciclo atual",
            prioridade=1,
            prazo="26-04-2026",
            instrucao="Executar",
            status=StatusMissao.CONCLUIDA,
            completed_at=datetime(2026, 4, 27, 2, 0, 0),
            user_id=1,
        ),
    ]
    service = RevisaoService(
        repositorio,
        now_provider=lambda: datetime(2026, 4, 27, 2, 30, 0),
    )
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    estado = service.obter_estado(usuario)

    assert estado["period"] == {"start_date": "2026-04-13", "end_date": "2026-04-19"}
    assert estado["reading"]["report"]["completed_missions"] == 1


def test_revisao_general_nao_fica_pendente_sem_dados_operacionais():
    repositorio = RepositorioOwnershipFake()
    repositorio.carregar_dados_por_responsavel = lambda responsavel_id: []
    service = RevisaoService(
        repositorio,
        now_provider=lambda: datetime(2026, 4, 28, 10, 0, 0),
    )
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    estado = service.obter_estado(usuario)

    assert estado["pending"] is False
    assert estado["reading"]["report"]["total_missions"] == 0


def test_revisao_general_fica_pendente_com_ordens_ignoradas():
    repositorio = RepositorioOwnershipFake()
    repositorio.carregar_dados_por_responsavel = lambda responsavel_id: [
        Missao(
            missao_id=1,
            titulo="Ignorada na semana",
            prioridade=1,
            prazo="22-04-2026",
            instrucao="Executar",
            status=StatusMissao.PENDENTE,
            user_id=1,
        ),
    ]
    service = RevisaoService(
        repositorio,
        now_provider=lambda: datetime(2026, 4, 28, 10, 0, 0),
    )
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    estado = service.obter_estado(usuario)

    assert estado["pending"] is True
    assert estado["reading"]["pending_missions"] == 1
    assert estado["reading"]["report"]["total_missions"] == 0


def test_auth_service_define_nome_do_general_com_trim_e_persistencia():
    repositorio = RepositorioUsuarioFake()
    service = AuthService(repositorio)

    usuario = service.definir_nome_general(1, "  General Atlas  ")

    assert usuario.nome_general == "General Atlas"
    assert repositorio.nome_atualizado == (1, "General Atlas")


def test_auth_service_bloqueia_nome_do_general_em_modo_soldado():
    repositorio = RepositorioUsuarioFake()
    repositorio.usuario.definir_modo("soldier")
    service = AuthService(repositorio)

    with pytest.raises(PermissionError, match="modo General"):
        service.definir_nome_general(1, "General Atlas")

    assert repositorio.nome_atualizado is None
