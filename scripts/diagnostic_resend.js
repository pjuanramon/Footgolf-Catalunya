const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function test() {
    console.log('Probando API Key:', process.env.RESEND_API_KEY ? 'Presente' : 'Ausente');
    try {
        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: ['pjuanramon@hotmail.com'],
            subject: 'Test Diagnóstico',
            html: '<p>Si recibes esto, la API Key funciona correctamente.</p>'
        });
        if (error) {
            console.error('Error detectado:', error);
        } else {
            console.log('¡Éxito! Email enviado:', data.id);
        }
    } catch (e) {
        console.error('Excepción:', e.message);
    }
}
test();
