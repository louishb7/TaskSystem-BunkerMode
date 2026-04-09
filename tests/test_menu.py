from gerenciador import MissaoNaoEncontrada
from menu import Menu
from missao import Missao, PrioridadeMissao, StatusMissao


class InterfaceFake:
    def __init__(self):
        self.mensagens = []
        self.erros = []
        self.missoes_exibidas = []
        self.detalhes_exibidos = []
        self.relatorios_exibidos = []
        self.opcoes = []
        self.ids = []
        self.dados_missao = None
        self.dados_edicao = None
        self.cabecalho_exibido = False
        self.menu_exibido = 0

    def exibir_cabecalho(self):
        self.cabecalho_exibido = True

    def exibir_opcoes_menu(self):
        self.menu_exibido += 1

    def solicitar_opcao_menu(self):
        return self.opcoes.pop(0)

    def exibir_mensagem(self, mensagem):
        self.mensagens.append(mensagem)

    def exibir_erro(self, mensagem):
        self.erros.append(mensagem)

    def solicitar_dados_missao(self):
        return self.dados_missao

    def exibir_missoes(self, missoes):
        self.missoes_exibidas.append(missoes)

    def solicitar_id_missao(self, mensagem):
        valor = self.ids.pop(0)
        if isinstance(valor, Exception):
            raise valor
        return valor

    def exibir_detalhes_missao(self, missao):
        self.detalhes_exibidos.append(missao)

    def editar_missao_interface(self, missao):
        return self.dados_edicao

    def exibir_relatorio(self, relatorio):
        self.relatorios_exibidos.append(relatorio)


class GerenciadorFake:
    def __init__(self, missoes=None):
        self.missoes = missoes or []
        self.relatorio = {"total": len(self.missoes), "concluidas": [], "pendentes": self.missoes}
        self.dados_adicionados = None
        self.edicoes = []
        self.concluidas = []
        self.removidas = []

    def adicionar_missao(self, dados):
        self.dados_adicionados = dados
        missao = Missao(id=1, **dados)
        self.missoes.append(missao)
        return missao

    def listar_missoes(self):
        return list(self.missoes)

    def buscar_por_id(self, id_procurado):
        for missao in self.missoes:
            if missao.id == id_procurado:
                return missao
        raise MissaoNaoEncontrada(f"Missão {id_procurado} não encontrada")

    def concluir_missao(self, id_procurado):
        missao = self.buscar_por_id(id_procurado)
        self.concluidas.append(id_procurado)
        missao.status = StatusMissao.CONCLUIDA
        return missao

    def editar_missao(self, id_procurado, novos_dados):
        missao = self.buscar_por_id(id_procurado)
        self.edicoes.append((id_procurado, novos_dados))
        if "titulo" in novos_dados:
            missao.titulo = novos_dados["titulo"]
        return missao

    def remover_missao(self, id_procurado):
        missao = self.buscar_por_id(id_procurado)
        self.removidas.append(id_procurado)
        self.missoes.remove(missao)
        return missao

    def gerar_relatorio(self):
        return self.relatorio



def criar_missao(id=1, titulo="Treinar"):
    return Missao(
        id=id,
        titulo=titulo,
        prioridade=PrioridadeMissao.ALTA,
        prazo="10-04-2026",
        instrucao="Instrução",
        status=StatusMissao.PENDENTE,
    )



def test_exibir_menu_sai_corretamente():
    interface = InterfaceFake()
    interface.opcoes = ["8"]
    menu = Menu(GerenciadorFake(), interface)

    menu.exibir_menu()

    assert interface.cabecalho_exibido is True
    assert interface.menu_exibido == 1
    assert interface.mensagens[-1] == "Até logo!"



def test_exibir_menu_opcao_invalida():
    interface = InterfaceFake()
    interface.opcoes = ["9", "8"]
    menu = Menu(GerenciadorFake(), interface)

    menu.exibir_menu()

    assert interface.erros == ["Opção inválida!"]



def test_executar_acao_trata_value_error():
    interface = InterfaceFake()
    menu = Menu(GerenciadorFake(), interface)

    def falhar():
        raise ValueError("erro esperado")

    menu._executar_acao(falhar)

    assert interface.erros == ["erro esperado"]



def test_opcao_adicionar_missao():
    interface = InterfaceFake()
    interface.dados_missao = {
        "titulo": "Nova",
        "prioridade": 1,
        "prazo": "10-04-2026",
        "instrucao": "Executar",
        "status": StatusMissao.PENDENTE,
    }
    gerenciador = GerenciadorFake()
    menu = Menu(gerenciador, interface)

    menu._opcao_adicionar_missao()

    assert gerenciador.dados_adicionados == interface.dados_missao
    assert interface.mensagens[-1] == "Missão 'Nova' criada com sucesso!"



def test_opcao_listar_missoes():
    missao = criar_missao()
    interface = InterfaceFake()
    gerenciador = GerenciadorFake([missao])
    menu = Menu(gerenciador, interface)

    menu._opcao_listar_missoes()

    assert interface.missoes_exibidas[-1] == [missao]



def test_opcao_detalhar_missao():
    missao = criar_missao()
    interface = InterfaceFake()
    interface.ids = [1]
    gerenciador = GerenciadorFake([missao])
    menu = Menu(gerenciador, interface)

    menu._opcao_detalhar_missao()

    assert interface.detalhes_exibidos[-1] is missao



def test_opcao_concluir_missao():
    missao = criar_missao()
    interface = InterfaceFake()
    interface.ids = [1]
    gerenciador = GerenciadorFake([missao])
    menu = Menu(gerenciador, interface)

    menu._opcao_concluir_missao()

    assert gerenciador.concluidas == [1]
    assert interface.mensagens[-1] == "Missão 'Treinar' marcada como concluída."



def test_opcao_concluir_missao_sem_missao():
    interface = InterfaceFake()
    gerenciador = GerenciadorFake([])
    menu = Menu(gerenciador, interface)

    menu._opcao_concluir_missao()

    assert interface.mensagens[-1] == "Nenhuma missão cadastrada."



def test_opcao_editar_missao():
    missao = criar_missao()
    interface = InterfaceFake()
    interface.ids = [1]
    interface.dados_edicao = {"titulo": "Atualizada"}
    gerenciador = GerenciadorFake([missao])
    menu = Menu(gerenciador, interface)

    menu._opcao_editar_missao()

    assert interface.detalhes_exibidos[-1] is missao
    assert gerenciador.edicoes == [(1, {"titulo": "Atualizada"})]
    assert interface.mensagens[-1] == "Missão 'Atualizada' atualizada com sucesso!"



def test_opcao_editar_missao_sem_alteracoes():
    missao = criar_missao()
    interface = InterfaceFake()
    interface.ids = [1]
    interface.dados_edicao = {}
    gerenciador = GerenciadorFake([missao])
    menu = Menu(gerenciador, interface)

    menu._opcao_editar_missao()

    assert gerenciador.edicoes == []
    assert interface.mensagens[-1] == "Nenhuma alteração foi feita."



def test_opcao_editar_missao_sem_missao():
    interface = InterfaceFake()
    gerenciador = GerenciadorFake([])
    menu = Menu(gerenciador, interface)

    menu._opcao_editar_missao()

    assert interface.mensagens[-1] == "Nenhuma missão cadastrada."



def test_opcao_remover_missao():
    missao = criar_missao()
    interface = InterfaceFake()
    interface.ids = [1]
    gerenciador = GerenciadorFake([missao])
    menu = Menu(gerenciador, interface)

    menu._opcao_remover_missao()

    assert gerenciador.removidas == [1]
    assert interface.mensagens[-1] == "Missão 'Treinar' removida com sucesso!"



def test_opcao_remover_missao_sem_missao():
    interface = InterfaceFake()
    gerenciador = GerenciadorFake([])
    menu = Menu(gerenciador, interface)

    menu._opcao_remover_missao()

    assert interface.mensagens[-1] == "Nenhuma missão cadastrada."



def test_opcao_exibir_relatorio():
    interface = InterfaceFake()
    gerenciador = GerenciadorFake([criar_missao()])
    menu = Menu(gerenciador, interface)

    menu._opcao_exibir_relatorio()

    assert interface.relatorios_exibidos[-1] == gerenciador.relatorio



def test_selecionar_missao_existente():
    missao = criar_missao()
    interface = InterfaceFake()
    gerenciador = GerenciadorFake([missao])
    menu = Menu(gerenciador, interface)

    assert menu._selecionar_missao(1) is missao



def test_selecionar_missao_inexistente():
    interface = InterfaceFake()
    gerenciador = GerenciadorFake([])
    menu = Menu(gerenciador, interface)

    resultado = menu._selecionar_missao(1)

    assert resultado is None
    assert interface.erros == ["Missão 1 não encontrada"]



def test_solicitar_id_missao_valido():
    interface = InterfaceFake()
    interface.ids = [3]
    menu = Menu(GerenciadorFake(), interface)

    assert menu._solicitar_id_missao("ID: ") == 3



def test_solicitar_id_missao_invalido():
    interface = InterfaceFake()
    interface.ids = [ValueError()]
    menu = Menu(GerenciadorFake(), interface)

    resultado = menu._solicitar_id_missao("ID: ")

    assert resultado is None
    assert interface.erros == ["Entrada inválida."]



def test_obter_missao_por_input_sem_missoes():
    interface = InterfaceFake()
    gerenciador = GerenciadorFake([])
    menu = Menu(gerenciador, interface)

    resultado = menu._obter_missao_por_input("ID: ")

    assert resultado is None
    assert interface.mensagens[-1] == "Nenhuma missão cadastrada."



def test_obter_missao_por_input_com_id_invalido():
    missao = criar_missao()
    interface = InterfaceFake()
    interface.ids = [ValueError()]
    gerenciador = GerenciadorFake([missao])
    menu = Menu(gerenciador, interface)

    resultado = menu._obter_missao_por_input("ID: ")

    assert resultado is None
    assert interface.missoes_exibidas[-1] == [missao]
    assert interface.erros == ["Entrada inválida."]



def test_obter_missao_por_input_com_sucesso():
    missao = criar_missao()
    interface = InterfaceFake()
    interface.ids = [1]
    gerenciador = GerenciadorFake([missao])
    menu = Menu(gerenciador, interface)

    resultado = menu._obter_missao_por_input("ID: ")

    assert resultado is missao
    assert interface.missoes_exibidas[-1] == [missao]


def test_exibir_menu_cobre_todas_as_opcoes():
    interface = InterfaceFake()
    interface.opcoes = ["1", "2", "3", "4", "5", "6", "7", "8"]
    interface.ids = [1, 1, 1, 1]
    interface.dados_missao = {
        "titulo": "Nova",
        "prioridade": 1,
        "prazo": "10-04-2026",
        "instrucao": "Executar",
        "status": StatusMissao.PENDENTE,
    }
    interface.dados_edicao = {"titulo": "Editada"}
    gerenciador = GerenciadorFake([criar_missao()])
    menu = Menu(gerenciador, interface)

    menu.exibir_menu()

    assert interface.cabecalho_exibido is True
    assert interface.menu_exibido == 8
    assert gerenciador.dados_adicionados == interface.dados_missao
    assert gerenciador.concluidas == [1]
    assert gerenciador.removidas == [1]
    assert interface.relatorios_exibidos
    assert interface.mensagens[-1] == "Até logo!"
