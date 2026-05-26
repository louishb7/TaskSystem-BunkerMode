from backend.routes.common import *


router = APIRouter(prefix="/api/v2", tags=["usuarios"])


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
