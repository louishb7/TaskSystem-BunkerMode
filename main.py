from db_config import get_connection_string
from gerenciador import GerenciadorDeMissoes
from interface import InterfaceConsole
from menu import Menu
from repositorio_postgres import RepositorioPostgres


if __name__ == "__main__":
    interface = InterfaceConsole()

    try:
        connection_string = get_connection_string()
        repositorio = RepositorioPostgres(connection_string)
        gerenciador = GerenciadorDeMissoes(repositorio)
    except ValueError as erro:
        interface.exibir_erro(str(erro))
    else:
        menu = Menu(gerenciador, interface)
        menu.exibir_menu()
