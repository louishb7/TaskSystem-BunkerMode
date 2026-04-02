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
        elif prazo is None:
            pass
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
    """Gerencia persistência simples em arquivo, convertendo objetos em dicionários e vice-versa."""

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
    """Centraliza as regras de manipulação da lista de missões."""

    def __init__(self, missoes):
        """Garante que a lista inicial já esteja ordenada por prioridade."""
        self.missoes = sorted(missoes, key=lambda x: x.prioridade)

    def adicionar_missao(self, dados_missao):
        """Recebe um dicionário com os dados da missão e adiciona à lista."""
        nova_missao = Missao(**dados_missao)
        self.missoes.append(nova_missao)
        self.missoes.sort(key=lambda x: x.prioridade)
        return nova_missao

    def remover_missao(self, indice):
        """Remove missão pelo índice informado e retorna a missão removida."""
        if 0 <= indice < len(self.missoes):
            return self.missoes.pop(indice)
        return None

    def listar_missoes(self):
        """Retorna todas as missões ordenadas por prioridade."""
        return self.missoes

    def detalhar_missao(self, indice):
        """Acessa diretamente uma missão específica sem alterar nada."""
        if 0 <= indice < len(self.missoes):
            return self.missoes[indice]
        return None

    def concluir_missao(self, indice):
        """Altera o status da missão, preservando o restante dos dados."""
        if 0 <= indice < len(self.missoes):
            self.missoes[indice].status = "Concluída"
            return self.missoes[indice]
        return None

    def gerar_relatorio(self):
        """Separa missões por status usando comparação tolerante a variações de texto."""
        concluidas = [
            m
            for m in self.missoes
            if m.status.strip().lower() in ["concluída", "concluida"]
        ]
        pendentes = [
            m
            for m in self.missoes
            if m.status.strip().lower() not in ["concluída", "concluida"]
        ]
        return {
            "total": len(self.missoes),
            "concluidas": concluidas,
            "pendentes": pendentes,
        }


class InterfaceConsole:
    """
    Responsável apenas pela interação com o usuário via terminal.
    Coleta entradas e exibe saídas, sem manipular diretamente as missões.
    """

    def exibir_cabecalho(self):
        """
        => Método que exibe o cabeçalho do programa
        """
        titulo = "🔥 \033[7;30;42mSistema BunkerMode\033[m 🔥"
        print("~=" * 20)
        print(f"{titulo:^46}")
        print("~=" * 20)

    def solicitar_dados_missao(self):
        """Coleta informações necessárias para criar uma nova missão."""
        missao = input("Título da missão: ")
        while True:
            try:
                prioridade = int(input("Prioridade (1-3): "))
                if prioridade in (1, 2, 3):
                    break
                print("O número deve estar entre 1 e 3.")
            except ValueError:
                print("Entrada inválida!")

        print("Escolha o prazo: ")
        print("1. Hoje | 2. Amanhã | 3. Data específica (DD-MM-YYYY)")
        print("4. TODO SANTO DIA!!")

        while True:
            try:
                escolha = int(input("Opção: "))
                if escolha == 1:
                    prazo = "hoje"
                elif escolha == 2:
                    prazo = "amanha"
                elif escolha == 3:
                    prazo = input("Digite a data (DD-MM-YYYY): ")
                elif escolha == 4:
                    prazo = None
                else:
                    print("Opção inválida. Prazo definido para Hoje.")
                    prazo = "hoje"
                break
            except ValueError:
                print("Entrada inválida! Escolha um número.")

        descricao = input("Instruções/Descrição: ")

        return {
            "missao": missao,
            "prioridade": prioridade,
            "prazo": prazo,
            "descricao": descricao,
            "status": "Aguardando Recruta!",
        }

    def exibir_missoes(self, missoes):
        """Mostra as missões formatadas para o usuário."""
        if not missoes:
            print("Nenhuma missão cadastrada.")
            return

        print(f"{' =>   OBJETIVOS DO DIA    <=':<20}")
        print("=" * 35)

        for index, m in enumerate(missoes, start=1):
            if m.prioridade == 1:
                print("= > Faça! Prioridade máxima. < =")
            elif m.prioridade == 2:
                print("=>  Deve fazer! <=")
            else:
                print("=>  Baixa prioridade.   <=")

            # Informações principais
            print(
                f"Missão nº {index}: {m.missao.capitalize()}\n"
                f"Status: {m.status} | Prazo: {m.prazo or 'Permanente'}"
            )
            print("-" * 35)

    def exibir_detalhes_missao(self, missao):
        """Mostra todos os campos de uma missão de forma organizada."""
        if missao:
            print("\n=== DETALHES DA MISSÃO ===")
            print(f"Título: {missao.missao}")

            # Tratamento de prioridade
            if missao.prioridade == 1:
                prioridade_texto = "Faça! Prioridade máxima."
            elif missao.prioridade == 2:
                prioridade_texto = "Deve fazer!"
            else:
                prioridade_texto = "Baixa prioridade."

            print(f"Prioridade: {missao.prioridade} ({prioridade_texto})")
            print(f"Prazo: {missao.prazo or 'Permanente'}")
            print(f"Descrição: {missao.descricao}")
            print(f"Status: {missao.status}")
            print("=" * 35)
        else:
            print("Missão não encontrada.")

    def exibir_relatorio(self, relatorio):
        """Mostra o relatório formatado."""
        print("\n=== RELATÓRIO DE OPERAÇÕES ===")
        print(f"Total: {relatorio['total']}")
        print(f"Concluídas: {len(relatorio['concluidas'])}")
        print(f"Pendentes: {len(relatorio['pendentes'])}")
        print("=" * 40)

        if relatorio["pendentes"]:
            print(">>> MISSÕES PENDENTES <<<")
            for m in relatorio["pendentes"]:
                print(
                    f"- {m.missao} | Prazo: {m.prazo or 'Só acabou por hoje, soldado!'} | Prioridade: {m.prioridade}"
                )
            print("-" * 40)

        if relatorio["concluidas"]:
            print(">>> MISSÕES CONCLUÍDAS <<<")
            for m in relatorio["concluidas"]:
                print(
                    f"- {m.missao} | Finalizada em: {m.prazo or 'Só acabou por hoje, soldado!'}"
                )
            print("-" * 40)


class Menu:
    """
    Orquestra o fluxo da aplicação: recebe ações do usuário e delega
    para as camadas corretas, garantindo persistência ao final de cada operação.
    """

    def __init__(
        self,
        repositorio: RepositorioJSON,
        gerenciador: GerenciadorDeMissoes,
        interface: InterfaceConsole,
    ):
        """
        Injeta as dependências necessárias para o funcionamento do menu.

        Args:
            repositorio: Instância responsável por ler/salvar arquivos.
            gerenciador: Instância que contém as regras de negócio das missões.
            interface: Instância responsável pela interação do usuário.
        """
        self.repositorio = repositorio
        self.gerenciador = gerenciador
        self.interface = interface

    def exibir_menu(self):
        """Loop principal que mantém o programa em execução até saída explícita."""
        self.interface.exibir_cabecalho()
        while True:
            print("1. Adicionar Missão")
            print("2. Listar Missões/Marcar Concluída")
            print("3. Remover Missão")
            print("4. Relatório do dia")
            print("5. Sair")

            opcao = input("Escolha uma opção: ")

            if opcao == "1":
                dados = self.interface.solicitar_dados_missao()
                nova = self.gerenciador.adicionar_missao(dados)
                print(f"Missão '{nova.missao}' criada com sucesso!")

            elif opcao == "2":
                missoes = self.gerenciador.listar_missoes()
                if not missoes:
                    print("Nenhuma missão cadastrada.")
                else:
                    self.interface.exibir_missoes(missoes)

                    try:
                        indice = (
                            int(
                                input(
                                    "Digite o número da missão para ver detalhes (ou 0 para voltar): "
                                )
                            )
                            - 1
                        )
                        if indice >= 0:
                            missao = self.gerenciador.detalhar_missao(indice)
                            self.interface.exibir_detalhes_missao(missao)
                            if missao.status != "Concluída":
                                escolha = (
                                    input(
                                        "Deseja marcar esta missão como concluída? (s/n): "
                                    )
                                    .strip()
                                    .lower()
                                )
                                if escolha == "s":
                                    concluida = (
                                        self.gerenciador.concluir_missao(
                                            indice
                                        )
                                    )
                                    print(
                                        f"Missão '{concluida.missao}' marcada como concluída!"
                                    )
                            else:
                                print("Esta missão já está concluída.")

                    except ValueError:
                        print("Entrada inválida.")

            elif opcao == "3":
                missoes = self.gerenciador.listar_missoes()
                self.interface.exibir_missoes(missoes)

                try:
                    indice = (
                        int(input("Digite o número da missão para remover: "))
                        - 1
                    )
                    removida = self.gerenciador.remover_missao(indice)
                    if removida:
                        print(
                            f"Missão '{removida.missao}' removida com sucesso!"
                        )
                    else:
                        print("Índice inválido.")
                except ValueError:
                    print("Entrada inválida.")

            elif opcao == "4":
                relatorio = self.gerenciador.gerar_relatorio()
                self.interface.exibir_relatorio(relatorio)

            elif opcao == "5":
                print("Até logo!")
                self.repositorio.salvar_dados(self.gerenciador.missoes)
                break

            else:
                print("Opção inválida! Escolha novamente.")

            # Salva sempre após cada operação
            self.repositorio.salvar_dados(self.gerenciador.missoes)


# Inicializa os objetos e dá o START no programa.
if __name__ == "__main__":
    repositorio = RepositorioJSON()
    missoes = repositorio.carregar_dados()
    gerenciador = GerenciadorDeMissoes(missoes)
    interface = InterfaceConsole()
    menu = Menu(repositorio, gerenciador, interface)
    menu.exibir_menu()
