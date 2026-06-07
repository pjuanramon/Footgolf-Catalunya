// ============================================================
// Pasarela de Pagos (Payment Gateway Abstraction)
// Unifica el cobro entre Stripe y Redsys (TPV Sabadell)
// ============================================================
const { stripe } = require('./stripe');
const { createRedsysAPI, SANDBOX_URLS, PRODUCTION_URLS } = require('redsys-easy');

let redsysApiInstance = null;

function getRedsysApi() {
    if (redsysApiInstance) return redsysApiInstance;

    // Configuración de Redsys obtenida dinámicamente de process.env
    const secretKey = process.env.REDSYS_SECRET_KEY || 'qwertyuiopasdfghjklzxcvbnm123456'; // clave por defecto para pruebas
    const redsysEnv = process.env.REDSYS_ENVIRONMENT || 'test';
    
    // Seleccionar urls de Redsys según entorno
    const redsysUrls = redsysEnv === 'production' ? PRODUCTION_URLS : SANDBOX_URLS;
    
    redsysApiInstance = createRedsysAPI({
        secretKey: secretKey,
        urls: redsysUrls
    });
    return redsysApiInstance;
}

/**
 * Obtiene el proveedor de pagos activo.
 * Si PAYMENT_PROVIDER está configurado a 'redsys', se usa Redsys.
 * Si no, o si falla, se puede usar Stripe de fallback.
 */
function getActiveProvider() {
    return process.env.PAYMENT_PROVIDER || 'redsys';
}

/**
 * Crea una sesión o formulario de redirección de pago unificado.
 * 
 * @param {object} params
 * @param {string} params.orderId - ID único del pedido (12 caracteres max para Redsys: número de etapa + timestamp, etc.)
 * @param {number} params.amount - Importe en euros (ej: 22 o 30)
 * @param {string} params.concept - Concepto/Nombre del producto (ej: Inscripción Etapa 1)
 * @param {string} params.description - Descripción
 * @param {object} params.metadata - Metadata asociada para procesar post-pago
 * @param {string} params.successUrl - URL de retorno en caso de éxito
 * @param {string} params.cancelUrl - URL de retorno en caso de cancelación
 * @returns {Promise<{url: string, body?: object, provider: string}>}
 */
async function crearSesionPago({ orderId, amount, concept, description, metadata, successUrl, cancelUrl }) {
    const provider = getActiveProvider();
    
    if (provider === 'stripe') {
        if (!stripe) {
            throw new Error('El cliente de Stripe no está configurado.');
        }
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: concept,
                        description: description
                    },
                    unit_amount: Math.round(amount * 100)
                },
                quantity: 1
            }],
            metadata: metadata,
            success_url: successUrl,
            cancel_url: cancelUrl
        });
        
        return { url: session.url, provider: 'stripe' };
    } else {
        // Redsys requiere un Order ID único de 12 posiciones máximo.
        // Regla obligatoria: los 4 primeros caracteres DEBEN ser dígitos numéricos.
        // Para asegurar que sea único y cumpla la regla de los 4 primeros dígitos,
        // generamos: 4 dígitos aleatorios + los últimos 8 caracteres del orderId original (normalizado).
        let cleanOrder = orderId.replace(/[^a-zA-Z0-9]/g, '');
        
        // Si es muy corto, rellenamos
        while (cleanOrder.length < 8) {
            cleanOrder = 'A' + cleanOrder;
        }
        
        // Obtenemos los últimos 8 caracteres
        const lastEight = cleanOrder.substring(cleanOrder.length - 8);
        
        // Generamos 4 números aleatorios (o basados en timestamp)
        const firstFour = Math.floor(1000 + Math.random() * 9000).toString();
        
        // Combinación final: 4 números + 8 alfanuméricos = 12 caracteres exactos
        const redsysOrder = firstFour + lastEight;

        // Convertir importe a céntimos en formato string
        const amountCents = Math.round(amount * 100).toString();

        // Notificación webhook de Redsys
        const notificationUrl = `${process.env.APP_URL}/api/redsys/notificacion`;

        // Obtener configuración dinámica
        const merchantCode = process.env.REDSYS_MERCHANT_CODE || '999008881';
        const terminal = process.env.REDSYS_TERMINAL || '001';

        const paymentData = {
            DS_MERCHANT_AMOUNT: amountCents,
            DS_MERCHANT_ORDER: redsysOrder,
            DS_MERCHANT_MERCHANTCODE: merchantCode,
            DS_MERCHANT_CURRENCY: '978', // EUR
            DS_MERCHANT_TRANSACTIONTYPE: '0', // Autorización simple
            DS_MERCHANT_TERMINAL: terminal,
            DS_MERCHANT_MERCHANTURL: notificationUrl,
            DS_MERCHANT_URLOK: successUrl,
            DS_MERCHANT_URLKO: cancelUrl,
            DS_MERCHANT_PRODUCTDESCRIPTION: concept.substring(0, 125),
            // Guardamos la metadata codificada en el merchant data (Ds_MerchantData) para recuperarla en la notificación.
            // Redsys permite hasta 1024 caracteres en Ds_MerchantData.
            DS_MERCHANT_MERCHANTDATA: JSON.stringify(metadata)
        };

        const form = getRedsysApi().createRedirectForm(paymentData);

        // Construimos una URL de redirección a nuestra página de resultado de pago de transición
        // que hará el auto-submit del formulario HTTP POST de Redsys.
        const queryParams = new URLSearchParams({
            action: form.url,
            Ds_SignatureVersion: form.body.Ds_SignatureVersion,
            Ds_MerchantParameters: form.body.Ds_MerchantParameters,
            Ds_Signature: form.body.Ds_Signature
        });

        const redirectUrl = `${process.env.APP_URL}/src/pages/pago-resultado.html?${queryParams.toString()}`;

        return {
            url: redirectUrl,
            provider: 'redsys'
        };
    }
}

/**
 * Verifica y procesa una notificación de pago entrante de Redsys.
 * 
 * @param {object} body - req.body recibido en el webhook/notificación de Redsys
 * @returns {object} Datos del pago decodificados y validados
 */
function verificarNotificacionRedsys(body) {
    try {
        const decoded = getRedsysApi().processRestNotification(body);
        
        // Decodificar la metadata que enviamos
        let metadata = {};
        if (decoded.Ds_MerchantData) {
            try {
                metadata = JSON.parse(decoded.Ds_MerchantData);
            } catch (e) {
                console.error("Fallo al parsear Ds_MerchantData:", e);
            }
        }

        // Obtener código de respuesta de Redsys
        // Códigos 0000 a 0099 son autorizados.
        const responseCode = parseInt(decoded.Ds_Response, 10);
        const success = responseCode >= 0 && responseCode <= 99;

        return {
            success,
            orderId: decoded.Ds_Order,
            amount: parseFloat(decoded.Ds_Amount) / 100,
            paymentId: `REDSYS-${decoded.Ds_Order}-${decoded.Ds_AuthorisationCode || 'AUTH'}`,
            metadata,
            raw: decoded
        };
    } catch (error) {
        console.error("Error validando firma de notificación Redsys:", error);
        throw new Error("Firma inválida o error de verificación.");
    }
}

module.exports = {
    crearSesionPago,
    verificarNotificacionRedsys,
    getActiveProvider
};
