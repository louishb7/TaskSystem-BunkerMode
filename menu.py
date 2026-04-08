from gerenciador import GerenciadorDeMissoes, MissaoNaoEncontrada
from interface import InterfaceConsole
from missao import STATUS_CONCLUIDA


class Menu:
    """
    Coordena o fluxo principal da aplicação, conectando interface
    e regras de negócio.
    """

    def __init__(
        self,
        gerenciador: GerenciadorDeMissoes,
        interface: InterfaceConsole,
    ):
        """
        Recebe as dependências necessárias para executar o fluxo do menu.
        """
        self.gerenciador = gerenciador
        self.interface = interface

    def exibir_menu(self):
        """Executa o loop principal do sistema até o usuario escolher sair."""
        self.interface.exibir_cabecalho()

        while True:
            print("1. Adicionar Missão")
            print("2. Listar Missões")
            print("3. Ver Detalhes da Missão")
            print("4. Concluir Missão")
            print("5. Editar Missão")
            print("6. Remover Missão")
            print("7. Relatório")
            print("8. Sair")

            opcao = input("Escolha uma opção: ")

            if opcao == "1":
                self._opcao_adicionar_missao()
            elif opcao == "2":
                self._opcao_listar_missoes()
            elif opcao == "3":
                self._opcao_detalhar_missao()
            elif opcao == "4":
                self._opcao_concluir_missao()
            elif opcao == "5":
                self._opcao_editar_missao()
            elif opcao == "6":
                self._opcao_remover_missao()
            elif opcao == "7":
                self._opcao_exibir_relatorio()
            elif opcao == "8":
                print("Até logo!")
                break
            else:
                print("Opção inválida! Escolha novamente.")

    # ===== AÇÕES DO MENU =====
    def _opcao_adicionar_missao(self):
        """Coleta os dados da missão, cria a missão e exibe confirmação."""
        dados = self.interface.solicitar_dados_missao()
        nova = self.gerenciador.adicionar_missao(dados)
        print(f"Missão '{nova.missao}' criada com sucesso!")

    def _opcao_listar_missoes(self):
        """Lista todas as missões cadastradas."""
        missoes = self.gerenciador.listar_missoes()
        self.interface.exibir_missoes(missoes)

    def _opcao_detalhar_missao(self):
        """Obtém uma missão pelo ID informado e exibe seus detalhes."""
        missao = self._obter_missao_por_input(
            "Digite o ID da missão para ver detalhes: "
        )

        if missao is not None:
            self.interface.exibir_detalhes_missao(missao)

    def _opcao_concluir_missao(self):
        """Conclui uma missão pendente escolhida pelo usuário."""
        missao = self._obter_missao_por_input(
            "Digite o ID da missão para concluir: "
        )

        if missao is None:
            return

        if missao.status == STATUS_CONCLUIDA:
            print("Esta missão já está concluída.")
            return

        concluida = self.gerenciador.concluir_missao(missao.id)
        print(f"Missão '{concluida.missao}' marcada como concluída.")

    def _opcao_editar_missao(self):
        """Exibe a missão selecionada, coleta alterações e aplica a edição."""
        missao = self._obter_missao_por_input(
            "Digite o ID da missão para editar: "
        )

        if missao is None:
            return

        self.interface.exibir_detalhes_missao(missao)
        novos_dados = self.interface.editar_missao_interface(missao)

        if not novos_dados:
            print("Nenhuma alteração foi feita.")
            return

        editada = self.gerenciador.editar_missao(missao.id, novos_dados)
        print(f"Missão '{editada.missao}' atualizada com sucesso!")

    def _opcao_remover_missao(self):
        """Remove a missão selecionada e exibe confirmação."""
        missao = self._obter_missao_por_input(
            "Digite o ID da missão para remover: "
        )

        if missao is None:
            return

        removida = self.gerenciador.remover_missao(missao.id)
        print(f"Missão '{removida.missao}' removida com sucesso!")

    def _opcao_exibir_relatorio(self):
        """Gera e exibe o relatório atual das missões."""
        relatorio = self.gerenciador.gerar_relatorio()
        self.interface.exibir_relatorio(relatorio)

    # ===== MÉTODOS AUXILIARES =====
    def _obter_missoes_exibidas(self):
        """
        Obtém as missões atuais, exibe no terminal e retorna a lista.
        """
        missoes = self.gerenciador.listar_missoes()
        self.interface.exibir_missoes(missoes)
        return missoes

    def _selecionar_missao(self, id_procurado):
        """
        Retorna a missão pelo ID informado.

        Retorna None se a missão não existir.
        """
        try:
            return self.gerenciador.buscar_por_id(id_procurado)
        except MissaoNaoEncontrada as e:
            print(e)
            return None

    def _solicitar_id_missao(self, mensagem):
        """Solicita ao usuário um ID de missão e retorna o valor convertido."""
        try:
            return int(input(mensagem))
        except ValueError:
            print("Entrada inválida.")
            return None

    def _obter_missao_por_input(self, mensagem):
        """Exibe as missões, solicita um ID e retorna a missão correspondente."""
        missoes = self._obter_missoes_exibidas()

        if not missoes:
            return None

        id_procurado = self._solicitar_id_missao(mensagem)
        if id_procurado is None:
            return None

        return self._selecionar_missao(id_procurado)
