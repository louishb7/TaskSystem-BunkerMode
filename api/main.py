import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router


def get_allowed_origins() -> list[str]:
    raw_origins = os.getenv("BUNKERMODE_CORS_ALLOW_ORIGINS", "*")
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    return origins or ["*"]


def create_app() -> FastAPI:
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
