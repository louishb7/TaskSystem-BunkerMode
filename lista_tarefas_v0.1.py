tarefas = []
dados = {}


def exibir_cabecalho():
    print("~=" * 20)
    print(f"{'Sistema BunkerMode':^35}")
    print("~=" * 20)


def criar_tarefa():
    dados["missao"] = input("Missão: ")
    dados["prioridade"] = input("Nível de príoridade(1 a 5): ")
    dados["descrição"] = input("Informe a missão para o seu soldado: ")
    dados["status"] = "Aguardando Recruta"
    tarefas.append(dados.copy())
    dados.clear()


def listar_tarefa():
    print(f"A sua missão é {tarefas[0]}\nA prioridade é {tarefas[1]}")


def remover_tarefa():
    pass


def exibir_relatorio():
    pass


def menu_principal():
    """
    => Função com o Menu principal do Programa.
    """
    while True:

        print("1. = > Adicionar tarefa")
        print("2. = > Listar tarefas/Marcar Concluído")
        print("3. = > Remover Tarefa")
        print("4. = > Relatório do dia")
        print("5. = > Sair")

        opcao = input("Escolha uma opção: ")

        if opcao == "1":
            criar_tarefa()
        elif opcao == "2":
            if not tarefas:
                print("Crie uma tarefa primeiro.")
            else:
                listar_tarefa()
        elif opcao == "3":
            if not tarefas:
                print("Crie uma tarefa primeiro.")
            else:
                remover_tarefa()
        elif opcao == "4":
            if not tarefas:
                print("Crie uma tarefa primeiro.")
            else:
                exibir_relatorio()
        elif opcao == "5":
            print("Até logo!")
            break
        else:
            print("Opção inválida! Escolha novamente.")


# Ponto de entrada do programa
if __name__ == "__main__":
    exibir_cabecalho()
    menu_principal()

print(tarefas)
