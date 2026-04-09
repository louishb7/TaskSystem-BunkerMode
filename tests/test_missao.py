import pytest

from missao import Missao, PrioridadeMissao, StatusMissao


@pytest.fixture
def missao_base():
    return Missao(
        id=1,
        titulo="Treinar",
        prioridade=1,
        prazo="10-04-2026",
        instrucao="Treinar pesado",
    )


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


@pytest.mark.parametrize("id_invalido", [0, -1, "1", 1.5, None])
def test_id_invalido(id_invalido):
    with pytest.raises(ValueError):
        Missao(
            id=id_invalido,
            titulo="Teste",
            prioridade=1,
            prazo="10-04-2026",
            instrucao="Missão inválida",
        )


@pytest.mark.parametrize("titulo_invalido", ["", "   ", None, 123])
def test_titulo_invalido(titulo_invalido):
    with pytest.raises(ValueError):
        Missao(
            id=1,
            titulo=titulo_invalido,
            prioridade=1,
            prazo="10-04-2026",
            instrucao="Missão inválida",
        )


@pytest.mark.parametrize("instrucao_invalida", ["", "   ", None, 123])
def test_instrucao_invalida(instrucao_invalida):
    with pytest.raises(ValueError):
        Missao(
            id=1,
            titulo="Teste",
            prioridade=1,
            prazo="10-04-2026",
            instrucao=instrucao_invalida,
        )


@pytest.mark.parametrize("prioridade_invalida", [10, 0, -1, "alta", None])
def test_prioridade_invalida(prioridade_invalida):
    with pytest.raises(ValueError):
        Missao(
            id=1,
            titulo="Teste",
            prioridade=prioridade_invalida,
            prazo="10-04-2026",
            instrucao="Missão inválida",
        )


def test_criar_missao_com_prioridade_enum():
    missao = Missao(
        id=1,
        titulo="Teste",
        prioridade=PrioridadeMissao.MEDIA,
        prazo="10-04-2026",
        instrucao="Missão válida",
    )

    assert missao.prioridade == PrioridadeMissao.MEDIA


@pytest.mark.parametrize("prazo_valido", [None, "10-04-2026"])
def test_prazo_valido(prazo_valido):
    missao = Missao(
        id=1,
        titulo="Estudar",
        prioridade=1,
        prazo=prazo_valido,
        instrucao="Formato correto",
    )

    assert missao.prazo == prazo_valido


@pytest.mark.parametrize(
    "prazo_invalido, erro_esperado",
    [
        ("2026-04-10", ValueError),
        ("31/12/2026", ValueError),
        ("texto", ValueError),
        (123, ValueError),
    ],
)
def test_prazo_invalido(prazo_invalido, erro_esperado):
    with pytest.raises(erro_esperado):
        Missao(
            id=1,
            titulo="Estudar",
            prioridade=1,
            prazo=prazo_invalido,
            instrucao="Formato incorreto",
        )


@pytest.mark.parametrize("status_invalido", ["invalido", 1, None, object()])
def test_status_invalido(status_invalido):
    with pytest.raises(ValueError):
        Missao(
            id=1,
            titulo="Teste",
            prioridade=1,
            prazo="10-04-2026",
            instrucao="Status inválido",
            status=status_invalido,
        )


def test_criar_missao_com_status_enum():
    missao = Missao(
        id=1,
        titulo="Teste",
        prioridade=1,
        prazo="10-04-2026",
        instrucao="Status válido",
        status=StatusMissao.CONCLUIDA,
    )

    assert missao.status == StatusMissao.CONCLUIDA


@pytest.mark.parametrize(
    ("prioridade", "descricao"),
    [
        (1, "Faça! Prioridade máxima."),
        (2, "Média prioridade."),
        (3, "Baixa prioridade."),
    ],
)
def test_descricao_prioridade(prioridade, descricao):
    missao = Missao(
        id=1,
        titulo="Teste",
        prioridade=prioridade,
        prazo="10-04-2026",
        instrucao="Descrição",
    )

    assert missao.descricao_prioridade() == descricao


def test_atualizar_titulo(missao_base):
    missao_base.atualizar_titulo("Novo título")
    assert missao_base.titulo == "Novo título"


@pytest.mark.parametrize("titulo_invalido", ["", "   ", None, 123])
def test_atualizar_titulo_invalido(missao_base, titulo_invalido):
    with pytest.raises(ValueError):
        missao_base.atualizar_titulo(titulo_invalido)


def test_atualizar_instrucao(missao_base):
    missao_base.atualizar_instrucao("Nova instrução")
    assert missao_base.instrucao == "Nova instrução"


@pytest.mark.parametrize("instrucao_invalida", ["", "   ", None, 123])
def test_atualizar_instrucao_invalida(missao_base, instrucao_invalida):
    with pytest.raises(ValueError):
        missao_base.atualizar_instrucao(instrucao_invalida)


def test_atualizar_prioridade(missao_base):
    missao_base.atualizar_prioridade(3)
    assert missao_base.prioridade == PrioridadeMissao.BAIXA


@pytest.mark.parametrize("prioridade_invalida", [10, 0, -1, "alta", None])
def test_atualizar_prioridade_invalida(missao_base, prioridade_invalida):
    with pytest.raises(ValueError):
        missao_base.atualizar_prioridade(prioridade_invalida)


def test_atualizar_prazo(missao_base):
    missao_base.atualizar_prazo("11-04-2026")
    assert missao_base.prazo == "11-04-2026"


@pytest.mark.parametrize("prazo", [None, "12-04-2026"])
def test_atualizar_prazo_valido(missao_base, prazo):
    missao_base.atualizar_prazo(prazo)
    assert missao_base.prazo == prazo


@pytest.mark.parametrize(
    "prazo_invalido, erro_esperado",
    [
        ("2026-04-11", ValueError),
        ("11/04/2026", ValueError),
        (123, ValueError),
    ],
)
def test_atualizar_prazo_invalido(missao_base, prazo_invalido, erro_esperado):
    with pytest.raises(erro_esperado):
        missao_base.atualizar_prazo(prazo_invalido)


def test_concluir_missao(missao_base):
    missao_base.concluir()
    assert missao_base.status == StatusMissao.CONCLUIDA


def test_nao_permitir_concluir_missao_ja_concluida(missao_base):
    missao_base.concluir()

    with pytest.raises(ValueError):
        missao_base.concluir()


def test_para_dict(missao_base):
    assert missao_base.para_dict() == {
        "id": 1,
        "titulo": "Treinar",
        "prioridade": 1,
        "prazo": "10-04-2026",
        "instrucao": "Treinar pesado",
        "status": "Aguardando Recruta!",
    }
