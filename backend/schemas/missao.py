from typing import Literal

from pydantic import BaseModel, Field

from backend.models.missao import MISSAO_INSTRUCAO_MAX_LENGTH


class SoldierExcusePayload(BaseModel):
    reason: str | None = None


class FailureJustificationPayload(BaseModel):
    failure_reason_type: Literal[
        "not_done",
        "done_not_marked",
        "partially_done",
        "external_blocker",
        "other",
    ] | None = None
    failure_reason: str | None = None


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
    instrucao: str | None = Field(default=None, max_length=MISSAO_INSTRUCAO_MAX_LENGTH)
    responsavel_id: int | None = None
    objetivo_id: int | None = None
    sonho_id: int | None = None
    recurrence_weekdays: list[int] | None = None
    recurrence_end_date: str | None = None
    duration_type: Literal["pontual", "ate_objetivo", "prazo"] | None = None


class MissaoUpdatePayload(BaseModel):
    titulo: str | None = Field(default=None, min_length=1)
    prioridade: int | None = None
    prazo: str | None = None
    instrucao: str | None = Field(default=None, max_length=MISSAO_INSTRUCAO_MAX_LENGTH)
    status: str | None = None
    objetivo_id: int | None = None
    sonho_id: int | None = None
    recurrence_weekdays: list[int] | None = None
    recurrence_end_date: str | None = None
    duration_type: Literal["pontual", "ate_objetivo", "prazo"] | None = None
