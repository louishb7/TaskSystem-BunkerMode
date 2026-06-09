from datetime import UTC, date, datetime
from urllib.parse import parse_qs, urlsplit

import pytest
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from backend.database import repositorio as rp
from backend.database.orm_models import MissaoContextoORM, MissaoORM, UsuarioORM
from backend.models.missao import (
    MISSAO_INSTRUCAO_MAX_LENGTH,
    Missao,
    PrioridadeMissao,
    StatusMissao,
)


class FakeConnection:
    def __init__(self, execute_error=None):
        self.execute_error = execute_error
        self.executions = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, statement):
        self.executions.append(statement)
        if self.execute_error is not None:
            raise self.execute_error


class FakeEngine:
    def __init__(self, execute_error=None):
        self.execute_error = execute_error
        self.disposed = False
        self.connection = FakeConnection(execute_error=execute_error)

    def connect(self):
        return self.connection

    def dispose(self):
        self.disposed = True


class FakeSession:
    def __init__(self, flush_callback=None):
        self.flush_callback = flush_callback
        self.added = []
        self.committed = False
        self.rolled_back = False
        self.closed = False

    def add(self, orm):
        self.added.append(orm)

    def flush(self):
        if self.flush_callback is not None:
            self.flush_callback(self)

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def close(self):
        self.closed = True


def criar_repositorio_sem_engine_real(monkeypatch, engine=None):
    rp.RepositorioPostgres.fechar_conexoes_compartilhadas()
    fake_engine = engine or FakeEngine()
    monkeypatch.setattr(rp, "create_engine", lambda url: fake_engine)
    return rp.RepositorioPostgres("dbname=bunkermode user=user password=pass host=localhost port=5432")


def test_normaliza_conninfo_psycopg_para_url_sqlalchemy(monkeypatch):
    repositorio = criar_repositorio_sem_engine_real(
        monkeypatch,
    )

    parsed = urlsplit(repositorio.sqlalchemy_url)

    assert parsed.scheme == "postgresql+psycopg"
    assert parsed.username == "user"
    assert parsed.password == "pass"
    assert parsed.hostname == "localhost"
    assert parsed.port == 5432
    assert parsed.path == "/bunkermode"


def test_normaliza_postgres_url_para_driver_psycopg(monkeypatch):
    fake_engine = FakeEngine()
    monkeypatch.setattr(rp, "create_engine", lambda url: fake_engine)

    repositorio = rp.RepositorioPostgres(
        "postgresql://user:pass@db.example.com:5432/bunkermode?sslmode=require"
    )

    parsed = urlsplit(repositorio.sqlalchemy_url)
    assert parsed.scheme == "postgresql+psycopg"
    assert parsed.hostname == "db.example.com"
    assert parse_qs(parsed.query) == {"sslmode": ["require"]}


def test_fechar_nao_descarta_engine_compartilhado(monkeypatch):
    fake_engine = FakeEngine()
    repositorio = criar_repositorio_sem_engine_real(monkeypatch, fake_engine)

    repositorio.fechar()

    assert fake_engine.disposed is False


def test_fechar_conexoes_compartilhadas_descarta_engine(monkeypatch):
    fake_engine = FakeEngine()
    criar_repositorio_sem_engine_real(monkeypatch, fake_engine)

    rp.RepositorioPostgres.fechar_conexoes_compartilhadas()

    assert fake_engine.disposed is True


def test_repositorios_com_mesma_url_reutilizam_engine(monkeypatch):
    rp.RepositorioPostgres.fechar_conexoes_compartilhadas()
    engines = []

    def criar_engine(url):
        engine = FakeEngine()
        engines.append(engine)
        return engine

    monkeypatch.setattr(rp, "create_engine", criar_engine)

    primeiro = rp.RepositorioPostgres(
        "postgresql://user:pass@db.example.com:5432/bunkermode"
    )
    segundo = rp.RepositorioPostgres(
        "postgresql://user:pass@db.example.com:5432/bunkermode"
    )

    assert len(engines) == 1
    assert primeiro._engine is segundo._engine


def test_verificar_conexao_executa_select(monkeypatch):
    fake_engine = FakeEngine()
    repositorio = criar_repositorio_sem_engine_real(monkeypatch, fake_engine)

    repositorio.verificar_conexao()

    assert str(fake_engine.connection.executions[0]) == "SELECT 1"


def test_verificar_conexao_traduz_erro_sqlalchemy(monkeypatch):
    repositorio = criar_repositorio_sem_engine_real(
        monkeypatch,
        FakeEngine(execute_error=SQLAlchemyError("falha")),
    )

    with pytest.raises(rp.ConexaoRepositorioError, match="validar a conexão"):
        repositorio.verificar_conexao()


def test_session_confirma_e_fecha(monkeypatch):
    repositorio = criar_repositorio_sem_engine_real(monkeypatch)
    session = FakeSession()
    repositorio._Session = lambda: session

    with repositorio._session():
        pass

    assert session.committed is True
    assert session.rolled_back is False
    assert session.closed is True


def test_session_reverte_quando_ha_erro(monkeypatch):
    repositorio = criar_repositorio_sem_engine_real(monkeypatch)
    session = FakeSession()
    repositorio._Session = lambda: session

    with pytest.raises(RuntimeError):
        with repositorio._session():
            raise RuntimeError("falha")

    assert session.committed is False
    assert session.rolled_back is True
    assert session.closed is True


def test_adicionar_missao_persiste_com_sqlalchemy_sqlite(repositorio):
    missao = Missao(
        titulo="Estudar persistência",
        prioridade=1,
        prazo="20-04-2026",
        instrucao="Validar escrita no PostgreSQL",
        status=StatusMissao.PENDENTE,
    )

    repositorio.adicionar_missao(missao)

    assert missao.missao_id is not None

    with repositorio._Session() as session:
        orm = session.execute(select(MissaoORM)).scalar_one()

    assert orm.titulo == "Estudar persistência"
    assert orm.prioridade == PrioridadeMissao.ALTA.value
    assert orm.prazo == date(2026, 4, 20)
    assert orm.status == StatusMissao.PENDENTE.value


def test_orm_para_missao_preserva_instrucao_legada_acima_do_limite(monkeypatch):
    repositorio = criar_repositorio_sem_engine_real(monkeypatch)
    instrucao_legada = "x" * (MISSAO_INSTRUCAO_MAX_LENGTH + 1)
    orm = MissaoORM(
        missao_id=1,
        titulo="Missão legada",
        prioridade=1,
        prazo=date(2026, 4, 20),
        instrucao=instrucao_legada,
        status="Pendente",
        is_pinned=True,
        created_at=datetime(2026, 4, 1, 8, 0),
    )
    contexto = MissaoContextoORM(
        missao_id=1,
        responsavel_id=3,
        operacao_id=4,
    )

    missao = repositorio._orm_para_missao(orm, contexto, "Operação Atlas")

    assert missao.instrucao == instrucao_legada
    assert missao.is_pinned is True
    assert missao.operacao_id == 4
    assert missao.operacao_nome == "Operação Atlas"


def test_orm_para_usuario_reconstroi_campos_de_sessao(monkeypatch):
    repositorio = criar_repositorio_sem_engine_real(monkeypatch)
    timezone_updated_at = datetime(2026, 4, 1, 12, 0, tzinfo=UTC)
    orm = UsuarioORM(
        usuario_id=1,
        usuario="Henrique",
        email="henrique@email.com",
        senha_hash="hash",
        ativo=True,
        nome_general="General Atlas",
        active_mode="soldier",
        planning_window="morning",
        timezone="Europe/Lisbon",
        emergency_unlock_date=date(2026, 4, 24),
        timezone_updated_at=timezone_updated_at,
    )

    usuario = repositorio._orm_para_usuario(orm)

    assert usuario.nome_general == "General Atlas"
    assert usuario.active_mode == "soldier"
    assert usuario.planning_window == "morning"
    assert usuario.timezone == "Europe/Lisbon"
    assert usuario.emergency_unlock_date == date(2026, 4, 24)
    assert usuario.timezone_updated_at == timezone_updated_at
