from backend.routes.common import *


router = APIRouter(prefix="/api/v2", tags=["missoes"])


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

