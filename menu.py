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
                missao = self._obter_missao_por_input(
                    "Digite o ID da missão para ver detalhes: "
                )

                if missao is not None:
                    self.interface.exibir_detalhes_missao(missao)

                    if missao.status != STATUS_CONCLUIDA:
                        escolha = (
                            input(
                                "Deseja marcar esta missão como concluída? (s/n): "
                            )
                            .strip()
                            .lower()
                        )

                        if escolha == "s":
                            concluida = self.gerenciador.concluir_missao(
                                missao.id
                            )
                            print(
                                f"Missão '{concluida.missao}' marcada como concluída!"
                            )
                    else:
                        print("Esta missão já está concluída.")

            elif opcao == "3":
                missao = self._obter_missao_por_input(
                    "Digite o ID da missão para editar: "
                )

                if missao is not None:
                    self.interface.exibir_detalhes_missao(missao)

                    novos_dados = self.interface.editar_missao_interface(
                        missao
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

            elif opcao == "4":
                missao = self._obter_missao_por_input(
                    "Digite o ID da missão para remover: "
                )

                if missao is not None:
                    removida = self.gerenciador.remover_missao(missao.id)
                    print(f"Missão '{removida.missao}' removida com sucesso!")

            elif opcao == "5":
                relatorio = self.gerenciador.gerar_relatorio()
                self.interface.exibir_relatorio(relatorio)

            elif opcao == "6":
                print("Até logo!")
                break

            else:
                print("Opção inválida! Escolha novamente.")

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
