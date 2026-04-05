from repositorio import RepositorioJSON
from gerenciador import GerenciadorDeMissoes
from interface import InterfaceConsole
from menu import Menu


# Inicializa os objetos e dá o START no programa.
if __name__ == "__main__":
    repositorio = RepositorioJSON()
    gerenciador = GerenciadorDeMissoes(repositorio)
    interface = InterfaceConsole()
    menu = Menu(gerenciador, interface)
    menu.exibir_menu()
