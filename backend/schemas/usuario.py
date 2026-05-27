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
