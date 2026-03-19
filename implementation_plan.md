# 2026 Season Launch & Production Reset

Goal: Prepare the system for a clean 2026 season rollout, ensuring all 12 stages are correctly configured and the licensing flow is flawless.

## Proposed Changes

### Database Maintenance
#### [NEW] [sync-calendar.js](file:///c:/Users/pjuan/OneDrive/Proyectos/Footgolf_Cat_Web/scripts/sync-calendar.js)
A script to:
1.  (Optional/Confirmed) Clear the `jugadores`, `licencias`, and `inscripciones` tables for a fresh start.
2.  Populate the `etapas` table with the 12 official dates and locations from the 2026 calendar.

### API & Frontend Registry
#### [MODIFY] [crear-sesion-pago.js](file:///c:/Users/pjuan/OneDrive/Proyectos/Footgolf_Cat_Web/api/_logic/licencias/crear-sesion-pago.js)
Ensure the `anio` is always set to 2026 and properly passed to Stripe metadata. (Already implemented, but will double-check).

#### [MODIFY] [licencias.html](file:///c:/Users/pjuan/OneDrive/Proyectos/Footgolf_Cat_Web/src/pages/licencias.html)
Update UI to clearly state that the license is for the **2026 Season**.

## Verification Plan

### Manual Verification
1.  Run the `sync-calendar.js` script to prepare the database.
2.  Perform a test license payment with Stripe test data (`4242...`).
3.  Verify in Supabase:
    *   Player is created with the correct nickname.
    *   License record is created for year 2026.
    *   Player `tiene_licencia` is `TRUE` and `anio_licencia` is `2026`.
4.  Confirm the success redirect works.
