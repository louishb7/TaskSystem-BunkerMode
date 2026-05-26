from backend.routes.common import *


router = APIRouter(prefix="/api/v2", tags=["operacoes"])


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

