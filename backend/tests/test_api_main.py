from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.api.main import app
from backend.routes.common import get_repositorio


def test_api_main_expõe_app_fastapi():
    assert isinstance(app, FastAPI)


def test_api_main_inclui_rotas_principais():
    paths = {route.path for route in app.routes}

    assert "/api/v2/health" in paths
    assert "/api/v2/health/schema" in paths
    assert "/api/v2/health/database" in paths
    assert "/api/v2/health/database/reparar" in paths
    assert "/api/v2/auth/login" in paths
    assert "/api/v2/usuarios/me" in paths
    assert "/api/v2/missoes" in paths
    assert "/api/v2/session/unlock-general" in paths


def test_api_main_healthcheck_com_testclient():
    with TestClient(app) as client:
        response = client.get("/api/v2/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_api_main_healthcheck_schema_informa_pendencias():
    class RepositorioSchemaFake:
        def verificar_schema(self):
            return {
                "status": "incompleto",
                "schema_ok": False,
                "pendencias": {"missoes": ["objetivo_id"]},
            }

    app.dependency_overrides[get_repositorio] = lambda: RepositorioSchemaFake()
    try:
        with TestClient(app) as client:
            response = client.get("/api/v2/health/schema")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "status": "incompleto",
        "schema_ok": False,
        "pendencias": {"missoes": ["objetivo_id"]},
        "detail": "Schema do banco de dados incompleto. Aplique a migration da Montanha.",
    }


def test_api_main_healthcheck_database_interrompe_se_schema_incompleto():
    class RepositorioSchemaFake:
        def verificar_schema(self):
            return {
                "status": "incompleto",
                "schema_ok": False,
                "pendencias": {"missoes": ["objetivo_id"]},
            }

        def auditar_integridade(self):
            raise AssertionError("não deve auditar integridade com schema incompleto")

    app.dependency_overrides[get_repositorio] = lambda: RepositorioSchemaFake()
    try:
        with TestClient(app) as client:
            response = client.get("/api/v2/health/database")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "status": "incompleto",
        "schema": {
            "status": "incompleto",
            "schema_ok": False,
            "pendencias": {"missoes": ["objetivo_id"]},
        },
        "integridade": None,
        "detail": "Schema do banco de dados incompleto. Aplique a migration da Montanha antes da auditoria de integridade.",
    }


def test_api_main_healthcheck_database_retorna_integridade():
    class RepositorioSchemaFake:
        def verificar_schema(self):
            return {"status": "ok", "schema_ok": True, "pendencias": {}}

        def auditar_integridade(self):
            return {
                "status": "inconsistente",
                "integridade_ok": False,
                "pendencias": {"missoes_sem_contexto": 1},
                "contagens": {"missoes_sem_contexto": 1},
            }

    app.dependency_overrides[get_repositorio] = lambda: RepositorioSchemaFake()
    try:
        with TestClient(app) as client:
            response = client.get("/api/v2/health/database")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "status": "inconsistente",
        "schema": {"status": "ok", "schema_ok": True, "pendencias": {}},
        "integridade": {
            "status": "inconsistente",
            "integridade_ok": False,
            "pendencias": {"missoes_sem_contexto": 1},
            "contagens": {"missoes_sem_contexto": 1},
        },
    }


def test_api_main_reparar_integridade_database_retorna_resultado():
    class RepositorioSchemaFake:
        def reparar_integridade_segura(self):
            return {
                "status": "ok",
                "correcoes": {"contextos_sem_missao": 1},
                "auditoria": {"status": "ok", "integridade_ok": True, "pendencias": {}},
                "pendencias_manuais": {},
            }

    app.dependency_overrides[get_repositorio] = lambda: RepositorioSchemaFake()
    try:
        with TestClient(app) as client:
            response = client.post("/api/v2/health/database/reparar")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "correcoes": {"contextos_sem_missao": 1},
        "auditoria": {"status": "ok", "integridade_ok": True, "pendencias": {}},
        "pendencias_manuais": {},
    }
