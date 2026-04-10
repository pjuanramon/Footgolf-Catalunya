-- Añadir columna nombre_manual a la tabla de inscripciones
ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS nombre_manual TEXT;
