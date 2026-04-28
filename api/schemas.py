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


class MissaoCreatePayload(BaseModel):
    titulo: str = Field(min_length=1)
    prioridade: int
    prazo: str | None = None
    instrucao: str = Field(min_length=1)
    responsavel_id: int | None = None


class MissaoUpdatePayload(BaseModel):
    titulo: str | None = Field(default=None, min_length=1)
    prioridade: int | None = None
    prazo: str | None = None
    instrucao: str | None = Field(default=None, min_length=1)
    status: str | None = None
