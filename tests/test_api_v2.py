from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from api.routes import (
    alterar_timezone,
    alterar_turno_planejamento,
    concluir_missao,
    criar_missao,
    definir_nome_general,
    editar_missao,
    justificar_missao,
    listar_historico,
    listar_missoes_historicas,
    listar_missoes,
    listar_missoes_operacionais,
    listar_missoes_em_revisao,
    login,
    obter_relatorio_semanal,
    registrar_justificativa_falha,
    registrar_usuario,
    revisar_justificativa,
)
from api.schemas import (
    FailureJustificationPayload,
    LoginPayload,
    MissaoCreatePayload,
    MissaoUpdatePayload,
    NomeGeneralPayload,
    PlanningWindowPayload,
    RegistroPayload,
    RevisaoJustificativaPayload,
    SoldierExcusePayload,
    TimezonePayload,
)
from missao import Missao, StatusMissao
from services.auth_service import AuthService
from services.missao_service import MissaoService
from services.relatorio_service import RelatorioService


DATA_TESTE = datetime(2026, 4, 24, 10, 0, 0)


class RepositorioV2Fake:
    def __init__(self):
        self.missoes = []
        self.usuarios = []
        self.contextos = {}
        self.auditoria = []
        self.proximo_missao_id = 1
        self.proximo_usuario_id = 1
        self.proximo_evento_id = 1

    def carregar_dados(self):
        return sorted(self.missoes, key=lambda m: (m.prioridade.value, m.missao_id))

    def carregar_dados_por_responsavel(self, responsavel_id):
        ids = {
            missao_id
            for missao_id, contexto in self.contextos.items()
            if contexto.get("responsavel_id") == responsavel_id
        }
        return [missao for missao in self.carregar_dados() if missao.missao_id in ids]

    def adicionar_missao(self, missao):
        missao.atualizar_missao_id(self.proximo_missao_id)
        self.proximo_missao_id += 1
        self.missoes.append(missao)

    def buscar_por_id(self, missao_id):
        for missao in self.missoes:
            if missao.missao_id == missao_id:
                return missao
        return None

    def atualizar_missao(self, missao_atualizada):
        for indice, missao in enumerate(self.missoes):
            if missao.missao_id == missao_atualizada.missao_id:
                self.missoes[indice] = missao_atualizada
                return

    def remover_missao(self, missao_id):
        self.missoes = [m for m in self.missoes if m.missao_id != missao_id]
        self.contextos.pop(missao_id, None)

    def adicionar_usuario(self, usuario):
        usuario.usuario_id = self.proximo_usuario_id
        self.proximo_usuario_id += 1
        self.usuarios.append(usuario)

    def buscar_usuario_por_email(self, email):
        email = email.strip().lower()
        for usuario in self.usuarios:
            if usuario.email == email:
                return usuario
        return None

    def buscar_usuario_por_id(self, usuario_id):
        for usuario in self.usuarios:
            if usuario.usuario_id == usuario_id:
                return usuario
        return None

    def atualizar_nome_general(self, usuario_id, nome_general):
        usuario = self.buscar_usuario_por_id(usuario_id)
        if usuario is not None:
            usuario.definir_nome_general(nome_general)

    def atualizar_modo_ativo(self, usuario_id, active_mode):
        usuario = self.buscar_usuario_por_id(usuario_id)
        if usuario is not None:
            usuario.definir_modo(active_mode)

    def atualizar_turno_planejamento(self, usuario_id, planning_window):
        usuario = self.buscar_usuario_por_id(usuario_id)
        if usuario is not None:
            usuario.definir_turno_planejamento(planning_window)

    def atualizar_timezone(self, usuario_id, timezone, timezone_updated_at):
        usuario = self.buscar_usuario_por_id(usuario_id)
        if usuario is not None:
            usuario.definir_timezone(timezone)
            usuario.registrar_alteracao_timezone(timezone_updated_at)

    def registrar_uso_emergencia_general(self, usuario_id, local_date):
        usuario = self.buscar_usuario_por_id(usuario_id)
        if usuario is not None:
            usuario.registrar_uso_emergencia_general(local_date)

    def salvar_contexto_missao(self, missao_id, criada_por_id, responsavel_id):
        self.contextos[missao_id] = {
            "criada_por_id": criada_por_id,
            "responsavel_id": responsavel_id,
        }

    def buscar_contexto_missao(self, missao_id):
        return self.contextos.get(missao_id)

    def registrar_auditoria(self, evento):
        evento.evento_id = self.proximo_evento_id
        self.proximo_evento_id += 1
        self.auditoria.append(evento)

    def listar_auditoria_por_missao(self, missao_id):
        return [evento for evento in self.auditoria if evento.missao_id == missao_id]


def preparar_ambiente():
    repo = RepositorioV2Fake()
    auth = AuthService(
        repo,
        now_provider=lambda: datetime(2026, 4, 25, 0, 30, tzinfo=timezone.utc),
    )
    missoes = MissaoService(
        repo,
        today_provider=lambda: DATA_TESTE.date(),
        now_provider=lambda: DATA_TESTE,
    )
    relatorios = RelatorioService(repo)

    usuario = registrar_usuario(
        RegistroPayload(usuario="Henrique", email="henrique@email.com", senha="segredo123"),
        auth_service=auth,
    )
    resultado_login = login(
        LoginPayload(email="henrique@email.com", senha="segredo123"),
        auth_service=auth,
    )
    usuario_obj = auth.obter_usuario_por_token(resultado_login["access_token"])
    return repo, auth, missoes, relatorios, usuario, usuario_obj


def assert_mission_contract(payload):
    assert payload["status"]
    assert payload["status_code"]
    assert payload["status_label"]
    assert "failure_reason_type" in payload
    assert isinstance(payload["requires_immediate_justification"], bool)
    assert isinstance(payload["has_pending_non_blocking_justification"], bool)
    assert payload["permissions"] == {
        "can_complete": payload["permissions"]["can_complete"],
        "can_edit": payload["permissions"]["can_edit"],
        "can_delete": payload["permissions"]["can_delete"],
        "can_toggle_decided": payload["permissions"]["can_toggle_decided"],
        "can_justify": payload["permissions"]["can_justify"],
        "can_review": payload["permissions"]["can_review"],
        "can_view_history": payload["permissions"]["can_view_history"],
    }
    assert all(isinstance(value, bool) for value in payload["permissions"].values())


def test_auth_register_login_e_me_v2():
    _, _, _, _, usuario, usuario_obj = preparar_ambiente()

    assert usuario["email"] == "henrique@email.com"
    assert usuario["planning_window"] == "night"
    assert usuario["timezone"] == "America/Recife"
    assert usuario["emergency_unlock_date"] is None
    assert usuario["timezone_updated_at"] is None
    assert usuario_obj.usuario == "Henrique"
    assert usuario_obj.active_mode == "general"


def test_api_altera_turno_e_timezone_apenas_no_modo_general():
    _, auth, _, _, _, usuario = preparar_ambiente()

    resposta_turno = alterar_turno_planejamento(
        PlanningWindowPayload(planning_window="morning"),
        usuario=usuario,
        auth_service=auth,
    )
    resposta_timezone = alterar_timezone(
        TimezonePayload(timezone="Europe/Lisbon"),
        usuario=usuario,
        auth_service=auth,
    )

    assert resposta_turno["planning_window"] == "morning"
    assert resposta_timezone["timezone"] == "Europe/Lisbon"
    assert resposta_timezone["timezone_updated_at"] == "2026-04-25T00:30:00+00:00"

    usuario.definir_modo("soldier")
    auth.alterar_modo(usuario.usuario_id, "soldier")

    with pytest.raises(HTTPException) as erro_turno:
        alterar_turno_planejamento(
            PlanningWindowPayload(planning_window="night"),
            usuario=usuario,
            auth_service=auth,
        )
    with pytest.raises(HTTPException) as erro_timezone:
        alterar_timezone(
            TimezonePayload(timezone="America/New_York"),
            usuario=usuario,
            auth_service=auth,
        )

    assert erro_turno.value.status_code == 403
    assert erro_timezone.value.status_code == 403


def test_api_rejeita_timezone_invalido():
    _, auth, _, _, _, usuario = preparar_ambiente()

    with pytest.raises(HTTPException) as erro:
        alterar_timezone(
            TimezonePayload(timezone="Timezone/Invalido"),
            usuario=usuario,
            auth_service=auth,
        )

    assert erro.value.status_code == 400
    assert "Timezone inválido" in erro.value.detail


def test_soldado_nao_pode_concluir_missao_vencida():
    repo, auth, missoes, _, usuario_dict, usuario = preparar_ambiente()
    criar_missao(
        MissaoCreatePayload(
            titulo="Missão vencida",
            prioridade=1,
            prazo="01-01-2020",
            instrucao="Executar operação",
            responsavel_id=usuario_dict["id"],
        ),
        usuario=usuario,
        missao_service=missoes,
    )
    usuario.definir_modo("soldier")
    auth.alterar_modo(usuario.usuario_id, "soldier")

    try:
        missoes.concluir_missao(1, usuario=usuario)
    except ValueError as erro:
        assert "fora do prazo" in str(erro)
    else:
        raise AssertionError("A conclusão da missão vencida deveria falhar.")

    resposta = listar_missoes(usuario=usuario, missao_service=missoes)
    assert resposta[0]["status"] == "Falha aguardando justificativa"
    assert resposta[0]["failure_reason"] is None
    assert_mission_contract(resposta[0])


def test_api_retorna_403_quando_soldado_tenta_criar_missao():
    _, auth, missoes, _, usuario_dict, usuario = preparar_ambiente()
    usuario.definir_modo("soldier")
    auth.alterar_modo(usuario.usuario_id, "soldier")

    try:
        criar_missao(
            MissaoCreatePayload(
                titulo="Missão bloqueada",
                prioridade=1,
                prazo="24-04-2026",
                instrucao="Executar operação",
                responsavel_id=usuario_dict["id"],
            ),
            usuario=usuario,
            missao_service=missoes,
        )
    except HTTPException as erro:
        assert erro.status_code == 403
    else:
        raise AssertionError("Criar missão em modo Soldier deveria retornar 403.")


def test_soldado_pode_justificar_e_general_revisar():
    repo, auth, missoes, _, usuario_dict, usuario = preparar_ambiente()
    criar_missao(
        MissaoCreatePayload(
            titulo="Missão vencida",
            prioridade=1,
            prazo="01-01-2020",
            instrucao="Executar operação",
            responsavel_id=usuario_dict["id"],
        ),
        usuario=usuario,
        missao_service=missoes,
    )
    usuario.definir_modo("soldier")
    auth.alterar_modo(usuario.usuario_id, "soldier")

    try:
        missoes.concluir_missao(1, usuario=usuario)
    except ValueError:
        pass

    justificativa = justificar_missao(
        1,
        SoldierExcusePayload(reason="Perdi a janela por atraso externo."),
        usuario=usuario,
        missao_service=missoes,
    )
    assert_mission_contract(justificativa)
    assert justificativa["status"] == "Falha justificada aguardando revisão"
    assert justificativa["status_code"] == "FALHA_JUSTIFICADA_PENDENTE_REVISAO"
    assert justificativa["status_label"] == "Falha justificada aguardando revisão"
    assert justificativa["permissions"]["can_justify"] is False
    assert justificativa["permissions"]["can_review"] is False

    usuario.definir_modo("general")
    repo.atualizar_modo_ativo(usuario.usuario_id, "general")
    revisoes = listar_missoes_em_revisao(usuario=usuario, missao_service=missoes)
    assert [item["id"] for item in revisoes] == [1]
    assert_mission_contract(revisoes[0])
    assert revisoes[0]["permissions"]["can_review"] is True

    resposta = revisar_justificativa(
        1,
        RevisaoJustificativaPayload(accepted=True),
        usuario=usuario,
        missao_service=missoes,
    )
    assert_mission_contract(resposta)
    assert resposta["status"] == "Falha revisada"
    assert resposta["status_code"] == "FALHA_REVISADA"
    assert resposta["general_verdict"] == "accepted"
    assert resposta["permissions"]["can_edit"] is False
    assert resposta["permissions"]["can_delete"] is False
    assert resposta["permissions"]["can_toggle_decided"] is False


def test_rota_justification_persiste_tipo_e_texto_da_justificativa():
    _, auth, missoes, _, usuario_dict, usuario = preparar_ambiente()
    criar_missao(
        MissaoCreatePayload(
            titulo="Missão vencida tipificada",
            prioridade=1,
            prazo="01-01-2020",
            instrucao="Executar operação",
            responsavel_id=usuario_dict["id"],
        ),
        usuario=usuario,
        missao_service=missoes,
    )
    usuario.definir_modo("soldier")
    auth.alterar_modo(usuario.usuario_id, "soldier")

    try:
        concluir_missao(1, usuario=usuario, missao_service=missoes)
    except HTTPException:
        pass

    resposta = registrar_justificativa_falha(
        1,
        FailureJustificationPayload(
            failure_reason_type="done_not_marked",
            failure_reason="Executei, mas não registrei no prazo.",
        ),
        usuario=usuario,
        missao_service=missoes,
    )
    recarregada = missoes.buscar_por_id(1)

    assert resposta["status_code"] == "FALHA_JUSTIFICADA_PENDENTE_REVISAO"
    assert resposta["failure_reason_type"] == "done_not_marked"
    assert resposta["failure_reason"] == "Executei, mas não registrei no prazo."
    assert resposta["completed_at"] is None
    assert recarregada.failure_reason_type.value == "done_not_marked"
    assert recarregada.completed_at is None


def test_fluxo_lifecycle_expirada_justificada_revisada_reflete_no_relatorio():
    _, auth, missoes, relatorios, usuario_dict, usuario = preparar_ambiente()
    criar_missao(
        MissaoCreatePayload(
            titulo="Fluxo completo",
            prioridade=1,
            prazo="01-01-2020",
            instrucao="Executar operação",
            responsavel_id=usuario_dict["id"],
        ),
        usuario=usuario,
        missao_service=missoes,
    )

    usuario.definir_modo("soldier")
    auth.alterar_modo(usuario.usuario_id, "soldier")
    try:
        concluir_missao(1, usuario=usuario, missao_service=missoes)
    except HTTPException as erro:
        assert erro.status_code == 400
        assert "fora do prazo" in erro.detail
    else:
        raise AssertionError("Missão expirada não deveria permitir conclusão.")

    justificativa = justificar_missao(
        1,
        SoldierExcusePayload(reason="Perdi a janela por bloqueio externo."),
        usuario=usuario,
        missao_service=missoes,
    )
    assert justificativa["status_code"] == "FALHA_JUSTIFICADA_PENDENTE_REVISAO"
    assert justificativa["failure_reason"] == "Perdi a janela por bloqueio externo."

    usuario.definir_modo("general")
    auth.liberar_general(usuario.usuario_id, "segredo123")
    revisao = revisar_justificativa(
        1,
        RevisaoJustificativaPayload(accepted=False),
        usuario=usuario,
        missao_service=missoes,
    )
    assert revisao["status_code"] == "FALHA_REVISADA"
    assert revisao["general_verdict"] == "rejected"

    relatorio = obter_relatorio_semanal(
        start_date="2026-04-20",
        end_date="2026-04-26",
        usuario=usuario,
        relatorio_service=relatorios,
    )
    assert relatorio["total_missions"] == 1
    assert relatorio["failed_missions"] == 1
    assert relatorio["reviewed_failures"] == 1
    assert relatorio["failure_reasons"] == ["Perdi a janela por bloqueio externo."]


def test_listagem_operacional_nao_retorna_concluidas_ou_falhas_revisadas():
    repo, _, missoes, _, usuario_dict, usuario = preparar_ambiente()
    repo.missoes = [
        Missao(
            missao_id=1,
            titulo="Pendente",
            prioridade=1,
            prazo="30-04-2099",
            instrucao="Executar",
            status=StatusMissao.PENDENTE,
            user_id=usuario.usuario_id,
        ),
        Missao(
            missao_id=2,
            titulo="Concluída",
            prioridade=1,
            prazo="22-04-2026",
            instrucao="Executar",
            status=StatusMissao.CONCLUIDA,
            completed_at=datetime(2026, 4, 22, 10, 0, 0),
            user_id=usuario.usuario_id,
        ),
        Missao(
            missao_id=3,
            titulo="Falha revisada",
            prioridade=1,
            prazo="23-04-2026",
            instrucao="Executar",
            status=StatusMissao.FALHA_REVISADA,
            failed_at=datetime(2026, 4, 23, 10, 0, 0),
            failure_reason="Falhou.",
            general_verdict="accepted",
            user_id=usuario.usuario_id,
        ),
    ]
    repo.contextos = {
        1: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
        2: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
        3: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
    }

    resposta = listar_missoes(usuario=usuario, missao_service=missoes)

    assert [missao["id"] for missao in resposta] == [1]
    assert_mission_contract(resposta[0])
    assert resposta[0]["permissions"]["can_edit"] is True
    assert resposta[0]["permissions"]["can_complete"] is False


def test_missoes_operacionais_repete_a_mesma_listagem_de_missoes():
    repo, _, missoes, _, usuario_dict, usuario = preparar_ambiente()
    repo.missoes = [
        Missao(
            missao_id=1,
            titulo="Pendente",
            prioridade=1,
            prazo="30-04-2099",
            instrucao="Executar",
            status=StatusMissao.PENDENTE,
            user_id=usuario.usuario_id,
        ),
        Missao(
            missao_id=2,
            titulo="Falha revisada",
            prioridade=1,
            prazo="23-04-2026",
            instrucao="Executar",
            status=StatusMissao.FALHA_REVISADA,
            failed_at=datetime(2026, 4, 23, 10, 0, 0),
            failure_reason="Falhou.",
            general_verdict="accepted",
            user_id=usuario.usuario_id,
        ),
    ]
    repo.contextos = {
        1: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
        2: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
    }

    resposta_legacy = listar_missoes(usuario=usuario, missao_service=missoes)
    resposta_operacional = listar_missoes_operacionais(usuario=usuario, missao_service=missoes)

    assert resposta_operacional == resposta_legacy
    assert_mission_contract(resposta_operacional[0])


def test_listagem_soldado_retorna_apenas_executaveis_ou_justificaveis():
    repo, auth, missoes, _, usuario_dict, usuario = preparar_ambiente()
    repo.missoes = [
        Missao(
            missao_id=1,
            titulo="Pendente de hoje",
            prioridade=1,
            prazo="24-04-2026",
            instrucao="Executar",
            status=StatusMissao.PENDENTE,
            user_id=usuario.usuario_id,
        ),
        Missao(
            missao_id=2,
            titulo="Futura",
            prioridade=1,
            prazo="30-04-2099",
            instrucao="Executar",
            status=StatusMissao.PENDENTE,
            user_id=usuario.usuario_id,
        ),
        Missao(
            missao_id=3,
            titulo="Aguardando revisão",
            prioridade=1,
            prazo="23-04-2026",
            instrucao="Executar",
            status=StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO,
            failed_at=datetime(2026, 4, 23, 10, 0, 0),
            failure_reason="Falhou.",
            user_id=usuario.usuario_id,
        ),
        Missao(
            missao_id=4,
            titulo="Falha para justificar",
            prioridade=1,
            prazo="01-01-2020",
            instrucao="Executar",
            status=StatusMissao.FALHA_PENDENTE_JUSTIFICATIVA,
            failed_at=datetime(2026, 4, 23, 10, 0, 0),
            user_id=usuario.usuario_id,
        ),
    ]
    repo.contextos = {
        1: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
        2: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
        3: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
        4: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
    }
    usuario.definir_modo("soldier")
    auth.alterar_modo(usuario.usuario_id, "soldier")

    resposta = listar_missoes(usuario=usuario, missao_service=missoes)

    assert [missao["id"] for missao in resposta] == [4, 1]
    assert all(assert_mission_contract(missao) is None for missao in resposta)
    assert resposta[0]["permissions"]["can_justify"] is True
    assert resposta[0]["permissions"]["can_complete"] is False
    assert resposta[1]["permissions"]["can_complete"] is True
    assert resposta[1]["permissions"]["can_edit"] is False


def test_api_retorna_400_para_revisao_em_estado_invalido():
    _, _, missoes, _, usuario_dict, usuario = preparar_ambiente()
    criar_missao(
        MissaoCreatePayload(
            titulo="Missão ainda pendente",
            prioridade=1,
            prazo="30-04-2099",
            instrucao="Executar operação",
            responsavel_id=usuario_dict["id"],
        ),
        usuario=usuario,
        missao_service=missoes,
    )

    try:
        revisar_justificativa(
            1,
            RevisaoJustificativaPayload(accepted=True),
            usuario=usuario,
            missao_service=missoes,
        )
    except HTTPException as erro:
        assert erro.status_code == 400
    else:
        raise AssertionError("Revisão fora do estado correto deveria retornar 400.")


def test_general_pode_reabrir_missao_concluida():
    _, auth, missoes, _, usuario_dict, usuario = preparar_ambiente()
    criar_missao(
        MissaoCreatePayload(
            titulo="Missão concluível",
            prioridade=1,
            prazo="30-04-2099",
            instrucao="Executar operação",
            responsavel_id=usuario_dict["id"],
        ),
        usuario=usuario,
        missao_service=missoes,
    )

    usuario.definir_modo("soldier")
    auth.alterar_modo(usuario.usuario_id, "soldier")
    missoes.concluir_missao(1, usuario=usuario)

    usuario.definir_modo("general")
    auth.liberar_general(usuario.usuario_id, "segredo123")
    resposta = editar_missao(
        1,
        MissaoUpdatePayload(
            titulo="Missão concluível",
            prioridade=1,
            prazo="30-04-2099",
            instrucao="Executar operação",
            status="Pendente",
        ),
        usuario=usuario,
        missao_service=missoes,
    )

    assert_mission_contract(resposta)
    assert resposta["status"] == "Pendente"
    assert resposta["completed_at"] is None
    assert resposta["permissions"]["can_edit"] is True


def test_api_bloqueia_status_de_execucao_por_edicao():
    _, _, missoes, _, usuario_dict, usuario = preparar_ambiente()
    criar_missao(
        MissaoCreatePayload(
            titulo="Missão protegida",
            prioridade=1,
            prazo="30-04-2099",
            instrucao="Executar operação",
            responsavel_id=usuario_dict["id"],
        ),
        usuario=usuario,
        missao_service=missoes,
    )

    try:
        editar_missao(
            1,
            MissaoUpdatePayload(status="Falha revisada"),
            usuario=usuario,
            missao_service=missoes,
        )
    except HTTPException as erro:
        assert erro.status_code == 400
        assert "Transições de execução" in erro.detail
    else:
        raise AssertionError("Edição direta de status de execução deveria retornar 400.")


def test_historico_de_missoes_retorna_apenas_finalizadas():
    repo, _, missoes, _, usuario_dict, usuario = preparar_ambiente()
    repo.missoes = [
        Missao(
            missao_id=1,
            titulo="Concluída",
            prioridade=1,
            prazo="22-04-2026",
            instrucao="Executar",
            status=StatusMissao.CONCLUIDA,
            completed_at=datetime(2026, 4, 22, 10, 0, 0),
            user_id=usuario.usuario_id,
        ),
        Missao(
            missao_id=2,
            titulo="Falha revisada",
            prioridade=1,
            prazo="23-04-2026",
            instrucao="Executar",
            status=StatusMissao.FALHA_REVISADA,
            failed_at=datetime(2026, 4, 23, 10, 0, 0),
            failure_reason="Falhou.",
            general_verdict="accepted",
            user_id=usuario.usuario_id,
        ),
        Missao(
            missao_id=3,
            titulo="Pendente",
            prioridade=1,
            prazo="30-04-2099",
            instrucao="Executar",
            status=StatusMissao.PENDENTE,
            user_id=usuario.usuario_id,
        ),
    ]
    repo.contextos = {
        1: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
        2: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
        3: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
    }

    resposta = listar_missoes_historicas(usuario=usuario, missao_service=missoes)

    assert [missao["id"] for missao in resposta] == [1, 2]
    assert all(assert_mission_contract(missao) is None for missao in resposta)
    assert all(missao["permissions"]["can_view_history"] is True for missao in resposta)
    assert all(missao["permissions"]["can_delete"] is False for missao in resposta)


def test_historico_de_missoes_bloqueado_no_modo_soldado():
    _, auth, missoes, _, _, usuario = preparar_ambiente()
    usuario.definir_modo("soldier")
    auth.alterar_modo(usuario.usuario_id, "soldier")

    try:
        listar_missoes_historicas(usuario=usuario, missao_service=missoes)
    except HTTPException as erro:
        assert erro.status_code == 403
    else:
        raise AssertionError("Histórico de missões em modo Soldier deveria retornar 403.")


def test_historico_unitario_bloqueado_no_modo_soldado():
    _, auth, missoes, _, usuario_dict, usuario = preparar_ambiente()
    criar_missao(
        MissaoCreatePayload(
            titulo="Missão com histórico",
            prioridade=1,
            prazo="30-04-2099",
            instrucao="Executar operação",
            responsavel_id=usuario_dict["id"],
        ),
        usuario=usuario,
        missao_service=missoes,
    )
    usuario.definir_modo("soldier")
    auth.alterar_modo(usuario.usuario_id, "soldier")

    try:
        listar_historico(1, usuario=usuario, missao_service=missoes)
    except HTTPException as erro:
        assert erro.status_code == 403
    else:
        raise AssertionError("Histórico unitário em modo Soldier deveria retornar 403.")


def test_nome_do_general_bloqueado_no_modo_soldado():
    _, auth, _, _, _, usuario = preparar_ambiente()
    usuario.definir_modo("soldier")
    auth.alterar_modo(usuario.usuario_id, "soldier")

    try:
        definir_nome_general(
            NomeGeneralPayload(nome_general="General Atlas"),
            usuario=usuario,
            auth_service=auth,
        )
    except HTTPException as erro:
        assert erro.status_code == 403
    else:
        raise AssertionError("Nome do General em modo Soldier deveria retornar 403.")


def test_usuario_nao_afeta_missao_de_outro_usuario():
    repo = RepositorioV2Fake()
    auth = AuthService(repo)
    missoes = MissaoService(repo)

    registrar_usuario(
        RegistroPayload(usuario="Henrique", email="henrique@email.com", senha="segredo123"),
        auth_service=auth,
    )
    registrar_usuario(
        RegistroPayload(usuario="Maria", email="maria@email.com", senha="segredo123"),
        auth_service=auth,
    )
    usuario_1 = auth.obter_usuario_por_token(
        login(LoginPayload(email="henrique@email.com", senha="segredo123"), auth_service=auth)["access_token"]
    )
    usuario_2 = auth.obter_usuario_por_token(
        login(LoginPayload(email="maria@email.com", senha="segredo123"), auth_service=auth)["access_token"]
    )

    criar_missao(
        MissaoCreatePayload(
            titulo="Missão privada",
            prioridade=1,
            prazo="30-04-2099",
            instrucao="Executar operação",
            responsavel_id=usuario_1.usuario_id,
        ),
        usuario=usuario_1,
        missao_service=missoes,
    )
    usuario_2.definir_modo("soldier")
    auth.alterar_modo(usuario_2.usuario_id, "soldier")

    try:
        missoes.concluir_missao(1, usuario=usuario_2)
    except Exception as erro:
        assert type(erro).__name__ == "MissaoNaoEncontrada"
    else:
        raise AssertionError("O segundo usuário não deveria alterar missão alheia.")


def test_relatorio_semanal_retorna_payload_esperado():
    repo, _, _, relatorios, usuario_dict, usuario = preparar_ambiente()
    repo.missoes = [
        Missao(
            missao_id=1,
            titulo="Concluir relatório",
            prioridade=1,
            prazo="22-04-2026",
            instrucao="Entregar versão final",
            status=StatusMissao.CONCLUIDA,
            completed_at=datetime(2026, 4, 22, 10, 0, 0),
            created_at=datetime(2026, 4, 21, 8, 0, 0),
            user_id=usuario.usuario_id,
        ),
        Missao(
            missao_id=2,
            titulo="Missão falha",
            prioridade=1,
            prazo="23-04-2026",
            instrucao="Executar",
            status=StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO,
            created_at=datetime(2026, 4, 22, 8, 0, 0),
            failed_at=datetime(2026, 4, 23, 12, 0, 0),
            failure_reason="Perdi o prazo por bloqueio externo.",
            user_id=usuario.usuario_id,
            is_decided=True,
        ),
    ]
    repo.contextos = {
        1: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
        2: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
    }

    payload = obter_relatorio_semanal(
        start_date="2026-04-20",
        end_date="2026-04-26",
        usuario=usuario,
        relatorio_service=relatorios,
    )

    assert payload["total_missions"] == 2
    assert payload["completed_missions"] == 1
    assert payload["completion_rate"] == 50.0
    assert payload["committed_missions_failed"] == 1
    assert payload["missions_waiting_justification"] == 0
    assert payload["missions_waiting_review"] == 1
    assert payload["failure_reasons"] == ["Perdi o prazo por bloqueio externo."]


def test_criar_missao_retorna_contrato_completo():
    _, _, missoes, _, usuario_dict, usuario = preparar_ambiente()

    resposta = criar_missao(
        MissaoCreatePayload(
            titulo="Criar contrato",
            prioridade=1,
            prazo="30-04-2099",
            instrucao="Executar operação",
            responsavel_id=usuario_dict["id"],
        ),
        usuario=usuario,
        missao_service=missoes,
    )

    assert_mission_contract(resposta)


def test_concluir_missao_retorna_contrato_completo():
    _, auth, missoes, _, usuario_dict, usuario = preparar_ambiente()
    criar_missao(
        MissaoCreatePayload(
            titulo="Concluir contrato",
            prioridade=1,
            prazo="30-04-2099",
            instrucao="Executar operação",
            responsavel_id=usuario_dict["id"],
        ),
        usuario=usuario,
        missao_service=missoes,
    )
    usuario.definir_modo("soldier")
    auth.alterar_modo(usuario.usuario_id, "soldier")

    resposta = concluir_missao(
        1,
        usuario=usuario,
        missao_service=missoes,
    )

    assert_mission_contract(resposta)
    assert resposta["status_code"] == "CONCLUIDA"


def test_relatorio_semanal_retorna_403_em_modo_soldado():
    _, auth, _, relatorios, _, usuario = preparar_ambiente()
    usuario.definir_modo("soldier")
    auth.alterar_modo(usuario.usuario_id, "soldier")

    try:
        obter_relatorio_semanal(
            start_date="2026-04-20",
            end_date="2026-04-26",
            usuario=usuario,
            relatorio_service=relatorios,
        )
    except HTTPException as erro:
        assert erro.status_code == 403
    else:
        raise AssertionError("Relatório semanal em modo Soldier deveria retornar 403.")


def test_relatorio_semanal_retorna_400_para_intervalo_invertido():
    _, _, _, relatorios, _, usuario = preparar_ambiente()

    try:
        obter_relatorio_semanal(
            start_date="2026-04-26",
            end_date="2026-04-20",
            usuario=usuario,
            relatorio_service=relatorios,
        )
    except HTTPException as erro:
        assert erro.status_code == 400
        assert "Intervalo semanal inválido" in erro.detail
    else:
        raise AssertionError("Intervalo invertido deveria retornar erro HTTP 400.")


def test_relatorio_semanal_valida_formato_de_data():
    _, _, _, relatorios, _, usuario = preparar_ambiente()

    try:
        obter_relatorio_semanal(
            start_date="20-04-2026",
            end_date="2026-04-26",
            usuario=usuario,
            relatorio_service=relatorios,
        )
    except HTTPException as erro:
        assert erro.status_code == 400
        assert "YYYY-MM-DD" in erro.detail
    else:
        raise AssertionError("Datas inválidas deveriam retornar erro HTTP 400.")
