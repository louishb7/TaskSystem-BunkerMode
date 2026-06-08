from fastapi import APIRouter, Depends, Header, HTTPException, status

from backend.schemas import (
    FecharRevisaoPayload,
    FailureJustificationPayload,
    GeneralVerdictPayload,
    LimparRelatorioFalhasPayload,
    LoginPayload,
    MissaoCreatePayload,
    MissaoUpdatePayload,
    NomeGeneralPayload,
    ObjetivoCreatePayload,
    ObjetivoOrderPayload,
    ObjetivoProgressoPayload,
    ObjetivoStatusPayload,
    ObjetivoUpdatePayload,
    OperacaoCreatePayload,
    OperacaoMaterializarPayload,
    PlanningWindowPayload,
    RevisaoJustificativaPayload,
    SessionModePayload,
    SonhoArquivarPayload,
    SonhoCreatePayload,
    SonhoUpdatePayload,
    SoldierExcusePayload,
    TimezonePayload,
    UnlockGeneralPayload,
)
from backend.core.exceptions import MissaoNaoEncontrada
from backend.core.settings import get_connection_string
from backend.database.repositorio import RepositorioPostgres
from backend.services.auth_service import AuthService
from backend.services.exceptions import (
    AutenticacaoError,
    PermissaoNegadaError,
    UsuarioJaExisteError,
    UsuarioNaoEncontrado,
)
from backend.services.missao_service import MissaoService
from backend.services.objetivo_service import ObjetivoService
from backend.services.operacao_service import OperacaoService
from backend.services.operational_day import parse_iso_date
from backend.services.relatorio_service import RelatorioService
from backend.services.revisao_service import RevisaoService
from backend.services.sonho_service import SonhoService


def get_repositorio() -> RepositorioPostgres:
    repositorio = RepositorioPostgres(get_connection_string())
    try:
        yield repositorio
    finally:
        repositorio.fechar()


def get_auth_service(
    repositorio: RepositorioPostgres = Depends(get_repositorio),
) -> AuthService:
    return AuthService(repositorio)


def get_missao_service(
    repositorio: RepositorioPostgres = Depends(get_repositorio),
) -> MissaoService:
    return MissaoService(repositorio)


def get_relatorio_service(
    repositorio: RepositorioPostgres = Depends(get_repositorio),
) -> RelatorioService:
    return RelatorioService(repositorio)


def get_revisao_service(
    repositorio: RepositorioPostgres = Depends(get_repositorio),
) -> RevisaoService:
    return RevisaoService(repositorio)


def get_operacao_service(
    repositorio: RepositorioPostgres = Depends(get_repositorio),
) -> OperacaoService:
    return OperacaoService(repositorio)


def get_sonho_service(
    repositorio: RepositorioPostgres = Depends(get_repositorio),
) -> SonhoService:
    return SonhoService(repositorio)


def get_objetivo_service(
    repositorio: RepositorioPostgres = Depends(get_repositorio),
) -> ObjetivoService:
    return ObjetivoService(repositorio)


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


__all__ = [
    "APIRouter",
    "Depends",
    "Header",
    "HTTPException",
    "status",
    "FecharRevisaoPayload",
    "FailureJustificationPayload",
    "GeneralVerdictPayload",
    "LimparRelatorioFalhasPayload",
    "LoginPayload",
    "MissaoCreatePayload",
    "MissaoUpdatePayload",
    "NomeGeneralPayload",
    "ObjetivoCreatePayload",
    "ObjetivoOrderPayload",
    "ObjetivoProgressoPayload",
    "ObjetivoStatusPayload",
    "ObjetivoUpdatePayload",
    "OperacaoCreatePayload",
    "OperacaoMaterializarPayload",
    "PlanningWindowPayload",
    "RevisaoJustificativaPayload",
    "SessionModePayload",
    "SonhoArquivarPayload",
    "SonhoCreatePayload",
    "SonhoUpdatePayload",
    "SoldierExcusePayload",
    "TimezonePayload",
    "UnlockGeneralPayload",
    "MissaoNaoEncontrada",
    "UsuarioNaoEncontrado",
    "UsuarioJaExisteError",
    "AutenticacaoError",
    "PermissaoNegadaError",
    "RepositorioPostgres",
    "AuthService",
    "MissaoService",
    "ObjetivoService",
    "OperacaoService",
    "RelatorioService",
    "RevisaoService",
    "SonhoService",
    "get_repositorio",
    "get_auth_service",
    "get_missao_service",
    "get_relatorio_service",
    "get_revisao_service",
    "get_operacao_service",
    "get_sonho_service",
    "get_objetivo_service",
    "get_current_user",
    "_raise_http_from_domain_error",
    "_usuario_to_response",
    "parse_iso_date",
]
