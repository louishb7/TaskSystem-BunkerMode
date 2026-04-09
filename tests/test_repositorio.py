import json

import pytest

from missao import Missao, StatusMissao
from repositorio import RepositorioJSON



def test_init_usa_caminho_padrao_quando_nao_informado():
    repositorio = RepositorioJSON()
    assert repositorio.caminho_arquivo.endswith("missoes.json")



def test_carregar_dados_retorna_lista_vazia_se_arquivo_nao_existir(tmp_path):
    caminho = tmp_path / "missoes.json"
    repositorio = RepositorioJSON(caminho)

    assert repositorio.carregar_dados() == []



def test_salvar_dados_cria_json_serializado(tmp_path):
    caminho = tmp_path / "missoes.json"
    repositorio = RepositorioJSON(caminho)

    missoes = [
        Missao(
            missao_id=1,
            titulo="Estudar pytest",
            prioridade=1,
            prazo="10-04-2026",
            instrucao="Revisar testes",
        ),
        Missao(
            missao_id=2,
            titulo="Correr",
            prioridade=2,
            prazo=None,
            instrucao="Corrida leve",
            status=StatusMissao.CONCLUIDA,
        ),
    ]

    repositorio.salvar_dados(missoes)

    with open(caminho, "r", encoding="utf-8") as arquivo:
        dados = json.load(arquivo)

    assert dados == [
        {
            "id": 1,
            "titulo": "Estudar pytest",
            "prioridade": 1,
            "prazo": "10-04-2026",
            "instrucao": "Revisar testes",
            "status": "Aguardando Recruta!",
        },
        {
            "id": 2,
            "titulo": "Correr",
            "prioridade": 2,
            "prazo": None,
            "instrucao": "Corrida leve",
            "status": "Concluída",
        },
    ]



def test_carregar_dados_reconstroi_missoes(tmp_path):
    caminho = tmp_path / "missoes.json"
    conteudo = [
        {
            "id": 1,
            "titulo": "Estudar",
            "prioridade": 1,
            "prazo": "10-04-2026",
            "instrucao": "Revisar conteúdo",
            "status": "Aguardando Recruta!",
        }
    ]
    caminho.write_text(json.dumps(conteudo, ensure_ascii=False), encoding="utf-8")

    repositorio = RepositorioJSON(caminho)
    missoes = repositorio.carregar_dados()

    assert len(missoes) == 1
    assert isinstance(missoes[0], Missao)
    assert missoes[0].titulo == "Estudar"



def test_carregar_dados_json_corrompido(tmp_path):
    caminho = tmp_path / "missoes.json"
    caminho.write_text("{ json quebrado", encoding="utf-8")
    repositorio = RepositorioJSON(caminho)

    with pytest.raises(ValueError, match="Arquivo de dados inválido ou corrompido"):
        repositorio.carregar_dados()



def test_carregar_dados_com_estrutura_invalida(tmp_path):
    caminho = tmp_path / "missoes.json"
    caminho.write_text(json.dumps({"titulo": "Teste"}), encoding="utf-8")
    repositorio = RepositorioJSON(caminho)

    with pytest.raises(ValueError, match="Estrutura inválida no arquivo de dados"):
        repositorio.carregar_dados()



def test_carregar_dados_com_campos_invalidos(tmp_path):
    caminho = tmp_path / "missoes.json"
    conteudo = [
        {
            "id": 1,
            "titulo": "",
            "prioridade": 1,
            "prazo": "10-04-2026",
            "instrucao": "Teste",
            "status": "Aguardando Recruta!",
        }
    ]
    caminho.write_text(json.dumps(conteudo, ensure_ascii=False), encoding="utf-8")
    repositorio = RepositorioJSON(caminho)

    with pytest.raises(ValueError, match="Dados de missão inválidos no arquivo"):
        repositorio.carregar_dados()



def test_carregar_dados_com_campo_faltando(tmp_path):
    caminho = tmp_path / "missoes.json"
    conteudo = [
        {
            "id": 1,
            "titulo": "Teste",
            "prioridade": 1,
            "prazo": "10-04-2026",
            "status": "Aguardando Recruta!",
        }
    ]
    caminho.write_text(json.dumps(conteudo, ensure_ascii=False), encoding="utf-8")
    repositorio = RepositorioJSON(caminho)

    with pytest.raises(ValueError, match="Dados de missão inválidos no arquivo"):
        repositorio.carregar_dados()
