from backend.routes.common import *


router = APIRouter(prefix="/api/v2", tags=["objetivos"])


@router.get("/objetivos")
def listar_objetivos(
    usuario=Depends(get_current_user),
    objetivo_service: ObjetivoService = Depends(get_objetivo_service),
):
    try:
        return objetivo_service.listar_objetivos(usuario)
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)


@router.post("/objetivos", status_code=status.HTTP_201_CREATED)
def criar_objetivo(
    payload: ObjetivoCreatePayload,
    usuario=Depends(get_current_user),
    objetivo_service: ObjetivoService = Depends(get_objetivo_service),
):
    try:
        return objetivo_service.criar_objetivo(usuario, payload.model_dump())
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)


@router.patch("/objetivos/{objetivo_id}")
def atualizar_objetivo(
    objetivo_id: int,
    payload: ObjetivoUpdatePayload,
    usuario=Depends(get_current_user),
    objetivo_service: ObjetivoService = Depends(get_objetivo_service),
):
    try:
        return objetivo_service.atualizar_objetivo(
            usuario,
            objetivo_id,
            payload.model_dump(exclude_unset=True),
        )
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)


@router.patch("/objetivos/{objetivo_id}/progresso")
def atualizar_progresso_objetivo(
    objetivo_id: int,
    payload: ObjetivoProgressoPayload,
    usuario=Depends(get_current_user),
    objetivo_service: ObjetivoService = Depends(get_objetivo_service),
):
    try:
        return objetivo_service.atualizar_progresso(usuario, objetivo_id, payload.progresso)
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)


@router.patch("/objetivos/{objetivo_id}/status")
def atualizar_status_objetivo(
    objetivo_id: int,
    payload: ObjetivoStatusPayload,
    usuario=Depends(get_current_user),
    objetivo_service: ObjetivoService = Depends(get_objetivo_service),
):
    try:
        return objetivo_service.atualizar_status(usuario, objetivo_id, payload.status)
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)


@router.delete("/objetivos/{objetivo_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_objetivo(
    objetivo_id: int,
    usuario=Depends(get_current_user),
    objetivo_service: ObjetivoService = Depends(get_objetivo_service),
):
    try:
        objetivo_service.deletar_objetivo(usuario, objetivo_id)
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)

