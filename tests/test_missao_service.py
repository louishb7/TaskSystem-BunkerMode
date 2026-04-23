from types import SimpleNamespace

import pytest

from auditoria import EventoAuditoria
from core_exceptions import MissaoNaoEncontrada
from missao import Missao
from services.auth_service import AuthService
from services.missao_service import MissaoService
from usuario import Usuario


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


class RepositorioOwnershipFake:
    def __init__(self):
        self.missao = Missao(
            missao_id=10,
            titulo="Missão protegida",
            prioridade=1,
            prazo=None,
            instrucao="Executar",
        )
        self.contexto = {"criada_por_id": 1, "responsavel_id": 1}
        self.missao_atualizada = None
        self.missao_removida_id = None
        self.auditoria = [
            EventoAuditoria(
                evento_id=1,
                missao_id=10,
                usuario_id=1,
                acao="missao_criada",
                detalhes="Missão criada.",
            )
        ]
        self.auditoria_registrada = []

    def buscar_por_id(self, missao_id):
        if missao_id == self.missao.missao_id:
            return self.missao
        return None

    def buscar_contexto_missao(self, missao_id):
        if missao_id == self.missao.missao_id:
            return self.contexto
        return None

    def atualizar_missao(self, missao):
        self.missao_atualizada = missao

    def remover_missao(self, missao_id):
        self.missao_removida_id = missao_id

    def listar_auditoria_por_missao(self, missao_id):
        return [evento for evento in self.auditoria if evento.missao_id == missao_id]

    def registrar_auditoria(self, evento):
        self.auditoria_registrada.append(evento)


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


def test_usuario_pode_editar_missao_propria_e_registra_auditoria():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1)

    missao = service.editar_missao(
        10,
        {
            "titulo": "Missão atualizada",
            "instrucao": "Executar com novo plano",
            "prioridade": 3,
            "prazo": "22-04-2026",
        },
        usuario=usuario,
    )

    assert missao.titulo == "Missão atualizada"
    assert missao.instrucao == "Executar com novo plano"
    assert missao.prioridade.value == 3
    assert missao.prazo == "22-04-2026"
    assert repositorio.missao_atualizada is missao
    assert repositorio.auditoria_registrada[-1].acao == "missao_atualizada"
    assert repositorio.auditoria_registrada[-1].usuario_id == 1


def test_usuario_nao_pode_editar_missao_de_outro_usuario():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=2)

    with pytest.raises(MissaoNaoEncontrada):
        service.editar_missao(
            10,
            {"titulo": "Tentativa indevida"},
            usuario=usuario,
        )

    assert repositorio.missao_atualizada is None
    assert repositorio.auditoria_registrada == []


def test_usuario_pode_concluir_apenas_missao_propria():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1)

    missao = service.concluir_missao(10, usuario=usuario)

    assert missao.status.value == "Concluída"
    assert repositorio.missao_atualizada is missao


def test_usuario_nao_pode_concluir_missao_de_outro_usuario():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=2)

    with pytest.raises(MissaoNaoEncontrada):
        service.concluir_missao(10, usuario=usuario)

    assert repositorio.missao_atualizada is None


def test_usuario_pode_remover_apenas_missao_propria():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1)

    service.remover_missao(10, usuario=usuario)

    assert repositorio.missao_removida_id == 10


def test_usuario_nao_pode_remover_missao_de_outro_usuario():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=2)

    with pytest.raises(MissaoNaoEncontrada):
        service.remover_missao(10, usuario=usuario)

    assert repositorio.missao_removida_id is None


def test_usuario_pode_ver_historico_apenas_de_missao_propria():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1)

    historico = service.listar_historico(10, usuario=usuario)

    assert [evento.acao for evento in historico] == ["missao_criada"]


def test_usuario_nao_pode_ver_historico_de_missao_de_outro_usuario():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=2)

    with pytest.raises(MissaoNaoEncontrada):
        service.listar_historico(10, usuario=usuario)


def test_usuario_pode_alternar_decisao_sem_afetar_outros_campos():
    repositorio = RepositorioOwnershipFake()
    service = MissaoService(repositorio)
    usuario = SimpleNamespace(usuario_id=1)

    missao = service.alternar_decisao(10, usuario=usuario)

    assert missao.is_decided is True
    assert missao.titulo == "Missão protegida"
    assert missao.instrucao == "Executar"
    assert missao.prioridade.value == 1
    assert repositorio.missao_atualizada is missao


class RepositorioUsuarioFake:
    def __init__(self):
        self.usuario = Usuario(
            usuario_id=1,
            usuario="Henrique",
            email="henrique@email.com",
            senha_hash="hash",
        )
        self.nome_atualizado = None

    def buscar_usuario_por_id(self, usuario_id):
        if usuario_id == self.usuario.usuario_id:
            return self.usuario
        return None

    def atualizar_nome_general(self, usuario_id, nome_general):
        self.nome_atualizado = (usuario_id, nome_general)
        self.usuario.definir_nome_general(nome_general)


def test_auth_service_define_nome_do_general_com_trim_e_persistencia():
    repositorio = RepositorioUsuarioFake()
    service = AuthService(repositorio)

    usuario = service.definir_nome_general(1, "  General Atlas  ")

    assert usuario.nome_general == "General Atlas"
    assert repositorio.nome_atualizado == (1, "General Atlas")
