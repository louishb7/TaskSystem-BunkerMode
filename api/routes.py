import os

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from api.schemas import (
    LoginPayload,
    MissaoCreatePayload,
    MissaoUpdatePayload,
    RegistroPayload,
)
from core_exceptions import MissaoNaoEncontrada
from db_config import get_connection_string
from repositorio_postgres import RepositorioPostgres
from services.auth_service import AuthService
from services.exceptions import AutenticacaoError, UsuarioJaExisteError, UsuarioNaoEncontrado
from services.missao_service import MissaoService

app = FastAPI(title="BunkerMode API")
router = APIRouter(prefix="/api/v2", tags=["v2"])


def get_allowed_origins() -> list[str]:
    raw_origins = os.getenv("BUNKERMODE_CORS_ALLOW_ORIGINS", "*")
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    return origins or ["*"]


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_auth_service() -> AuthService:
    return AuthService(RepositorioPostgres(get_connection_string()))


def get_missao_service() -> MissaoService:
    return MissaoService(RepositorioPostgres(get_connection_string()))


def get_current_user(
    authorization: str = Header(default=""),
    auth_service: AuthService = Depends(get_auth_service),
):
    prefix = "Bearer "
    if not authorization.startswith(prefix):
        raise HTTPException(status_code=401, detail="Credenciais não fornecidas.")

    token = authorization[len(prefix) :].strip()
    try:
        return auth_service.obter_usuario_por_token(token)
    except (AutenticacaoError, UsuarioNaoEncontrado, ValueError) as erro:
        raise HTTPException(status_code=401, detail=str(erro)) from erro


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

    return {
        "id": usuario.usuario_id,
        "usuario": usuario.usuario,
        "email": usuario.email,
        "ativo": usuario.ativo,
    }


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
        "usuario": {
            "id": usuario.usuario_id,
            "usuario": usuario.usuario,
            "email": usuario.email,
        },
    }


@router.get("/usuarios/me")
def obter_usuario_atual(usuario=Depends(get_current_user)):
    return {
        "id": usuario.usuario_id,
        "usuario": usuario.usuario,
        "email": usuario.email,
        "ativo": usuario.ativo,
    }


@router.post("/missoes", status_code=status.HTTP_201_CREATED)
def criar_missao(
    payload: MissaoCreatePayload,
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
):
    try:
        missao = missao_service.criar_missao(payload.model_dump(), usuario=usuario)
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro)) from erro
    return missao.to_dict()


@router.get("/missoes")
def listar_missoes(
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
):
    return [missao.to_dict() for missao in missao_service.listar_missoes(usuario=usuario)]


@router.patch("/missoes/{missao_id}")
def editar_missao(
    missao_id: int,
    payload: MissaoUpdatePayload,
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
):
    try:
        missao = missao_service.editar_missao(
            missao_id,
            payload.model_dump(exclude_unset=True),
            usuario=usuario,
        )
    except MissaoNaoEncontrada as erro:
        raise HTTPException(status_code=404, detail=str(erro)) from erro
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro)) from erro
    return missao.to_dict()


@router.patch("/missoes/{missao_id}/concluir")
def concluir_missao(
    missao_id: int,
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
):
    try:
        missao = missao_service.concluir_missao(missao_id, usuario=usuario)
    except MissaoNaoEncontrada as erro:
        raise HTTPException(status_code=404, detail=str(erro)) from erro
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro)) from erro
    return missao.to_dict()


@router.delete("/missoes/{missao_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_missao(
    missao_id: int,
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
):
    try:
        missao_service.remover_missao(missao_id, usuario=usuario)
    except MissaoNaoEncontrada as erro:
        raise HTTPException(status_code=404, detail=str(erro)) from erro


@router.get("/missoes/{missao_id}/historico")
def listar_historico(
    missao_id: int,
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
):
    try:
        eventos = missao_service.listar_historico(missao_id, usuario=usuario)
    except MissaoNaoEncontrada as erro:
        raise HTTPException(status_code=404, detail=str(erro)) from erro

    return [
        {
            "id": evento.evento_id,
            "missao_id": evento.missao_id,
            "usuario_id": evento.usuario_id,
            "acao": evento.acao,
            "detalhes": evento.detalhes,
            "criado_em": evento.criado_em.isoformat(),
        }
        for evento in eventos
    ]


app.include_router(router)
