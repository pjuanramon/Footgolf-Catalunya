-- ============================================================
-- Liga Catalana de FootGolf — Módulo B: Triggers automáticos
-- ============================================================

-- ============================================================
-- Función auxiliar: normalizar nombre/nickname
-- Minúsculas, sin tildes, sin espacios dobles
-- ============================================================
CREATE OR REPLACE FUNCTION fn_normalizar_texto(input TEXT)
RETURNS TEXT AS $$
BEGIN
    IF input IS NULL THEN RETURN NULL; END IF;
    RETURN LOWER(
        TRIM(
            regexp_replace(
                translate(
                    input,
                    'ÁÉÍÓÚáéíóúÀÈÌÒÙàèìòùÂÊÎÔÛâêîôûÄËÏÖÜäëïöüÃÕãõÑñÇç',
                    'AEIOUaeiouAEIOUaeiouAEIOUaeiouAEIOUaeiouAOaoNnCc'
                ),
                '\s+', ' ', 'g'
            )
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- Trigger D: Normalizar nickname al insertar/actualizar jugador
-- ============================================================
CREATE OR REPLACE FUNCTION fn_trigger_normalizar_nickname()
RETURNS TRIGGER AS $$
BEGIN
    NEW.nickname_normalizado := fn_normalizar_texto(NEW.nickname);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalizar_nickname ON jugadores;
CREATE TRIGGER trg_normalizar_nickname
    BEFORE INSERT OR UPDATE OF nickname ON jugadores
    FOR EACH ROW
    EXECUTE FUNCTION fn_trigger_normalizar_nickname();

-- ============================================================
-- Trigger A: Recalcular categorías cuando se crea/actualiza jugador
-- ============================================================
-- Categorías:
--   Absoluta   → todos
--   Damas      → genero = 'femenino'
--   Junior     → edad < 17 en el año actual
--   Senior 45+ → edad >= 46 en el año actual
--   Senior 55+ → edad >= 56 en el año actual
--   Rookie     → anio_licencia = año actual o año anterior
-- ============================================================
CREATE OR REPLACE FUNCTION fn_recalcular_categorias()
RETURNS TRIGGER AS $$
DECLARE
    anio_actual INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
    edad INTEGER;
    cats JSONB := '[]'::jsonb;
BEGIN
    -- Siempre Absoluta
    cats := cats || '["Absoluta"]'::jsonb;

    -- Damas
    IF NEW.genero = 'femenino' THEN
        cats := cats || '["Damas"]'::jsonb;
    END IF;

    -- Categorías por edad (basadas en fecha de nacimiento)
    IF NEW.fecha_nacimiento IS NOT NULL THEN
        -- Edad que cumple en el año actual
        edad := anio_actual - EXTRACT(YEAR FROM NEW.fecha_nacimiento)::INTEGER;

        IF edad < 17 THEN
            cats := cats || '["Junior"]'::jsonb;
        END IF;

        IF edad >= 46 THEN
            cats := cats || '["Senior 45 +"]'::jsonb;
        END IF;

        IF edad >= 56 THEN
            cats := cats || '["Senior 55 +"]'::jsonb;
        END IF;
    END IF;

    -- Rookie: anio_licencia es el año actual o el anterior
    IF NEW.anio_licencia IS NOT NULL AND
       NEW.anio_licencia >= (anio_actual - 1) THEN
        NEW.es_rookie := TRUE;
        cats := cats || '["Rookie"]'::jsonb;
    ELSE
        NEW.es_rookie := FALSE;
    END IF;

    -- Eliminar duplicados del array JSON
    SELECT jsonb_agg(DISTINCT value)
    INTO cats
    FROM jsonb_array_elements(cats);

    NEW.categorias_calculadas := COALESCE(cats, '[]'::jsonb);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalcular_categorias ON jugadores;
CREATE TRIGGER trg_recalcular_categorias
    BEFORE INSERT OR UPDATE OF fecha_nacimiento, genero, anio_licencia ON jugadores
    FOR EACH ROW
    EXECUTE FUNCTION fn_recalcular_categorias();

-- ============================================================
-- Trigger B: Actualizar tiene_licencia cuando se registra licencia pagada
-- ============================================================
CREATE OR REPLACE FUNCTION fn_actualizar_licencia_jugador()
RETURNS TRIGGER AS $$
DECLARE
    anio_actual INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
BEGIN
    -- Solo actuar cuando la licencia está pagada y es del año actual
    IF NEW.estado = 'pagada' AND NEW.anio = anio_actual THEN
        UPDATE jugadores
        SET tiene_licencia = TRUE,
            anio_licencia = NEW.anio
        WHERE id = NEW.jugador_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_licencia ON licencias;
CREATE TRIGGER trg_actualizar_licencia
    AFTER INSERT OR UPDATE OF estado ON licencias
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_licencia_jugador();

-- ============================================================
-- Función auxiliar: Calcular fecha de cierre de inscripciones
-- Miércoles anterior a la fecha de la etapa, a las 18:00
-- ============================================================
CREATE OR REPLACE FUNCTION fn_calcular_fecha_cierre(fecha_etapa DATE)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    dia_semana INTEGER;
    dias_hasta_miercoles INTEGER;
    miercoles_anterior DATE;
BEGIN
    -- dow: 0=domingo, 1=lunes, ..., 5=viernes, 6=sábado
    dia_semana := EXTRACT(DOW FROM fecha_etapa)::INTEGER;

    -- Calcular cuántos días restar para llegar al miércoles anterior
    CASE dia_semana
        WHEN 0 THEN dias_hasta_miercoles := 4;  -- domingo → miércoles = -4
        WHEN 1 THEN dias_hasta_miercoles := 5;  -- lunes → miércoles = -5
        WHEN 2 THEN dias_hasta_miercoles := 6;  -- martes → miércoles = -6
        WHEN 3 THEN dias_hasta_miercoles := 7;  -- miércoles → miércoles anterior = -7
        WHEN 4 THEN dias_hasta_miercoles := 1;  -- jueves → miércoles = -1
        WHEN 5 THEN dias_hasta_miercoles := 2;  -- viernes → miércoles = -2
        WHEN 6 THEN dias_hasta_miercoles := 3;  -- sábado → miércoles = -3
    END CASE;

    miercoles_anterior := fecha_etapa - dias_hasta_miercoles;

    -- Devolver como timestamp con hora 18:00 en zona horaria de España
    RETURN (miercoles_anterior::TEXT || ' 18:00:00')::TIMESTAMPTZ AT TIME ZONE 'Europe/Madrid';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- Trigger C: Validar que la etapa esté abierta al inscribirse
-- ============================================================
CREATE OR REPLACE FUNCTION fn_verificar_etapa_abierta()
RETURNS TRIGGER AS $$
DECLARE
    estado_etapa TEXT;
BEGIN
    SELECT estado INTO estado_etapa FROM etapas WHERE id = NEW.etapa_id;
    IF estado_etapa IS NULL OR estado_etapa != 'abierta' THEN
        RAISE EXCEPTION 'No es posible inscribirse: la etapa no está abierta o no existe.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verificar_etapa_abierta ON inscripciones;
CREATE TRIGGER trg_verificar_etapa_abierta
    BEFORE INSERT ON inscripciones
    FOR EACH ROW
    EXECUTE FUNCTION fn_verificar_etapa_abierta();
