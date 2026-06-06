from backend.routes.common import *
from backend.schemas import RegistroPayload


router = APIRouter(prefix="/api/v2", tags=["auth"])


@router.get("/health")
def healthcheck():
    return {"status": "ok"}


@router.post("/auth/register", status_code=status.HTTP_201_CREATED)
def registrar_usuario(
    payload: RegistroPayload,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        usuario = auth_service.registrar_usuario(payload.model_dump())
    except (UsuarioJaExisteError, ValueError) as erro:
        raise HTTPException(status_code=400, detail=str(erro)) from erro

    return _usuario_to_response(usuario)


@router.post("/auth/login")
def login(
    payload: LoginPayload,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        resultado = auth_service.autenticar(payload.email, payload.senha)
    except (AutenticacaoError, ValueError) as erro:
        raise HTTPException(status_code=401, detail=str(erro)) from erro

    usuario = resultado["usuario"]
    return {
        "access_token": resultado["access_token"],
        "token_type": resultado["token_type"],
        "usuario": _usuario_to_response(usuario, include_ativo=False),
    }
