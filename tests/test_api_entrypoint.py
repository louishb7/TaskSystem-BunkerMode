import importlib.util
from pathlib import Path


ENTRYPOINT_PATH = Path(__file__).resolve().parents[1] / "api" / "entrypoint.py"
spec = importlib.util.spec_from_file_location("bunkermode_api_entrypoint", ENTRYPOINT_PATH)
api_main = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(api_main)


def test_main_executa_uvicorn_com_configuracao_padrao(monkeypatch):
    chamada = {}

    def fake_run(app_path, host, port, reload):
        chamada["app_path"] = app_path
        chamada["host"] = host
        chamada["port"] = port
        chamada["reload"] = reload

    monkeypatch.setattr(api_main.uvicorn, "run", fake_run)
    monkeypatch.delenv("BUNKERMODE_API_HOST", raising=False)
    monkeypatch.delenv("BUNKERMODE_API_PORT", raising=False)
    monkeypatch.delenv("BUNKERMODE_API_RELOAD", raising=False)

    api_main.run()

    assert chamada == {
        "app_path": "api.routes:app",
        "host": "127.0.0.1",
        "port": 8000,
        "reload": False,
    }


def test_main_respeita_variaveis_de_ambiente(monkeypatch):
    chamada = {}

    def fake_run(app_path, host, port, reload):
        chamada["app_path"] = app_path
        chamada["host"] = host
        chamada["port"] = port
        chamada["reload"] = reload

    monkeypatch.setattr(api_main.uvicorn, "run", fake_run)
    monkeypatch.setenv("BUNKERMODE_API_HOST", "0.0.0.0")
    monkeypatch.setenv("BUNKERMODE_API_PORT", "9000")
    monkeypatch.setenv("BUNKERMODE_API_RELOAD", "true")

    api_main.run()

    assert chamada == {
        "app_path": "api.routes:app",
        "host": "0.0.0.0",
        "port": 9000,
        "reload": True,
    }
