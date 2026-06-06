import os
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timezone

import pytest

from backend.database import repositorio as rp
from backend.models.missao import MISSAO_INSTRUCAO_MAX_LENGTH, Missao, PrioridadeMissao, StatusMissao


class FakeCursor:
    def __init__(
        self,
        *,
        fetchall_result=None,
        fetchall_results=None,
        fetchone_result=None,
        fetchone_results=None,
        rowcount=1,
        execute_error=None,
    ):
        self.fetchall_result = fetchall_result if fetchall_result is not None else []
        self.fetchall_results = list(fetchall_results or [])
        self.fetchone_result = fetchone_result
        self.fetchone_results = list(fetchone_results or [])
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
        if self.fetchall_results:
            return self.fetchall_results.pop(0)
        return self.fetchall_result

    def fetchone(self):
        if self.fetchone_results:
            return self.fetchone_results.pop(0)
        return self.fetchone_result


class FakeConnection:
    def __init__(self, cursor):
        self._cursor = cursor
        self.commit_called = False
        self.rollback_called = False
        self.closed = False

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def cursor(self):
        return self._cursor

    def commit(self):
        self.commit_called = True

    def rollback(self):
        self.rollback_called = True

    def close(self):
        self.closed = True


class FakePsycopg:
    class Error(Exception):
        pass

    def __init__(self, connection=None, connect_error=None):
        self.connection = connection
        self.connect_error = connect_error
        self.received_connection_string = None
        self.connect_count = 0

    def connect(self, connection_string):
        self.connect_count += 1
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


def test_inicializar_schema_nao_roda_ddl_em_producao(monkeypatch):
    repositorio = rp.RepositorioPostgres("dbname=producao")
    cursor = FakeCursor()
    connection = FakeConnection(cursor)
    fake_psycopg = FakePsycopg(connection=connection)
    monkeypatch.setattr(rp, "psycopg", fake_psycopg)
    monkeypatch.setenv("BUNKERMODE_ENV", "production")
    monkeypatch.delenv("BUNKERMODE_AUTO_SCHEMA_INIT", raising=False)

    repositorio.inicializar_schema()

    assert cursor.executions == []
    assert connection.commit_called is False


def test_inicializar_schema_roda_uma_vez_por_connection_string(monkeypatch):
    repositorio = rp.RepositorioPostgres("dbname=cache_schema")
    cursor = FakeCursor()
    connection = FakeConnection(cursor)
    fake_psycopg = FakePsycopg(connection=connection)
    monkeypatch.setattr(rp, "psycopg", fake_psycopg)
    monkeypatch.delenv("BUNKERMODE_ENV", raising=False)
    monkeypatch.delenv("BUNKERMODE_AUTO_SCHEMA_INIT", raising=False)
    rp.RepositorioPostgres._schemas_inicializados.discard("dbname=cache_schema")

    repositorio.inicializar_schema()
    primeira_execucao = len(cursor.executions)
    repositorio.inicializar_schema()

    assert primeira_execucao > 0
    assert len(cursor.executions) == primeira_execucao
    assert any(
        "idx_missao_contextos_responsavel_id" in str(query)
        for query, _ in cursor.executions
    )


def test_inicializar_schema_cria_tabela_missoes(monkeypatch):
    repositorio = rp.RepositorioPostgres("dbname=schema_missoes")
    cursor = FakeCursor()
    connection = FakeConnection(cursor)
    fake_psycopg = FakePsycopg(connection=connection)
    monkeypatch.setattr(rp, "psycopg", fake_psycopg)
    monkeypatch.delenv("BUNKERMODE_ENV", raising=False)
    monkeypatch.delenv("BUNKERMODE_AUTO_SCHEMA_INIT", raising=False)
    rp.RepositorioPostgres._schemas_inicializados.discard("dbname=schema_missoes")

    repositorio.inicializar_schema()

    assert any(
        "CREATE TABLE IF NOT EXISTS missoes" in str(query)
        for query, _ in cursor.executions
    )


def test_verificar_schema_reporta_colunas_faltantes(monkeypatch):
    repositorio = rp.RepositorioPostgres("dbname=schema_check")
    cursor = FakeCursor(
        fetchall_results=[
            [
                ("usuarios", "usuario_id"),
                ("usuarios", "usuario"),
                ("missoes", "missao_id"),
            ],
            [],
        ]
    )
    connection = FakeConnection(cursor)
    fake_psycopg = FakePsycopg(connection=connection)
    monkeypatch.setattr(rp, "psycopg", fake_psycopg)

    resultado = repositorio.verificar_schema()

    assert resultado["status"] == "incompleto"
    assert resultado["schema_ok"] is False
    assert "email" in resultado["pendencias"]["usuarios"]
    assert "titulo" in resultado["pendencias"]["missoes"]
    assert "idx_missao_contextos_responsavel_id" in resultado["pendencias"]["indices"]


def test_auditar_integridade_reporta_pendencias(monkeypatch):
    repositorio = rp.RepositorioPostgres("dbname=integridade_check")
    colunas = [
        (tabela, coluna)
        for tabela, colunas in rp.RepositorioPostgres._schema_obrigatorio.items()
        for coluna in colunas
    ]
    indices = [
        ("idx_missao_contextos_responsavel_id",),
        ("idx_missao_contextos_operacao_dia",),
    ]
    cursor = FakeCursor(
        fetchall_results=[colunas, indices],
        fetchone_results=[
            (2,),
            (0,),
            (1,),
            (0,),
            (0,),
            (0,),
            (0,),
            (0,),
            (0,),
        ],
    )
    connection = FakeConnection(cursor)
    fake_psycopg = FakePsycopg(connection=connection)
    monkeypatch.setattr(rp, "psycopg", fake_psycopg)

    resultado = repositorio.auditar_integridade()

    assert resultado["status"] == "inconsistente"
    assert resultado["integridade_ok"] is False
    assert resultado["pendencias"] == {
        "missoes_sem_contexto": 2,
        "contextos_sem_responsavel": 1,
    }


def test_auditar_integridade_nao_executa_consultas_com_schema_incompleto(monkeypatch):
    repositorio = rp.RepositorioPostgres("dbname=integridade_incompleta")
    cursor = FakeCursor(
        fetchall_results=[
            [("usuarios", "usuario_id")],
            [],
        ]
    )
    connection = FakeConnection(cursor)
    fake_psycopg = FakePsycopg(connection=connection)
    monkeypatch.setattr(rp, "psycopg", fake_psycopg)

    resultado = repositorio.auditar_integridade()

    assert resultado["status"] == "incompleto"
    assert resultado["integridade_ok"] is False
    assert resultado["contagens"] == {}
    assert "schema" in resultado["pendencias"]


def test_reparar_integridade_segura_corrige_apenas_casos_sem_adivinhar_dono(monkeypatch):
    repositorio = rp.RepositorioPostgres("dbname=repair_check")
    colunas = [
        (tabela, coluna)
        for tabela, colunas in rp.RepositorioPostgres._schema_obrigatorio.items()
        for coluna in colunas
    ]
    indices = [
        ("idx_missao_contextos_responsavel_id",),
        ("idx_missao_contextos_operacao_dia",),
    ]
    cursor = FakeCursor(
        fetchall_results=[colunas, indices, colunas, indices],
        fetchone_results=[
            (3,),
            (0,),
            (1,),
            (0,),
            (0,),
            (0,),
            (0,),
            (0,),
            (0,),
        ],
        rowcount=1,
    )
    connection = FakeConnection(cursor)
    fake_psycopg = FakePsycopg(connection=connection)
    monkeypatch.setattr(rp, "psycopg", fake_psycopg)

    resultado = repositorio.reparar_integridade_segura()

    assert resultado["status"] == "pendencias_manuais"
    assert resultado["correcoes"] == {
        "contextos_sem_missao": 1,
        "missoes_com_objetivo_inexistente": 1,
        "missoes_com_sonho_inexistente": 1,
        "objetivos_com_sonho_inexistente": 1,
    }
    assert resultado["pendencias_manuais"] == {
        "missoes_sem_contexto": 3,
        "contextos_sem_responsavel": 1,
    }


def test_reparar_integridade_segura_nao_executa_reparo_com_schema_incompleto(monkeypatch):
    repositorio = rp.RepositorioPostgres("dbname=repair_incompleto")
    cursor = FakeCursor(
        fetchall_results=[
            [("usuarios", "usuario_id")],
            [],
        ]
    )
    connection = FakeConnection(cursor)
    fake_psycopg = FakePsycopg(connection=connection)
    monkeypatch.setattr(rp, "psycopg", fake_psycopg)

    resultado = repositorio.reparar_integridade_segura()

    assert resultado["status"] == "incompleto"
    assert resultado["correcoes"] == {}
    assert resultado["auditoria"]["contagens"] == {}
    assert "schema" in resultado["pendencias_manuais"]


def test_remover_missao_remove_auxiliares_antes_da_missao(monkeypatch):
    repositorio = rp.RepositorioPostgres("dbname=delete_order")
    cursor = FakeCursor()
    connection = FakeConnection(cursor)
    fake_psycopg = FakePsycopg(connection=connection)
    monkeypatch.setattr(rp, "psycopg", fake_psycopg)
    monkeypatch.setenv("BUNKERMODE_AUTO_SCHEMA_INIT", "0")

    repositorio.remover_missao(7)

    comandos = [str(query) for query, _ in cursor.executions]
    assert "DELETE FROM auditoria_eventos" in comandos[0]
    assert "DELETE FROM missao_contextos" in comandos[1]
    assert "DELETE FROM missoes" in comandos[2]


def test_repositorio_reutiliza_conexao_ate_fechar(monkeypatch):
    repositorio = rp.RepositorioPostgres("dbname=reuso")
    cursor = FakeCursor()
    connection = FakeConnection(cursor)
    fake_psycopg = FakePsycopg(connection=connection)
    monkeypatch.setattr(rp, "psycopg", fake_psycopg)

    with repositorio._conectar():
        pass
    with repositorio._conectar():
        pass

    assert fake_psycopg.connect_count == 1

    repositorio.fechar()
    with repositorio._conectar():
        pass

    assert fake_psycopg.connect_count == 2


def test_repositorio_reutiliza_conexao_compartilhada_em_producao(monkeypatch):
    cursor = FakeCursor()
    connection = FakeConnection(cursor)
    fake_psycopg = FakePsycopg(connection=connection)
    monkeypatch.setattr(rp, "psycopg", fake_psycopg)
    monkeypatch.setenv("BUNKERMODE_ENV", "production")
    monkeypatch.delenv("BUNKERMODE_REUSE_DB_CONNECTIONS", raising=False)
    rp.RepositorioPostgres.fechar_conexoes_compartilhadas()

    repositorio_1 = rp.RepositorioPostgres("dbname=shared")
    repositorio_2 = rp.RepositorioPostgres("dbname=shared")

    with repositorio_1._conectar():
        pass
    repositorio_1.fechar()
    with repositorio_2._conectar():
        pass

    assert fake_psycopg.connect_count == 1
    assert connection.closed is False

    rp.RepositorioPostgres.fechar_conexoes_compartilhadas()


def test_repositorio_compartilhado_nao_serializa_threads_em_uma_conexao(monkeypatch):
    connections = [FakeConnection(FakeCursor()), FakeConnection(FakeCursor())]

    class SequencedPsycopg(FakePsycopg):
        def connect(self, connection_string):
            self.connect_count += 1
            self.received_connection_string = connection_string
            return connections[self.connect_count - 1]

    fake_psycopg = SequencedPsycopg()
    barreira = threading.Barrier(2)
    monkeypatch.setattr(rp, "psycopg", fake_psycopg)
    monkeypatch.setenv("BUNKERMODE_ENV", "production")
    monkeypatch.delenv("BUNKERMODE_REUSE_DB_CONNECTIONS", raising=False)
    rp.RepositorioPostgres.fechar_conexoes_compartilhadas()

    def abrir_conexao():
        repositorio = rp.RepositorioPostgres("dbname=shared_threads")
        with repositorio._conectar():
            barreira.wait(timeout=2)

    with ThreadPoolExecutor(max_workers=2) as executor:
        list(executor.map(lambda _: abrir_conexao(), range(2)))

    assert fake_psycopg.connect_count == 2
    assert all(connection.closed is False for connection in connections)

    rp.RepositorioPostgres.fechar_conexoes_compartilhadas()


def test_repositorio_renova_conexao_compartilhada_expirada(monkeypatch):
    cursor_1 = FakeCursor()
    cursor_2 = FakeCursor()
    connections = [FakeConnection(cursor_1), FakeConnection(cursor_2)]

    class SequencedPsycopg(FakePsycopg):
        def connect(self, connection_string):
            self.connect_count += 1
            self.received_connection_string = connection_string
            return connections[self.connect_count - 1]

    fake_psycopg = SequencedPsycopg()
    monkeypatch.setattr(rp, "psycopg", fake_psycopg)
    monkeypatch.setenv("BUNKERMODE_ENV", "production")
    monkeypatch.setenv("BUNKERMODE_DB_CONNECTION_IDLE_TTL_SECONDS", "1")
    rp.RepositorioPostgres.fechar_conexoes_compartilhadas()

    repositorio = rp.RepositorioPostgres("dbname=shared_expired")
    with repositorio._conectar():
        pass

    chave = next(iter(rp.RepositorioPostgres._shared_connections))
    rp.RepositorioPostgres._shared_connections[chave]["last_used"] -= 2
    with repositorio._conectar():
        pass

    assert fake_psycopg.connect_count == 2
    assert connections[0].closed is True

    rp.RepositorioPostgres.fechar_conexoes_compartilhadas()


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
    assert missoes[0].is_pinned is False
    assert missoes[1].status == StatusMissao.CONCLUIDA
    assert missoes[1].is_pinned is True
    assert "ORDER BY m.prioridade, m.missao_id" in cursor.executions[-1][0]


def test_reconstruir_missao_preserva_instrucao_legada_acima_do_limite(repositorio):
    instrucao_legada = "x" * (MISSAO_INSTRUCAO_MAX_LENGTH + 1)

    missao = repositorio._reconstruir_missao(
        (
            1,
            "Missão legada",
            1,
            date(2026, 4, 20),
            instrucao_legada,
            "Pendente",
            False,
        )
    )

    assert missao.instrucao == instrucao_legada


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
    assert params[7:] == (None, None, None, None, None, None, None, None, None, None, None)


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
    assert usuario.planning_window == "night"
    assert usuario.timezone == "America/Recife"
    assert usuario.emergency_unlock_date is None
    assert usuario.timezone_updated_at is None


def test_busca_usuario_reconstroi_data_de_emergencia(monkeypatch, repositorio):
    timezone_updated_at = datetime(2026, 4, 1, 12, 0, tzinfo=timezone.utc)
    cursor = FakeCursor(
        fetchone_result=(
            1,
            "Henrique",
            "henrique@email.com",
            "hash",
            True,
            "General Atlas",
            "soldier",
            "morning",
            "Europe/Lisbon",
            date(2026, 4, 24),
            timezone_updated_at,
        )
    )
    connection = FakeConnection(cursor)
    monkeypatch.setattr(rp, "psycopg", FakePsycopg(connection=connection))

    usuario = repositorio.buscar_usuario_por_id(1)

    assert usuario.planning_window == "morning"
    assert usuario.timezone == "Europe/Lisbon"
    assert usuario.emergency_unlock_date == date(2026, 4, 24)
    assert usuario.timezone_updated_at == timezone_updated_at


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


def test_atualizar_turno_timezone_e_emergencia_confirma_transacao(monkeypatch, repositorio):
    cursor = FakeCursor()
    connection = FakeConnection(cursor)
    monkeypatch.setattr(rp, "psycopg", FakePsycopg(connection=connection))
    timezone_updated_at = datetime(2026, 4, 24, 12, 0, tzinfo=timezone.utc)

    repositorio.atualizar_turno_planejamento(3, "Morning")
    repositorio.atualizar_timezone(3, "Europe/Lisbon", timezone_updated_at)
    repositorio.registrar_uso_emergencia_general(3, date(2026, 4, 24))

    assert connection.commit_called is True
    update_params = [params for _, params in cursor.executions if params is not None]
    assert update_params[-3:] == [
        ("morning", 3),
        ("Europe/Lisbon", timezone_updated_at, 3),
        (date(2026, 4, 24), 3),
    ]


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
    assert buscada.is_pinned is False

    missao.alternar_prioridade_fixada()
    missao.atualizar_titulo("Persistir missão real atualizada")
    missao.concluir()
    repositorio.atualizar_missao(missao)

    atualizada = repositorio.buscar_por_id(1)
    assert atualizada is not None
    assert atualizada.titulo == "Persistir missão real atualizada"
    assert atualizada.is_pinned is True
    assert atualizada.status == StatusMissao.CONCLUIDA

    listadas = repositorio.carregar_dados()
    assert len(listadas) == 1
    assert listadas[0].missao_id == 1

    repositorio.remover_missao(1)
    assert repositorio.buscar_por_id(1) is None
