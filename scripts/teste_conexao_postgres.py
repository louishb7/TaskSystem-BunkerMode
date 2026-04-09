import psycopg

conn = psycopg.connect(
    "dbname=bunkermode user=henrique password=aileen2199 host=localhost"
)

with conn.cursor() as cur:
    cur.execute("SELECT current_user, current_database();")
    print(cur.fetchone())

conn.close()
