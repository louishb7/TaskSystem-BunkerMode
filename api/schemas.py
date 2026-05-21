from typing import Literal

from pydantic import BaseModel, Field

from missao import MISSAO_INSTRUCAO_MAX_LENGTH


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
    recurrence_weekdays: list[int] | None = None
    recurrence_end_date: str | None = None
    duration_type: Literal["pontual", "ate_objetivo", "prazo"] | None = None


class SonhoCreatePayload(BaseModel):
    titulo: str = Field(min_length=1, max_length=200)
    descricao: str | None = None
    tipo: Literal["principal", "secundario"]


class SonhoUpdatePayload(BaseModel):
    titulo: str | None = Field(default=None, min_length=1, max_length=200)
    descricao: str | None = None


class SonhoArquivarPayload(BaseModel):
    justificativa: str = Field(min_length=1)


class ObjetivoCreatePayload(BaseModel):
    titulo: str = Field(min_length=1, max_length=200)
    descricao: str | None = None
    data_alvo: str | None = None
    sonho_id: int | None = None
    progresso: int = Field(default=0, ge=0, le=100)


class ObjetivoUpdatePayload(BaseModel):
    titulo: str | None = Field(default=None, min_length=1, max_length=200)
    descricao: str | None = None
    data_alvo: str | None = None
    sonho_id: int | None = None
    progresso: int | None = Field(default=None, ge=0, le=100)


class ObjetivoProgressoPayload(BaseModel):
    progresso: int = Field(ge=0, le=100)


class ObjetivoStatusPayload(BaseModel):
    status: Literal["ativo", "concluido", "pausado", "abandonado"]


class LimparRelatorioFalhasPayload(BaseModel):
    start_date: str | None = None
    end_date: str | None = None


class FecharRevisaoPayload(BaseModel):
    observacao: str | None = None


class OperacaoCreatePayload(BaseModel):
    nome: str = Field(min_length=1)
    descricao: str | None = None
    start_date: str = Field(min_length=1)
    end_date: str = Field(min_length=1)
    weekdays: list[int] = Field(min_length=1)
    ordem_titulo: str = Field(min_length=1)
    ordem_instrucao: str | None = None


class OperacaoMaterializarPayload(BaseModel):
    start_date: str = Field(min_length=1)
    end_date: str = Field(min_length=1)
