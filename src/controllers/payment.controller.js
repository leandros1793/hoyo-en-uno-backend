// ============================================
// PAYMENT CONTROLLER - HOYO EN UNO
// Compatible con Mercado Pago SDK v2.x + Supabase
// ============================================

const config = require('../config');
const { preference } = config.configureMercadoPago();
const supabase = require('../supabase.config'); // ⬅️ NUEVO

// ============================================
// CREAR PREFERENCIA DE PAGO
// ============================================

const createPreference = async (req, res) => {
    try {
        console.log('\n🔷 Nueva solicitud de pago recibida');
        console.log('Datos:', JSON.stringify(req.body, null, 2));
        
        const { 
            title, 
            quantity, 
            price, 
            description,
            // ⬇️ NUEVOS CAMPOS DE RESERVA
            cart, // Array con todas las reservas
            customerName,
            customerEmail,
            customerPhone,
            customerNotes
        } = req.body;
        
        // ===== VALIDACIONES =====
        if (!title || typeof title !== 'string' || title.trim() === '') {
            return res.status(400).json({
                error: 'El título es requerido',
                received: req.body
            });
        }

        // Validar que el carrito exista
        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            return res.status(400).json({
                error: 'El carrito está vacío',
                received: req.body
            });
        }

        // Validar datos del cliente
        if (!customerName || !customerEmail || !customerPhone) {
            return res.status(400).json({
                error: 'Faltan datos del cliente (nombre, email o teléfono)',
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

        // ===== GENERAR REFERENCIA ÚNICA =====
        const referenceId = 'hoyo-' + Date.now();
        
        console.log('🔑 Referencia generada:', referenceId);
        console.log('👤 Cliente:', customerName);
        console.log('📧 Email:', customerEmail);
        console.log('📱 Teléfono:', customerPhone);
        console.log('🛒 Items en carrito:', cart.length);

        // ===== GUARDAR RESERVAS TEMPORALES EN SUPABASE =====
        const reservationsToInsert = [];

        for (const item of cart) {
            // Validar cada item del carrito
            if (!item.serviceId || !item.date || !item.time) {
                console.error('❌ Item inválido en el carrito:', item);
                return res.status(400).json({
                    error: 'Datos incompletos en el carrito',
                    item: item
                });
            }

            reservationsToInsert.push({
                reference_id: referenceId,
                service_id: parseInt(item.serviceId),
                reservation_date: item.date,
                reservation_time: item.time,
                quantity: item.quantity || 1,
                customer_name: customerName,
                customer_email: customerEmail,
                customer_phone: customerPhone,
                unit_price: parseFloat(item.unitPrice),
                total_amount: parseFloat(item.totalPrice),
                payment_method: 'tarjeta', // Mercado Pago siempre es tarjeta
                notes: customerNotes || null,
                status: 'pending', // ⬅️ IMPORTANTE: pendiente hasta que se pague
                payment_status: 'pending'
            });
        }

        console.log('💾 Guardando reservas temporales en Supabase...');
        console.log('📊 Cantidad de reservas a guardar:', reservationsToInsert.length);

        try {
            const { data: reservasGuardadas, error: errorReservas } = await supabase
                .from('reservations')
                .insert(reservationsToInsert)
                .select();

            if (errorReservas) {
                console.error('❌ Error de Supabase:', errorReservas);
                throw new Error(`Error al guardar en Supabase: ${errorReservas.message}`);
            }

            console.log('✅ Reservas temporales guardadas exitosamente');
            console.log('📝 IDs generados:', reservasGuardadas.map(r => r.id));

        } catch (supabaseError) {
            console.error('❌ Error al guardar en Supabase:', supabaseError);
            return res.status(500).json({
                success: false,
                error: 'Error al guardar las reservas',
                message: supabaseError.message
            });
        }

        // ===== CONFIGURAR PREFERENCIA DE MERCADO PAGO =====
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
            external_reference: referenceId, // ⬅️ Clave para relacionar después
            notification_url: webhookUrl,
            binary_mode: true,
            // Información adicional del comprador
            payer: {
                name: customerName,
                email: customerEmail,
                phone: {
                    number: customerPhone
                }
            }
        };
        
        console.log('🔗 URLs de retorno configuradas:');
        console.log('- Success:', body.back_urls.success);
        console.log('- Failure:', body.back_urls.failure);
        console.log('- Pending:', body.back_urls.pending);
        console.log('- Webhook:', body.notification_url);
        
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
            
            console.log('\n✅ Respuesta exitosa de Mercado Pago:');
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
                message: 'Preferencia creada exitosamente',
                reservations_created: reservationsToInsert.length // ⬅️ NUEVO
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

            // Si falló Mercado Pago, eliminar las reservas temporales
            console.log('🗑️ Eliminando reservas temporales por error en MP...');
            try {
                await supabase
                    .from('reservations')
                    .delete()
                    .eq('reference_id', referenceId);
                console.log('✅ Reservas temporales eliminadas');
            } catch (deleteError) {
                console.error('❌ Error al eliminar reservas:', deleteError);
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

const successPayment = async (req, res) => {
    console.log('\n✅ PAGO EXITOSO');
    console.log('Query params:', req.query);
    
    const { 
        payment_id, 
        status, 
        external_reference,
        payment_type,
        merchant_order_id 
    } = req.query;

    // ===== ACTUALIZAR RESERVAS EN SUPABASE =====
    try {
        console.log('💾 Actualizando reservas en Supabase...');
        console.log('🔑 Buscando por reference_id:', external_reference);

        const { data: reservasActualizadas, error } = await supabase
            .from('reservations')
            .update({
                payment_id: payment_id || null,
                status: 'confirmed', // ⬅️ Cambiar de 'pending' a 'confirmed'
                payment_status: 'paid',
                confirmed_at: new Date().toISOString(),
                payment_type: payment_type || null,
                merchant_order_id: merchant_order_id || null
            })
            .eq('reference_id', external_reference) // ⬅️ Buscar por referencia
            .select();

        if (error) {
            console.error('❌ Error actualizando reservas en Supabase:', error);
        } else {
            console.log(`✅ ${reservasActualizadas?.length || 0} reserva(s) confirmada(s)`);
            console.log('📝 Reservas actualizadas:', reservasActualizadas);
        }

    } catch (error) {
        console.error('❌ Error en actualización de Supabase:', error);
    }

    // ===== MOSTRAR HTML DE ÉXITO =====
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Pago Exitoso - Hoyo en Uno</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    background: linear-gradient(135deg, #1a472a 0%, #0f2d1a 100%);
                    color: white;
                    padding: 1rem;
                }
                .container {
                    text-align: center;
                    padding: 2.5rem 2rem;
                    background: rgba(255,255,255,0.1);
                    border-radius: 20px;
                    backdrop-filter: blur(15px);
                    max-width: 500px;
                    width: 100%;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                }
                .icon { 
                    font-size: 80px; 
                    margin-bottom: 1.5rem;
                    animation: bounce 1s ease infinite;
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                h1 { 
                    font-size: 2.2rem; 
                    margin-bottom: 1rem;
                    font-weight: 700;
                }
                p { 
                    font-size: 1.1rem; 
                    opacity: 0.95; 
                    margin-bottom: 0.75rem;
                    line-height: 1.6;
                }
                .info { 
                    background: rgba(255,255,255,0.15); 
                    padding: 1.5rem; 
                    border-radius: 12px; 
                    margin: 1.5rem 0;
                    text-align: left;
                }
                .info p {
                    margin-bottom: 0.5rem;
                    font-size: 1rem;
                }
                .info p:last-child {
                    margin-bottom: 0;
                }
                .status-badge {
                    display: inline-block;
                    background: #25d366;
                    color: white;
                    padding: 0.5rem 1rem;
                    border-radius: 20px;
                    font-weight: 600;
                    font-size: 0.9rem;
                    margin-top: 0.5rem;
                }
                .btn {
                    display: inline-block;
                    margin-top: 2rem;
                    padding: 1rem 2.5rem;
                    background: #25d366;
                    color: white;
                    text-decoration: none;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 1.1rem;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(37, 211, 102, 0.3);
                }
                .btn:hover { 
                    background: #1da851;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(37, 211, 102, 0.4);
                }
                .footer-note {
                    margin-top: 2rem;
                    font-size: 0.9rem;
                    opacity: 0.8;
                }
                @media (max-width: 480px) {
                    .container {
                        padding: 2rem 1.5rem;
                    }
                    h1 {
                        font-size: 1.8rem;
                    }
                    .icon {
                        font-size: 60px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">✅</div>
                <h1>¡Pago Exitoso!</h1>
                <p>Tu reserva ha sido <strong>confirmada y pagada</strong>.</p>
                
                <div class="info">
                    <p><strong>📋 ID de pago:</strong> ${payment_id || 'N/A'}</p>
                    <p><strong>🔖 Referencia:</strong> ${external_reference || 'N/A'}</p>
                    <p><strong>💳 Método:</strong> ${payment_type === 'credit_card' ? 'Tarjeta de Crédito' : payment_type === 'debit_card' ? 'Tarjeta de Débito' : 'Mercado Pago'}</p>
                    <span class="status-badge">✓ CONFIRMADA</span>
                </div>
                
                <p class="footer-note">
                    ✉️ Recibirás un correo de confirmación<br>
                    📱 También te contactaremos por WhatsApp
                </p>
                
                <a href="/" class="btn">⛳ Volver al inicio</a>
            </div>
        </body>
        </html>
    `);
};

// ============================================
// CALLBACK: PAGO FALLIDO
// ============================================

const failurePayment = async (req, res) => {
    console.log('\n❌ PAGO FALLIDO');
    console.log('Query params:', req.query);
    
    const { external_reference } = req.query;

    // ===== ELIMINAR RESERVAS TEMPORALES =====
    if (external_reference) {
        try {
            console.log('🗑️ Eliminando reservas temporales...');
            const { error } = await supabase
                .from('reservations')
                .delete()
                .eq('reference_id', external_reference)
                .eq('status', 'pending');

            if (error) {
                console.error('❌ Error al eliminar reservas:', error);
            } else {
                console.log('✅ Reservas temporales eliminadas');
            }
        } catch (error) {
            console.error('❌ Error al eliminar reservas:', error);
        }
    }
    
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Pago Fallido - Hoyo en Uno</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    background: linear-gradient(135deg, #1a472a 0%, #0f2d1a 100%);
                    color: white;
                    padding: 1rem;
                }
                .container {
                    text-align: center;
                    padding: 2.5rem 2rem;
                    background: rgba(255,255,255,0.1);
                    border-radius: 20px;
                    backdrop-filter: blur(15px);
                    max-width: 500px;
                    width: 100%;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                }
                .icon { font-size: 80px; margin-bottom: 1.5rem; }
                h1 { font-size: 2.2rem; margin-bottom: 1rem; font-weight: 700; }
                p { font-size: 1.1rem; opacity: 0.95; margin-bottom: 0.75rem; line-height: 1.6; }
                .btn {
                    display: inline-block;
                    margin-top: 1.5rem;
                    padding: 1rem 2rem;
                    background: #ff3b30;
                    color: white;
                    text-decoration: none;
                    border-radius: 12px;
                    font-weight: 600;
                    margin-right: 1rem;
                    transition: all 0.3s ease;
                }
                .btn:hover { 
                    background: #d32f2f;
                    transform: translateY(-2px);
                }
                .btn-secondary { 
                    background: #25d366;
                }
                .btn-secondary:hover { 
                    background: #1da851;
                }
                @media (max-width: 480px) {
                    .btn {
                        display: block;
                        margin: 1rem 0;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">❌</div>
                <h1>Pago no procesado</h1>
                <p>No pudimos procesar tu pago.</p>
                <p>Por favor, verifica tus datos e inténtalo nuevamente.</p>
                <div style="margin-top: 2rem;">
                    <a href="/" class="btn">🔄 Reintentar pago</a>
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

const pendingPayment = async (req, res) => {
    console.log('\n⏳ PAGO PENDIENTE');
    console.log('Query params:', req.query);
    
    const { external_reference, payment_id } = req.query;

    // ===== ACTUALIZAR ESTADO A PENDIENTE =====
    if (external_reference) {
        try {
            console.log('💾 Actualizando estado a pendiente...');
            const { error } = await supabase
                .from('reservations')
                .update({
                    payment_id: payment_id || null,
                    payment_status: 'pending',
                    status: 'pending'
                })
                .eq('reference_id', external_reference);

            if (error) {
                console.error('❌ Error al actualizar:', error);
            } else {
                console.log('✅ Estado actualizado a pendiente');
            }
        } catch (error) {
            console.error('❌ Error:', error);
        }
    }
    
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Pago Pendiente - Hoyo en Uno</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    background: linear-gradient(135deg, #1a472a 0%, #0f2d1a 100%);
                    color: white;
                    padding: 1rem;
                }
                .container {
                    text-align: center;
                    padding: 2.5rem 2rem;
                    background: rgba(255,255,255,0.1);
                    border-radius: 20px;
                    backdrop-filter: blur(15px);
                    max-width: 500px;
                    width: 100%;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                }
                .icon { 
                    font-size: 80px; 
                    margin-bottom: 1.5rem;
                    animation: pulse 2s ease infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                h1 { font-size: 2.2rem; margin-bottom: 1rem; font-weight: 700; }
                p { font-size: 1.1rem; opacity: 0.95; margin-bottom: 0.75rem; line-height: 1.6; }
                .btn {
                    display: inline-block;
                    margin-top: 2rem;
                    padding: 1rem 2.5rem;
                    background: #25d366;
                    color: white;
                    text-decoration: none;
                    border-radius: 12px;
                    font-weight: 600;
                    transition: all 0.3s ease;
                }
                .btn:hover { 
                    background: #1da851;
                    transform: translateY(-2px);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">⏳</div>
                <h1>Pago en proceso</h1>
                <p>Tu pago está siendo procesado.</p>
                <p>Te notificaremos cuando se confirme.</p>
                <p><em>Esto puede tardar unos minutos.</em></p>
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
