// ============================================================
// Módulo G — Emails Automáticos (via Resend)
// ============================================================
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM || 'Liga Catalana FootGolf <liga@footgolfcatalunya.com>';
const APP_URL = process.env.APP_URL || 'https://footgolfcatalunya.com';

// ============================================================
// Email 1 — Confirmación de licencia
// ============================================================
async function enviarConfirmacionLicencia(jugador, anio) {
    await resend.emails.send({
        from: EMAIL_FROM,
        to: jugador.email,
        subject: `✅ Licencia ${anio} confirmada — Liga Catalana FootGolf`,
        html: `
            <div style="font-family: 'Outfit', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%); color: white; padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">⛳ Liga Catalana de FootGolf</h1>
                </div>
                <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
                    <h2 style="color: #1e3a5f; margin-top: 0;">¡Licencia confirmada! ✅</h2>
                    <p>Hola <strong>${jugador.nickname}</strong>,</p>
                    <p>Tu licencia para la temporada <strong>${anio}</strong> ha sido registrada correctamente.</p>
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0;">
                        <p style="margin: 0; font-weight: 600; color: #166534;">🏆 A partir de ahora puntuarás en todas las clasificaciones de la Liga Catalana.</p>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr><td style="padding: 8px 0; color: #64748b;">Nickname:</td><td style="padding: 8px 0; font-weight: 600;">${jugador.nickname}</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Temporada:</td><td style="padding: 8px 0; font-weight: 600;">${anio}</td></tr>
                    </table>
                    <p style="color: #64748b; font-size: 14px;">¡Nos vemos en el campo! ⛳</p>
                </div>
            </div>
        `
    });
}

// ============================================================
// Email 2A — Confirmación de inscripción (CON licencia)
// ============================================================
async function enviarConfirmacionInscripcionConLicencia(jugador, etapa) {
    await resend.emails.send({
        from: EMAIL_FROM,
        to: jugador.email,
        subject: `✅ Inscripción confirmada — ${etapa.nombre}`,
        html: `
            <div style="font-family: 'Outfit', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%); color: white; padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">⛳ Liga Catalana de FootGolf</h1>
                </div>
                <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
                    <h2 style="color: #1e3a5f; margin-top: 0;">¡Inscripción confirmada! ✅</h2>
                    <p>Hola <strong>${jugador.nickname}</strong>,</p>
                    <p>Tu inscripción a la <strong>${etapa.nombre}</strong> ha sido confirmada.</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr><td style="padding: 8px 0; color: #64748b;">Etapa:</td><td style="padding: 8px 0; font-weight: 600;">${etapa.nombre}</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Fecha:</td><td style="padding: 8px 0; font-weight: 600;">${new Date(etapa.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Jugador:</td><td style="padding: 8px 0; font-weight: 600;">${jugador.nickname}</td></tr>
                    </table>
                    <p style="color: #64748b; font-size: 14px;">¡Nos vemos en el campo! ⛳</p>
                </div>
            </div>
        `
    });
}

// ============================================================
// Email 2B — Confirmación de inscripción (SIN licencia)
// ============================================================
async function enviarConfirmacionInscripcionSinLicencia(jugador, etapa) {
    await resend.emails.send({
        from: EMAIL_FROM,
        to: jugador.email,
        subject: `✅ Inscripción confirmada (sin licencia) — ${etapa.nombre}`,
        html: `
            <div style="font-family: 'Outfit', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%); color: white; padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">⛳ Liga Catalana de FootGolf</h1>
                </div>
                <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
                    <h2 style="color: #1e3a5f; margin-top: 0;">Inscripción confirmada ✅</h2>
                    <p>Hola <strong>${jugador.nickname}</strong>,</p>
                    <p>Tu inscripción a la <strong>${etapa.nombre}</strong> ha sido confirmada.</p>
                    <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 12px; padding: 20px; margin: 20px 0;">
                        <p style="margin: 0; font-weight: 600; color: #92400e;">⚠️ Puedes jugar sin licencia, pero <strong>no puntuarás</strong> en la clasificación de la Liga Catalana.</p>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr><td style="padding: 8px 0; color: #64748b;">Etapa:</td><td style="padding: 8px 0; font-weight: 600;">${etapa.nombre}</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Fecha:</td><td style="padding: 8px 0; font-weight: 600;">${new Date(etapa.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Jugador:</td><td style="padding: 8px 0; font-weight: 600;">${jugador.nickname}</td></tr>
                    </table>
                    <div style="text-align: center; margin: 25px 0;">
                        <a href="${APP_URL}/licencias" style="background: #1e3a5f; color: white; padding: 14px 28px; border-radius: 9999px; text-decoration: none; font-weight: 600; display: inline-block;">Sacar licencia ahora →</a>
                    </div>
                    <p style="color: #64748b; font-size: 14px;">Si sacas la licencia antes de la etapa, puntuarás normalmente.</p>
                </div>
            </div>
        `
    });
}

// ============================================================
// Email 3 — Apertura de etapa
// ============================================================
async function enviarAperturaEtapa(etapa, jugadores) {
    const destinatarios = jugadores.filter(j => j.email).map(j => j.email);
    if (destinatarios.length === 0) return;

    const fechaFormateada = new Date(etapa.fecha).toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Enviar en lotes de 50 (límite Resend)
    for (let i = 0; i < destinatarios.length; i += 50) {
        const lote = destinatarios.slice(i, i + 50);
        await resend.emails.send({
            from: EMAIL_FROM,
            bcc: lote,
            subject: `🏌️ ¡Inscripciones abiertas! — ${etapa.nombre}`,
            html: `
                <div style="font-family: 'Outfit', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%); color: white; padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">⛳ Liga Catalana de FootGolf</h1>
                    </div>
                    <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
                        <h2 style="color: #1e3a5f; margin-top: 0;">¡Inscripciones abiertas! 🏌️</h2>
                        <p>Ya puedes inscribirte a la próxima etapa de la Liga Catalana de FootGolf.</p>
                        <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                            <h3 style="margin: 0 0 10px 0; color: #1e3a5f;">${etapa.nombre}</h3>
                            <p style="margin: 0; color: #0369a1; font-size: 18px; font-weight: 600;">📅 ${fechaFormateada}</p>
                        </div>
                        <div style="text-align: center; margin: 25px 0;">
                            <a href="${APP_URL}/inscripciones" style="background: #1e3a5f; color: white; padding: 14px 28px; border-radius: 9999px; text-decoration: none; font-weight: 600; display: inline-block;">Inscribirse ahora →</a>
                        </div>
                        <p style="color: #64748b; font-size: 14px;">Las inscripciones se cerrarán el viernes anterior a la etapa a las 13:00.</p>
                    </div>
                </div>
            `
        });
    }
}

// ============================================================
// Email 4 — Cierre de inscripciones (recordatorio)
// ============================================================
async function enviarCierreEtapa(etapa, jugadores) {
    const destinatarios = jugadores.filter(j => j.email).map(j => j.email);
    if (destinatarios.length === 0) return;

    for (let i = 0; i < destinatarios.length; i += 50) {
        const lote = destinatarios.slice(i, i + 50);
        await resend.emails.send({
            from: EMAIL_FROM,
            bcc: lote,
            subject: `⏰ ¡Últimas horas! Inscripciones cierran mañana — ${etapa.nombre}`,
            html: `
                <div style="font-family: 'Outfit', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">⏰ Últimas horas para inscribirte</h1>
                    </div>
                    <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
                        <p>Las inscripciones para la <strong>${etapa.nombre}</strong> cierran <strong>mañana viernes a las 13:00</strong>.</p>
                        <p>Si aún no te has inscrito, ¡este es el momento!</p>
                        <div style="text-align: center; margin: 25px 0;">
                            <a href="${APP_URL}/inscripciones" style="background: #dc2626; color: white; padding: 14px 28px; border-radius: 9999px; text-decoration: none; font-weight: 600; display: inline-block;">Inscribirse ahora →</a>
                        </div>
                    </div>
                </div>
            `
        });
    }
}

// ============================================================
// Email 5 — Recordatorio de licencia (para jugadores sin licencia)
// ============================================================
async function enviarRecordatorioLicencia(jugadoresSinLicencia) {
    for (const jugador of jugadoresSinLicencia) {
        if (!jugador.email) continue;
        await resend.emails.send({
            from: EMAIL_FROM,
            to: jugador.email,
            subject: '⚠️ Juega con licencia y puntúa en la Liga',
            html: `
                <div style="font-family: 'Outfit', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%); color: white; padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">⛳ Liga Catalana de FootGolf</h1>
                    </div>
                    <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
                        <h2 style="color: #1e3a5f; margin-top: 0;">¡Saca tu licencia! 🏆</h2>
                        <p>Hola <strong>${jugador.nickname}</strong>,</p>
                        <p>Hemos visto que estás participando en la Liga pero <strong>no tienes licencia</strong> para esta temporada.</p>
                        <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 12px; padding: 20px; margin: 20px 0;">
                            <p style="margin: 0; color: #92400e;"><strong>Sin licencia puedes jugar</strong>, pero tus resultados <strong>no puntúan</strong> en la clasificación.</p>
                        </div>
                        <p>Saca tu licencia ahora y empieza a sumar puntos:</p>
                        <div style="text-align: center; margin: 25px 0;">
                            <a href="${APP_URL}/licencias" style="background: #1e3a5f; color: white; padding: 14px 28px; border-radius: 9999px; text-decoration: none; font-weight: 600; display: inline-block;">Sacar licencia →</a>
                        </div>
                    </div>
                </div>
            `
        });
    }
}

// ============================================================
// Email 6 — Publicación de resultados
// ============================================================
async function enviarResultados(etapa, jugadores) {
    const destinatarios = jugadores.filter(j => j.email).map(j => j.email);
    if (destinatarios.length === 0) return;

    for (let i = 0; i < destinatarios.length; i += 50) {
        const lote = destinatarios.slice(i, i + 50);
        await resend.emails.send({
            from: EMAIL_FROM,
            bcc: lote,
            subject: `📊 Resultados publicados — ${etapa.nombre}`,
            html: `
                <div style="font-family: 'Outfit', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%); color: white; padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">⛳ Liga Catalana de FootGolf</h1>
                    </div>
                    <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
                        <h2 style="color: #1e3a5f; margin-top: 0;">¡Resultados disponibles! 📊</h2>
                        <p>Los resultados de la <strong>${etapa.nombre}</strong> ya están publicados.</p>
                        <p>Consulta la clasificación actualizada:</p>
                        <div style="text-align: center; margin: 25px 0;">
                            <a href="${APP_URL}/clasificaciones" style="background: #1e3a5f; color: white; padding: 14px 28px; border-radius: 9999px; text-decoration: none; font-weight: 600; display: inline-block;">Ver clasificación →</a>
                        </div>
                        <p style="color: #64748b; font-size: 14px;">¡Enhorabuena a todos los participantes! 🎉</p>
                    </div>
                </div>
            `
        });
    }
}

module.exports = {
    enviarConfirmacionLicencia,
    enviarConfirmacionInscripcionConLicencia,
    enviarConfirmacionInscripcionSinLicencia,
    enviarAperturaEtapa,
    enviarCierreEtapa,
    enviarRecordatorioLicencia,
    enviarResultados
};
