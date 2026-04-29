import os
from datetime import datetime

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from api.schemas import (
    FailureJustificationPayload,
    GeneralVerdictPayload,
    LoginPayload,
    MissaoCreatePayload,
    MissaoUpdatePayload,
    NomeGeneralPayload,
    PlanningWindowPayload,
    RevisaoJustificativaPayload,
    RegistroPayload,
    SessionModePayload,
    SoldierExcusePayload,
    TimezonePayload,
    UnlockGeneralPayload,
)
from core_exceptions import MissaoNaoEncontrada
from db_config import get_connection_string
from repositorio_postgres import RepositorioPostgres
from services.auth_service import AuthService
from services.exceptions import (
    AutenticacaoError,
    PermissaoNegadaError,
    UsuarioJaExisteError,
    UsuarioNaoEncontrado,
)
from services.missao_service import MissaoService
from services.relatorio_service import RelatorioService

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


def get_relatorio_service() -> RelatorioService:
    return RelatorioService(RepositorioPostgres(get_connection_string()))


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


def _raise_http_from_domain_error(erro: Exception) -> None:
    if isinstance(erro, MissaoNaoEncontrada):
        raise HTTPException(status_code=404, detail=str(erro)) from erro
    if isinstance(erro, PermissaoNegadaError):
        raise HTTPException(status_code=403, detail=str(erro)) from erro
    if isinstance(erro, UsuarioNaoEncontrado):
        raise HTTPException(status_code=400, detail=str(erro)) from erro
    if isinstance(erro, ValueError):
        raise HTTPException(status_code=400, detail=str(erro)) from erro
    raise erro


def _usuario_to_response(usuario, include_ativo: bool = True) -> dict:
    response = {
        "id": usuario.usuario_id,
        "usuario": usuario.usuario,
        "email": usuario.email,
        "nome_general": usuario.nome_general,
        "active_mode": usuario.active_mode,
        "planning_window": usuario.planning_window,
        "timezone": usuario.timezone,
        "emergency_unlock_date": (
            None
            if usuario.emergency_unlock_date is None
            else usuario.emergency_unlock_date.isoformat()
        ),
        "timezone_updated_at": (
            None
            if usuario.timezone_updated_at is None
            else usuario.timezone_updated_at.isoformat()
        ),
    }
    if include_ativo:
        response["ativo"] = usuario.ativo
    return response


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


@router.get("/usuarios/me")
def obter_usuario_atual(usuario=Depends(get_current_user)):
    return _usuario_to_response(usuario)


@router.patch("/usuarios/me/nome-general")
def definir_nome_general(
    payload: NomeGeneralPayload,
    usuario=Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        usuario_atualizado = auth_service.definir_nome_general(
            usuario.usuario_id,
            payload.nome_general,
        )
    except PermissaoNegadaError as erro:
        _raise_http_from_domain_error(erro)
    except (UsuarioNaoEncontrado, ValueError) as erro:
        raise HTTPException(status_code=400, detail=str(erro)) from erro

    return _usuario_to_response(usuario_atualizado)


@router.patch("/session/mode")
def atualizar_modo_sessao(
    payload: SessionModePayload,
    usuario=Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        usuario_atualizado = auth_service.alterar_modo(usuario.usuario_id, payload.mode)
    except (UsuarioNaoEncontrado, ValueError) as erro:
        raise HTTPException(status_code=400, detail=str(erro)) from erro

    return _usuario_to_response(usuario_atualizado)


@router.post("/session/unlock-general")
def liberar_general(
    payload: UnlockGeneralPayload,
    usuario=Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        usuario_atualizado = auth_service.liberar_general(usuario.usuario_id, payload.senha)
    except AutenticacaoError as erro:
        raise HTTPException(status_code=401, detail=str(erro)) from erro
    except PermissaoNegadaError as erro:
        _raise_http_from_domain_error(erro)
    except (UsuarioNaoEncontrado, ValueError) as erro:
        raise HTTPException(status_code=400, detail=str(erro)) from erro

    return _usuario_to_response(usuario_atualizado)


@router.patch("/usuarios/me/planning-window")
def alterar_turno_planejamento(
    payload: PlanningWindowPayload,
    usuario=Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        usuario_atualizado = auth_service.alterar_turno_planejamento(
            usuario.usuario_id,
            payload.planning_window,
        )
    except (PermissaoNegadaError, UsuarioNaoEncontrado, ValueError) as erro:
        _raise_http_from_domain_error(erro)

    return _usuario_to_response(usuario_atualizado)


@router.patch("/usuarios/me/timezone")
def alterar_timezone(
    payload: TimezonePayload,
    usuario=Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        usuario_atualizado = auth_service.alterar_timezone(
            usuario.usuario_id,
            payload.timezone,
        )
    except (PermissaoNegadaError, UsuarioNaoEncontrado, ValueError) as erro:
        _raise_http_from_domain_error(erro)

    return _usuario_to_response(usuario_atualizado)


@router.post("/missoes", status_code=status.HTTP_201_CREATED)
def criar_missao(
    payload: MissaoCreatePayload,
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
):
    try:
        missao = missao_service.criar_missao(payload.model_dump(), usuario=usuario)
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)
    return missao_service.to_response(missao, usuario=usuario)


def _listar_missoes_operacionais(
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
):
    return missao_service.to_response_list(
        missao_service.listar_missoes(usuario=usuario),
        usuario=usuario,
    )


@router.get("/missoes")
def listar_missoes(
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
):
    return _listar_missoes_operacionais(usuario=usuario, missao_service=missao_service)


@router.get("/missoes/operacionais")
def listar_missoes_operacionais(
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
):
    return _listar_missoes_operacionais(usuario=usuario, missao_service=missao_service)


@router.get("/missoes/revisao")
def listar_missoes_em_revisao(
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
):
    try:
        missoes = missao_service.listar_missoes_para_revisao(usuario=usuario)
    except PermissaoNegadaError as erro:
        _raise_http_from_domain_error(erro)
    return missao_service.to_response_list(missoes, usuario=usuario)


@router.get("/missoes/historico")
def listar_missoes_historicas(
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
):
    try:
        missoes = missao_service.listar_missoes_historicas(usuario=usuario)
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)
    return missao_service.to_response_list(missoes, usuario=usuario)


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
    except (MissaoNaoEncontrada, PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)
    return missao_service.to_response(missao, usuario=usuario)


@router.patch("/missoes/{missao_id}/concluir")
def concluir_missao(
    missao_id: int,
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
):
    try:
        missao = missao_service.concluir_missao(missao_id, usuario=usuario)
    except (MissaoNaoEncontrada, PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)
    return missao_service.to_response(missao, usuario=usuario)


@router.patch("/missoes/{missao_id}/toggle-decided")
def alternar_decisao_missao(
    missao_id: int,
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
):
    try:
        missao = missao_service.alternar_decisao(missao_id, usuario=usuario)
    except (MissaoNaoEncontrada, PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)
    return missao_service.to_response(missao, usuario=usuario)


@router.post("/missoes/{missao_id}/soldier-excuse")
def registrar_justificativa_soldado(
    missao_id: int,
    payload: SoldierExcusePayload,
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
):
    try:
        missao = missao_service.registrar_justificativa_soldado(
            missao_id,
            payload.reason,
            usuario=usuario,
        )
    except (MissaoNaoEncontrada, PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)
    return missao_service.to_response(missao, usuario=usuario)


@router.post("/missoes/{missao_id}/justification")
def registrar_justificativa_falha(
    missao_id: int,
    payload: FailureJustificationPayload,
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
):
    try:
        missao = missao_service.registrar_justificativa_falha(
            missao_id,
            payload.failure_reason_type,
            payload.failure_reason,
            usuario=usuario,
        )
    except (MissaoNaoEncontrada, PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)
    return missao_service.to_response(missao, usuario=usuario)


@router.post("/missoes/{missao_id}/justificar")
def justificar_missao(
    missao_id: int,
    payload: SoldierExcusePayload,
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
):
    return registrar_justificativa_soldado(
        missao_id=missao_id,
        payload=payload,
        usuario=usuario,
        missao_service=missao_service,
    )


@router.post("/missoes/{missao_id}/general-verdict")
def registrar_veredito_general(
    missao_id: int,
    payload: GeneralVerdictPayload,
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
):
    try:
        missao = missao_service.registrar_veredito_general(
            missao_id,
            payload.verdict,
            usuario=usuario,
        )
    except (MissaoNaoEncontrada, PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)
    return missao_service.to_response(missao, usuario=usuario)


@router.post("/missoes/{missao_id}/revisar")
def revisar_justificativa(
    missao_id: int,
    payload: RevisaoJustificativaPayload,
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
):
    try:
        missao = missao_service.revisar_justificativa(
            missao_id,
            payload.accepted,
            usuario=usuario,
        )
    except (MissaoNaoEncontrada, PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)
    return missao_service.to_response(missao, usuario=usuario)


@router.delete("/missoes/{missao_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_missao(
    missao_id: int,
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
):
    try:
        missao_service.remover_missao(missao_id, usuario=usuario)
    except (MissaoNaoEncontrada, PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)


@router.get("/missoes/{missao_id}/historico")
def listar_historico(
    missao_id: int,
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
):
    try:
        eventos = missao_service.listar_historico(missao_id, usuario=usuario)
    except (MissaoNaoEncontrada, PermissaoNegadaError) as erro:
        _raise_http_from_domain_error(erro)

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


@router.get("/relatorios/semanal")
def obter_relatorio_semanal(
    start_date: str | None = None,
    end_date: str | None = None,
    usuario=Depends(get_current_user),
    relatorio_service: RelatorioService = Depends(get_relatorio_service),
):
    try:
        inicio = _parse_query_date(start_date)
        fim = _parse_query_date(end_date)
        return relatorio_service.get_weekly_report_for_user(usuario, inicio, fim)
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)


def _parse_query_date(raw_value: str | None):
    if raw_value is None:
        return None
    try:
        return datetime.strptime(raw_value, "%Y-%m-%d").date()
    except ValueError as erro:
        raise ValueError("Datas do relatório devem usar o formato YYYY-MM-DD.") from erro


app.include_router(router)
