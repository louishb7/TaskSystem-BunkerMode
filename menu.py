from core_exceptions import MissaoNaoEncontrada


class Menu:
    """
    Coordena o fluxo principal da aplicação, conectando interface
    e regras de negócio.
    """

    def __init__(self, gerenciador, interface):
        """
        Recebe as dependências necessárias para executar o fluxo do menu.
        """
        self.gerenciador = gerenciador
        self.interface = interface

    def exibir_menu(self):
        """Executa o loop principal do sistema até o usuário escolher sair."""
        self.interface.exibir_cabecalho()

        while True:
            self.interface.exibir_opcoes_menu()
            opcao = self.interface.solicitar_opcao_menu()

            if opcao == "1":
                self._executar_acao(self._opcao_adicionar_missao)
            elif opcao == "2":
                self._executar_acao(self._opcao_listar_missoes)
            elif opcao == "3":
                self._executar_acao(self._opcao_detalhar_missao)
            elif opcao == "4":
                self._executar_acao(self._opcao_concluir_missao)
            elif opcao == "5":
                self._executar_acao(self._opcao_editar_missao)
            elif opcao == "6":
                self._executar_acao(self._opcao_remover_missao)
            elif opcao == "7":
                self._executar_acao(self._opcao_exibir_relatorio)
            elif opcao == "8":
                self.interface.exibir_mensagem("Até logo!")
                break
            else:
                self.interface.exibir_erro("Opção inválida!")

    def _executar_acao(self, funcao):
        """Executa uma ação do menu com tratamento de erros esperados."""
        try:
            funcao()
        except ValueError as e:
            self.interface.exibir_erro(str(e))

    # ===== AÇÕES DO MENU =====
    def _opcao_adicionar_missao(self):
        """Coleta os dados da missão, cria a missão e exibe confirmação."""
        dados = self.interface.solicitar_dados_missao()
        nova_missao = self.gerenciador.adicionar_missao(dados)
        self.interface.exibir_mensagem(
            f"Missão '{nova_missao.titulo}' criada com sucesso!"
        )

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

        concluida = self.gerenciador.concluir_missao(missao.missao_id)
        self.interface.exibir_mensagem(
            f"Missão '{concluida.titulo}' marcada como concluída."
        )

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
            self.interface.exibir_mensagem("Nenhuma alteração foi feita.")
            return

        editada = self.gerenciador.editar_missao(missao.missao_id, novos_dados)
        self.interface.exibir_mensagem(
            f"Missão '{editada.titulo}' atualizada com sucesso!"
        )

    def _opcao_remover_missao(self):
        """Remove a missão selecionada e exibe confirmação."""
        missao = self._obter_missao_por_input(
            "Digite o ID da missão para remover: "
        )
        if missao is None:
            return

        removida = self.gerenciador.remover_missao(missao.missao_id)
        self.interface.exibir_mensagem(
            f"Missão '{removida.titulo}' removida com sucesso!"
        )

    def _opcao_exibir_relatorio(self):
        """Gera e exibe o relatório atual das missões."""
        relatorio = self.gerenciador.gerar_relatorio()
        self.interface.exibir_relatorio(relatorio)

    # ===== MÉTODOS AUXILIARES =====
    def _selecionar_missao(self, id_procurado):
        """
        Retorna a missão pelo ID informado.

        Retorna None se a missão não existir.
        """
        try:
            return self.gerenciador.buscar_por_id(id_procurado)
        except Exception as e:
            if isinstance(e, MissaoNaoEncontrada) or e.__class__.__name__ == "MissaoNaoEncontrada":
                self.interface.exibir_erro(str(e))
                return None
            raise

    def _solicitar_id_missao(self, mensagem):
        """Solicita ao usuário um ID de missão e retorna o valor convertido."""
        try:
            return self.interface.solicitar_id_missao(mensagem)
        except ValueError:
            self.interface.exibir_erro("Entrada inválida.")
            return None

    def _obter_missao_por_input(self, mensagem):
        """Exibe as missões, solicita um ID e retorna a missão correspondente."""
        missoes = self.gerenciador.listar_missoes()

        if not missoes:
            self.interface.exibir_mensagem("Nenhuma missão cadastrada.")
            return None

        self.interface.exibir_missoes(missoes)

        id_procurado = self._solicitar_id_missao(mensagem)
        if id_procurado is None:
            return None

        return self._selecionar_missao(id_procurado)
