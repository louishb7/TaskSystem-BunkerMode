import psycopg

from db_config import get_connection_string


with psycopg.connect(get_connection_string()) as conexao:
    with conexao.cursor() as cursor:
        cursor.execute("SELECT current_user, current_database();")
        print(cursor.fetchone())
