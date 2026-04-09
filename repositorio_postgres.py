import psycopg

from missao import Missao


class RepositorioPostgres:
    """Responsável por carregar e persistir missões no PostgreSQL."""

    def __init__(self, connection_string):
        """Armazena a string de conexão usada pelo repositório."""
        self.connection_string = connection_string

    def _conectar(self):
        """Abre uma nova conexão com o banco de dados."""
        try:
            return psycopg.connect(self.connection_string)
        except psycopg.Error as erro:
            raise ValueError("Não foi possível conectar ao banco de dados.") from erro

    def carregar_dados(self):
        """Retorna todas as missões persistidas, já reconstruídas como objetos."""
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
                    resultados = cursor.fetchall()
        except psycopg.Error as erro:
            raise ValueError("Erro ao carregar missões do banco de dados.") from erro

        missoes = []

        for resultado in resultados:
            missao_id, titulo, prioridade, prazo, instrucao, status = resultado

            if prazo is None:
                prazo_formatado = None
            elif isinstance(prazo, str):
                prazo_formatado = prazo
            else:
                prazo_formatado = prazo.strftime("%d-%m-%Y")

            missoes.append(
                Missao(
                    missao_id=missao_id,
                    titulo=titulo,
                    prioridade=prioridade,
                    prazo=prazo_formatado,
                    instrucao=instrucao,
                    status=status,
                )
            )

        return missoes

    def adicionar_missao(self, missao):
        """Insere uma nova missão e atualiza o ID gerado no objeto em memória."""
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
                            missao.prazo,
                            missao.instrucao,
                            missao.status.value,
                        ),
                    )
                    missao.atualizar_missao_id(cursor.fetchone()[0])
                conexao.commit()
        except psycopg.Error as erro:
            raise ValueError("Erro ao adicionar missão no banco de dados.") from erro

    def atualizar_missao(self, missao):
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
                            missao.prazo,
                            missao.instrucao,
                            missao.status.value,
                            missao.missao_id,
                        ),
                    )
                conexao.commit()
        except psycopg.Error as erro:
            raise ValueError("Erro ao atualizar missão no banco de dados.") from erro

    def remover_missao(self, missao_id):
        """Remove uma missão persistida do banco de dados pelo ID."""
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        "DELETE FROM missoes WHERE missao_id = %s;",
                        (missao_id,),
                    )
                conexao.commit()
        except psycopg.Error as erro:
            raise ValueError("Erro ao remover missão do banco de dados.") from erro
