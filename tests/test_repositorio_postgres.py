import os
from datetime import date

import pytest

import repositorio_postgres as rp
from missao import Missao, PrioridadeMissao, StatusMissao


class FakeCursor:
    def __init__(
        self,
        *,
        fetchall_result=None,
        fetchone_result=None,
        rowcount=1,
        execute_error=None,
    ):
        self.fetchall_result = fetchall_result if fetchall_result is not None else []
        self.fetchone_result = fetchone_result
        self.rowcount = rowcount
        self.execute_error = execute_error
        self.executions = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, query, params=None):
        self.executions.append((query, params))
        if self.execute_error is not None:
            raise self.execute_error

    def fetchall(self):
        return self.fetchall_result

    def fetchone(self):
        return self.fetchone_result


class FakeConnection:
    def __init__(self, cursor):
        self._cursor = cursor
        self.commit_called = False

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def cursor(self):
        return self._cursor

    def commit(self):
        self.commit_called = True


class FakePsycopg:
    class Error(Exception):
        pass

    def __init__(self, connection=None, connect_error=None):
        self.connection = connection
        self.connect_error = connect_error
        self.received_connection_string = None

    def connect(self, connection_string):
        self.received_connection_string = connection_string
        if self.connect_error is not None:
            raise self.connect_error
        return self.connection


@pytest.fixture
def repositorio():
    return rp.RepositorioPostgres("dbname=bunkermode_test")


@pytest.fixture
def missao_exemplo():
    return Missao(
        titulo="Estudar persistência",
        prioridade=1,
        prazo="20-04-2026",
        instrucao="Validar escrita no PostgreSQL",
        status=StatusMissao.PENDENTE,
    )


def test_conectar_lanca_erro_quando_driver_nao_esta_instalado(monkeypatch, repositorio):
    monkeypatch.setattr(rp, "psycopg", None)

    with pytest.raises(rp.DriverPostgresNaoInstaladoError):
        repositorio._conectar()


def test_conectar_traduz_erro_de_conexao(monkeypatch, repositorio):
    fake_psycopg = FakePsycopg(connect_error=FakePsycopg.Error("falha"))
    monkeypatch.setattr(rp, "psycopg", fake_psycopg)

    with pytest.raises(rp.ConexaoRepositorioError, match="Não foi possível conectar"):
        repositorio._conectar()


def test_carregar_dados_reconstroi_missoes(monkeypatch, repositorio):
    cursor = FakeCursor(
        fetchall_result=[
            (
                1,
                "Estudar SQL",
                1,
                date(2026, 4, 20),
                "Revisar consultas",
                "Pendente",
                False,
            ),
            (
                2,
                "Treinar API",
                2,
                None,
                "Ler rotas",
                "Concluída",
                True,
            ),
        ]
    )
    connection = FakeConnection(cursor)
    monkeypatch.setattr(rp, "psycopg", FakePsycopg(connection=connection))

    missoes = repositorio.carregar_dados()

    assert [missao.missao_id for missao in missoes] == [1, 2]
    assert missoes[0].prioridade == PrioridadeMissao.ALTA
    assert missoes[0].prazo == "20-04-2026"
    assert missoes[0].is_decided is False
    assert missoes[1].status == StatusMissao.CONCLUIDA
    assert missoes[1].is_decided is True
    assert "ORDER BY prioridade, missao_id" in cursor.executions[-1][0]


def test_buscar_por_id_retorna_none_quando_nao_encontra(monkeypatch, repositorio):
    cursor = FakeCursor(fetchone_result=None)
    connection = FakeConnection(cursor)
    monkeypatch.setattr(rp, "psycopg", FakePsycopg(connection=connection))

    resultado = repositorio.buscar_por_id(99)

    assert resultado is None
    assert cursor.executions[-1][1] == (99,)


def test_adicionar_missao_atualiza_id_e_confirma_transacao(
    monkeypatch, repositorio, missao_exemplo
):
    cursor = FakeCursor(fetchone_result=(7,))
    connection = FakeConnection(cursor)
    monkeypatch.setattr(rp, "psycopg", FakePsycopg(connection=connection))

    repositorio.adicionar_missao(missao_exemplo)

    assert missao_exemplo.missao_id == 7
    assert connection.commit_called is True
    params = cursor.executions[-1][1]
    assert params[0:6] == (
        "Estudar persistência",
        1,
        date(2026, 4, 20),
        "Validar escrita no PostgreSQL",
        "Pendente",
        False,
    )
    assert params[7:] == (None, None, None, None, None)


def test_atualizar_missao_lanca_erro_quando_linha_nao_existe(
    monkeypatch, repositorio, missao_exemplo
):
    missao_exemplo.atualizar_missao_id(3)
    cursor = FakeCursor(rowcount=0)
    connection = FakeConnection(cursor)
    monkeypatch.setattr(rp, "psycopg", FakePsycopg(connection=connection))

    with pytest.raises(rp.MissaoNaoPersistidaError, match="não encontrada"):
        repositorio.atualizar_missao(missao_exemplo)


def test_remover_missao_traduz_erro_de_escrita(monkeypatch, repositorio):
    cursor = FakeCursor(execute_error=FakePsycopg.Error("falha de escrita"))
    connection = FakeConnection(cursor)
    monkeypatch.setattr(rp, "psycopg", FakePsycopg(connection=connection))

    with pytest.raises(rp.EscritaRepositorioError, match="Erro ao remover missão"):
        repositorio.remover_missao(4)


def test_busca_usuario_reconstroi_nome_do_general(monkeypatch, repositorio):
    cursor = FakeCursor(
        fetchone_result=(
            1,
            "Henrique",
            "henrique@email.com",
            "hash",
            True,
            "General Atlas",
            "soldier",
        )
    )
    connection = FakeConnection(cursor)
    monkeypatch.setattr(rp, "psycopg", FakePsycopg(connection=connection))

    usuario = repositorio.buscar_usuario_por_id(1)

    assert usuario.nome_general == "General Atlas"
    assert usuario.active_mode == "soldier"


def test_atualizar_nome_general_confirma_transacao(monkeypatch, repositorio):
    cursor = FakeCursor()
    connection = FakeConnection(cursor)
    monkeypatch.setattr(rp, "psycopg", FakePsycopg(connection=connection))

    repositorio.atualizar_nome_general(3, "General Atlas")

    assert connection.commit_called is True
    assert cursor.executions[-1][1] == ("General Atlas", 3)


def test_atualizar_modo_ativo_confirma_transacao(monkeypatch, repositorio):
    cursor = FakeCursor()
    connection = FakeConnection(cursor)
    monkeypatch.setattr(rp, "psycopg", FakePsycopg(connection=connection))

    repositorio.atualizar_modo_ativo(3, "soldier")

    assert connection.commit_called is True
    assert cursor.executions[-1][1] == ("soldier", 3)


@pytest.fixture
def connection_string_teste():
    connection_string = os.getenv("BUNKERMODE_TEST_DB_URL")
    if not connection_string:
        pytest.skip(
            "Defina BUNKERMODE_TEST_DB_URL para executar o teste de integração do PostgreSQL."
        )
    return connection_string


@pytest.fixture
def preparar_banco_teste(connection_string_teste):
    psycopg = pytest.importorskip("psycopg")

    with psycopg.connect(connection_string_teste) as conexao:
        with conexao.cursor() as cursor:
            cursor.execute("DROP TABLE IF EXISTS missoes;")
            cursor.execute(
                """
                CREATE TABLE missoes (
                    missao_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    titulo TEXT NOT NULL,
                    prioridade INTEGER NOT NULL,
                    prazo DATE NULL,
                    instrucao TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
        conexao.commit()

    yield

    with psycopg.connect(connection_string_teste) as conexao:
        with conexao.cursor() as cursor:
            cursor.execute("DROP TABLE IF EXISTS missoes;")
        conexao.commit()


@pytest.mark.integration
def test_repositorio_postgres_persiste_fluxo_basico_real(
    preparar_banco_teste, connection_string_teste
):
    repositorio = rp.RepositorioPostgres(connection_string_teste)

    missao = Missao(
        titulo="Persistir missão real",
        prioridade=1,
        prazo="22-04-2026",
        instrucao="Validar CRUD real",
        status=StatusMissao.PENDENTE,
    )

    repositorio.adicionar_missao(missao)
    assert missao.missao_id == 1

    buscada = repositorio.buscar_por_id(1)
    assert buscada is not None
    assert buscada.titulo == "Persistir missão real"
    assert buscada.prazo == "22-04-2026"
    assert buscada.is_decided is False

    missao.alternar_decisao()
    missao.atualizar_titulo("Persistir missão real atualizada")
    missao.concluir()
    repositorio.atualizar_missao(missao)

    atualizada = repositorio.buscar_por_id(1)
    assert atualizada is not None
    assert atualizada.titulo == "Persistir missão real atualizada"
    assert atualizada.is_decided is True
    assert atualizada.status == StatusMissao.CONCLUIDA

    listadas = repositorio.carregar_dados()
    assert len(listadas) == 1
    assert listadas[0].missao_id == 1

    repositorio.remover_missao(1)
    assert repositorio.buscar_por_id(1) is None
