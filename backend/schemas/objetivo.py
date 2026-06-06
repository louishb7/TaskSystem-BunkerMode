from typing import Literal

from pydantic import BaseModel, Field


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


class ObjetivoOrderPayload(BaseModel):
    objetivo_ids: list[int] = Field(min_length=1)
