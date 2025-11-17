// ============================================
// PAYMENT CONTROLLER - HOYO EN UNO
// Compatible con Mercado Pago SDK v2.x
// ============================================

const config = require('../config');
const { preference } = config.configureMercadoPago();

// ============================================
// CREAR PREFERENCIA DE PAGO
// ============================================

const createPreference = async (req, res) => {
    try {
        console.log('\n🔷 Nueva solicitud de pago recibida');
        console.log('Datos:', JSON.stringify(req.body, null, 2));
        
        const { title, quantity, price, description } = req.body;
        
        // ===== VALIDACIONES =====
        if (!title || typeof title !== 'string' || title.trim() === '') {
            return res.status(400).json({
                error: 'El título es requerido',
                received: req.body
            });
        }
        
        const numQuantity = Number(quantity) || 1;
        const numPrice = parseFloat(price);
        
        if (isNaN(numPrice) || numPrice <= 0) {
            return res.status(400).json({
                error: 'El precio debe ser mayor a cero',
                received: req.body
            });
        }

        // ===== CONFIGURAR PREFERENCIA =====
        const referenceId = 'hoyo-' + Date.now();
        console.log('🔍 DEBUG - BASE_URL:', config.BASE_URL);
console.log('🔍 DEBUG - ENVIRONMENT:', config.ENVIRONMENT);
        // Asegurarse de que la URL base no termine con /
        const baseUrl = config.BASE_URL.endsWith('/') 
            ? config.BASE_URL.slice(0, -1) 
            : config.BASE_URL;

        // Construir URLs de forma explícita
        const successUrl = baseUrl + '/payment/success';
        const failureUrl = baseUrl + '/payment/failure';
        const pendingUrl = baseUrl + '/payment/pending';
        const webhookUrl = baseUrl + '/payment/webhook';

        // Configuración de la preferencia
        const body = {
            items: [
                {
                    id: referenceId,
                    title: title.substring(0, 100),
                    quantity: Math.max(1, Math.min(numQuantity, 100)),
                    unit_price: numPrice,
                    currency_id: 'MXN',
                    description: description || `Servicio de ${title}`
                }
            ],
            back_urls: {
                success: successUrl,
                failure: failureUrl,
                pending: pendingUrl
            },
            auto_return: 'approved',
            statement_descriptor: 'HOYO EN UNO',
            external_reference: referenceId,
            notification_url: webhookUrl,
            binary_mode: true
        };
        
        console.log('🔗 URLs de retorno configuradas:');
        console.log('- Success:', body.back_urls.success);
        console.log('- Failure:', body.back_urls.failure);
        console.log('- Pending:', body.back_urls.pending);
        
        console.log('\n📋 Preferencia configurada:');
        console.log('- Título:', title);
        console.log('- Precio:', `$${numPrice} MXN`);
        console.log('- Cantidad:', numQuantity);
        console.log('- Referencia:', referenceId);

        // ===== CREAR PREFERENCIA EN MERCADO PAGO (SDK V2) =====
        try {
            console.log('\n🚀 Enviando a Mercado Pago...');
            
            // SDK v2 usa .create() directamente
            const response = await preference.create({ body });
            
            console.log('\n✅ Respuesta exitosa:');
            console.log('- ID:', response.id);
            console.log('- Init Point:', response.init_point);
            
            if (!response || !response.id) {
                throw new Error('Respuesta inválida de Mercado Pago');
            }
            
            // En producción usa init_point, en sandbox usa sandbox_init_point
            const checkoutUrl = config.ENVIRONMENT === 'sandbox' 
                ? response.sandbox_init_point 
                : response.init_point;
            
            if (!checkoutUrl) {
                throw new Error('No se pudo obtener la URL de pago');
            }
            
            // ===== RESPUESTA EXITOSA =====
            res.json({ 
                success: true,
                id: response.id,
                checkout_url: checkoutUrl,
                init_point: response.init_point,
                sandbox_init_point: response.sandbox_init_point,
                reference: referenceId,
                environment: config.ENVIRONMENT,
                message: 'Preferencia creada exitosamente'
            });
            
        } catch (mpError) {
            // ===== ERROR DE MERCADO PAGO =====
            console.error('\n❌ Error de Mercado Pago:');
            console.error('Mensaje:', mpError.message);
            console.error('Status:', mpError.status);
            console.error('Causa:', mpError.cause);
            
            if (mpError.response) {
                console.error('Datos:', mpError.response.data);
            }
            
            throw new Error(`Error de Mercado Pago: ${mpError.message}`);
        }
        
    } catch (error) {
        // ===== ERROR GENERAL =====
        console.error('\n🔥 Error general:');
        console.error('Mensaje:', error.message);
        console.error('Stack:', error.stack);
        
        res.status(500).json({ 
            success: false,
            error: 'Error al procesar el pago',
            message: error.message,
            details: error.response?.data || null
        });
    }
};

// ============================================
// CALLBACK: PAGO EXITOSO
// ============================================

const successPayment = (req, res) => {
    console.log('\n✅ PAGO EXITOSO');
    console.log('Query params:', req.query);
    
    const { payment_id, status, external_reference } = req.query;
    
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Pago Exitoso - Hoyo en Uno</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #1a472a 0%, #0f2d1a 100%);
                    color: white;
                }
                .container {
                    text-align: center;
                    padding: 2rem;
                    background: rgba(255,255,255,0.1);
                    border-radius: 16px;
                    backdrop-filter: blur(10px);
                    max-width: 500px;
                }
                .icon { font-size: 64px; margin-bottom: 1rem; }
                h1 { font-size: 2rem; margin-bottom: 1rem; }
                p { font-size: 1.1rem; opacity: 0.9; margin-bottom: 0.5rem; }
                .info { 
                    background: rgba(255,255,255,0.1); 
                    padding: 1rem; 
                    border-radius: 8px; 
                    margin: 1rem 0;
                }
                .btn {
                    display: inline-block;
                    margin-top: 2rem;
                    padding: 1rem 2rem;
                    background: #25d366;
                    color: white;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: bold;
                }
                .btn:hover { background: #1da851; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">✅</div>
                <h1>¡Pago Exitoso!</h1>
                <p>Tu pago ha sido procesado correctamente.</p>
                <div class="info">
                    <p><strong>ID de pago:</strong> ${payment_id || 'N/A'}</p>
                    <p><strong>Referencia:</strong> ${external_reference || 'N/A'}</p>
                </div>
                <p>Recibirás un email de confirmación pronto.</p>
                <a href="/" class="btn">⛳ Volver al inicio</a>
            </div>
        </body>
        </html>
    `);
};

// ============================================
// CALLBACK: PAGO FALLIDO
// ============================================

const failurePayment = (req, res) => {
    console.log('\n❌ PAGO FALLIDO');
    console.log('Query params:', req.query);
    
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Pago Fallido - Hoyo en Uno</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #1a472a 0%, #0f2d1a 100%);
                    color: white;
                }
                .container {
                    text-align: center;
                    padding: 2rem;
                    background: rgba(255,255,255,0.1);
                    border-radius: 16px;
                    backdrop-filter: blur(10px);
                    max-width: 500px;
                }
                .icon { font-size: 64px; margin-bottom: 1rem; }
                h1 { font-size: 2rem; margin-bottom: 1rem; }
                p { font-size: 1.1rem; opacity: 0.9; margin-bottom: 0.5rem; }
                .btn {
                    display: inline-block;
                    margin-top: 1rem;
                    padding: 1rem 2rem;
                    background: #ff3b30;
                    color: white;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: bold;
                    margin-right: 1rem;
                }
                .btn:hover { background: #d32f2f; }
                .btn-secondary { background: #25d366; }
                .btn-secondary:hover { background: #1da851; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">❌</div>
                <h1>Pago no procesado</h1>
                <p>No pudimos procesar tu pago.</p>
                <p>Por favor, verifica tus datos e inténtalo nuevamente.</p>
                <div style="margin-top: 2rem;">
                    <a href="/" class="btn">Reintentar pago</a>
                    <a href="https://wa.me/5233223968325" class="btn btn-secondary">💬 Soporte</a>
                </div>
            </div>
        </body>
        </html>
    `);
};

// ============================================
// CALLBACK: PAGO PENDIENTE
// ============================================

const pendingPayment = (req, res) => {
    console.log('\n⏳ PAGO PENDIENTE');
    console.log('Query params:', req.query);
    
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Pago Pendiente - Hoyo en Uno</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #1a472a 0%, #0f2d1a 100%);
                    color: white;
                }
                .container {
                    text-align: center;
                    padding: 2rem;
                    background: rgba(255,255,255,0.1);
                    border-radius: 16px;
                    backdrop-filter: blur(10px);
                    max-width: 500px;
                }
                .icon { font-size: 64px; margin-bottom: 1rem; }
                h1 { font-size: 2rem; margin-bottom: 1rem; }
                p { font-size: 1.1rem; opacity: 0.9; margin-bottom: 0.5rem; }
                .btn {
                    display: inline-block;
                    margin-top: 2rem;
                    padding: 1rem 2rem;
                    background: #25d366;
                    color: white;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: bold;
                }
                .btn:hover { background: #1da851; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">⏳</div>
                <h1>Pago en proceso</h1>
                <p>Tu pago está siendo procesado.</p>
                <p>Te notificaremos cuando se confirme.</p>
                <p>Esto puede tardar unos minutos.</p>
                <a href="/" class="btn">⛳ Volver al inicio</a>
            </div>
        </body>
        </html>
    `);
};

// ============================================
// EXPORTAR FUNCIONES
// ============================================

module.exports = {
    createPreference,
    successPayment,
    failurePayment,
    pendingPayment
};