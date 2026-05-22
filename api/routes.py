from fastapi import APIRouter, Depends, Header, HTTPException, status

from api.schemas import (
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
from services.objetivo_service import ObjetivoService
from services.operacao_service import OperacaoService
from services.operational_day import parse_iso_date
from services.relatorio_service import RelatorioService
from services.revisao_service import RevisaoService
from services.sonho_service import SonhoService

router = APIRouter(prefix="/api/v2", tags=["v2"])


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
    operacao_service: OperacaoService = Depends(get_operacao_service),
):
    materializar = (
        getattr(operacao_service, "materializar_turno_soldado", None)
        if getattr(usuario, "active_mode", "general") == "soldier"
        else getattr(operacao_service, "materializar_dia_operacional", None)
    )
    if callable(materializar):
        try:
            materializar(usuario=usuario)
        except (PermissaoNegadaError, ValueError) as erro:
            _raise_http_from_domain_error(erro)
    if getattr(usuario, "active_mode", "general") == "soldier":
        estado = missao_service.estado_turno_soldado(usuario=usuario)
        return missao_service.to_response_list(
            missao_service.listar_acoes_do_turno_soldado(usuario=usuario),
            usuario=usuario,
            reference_date=estado["active_date"],
        )
    return missao_service.to_response_list(
        missao_service.listar_missoes(usuario=usuario),
        usuario=usuario,
    )


@router.get("/missoes")
def listar_missoes(
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
    operacao_service: OperacaoService = Depends(get_operacao_service),
):
    return _listar_missoes_operacionais(
        usuario=usuario,
        missao_service=missao_service,
        operacao_service=operacao_service,
    )


@router.get("/missoes/operacionais")
def listar_missoes_operacionais(
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
    operacao_service: OperacaoService = Depends(get_operacao_service),
):
    return _listar_missoes_operacionais(
        usuario=usuario,
        missao_service=missao_service,
        operacao_service=operacao_service,
    )


@router.get("/missoes/dia-operacional")
def listar_missoes_do_dia_operacional(
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
    operacao_service: OperacaoService = Depends(get_operacao_service),
):
    materializar = (
        getattr(operacao_service, "materializar_turno_soldado", None)
        if getattr(usuario, "active_mode", "general") == "soldier"
        else getattr(operacao_service, "materializar_dia_operacional", None)
    )
    if callable(materializar):
        try:
            materializar(usuario=usuario)
        except (PermissaoNegadaError, ValueError) as erro:
            _raise_http_from_domain_error(erro)
    if getattr(usuario, "active_mode", "general") == "soldier":
        estado = missao_service.estado_turno_soldado(usuario=usuario)
        return missao_service.to_response_list(
            missao_service.listar_missoes_do_turno_soldado(usuario=usuario),
            usuario=usuario,
            reference_date=estado["active_date"],
        )
    return missao_service.to_response_list(
        missao_service.listar_missoes_do_dia_operacional(usuario=usuario),
        usuario=usuario,
    )


@router.get("/missoes/turno-operacional")
def obter_turno_operacional(
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
    operacao_service: OperacaoService = Depends(get_operacao_service),
):
    materializar = getattr(operacao_service, "materializar_turno_soldado", None)
    if callable(materializar):
        try:
            materializar(usuario=usuario)
        except (PermissaoNegadaError, ValueError) as erro:
            _raise_http_from_domain_error(erro)
    try:
        return missao_service.estado_turno_soldado(usuario=usuario)
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)


@router.get("/missoes/quadro-soldado")
def obter_quadro_soldado(
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
    operacao_service: OperacaoService = Depends(get_operacao_service),
):
    materializar = getattr(operacao_service, "materializar_turno_soldado", None)
    if callable(materializar):
        try:
            materializar(usuario=usuario)
        except (PermissaoNegadaError, ValueError) as erro:
            _raise_http_from_domain_error(erro)
    try:
        quadro = missao_service.quadro_turno_soldado(usuario=usuario)
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)
    return {
        "turn": quadro["turn"],
        "missions": missao_service.to_response_list(
            quadro["action_missions"],
            usuario=usuario,
            reference_date=quadro["turn"]["active_date"],
        ),
        "daily_missions": missao_service.to_response_list(
            quadro["daily_missions"],
            usuario=usuario,
            reference_date=quadro["turn"]["active_date"],
        ),
    }


@router.post("/missoes/turno-operacional/encerrar-pendencias")
def encerrar_pendencias_turno_operacional(
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
    operacao_service: OperacaoService = Depends(get_operacao_service),
):
    materializar = getattr(operacao_service, "materializar_turno_soldado", None)
    if callable(materializar):
        try:
            materializar(usuario=usuario)
        except (PermissaoNegadaError, ValueError) as erro:
            _raise_http_from_domain_error(erro)
    try:
        return missao_service.encerrar_pendencias_do_ciclo_anterior(usuario=usuario)
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)


@router.get("/operacoes")
def listar_operacoes(
    usuario=Depends(get_current_user),
    operacao_service: OperacaoService = Depends(get_operacao_service),
):
    try:
        return operacao_service.listar_operacoes(usuario=usuario)
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)


@router.post("/operacoes", status_code=status.HTTP_201_CREATED)
def criar_operacao(
    payload: OperacaoCreatePayload,
    usuario=Depends(get_current_user),
    operacao_service: OperacaoService = Depends(get_operacao_service),
):
    try:
        return operacao_service.criar_operacao(payload.model_dump(), usuario=usuario)
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)


@router.post("/operacoes/materializar")
def materializar_operacoes(
    payload: OperacaoMaterializarPayload,
    usuario=Depends(get_current_user),
    operacao_service: OperacaoService = Depends(get_operacao_service),
):
    try:
        return operacao_service.materializar_periodo(
            usuario=usuario,
            start_date=payload.start_date,
            end_date=payload.end_date,
        )
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)


@router.patch("/operacoes/{operacao_id}/encerrar")
def encerrar_operacao(
    operacao_id: int,
    usuario=Depends(get_current_user),
    operacao_service: OperacaoService = Depends(get_operacao_service),
):
    try:
        return operacao_service.encerrar_operacao(operacao_id, usuario=usuario)
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)


@router.delete("/operacoes/{operacao_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancelar_operacao(
    operacao_id: int,
    usuario=Depends(get_current_user),
    operacao_service: OperacaoService = Depends(get_operacao_service),
):
    try:
        operacao_service.cancelar_operacao(operacao_id, usuario=usuario)
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)


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


@router.post("/missoes/{missao_id}/falhar")
def registrar_falha_missao(
    missao_id: int,
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
):
    try:
        missao = missao_service.registrar_falha_missao(missao_id, usuario=usuario)
    except (MissaoNaoEncontrada, PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)
    return missao_service.to_response(missao, usuario=usuario)


@router.patch("/missoes/{missao_id}/toggle-pin")
def alternar_prioridade_missao(
    missao_id: int,
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
):
    try:
        missao = missao_service.alternar_prioridade_fixada(missao_id, usuario=usuario)
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


@router.post("/relatorios/falhas/limpar")
def limpar_relatorio_falhas(
    payload: LimparRelatorioFalhasPayload,
    usuario=Depends(get_current_user),
    missao_service: MissaoService = Depends(get_missao_service),
):
    try:
        inicio = _parse_query_date(payload.start_date)
        fim = _parse_query_date(payload.end_date)
        missoes = missao_service.limpar_relatorio_falhas(
            usuario=usuario,
            start_date=inicio,
            end_date=fim,
        )
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)

    return missao_service.to_response_list(missoes, usuario=usuario)


@router.get("/revisoes/estado")
def obter_estado_revisao(
    usuario=Depends(get_current_user),
    revisao_service: RevisaoService = Depends(get_revisao_service),
):
    try:
        return revisao_service.obter_estado(usuario)
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)


@router.get("/revisoes")
def listar_revisoes(
    usuario=Depends(get_current_user),
    revisao_service: RevisaoService = Depends(get_revisao_service),
):
    try:
        return revisao_service.listar_revisoes(usuario)
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)


@router.post("/revisoes/fechar", status_code=status.HTTP_201_CREATED)
def fechar_revisao(
    payload: FecharRevisaoPayload,
    usuario=Depends(get_current_user),
    revisao_service: RevisaoService = Depends(get_revisao_service),
):
    try:
        return revisao_service.fechar_revisao(usuario, observacao=payload.observacao)
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)


def _parse_query_date(raw_value: str | None):
    return parse_iso_date(raw_value, "Datas do relatório devem usar o formato YYYY-MM-DD.")
