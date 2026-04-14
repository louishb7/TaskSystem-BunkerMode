from fastapi import APIRouter, Depends
from api.schemas import MissaoCreate, MissaoResponse
from services.missao_service import MissaoService
from api.dependencies import get_current_user

router = APIRouter(prefix="/api")
service = MissaoService()

@router.post("/missoes", response_model=MissaoResponse)
def criar_missao(data: MissaoCreate, user=Depends(get_current_user)):
    return service.criar_missao(user.id, data)

@router.get("/missoes", response_model=list[MissaoResponse])
def listar_missoes(user=Depends(get_current_user)):
    return service.listar_missoes(user.id)

@router.patch("/missoes/{missao_id}/concluir")
def concluir_missao(missao_id: int, user=Depends(get_current_user)):
    return service.concluir_missao(user.id, missao_id)

@router.delete("/missoes/{missao_id}")
def deletar_missao(missao_id: int, user=Depends(get_current_user)):
    return service.deletar_missao(user.id, missao_id)
