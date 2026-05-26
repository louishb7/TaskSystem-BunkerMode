from fastapi import APIRouter

from backend.routes import auth, missoes, objetivos, operacoes, revisoes, sonhos, usuarios

router = APIRouter()
router.include_router(auth.router)
router.include_router(usuarios.router)
router.include_router(sonhos.router)
router.include_router(objetivos.router)
router.include_router(missoes.router)
router.include_router(operacoes.router)
router.include_router(revisoes.router)

__all__ = ["router"]
