from backend.routes.common import *


router = APIRouter(prefix="/api/v2", tags=["sonhos"])


@router.get("/sonhos")
def listar_sonhos(
    usuario=Depends(get_current_user),
    sonho_service: SonhoService = Depends(get_sonho_service),
):
    try:
        return sonho_service.listar_sonhos(usuario)
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)


@router.post("/sonhos", status_code=status.HTTP_201_CREATED)
def criar_sonho(
    payload: SonhoCreatePayload,
    usuario=Depends(get_current_user),
    sonho_service: SonhoService = Depends(get_sonho_service),
):
    try:
        return sonho_service.criar_sonho(usuario, payload.model_dump())
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)


@router.patch("/sonhos/{sonho_id}")
def atualizar_sonho(
    sonho_id: int,
    payload: SonhoUpdatePayload,
    usuario=Depends(get_current_user),
    sonho_service: SonhoService = Depends(get_sonho_service),
):
    try:
        return sonho_service.atualizar_sonho(
            usuario,
            sonho_id,
            payload.model_dump(exclude_unset=True),
        )
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)


@router.post("/sonhos/{sonho_id}/arquivar")
def arquivar_sonho(
    sonho_id: int,
    payload: SonhoArquivarPayload,
    usuario=Depends(get_current_user),
    sonho_service: SonhoService = Depends(get_sonho_service),
):
    try:
        return sonho_service.arquivar_sonho(usuario, sonho_id, payload.justificativa)
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)


@router.post("/sonhos/{sonho_id}/promover")
def promover_sonho(
    sonho_id: int,
    usuario=Depends(get_current_user),
    sonho_service: SonhoService = Depends(get_sonho_service),
):
    try:
        return sonho_service.promover_para_principal(usuario, sonho_id)
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)

