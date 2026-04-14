from pydantic import BaseModel, Field


class RegistroPayload(BaseModel):
    username: str = Field(min_length=3)
    nome: str = Field(min_length=1)
    papel: str
    senha: str = Field(min_length=6)


class LoginPayload(BaseModel):
    username: str = Field(min_length=3)
    senha: str = Field(min_length=6)


class MissaoCreatePayload(BaseModel):
    titulo: str = Field(min_length=1)
    prioridade: int
    prazo: str | None = None
    instrucao: str = Field(min_length=1)
    responsavel_id: int | None = None
