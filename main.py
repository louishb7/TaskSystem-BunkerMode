from repositorio import RepositorioJSON
from gerenciador import GerenciadorDeMissoes
from interface import InterfaceConsole
from menu import Menu


if __name__ == "__main__":
    interface = InterfaceConsole()

    try:
        repositorio = RepositorioJSON()
        gerenciador = GerenciadorDeMissoes(repositorio)
    except ValueError as e:
        interface.exibir_erro(str(e))
    else:
        menu = Menu(gerenciador, interface)
        menu.exibir_menu()
