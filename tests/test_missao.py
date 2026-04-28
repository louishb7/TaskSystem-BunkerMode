from datetime import datetime

import pytest

from missao import Missao, PrioridadeMissao, StatusMissao


@pytest.fixture
def missao_base():
    return Missao(
        missao_id=1,
        titulo="Treinar",
        prioridade=1,
        prazo="30-04-2099",
        instrucao="Treinar pesado",
    )


def test_criar_missao_valida():
    missao = Missao(
        missao_id=1,
        titulo="Treinar",
        prioridade=1,
        prazo="10-04-2026",
        instrucao="Treinar pesado",
        user_id=7,
    )

    assert missao.missao_id == 1
    assert missao.titulo == "Treinar"
    assert missao.prioridade == PrioridadeMissao.ALTA
    assert missao.prazo == "10-04-2026"
    assert missao.instrucao == "Treinar pesado"
    assert missao.status == StatusMissao.PENDENTE
    assert missao.is_decided is False
    assert missao.created_at is not None
    assert missao.completed_at is None
    assert missao.failure_reason is None
    assert missao.user_id == 7


@pytest.mark.parametrize("id_invalido", [0, -1, "1", 1.5])
def test_id_invalido(id_invalido):
    with pytest.raises(ValueError):
        Missao(
            missao_id=id_invalido,
            titulo="Teste",
            prioridade=1,
            prazo="10-04-2026",
            instrucao="Missão inválida",
        )


@pytest.mark.parametrize("titulo_invalido", ["", "   ", None, 123])
def test_titulo_invalido(titulo_invalido):
    with pytest.raises(ValueError):
        Missao(
            missao_id=1,
            titulo=titulo_invalido,
            prioridade=1,
            prazo="10-04-2026",
            instrucao="Missão inválida",
        )


@pytest.mark.parametrize("instrucao_invalida", ["", "   ", None, 123])
def test_instrucao_invalida(instrucao_invalida):
    with pytest.raises(ValueError):
        Missao(
            missao_id=1,
            titulo="Teste",
            prioridade=1,
            prazo="10-04-2026",
            instrucao=instrucao_invalida,
        )


@pytest.mark.parametrize("prioridade_invalida", [10, 0, -1, "alta", None])
def test_prioridade_invalida(prioridade_invalida):
    with pytest.raises(ValueError):
        Missao(
            missao_id=1,
            titulo="Teste",
            prioridade=prioridade_invalida,
            prazo="10-04-2026",
            instrucao="Missão inválida",
        )


@pytest.mark.parametrize("status_invalido", ["invalido", 1, None, object()])
def test_status_invalido(status_invalido):
    with pytest.raises(ValueError):
        Missao(
            missao_id=1,
            titulo="Teste",
            prioridade=1,
            prazo="10-04-2026",
            instrucao="Status inválido",
            status=status_invalido,
        )


def test_status_legado_e_aceito_como_pendente():
    missao = Missao(
        missao_id=1,
        titulo="Teste",
        prioridade=1,
        prazo="10-04-2026",
        instrucao="Status legado",
        status="Aguardando Recruta!",
    )

    assert missao.status == StatusMissao.PENDENTE


def test_estado_em_revisao_exige_justificativa():
    with pytest.raises(ValueError, match="justificativa do Soldado"):
        Missao(
            missao_id=1,
            titulo="Falha sem motivo",
            prioridade=1,
            prazo="01-01-2020",
            instrucao="Executar",
            status=StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO,
            failed_at=datetime(2026, 4, 24, 10, 0, 0),
        )


def test_falha_revisada_exige_justificativa_e_veredito():
    with pytest.raises(ValueError, match="justificativa do Soldado"):
        Missao(
            missao_id=1,
            titulo="Revisada sem motivo",
            prioridade=1,
            prazo="01-01-2020",
            instrucao="Executar",
            status=StatusMissao.FALHA_REVISADA,
            failed_at=datetime(2026, 4, 24, 10, 0, 0),
            general_verdict="accepted",
        )

    with pytest.raises(ValueError, match="resultado da revisão"):
        Missao(
            missao_id=1,
            titulo="Revisada sem veredito",
            prioridade=1,
            prazo="01-01-2020",
            instrucao="Executar",
            status=StatusMissao.FALHA_REVISADA,
            failed_at=datetime(2026, 4, 24, 10, 0, 0),
            failure_reason="Falhou.",
        )


def test_atualizar_status_nao_cria_estado_parcial_de_revisao(missao_base):
    with pytest.raises(ValueError, match="justificativa do Soldado"):
        missao_base.atualizar_status(StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO)

    assert missao_base.status == StatusMissao.PENDENTE


def test_concluir_missao_define_completed_at(missao_base):
    instante = datetime(2026, 4, 24, 8, 30, 0)

    missao_base.concluir(instante=instante)

    assert missao_base.status == StatusMissao.CONCLUIDA
    assert missao_base.completed_at == instante
    assert missao_base.failure_reason is None


def test_nao_permitir_concluir_missao_vencida():
    missao = Missao(
        missao_id=1,
        titulo="Treinar",
        prioridade=1,
        prazo="01-01-2020",
        instrucao="Treinar pesado",
    )

    with pytest.raises(ValueError, match="Missão vencida exige justificativa"):
        missao.concluir(referencia=datetime(2026, 4, 24).date())


def test_marcar_como_falha_move_para_fluxo_de_justificativa(missao_base):
    missao_base.marcar_como_falha(instante=datetime(2026, 4, 24, 9, 0, 0))

    assert missao_base.status == StatusMissao.FALHA_PENDENTE_JUSTIFICATIVA
    assert missao_base.failed_at == datetime(2026, 4, 24, 9, 0, 0)
    assert missao_base.failure_reason is None


def test_justificativa_move_para_revisao(missao_base):
    missao_base.marcar_como_falha()

    missao_base.registrar_justificativa_soldado(
        "Perdi a janela por consulta médica.",
        tipo="external_blocker",
    )

    assert missao_base.status == StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO
    assert missao_base.failure_reason_type.value == "external_blocker"
    assert missao_base.failure_reason == "Perdi a janela por consulta médica."


def test_tipo_done_not_marked_nao_conclui_missao(missao_base):
    missao_base.marcar_como_falha()

    missao_base.registrar_justificativa_soldado(
        "Executei, mas não registrei dentro da janela.",
        tipo="done_not_marked",
    )

    assert missao_base.status == StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO
    assert missao_base.completed_at is None
    assert missao_base.failure_reason_type.value == "done_not_marked"


def test_tipo_de_justificativa_invalido_e_rejeitado(missao_base):
    missao_base.marcar_como_falha()

    with pytest.raises(ValueError, match="Tipo da justificativa"):
        missao_base.registrar_justificativa_soldado(
            "Motivo inválido.",
            tipo="motivo_inexistente",
        )


def test_revisao_do_general_encerra_falha(missao_base):
    missao_base.marcar_como_falha()
    missao_base.registrar_justificativa_soldado("Houve bloqueio externo.")

    missao_base.registrar_veredito_general("accepted")

    assert missao_base.status == StatusMissao.FALHA_REVISADA
    assert missao_base.general_verdict == "accepted"


def test_helpers_de_estado_refletem_ciclo_da_missao():
    pendente = Missao(
        missao_id=1,
        titulo="Pendente",
        prioridade=1,
        prazo="30-04-2099",
        instrucao="Executar",
    )
    aguardando_justificativa = Missao(
        missao_id=2,
        titulo="Falha",
        prioridade=1,
        prazo="01-01-2020",
        instrucao="Executar",
        status=StatusMissao.FALHA_PENDENTE_JUSTIFICATIVA,
        failed_at=datetime(2026, 4, 24, 10, 0, 0),
    )
    aguardando_revisao = Missao(
        missao_id=3,
        titulo="Falha justificada",
        prioridade=1,
        prazo="01-01-2020",
        instrucao="Executar",
        status=StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO,
        failed_at=datetime(2026, 4, 24, 10, 0, 0),
        failure_reason="Perdi a janela.",
    )
    falha_revisada = Missao(
        missao_id=4,
        titulo="Falha revisada",
        prioridade=1,
        prazo="01-01-2020",
        instrucao="Executar",
        status=StatusMissao.FALHA_REVISADA,
        failed_at=datetime(2026, 4, 24, 10, 0, 0),
        failure_reason="Perdi a janela.",
        general_verdict="accepted",
    )

    assert pendente.is_pending() is True
    assert pendente.is_operational() is True
    assert pendente.is_finalized() is False
    assert pendente.can_be_marked_decided() is True

    assert aguardando_justificativa.requires_soldier_justification() is True
    assert aguardando_justificativa.is_operational() is True
    assert aguardando_justificativa.can_be_marked_decided() is False

    assert aguardando_revisao.requires_general_review() is True
    assert aguardando_revisao.is_operational() is False
    assert aguardando_revisao.is_finalized() is False

    assert falha_revisada.is_failed_reviewed() is True
    assert falha_revisada.is_finalized() is True
    assert falha_revisada.is_operational() is False
    assert falha_revisada.can_be_edited_by_general() is False


def test_to_dict_expoe_status_canonico_e_permissions_padrao(missao_base):
    payload = missao_base.to_dict()

    assert payload["status"] == "Pendente"
    assert payload["status_code"] == "PENDENTE"
    assert payload["status_label"] == "Pendente"
    assert payload["failure_reason_type"] is None
    assert payload["requires_immediate_justification"] is False
    assert payload["has_pending_non_blocking_justification"] is False
    assert payload["permissions"] == {
        "can_complete": False,
        "can_edit": False,
        "can_delete": False,
        "can_toggle_decided": False,
        "can_justify": False,
        "can_review": False,
        "can_view_history": False,
    }


def test_missao_concluida_e_finalizada():
    missao = Missao(
        missao_id=1,
        titulo="Treinar",
        prioridade=1,
        prazo="30-04-2099",
        instrucao="Treinar pesado",
        status=StatusMissao.CONCLUIDA,
        completed_at=datetime(2026, 4, 24, 10, 0, 0),
    )

    assert missao.is_completed() is True
    assert missao.is_finalized() is True
    assert missao.is_operational() is False


def test_aliases_em_portugues_refletem_regras_de_dominio():
    missao = Missao(
        missao_id=1,
        titulo="Treinar",
        prioridade=1,
        prazo="30-04-2099",
        instrucao="Treinar pesado",
    )

    assert missao.is_pendente() is True
    assert missao.is_operacional() is True
    assert missao.is_finalizada() is False
    assert missao.pode_ser_concluida() is True

    missao.marcar_como_falha()

    assert missao.is_falhada() is True
    assert missao.pode_ser_justificada() is True


def test_completed_e_failed_reviewed_nao_sao_operacionais():
    concluida = Missao(
        missao_id=1,
        titulo="Concluída",
        prioridade=1,
        prazo="30-04-2099",
        instrucao="Executar",
        status=StatusMissao.CONCLUIDA,
        completed_at=datetime(2026, 4, 24, 10, 0, 0),
    )
    revisada = Missao(
        missao_id=2,
        titulo="Falha revisada",
        prioridade=1,
        prazo="01-01-2020",
        instrucao="Executar",
        status=StatusMissao.FALHA_REVISADA,
        failed_at=datetime(2026, 4, 24, 10, 0, 0),
        failure_reason="Falhou.",
        general_verdict="accepted",
    )

    assert concluida.is_operational() is False
    assert revisada.is_operational() is False
    assert revisada.can_be_deleted_by_general() is False


def test_reabrir_missao_limpa_estado_de_conclusao():
    missao = Missao(
        missao_id=1,
        titulo="Treinar",
        prioridade=1,
        prazo="30-04-2099",
        instrucao="Treinar pesado",
        status=StatusMissao.CONCLUIDA,
        completed_at=datetime(2026, 4, 24, 10, 0, 0),
    )

    missao.reabrir()

    assert missao.status == StatusMissao.PENDENTE
    assert missao.completed_at is None
    assert missao.failed_at is None
    assert missao.failure_reason is None


def test_alternar_decisao():
    missao = Missao(
        missao_id=1,
        titulo="Treinar",
        prioridade=1,
        prazo="10-04-2026",
        instrucao="Treinar pesado",
    )

    missao.alternar_decisao()
    assert missao.is_decided is True

    missao.alternar_decisao()
    assert missao.is_decided is False
