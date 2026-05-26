from backend.routes.common import *


router = APIRouter(prefix="/api/v2", tags=["revisoes"])


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
