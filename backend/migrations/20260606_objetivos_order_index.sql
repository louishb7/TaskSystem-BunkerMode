ALTER TABLE IF EXISTS objetivos
ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0;

UPDATE objetivos AS objetivo
SET order_index = ordenado.position
FROM (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY usuario_id, sonho_id
               ORDER BY created_at ASC, id ASC
           ) AS position
    FROM objetivos
    WHERE order_index = 0
) AS ordenado
WHERE objetivo.id = ordenado.id;
