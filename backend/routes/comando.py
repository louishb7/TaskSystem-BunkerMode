from backend.routes.common import *
from backend.services.comando_service import ComandoService


router = APIRouter(prefix="/api/v2", tags=["comando"])


def get_comando_service(
    repositorio: RepositorioPostgres = Depends(get_repositorio),
) -> ComandoService:
    return ComandoService(repositorio)


@router.get("/comando-general/suporte")
def obter_suporte_general(
    usuario=Depends(get_current_user),
    comando_service: ComandoService = Depends(get_comando_service),
):
    try:
        return comando_service.obter_suporte_general(usuario)
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)
