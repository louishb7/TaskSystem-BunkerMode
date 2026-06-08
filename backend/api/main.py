import os
import sys
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent
for path in (PROJECT_ROOT, BASE_DIR):
    path_string = str(path)
    if path_string not in sys.path:
        sys.path.insert(0, path_string)

from backend.core.auth import validate_auth_secret_configured
from backend.core.settings import (
    get_connection_string,
    is_production_environment,
    validate_database_config_for_runtime,
)
from backend.routes import router


load_dotenv(dotenv_path=BASE_DIR / ".env")

LOCAL_CORS_ORIGINS = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
]


def get_allowed_origins() -> list[str]:
    raw_origins = os.getenv("BUNKERMODE_CORS_ALLOW_ORIGINS", "")
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    if origins:
        return origins
    if is_production_environment():
        raise RuntimeError("Defina BUNKERMODE_CORS_ALLOW_ORIGINS em produção.")
    return LOCAL_CORS_ORIGINS


def validate_runtime_config() -> None:
    validate_auth_secret_configured()
    get_allowed_origins()
    validate_database_config_for_runtime()


def criar_repositorio():
    # Mantém o healthcheck fora do sistema de Depends porque ele roda direto no app.
    from backend.database.repositorio import RepositorioPostgres

    return RepositorioPostgres(get_connection_string())


def _get_database_target() -> str:
    # Loga destino operacional sem expor usuário, senha ou query string da URL.
    database_url = os.getenv("BUNKERMODE_DB_URL", "").strip()
    if database_url:
        parsed = urlparse(database_url)
        host = parsed.hostname or "host-indefinido"
        port = parsed.port or 5432
        dbname = parsed.path.lstrip("/") or "banco-indefinido"
        return f"{host}:{port}/{dbname}"

    host = os.getenv("BUNKERMODE_DB_HOST", "localhost").strip() or "localhost"
    port = os.getenv("BUNKERMODE_DB_PORT", "5432").strip() or "5432"
    dbname = os.getenv("BUNKERMODE_DB_NAME", "bunkermode").strip() or "bunkermode"
    return f"{host}:{port}/{dbname}"


def _mask_long_value(value: str) -> str:
    # Evita logs enormes ou sensíveis mantendo informação suficiente para diagnóstico.
    if len(value) <= 80:
        return value
    return f"{value[:77]}..."


def _database_config_ok() -> bool:
    # Em produção, localhost já foi a causa de falha; o health deixa isso explícito.
    database_url = os.getenv("BUNKERMODE_DB_URL", "").strip()
    host = os.getenv("BUNKERMODE_DB_HOST", "localhost").strip()
    return bool(database_url) or host not in {"", "localhost"}


def create_app() -> FastAPI:
    validate_runtime_config()
    app = FastAPI(title="BunkerMode API")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_allowed_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)

    @app.get("/health")
    def health():
        checks = {}

        # Expõe envs obrigatórias para diagnosticar deploy sem acessar shell da plataforma.
        auth_ok = bool(os.getenv("BUNKERMODE_AUTH_SECRET"))
        cors_ok = bool(os.getenv("BUNKERMODE_CORS_ALLOW_ORIGINS"))
        checks["auth_secret"] = "ok" if auth_ok else "AUSENTE"
        checks["cors_origins"] = "ok" if cors_ok else "AUSENTE"
        checks["db_config"] = (
            "ok"
            if _database_config_ok()
            else "localhost detectado — inválido em produção"
        )

        try:
            repo = criar_repositorio()
            repo.verificar_conexao()
            checks["database"] = "connected"
        except Exception as erro:
            checks["database"] = f"disconnected: {erro}"
        finally:
            if "repo" in locals():
                repo.fechar()

        status = (
            "ok"
            if all(value in {"ok", "connected"} for value in checks.values())
            else "degraded"
        )
        return {"status": status, "checks": checks}

    @app.on_event("startup")
    def log_startup_config() -> None:
        cors_origins = ",".join(get_allowed_origins())
        database_target = _get_database_target()

        # Logs de startup tornam divergências de env visíveis no provedor de deploy.
        print(f"BUNKERMODE_ENV carregado: {os.getenv('BUNKERMODE_ENV', '') or 'não definido'}")
        print(f"CORS origins configurados: {_mask_long_value(cors_origins)}")
        print(f"Conectando em {database_target}...")
        if not is_production_environment():
            # Evita travar testes e boot local quando o PostgreSQL não está ativo.
            print("Conexão com banco não testada fora de produção")
            return
        try:
            repo = criar_repositorio()
            repo.verificar_conexao()
            print("Banco conectado")
        except Exception as erro:
            print(f"ERRO ao conectar: {erro}")
        finally:
            if "repo" in locals():
                repo.fechar()

    return app


app = create_app()
