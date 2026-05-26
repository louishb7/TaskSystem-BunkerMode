from typing import Literal

from pydantic import BaseModel, Field


class SonhoCreatePayload(BaseModel):
    titulo: str = Field(min_length=1, max_length=200)
    descricao: str | None = None
    tipo: Literal["principal", "secundario"]


class SonhoUpdatePayload(BaseModel):
    titulo: str | None = Field(default=None, min_length=1, max_length=200)
    descricao: str | None = None


class SonhoArquivarPayload(BaseModel):
    justificativa: str = Field(min_length=1)
