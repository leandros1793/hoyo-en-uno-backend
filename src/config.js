// ============================================
// CONFIGURACIÓN DE MERCADO PAGO - HOYO EN UNO
// Compatible con Mercado Pago SDK v2.x
// Para Producción con Variables de Entorno
// ============================================

const { MercadoPagoConfig, Preference } = require('mercadopago');

// ============================================
// CREDENCIALES DE MERCADO PAGO
// ============================================

// Leer desde variables de entorno de Render
const MP_ACCESS_TOKEN_TEST = process.env.MP_ACCESS_TOKEN_TEST || '';
const MP_PUBLIC_KEY_TEST = process.env.MP_PUBLIC_KEY_TEST || '';

const MP_ACCESS_TOKEN_PROD = process.env.MP_ACCESS_TOKEN_PROD || '';
const MP_PUBLIC_KEY_PROD = process.env.MP_PUBLIC_KEY_PROD || '';

// Detectar ambiente automáticamente desde variable de entorno
const ENVIRONMENT = process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';

console.log('🔐 Verificando credenciales:');
console.log('- MP_ACCESS_TOKEN_PROD:', MP_ACCESS_TOKEN_PROD ? '✅ Configurado' : '❌ Vacío');
console.log('- MP_ACCESS_TOKEN_TEST:', MP_ACCESS_TOKEN_TEST ? '✅ Configurado' : '❌ Vacío');
console.log('- ENVIRONMENT:', ENVIRONMENT);

// Seleccionar credenciales según ambiente
const MP_ACCESS_TOKEN = ENVIRONMENT === 'production' 
    ? MP_ACCESS_TOKEN_PROD 
    : MP_ACCESS_TOKEN_TEST;

const MP_PUBLIC_KEY = ENVIRONMENT === 'production' 
    ? MP_PUBLIC_KEY_PROD 
    : MP_PUBLIC_KEY_TEST;

// ============================================
// URL BASE
// ============================================

// Render proporcionará la URL en producción
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

console.log('🌐 URL configurada:', BASE_URL);

console.log('🔍 CONFIG - BASE_URL:', BASE_URL);
console.log('🔍 CONFIG - ENVIRONMENT:', ENVIRONMENT);

// Verificar que las credenciales estén presentes
if (!MP_ACCESS_TOKEN) {
    console.error('❌ ERROR: No se encontraron credenciales de Mercado Pago');
    console.error('Verifica las variables de entorno MP_ACCESS_TOKEN_PROD o MP_ACCESS_TOKEN_TEST');
}

// ============================================
// CONFIGURAR MERCADO PAGO (SDK V2)
// ============================================

let client = null;
let preferenceClient = null;

function configureMercadoPago() {
    if (!MP_ACCESS_TOKEN) {
        throw new Error('No se puede inicializar Mercado Pago sin credenciales');
    }

    client = new MercadoPagoConfig({ 
        accessToken: MP_ACCESS_TOKEN,
        options: {
            timeout: 5000,
            idempotencyKey: 'hoyo-en-uno'
        }
    });
    
    preferenceClient = new Preference(client);
    
    console.log('╔════════════════════════════════════════╗');
    console.log('║   MERCADO PAGO - HOYO EN UNO          ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║ SDK Version: 2.x                      ║`);
    console.log(`║ Ambiente: ${ENVIRONMENT.toUpperCase().padEnd(29)}║`);
    console.log(`║ URL Base: ${BASE_URL.substring(0,29).padEnd(29)}║`);
    console.log(`║ Token:    ${'***CONFIGURADO***'.padEnd(29)}║`);
    console.log('╚════════════════════════════════════════╝');
    
    return {
        client: client,
        preference: preferenceClient
    };
}

// ============================================
// EXPORTAR
// ============================================

module.exports = {
    PORT: process.env.PORT || 3000,
    BASE_URL,
    ENVIRONMENT,
    MP_PUBLIC_KEY,
    configureMercadoPago
};