from datetime import date, datetime
from types import SimpleNamespace

import pytest

from auditoria import EventoAuditoria
from core_exceptions import MissaoNaoEncontrada
from missao import Missao, StatusMissao
from services.auth_service import AuthService
from services.missao_service import MissaoService
from services.mission_permissions import MissionPermissions
from services.relatorio_service import RelatorioService
from usuario import Usuario


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

    def remover_missao(self, missao_id):
        self.missao_removida_id = missao_id

    def listar_auditoria_por_missao(self, missao_id):
        return [evento for evento in self.auditoria if evento.missao_id == missao_id]

    def registrar_auditoria(self, evento):
        self.auditoria_registrada.append(evento)


def test_mission_permissions_to_dict_expoe_todas_as_chaves_booleanas():
    permissions = MissionPermissions(
        can_complete=True,
        can_edit=False,
        can_delete=False,
        can_toggle_decided=True,
        can_justify=False,
        can_review=False,
        can_view_history=True,
    )

    assert permissions.to_dict() == {
        "can_complete": True,
        "can_edit": False,
        "can_delete": False,
        "can_toggle_decided": True,
        "can_justify": False,
        "can_review": False,
        "can_view_history": True,
    }


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


def test_listar_missoes_prioriza_decididas_antes_da_prioridade_numerica():
    repositorio = RepositorioListagemFake()
    repositorio.carregar_dados = lambda: [
        Missao(
            missao_id=1,
            titulo="Alta não decidida",
            prioridade=1,
            prazo="24-04-2026",
            instrucao="Executar",
            is_decided=False,
        ),
        Missao(
            missao_id=2,
            titulo="Baixa decidida",
            prioridade=3,
            prazo="24-04-2026",
            instrucao="Executar",
            is_decided=True,
        ),
        Missao(
            missao_id=3,
            titulo="Média não decidida",
            prioridade=2,
            prazo="24-04-2026",
            instrucao="Executar",
            is_decided=False,
        ),
    ]
    service = criar_missao_service(repositorio)

    missoes = service.listar_missoes()

    assert [missao.titulo for missao in missoes] == [
        "Baixa decidida",
        "Alta não decidida",
        "Média não decidida",
    ]


def test_listar_missoes_prioriza_justificativa_antes_de_decididas():
    repositorio = RepositorioListagemFake()
    repositorio.carregar_dados = lambda: [
        Missao(
            missao_id=1,
            titulo="Decidida",
            prioridade=1,
            prazo="24-04-2026",
            instrucao="Executar",
            status=StatusMissao.PENDENTE,
            is_decided=True,
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

    assert [missao.titulo for missao in missoes] == [
        "Aguardando justificativa",
        "Decidida",
    ]


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
        "can_toggle_decided": False,
        "can_justify": False,
        "can_review": False,
        "can_view_history": False,
    }


def test_to_response_general_define_permissions_para_revisao():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao.failed_at = datetime(2026, 4, 24, 10, 0, 0)
    repositorio.missao.failure_reason = "Bloqueio externo."
    repositorio.missao.atualizar_status(StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO)
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    payload = service.to_response(repositorio.missao, usuario=usuario)

    assert payload["status_code"] == "FALHA_JUSTIFICADA_PENDENTE_REVISAO"
    assert payload["permissions"]["can_review"] is True
    assert payload["permissions"]["can_edit"] is False
    assert payload["permissions"]["can_delete"] is False
    assert payload["permissions"]["can_toggle_decided"] is False


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
    assert payload["permissions"]["can_toggle_decided"] is False
    assert payload["permissions"]["can_view_history"] is True


def test_to_response_general_define_permissions_para_falha_revisada():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao.failed_at = datetime(2026, 4, 24, 10, 0, 0)
    repositorio.missao.failure_reason = "Falhou."
    repositorio.missao.general_verdict = "accepted"
    repositorio.missao.atualizar_status(StatusMissao.FALHA_REVISADA)
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    payload = service.to_response(repositorio.missao, usuario=usuario)

    assert payload["permissions"]["can_edit"] is False
    assert payload["permissions"]["can_delete"] is False
    assert payload["permissions"]["can_toggle_decided"] is False
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


def test_soldado_nao_pode_concluir_missao_vencida_e_envia_para_fluxo_de_falha():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao.atualizar_prazo("01-01-2020")
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="soldier")

    with pytest.raises(ValueError, match="Missão fora do prazo"):
        service.concluir_missao(10, usuario=usuario)

    assert repositorio.missao.status == StatusMissao.FALHA_PENDENTE_JUSTIFICATIVA
    assert repositorio.missao.failure_reason is None


def test_usuario_nao_pode_concluir_missao_de_outro_usuario():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=2, active_mode="soldier")

    with pytest.raises(MissaoNaoEncontrada):
        service.concluir_missao(10, usuario=usuario)


def test_usuario_em_modo_general_nao_pode_concluir_missao():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    with pytest.raises(PermissionError):
        service.concluir_missao(10, usuario=usuario)


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

    with pytest.raises(ValueError, match="operacionais"):
        service.remover_missao(10, usuario=usuario)


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


def test_usuario_pode_alternar_decisao_sem_afetar_outros_campos():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    missao = service.alternar_decisao(10, usuario=usuario)

    assert missao.is_decided is True
    assert missao.titulo == "Missão protegida"
    assert repositorio.auditoria_registrada[-1].acao == "missao_decidida"


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


def test_usuario_em_modo_soldado_nao_pode_alternar_decisao():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="soldier")

    with pytest.raises(PermissionError):
        service.alternar_decisao(10, usuario=usuario)


def test_missao_finalizada_nao_pode_receber_decisao():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao.concluir(instante=datetime(2026, 4, 24, 10, 0, 0))
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    with pytest.raises(ValueError, match="marcador de decisão"):
        service.alternar_decisao(10, usuario=usuario)


def test_missao_vencida_pode_receber_justificativa_do_soldado_e_aparece_em_revisao():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao.atualizar_prazo("01-01-2020")
    service = MissaoService(repositorio)
    soldado = SimpleNamespace(usuario_id=1, active_mode="soldier")
    general = SimpleNamespace(usuario_id=1, active_mode="general")

    service.listar_missoes(usuario=soldado)
    missao = service.registrar_justificativa_soldado(10, "Perdi a janela de execução.", usuario=soldado)

    assert missao.status == StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO
    assert missao.failure_reason == "Perdi a janela de execução."
    assert [evento.acao for evento in repositorio.auditoria_registrada][-2:] == [
        "missao_falhou",
        "justificativa_registrada",
    ]

    missoes_em_revisao = service.listar_missoes_para_revisao(usuario=general)
    assert [item.missao_id for item in missoes_em_revisao] == [10]


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

    assert [missao.missao_id for missao in missoes] == [1, 2]


def test_general_pode_aceitar_ou_rejeitar_justificativa():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao.atualizar_prazo("01-01-2020")
    service = MissaoService(repositorio)
    soldado = SimpleNamespace(usuario_id=1, active_mode="soldier")
    general = SimpleNamespace(usuario_id=1, active_mode="general")

    service.listar_missoes(usuario=soldado)
    service.registrar_justificativa_soldado(10, "Houve interrupção externa.", usuario=soldado)
    missao = service.revisar_justificativa(10, True, usuario=general)

    assert missao.status == StatusMissao.FALHA_REVISADA
    assert missao.general_verdict == "accepted"

    repositorio.missao.reabrir()
    repositorio.missao.atualizar_prazo("01-01-2020")
    service.listar_missoes(usuario=soldado)
    service.registrar_justificativa_soldado(10, "Eu procrastinei.", usuario=soldado)
    missao = service.revisar_justificativa(10, False, usuario=general)

    assert missao.status == StatusMissao.FALHA_REVISADA
    assert missao.general_verdict == "rejected"


def test_usuario_de_outro_contexto_nao_pode_justificar_missao():
    repositorio = RepositorioOwnershipFake()
    repositorio.missao.atualizar_prazo("01-01-2020")
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=2, active_mode="soldier")

    with pytest.raises(MissaoNaoEncontrada):
        service.registrar_justificativa_soldado(10, "Tentativa indevida.", usuario=usuario)


def test_soldado_so_pode_justificar_estado_correto():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="soldier")

    with pytest.raises(ValueError, match="aguardando justificativa"):
        service.registrar_justificativa_soldado(10, "Tentativa inválida.", usuario=usuario)


def test_general_so_pode_revisar_estado_correto():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1, active_mode="general")

    with pytest.raises(ValueError, match="pendente de revisão"):
        service.revisar_justificativa(10, True, usuario=usuario)


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
            is_decided=True,
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
            is_decided=True,
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
    assert relatorio["committed_missions_count"] == 2
    assert relatorio["committed_missions_failed"] == 2
    assert relatorio["missions_waiting_justification"] == 1
    assert relatorio["missions_waiting_review"] == 1
    assert relatorio["reviewed_failures"] == 1
    assert relatorio["failure_reasons"] == [
        "Perdi o horário por atraso externo.",
        "Subestimei o tempo necessário.",
    ]


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
