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

    def _obter_caminho_arquivo(self):
        """Retorna o caminho absoluto do arquivo de persistência."""
        return self.caminho_arquivo

    def carregar_dados(self):
        """
        Lê o arquivo JSON e recria as missões salvas.

        Retorna uma lista vazia se o arquivo ainda não existir.
        Levanta erro quando o conteúdo estiver inválido ou corrompido.
        """
        caminho_arquivo = self._obter_caminho_arquivo()

        if not os.path.exists(caminho_arquivo):
            return []

        with open(caminho_arquivo, "r", encoding="utf-8") as arquivo:
            try:
                dados = json.load(arquivo)
            except json.JSONDecodeError as e:
                raise ValueError(
                    f"Arquivo de dados inválido ou corrompido: {caminho_arquivo}"
                ) from e

        if not isinstance(dados, list):
            raise ValueError(
                f"Estrutura inválida no arquivo de dados: {caminho_arquivo}"
            )

        try:
            return [Missao(**dado) for dado in dados]
        except (TypeError, ValueError) as e:
            raise ValueError(
                f"Dados de missão inválidos no arquivo: {caminho_arquivo}"
            ) from e

    def salvar_dados(self, missoes):
        """Salva o estado atual das missões no arquivo JSON."""
        caminho_arquivo = self._obter_caminho_arquivo()
        dados = [missao.para_dict() for missao in missoes]

        with open(caminho_arquivo, "w", encoding="utf-8") as arquivo:
            json.dump(dados, arquivo, indent=4, ensure_ascii=False)
