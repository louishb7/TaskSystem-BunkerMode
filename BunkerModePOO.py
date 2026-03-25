import os
import json
from datetime import date, datetime, timedelta


class Missao:
    """
    Classe base que define os atributos e regras de uma missão.

    Responsável por garantir a integridade dos dados, validando se a
    prioridade está no intervalo permitido e normalizando o formato
    das datas para o padrão brasileiro (DD-MM-YYYY).
    """

    def __init__(
        self,
        missao,
        prioridade,
        prazo,
        descricao,
        status="Aguardando Recruta!",
    ):
        # Validação da prioridade na missão
        if prioridade not in [1, 2, 3]:
            raise ValueError("Prioridade deve ser entre 1 e 3")

        hoje = date.today()
        if prazo == "hoje":
            prazo = hoje.strftime("%d-%m-%Y")
        elif prazo == "amanha":
            prazo = (hoje + timedelta(days=1)).strftime("%d-%m-%Y")
        else:
            try:
                prazo = datetime.strptime(prazo, "%d-%m-%Y").strftime(
                    "%d-%m-%Y"
                )
            except ValueError:
                raise ValueError("Formato de data inválido. Use DD-MM-YYYY.")

        self.missao = missao
        self.prioridade = prioridade
        self.prazo = prazo
        self.descricao = descricao
        self.status = status


class RepositorioJSON:
    """Responsável apenas por salvar e carregar missões em arquivo JSON."""

    def carregar_dados(self):
        """Retorna uma lista vazia se o arquivo não for encontrado,
        evitando erros de execução no início do programa."""
        if os.path.exists("missoes.json"):
            with open("missoes.json", "r", encoding="utf-8") as arq:
                dados = json.load(arq)
                return [Missao(**d) for d in dados]
        return []

    def salvar_dados(self, missoes):
        """Sobrescreve o arquivo local com o estado atual das missões."""
        dados = [m.__dict__ for m in missoes]
        with open("missoes.json", "w", encoding="utf-8") as arq:
            json.dump(dados, arq, indent=4, ensure_ascii=False)


class GerenciadorDeMissoes:
    """
    Controlador central de missões.

    Gerencia o ciclo de vida das missões (criação, listagem, remoção e conclusão)
    mantendo o estado na lista interna 'self.missoes'.
    """

    def __init__(self, missoes):
        """Inicializa o gerenciador com uma lista existente de objetos Missao."""
        self.missoes = missoes

    def adicionar_missao(self):
        """
        Interage com o usuário via terminal para criar e registrar uma nova missão.

        Solicita título, prioridade (1-3), prazo e descrição, instanciando
        um novo objeto Missao e adicionando-o à lista.
        """
        missao = input("Título da missão: ")
        prioridade = int(input("Prioridade (1-3): "))

        print("Escolha o prazo: ")
        print("1. Hoje | 2. Amanhã | 3. Data específica (DD/MM/AAAA)")
        escolha = int(input("Opção: "))

        if escolha == 1:
            prazo = "hoje"
        elif escolha == 2:
            prazo = "amanha"
        elif escolha == 3:
            prazo = input("Digite a data (DIA/MÊS/ANO): ")
        else:
            print("Opção inválida. Prazo definido para Hoje.")
            prazo == "hoje"

        descricao = input("Instruções/Descrição: ")
        status = "Aguardando Recruta!"

        nova_missao = Missao(
            missao=missao,
            prioridade=prioridade,
            prazo=prazo,
            descricao=descricao,
            status=status,
        )
        self.missoes.append(nova_missao)
        print("Missão criada!")

    def remover_missao(self):
        """
        Exibe a lista numerada de missões e remove uma entrada selecionada pelo índice.

        Trata entradas inválidas (não numéricas ou fora do intervalo) para evitar quebras.
        """
        if not self.missoes:
            print("Nenhuma missão cadastrada para remover.")
            return

        print("\n=== REMOVER MISSÃO ===")
        for index, missao in enumerate(self.missoes, start=1):
            print(
                f"{index}. {missao.missao} (Prioridade {missao.prioridade}, Prazo: {missao.prazo})"
            )

        try:
            escolha = int(
                input("Digite o número da missão que deseja remover: ")
            )
            if 1 <= escolha <= len(self.missoes):
                removida = self.missoes.pop(escolha - 1)
                print(f"Missão '{removida.missao}' removida com sucesso!")
            else:
                print("Número inválido. Nenhuma missão removida.")
        except ValueError:
            print("Entrada inválida! Digite apenas números.")

    def listar_missao(self):
        """
        Exibe missões ordenadas por prioridade e permite detalhar/concluir um item.

        Ordena a visualização da maior prioridade (1) para a menor (3) e abre
        um submenu interativo para alteração de status da missão escolhida.
        """
        if not self.missoes:
            print("Nenhuma missão cadastrada.")
            return

        print(f"{' =>   OBJETIVOS    <=':<20}")
        print("=" * 35)

        # Ordena pela prioridade
        missoes_ordenada = sorted(self.missoes, key=lambda x: x.prioridade)
        for index, item in enumerate(missoes_ordenada, start=1):
            if item.prioridade == 1:
                print("= > Faça!! Prioridade máxima. < =")
            elif item.prioridade == 2:
                print("=>  Deve fazer! <=")
            else:
                print("=>  Baixa prioridade.   <=")

            print(
                f"Missão nº {index}: {item.missao.capitalize()}\n"
                f"Status: {item.status} | Prazo: {item.prazo or 'Permanente'}"
            )
            print("-" * 35)

        try:
            escolha = int(
                input("Escolha o número da missão para mais detalhes: ")
            )
            if 1 <= escolha <= len(missoes_ordenada):
                detalhar = missoes_ordenada[escolha - 1]
                print("=" * 35)
                print(
                    f"Missão => {detalhar.missao.title()}\n"
                    f"Prioridade => {detalhar.prioridade}\n"
                    f"Descrição => {detalhar.descricao.capitalize()}\n"
                    f"Status => {detalhar.status.capitalize()}\n"
                    f"Prazo => {detalhar.prazo or 'Permanente'}"
                )
                print("=" * 35)

                # Entrada da função de marcar como concluída
                if detalhar.status.lower() != "concluída":
                    concluir = (
                        input("Deseja marcar como concluída? (s/n): ")
                        .lower()
                        .strip()
                    )
                    if concluir.startswith("s"):
                        detalhar.status = "Concluída"
                        print("Missão marcada como concluída!")
                else:
                    print(
                        "[!] Relatório: Esta missão já consta como FINALIZADA no sistema."
                    )
        except ValueError:
            print("Entrada inválida! Tente novamente.")

    def exibir_relatorio(self):
        """
        Calcula o total de missões, contagem de concluídas vs. pendentes e
        lista os títulos de cada categoria separadamente.
        """
        if not self.missoes:
            print("Nenhuma missão cadastrada.")
            return

        print("\n=== RELATÓRIO DE OPERAÇÕES ===")
        concluidas = [
            m for m in self.missoes if m.status.lower() == "concluida"
        ]
        pendentes = [
            m for m in self.missoes if m.status.lower() != "concluída"
        ]

        print(f"Total de missões: {len(self.missoes)}")
        print(f"Concluídas: {len(concluidas)}")
        print(f"Pendentes: {len(pendentes)}")
        print("=" * 40)

        if pendentes:
            print(">>> MISSÕES PENDENTES <<<")
            for m in pendentes:
                print(
                    f"- {m.missao} | Prazo: {m.prazo} | Prioridade: {m.prioridade}"
                )
            print("-" * 40)

        if concluidas:
            print(">>> MISSÕES CONCLUÍDAS <<<")
            for m in concluidas:
                print(f"- {m.missao} | Finalizada em: {m.prazo}")
            print("-" * 40)


class Menu:
    """
    Traduz as entradas do usuário em chamadas para o Gerenciador de Missões
    e garante a persistência através do Repositório.
    """

    def __init__(
        self, repositorio: RepositorioJSON, gerenciador: GerenciadorDeMissoes
    ):
        """
        Injeta as dependências necessárias para o funcionamento do menu.

        Args:
            repositorio: Instância responsável por ler/salvar arquivos.
            gerenciador: Instância que contém as regras de negócio das missões.
        """
        self.repositorio = repositorio
        self.gerenciador = gerenciador

    def exibir_menu(self):
        """
        Apresenta as opções visuais e gerencia o fluxo de navegação.
        Salva os dados automaticamente no disco após cada operação bem-sucedida
        para evitar perda de progresso.
        """
        while True:
            print("1. = > Adicionar Missão")
            print("2. = > Listar Missões/Marcar")
            print("3. = > Remover Missão")
            print("4. = > Relatório do dia")
            print("5. = > Sair")

            opcao = input("Escolha uma opção: ")

            if opcao == "1":
                self.gerenciador.adicionar_missao()
            elif opcao == "2":
                self.gerenciador.listar_missao()
            elif opcao == "3":
                self.gerenciador.remover_missao()
            elif opcao == "4":
                self.gerenciador.exibir_relatorio()
            elif opcao == "5":
                print("Até logo!")
                self.repositorio.salvar_dados(self.gerenciador.missoes)
                break
            else:
                print("Opção inválida! Escolha novamente.")

            self.repositorio.salvar_dados(self.gerenciador.missoes)


# Inicializa os objetos e dá o START no programa.
if __name__ == "__main__":
    repositorio = RepositorioJSON()
    missoes = repositorio.carregar_dados()
    gerenciador = GerenciadorDeMissoes(missoes)
    menu = Menu(repositorio, gerenciador)
    menu.exibir_menu()
