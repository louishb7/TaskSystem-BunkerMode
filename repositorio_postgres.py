try:
    import psycopg
except (
    ModuleNotFoundError
):  # pragma: no cover - fallback para ambientes sem driver instalado
    psycopg = None

from gerenciador import RepositorioDeMissoes
from missao import Missao


class ErroRepositorio(ValueError):
    """Erro base para falhas de persistência do repositório."""


class DriverPostgresNaoInstaladoError(ErroRepositorio):
    """Erro levantado quando o driver do PostgreSQL não está disponível."""


class ConexaoRepositorioError(ErroRepositorio):
    """Erro levantado quando não é possível abrir conexão com o banco."""


class LeituraRepositorioError(ErroRepositorio):
    """Erro levantado quando a leitura de missões falha."""


class EscritaRepositorioError(ErroRepositorio):
    """Erro levantado quando uma operação de escrita falha."""


class MissaoNaoPersistidaError(ErroRepositorio):
    """Erro levantado quando a missão esperada não existe no banco."""


class RepositorioPostgres(RepositorioDeMissoes):
    """Responsável por carregar e persistir missões no PostgreSQL."""

    def __init__(self, connection_string: str):
        """Armazena a string de conexão usada pelo repositório."""
        self.connection_string = connection_string

    def _conectar(self):
        """Abre uma nova conexão com o banco de dados."""
        if psycopg is None:
            raise DriverPostgresNaoInstaladoError(
                "Driver psycopg não está instalado no ambiente atual."
            )

        try:
            return psycopg.connect(self.connection_string)
        except psycopg.Error as erro:
            raise ConexaoRepositorioError(
                "Não foi possível conectar ao banco de dados."
            ) from erro

    def _reconstruir_missao(self, linha: tuple) -> Missao:
        """Converte uma linha retornada do banco em objeto Missao."""
        missao_id, titulo, prioridade, prazo, instrucao, status = linha
        return Missao(
            missao_id=missao_id,
            titulo=titulo,
            prioridade=prioridade,
            prazo=prazo,
            instrucao=instrucao,
            status=status,
        )

    def carregar_dados(self) -> list[Missao]:
        """Retorna todas as missões persistidas, ordenadas pelo banco."""
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT missao_id, titulo, prioridade, prazo, instrucao, status
                        FROM missoes
                        ORDER BY prioridade, missao_id;
                        """
                    )
                    linhas = cursor.fetchall()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError(
                "Erro ao carregar missões do banco de dados."
            ) from erro

        return [self._reconstruir_missao(linha) for linha in linhas]

    def buscar_por_id(self, missao_id: int) -> Missao | None:
        """Busca uma missão específica pelo ID e retorna None se não existir."""
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT missao_id, titulo, prioridade, prazo, instrucao, status
                        FROM missoes
                        WHERE missao_id = %s;
                        """,
                        (missao_id,),
                    )
                    linha = cursor.fetchone()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError(
                "Erro ao buscar missão no banco de dados."
            ) from erro

        if linha is None:
            return None

        return self._reconstruir_missao(linha)

    def adicionar_missao(self, missao: Missao) -> None:
        """Insere uma nova missão e atualiza o ID gerado no objeto."""
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO missoes
                        (titulo, prioridade, prazo, instrucao, status)
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING missao_id;
                        """,
                        (
                            missao.titulo,
                            missao.prioridade.value,
                            missao.prazo_date,
                            missao.instrucao,
                            missao.status.value,
                        ),
                    )
                    missao_id = cursor.fetchone()[0]
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao adicionar missão no banco de dados."
            ) from erro

        missao.atualizar_missao_id(missao_id)

    def atualizar_missao(self, missao: Missao) -> None:
        """Atualiza uma missão já persistida no banco de dados."""
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE missoes
                        SET titulo = %s,
                            prioridade = %s,
                            prazo = %s,
                            instrucao = %s,
                            status = %s
                        WHERE missao_id = %s;
                        """,
                        (
                            missao.titulo,
                            missao.prioridade.value,
                            missao.prazo_date,
                            missao.instrucao,
                            missao.status.value,
                            missao.missao_id,
                        ),
                    )
                    if cursor.rowcount == 0:
                        raise MissaoNaoPersistidaError(
                            f"Missão {missao.missao_id} não encontrada para atualização."
                        )
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao atualizar missão no banco de dados."
            ) from erro

    def remover_missao(self, missao_id: int) -> None:
        """Remove uma missão persistida do banco de dados pelo ID."""
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        "DELETE FROM missoes WHERE missao_id = %s;",
                        (missao_id,),
                    )
                    if cursor.rowcount == 0:
                        raise MissaoNaoPersistidaError(
                            f"Missão {missao_id} não encontrada para remoção."
                        )
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao remover missão do banco de dados."
            ) from erro
