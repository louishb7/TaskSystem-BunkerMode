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
