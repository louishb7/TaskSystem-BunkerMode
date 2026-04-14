from fastapi import FastAPI
from api.routes import router

app = FastAPI(
    title="BunkerMode API",
    version="1.0.0",
    description="Backend para gerenciamento de missões com sistema General/Soldado"
)

app.include_router(router)
