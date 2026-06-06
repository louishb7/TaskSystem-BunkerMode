from backend.schemas.missao import (
    FailureJustificationPayload,
    GeneralVerdictPayload,
    MissaoCreatePayload,
    MissaoUpdatePayload,
    RevisaoJustificativaPayload,
    SoldierExcusePayload,
)
from backend.schemas.objetivo import (
    ObjetivoCreatePayload,
    ObjetivoOrderPayload,
    ObjetivoProgressoPayload,
    ObjetivoStatusPayload,
    ObjetivoUpdatePayload,
)
from backend.schemas.operacao import OperacaoCreatePayload, OperacaoMaterializarPayload
from backend.schemas.revisao import FecharRevisaoPayload, LimparRelatorioFalhasPayload
from backend.schemas.sonho import SonhoArquivarPayload, SonhoCreatePayload, SonhoUpdatePayload
from backend.schemas.usuario import (
    LoginPayload,
    NomeGeneralPayload,
    PlanningWindowPayload,
    RegistroPayload,
    SessionModePayload,
    TimezonePayload,
    UnlockGeneralPayload,
)

__all__ = [name for name in globals() if name.endswith("Payload")]
