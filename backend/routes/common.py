import os

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
    ObjetivoProgressoPayload,
    ObjetivoStatusPayload,
    ObjetivoUpdatePayload,
    OperacaoCreatePayload,
    OperacaoMaterializarPayload,
    PlanningWindowPayload,
    RevisaoJustificativaPayload,
    RegistroPayload,
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

def get_auth_service() -> AuthService:
    return AuthService(RepositorioPostgres(get_connection_string()))


def get_missao_service() -> MissaoService:
    return MissaoService(RepositorioPostgres(get_connection_string()))


def get_relatorio_service() -> RelatorioService:
    return RelatorioService(RepositorioPostgres(get_connection_string()))


def get_revisao_service() -> RevisaoService:
    return RevisaoService(RepositorioPostgres(get_connection_string()))


def get_operacao_service() -> OperacaoService:
    return OperacaoService(RepositorioPostgres(get_connection_string()))


def get_sonho_service() -> SonhoService:
    return SonhoService(RepositorioPostgres(get_connection_string()))


def get_objetivo_service() -> ObjetivoService:
    return ObjetivoService(RepositorioPostgres(get_connection_string()))


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


def _get_registration_invite_code() -> str:
    invite_code = os.getenv("BUNKERMODE_REGISTRATION_INVITE_CODE", "").strip()
    if not invite_code:
        raise RuntimeError("Defina BUNKERMODE_REGISTRATION_INVITE_CODE antes de permitir cadastro.")
    return invite_code


def validate_registration_invite_configured() -> None:
    _get_registration_invite_code()


def _validate_registration_invite(payload: RegistroPayload) -> None:
    if (payload.invite_code or "").strip() != _get_registration_invite_code():
        raise HTTPException(status_code=403, detail="Código de convite inválido.")


__all__ = [name for name in globals() if not name.startswith("__")]
