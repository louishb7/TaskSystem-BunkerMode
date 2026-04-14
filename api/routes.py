from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, Request, status
from fastapi.responses import JSONResponse

from db_config import ConfiguracaoBancoError, get_connection_string
from gerenciador import GerenciadorDeMissoes, MissaoNaoEncontrada
from repositorio_postgres import ErroRepositorio, RepositorioPostgres
from .schemas import (
    ErroResponse,
    MensagemResponse,
    MissaoCreate,
    MissaoResponse,
    MissaoUpdate,
)

app = FastAPI(
    title="BunkerMode Task System API",
    version="1.0.0",
    description=(
        "API HTTP do sistema BunkerMode. "
        "Esta versão formaliza contratos de entrada e saída, "
        "usa injeção de dependência do FastAPI e documenta respostas."
    ),
)

router = APIRouter(prefix="/api/v1", tags=["Missões"])


def get_gerenciador() -> GerenciadorDeMissoes:
    connection_string = get_connection_string()
    repositorio = RepositorioPostgres(connection_string)
    return GerenciadorDeMissoes(repositorio)


GerenciadorDep = Annotated[GerenciadorDeMissoes, Depends(get_gerenciador)]


@app.exception_handler(MissaoNaoEncontrada)
async def tratar_missao_nao_encontrada(
    request: Request, exc: MissaoNaoEncontrada
):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": str(exc)},
    )


@app.exception_handler(ValueError)
async def tratar_erro_de_validacao(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": str(exc)},
    )


@app.exception_handler(ConfiguracaoBancoError)
async def tratar_erro_configuracao_banco(
    request: Request, exc: ConfiguracaoBancoError
):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": str(exc)},
    )


@app.exception_handler(ErroRepositorio)
async def tratar_erro_repositorio(request: Request, exc: ErroRepositorio):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": str(exc)},
    )


@router.post(
    "/missoes",
    status_code=status.HTTP_201_CREATED,
    response_model=MissaoResponse,
    summary="Criar uma nova missão",
    responses={
        400: {
            "model": ErroResponse,
            "description": "Dados inválidos de domínio",
        },
        422: {"description": "JSON inválido para o contrato da rota"},
        500: {
            "model": ErroResponse,
            "description": "Erro interno de persistência",
        },
    },
)
def criar_missao(dados: MissaoCreate, gerenciador: GerenciadorDep):
    missao = gerenciador.adicionar_missao(dados.model_dump())
    return MissaoResponse.from_entity(missao)


@router.get(
    "/missoes",
    response_model=list[MissaoResponse],
    summary="Listar todas as missões",
    responses={
        500: {
            "model": ErroResponse,
            "description": "Erro interno de persistência",
        },
    },
)
def listar_missoes(gerenciador: GerenciadorDep):
    missoes = gerenciador.listar_missoes()
    return [MissaoResponse.from_entity(missao) for missao in missoes]


@router.get(
    "/missoes/{missao_id}",
    response_model=MissaoResponse,
    summary="Detalhar uma missão por ID",
    responses={
        404: {"model": ErroResponse, "description": "Missão não encontrada"},
        500: {
            "model": ErroResponse,
            "description": "Erro interno de persistência",
        },
    },
)
def detalhar_missao(missao_id: int, gerenciador: GerenciadorDep):
    missao = gerenciador.detalhar_missao(missao_id)
    return MissaoResponse.from_entity(missao)


@router.patch(
    "/missoes/{missao_id}",
    response_model=MissaoResponse,
    summary="Atualizar parcialmente uma missão",
    responses={
        400: {
            "model": ErroResponse,
            "description": "Dados inválidos de domínio",
        },
        404: {"model": ErroResponse, "description": "Missão não encontrada"},
        422: {"description": "JSON inválido para o contrato da rota"},
        500: {
            "model": ErroResponse,
            "description": "Erro interno de persistência",
        },
    },
)
def atualizar_missao(
    missao_id: int,
    dados: MissaoUpdate,
    gerenciador: GerenciadorDep,
):
    missao = gerenciador.editar_missao(
        missao_id,
        dados.model_dump(exclude_none=True),
    )
    return MissaoResponse.from_entity(missao)


@router.patch(
    "/missoes/{missao_id}/concluir",
    response_model=MissaoResponse,
    summary="Concluir uma missão",
    responses={
        400: {
            "model": ErroResponse,
            "description": "Missão já concluída ou dado inválido",
        },
        404: {"model": ErroResponse, "description": "Missão não encontrada"},
        500: {
            "model": ErroResponse,
            "description": "Erro interno de persistência",
        },
    },
)
def concluir_missao(missao_id: int, gerenciador: GerenciadorDep):
    missao = gerenciador.concluir_missao(missao_id)
    return MissaoResponse.from_entity(missao)


@router.delete(
    "/missoes/{missao_id}",
    response_model=MensagemResponse,
    summary="Remover uma missão",
    responses={
        404: {"model": ErroResponse, "description": "Missão não encontrada"},
        500: {
            "model": ErroResponse,
            "description": "Erro interno de persistência",
        },
    },
)
def remover_missao(missao_id: int, gerenciador: GerenciadorDep):
    missao_removida = gerenciador.remover_missao(missao_id)
    return MensagemResponse(
        mensagem=f"Missão '{missao_removida.titulo}' removida com sucesso"
    )


app.include_router(router)
