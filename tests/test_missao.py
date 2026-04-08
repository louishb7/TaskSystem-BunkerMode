import pytest
from missao import Missao, StatusMissao, PrioridadeMissao


def test_criar_missao_valida():
    missao = Missao(
        id=1,
        titulo="Treinar",
        prioridade=1,
        prazo="10-04-2026",
        instrucao="Treinar pesado",
    )

    assert missao.id == 1
    assert missao.titulo == "Treinar"
    assert missao.prioridade == PrioridadeMissao.ALTA
    assert missao.prazo == "10-04-2026"
    assert missao.instrucao == "Treinar pesado"
    assert missao.status == StatusMissao.PENDENTE


def test_prioridade_invalida():
    with pytest.raises(ValueError):
        Missao(
            id=1,
            titulo="Teste",
            prioridade=10,
            prazo="10-04-2026",
            instrucao="Missão inválida",
        )


def test_prazo_invalido():
    with pytest.raises(ValueError):
        Missao(
            id=1,
            titulo="Estudar",
            prioridade=1,
            prazo="2026-04-10",
            instrucao="Formato incorreto",
        )


def test_concluir_missao():
    missao = Missao(
        id=1,
        titulo="Ler",
        prioridade=2,
        prazo="10-04-2026",
        instrucao="Ler 20 páginas",
    )

    missao.concluir()

    assert missao.status == StatusMissao.CONCLUIDA


def test_nao_permitir_concluir_missao_ja_concluida():
    missao = Missao(
        id=1,
        titulo="Escrever",
        prioridade=1,
        prazo="10-04-2026",
        instrucao="Escrever capítulo",
    )

    missao.concluir()

    with pytest.raises(ValueError):
        missao.concluir()
