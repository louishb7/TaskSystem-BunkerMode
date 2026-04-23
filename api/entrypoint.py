import os

import uvicorn


def run() -> None:
    host = os.getenv("BUNKERMODE_API_HOST", "127.0.0.1")
    port = int(os.getenv("BUNKERMODE_API_PORT", "8000"))
    reload_ativo = os.getenv("BUNKERMODE_API_RELOAD", "false").lower() == "true"

    uvicorn.run("api.routes:app", host=host, port=port, reload=reload_ativo)
