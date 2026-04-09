import pytest

from gerenciador import GerenciadorDeMissoes, MissaoNaoEncontrada
from missao import PrioridadeMissao, StatusMissao


class RepositorioFake:
    def __init__(self, missoes=None):
        self.missoes = list(missoes) if missoes else []
        self.persistiu = False
        self.proximo_id = (
            max((missao.missao_id for missao in self.missoes), default=0) + 1
        )

    def carregar_dados(self):
        return list(self.missoes)

    def adicionar_missao(self, missao):
        missao.atualizar_missao_id(self.proximo_id)
        self.proximo_id += 1
        self.persistiu = True

    def atualizar_missao(self, missao_atualizada):
        for indice, missao in enumerate(self.missoes):
            if missao.missao_id == missao_atualizada.missao_id:
                self.missoes[indice] = missao_atualizada
                break
        self.persistiu = True

    def remover_missao(self, missao_id):
        self.missoes = [
            missao for missao in self.missoes if missao.missao_id != missao_id
        ]
        self.persistiu = True


@pytest.fixture
def repositorio():
    return RepositorioFake()


@pytest.fixture
def gerenciador(repositorio):
    return GerenciadorDeMissoes(repositorio)


@pytest.fixture
def dados_missao():
    return {
        "titulo": "Estudar Python",
        "prioridade": 1,
        "prazo": "10-04-2026",
        "instrucao": "Revisar testes",
        "status": StatusMissao.PENDENTE,
    }


def test_inicializa_ordenado_por_prioridade_e_id():
    repo = RepositorioFake()
    gerenciador = GerenciadorDeMissoes(repo)

    gerenciador.adicionar_missao(
        {
            "titulo": "Baixa",
            "prioridade": 3,
            "prazo": "12-04-2026",
            "instrucao": "A",
            "status": StatusMissao.PENDENTE,
        }
    )
    gerenciador.adicionar_missao(
        {
            "titulo": "Alta",
            "prioridade": 1,
            "prazo": "10-04-2026",
            "instrucao": "B",
            "status": StatusMissao.PENDENTE,
        }
    )
    gerenciador.adicionar_missao(
        {
            "titulo": "Média",
            "prioridade": 2,
            "prazo": "11-04-2026",
            "instrucao": "C",
            "status": StatusMissao.PENDENTE,
        }
    )

    titulos = [missao.titulo for missao in gerenciador.listar_missoes()]
    assert titulos == ["Alta", "Média", "Baixa"]


def test_adicionar_missao(gerenciador, repositorio, dados_missao):
    missao = gerenciador.adicionar_missao(dados_missao)

    assert missao.missao_id == 1
    assert missao.titulo == "Estudar Python"
    assert missao.prioridade == PrioridadeMissao.ALTA
    assert len(gerenciador.listar_missoes()) == 1
    assert repositorio.persistiu is True


def test_adicionar_missao_gera_ids_sequenciais():
    repo = RepositorioFake()
    gerenciador = GerenciadorDeMissoes(repo)
    primeira = gerenciador.adicionar_missao(
        {
            "titulo": "A",
            "prioridade": 1,
            "prazo": "10-04-2026",
            "instrucao": "A",
            "status": StatusMissao.PENDENTE,
        }
    )
    segunda = gerenciador.adicionar_missao(
        {
            "titulo": "B",
            "prioridade": 2,
            "prazo": "11-04-2026",
            "instrucao": "B",
            "status": StatusMissao.PENDENTE,
        }
    )

    assert primeira.missao_id == 1
    assert segunda.missao_id == 2


def test_buscar_missao_existente(gerenciador, dados_missao):
    criada = gerenciador.adicionar_missao(dados_missao)
    encontrada = gerenciador.buscar_por_id(criada.missao_id)

    assert encontrada is criada


def test_buscar_missao_inexistente(gerenciador):
    with pytest.raises(MissaoNaoEncontrada):
        gerenciador.buscar_por_id(99)


def test_detalhar_missao(gerenciador, dados_missao):
    criada = gerenciador.adicionar_missao(dados_missao)
    detalhada = gerenciador.detalhar_missao(criada.missao_id)

    assert detalhada is criada


def test_concluir_missao(gerenciador, repositorio):
    missao = gerenciador.adicionar_missao(
        {
            "titulo": "Treinar",
            "prioridade": 2,
            "prazo": "10-04-2026",
            "instrucao": "Treino leve",
            "status": StatusMissao.PENDENTE,
        }
    )
    concluida = gerenciador.concluir_missao(missao.missao_id)

    assert concluida.status == StatusMissao.CONCLUIDA
    assert repositorio.persistiu is True


def test_concluir_missao_inexistente(gerenciador):
    with pytest.raises(MissaoNaoEncontrada):
        gerenciador.concluir_missao(999)


def test_editar_missao(gerenciador, repositorio):
    missao = gerenciador.adicionar_missao(
        {
            "titulo": "Estudar Python",
            "prioridade": 2,
            "prazo": "10-04-2026",
            "instrucao": "Revisar listas",
            "status": StatusMissao.PENDENTE,
        }
    )

    novos_dados = {
        "titulo": "Estudar pytest",
        "prioridade": 1,
        "instrucao": "Revisar fixtures",
        "prazo": "11-04-2026",
    }

    editada = gerenciador.editar_missao(missao.missao_id, novos_dados)

    assert editada.titulo == "Estudar pytest"
    assert editada.prioridade == PrioridadeMissao.ALTA
    assert editada.instrucao == "Revisar fixtures"
    assert editada.prazo == "11-04-2026"
    assert repositorio.persistiu is True


def test_editar_missao_inexistente(gerenciador):
    with pytest.raises(MissaoNaoEncontrada):
        gerenciador.editar_missao(999, {"titulo": "Novo"})


def test_editar_missao_reordena_por_prioridade():
    repo = RepositorioFake()
    gerenciador = GerenciadorDeMissoes(repo)
    baixa = gerenciador.adicionar_missao(
        {
            "titulo": "Baixa",
            "prioridade": 3,
            "prazo": "12-04-2026",
            "instrucao": "A",
            "status": StatusMissao.PENDENTE,
        }
    )
    gerenciador.adicionar_missao(
        {
            "titulo": "Alta",
            "prioridade": 1,
            "prazo": "10-04-2026",
            "instrucao": "B",
            "status": StatusMissao.PENDENTE,
        }
    )

    gerenciador.editar_missao(baixa.missao_id, {"prioridade": 1})

    ids = [missao.missao_id for missao in gerenciador.listar_missoes()]
    assert ids == [1, 2]


def test_remover_missao(gerenciador, repositorio):
    missao = gerenciador.adicionar_missao(
        {
            "titulo": "Treinar",
            "prioridade": 2,
            "prazo": "10-04-2026",
            "instrucao": "Corrida leve",
            "status": StatusMissao.PENDENTE,
        }
    )
    removida = gerenciador.remover_missao(missao.missao_id)

    assert removida.missao_id == missao.missao_id
    assert len(gerenciador.listar_missoes()) == 0
    assert repositorio.persistiu is True


def test_remover_missao_inexistente(gerenciador):
    with pytest.raises(MissaoNaoEncontrada):
        gerenciador.remover_missao(999)


def test_listar_missoes_retorna_copia(gerenciador, dados_missao):
    gerenciador.adicionar_missao(dados_missao)
    lista = gerenciador.listar_missoes()
    lista.clear()

    assert len(gerenciador.listar_missoes()) == 1


def test_gerar_relatorio(gerenciador):
    dados_1 = {
        "titulo": "Missão 1",
        "prioridade": 1,
        "prazo": "10-04-2026",
        "instrucao": "Executar tarefa 1",
        "status": StatusMissao.PENDENTE,
    }

    dados_2 = {
        "titulo": "Missão 2",
        "prioridade": 2,
        "prazo": "11-04-2026",
        "instrucao": "Executar tarefa 2",
        "status": StatusMissao.PENDENTE,
    }

    missao_1 = gerenciador.adicionar_missao(dados_1)
    gerenciador.adicionar_missao(dados_2)
    gerenciador.concluir_missao(missao_1.missao_id)

    relatorio = gerenciador.gerar_relatorio()

    assert relatorio["total"] == 2
    assert len(relatorio["concluidas"]) == 1
    assert len(relatorio["pendentes"]) == 1
    assert relatorio["concluidas"][0].titulo == "Missão 1"
    assert relatorio["pendentes"][0].titulo == "Missão 2"
