import json
import os
from datetime import datetime, timedelta

missoes = []
total_concluidas = 0

def carregar_dados():
    """
        Carrega os dados do arquivo 'missoes_json.json'.
        Retorna um dicionário com a chave "missoes": lista de registros
    """
    if os.path.exists("missoes.json"):
        with open("missoes.json", "r", encoding="utf-8") as arquivo:
            return json.load(arquivo)
    return []

def salvar_dados(dados):
    """
    Salva os dados (missoes) no arquivo missoes_json.json
    """
    with open("missoes.json", 'w', encoding='utf8') as arquivo:
        json.dump(dados, arquivo, indent=4, ensure_ascii=False)

def exibir_cabecalho():
    """
    => Função que exibe o cabeçalho do programa
    """
    titulo = "🔥 \033[7;30;42mSistema BunkerMode\033[m 🔥"
    print("~=" * 20)
    print(f"{titulo:^46}")
    print("~=" * 20)


def criar_missoes():
    """
    => Função principal de criar as missões para o usuário.
    > Aqui é onde nós adicionamos os dicionários que entrarão para a lista.
    """

    dados = {}
    dados["missao"] = input("Missão: ")
    while True:
        try:
            prioridade_temp = int(input("Nível de prioridade (1 a 3): "))

            if not 1 <= prioridade_temp <= 3:
                raise ValueError

            dados["prioridade"] = prioridade_temp
            break

        except ValueError:
            print("Entrada inválida! Escolha um número entre 1 a 3.")
    
    while True:
        try:
            print('Prazo para o soldado cumprir a missão: ')
            print('(1) Hoje\n(2) Amanhã\n(3) Data específica\n(4) Todo santo dia.')
            prazo_temp = int(input("Escolha uma opção(1 a 4): "))
            

            if prazo_temp == 1:
                hoje = datetime.today()
                hoje_formatado = hoje.strftime("%d/%m/%Y")
                dados["prazo"] = hoje_formatado
            elif prazo_temp == 2:
                amanha = datetime.today() + timedelta(days=1)
                amanha_formatado = amanha.strftime("%d/%m/%Y")
                dados["prazo"] = amanha_formatado
            elif prazo_temp == 3:
                especifica = input('Digite a data específica(dia/mês/ano): ')
                especifica_formatado = datetime.strptime(especifica, "%d/%m/%Y")
                especifica_final = especifica_formatado.strftime("%d/%m/%Y")
                dados["prazo"] = especifica_final
            elif prazo_temp == 4:
                dados["prazo"] = None
            else:
                raise ValueError
            break
        except ValueError:
            print("Entrada inválida! Escolha um número entre 1 a 4")

    dados["descriçao"] = input("Informe a missão para o seu soldado: ")
    dados["status"] = "Aguardando Recruta"

    missoes.append(dados.copy())
    salvar_dados(missoes)
    print("--- Missão cadastrada com sucesso! ---")


def listar_missoes():
    """
    => Função que permite listar tarefas e saber mais detalhes da missão.
    """
    print(f"{' =>   OBJETIVOS DO DIA    <=':<20}")
    print("=" * 35)
    for index, item in enumerate(missoes, start=1):
        if item["prioridade"] == 1:
            print(f"= > Faça!! Prioridade máxima. < =")
        elif item["prioridade"] == 2:
            print(f"=>  Deve fazer! <=")
        else:
            print(f"=>  Baixa prioridade.   <=")
        print(
            f"Missão nº {index}: {item['missao'].capitalize()}\n"
            f"Status: {item['status']} | Prazo: {item['prazo'] or 'Permanente'}"
        )
        print("-" * 35)

    try:
        escolha = int(input("Escolha o número da missão para mais detalhes: "))
        if 1 <= escolha <= len(missoes):
            detalhar = missoes[escolha - 1]
            print("=" * 35)
            print(
                f"Missão => {detalhar['missao'].title()}\n"
                f"Prioridade => {detalhar['prioridade']}\n"
                f"Descrição => {detalhar['descriçao'].capitalize()}\n"
                f"Status => {detalhar['status'].capitalize()}\n",
                f"Prazo => {detalhar['prazo'] or 'Permanente'}"
            )
            print("=" * 35)

            # Entrada da função de Marcar
            if missoes[escolha - 1]["status"] != "Concluída":
                concluir = (
                    input("Deseja marcar como concluída? (s/n): ")
                    .lower()
                    .strip()
                )
                if concluir.startswith("s"):
                    marcar_concluida(escolha - 1)
            else:
                print(
                    "[!] Relatório: Esta missão já consta como FINALIZADA no sistema."
                )

    except ValueError:
        print("Entrada inválida! Tente novamente.")


def marcar_concluida(indice):
    """
    => Função específica para marcar as missões criadas.
    """
    global total_concluidas
    missoes[indice]["status"] = "Concluída"
    total_concluidas += 1
    salvar_dados(missoes)
    print(f"Missão '{missoes[indice]['missao']}' marcada como concluída!")


def remover_missoes():
    """
    => Função que permite remover uma missão já criada.
    """
    global total_concluidas

    for index, item in enumerate(missoes, start=1):
        print(f"{index}. {item['missao'].capitalize()}")
    print("-" * 35)

    try:
        escolha = int(input("Escolha uma missão a ser removida: "))
        if 1 <= escolha <= len(missoes):
            removida = missoes.pop(escolha - 1)

            if removida["status"] == "Concluída":
                total_concluidas -= 1
            salvar_dados(missoes)        

            print(f"Missão '{removida['missao']}'\nRemovida com sucesso!")
    
    except (ValueError, IndexError):
        print("Opção inválida!")
    


def exibir_relatorio():
    """
    => Função para exibir relatório do usuário.
    """
    print("=" * 20)
    print(f"{'RELATÓRIO DE OPERAÇÕES':^35}")
    print("=" * 20)
    print(f"Foram criadas: {len(missoes)} missões.")
    print(f"Foram concluídas: {total_concluidas}")

    pendentes = len(missoes) - total_concluidas
    if pendentes > 0:
        print(f"Atenção: Ainda restam {pendentes} missões pendentes!")
    else:
        print(
            f"Excelente trabalho, soldado! Todas as missões foram cumpridas."
        )
    print("=" * 20)


def menu_principal():
    """
    => Função para exibir e controlar o Menu principal do Programa.
    """
    global missoes
    missoes = carregar_dados()

    while True:

        print("1. = > Adicionar Missão")
        print("2. = > Listar Missões/Marcar")
        print("3. = > Remover Missão")
        print("4. = > Relatório do dia")
        print("5. = > Sair")

        opcao = input("Escolha uma opção: ")

        if opcao == "1":
            criar_missoes()
        elif opcao == "2":
            if not missoes:
                print("Crie uma missão primeiro.")
            else:
                listar_missoes()
        elif opcao == "3":
            if not missoes:
                print("Crie uma missão primeiro.")
            else:
                remover_missoes()
        elif opcao == "4":
            if not missoes:
                print("Crie uma missão primeiro.")
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
