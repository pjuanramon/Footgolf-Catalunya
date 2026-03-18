-- ============================================================
-- Liga Catalana de FootGolf — Módulo A: Tablas principales
-- ============================================================
-- Ejecutar en Supabase SQL Editor o via supabase db push

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Tabla: jugadores
-- ============================================================
CREATE TABLE IF NOT EXISTS jugadores (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nickname                TEXT NOT NULL UNIQUE,
    nickname_normalizado    TEXT,  -- versión sin tildes, minúsculas
    nombre_completo         TEXT,
    email                   TEXT UNIQUE,
    fecha_nacimiento        DATE,
    genero                  TEXT CHECK (genero IN ('masculino', 'femenino')),
    telefono                TEXT,
    club                    TEXT,
    anio_licencia           INTEGER,
    tiene_licencia          BOOLEAN DEFAULT FALSE,
    es_rookie               BOOLEAN DEFAULT FALSE,
    categorias_calculadas   JSONB DEFAULT '[]'::jsonb,
    override_precio_licencia NUMERIC,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_jugadores_nickname_norm ON jugadores (nickname_normalizado);
CREATE INDEX IF NOT EXISTS idx_jugadores_email ON jugadores (email);
CREATE INDEX IF NOT EXISTS idx_jugadores_tiene_licencia ON jugadores (tiene_licencia);

-- ============================================================
-- Tabla: etapas
-- ============================================================
CREATE TABLE IF NOT EXISTS etapas (
    id                  INTEGER PRIMARY KEY,
    nombre              TEXT NOT NULL,
    fecha               DATE NOT NULL,
    precio_inscripcion  NUMERIC DEFAULT 22,
    estado              TEXT DEFAULT 'cerrada' CHECK (estado IN ('abierta', 'cerrada', 'finalizada')),
    archivo_excel       TEXT
);

CREATE INDEX IF NOT EXISTS idx_etapas_estado ON etapas (estado);
CREATE INDEX IF NOT EXISTS idx_etapas_fecha ON etapas (fecha);

-- ============================================================
-- Tabla: licencias
-- ============================================================
CREATE TABLE IF NOT EXISTS licencias (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jugador_id          UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
    anio                INTEGER NOT NULL,
    fecha_compra        TIMESTAMPTZ DEFAULT NOW(),
    stripe_payment_id   TEXT,
    estado              TEXT DEFAULT 'pendiente' CHECK (estado IN ('pagada', 'pendiente', 'fallida'))
);

CREATE INDEX IF NOT EXISTS idx_licencias_jugador ON licencias (jugador_id);
CREATE INDEX IF NOT EXISTS idx_licencias_estado ON licencias (estado);
CREATE INDEX IF NOT EXISTS idx_licencias_anio ON licencias (anio);

-- ============================================================
-- Tabla: inscripciones
-- ============================================================
CREATE TABLE IF NOT EXISTS inscripciones (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jugador_id          UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
    etapa_id            INTEGER NOT NULL REFERENCES etapas(id) ON DELETE CASCADE,
    fecha_inscripcion   TIMESTAMPTZ DEFAULT NOW(),
    stripe_payment_id   TEXT,
    estado              TEXT DEFAULT 'pendiente' CHECK (estado IN ('pagada', 'pendiente', 'fallida')),
    -- Un jugador no puede inscribirse dos veces a la misma etapa
    CONSTRAINT uq_inscripcion_jugador_etapa UNIQUE (jugador_id, etapa_id)
);

CREATE INDEX IF NOT EXISTS idx_inscripciones_jugador ON inscripciones (jugador_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_etapa ON inscripciones (etapa_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_estado ON inscripciones (estado);

-- ============================================================
-- Datos iniciales: Etapas de la temporada 2026
-- ============================================================
-- (Ajustar fechas según calendario real)
INSERT INTO etapas (id, nombre, fecha, precio_inscripcion, estado) VALUES
    (1, 'Etapa 1', '2026-01-25', 22, 'finalizada'),
    (2, 'Etapa 2', '2026-02-22', 22, 'finalizada'),
    (3, 'Etapa 3', '2026-03-15', 22, 'finalizada'),
    (4, 'Etapa 4', '2026-04-26', 22, 'cerrada'),
    (5, 'Etapa 5', '2026-05-23', 22, 'cerrada'),
    (6, 'Etapa 6', '2026-06-20', 22, 'cerrada'),
    (7, 'Etapa 7', '2026-09-19', 22, 'cerrada'),
    (8, 'Etapa 8', '2026-10-17', 22, 'cerrada'),
    (9, 'Etapa 9', '2026-11-14', 22, 'cerrada'),
    (10, 'Etapa 10', '2026-12-12', 22, 'cerrada')
ON CONFLICT (id) DO NOTHING;
