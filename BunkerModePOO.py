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
        id,
        missao,
        prioridade,
        prazo,
        instrucao,
        status="Aguardando Recruta!",
    ):
        # Validação da prioridade na missão
        if prioridade not in [1, 2, 3]:
            raise ValueError("Prioridade deve ser entre 1 e 3")

        if prazo is not None:
            try:
                prazo = datetime.strptime(prazo, "%d-%m-%Y").strftime(
                    "%d-%m-%Y"
                )
            except ValueError:
                raise ValueError("Formato de data inválido. Use DIA-MÊS-ANO")

        self.missao = missao
        self.prioridade = prioridade
        self.prazo = prazo
        self.instrucao = instrucao
        self.status = status
        self.id = id


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
        if not self.missoes:
            proximo_id = 1
        else:
            proximo_id = max(m.id for m in self.missoes) + 1
        dados_missao["id"] = proximo_id
        nova_missao = Missao(**dados_missao)
        self.missoes.append(nova_missao)
        self.missoes.sort(key=lambda x: x.prioridade)
        return nova_missao

    def editar_missao(self, id_procurado, novos_dados):
        """Faz uma busca por ID, e altera apenas o conteúdo de novos_dados.
        No fim, re-ordena a lista por prioridade"""
        missao = self.buscar_por_id(id_procurado)
        if not missao:
            return None

        if "missao" in novos_dados:
            missao.missao = novos_dados["missao"]

        if "instrucao" in novos_dados:
            missao.instrucao = novos_dados["instrucao"]

        if "prazo" in novos_dados:
            prazo = novos_dados["prazo"]
            if prazo is not None:
                try:
                    prazo = datetime.strptime(prazo, "%d-%m-%Y").strftime(
                        "%d-%m-%Y"
                    )
                except ValueError:
                    print("Formato de data inválido.")
            missao.prazo = prazo

        self.missoes.sort(key=lambda x: x.prioridade)

        return missao

    def remover_missao(self, id_procurado):
        """Remove missão pelo id real e retorna a missão removida."""
        missao = self.buscar_por_id(id_procurado)
        if missao:
            self.missoes.remove(missao)
            return missao
        return None

    def listar_missoes(self):
        """Retorna todas as missões ordenadas por prioridade."""
        return self.missoes

    def detalhar_missao(self, id_procurado):
        """Acessa diretamente uma missão específica sem alterar nada."""
        return self.buscar_por_id(id_procurado)

    def concluir_missao(self, id_procurado):
        """Altera o status da missão, preservando o restante dos dados."""
        missao = self.buscar_por_id(id_procurado)
        if missao:
            missao.status = "Concluída"
            return missao
        return None

    def buscar_por_id(self, id_procurado):
        for missao in self.missoes:
            if missao.id == id_procurado:
                return missao
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
    => CLASSE DIVIDIDA EM:
    1º Exibição;
    2º Coleta de dados;
    3º Auxiliares Internos
    """

    #   ===== EXIBIÇÃO =====
    def exibir_cabecalho(self):
        """
        => Método que exibe o cabeçalho do programa
        """
        titulo = "🔥 \033[7;30;42mSistema BunkerMode\033[m 🔥"
        print("~=" * 20)
        print(f"{titulo:^46}")
        print("~=" * 20)

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
            print(f"Instrução: {missao.instrucao}")
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
                    f"- {m.missao} | Prazo: {m.prazo or 'Só a de hoje, soldado!'} | Prioridade: {m.prioridade}"
                )
            print("-" * 40)

        if relatorio["concluidas"]:
            print(">>> MISSÕES CONCLUÍDAS <<<")
            for m in relatorio["concluidas"]:
                print(
                    f"- {m.missao} | Finalizada em: {m.prazo or 'Só a de hoje, soldado!'}"
                )
            print("-" * 40)

    #   ===== ENTRADA =====
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

        instrucao = input("Instruções: ")

        return {
            "missao": missao,
            "prioridade": prioridade,
            "prazo": self._solicitar_prazo(),
            "instrucao": instrucao,
            "status": "Aguardando Recruta!",
        }

    def editar_missao_interface(self, missao):
        """Adicionar alguma docstring depois"""
        print("\n--- EDITANDO MISSÃO ---")

        novo_titulo = input(f"Título [{missao.missao}]: ").strip()
        nova_instrucao = input(f"Instrução [{missao.instrucao}]: ").strip()

        nova_prioridade = input(
            f"Prioridade (1-3) [{missao.prioridade}]: "
        ).strip()

        print("Alterar prazo?")
        print("1. Hoje | 2. Amanhã | 3. Data específica | 4. Manter atual")
        escolha_prazo = input("Opção: ").strip()

        dados = {}

        if novo_titulo:
            dados["missao"] = novo_titulo

        if nova_instrucao:
            dados["descricao"] = nova_instrucao

        if nova_prioridade:
            dados["prioridade"] = int(nova_prioridade)

        if escolha_prazo != "4":
            prazo = self._normalizar_prazo(int(escolha_prazo))
            dados["prazo"] = prazo

        return dados

    def _solicitar_prazo(self):
        """Adicionar alguma docstring depois"""
        print("Escolha o prazo: ")
        print("1. Hoje | 2. Amanhã | 3. Data específica (DD-MM-YYYY)")
        print("4. TODO SANTO DIA!!")

        while True:
            try:
                escolha = int(input("Opção: "))
                return self._normalizar_prazo(escolha)
            except ValueError:
                print("Entrada inválida! Escolha um número.")

    def _normalizar_prazo(self, escolha):
        """Adicionar alguma docstring depois"""
        hoje = date.today()

        if escolha == 1:
            return hoje.strftime("%d-%m-%Y")
        elif escolha == 2:
            return (hoje + timedelta(days=1)).strftime("%d-%m-%Y")
        elif escolha == 3:
            return input("Digite a data (DD-MM-ANO): ")
        elif escolha == 4:
            return None
        else:
            print("Opção inválida. Prazo definido para Hoje.")
            return hoje.strftime("%d-%m-%Y")


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
            print("3. Editar Missão")
            print("4. Remover Missão")
            print("5. Relatório do dia")
            print("6. Sair")

            opcao = input("Escolha uma opção: ")

            if opcao == "1":
                dados = self.interface.solicitar_dados_missao()
                nova = self.gerenciador.adicionar_missao(dados)
                print(f"Missão '{nova.missao}' criada com sucesso!")

            elif opcao == "2":
                missoes = self.gerenciador.listar_missoes()
                if not missoes:
                    self.interface.exibir_missoes(missoes)
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
                        if 0 <= indice < len(missoes):
                            missao = missoes[indice]
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
                                            missao.id
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
                if not missoes:
                    self.interface.exibir_missoes(missoes)
                else:
                    self.interface.exibir_missoes(missoes)
                    try:
                        indice = (
                            int(
                                input(
                                    "Digite o número da missão para editar: "
                                )
                            )
                            - 1
                        )

                        if 0 <= indice < len(missoes):
                            missao = missoes[indice]
                            self.interface.exibir_detalhes_missao(missao)

                            novos_dados = (
                                self.interface.editar_missao_interface(missao)
                            )

                            if not novos_dados:
                                print("Nenhuma alteração foi feita.")
                            else:
                                editada = self.gerenciador.editar_missao(
                                    missao.id, novos_dados
                                )
                                print(
                                    f"Missão '{editada.missao}' atualizada com sucesso!"
                                )

                        else:
                            print("Índice inválido.")
                    except ValueError:
                        print("Entrada inválida.")

            elif opcao == "4":
                missoes = self.gerenciador.listar_missoes()
                if not missoes:
                    self.interface.exibir_missoes(missoes)
                else:
                    self.interface.exibir_missoes(missoes)
                    try:
                        indice = (
                            int(
                                input(
                                    "Digite o número da missão para remover: "
                                )
                            )
                            - 1
                        )
                        if 0 <= indice < len(missoes):
                            missao = missoes[indice]
                            removida = self.gerenciador.remover_missao(
                                missao.id
                            )
                            print(
                                f"Missão '{removida.missao}' removida com sucesso!"
                            )

                        else:
                            print("Índice inválido.")

                    except ValueError:
                        print("Entrada inválida.")

            elif opcao == "5":
                relatorio = self.gerenciador.gerar_relatorio()
                self.interface.exibir_relatorio(relatorio)

            elif opcao == "6":
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
