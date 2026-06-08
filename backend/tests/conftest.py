import os
from pathlib import Path
import sys

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.database.orm_models import Base
from backend.database.repositorio import RepositorioPostgres

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("BUNKERMODE_AUTH_SECRET", "segredo-de-teste")


@pytest.fixture(scope="function")
def db_engine():
    """Banco SQLite em memória, isolado por teste."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture(scope="function")
def repositorio(db_engine):
    """Repositório conectado ao banco de teste em memória."""
    repo = RepositorioPostgres.__new__(RepositorioPostgres)
    repo._engine = db_engine
    repo._Session = sessionmaker(bind=db_engine, expire_on_commit=False)
    return repo
