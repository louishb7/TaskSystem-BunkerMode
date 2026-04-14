from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, Header, Request, status
from fastapi.responses import JSONResponse

from core_exceptions import MissaoNaoEncontrada
from db_config import ConfiguracaoBancoError, get_connection_string
from gerenciador import GerenciadorDeMissoes
from repositorio_postgres import ErroRepositorio, RepositorioPostgres
from services.auth_service import AuthService
from services.exceptions import (
    AutenticacaoError,
    PermissaoNegadaError,
    UsuarioJaExisteError,
    UsuarioNaoEncontrado,
)
from services.missao_service import MissaoService
from .schemas import (
    AuditoriaResponse,
    ErroResponse,
    LoginRequest,
    MensagemResponse,
    MissaoCreate,
    MissaoResponse,
    MissaoUpdate,
    MissaoV2Create,
    MissaoV2Update,
    TokenResponse,
    UsuarioCreate,
    UsuarioResponse,
)

app = FastAPI(
    title="BunkerMode Task System API",
    version="2.0.0",
    description=(
        "API HTTP do sistema BunkerMode. "
        "A v1 mantém compatibilidade com a base antiga, "
        "enquanto a v2 adiciona service layer, autenticação, usuários, "
        "multiusuário e auditoria."
    ),
)

router_v1 = APIRouter(prefix="/api/v1", tags=["Missões v1"])
router_v2 = APIRouter(prefix="/api/v2", tags=["Missões v2"])
auth_router = APIRouter(prefix="/api/v2/auth", tags=["Auth"])
user_router = APIRouter(prefix="/api/v2/usuarios", tags=["Usuários"])


def get_repositorio() -> RepositorioPostgres:
    repositorio = RepositorioPostgres(get_connection_string())
    repositorio.inicializar_schema()
    return repositorio


def get_gerenciador() -> GerenciadorDeMissoes:
    return GerenciadorDeMissoes(get_repositorio())


def get_missao_service() -> MissaoService:
    return MissaoService(get_repositorio())


def get_auth_service() -> AuthService:
    return AuthService(get_repositorio())


GerenciadorDep = Annotated[GerenciadorDeMissoes, Depends(get_gerenciador)]
MissaoServiceDep = Annotated[MissaoService, Depends(get_missao_service)]
AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


@app.exception_handler(MissaoNaoEncontrada)
async def tratar_missao_nao_encontrada(request: Request, exc: MissaoNaoEncontrada):
    return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"detail": str(exc)})


@app.exception_handler(UsuarioNaoEncontrado)
async def tratar_usuario_nao_encontrado(request: Request, exc: UsuarioNaoEncontrado):
    return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"detail": str(exc)})


@app.exception_handler(ValueError)
async def tratar_value_error(request: Request, exc: ValueError):
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"detail": str(exc)})


@app.exception_handler(UsuarioJaExisteError)
async def tratar_usuario_ja_existe(request: Request, exc: UsuarioJaExisteError):
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"detail": str(exc)})


@app.exception_handler(AutenticacaoError)
async def tratar_erro_autenticacao(request: Request, exc: AutenticacaoError):
    return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"detail": str(exc)})


@app.exception_handler(PermissaoNegadaError)
async def tratar_erro_permissao(request: Request, exc: PermissaoNegadaError):
    return JSONResponse(status_code=status.HTTP_403_FORBIDDEN, content={"detail": str(exc)})


@app.exception_handler(ConfiguracaoBancoError)
async def tratar_erro_configuracao_banco(request: Request, exc: ConfiguracaoBancoError):
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"detail": str(exc)})


@app.exception_handler(ErroRepositorio)
async def tratar_erro_repositorio(request: Request, exc: ErroRepositorio):
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"detail": str(exc)})


def _extrair_token(authorization: str | None) -> str:
    if not authorization:
        raise AutenticacaoError("Token de acesso não informado.")
    prefixo, _, token = authorization.partition(" ")
    if prefixo.lower() != "bearer" or not token:
        raise AutenticacaoError("Cabeçalho Authorization inválido.")
    return token


def get_current_user(
    auth_service: AuthServiceDep,
    authorization: Annotated[str | None, Header()] = None,
):
    token = _extrair_token(authorization)
    return auth_service.obter_usuario_por_token(token)


CurrentUserDep = Annotated[object, Depends(get_current_user)]


@router_v1.post("/missoes", status_code=status.HTTP_201_CREATED, response_model=MissaoResponse)
def criar_missao(dados: MissaoCreate, gerenciador: GerenciadorDep):
    missao = gerenciador.adicionar_missao(dados.model_dump())
    return MissaoResponse.from_entity(missao)


@router_v1.get("/missoes", response_model=list[MissaoResponse])
def listar_missoes(gerenciador: GerenciadorDep):
    return [MissaoResponse.from_entity(m) for m in gerenciador.listar_missoes()]


@router_v1.get("/missoes/{missao_id}", response_model=MissaoResponse)
def detalhar_missao(missao_id: int, gerenciador: GerenciadorDep):
    return MissaoResponse.from_entity(gerenciador.detalhar_missao(missao_id))


@router_v1.patch("/missoes/{missao_id}", response_model=MissaoResponse)
def atualizar_missao(missao_id: int, dados: MissaoUpdate, gerenciador: GerenciadorDep):
    missao = gerenciador.editar_missao(missao_id, dados.model_dump(exclude_none=True))
    return MissaoResponse.from_entity(missao)


@router_v1.patch("/missoes/{missao_id}/concluir", response_model=MissaoResponse)
def concluir_missao(missao_id: int, gerenciador: GerenciadorDep):
    return MissaoResponse.from_entity(gerenciador.concluir_missao(missao_id))


@router_v1.delete("/missoes/{missao_id}", response_model=MensagemResponse)
def remover_missao(missao_id: int, gerenciador: GerenciadorDep):
    missao = gerenciador.remover_missao(missao_id)
    return MensagemResponse(mensagem=f"Missão '{missao.titulo}' removida com sucesso")


@auth_router.post("/register", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def registrar_usuario(dados: UsuarioCreate, auth_service: AuthServiceDep):
    usuario = auth_service.registrar_usuario(dados.model_dump())
    return UsuarioResponse.from_entity(usuario)


@auth_router.post("/login", response_model=TokenResponse)
def login(dados: LoginRequest, auth_service: AuthServiceDep):
    resultado = auth_service.autenticar(dados.username, dados.senha)
    return TokenResponse(
        access_token=resultado["access_token"],
        token_type=resultado["token_type"],
        usuario=UsuarioResponse.from_entity(resultado["usuario"]),
    )


@user_router.get("/me", response_model=UsuarioResponse)
def me(usuario_atual: CurrentUserDep):
    return UsuarioResponse.from_entity(usuario_atual)


@router_v2.post("/missoes", response_model=MissaoResponse, status_code=status.HTTP_201_CREATED)
def criar_missao_v2(dados: MissaoV2Create, service: MissaoServiceDep, usuario_atual: CurrentUserDep):
    missao = service.criar_missao(dados.model_dump(), actor=usuario_atual)
    return MissaoResponse.from_entity(missao)


@router_v2.get("/missoes", response_model=list[MissaoResponse])
def listar_missoes_v2(service: MissaoServiceDep, usuario_atual: CurrentUserDep):
    return [MissaoResponse.from_entity(m) for m in service.listar_missoes(actor=usuario_atual)]


@router_v2.get("/missoes/{missao_id}", response_model=MissaoResponse)
def detalhar_missao_v2(missao_id: int, service: MissaoServiceDep, usuario_atual: CurrentUserDep):
    return MissaoResponse.from_entity(service.detalhar_missao(missao_id, actor=usuario_atual))


@router_v2.patch("/missoes/{missao_id}", response_model=MissaoResponse)
def atualizar_missao_v2(missao_id: int, dados: MissaoV2Update, service: MissaoServiceDep, usuario_atual: CurrentUserDep):
    missao = service.editar_missao(missao_id, dados.model_dump(exclude_none=False, exclude_unset=True), actor=usuario_atual)
    return MissaoResponse.from_entity(missao)


@router_v2.patch("/missoes/{missao_id}/concluir", response_model=MissaoResponse)
def concluir_missao_v2(missao_id: int, service: MissaoServiceDep, usuario_atual: CurrentUserDep):
    return MissaoResponse.from_entity(service.concluir_missao(missao_id, actor=usuario_atual))


@router_v2.delete("/missoes/{missao_id}", response_model=MensagemResponse)
def remover_missao_v2(missao_id: int, service: MissaoServiceDep, usuario_atual: CurrentUserDep):
    missao = service.remover_missao(missao_id, actor=usuario_atual)
    return MensagemResponse(mensagem=f"Missão '{missao.titulo}' removida com sucesso")


@router_v2.get("/missoes/{missao_id}/historico", response_model=list[AuditoriaResponse])
def historico_missao_v2(missao_id: int, service: MissaoServiceDep, usuario_atual: CurrentUserDep):
    eventos = service.listar_historico(missao_id, actor=usuario_atual)
    return [AuditoriaResponse.from_entity(evento) for evento in eventos]


app.include_router(router_v1)
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(router_v2)
