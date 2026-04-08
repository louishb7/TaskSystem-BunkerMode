import os
import json
from missao import Missao


class RepositorioJSON:
    """
    Responsável por carregar e salvar as missões em um arquivo JSON local.
    """

    def __init__(self, caminho_arquivo=None):
        """
        Inicializa o repositório com um caminho opcional para o arquivo JSON.

        Se nenhum caminho for informado, usa o arquivo padrao do projeto.
        """
        self.caminho_arquivo = caminho_arquivo or os.path.join(
            os.path.dirname(__file__), "missoes.json"
        )

    def _obter_caminho_arquivo(self):
        """Retorna o caminho absoluto do arquivo de persistência."""
        return self.caminho_arquivo

    def carregar_dados(self):
        """
        Lê o arquivo JSON e recria as missões salvas.

        Retorna uma lista vazia se o arquivo não existir
        ou se o conteúdo estiver inválido.
        """
        caminho_arquivo = self._obter_caminho_arquivo()

        if os.path.exists(caminho_arquivo):
            with open(caminho_arquivo, "r", encoding="utf-8") as arq:
                try:
                    dados = json.load(arq)
                except json.JSONDecodeError:
                    return []
                return [Missao(**d) for d in dados]
        return []

    def salvar_dados(self, missoes):
        caminho_arquivo = self._obter_caminho_arquivo()
        dados = [m.para_dict() for m in missoes]

        with open(caminho_arquivo, "w", encoding="utf-8") as arq:
            json.dump(dados, arq, indent=4, ensure_ascii=False)
