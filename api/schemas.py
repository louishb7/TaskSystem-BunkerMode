from typing import Literal

from pydantic import BaseModel, Field


class RegistroPayload(BaseModel):
    usuario: str = Field(min_length=3)
    email: str = Field(min_length=5)
    senha: str = Field(min_length=6)


class LoginPayload(BaseModel):
    email: str = Field(min_length=5)
    senha: str = Field(min_length=6)


class NomeGeneralPayload(BaseModel):
    nome_general: str = Field(min_length=1)


class SessionModePayload(BaseModel):
    mode: str = Field(min_length=1)


class UnlockGeneralPayload(BaseModel):
    senha: str = Field(min_length=1)


class PlanningWindowPayload(BaseModel):
    planning_window: Literal["morning", "afternoon", "night"]


class TimezonePayload(BaseModel):
    timezone: str = Field(min_length=1)


class SoldierExcusePayload(BaseModel):
    reason: str = Field(min_length=1)


class FailureJustificationPayload(BaseModel):
    failure_reason_type: Literal[
        "not_done",
        "done_not_marked",
        "partially_done",
        "external_blocker",
        "other",
    ]
    failure_reason: str = Field(min_length=1)


class GeneralVerdictPayload(BaseModel):
    verdict: str = Field(min_length=1)


class RevisaoJustificativaPayload(BaseModel):
    accepted: bool


# Compatibilidade legada: prioridade permanece no contrato e no banco.
# A experiência do produto não expõe mais os níveis antigos ao usuário.
LEGACY_DEFAULT_PRIORITY = 2


class MissaoCreatePayload(BaseModel):
    titulo: str = Field(min_length=1)
    prioridade: int = LEGACY_DEFAULT_PRIORITY
    prazo: str | None = None
    instrucao: str | None = None
    responsavel_id: int | None = None


class MissaoUpdatePayload(BaseModel):
    titulo: str | None = Field(default=None, min_length=1)
    prioridade: int | None = None
    prazo: str | None = None
    instrucao: str | None = None
    status: str | None = None


class LimparRelatorioFalhasPayload(BaseModel):
    start_date: str | None = None
    end_date: str | None = None
