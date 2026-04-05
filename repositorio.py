import os
import json
from missao import Missao


class RepositorioJSON:
    """
    Responsável por carregar e salvar as missões em um arquivo JSON local.
    """

    def _obter_caminho_arquivo(self):
        """Retorna o caminho absoluto do arquivo de persistência."""
        return os.path.join(os.path.dirname(__file__), "missoes.json")

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
        """
        Salva no arquivo JSON o estado atual da lista de missões.
        """
        caminho_arquivo = self._obter_caminho_arquivo()
        dados = [m.__dict__ for m in missoes]

        with open(caminho_arquivo, "w", encoding="utf-8") as arq:
            json.dump(dados, arq, indent=4, ensure_ascii=False)
