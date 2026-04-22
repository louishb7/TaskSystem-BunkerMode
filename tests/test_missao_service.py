from types import SimpleNamespace

from missao import Missao
from services.missao_service import MissaoService


class RepositorioListagemFake:
    def __init__(self):
        self.chamadas_por_responsavel = []

    def carregar_dados(self):
        return [
            Missao(
                missao_id=1,
                titulo="Missão geral",
                prioridade=1,
                prazo=None,
                instrucao="Executar",
            )
        ]

    def carregar_dados_por_responsavel(self, responsavel_id):
        self.chamadas_por_responsavel.append(responsavel_id)
        return [
            Missao(
                missao_id=2,
                titulo="Missão do usuário",
                prioridade=1,
                prazo=None,
                instrucao="Executar",
            )
        ]


def test_listar_missoes_com_usuario_filtra_por_responsavel():
    repositorio = RepositorioListagemFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=42)

    missoes = service.listar_missoes(usuario=usuario)

    assert repositorio.chamadas_por_responsavel == [42]
    assert [missao.titulo for missao in missoes] == ["Missão do usuário"]


def test_listar_missoes_sem_usuario_mantem_listagem_geral():
    repositorio = RepositorioListagemFake()
    service = MissaoService(repositorio)

    missoes = service.listar_missoes()

    assert repositorio.chamadas_por_responsavel == []
    assert [missao.titulo for missao in missoes] == ["Missão geral"]
