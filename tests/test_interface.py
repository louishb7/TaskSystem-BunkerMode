from datetime import date as real_date
from unittest.mock import patch

import pytest

from interface import InterfaceConsole
from missao import Missao, PrioridadeMissao, StatusMissao


class FakeDate(real_date):
    @classmethod
    def today(cls):
        return cls(2026, 4, 9)


@pytest.fixture
def interface():
    return InterfaceConsole()


@pytest.fixture
def missao_exemplo():
    return Missao(
        id=1,
        titulo="Treinar",
        prioridade=1,
        prazo="10-04-2026",
        instrucao="Treinar pesado",
        status=StatusMissao.PENDENTE,
    )



def test_exibir_cabecalho(interface, capsys):
    interface.exibir_cabecalho()
    saida = capsys.readouterr().out
    assert "Sistema BunkerMode" in saida



def test_exibir_opcoes_menu(interface, capsys):
    interface.exibir_opcoes_menu()
    saida = capsys.readouterr().out
    assert "1. Adicionar Missão" in saida
    assert "8. Sair" in saida



def test_exibir_mensagem(interface, capsys):
    interface.exibir_mensagem("Olá")
    assert capsys.readouterr().out.strip() == "Olá"



def test_exibir_erro(interface, capsys):
    interface.exibir_erro("Falhou")
    assert capsys.readouterr().out.strip() == "[ERRO] Falhou"



def test_exibir_missoes_vazia(interface, capsys):
    interface.exibir_missoes([])
    assert "Nenhuma missão cadastrada." in capsys.readouterr().out



def test_exibir_missoes(interface, capsys, missao_exemplo):
    interface.exibir_missoes([missao_exemplo])
    saida = capsys.readouterr().out
    assert "OBJETIVOS DO DIA" in saida
    assert "[ID 1] Treinar" in saida
    assert "Status: Aguardando Recruta!" in saida



def test_exibir_detalhes_missao(interface, capsys, missao_exemplo):
    interface.exibir_detalhes_missao(missao_exemplo)
    saida = capsys.readouterr().out
    assert "DETALHES DA MISSÃO" in saida
    assert "Título: Treinar" in saida
    assert "Instrução: Treinar pesado" in saida



def test_exibir_relatorio(interface, capsys, missao_exemplo):
    concluida = Missao(
        id=2,
        titulo="Ler",
        prioridade=2,
        prazo=None,
        instrucao="Ler 20 páginas",
        status=StatusMissao.CONCLUIDA,
    )
    relatorio = {
        "total": 2,
        "concluidas": [concluida],
        "pendentes": [missao_exemplo],
    }

    interface.exibir_relatorio(relatorio)
    saida = capsys.readouterr().out
    assert "RELATÓRIO DE OPERAÇÕES" in saida
    assert "Concluídas: 1" in saida
    assert ">>> MISSÕES PENDENTES <<<" in saida
    assert ">>> MISSÕES CONCLUÍDAS <<<" in saida



def test_solicitar_opcao_menu(interface, monkeypatch):
    monkeypatch.setattr("builtins.input", lambda _: " 2 ")
    assert interface.solicitar_opcao_menu() == "2"



def test_solicitar_id_missao(interface, monkeypatch):
    monkeypatch.setattr("builtins.input", lambda _: " 7 ")
    assert interface.solicitar_id_missao("ID: ") == 7



def test_solicitar_dados_missao(interface, monkeypatch):
    entradas = iter(["Missão X", "1", "Instruções X", "4"])
    monkeypatch.setattr("builtins.input", lambda _: next(entradas))

    dados = interface.solicitar_dados_missao()

    assert dados == {
        "titulo": "Missão X",
        "prioridade": 1,
        "prazo": None,
        "instrucao": "Instruções X",
        "status": StatusMissao.PENDENTE,
    }



def test_editar_missao_interface_retorna_dados_preenchidos(interface, monkeypatch, missao_exemplo):
    entradas = iter(["Novo título", "Nova instrução", "2", "4"])
    monkeypatch.setattr("builtins.input", lambda _: next(entradas))

    dados = interface.editar_missao_interface(missao_exemplo)

    assert dados == {
        "titulo": "Novo título",
        "instrucao": "Nova instrução",
        "prioridade": 2,
    }



def test_editar_missao_interface_altera_prazo(interface, monkeypatch, missao_exemplo):
    entradas = iter(["", "", "", "1"])
    monkeypatch.setattr("builtins.input", lambda _: next(entradas))

    with patch("interface.date", FakeDate):
        dados = interface.editar_missao_interface(missao_exemplo)

    assert dados == {"prazo": "09-04-2026"}



def test_editar_missao_interface_prioridade_invalida(interface, monkeypatch, missao_exemplo):
    entradas = iter(["", "", "abc", "4"])
    monkeypatch.setattr("builtins.input", lambda _: next(entradas))

    with pytest.raises(ValueError, match="Digite um número válido para prioridade"):
        interface.editar_missao_interface(missao_exemplo)



def test_editar_missao_interface_opcao_prazo_invalida(interface, monkeypatch, missao_exemplo):
    entradas = iter(["", "", "", "abc"])
    monkeypatch.setattr("builtins.input", lambda _: next(entradas))

    with pytest.raises(ValueError, match="Opção de prazo inválida"):
        interface.editar_missao_interface(missao_exemplo)



def test_solicitar_prioridade_repete_ate_valida(interface, monkeypatch, capsys):
    entradas = iter(["abc", "5", "2"])
    monkeypatch.setattr("builtins.input", lambda _: next(entradas))

    prioridade = interface._solicitar_prioridade("Prioridade: ")

    saida = capsys.readouterr().out
    assert prioridade == 2
    assert "Entrada inválida! Digite um número inteiro." in saida
    assert "Prioridade inválida. Escolha 1, 2 ou 3." in saida



def test_solicitar_prazo_repete_ate_valido(interface, monkeypatch, capsys):
    entradas = iter(["abc", "9", "4"])
    monkeypatch.setattr("builtins.input", lambda _: next(entradas))

    prazo = interface._solicitar_prazo()

    saida = capsys.readouterr().out
    assert prazo is None
    assert "Opção inválida. Escolha um número entre 1 e 4." in saida



def test_normalizar_prazo_hoje(interface):
    with patch("interface.date", FakeDate):
        assert interface._normalizar_prazo(1) == "09-04-2026"



def test_normalizar_prazo_amanha(interface):
    with patch("interface.date", FakeDate):
        assert interface._normalizar_prazo(2) == "10-04-2026"



def test_normalizar_prazo_data_especifica(interface, monkeypatch):
    monkeypatch.setattr("builtins.input", lambda _: "15-04-2026")
    assert interface._normalizar_prazo(3) == "15-04-2026"



def test_normalizar_prazo_permanente(interface):
    assert interface._normalizar_prazo(4) is None



def test_normalizar_prazo_invalido(interface):
    with pytest.raises(ValueError, match="Opção inválida. Escolha um número entre 1 e 4."):
        interface._normalizar_prazo(9)
