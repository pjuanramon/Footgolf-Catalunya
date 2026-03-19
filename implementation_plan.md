## Proposed Changes

### Database Migration (SQL Required)
- **Table `etapas`**: Add `tipo` (individual/equipos), `precio_equipo` (NUMERIC), and `ubicacion` (TEXT).
- **Table `inscripciones`**: Add `equipo_nombre` (TEXT) to track which team is paying.

### Database Maintenance
#### [NEW] [sync-calendar-v5.js](file:///c:/Users/pjuan/OneDrive/Proyectos/Footgolf_Cat_Web/scripts/sync-calendar-v5.js)
A script to:
1.  Clear and re-populate the `etapas` table with all **15 events** (12 individual stages + 3 team championships).
2.  Assign correct `tipo` and `precio_equipo` (default 100€ for teams, or as specified).

### API & Frontend Registry
#### [MODIFY] [inscripciones.html](file:///c:/Users/pjuan/OneDrive/Proyectos/Footgolf_Cat_Web/src/pages/inscripciones.html)
- Detect if an event is of type `equipos`.
- If so, show an input field for **"Nombre del Equipo"** and update the price display.

#### [MODIFY] [crear-sesion-pago.js](file:///c:/Users/pjuan/OneDrive/Proyectos/Footgolf_Cat_Web/api/_logic/inscripciones/crear-sesion-pago.js)
- Handle the `equipo_nombre` parameter.
- Use `etapa.precio_equipo` for team events.
- Pass `equipo_nombre` to Stripe metadata.

#### [MODIFY] [webhook.js](file:///c:/Users/pjuan/OneDrive/Proyectos/Footgolf_Cat_Web/api/_logic/inscripciones/webhook.js)
- Read `equipo_nombre` from metadata.
- Insert it into the `inscripciones` table.

## Verification Plan

### Manual Verification
1.  Run the SQL migration in Supabase.
2.  Run `sync-calendar-v5.js`.
3.  Perform a test team inscription.
4.  Verify in Supabase:
    *   Inscription record contains the `equipo_nombre`.
    *   Price was correctly charged according to the event type.
