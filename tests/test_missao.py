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

    missao_base.registrar_justificativa_soldado("Perdi a janela por consulta médica.")

    assert missao_base.status == StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO
    assert missao_base.failure_reason == "Perdi a janela por consulta médica."


def test_revisao_do_general_encerra_falha(missao_base):
    missao_base.marcar_como_falha()
    missao_base.registrar_justificativa_soldado("Houve bloqueio externo.")

    missao_base.registrar_veredito_general("accepted")

    assert missao_base.status == StatusMissao.FALHA_REVISADA
    assert missao_base.general_verdict == "accepted"


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
