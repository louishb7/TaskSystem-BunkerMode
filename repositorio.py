import json
import os

from missao import Missao


class RepositorioJSON:
    """
    Responsável por carregar e salvar as missões em um arquivo JSON local.
    """

    def __init__(self, caminho_arquivo=None):
        """
        Inicializa o repositório com um caminho opcional para o arquivo JSON.

        Se nenhum caminho for informado, usa o arquivo padrão do projeto.
        """
        self.caminho_arquivo = caminho_arquivo or os.path.join(
            os.path.dirname(__file__), "missoes.json"
        )

    def carregar_dados(self):
        """
        Lê o arquivo JSON e recria as missões salvas.

        Retorna uma lista vazia se o arquivo ainda não existir.
        Levanta erro quando o conteúdo estiver inválido ou corrompido.
        """
        if not os.path.exists(self.caminho_arquivo):
            return []

        with open(self.caminho_arquivo, "r", encoding="utf-8") as arquivo:
            try:
                dados = json.load(arquivo)
            except json.JSONDecodeError as e:
                raise ValueError(
                    f"Arquivo de dados inválido ou corrompido: {self.caminho_arquivo}"
                ) from e

        if not isinstance(dados, list):
            raise ValueError(
                f"Estrutura inválida no arquivo de dados: {self.caminho_arquivo}"
            )

        try:
            missoes = []
            for dado in dados:
                missoes.append(
                    Missao(
                        missao_id=dado.get("id"),
                        titulo=dado.get("titulo"),
                        prioridade=dado.get("prioridade"),
                        prazo=dado.get("prazo"),
                        instrucao=dado.get("instrucao"),
                        status=dado.get("status"),
                    )
                )
            return missoes
        except (TypeError, ValueError) as e:
            raise ValueError(
                f"Dados de missão inválidos no arquivo: {self.caminho_arquivo}"
            ) from e

    def salvar_dados(self, missoes):
        """Salva o estado atual das missões no arquivo JSON."""
        dados = [missao.para_dict() for missao in missoes]

        with open(self.caminho_arquivo, "w", encoding="utf-8") as arquivo:
            json.dump(dados, arquivo, indent=4, ensure_ascii=False)
