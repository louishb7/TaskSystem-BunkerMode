from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.main import app


def test_api_main_expõe_app_fastapi():
    assert isinstance(app, FastAPI)


def test_api_main_inclui_rotas_principais():
    paths = {route.path for route in app.routes}

    assert "/api/v2/health" in paths
    assert "/api/v2/auth/login" in paths
    assert "/api/v2/usuarios/me" in paths
    assert "/api/v2/missoes" in paths
    assert "/api/v2/session/unlock-general" in paths


def test_api_main_healthcheck_com_testclient():
    response = TestClient(app).get("/api/v2/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
