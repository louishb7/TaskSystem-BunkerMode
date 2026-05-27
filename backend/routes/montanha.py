from backend.routes.common import *
from backend.services.montanha_service import MontanhaService


router = APIRouter(prefix="/api/v2", tags=["montanha"])


def get_montanha_service(
    repositorio: RepositorioPostgres = Depends(get_repositorio),
) -> MontanhaService:
    return MontanhaService(repositorio)


@router.get("/montanha")
def obter_montanha(
    usuario=Depends(get_current_user),
    montanha_service: MontanhaService = Depends(get_montanha_service),
):
    try:
        return montanha_service.obter_montanha(usuario)
    except (PermissaoNegadaError, ValueError) as erro:
        _raise_http_from_domain_error(erro)
