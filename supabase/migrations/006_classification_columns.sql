
-- Asegurar que la tabla resultados_etapas tenga todas las categorías necesarias
-- Si por algún motivo la tabla no existe (aunque vimos que sí), la creamos preventivamente
CREATE TABLE IF NOT EXISTS resultados_etapas (
    etapa_id INTEGER REFERENCES etapas(id) ON DELETE CASCADE,
    jugador_id UUID REFERENCES jugadores(id) ON DELETE CASCADE,
    puntos_absoluta NUMERIC DEFAULT 0,
    puntos_rookie NUMERIC DEFAULT 0,
    puntos_senior45 NUMERIC DEFAULT 0,
    puntos_senior55 NUMERIC DEFAULT 0,
    puntos_damas NUMERIC DEFAULT 0,
    puntos_junior NUMERIC DEFAULT 0,
    score NUMERIC,
    PRIMARY KEY (etapa_id, jugador_id)
);

-- Si la tabla ya existía pero con otros nombres o le faltaban columnas:
ALTER TABLE resultados_etapas ADD COLUMN IF NOT EXISTS puntos_damas NUMERIC DEFAULT 0;
ALTER TABLE resultados_etapas ADD COLUMN IF NOT EXISTS puntos_junior NUMERIC DEFAULT 0;

-- Migrar datos de puntos_femenino a puntos_damas si existiera la columna antigua
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='resultados_etapas' AND column_name='puntos_femenino') THEN
        UPDATE resultados_etapas SET puntos_damas = puntos_femenino WHERE puntos_damas = 0;
        -- Opcional: ALTER TABLE resultados_etapas DROP COLUMN puntos_femenino;
    END IF;
END $$;
