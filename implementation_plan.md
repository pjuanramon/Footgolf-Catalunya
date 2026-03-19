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

### [Admin Dashboard]
Dedicated interface for managing the 2026 season.

### [NEW] [admin.html](file:///c:/Users/pjuan/OneDrive/Proyectos/Footgolf_Cat_Web/src/pages/admin.html)
Dashboard UI for listing registrations and managing stage states. Protected by `ADMIN_SECRET`.

### [API] [Admin Endpoints]
*   `GET /api/admin/listado`: Fetch all registrations/players.
*   `POST /api/admin/etapa`: Update stage status (open/close).

---

## Verification Plan

### Automated Tests
*   `npm run test`: Logic verification (levenshtein, pricing).
*   API integration tests via `curl` or Postman.

### Manual Verification
1.  **Stripe -> Supabase**: Perform a test payment in `licencias.html` and verify player/license creation in Supabase.
2.  **Admin UI**: Login with `ADMIN_SECRET` and verify stage management.
3.  Run the SQL migration in Supabase.
4.  Run `sync-calendar-v5.js`.
5.  Perform a test team inscription.
6.  Verify in Supabase:
    *   Inscription record contains the `equipo_nombre`.
    *   Price was correctly charged according to the event type.
