from datetime import date, timedelta

from missao import StatusMissao


class InterfaceConsole:
    """
    Responsável pela interação com o usuário via terminal.

    Centraliza a exibição de informações, a coleta de entradas e
    métodos auxiliares usados apenas no fluxo do console.
    """

    # ===== EXIBIÇÃO =====
    def exibir_cabecalho(self):
        """Exibe o título principal do sistema no terminal."""
        titulo = "🔥 \033[7;30;42mSistema BunkerMode\033[m 🔥"
        print("~=" * 20)
        print(f"{titulo:^46}")
        print("~=" * 20)

    def exibir_opcoes_menu(self):
        """Exibe as opções principais do menu."""
        print("1. Adicionar Missão")
        print("2. Listar Missões")
        print("3. Ver Detalhes da Missão")
        print("4. Concluir Missão")
        print("5. Editar Missão")
        print("6. Remover Missão")
        print("7. Relatório")
        print("8. Sair")

    def exibir_mensagem(self, mensagem):
        """Exibe uma mensagem padrão ao usuário."""
        print(mensagem)

    def exibir_erro(self, mensagem):
        """Exibe uma mensagem de erro ao usuário."""
        print(f"[ERRO] {mensagem}")

    def exibir_missoes(self, missoes):
        """Exibe a lista de missões em formato resumido."""
        if not missoes:
            self.exibir_mensagem("Nenhuma missão cadastrada.")
            return

        print(" =>   OBJETIVOS DO DIA    <=")
        print("=" * 35)

        for missao in missoes:
            print(f"=> {missao.descricao_prioridade()} <=")
            print(
                f"[ID {missao.missao_id}] {missao.titulo}\n"
                f"Status: {missao.status.value} | "
                f"Prazo: {missao.prazo or 'Permanente'}"
            )
            print("-" * 35)

    def exibir_detalhes_missao(self, missao):
        """Exibe todos os dados relevantes de uma missão."""
        print("\n=== DETALHES DA MISSÃO ===")
        print(f"Título: {missao.titulo}")
        print(
            f"Prioridade: {missao.prioridade.value} "
            f"({missao.descricao_prioridade()})"
        )
        print(f"Prazo: {missao.prazo or 'Permanente'}")
        print(f"Instrução: {missao.instrucao}")
        print(f"Status: {missao.status.value}")
        print("=" * 35)

    def exibir_relatorio(self, relatorio):
        """Exibe o resumo das missões concluídas e pendentes."""
        print("\n=== RELATÓRIO DE OPERAÇÕES ===")
        print(f"Total: {relatorio['total']}")
        print(f"Concluídas: {len(relatorio['concluidas'])}")
        print(f"Pendentes: {len(relatorio['pendentes'])}")
        print("=" * 40)

        if relatorio["pendentes"]:
            print(">>> MISSÕES PENDENTES <<<")
            for missao in relatorio["pendentes"]:
                prazo = missao.prazo or "Sem prazo definido"
                print(
                    f"- {missao.titulo} | "
                    f"Prazo: {prazo} | "
                    f"Prioridade: {missao.prioridade.value}"
                )
            print("-" * 40)

        if relatorio["concluidas"]:
            print(">>> MISSÕES CONCLUÍDAS <<<")
            for missao in relatorio["concluidas"]:
                print(f"- {missao.titulo}")
            print("-" * 40)

    # ===== ENTRADA =====
    def solicitar_opcao_menu(self):
        """Solicita ao usuário a opção principal do menu."""
        return input("Escolha uma opção: ").strip()

    def solicitar_id_missao(self, mensagem):
        """Solicita um ID de missão e retorna o valor convertido."""
        return int(input(mensagem).strip())

    def solicitar_dados_missao(self):
        """Coleta os dados necessários para criação de uma nova missão."""
        titulo = input("Título da missão: ")
        prioridade = self._solicitar_prioridade("Prioridade (1-3): ")
        instrucao = input("Instruções: ")

        return {
            "titulo": titulo,
            "prioridade": prioridade,
            "prazo": self._solicitar_prazo(),
            "instrucao": instrucao,
            "status": StatusMissao.PENDENTE,
        }

    def editar_missao_interface(self, missao):
        """
        Coleta alterações parciais para uma missão existente.

        Campos em branco mantêm seus valores atuais.
        """
        print("\n--- EDITANDO MISSÃO ---")

        novo_titulo = input(f"Título [{missao.titulo}]: ").strip()
        nova_instrucao = input(f"Instrução [{missao.instrucao}]: ").strip()
        nova_prioridade = input(
            f"Prioridade (1-3) [{missao.prioridade.value}]: "
        ).strip()

        print("Alterar prazo?")
        print("1. Hoje | 2. Amanhã | 3. Data específica | 4. Manter atual")
        escolha_prazo = input("Opção: ").strip()

        dados = {}

        if novo_titulo:
            dados["titulo"] = novo_titulo

        if nova_instrucao:
            dados["instrucao"] = nova_instrucao

        if nova_prioridade:
            try:
                dados["prioridade"] = int(nova_prioridade)
            except ValueError as e:
                raise ValueError(
                    "Digite um número válido para prioridade."
                ) from e

        if escolha_prazo != "4":
            try:
                dados["prazo"] = self._normalizar_prazo(int(escolha_prazo))
            except ValueError as e:
                raise ValueError("Opção de prazo inválida.") from e

        return dados

    # ===== AUXILIARES =====
    def _solicitar_prioridade(self, mensagem):
        """Solicita uma prioridade válida ao usuário."""
        while True:
            try:
                prioridade = int(input(mensagem).strip())

                if prioridade not in [1, 2, 3]:
                    self.exibir_erro("Prioridade inválida. Escolha 1, 2 ou 3.")
                    continue

                return prioridade
            except ValueError:
                self.exibir_erro("Entrada inválida! Digite um número inteiro.")

    def _solicitar_prazo(self):
        """Solicita uma opção de prazo e retorna o valor correspondente."""
        print("Escolha o prazo: ")
        print("1. Hoje | 2. Amanhã | 3. Data específica (DD-MM-YYYY)")
        print("4. TODO SANTO DIA!!")

        while True:
            try:
                escolha = int(input("Opção: ").strip())
                return self._normalizar_prazo(escolha)
            except ValueError as e:
                self.exibir_erro(str(e))

    def _normalizar_prazo(self, escolha):
        """
        Converte a opção escolhida no console para o valor final do prazo.

        Retorna a data formatada, None para missões permanentes
        ou solicita uma data manual quando necessário.
        """
        hoje = date.today()

        if escolha == 1:
            return hoje.strftime("%d-%m-%Y")
        if escolha == 2:
            return (hoje + timedelta(days=1)).strftime("%d-%m-%Y")
        if escolha == 3:
            return input("Digite a data (DD-MM-YYYY): ").strip()
        if escolha == 4:
            return None

        raise ValueError("Opção inválida. Escolha um número entre 1 e 4.")
