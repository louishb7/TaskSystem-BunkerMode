from datetime import date, timedelta
from missao import StatusMissao


class InterfaceConsole:
    """
    Responsável pela interação com o usuário via terminal.

    Centraliza a exibição de informações, a coleta de entradas e
    alguns métodos auxiliares usados apenas no fluxo do console.
    """

    #   ===== EXIBIÇÃO =====
    def exibir_cabecalho(self):
        """Exibe o título principal do sistema no terminal."""
        titulo = "🔥 \033[7;30;42mSistema BunkerMode\033[m 🔥"
        print("~=" * 20)
        print(f"{titulo:^46}")
        print("~=" * 20)

    def exibir_mensagem(self, mensagem):
        """Exibe uma mensagem padrão ao usuário."""
        print(mensagem)

    def exibir_erro(self, mensagem):
        """Exibe uma mensagem de erro ao usuário."""
        print(f"[ERRO] {mensagem}")

    def exibir_missoes(self, missoes):
        """Exibe a lista de missões em formato resumido."""
        if not missoes:
            print("Nenhuma missão cadastrada.")
            return

        print(f"{' =>   OBJETIVOS DO DIA    <=':<20}")
        print("=" * 35)

        for index, m in enumerate(missoes, start=1):
            print(f"=> {m.descricao_prioridade()} <=")

            print(
                f"[ID {m.id}] {m.titulo.capitalize()}\n"
                f"Status: {m.status.value} | Prazo: {m.prazo or 'Permanente'}"
            )
            print("-" * 35)

    def exibir_detalhes_missao(self, missao):
        """Exibe todos os dados relevantes de uma missão."""
        if missao:
            print("\n=== DETALHES DA MISSÃO ===")
            print(f"Título: {missao.titulo}")

            prioridade_texto = missao.descricao_prioridade()

            print(
                f"Prioridade: {missao.prioridade.value} ({prioridade_texto})"
            )
            print(f"Prazo: {missao.prazo or 'Permanente'}")
            print(f"Instrução: {missao.instrucao}")
            print(f"Status: {missao.status.value}")
            print("=" * 35)
        else:
            print("Missão não encontrada.")

    def exibir_relatorio(self, relatorio):
        """Exibe o resumo das missões concluídas e pendentes."""
        print("\n=== RELATÓRIO DE OPERAÇÕES ===")
        print(f"Total: {relatorio['total']}")
        print(f"Concluídas: {len(relatorio['concluidas'])}")
        print(f"Pendentes: {len(relatorio['pendentes'])}")
        print("=" * 40)

        if relatorio["pendentes"]:
            print(">>> MISSÕES PENDENTES <<<")
            for m in relatorio["pendentes"]:
                prazo = m.prazo or "Sem prazo definido"
                print(
                    f"- {m.titulo} | Prazo: {prazo} | Prioridade: {m.prioridade.value}"
                )
            print("-" * 40)

        if relatorio["concluidas"]:
            print(">>> MISSÕES CONCLUÍDAS <<<")
            for m in relatorio["concluidas"]:
                print(f"- {m.titulo}")
            print("-" * 40)

    #   ===== ENTRADA =====
    def solicitar_dados_missao(self):
        """Coleta os dados necessários para criação de uma nova missão."""
        titulo = input("Título da missão: ")
        while True:
            try:
                prioridade = int(input("Prioridade (1-3): "))
                break
            except ValueError:
                self.exibir_erro("Entrada inválida! Digite um número inteiro.")

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
            except ValueError:
                raise ValueError("Digite um número válido.")

        if escolha_prazo != "4":
            try:
                dados["prazo"] = self._normalizar_prazo(int(escolha_prazo))
            except ValueError:
                self.exibir_erro("Prazo inválido. Alteração ignorada.")
        return dados

    #   ===== AUXILIARES =====
    def _solicitar_prazo(self):
        """Solicita uma opção de prazo e retorna o valor correspondente."""
        print("Escolha o prazo: ")
        print("1. Hoje | 2. Amanhã | 3. Data específica (DD-MM-YYYY)")
        print("4. TODO SANTO DIA!!")

        while True:
            try:
                escolha = int(input("Opção: "))
                return self._normalizar_prazo(escolha)
            except ValueError:
                self.exibir_erro("Entrada inválida! Escolha um número.")

    def _normalizar_prazo(self, escolha):
        """
        Converte a opção escolhida no console para o valor final do prazo.

        Retorna a data formatada, None para missões permanentes
        ou solicita uma data manual quando necessário.
        """
        hoje = date.today()

        if escolha == 1:
            return hoje.strftime("%d-%m-%Y")
        elif escolha == 2:
            return (hoje + timedelta(days=1)).strftime("%d-%m-%Y")
        elif escolha == 3:
            return input("Digite a data (DD-MM-YYYY): ")
        elif escolha == 4:
            return None
        else:
            self.exibir_erro("Opção inválida. Prazo definido para Hoje.")
            return hoje.strftime("%d-%m-%Y")
