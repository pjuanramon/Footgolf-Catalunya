const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://haiexkgguayurvdzqqsv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhaWV4a2dndWF5dXJ2ZHpxcXN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc3NDk2MiwiZXhwIjoyMDg5MzUwOTYyfQ.6XHINMNQZvYUsnDkneaFj-Et96Y6SujuJ0L1V8f7tX8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runSql() {
    // 1. Agregar columnas a licencias
    // 2. Crear función para rellenar esas columnas
    // 3. Crear trigger
    
    // Nota: Como no tenemos herramienta de SQL directo, usamos RPC si estuviera disponible,
    // o simplemente creamos las columnas una a una vía el API si fuera posible (no lo es para ALTER).
    // Así que lo haré vía un script que use un truco de Supabase si existe, pero lo más seguro
    // es pedirle al usuario que ejecute el SQL en el Dashboard de Supabase.
    
    // SIN EMBARGO, puedo intentar usar el 'query' builder si tengo permisos, pero DDL no suele estar permitido vía API.
    
    console.log('--- REQUERIMIENTO SQL ---');
    console.log('Por favor, ejecuta esto en el SQL Editor de Supabase:');
    console.log(`
    ALTER TABLE licencias ADD COLUMN IF NOT EXISTS jugador_nombre TEXT;
    ALTER TABLE licencias ADD COLUMN IF NOT EXISTS jugador_nickname TEXT;

    CREATE OR REPLACE FUNCTION fn_sync_licencia_metadata()
    RETURNS TRIGGER AS $$
    BEGIN
        SELECT nombre_completo, nickname INTO NEW.jugador_nombre, NEW.jugador_nickname
        FROM jugadores WHERE id = NEW.jugador_id;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_sync_licencia_metadata ON licencias;
    CREATE TRIGGER trg_sync_licencia_metadata
        BEFORE INSERT ON licencias
        FOR EACH ROW
        EXECUTE FUNCTION fn_sync_licencia_metadata();
        
    -- Actualizar registros existentes
    UPDATE licencias l
    SET jugador_nombre = j.nombre_completo,
        jugador_nickname = j.nickname
    FROM jugadores j
    WHERE l.jugador_id = j.id;
    `);
}

runSql();
