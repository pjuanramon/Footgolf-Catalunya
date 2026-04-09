-- ============================================================
-- Liga Catalana de FootGolf — Módulo C: Seguridad (RLS)
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE jugadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE licencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultados_etapas ENABLE ROW LEVEL SECURITY;

-- Debido a que la aplicación utiliza la Service Role Key en el backend (Vercel/Node),
-- no es estrictamente necesario crear políticas para el rol 'anon', ya que la 
-- Service Role Key salta las restricciones de RLS.
-- Esto bloqueará cualquier acceso directo no autorizado desde el frontend 
-- o por terceros que obtengan la clave pública.

-- (Opcional) Si en el futuro quisieras permitir lectura pública directa 
-- para las etapas sin pasar por tu API:
-- CREATE POLICY "Permitir lectura pública de etapas" ON etapas FOR SELECT USING (true);
