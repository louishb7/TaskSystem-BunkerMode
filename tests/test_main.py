import runpy
from unittest.mock import MagicMock



def test_main_inicializa_dependencias_e_executa_menu(monkeypatch):
    interface_mock = MagicMock()
    repositorio_mock = MagicMock()
    gerenciador_mock = MagicMock()
    menu_instancia_mock = MagicMock()
    menu_classe_mock = MagicMock(return_value=menu_instancia_mock)

    monkeypatch.setattr("interface.InterfaceConsole", lambda: interface_mock)
    monkeypatch.setattr("repositorio.RepositorioJSON", lambda: repositorio_mock)
    monkeypatch.setattr(
        "gerenciador.GerenciadorDeMissoes", lambda repositorio: gerenciador_mock
    )
    monkeypatch.setattr("menu.Menu", menu_classe_mock)

    runpy.run_module("main", run_name="__main__")

    menu_classe_mock.assert_called_once_with(gerenciador_mock, interface_mock)
    menu_instancia_mock.exibir_menu.assert_called_once()
    interface_mock.exibir_erro.assert_not_called()



def test_main_exibe_erro_quando_falha_ao_carregar(monkeypatch):
    interface_mock = MagicMock()
    erro = ValueError("Arquivo corrompido")

    monkeypatch.setattr("interface.InterfaceConsole", lambda: interface_mock)
    monkeypatch.setattr(
        "repositorio.RepositorioJSON", MagicMock(side_effect=erro)
    )

    runpy.run_module("main", run_name="__main__")

    interface_mock.exibir_erro.assert_called_once_with("Arquivo corrompido")
