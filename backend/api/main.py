import os
import sys
from pathlib import Path

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
from backend.routes import router
from backend.routes.common import validate_registration_invite_configured


load_dotenv(dotenv_path=BASE_DIR / ".env")

LOCAL_CORS_ORIGINS = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
]


def is_production_environment() -> bool:
    environment = (
        os.getenv("BUNKERMODE_ENV")
        or os.getenv("ENV")
        or os.getenv("PYTHON_ENV")
        or ""
    ).strip().lower()
    return environment in {"production", "prod"}


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
    validate_registration_invite_configured()
    get_allowed_origins()


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
    return app


app = create_app()
