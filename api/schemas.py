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
