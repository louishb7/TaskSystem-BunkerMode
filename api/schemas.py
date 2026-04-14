from pydantic import BaseModel
from datetime import date

class MissaoCreate(BaseModel):
    titulo: str
    prioridade: int
    prazo: date
    descricao: str

class MissaoResponse(BaseModel):
    id: int
    titulo: str
    prioridade: int
    prazo: date
    status: str
