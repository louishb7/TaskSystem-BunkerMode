from fastapi import FastAPI

from backend.api.main import app


def test_api_main_expõe_app_fastapi():
    assert isinstance(app, FastAPI)


def test_api_main_inclui_rotas_principais():
    paths = {route.path for route in app.routes}

    assert "/api/v2/health" in paths
    assert "/api/v2/auth/login" in paths
    assert "/api/v2/usuarios/me" in paths
    assert "/api/v2/missoes" in paths
    assert "/api/v2/session/unlock-general" in paths


def test_api_main_healthcheck_v2_retorna_ok():
    rota = next(route for route in app.routes if route.path == "/api/v2/health")

    assert rota.endpoint() == {"status": "ok"}
