
-- Añadir columna para el alias oficial de Footgolf World
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS alias_footgolfworld TEXT;
